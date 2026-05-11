import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Min,
} from 'class-validator';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';

import { PromosService } from './promos.service';
import {
  PromoApplicableTo,
  PromoCodeEntity,
  PromoType,
} from './entities/promo-code.entity';

class ValidatePromoDto {
  @IsString()
  @Length(1, 32)
  code: string;

  @IsOptional()
  @IsUUID()
  listingId?: string;

  @IsNumber()
  @Min(0)
  amount: number;
}

class ApplyPromoDto {
  @IsString()
  @Length(1, 32)
  code: string;

  @IsUUID()
  bookingId: string;
}

class UpsertPromoDto {
  @IsOptional()
  @IsString()
  @Length(1, 32)
  code?: string;

  @IsOptional()
  @IsIn(['percentage', 'fixed_amount', 'free_nights'])
  type?: PromoType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountValue?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minBookingAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDiscountAmount?: number | null;

  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxUses?: number | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsIn(['all', 'stays', 'long_term', 'specific_listing'])
  applicableTo?: PromoApplicableTo;

  @IsOptional()
  @IsUUID()
  listingId?: string | null;
}

@ApiTags('promos')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller({ path: 'promos', version: '1' })
export class PromosController {
  constructor(private readonly service: PromosService) {}

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate a promo code against an amount and listing.' })
  async validate(@Body() dto: ValidatePromoDto) {
    return this.service.validate(dto.code, dto.listingId, dto.amount);
  }

  @Post('apply')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Apply a promo code to one of your bookings.' })
  async apply(@CurrentUser() user: RequestUser, @Body() dto: ApplyPromoDto) {
    return this.service.apply(dto.code, user.id, dto.bookingId);
  }
}

@ApiTags('admin', 'promos')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller({ path: 'admin/promos', version: '1' })
export class AdminPromosController {
  constructor(private readonly service: PromosService) {}

  @Get()
  @ApiOperation({ summary: 'Admin: list all promo codes.' })
  async list(@CurrentUser() actor: RequestUser): Promise<PromoCodeEntity[]> {
    return this.service.listAll(actor);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Admin: create promo code.' })
  async create(@CurrentUser() actor: RequestUser, @Body() dto: UpsertPromoDto) {
    return this.service.create(actor, this.toPartial(dto));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Admin: update/deactivate promo code.' })
  async update(
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpsertPromoDto,
  ) {
    return this.service.update(actor, id, this.toPartial(dto));
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Admin: delete promo code.' })
  async remove(
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ deleted: true }> {
    await this.service.remove(actor, id);
    return { deleted: true };
  }

  @Get(':id/usage')
  @ApiOperation({ summary: 'Admin: usage rows for a promo code.' })
  async usage(
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.usageFor(actor, id);
  }

  private toPartial(dto: UpsertPromoDto): Partial<PromoCodeEntity> {
    // Numeric columns are stored as strings (numeric/decimal) — coerce so the
    // service hands TypeORM the right shape without callers having to know.
    const patch: Partial<PromoCodeEntity> = {};
    if (dto.code !== undefined) patch.code = dto.code;
    if (dto.type !== undefined) patch.type = dto.type;
    if (dto.discountValue !== undefined) patch.discountValue = String(dto.discountValue);
    if (dto.minBookingAmount !== undefined) patch.minBookingAmount = String(dto.minBookingAmount);
    if (dto.maxDiscountAmount !== undefined) {
      patch.maxDiscountAmount = dto.maxDiscountAmount === null ? null : String(dto.maxDiscountAmount);
    }
    if (dto.validFrom !== undefined) patch.validFrom = new Date(dto.validFrom);
    if (dto.validUntil !== undefined) patch.validUntil = new Date(dto.validUntil);
    if (dto.maxUses !== undefined) patch.maxUses = dto.maxUses;
    if (dto.isActive !== undefined) patch.isActive = dto.isActive;
    if (dto.applicableTo !== undefined) patch.applicableTo = dto.applicableTo;
    if (dto.listingId !== undefined) patch.listingId = dto.listingId;
    return patch;
  }
}
