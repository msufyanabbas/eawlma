import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';

const BEDROCK_MODEL_ID = 'anthropic.claude-3-5-haiku-20241022-v1:0';

export type ModerationCategory =
  | 'clean'
  | 'spam'
  | 'inappropriate'
  | 'offensive'
  | 'misleading'
  | 'illegal';

export interface ModerationResult {
  approved: boolean;
  /** 0-100, higher = more problematic. */
  score: number;
  reasons: string[];
  category: ModerationCategory;
  requiresReview: boolean;
}

/**
 * AI content moderation for user-generated content (listings, messages,
 * reviews). Sends the content to Amazon Bedrock (Claude 3 Haiku) with a
 * Saudi-real-estate-specific rubric and parses back a structured verdict.
 *
 * Fail-open by design: if Bedrock is unconfigured or errors, content is
 * allowed through but flagged `requiresReview` so a human still sees it.
 */
@Injectable()
export class ModerationService {
  private readonly logger = new Logger(ModerationService.name);
  private readonly bedrock: BedrockRuntimeClient | null;

  constructor(private readonly config: ConfigService) {
    const region =
      this.config.get<string>('AWS_BEDROCK_REGION') ??
      this.config.get<string>('AWS_REGION') ??
      'us-east-1';
    const accessKeyId = this.config.get<string>('AWS_ACCESS_KEY_ID') ?? '';
    const secretAccessKey = this.config.get<string>('AWS_SECRET_ACCESS_KEY') ?? '';

    this.bedrock =
      accessKeyId && secretAccessKey
        ? new BedrockRuntimeClient({
            region,
            credentials: { accessKeyId, secretAccessKey },
          })
        : null;

    if (!this.bedrock) {
      this.logger.warn(
        'Bedrock credentials not configured — moderation is a no-op (content flagged for review).',
      );
    }
  }

  async moderateListing(listing: {
    titleAr?: string;
    titleEn?: string;
    descriptionAr?: string;
    descriptionEn?: string;
    price?: number;
    propertyType?: string;
    city?: string;
  }): Promise<ModerationResult> {
    const content = [
      listing.titleAr,
      listing.titleEn,
      listing.descriptionAr,
      listing.descriptionEn,
    ]
      .filter(Boolean)
      .join('\n\n');

    return this.moderateContent(content, 'listing');
  }

  async moderateMessage(text: string): Promise<ModerationResult> {
    return this.moderateContent(text, 'message');
  }

  async moderateReview(text: string): Promise<ModerationResult> {
    return this.moderateContent(text, 'review');
  }

  private async moderateContent(
    content: string,
    type: 'listing' | 'message' | 'review',
  ): Promise<ModerationResult> {
    // Nothing to check, or no AI backend — flag for human review, allow through.
    if (!content?.trim() || !this.bedrock) {
      return {
        approved: true,
        score: 0,
        reasons: [],
        category: 'clean',
        requiresReview: !this.bedrock,
      };
    }

    try {
      const prompt = `You are a content moderation AI for a Saudi Arabian real estate platform.

Analyze the following ${type} content and determine if it should be approved.

Content to review:
"""
${content}
"""

Check for:
1. Spam or fake listings (unrealistic prices, irrelevant content)
2. Offensive, inappropriate, or immoral language
3. Discriminatory content (based on religion, nationality, gender)
4. Illegal content or activities
5. Misleading or fraudulent information
6. Personal contact information in listings (phone/email in description)
7. Content violating Islamic values or Saudi regulations
8. Promotional content not related to real estate

Respond with ONLY a valid JSON object (no markdown):
{
  "approved": true/false,
  "score": 0-100,
  "category": "clean|spam|inappropriate|offensive|misleading|illegal",
  "reasons": ["reason1", "reason2"],
  "requiresReview": true/false
}

Score guide: 0-20=clean, 21-50=minor issues, 51-80=review needed, 81-100=reject`;

      const command = new InvokeModelCommand({
        modelId: BEDROCK_MODEL_ID,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
          anthropic_version: 'bedrock-2023-05-31',
          max_tokens: 512,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      const response = await this.bedrock.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      const resultText: string = responseBody?.content?.[0]?.text?.trim() ?? '';

      const result = this.parseResult(resultText);
      this.logger.debug(
        `Moderation result for ${type}: score=${result.score}, approved=${result.approved}`,
      );
      return result;
    } catch (error) {
      this.logger.error(`Moderation failed: ${(error as Error).message}`);
      // On error, allow content but flag for manual review.
      return {
        approved: true,
        score: 0,
        reasons: [],
        category: 'clean',
        requiresReview: true,
      };
    }
  }

  /** Defensively parse the model's JSON — strips stray markdown fences. */
  private parseResult(text: string): ModerationResult {
    const cleaned = text.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
    const parsed = JSON.parse(cleaned) as Partial<ModerationResult>;

    const score = Math.max(0, Math.min(100, Number(parsed.score) || 0));
    return {
      approved: parsed.approved !== false,
      score,
      reasons: Array.isArray(parsed.reasons) ? parsed.reasons.map(String) : [],
      category: (parsed.category as ModerationCategory) ?? 'clean',
      requiresReview: parsed.requiresReview === true || score > 50,
    };
  }
}
