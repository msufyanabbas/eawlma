import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  IsUrl,
  Length,
  Max,
  Min,
} from 'class-validator';
import { SubscriptionPlan } from '@aqarat/shared-types';

export class FeaturedListingPaymentDto {
  @ApiProperty()
  @IsUUID('4')
  listingId: string;

  @ApiProperty({ minimum: 1, maximum: 90 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(90)
  durationDays: number;

  @ApiPropertyOptional({ description: 'Where to redirect after payment' })
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  callbackUrl?: string;
}

export class SubscriptionPaymentDto {
  @ApiProperty({ enum: SubscriptionPlan })
  @IsEnum(SubscriptionPlan)
  planKey: SubscriptionPlan;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  callbackUrl?: string;
}

export class CreatePaymentResponseDto {
  @ApiProperty() paymentId: string;
  @ApiProperty() providerPaymentId: string;
  @ApiPropertyOptional({ nullable: true }) redirectUrl: string | null;
  @ApiProperty() status: string;
}

export class WebhookHeadersDto {
  @ApiPropertyOptional() signature?: string;
}

export class MoyasarWebhookPayload {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  data?: Record<string, unknown>;

  // Older Moyasar webhook shape — they sometimes flatten the payment object directly.
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Length(0, 500)
  source?: Record<string, unknown> | string;

  @ApiPropertyOptional()
  @IsOptional()
  metadata?: Record<string, unknown>;
}
