import { apiClient, unwrap } from './client';

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';

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
}

export const bookingsApi = {
  create: async (payload: CreateBookingPayload): Promise<Booking> => {
    const { data } = await apiClient.post<{ data: Booking }>('/bookings', payload);
    return unwrap<Booking>(data);
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
