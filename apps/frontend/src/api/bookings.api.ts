import { apiClient, unwrap } from './client';

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';

export type DepositStatus = 'held' | 'released' | 'claimed';

export interface Booking {
  id: string;
  listingId: string;
  guestId: string;
  hostId: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  numGuests: number;
  totalAmount: number;
  status: BookingStatus;
  depositAmount: number;
  depositStatus: DepositStatus;
  depositReleasedAt: string | null;
  /** Only populated when status is confirmed/completed. */
  checkInInstructions: string | null;
  notes: string | null;
  moyasarPaymentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBookingPayload {
  listingId: string;
  checkIn: string;
  checkOut: string;
  numGuests?: number;
  notes?: string;
  promoCode?: string;
}

export interface CreateBookingResult {
  booking: Booking;
  paymentUrl: string | null;
  paymentId: string;
  mockPayment: boolean;
}

export const bookingsApi = {
  create: async (payload: CreateBookingPayload): Promise<CreateBookingResult> => {
    const { data } = await apiClient.post<{ data: CreateBookingResult }>('/bookings', payload);
    return unwrap<CreateBookingResult>(data);
  },

  confirmPayment: async (
    bookingId: string,
    status: string,
    paymentId?: string,
    promoCode?: string,
  ): Promise<{ status: string; bookingId: string }> => {
    const { data } = await apiClient.post<{ data: { status: string; bookingId: string } }>(
      '/bookings/payment-callback',
      { bookingId, status, paymentId, promoCode },
    );
    return unwrap<{ status: string; bookingId: string }>(data);
  },
  my: async (): Promise<Booking[]> => {
    const { data } = await apiClient.get<{ data: Booking[] }>('/bookings/my');
    return unwrap<Booking[]>(data);
  },
  host: async (): Promise<Booking[]> => {
    const { data } = await apiClient.get<{ data: Booking[] }>('/bookings/host');
    return unwrap<Booking[]>(data);
  },
  availability: async (listingId: string): Promise<Booking[]> => {
    const { data } = await apiClient.get<{ data: Booking[] }>(
      '/bookings/availability',
      { params: { listingId } },
    );
    return unwrap<Booking[]>(data);
  },
  confirm: async (id: string): Promise<Booking> => {
    const { data } = await apiClient.patch<{ data: Booking }>(`/bookings/${id}/confirm`);
    return unwrap<Booking>(data);
  },
  cancel: async (id: string): Promise<Booking> => {
    const { data } = await apiClient.patch<{ data: Booking }>(`/bookings/${id}/cancel`);
    return unwrap<Booking>(data);
  },
};
