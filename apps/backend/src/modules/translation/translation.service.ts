import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

const GTX_URL = 'https://translate.googleapis.com/translate_a/single';
const REQUEST_TIMEOUT_MS = 3000;
const CACHE_MAX = 1000;
const MAX_TEXT_BYTES = 5000; // Google's per-request soft limit on the gtx endpoint

interface CacheEntry {
  value: string;
  hits: number;
}

/**
 * Light wrapper around the unofficial Google Translate `gtx` client. Used by
 * messaging to (a) detect the source language at send time and (b) translate
 * a message into a viewer's preferred display locale on demand.
 *
 * No API key is required — this is the same endpoint the public Google
 * Translate widget uses. We keep an in-memory LRU on top so repeat reads of
 * the same conversation don't hammer the endpoint and Google doesn't start
 * 429-ing the box.
 */
@Injectable()
export class TranslationService {
  private readonly logger = new Logger(TranslationService.name);
  private readonly cache = new Map<string, CacheEntry>();

  /**
   * Translate `text` into `targetLang`. Returns the original text on any
   * failure — translation is decorative; we never want it to break a message
   * thread.
   */
  async translate(text: string, targetLang: string): Promise<string> {
    if (!text || !targetLang) return text;
    const trimmed = text.trim();
    if (!trimmed) return text;
    if (Buffer.byteLength(trimmed, 'utf8') > MAX_TEXT_BYTES) return text;

    const key = this.cacheKey('t', targetLang, trimmed);
    const cached = this.cache.get(key);
    if (cached) {
      cached.hits += 1;
      return cached.value;
    }

    try {
      const url =
        `${GTX_URL}?client=gtx&sl=auto&tl=${encodeURIComponent(targetLang)}&dt=t` +
        `&q=${encodeURIComponent(trimmed)}`;
      const { data } = await axios.get(url, {
        timeout: REQUEST_TIMEOUT_MS,
        headers: { 'User-Agent': 'Mozilla/5.0' },
        validateStatus: (s) => s >= 200 && s < 500,
      });
      const translated = this.parseTranslation(data) ?? text;
      this.put(key, translated);
      return translated;
    } catch (err) {
      this.logger.warn(`translate(${targetLang}) failed: ${(err as Error).message}`);
      return text;
    }
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
