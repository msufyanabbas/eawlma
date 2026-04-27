import { InquiryStatus } from './enums';

export interface Inquiry {
  id: string;
  listingId: string;
  userId: string | null;     // null when sent by anonymous visitor
  guestName: string | null;
  guestEmail: string | null;
  guestPhone: string | null;
  message: string;
  status: InquiryStatus;
  agentNotes: string | null;
  respondedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInquiryRequest {
  listingId: string;
  message: string;
  // The following are required when the user is not authenticated
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
  preferredContactMethod?: 'phone' | 'email' | 'whatsapp';
}

export interface UpdateInquiryRequest {
  status?: InquiryStatus;
  agentNotes?: string;
}
