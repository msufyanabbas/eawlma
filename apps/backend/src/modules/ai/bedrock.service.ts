import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';

export interface ChatRequest {
  /** A short tag for logs / cache keys (e.g. "translate", "enhance") */
  purpose: string;
  systemPrompt: string;
  userPrompt: string;
  /** When true, instruct the model to return a JSON-formatted response. */
  jsonMode?: boolean;
  maxTokens?: number;
  temperature?: number;
}

export interface ChatResult {
  /** The model's response text (or stub when no credentials are configured). */
  text: string;
  /** True when this came from the live Bedrock API; false when stubbed. */
  live: boolean;
  /** Approx tokens used (live only). */
  tokensUsed?: number;
}

/**
 * Wraps Amazon Bedrock (Amazon Nova) with:
 *   - exponential backoff retry on transient errors (429, 5xx, throttling)
 *   - a deterministic dev-stub mode when AWS credentials are empty so the
 *     translation pipeline + endpoints can be smoke-tested without burning
 *     tokens
 *   - graceful failure: callers receive a `live: false` stub rather than
 *     an exception, so listing publication never blocks on AI.
 */
@Injectable()
export class BedrockService implements OnModuleInit {
  private readonly logger = new Logger(BedrockService.name);
  private client: BedrockRuntimeClient | null = null;
  private model = 'us.amazon.nova-lite-v1:0';
  private maxTokensDefault = 2000;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const accessKeyId = this.config.get<string>('services.aws.accessKeyId') ?? '';
    const secretAccessKey =
      this.config.get<string>('services.aws.secretAccessKey') ?? '';
    const region =
      this.config.get<string>('services.bedrock.region') ??
      this.config.get<string>('services.aws.region') ??
      'us-east-1';
    this.model = this.config.get<string>('services.bedrock.model') ?? this.model;
    this.maxTokensDefault =
      this.config.get<number>('services.bedrock.maxTokens') ?? 2000;
    if (accessKeyId && secretAccessKey) {
      this.client = new BedrockRuntimeClient({
        region,
        credentials: { accessKeyId, secretAccessKey },
      });
      this.logger.log(
        `Bedrock AI client initialised (model=${this.model}, region=${region})`,
      );
    } else {
      this.logger.warn(
        'AWS credentials not set — BedrockService will return deterministic stubs',
      );
    }
  }

  isConfigured(): boolean {
    return this.client !== null;
  }

  async chat(req: ChatRequest): Promise<ChatResult> {
    if (!this.client) return { text: this.stub(req), live: false };

    // Amazon Nova has no native JSON-response mode, so we append the
    // constraint to the system prompt instead.
    const systemPrompt = req.jsonMode
      ? `${req.systemPrompt}\n\nRespond with ONLY a single valid JSON object — no markdown fences, no preamble, no commentary.`
      : req.systemPrompt;

    const maxAttempts = 4;
    const baseDelayMs = 500;
    let attempt = 0;
    while (attempt < maxAttempts) {
      try {
        const command = new InvokeModelCommand({
          modelId: this.model,
          contentType: 'application/json',
          accept: 'application/json',
          body: JSON.stringify({
            system: [{ text: systemPrompt }],
            messages: [
              { role: 'user', content: [{ text: req.userPrompt }] },
            ],
            inferenceConfig: {
              max_new_tokens: req.maxTokens ?? this.maxTokensDefault,
              temperature: req.temperature ?? 0.7,
            },
          }),
        });
        const response = await this.client.send(command);
        const body = JSON.parse(new TextDecoder().decode(response.body)) as {
          output?: { message?: { content?: Array<{ text?: string }> } };
          usage?: { inputTokens?: number; outputTokens?: number };
        };
        const text = body.output?.message?.content?.[0]?.text?.trim() ?? '';
        const usage = body.usage;
        return {
          text,
          live: true,
          tokensUsed: usage
            ? (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0)
            : undefined,
        };
      } catch (err: unknown) {
        const status =
          (err as { $metadata?: { httpStatusCode?: number } }).$metadata
            ?.httpStatusCode ?? 0;
        const name = (err as { name?: string }).name ?? '';
        const transient =
          status === 429 ||
          (status >= 500 && status < 600) ||
          status === 0 ||
          name === 'ThrottlingException' ||
          name === 'ModelTimeoutException' ||
          name === 'ServiceUnavailableException';
        attempt += 1;
        if (!transient || attempt >= maxAttempts) {
          this.logger.error(
            `Bedrock chat (${req.purpose}) failed after ${attempt} attempts: ${(err as Error).message}`,
          );
          // Graceful fallback so the caller can still complete its workflow
          return { text: this.stub(req), live: false };
        }
        const delay = baseDelayMs * 2 ** (attempt - 1) + Math.random() * 200;
        this.logger.warn(
          `Bedrock chat (${req.purpose}) attempt ${attempt}/${maxAttempts} hit ${status || name} — retrying in ${Math.round(delay)}ms`,
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
      return JSON.stringify({
        stub: true,
        purpose: req.purpose,
        sample: req.userPrompt.slice(0, 80),
      });
    }
    return `[stub:${req.purpose}] ${req.userPrompt.slice(0, 200)}`;
  }
}
