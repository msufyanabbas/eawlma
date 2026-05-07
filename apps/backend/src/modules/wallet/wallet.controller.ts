import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationMeta, PaginationQueryDto } from '../../common/dto/pagination.dto';

import { WalletService } from './wallet.service';
import {
  DepositDto,
  WalletResponseDto,
  WalletSummaryDto,
  WalletTransactionResponseDto,
} from './dto/wallet.dto';

interface CurrentUserPayload {
  sub: string;
  role?: string;
}

@ApiTags('wallet')
@Controller({ path: 'wallet', version: '1' })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class WalletController {
  constructor(private readonly wallet: WalletService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get the current user wallet (creates one on first call).' })
  async me(@CurrentUser() user: CurrentUserPayload): Promise<WalletSummaryDto> {
    const wallet = await this.wallet.getOrCreate(user.sub);
    const recent = await this.wallet.recentTransactions(user.sub, 10);
    return {
      wallet: WalletResponseDto.fromEntity(wallet),
      recentTransactions: recent.map(WalletTransactionResponseDto.fromEntity),
    };
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Paginated wallet transaction history for the current user.' })
  async transactions(
    @CurrentUser() user: CurrentUserPayload,
    @Query() pagination: PaginationQueryDto,
  ): Promise<{
    data: WalletTransactionResponseDto[];
    meta: PaginationMeta;
  }> {
    const result = await this.wallet.listTransactions(
      user.sub,
      pagination.page ?? 1,
      pagination.limit ?? 20,
    );
    return {
      data: result.data.map(WalletTransactionResponseDto.fromEntity),
      meta: result.meta,
    };
  }

  @Post('deposit')
  @ApiOperation({
    summary:
      'Dev-only direct deposit. Production code should route through the Moyasar webhook to credit the wallet on a successful payment.',
  })
  async deposit(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: DepositDto,
  ): Promise<WalletTransactionResponseDto> {
    const txn = await this.wallet.deposit(user.sub, dto.amount, dto.description);
    return WalletTransactionResponseDto.fromEntity(txn);
  }

  @Post('pay-commission/:commissionId')
  @ApiOperation({
    summary:
      'Pay a confirmed commission from the wallet. Debits the buyer/payer, credits the agent, and marks the commission as paid.',
  })
  async payCommission(
    @CurrentUser() user: CurrentUserPayload,
    @Param('commissionId', ParseUUIDPipe) commissionId: string,
  ): Promise<{ ok: true }> {
    await this.wallet.payCommission(user.sub, commissionId);
    return { ok: true };
  }
}

