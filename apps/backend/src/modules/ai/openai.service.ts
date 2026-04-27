import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

export interface ChatRequest {
  /** A short tag for logs / cache keys (e.g. "translate", "enhance") */
  purpose: string;
  systemPrompt: string;
  userPrompt: string;
  /** When true, ask OpenAI for a JSON-formatted response. */
  jsonMode?: boolean;
  maxTokens?: number;
  temperature?: number;
}

export interface ChatResult {
  /** The model's response text (or stub when no API key is configured). */
  text: string;
  /** True when this came from the live OpenAI API; false when stubbed. */
  live: boolean;
  /** Approx tokens used (live only). */
  tokensUsed?: number;
}

/**
 * Wraps the OpenAI SDK with:
 *   - exponential backoff retry on transient errors (429, 5xx)
 *   - a deterministic dev-stub mode when `OPENAI_API_KEY` is empty so the
 *     translation pipeline + endpoints can be smoke-tested without burning
 *     tokens
 *   - graceful failure: callers receive a `live: false` stub rather than
 *     an exception, so listing publication never blocks on AI.
 */
@Injectable()
export class OpenAiService implements OnModuleInit {
  private readonly logger = new Logger(OpenAiService.name);
  private client: OpenAI | null = null;
  private model = 'gpt-4o';
  private maxTokensDefault = 2000;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const apiKey = this.config.get<string>('services.openai.apiKey') ?? '';
    this.model = this.config.get<string>('services.openai.model') ?? 'gpt-4o';
    this.maxTokensDefault =
      this.config.get<number>('services.openai.maxTokens') ?? 2000;
    if (apiKey) {
      this.client = new OpenAI({ apiKey });
      this.logger.log(`OpenAI client initialised (model=${this.model})`);
    } else {
      this.logger.warn(
        'OPENAI_API_KEY not set — OpenAiService will return deterministic stubs',
      );
    }
  }

  isConfigured(): boolean {
    return this.client !== null;
  }

  async chat(req: ChatRequest): Promise<ChatResult> {
    if (!this.client) return { text: this.stub(req), live: false };

    const maxAttempts = 4;
    const baseDelayMs = 500;
    let attempt = 0;
    while (attempt < maxAttempts) {
      try {
        const response = await this.client.chat.completions.create({
          model: this.model,
          temperature: req.temperature ?? 0.4,
          max_tokens: req.maxTokens ?? this.maxTokensDefault,
          response_format: req.jsonMode ? { type: 'json_object' } : undefined,
          messages: [
            { role: 'system', content: req.systemPrompt },
            { role: 'user', content: req.userPrompt },
          ],
        });
        const text = response.choices[0]?.message?.content?.trim() ?? '';
        return {
          text,
          live: true,
          tokensUsed: response.usage?.total_tokens,
        };
      } catch (err: unknown) {
        const status = (err as { status?: number }).status ?? 0;
        const transient = status === 429 || (status >= 500 && status < 600) || status === 0;
        attempt += 1;
        if (!transient || attempt >= maxAttempts) {
          this.logger.error(
            `OpenAI chat (${req.purpose}) failed after ${attempt} attempts: ${(err as Error).message}`,
          );
          // Graceful fallback so the caller can still complete its workflow
          return { text: this.stub(req), live: false };
        }
        const delay = baseDelayMs * 2 ** (attempt - 1) + Math.random() * 200;
        this.logger.warn(
          `OpenAI chat (${req.purpose}) attempt ${attempt}/${maxAttempts} hit ${status} — retrying in ${Math.round(delay)}ms`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    return { text: this.stub(req), live: false };
  }

  /**
   * Deterministic stub generator so dev-mode responses are predictable.
   * Echoes the purpose + a hash-stable prefix of the user prompt.
   */
  private stub(req: ChatRequest): string {
    if (req.jsonMode) {
      return JSON.stringify({ stub: true, purpose: req.purpose, sample: req.userPrompt.slice(0, 80) });
    }
    return `[stub:${req.purpose}] ${req.userPrompt.slice(0, 200)}`;
  }
}
