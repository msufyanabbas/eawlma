import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';

import { BookingsService } from './bookings.service';
import { BookingResponseDto, CreateBookingDto } from './dto/booking.dto';

@ApiTags('bookings')
@Controller({ path: 'bookings', version: '1' })
export class BookingsController {
  constructor(private readonly bookings: BookingsService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a daily booking and initialise its Moyasar payment.' })
  async create(
    @CurrentUser() actor: RequestUser,
    @Body() dto: CreateBookingDto,
  ): Promise<{
    booking: BookingResponseDto;
    paymentUrl: string | null;
    paymentId: string;
    mockPayment: boolean;
  }> {
    const result = await this.bookings.create(actor, dto);
    return {
      booking: BookingResponseDto.fromEntity(result.booking),
      paymentUrl: result.paymentUrl,
      paymentId: result.paymentId,
      mockPayment: result.mockPayment,
    };
  }

  @Public()
  @Post('payment-callback')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Payment-provider callback — flips the booking to confirmed/cancelled.',
  })
  async paymentCallback(
    @Body()
    body: {
      bookingId: string;
      status: string;
      paymentId?: string;
      promoCode?: string;
    },
  ): Promise<{ status: string; bookingId: string }> {
    return this.bookings.handlePaymentCallback(
      body.bookingId,
      body.status,
      body.paymentId,
      body.promoCode,
    );
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @Get('my')
  @ApiOperation({ summary: 'List bookings the current user has made (guest view).' })
  async my(@CurrentUser() actor: RequestUser): Promise<BookingResponseDto[]> {
    const list = await this.bookings.listForGuest(actor.id);
    return list.map(BookingResponseDto.fromEntity);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @Get('host')
  @ApiOperation({ summary: 'List bookings on listings the current user owns (host view).' })
  async host(@CurrentUser() actor: RequestUser): Promise<BookingResponseDto[]> {
    const list = await this.bookings.listForHost(actor.id);
    return list.map(BookingResponseDto.fromEntity);
  }

  @Public()
  @Get('availability')
  @ApiOperation({ summary: 'List confirmed/pending bookings for a listing — used to disable dates in the calendar.' })
  async availability(
    @Query('listingId', ParseUUIDPipe) listingId: string,
  ): Promise<BookingResponseDto[]> {
    const list = await this.bookings.listConfirmedForListing(listingId);
    return list.map(BookingResponseDto.fromEntity);
  }

  /** Path-style alias of `/bookings/availability?listingId=…`. Same result —
   *  kept for clients that prefer RESTful path params. */
  @Public()
  @Get('listing/:listingId/availability')
  @ApiOperation({ summary: 'Path-param alias of GET /bookings/availability.' })
  async availabilityByPath(
    @Param('listingId', ParseUUIDPipe) listingId: string,
  ): Promise<BookingResponseDto[]> {
    const list = await this.bookings.listConfirmedForListing(listingId);
    return list.map(BookingResponseDto.fromEntity);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @Patch(':id/confirm')
  @ApiOperation({ summary: 'Host confirms a pending booking.' })
  async confirm(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: RequestUser,
  ): Promise<BookingResponseDto> {
    const b = await this.bookings.confirm(id, actor);
    return BookingResponseDto.fromEntity(b);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel a booking (guest or host).' })
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: RequestUser,
  ): Promise<BookingResponseDto> {
    const b = await this.bookings.cancel(id, actor);
    return BookingResponseDto.fromEntity(b);
  }
}
