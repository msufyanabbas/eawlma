import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';
import axios from 'axios';

const GTX_URL = 'https://translate.googleapis.com/translate_a/single';
const REQUEST_TIMEOUT_MS = 3000;
const CACHE_MAX = 1000;
const MAX_TEXT_BYTES = 5000; // Google's per-request soft limit on the gtx endpoint
const BEDROCK_MODEL_ID = 'anthropic.claude-3-5-haiku-20241022-v1:0';

interface CacheEntry {
  value: string;
  hits: number;
}

/** Human-readable language names for the Bedrock translation prompt. */
const LANG_NAMES: Record<string, string> = {
  ar: 'Arabic', en: 'English', fr: 'French', zh: 'Chinese',
  hi: 'Hindi', ur: 'Urdu', es: 'Spanish', de: 'German',
  tr: 'Turkish', ru: 'Russian', fa: 'Persian', he: 'Hebrew',
};

/**
 * Dynamic-content translation. The primary backend is **Amazon Bedrock**
 * (Claude 3 Haiku) — it produces noticeably better real-estate copy than the
 * old unofficial Google `gtx` endpoint, especially Arabic ⇄ English.
 *
 * Google Translate is kept purely as a fallback: if Bedrock is unconfigured
 * or errors, `translate()` quietly degrades to the `gtx` client so a missing
 * AWS key never breaks a message thread. Language *detection* still uses
 * `gtx` — it's cheap, fast, and good enough for the auto-detect use case.
 *
 * An in-memory LRU (keyed by target + text) sits on top so repeat reads of
 * the same conversation don't re-hit either backend.
 */
@Injectable()
export class TranslationService {
  private readonly logger = new Logger(TranslationService.name);
  private readonly cache = new Map<string, CacheEntry>();
  private readonly bedrock: BedrockRuntimeClient | null;

  constructor(private readonly config: ConfigService) {
    const region =
      this.config.get<string>('AWS_BEDROCK_REGION') ??
      this.config.get<string>('AWS_REGION') ??
      'us-east-1';
    const accessKeyId = this.config.get<string>('AWS_ACCESS_KEY_ID') ?? '';
    const secretAccessKey = this.config.get<string>('AWS_SECRET_ACCESS_KEY') ?? '';

    // Only stand up the client when credentials exist — otherwise we'd pay a
    // guaranteed SDK error on every call before falling through to Google.
    this.bedrock =
      accessKeyId && secretAccessKey
        ? new BedrockRuntimeClient({
            region,
            credentials: { accessKeyId, secretAccessKey },
          })
        : null;

    if (!this.bedrock) {
      this.logger.warn(
        'Bedrock credentials not configured — translation falls back to Google.',
      );
    }
  }

  /**
   * Translate `text` into `targetLang`. Tries Bedrock first, then Google.
   * Returns the original text on any failure — translation is decorative; we
   * never want it to break a message thread.
   */
  async translate(text: string, targetLang: string): Promise<string> {
    if (!text || !targetLang) return text;
    const trimmed = text.trim();
    if (!trimmed) return text;
    if (Buffer.byteLength(trimmed, 'utf8') > MAX_TEXT_BYTES) return text;

    const target = targetLang.split('-')[0].toLowerCase();
    const key = this.cacheKey('t', target, trimmed);
    const cached = this.cache.get(key);
    if (cached) {
      cached.hits += 1;
      return cached.value;
    }

    let translated: string | null = null;
    if (this.bedrock) {
      try {
        translated = await this.translateWithBedrock(trimmed, target);
      } catch (err) {
        this.logger.warn(
          `Bedrock translate(${target}) failed, falling back to Google: ${(err as Error).message}`,
        );
      }
    }
    if (!translated) {
      translated = await this.translateWithGoogle(trimmed, target);
    }

    const value = translated || text;
    this.put(key, value);
    return value;
  }

