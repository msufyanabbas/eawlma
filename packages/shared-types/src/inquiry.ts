import { InquiryStatus } from './enums';

export type DealStatus =
  | 'none'
  | 'pending_confirmation'
  | 'confirmed'
  | 'disputed'
  | 'resolved';

export type DisputeFavor = 'agent' | 'buyer' | 'cancelled';

export interface Inquiry {
  id: string;
  listingId: string;
  agentId?: string;
  userId: string | null;     // null when sent by anonymous visitor
  guestName: string | null;
  guestEmail: string | null;
  guestPhone: string | null;
  message: string;
  status: InquiryStatus;
  agentNotes: string | null;
  nextAction: string | null;
  nextActionAt: string | null;
  preferredContactMethod: 'phone' | 'email' | 'whatsapp' | null;
  respondedAt: string | null;
  transactionValue: number | null;
  closedAt: string | null;
  dealClosedByAgent: boolean;
  dealConfirmedByBuyer: boolean;
  dealStatus: DealStatus;
  disputeReason: string | null;
  disputeRaisedBy: string | null;
  disputeRaisedAt: string | null;
  adminResolution: string | null;
  adminResolvedBy: string | null;
  adminResolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RaiseDisputeRequest {
  reason: string;
}

export interface AdminResolveDisputeRequest {
  resolution: string;
  favor: DisputeFavor;
}

export interface CloseInquiryDealRequest {
  transactionValue: number;
  closedAt?: string;
  notes?: string;
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
  nextAction?: string;
  nextActionAt?: string | null;
}
