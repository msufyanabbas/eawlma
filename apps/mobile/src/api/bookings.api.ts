import api from './client';

// Backend CreateBookingDto fields: listingId, checkIn, checkOut, numGuests,
// notes, promoCode. The route is POST /bookings.
export const bookingsApi = {
  create: (data: {
    listingId: string;
    checkIn: string;
    checkOut: string;
    numGuests?: number;
    notes?: string;
    promoCode?: string;
  }) => api.post('/bookings', data).then(r => r.data),

  myBookings: () =>
    api.get('/bookings/my').then(r => r.data),

  hostBookings: () =>
    api.get('/bookings/host').then(r => r.data),

  availability: (listingId: string) =>
    api.get('/bookings/availability', { params: { listingId } }).then(r => r.data),

  confirm: (id: string) =>
    api.patch(`/bookings/${id}/confirm`).then(r => r.data),

  cancel: (id: string) =>
    api.patch(`/bookings/${id}/cancel`).then(r => r.data),
};