  /**
   * Detect the source language of `text`. Returns null when detection fails;
   * callers should treat null as "unknown" rather than "english".
   */
  async detect(text: string): Promise<string | null> {
    if (!text) return null;
    const trimmed = text.trim();
    if (!trimmed) return null;
    if (Buffer.byteLength(trimmed, 'utf8') > MAX_TEXT_BYTES) return null;

    const key = this.cacheKey('d', '_', trimmed);
    const cached = this.cache.get(key);
    if (cached) {
      cached.hits += 1;
      return cached.value || null;
    }

    try {
      const url =
        `${GTX_URL}?client=gtx&sl=auto&tl=en&dt=t` +
        `&q=${encodeURIComponent(trimmed)}`;
      const { data } = await axios.get(url, {
        timeout: REQUEST_TIMEOUT_MS,
        headers: { 'User-Agent': 'Mozilla/5.0' },
        validateStatus: (s) => s >= 200 && s < 500,
      });
      // gtx response shape: [[...translations...], null, "<source-lang>", ...]
      const lang = Array.isArray(data) && typeof data[2] === 'string' ? data[2] : null;
      this.put(key, lang ?? '');
      return lang;
    } catch (err) {
      this.logger.warn(`detect failed: ${(err as Error).message}`);
      return null;
    }
  }

  // ---------- backends ----------

  /** Translate via Amazon Bedrock (Claude 3 Haiku). */
  private async translateWithBedrock(text: string, toLang: string): Promise<string> {
    if (!this.bedrock) throw new Error('Bedrock not configured');

    const prompt = `Translate the following text to ${LANG_NAMES[toLang] || toLang}.

Rules:
- Return ONLY the translated text, nothing else
- Preserve the meaning and context accurately
- Keep proper nouns (names, places) as appropriate
- Maintain the same tone and formality level
- For real estate content, use appropriate property terminology

Text to translate:
${text}

Translation:`;

    const command = new InvokeModelCommand({
      modelId: BEDROCK_MODEL_ID,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const response = await this.bedrock.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    const out = responseBody?.content?.[0]?.text;
    if (typeof out !== 'string' || !out.trim()) {
      throw new Error('empty Bedrock response');
    }
    return out.trim();
  }

  /** Legacy Google `gtx` translation — fallback only. */
  private async translateWithGoogle(text: string, toLang: string): Promise<string> {
    try {
      const url =
        `${GTX_URL}?client=gtx&sl=auto&tl=${encodeURIComponent(toLang)}&dt=t` +
        `&q=${encodeURIComponent(text)}`;
      const { data } = await axios.get(url, {
        timeout: REQUEST_TIMEOUT_MS,
        headers: { 'User-Agent': 'Mozilla/5.0' },
        validateStatus: (s) => s >= 200 && s < 500,
      });
      return this.parseTranslation(data) ?? text;
    } catch (err) {
      this.logger.warn(`Google translate(${toLang}) failed: ${(err as Error).message}`);
      return text;
    }
  }

  // ---------- internals ----------

  private parseTranslation(data: unknown): string | null {
    if (!Array.isArray(data) || !Array.isArray(data[0])) return null;
    // First inner array is a list of [translatedChunk, originalChunk, ...].
    const segments = data[0] as Array<unknown>;
    const out = segments
      .map((seg) => (Array.isArray(seg) && typeof seg[0] === 'string' ? seg[0] : ''))
      .join('');
    return out || null;
  }

  private cacheKey(kind: 'd' | 't', target: string, text: string): string {
    // The cache is keyed by (kind, target, text). For very long texts we still
    // include the full string — collisions there matter more than memory.
    return `${kind}:${target}:${text}`;
  }

  private put(key: string, value: string): void {
    if (this.cache.size >= CACHE_MAX) {
      // Evict the oldest entry — Map preserves insertion order.
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) this.cache.delete(firstKey);
    }
    this.cache.set(key, { value, hits: 1 });
  }
}
