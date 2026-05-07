import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';
import { PaginationMeta, PaginationQueryDto } from '../../common/dto/pagination.dto';

import { WalletService } from './wallet.service';
import {
  DepositDto,
  WalletResponseDto,
  WalletSummaryDto,
  WalletTransactionResponseDto,
} from './dto/wallet.dto';

@ApiTags('wallet')
@Controller({ path: 'wallet', version: '1' })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class WalletController {
  constructor(private readonly wallet: WalletService) {}

  // The JwtStrategy.validate() returns `{ id, email, role }`, so `req.user.id`
  // is the user UUID. (An earlier draft used `user.sub` which is the JWT
  // payload key — but Passport doesn't pass the raw payload through, only the
  // RequestUser projection, so `sub` is always `undefined` and inserts blew up
  // with "null value in column user_id".)
  private requireUserId(user: RequestUser | undefined): string {
    if (!user?.id) {
      throw new UnauthorizedException('User not authenticated');
    }
    return user.id;
  }

  @Get('me')
  @ApiOperation({ summary: 'Get the current user wallet (creates one on first call).' })
  async me(@CurrentUser() user: RequestUser | undefined): Promise<WalletSummaryDto> {
    const userId = this.requireUserId(user);
    const wallet = await this.wallet.getOrCreate(userId);
    const recent = await this.wallet.recentTransactions(userId, 10);
    return {
      wallet: WalletResponseDto.fromEntity(wallet),
      recentTransactions: recent.map(WalletTransactionResponseDto.fromEntity),
    };
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Paginated wallet transaction history for the current user.' })
  async transactions(
    @CurrentUser() user: RequestUser | undefined,
    @Query() pagination: PaginationQueryDto,
  ): Promise<{
    data: WalletTransactionResponseDto[];
    meta: PaginationMeta;
  }> {
    const userId = this.requireUserId(user);
    const result = await this.wallet.listTransactions(
      userId,
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
    @CurrentUser() user: RequestUser | undefined,
    @Body() dto: DepositDto,
  ): Promise<WalletTransactionResponseDto> {
    const userId = this.requireUserId(user);
    if (!dto?.amount || dto.amount <= 0) {
      throw new BadRequestException('amount must be > 0');
    }
    const txn = await this.wallet.deposit(userId, dto.amount, dto.description);
    return WalletTransactionResponseDto.fromEntity(txn);
  }

  @Post('pay-commission/:commissionId')
  @ApiOperation({
    summary:
      'Pay a confirmed commission from the wallet. Debits the buyer/payer, credits the agent, and marks the commission as paid.',
  })
  async payCommission(
    @CurrentUser() user: RequestUser | undefined,
    @Param('commissionId', ParseUUIDPipe) commissionId: string,
  ): Promise<{ ok: true }> {
    const userId = this.requireUserId(user);
    await this.wallet.payCommission(userId, commissionId);
    return { ok: true };
  }
}

