import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

import { PaymentsService } from './payments.service';
import { MoyasarClient } from './moyasar.client';
import { InvoiceService } from './invoice.service';
import {
  CreatePaymentResponseDto,
  FeaturedListingPaymentDto,
  SubscriptionPaymentDto,
} from './dto/payment.dto';

interface RequestWithRawBody extends Request {
  rawBody?: Buffer;
}

@ApiTags('payments')
@Controller({ path: 'payments', version: '1' })
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly moyasar: MoyasarClient,
    private readonly invoiceService: InvoiceService,
  ) {}

  @ApiBearerAuth('access-token')
  @Post('featured-listing')
  @ApiOperation({ summary: 'Create a payment to feature a listing for a number of days' })
  async featuredListing(
    @CurrentUser('id') userId: string,
    @Body() dto: FeaturedListingPaymentDto,
  ): Promise<CreatePaymentResponseDto> {
    const payment = await this.paymentsService.initiateFeaturedListingPayment(userId, dto);
    return {
      paymentId: payment.id,
      providerPaymentId: payment.providerPaymentId ?? '',
      redirectUrl:
        ((payment.providerPayload as { transaction_url?: string })?.transaction_url ??
          (payment.providerPayload as { source?: { transaction_url?: string } })?.source
            ?.transaction_url) ?? null,
      status: payment.status,
    };
  }

  @ApiBearerAuth('access-token')
  @Post('subscriptions')
  @ApiOperation({ summary: 'Create a payment to upgrade to a paid subscription plan' })
  async subscription(
    @CurrentUser('id') userId: string,
    @Body() dto: SubscriptionPaymentDto,
  ): Promise<CreatePaymentResponseDto> {
    const payment = await this.paymentsService.initiateSubscriptionPayment(userId, dto);
    return {
      paymentId: payment.id,
      providerPaymentId: payment.providerPaymentId ?? '',
      redirectUrl:
        ((payment.providerPayload as { transaction_url?: string })?.transaction_url ??
          (payment.providerPayload as { source?: { transaction_url?: string } })?.source
            ?.transaction_url) ?? null,
      status: payment.status,
    };
  }

  @ApiBearerAuth('access-token')
  @Get('mine')
  @ApiOperation({ summary: 'List the current user\'s payments' })
  async mine(
    @CurrentUser('id') userId: string,
    @Query() pagination: PaginationQueryDto,
  ) {
    return this.paymentsService.listForUser(
      userId,
      pagination.page ?? 1,
      pagination.limit ?? 20,
    );
  }

  @ApiBearerAuth('access-token')
  @Get(':id/invoice')
  @ApiOperation({ summary: 'Download the PDF invoice for a payment' })
  async invoice(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @Res() res: Response,
  ): Promise<void> {
    const payment = await this.paymentsService.findByIdForUser(id, userId);
    const buyer = await this.paymentsService.getBuyerForInvoice(payment);
    const buf = await this.invoiceService.render({
      payment,
      buyer: buyer
        ? { firstName: buyer.firstName, lastName: buyer.lastName, email: buyer.email }
        : null,
    });
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Length': buf.length.toString(),
      'Content-Disposition': `inline; filename="eawlma-invoice-${payment.id.slice(0, 8)}.pdf"`,
    });
    res.send(buf);
  }

  // ---- Webhook (public, signature-verified) -----------------------------

  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Moyasar webhook receiver (HMAC-verified)' })
  @ApiUnauthorizedResponse({ description: 'Invalid signature' })
  async webhook(
    @Headers('x-moyasar-signature') signature: string | undefined,
    @Headers('x-eawlma-signature') eawlmaSignature: string | undefined,
    @Req() req: RequestWithRawBody,
    @Body() body: Record<string, unknown>,
  ): Promise<{ ok: boolean }> {
    const provided = signature ?? eawlmaSignature;
    const raw = req.rawBody ?? Buffer.from(JSON.stringify(body), 'utf-8');
    const ok = this.moyasar.verifyWebhookSignature(raw, provided);
    if (!ok) return { ok: false };
    return this.paymentsService.handleWebhookPayload(body);
  }
}
