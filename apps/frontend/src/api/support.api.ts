import { apiClient } from './client';

export type SupportTicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type SupportTicketCategory =
  | 'general'
  | 'technical'
  | 'billing'
  | 'listing'
  | 'account'
  | 'other';
export type SupportTicketPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface SupportTicket {
  id: string;
  userId: string;
  subject: string;
  description: string;
  category: SupportTicketCategory;
  priority: SupportTicketPriority;
  status: SupportTicketStatus;
  ticketNumber: string | null;
  resolvedAt: string | null;
  resolution: string | null;
  assignedToId: string | null;
  userEmail?: string | null;
  userName?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SupportMessage {
  id: string;
  ticketId: string;
  senderId: string;
  message: string;
  isStaff: boolean;
  attachmentUrl: string | null;
  senderName?: string | null;
  createdAt: string;
}

export interface CreateTicketRequest {
  subject: string;
  description: string;
  category?: SupportTicketCategory;
  priority?: SupportTicketPriority;
}

export const supportApi = {
  myTickets: async (): Promise<SupportTicket[]> => {
    const { data } = await apiClient.get<SupportTicket[]>('/support/tickets');
    return data ?? [];
  },

  getTicket: async (id: string): Promise<SupportTicket> => {
    const { data } = await apiClient.get<SupportTicket>(`/support/tickets/${id}`);
    return data;
  },

  listMessages: async (ticketId: string): Promise<SupportMessage[]> => {
    const { data } = await apiClient.get<SupportMessage[]>(
      `/support/tickets/${ticketId}/messages`,
    );
    return data ?? [];
  },

  createTicket: async (payload: CreateTicketRequest): Promise<SupportTicket> => {
    const { data } = await apiClient.post<SupportTicket>('/support/tickets', payload);
    return data;
  },

  reply: async (ticketId: string, message: string): Promise<SupportMessage> => {
    const { data } = await apiClient.post<SupportMessage>(
      `/support/tickets/${ticketId}/messages`,
      { message },
    );
    return data;
  },

  // Admin
  adminList: async (params: {
    status?: SupportTicketStatus;
    category?: SupportTicketCategory;
  } = {}): Promise<SupportTicket[]> => {
    const { data } = await apiClient.get<SupportTicket[]>('/support/admin/tickets', {
      params,
    });
    return data ?? [];
  },

  adminUpdateStatus: async (
    id: string,
    status: SupportTicketStatus,
    resolution?: string,
  ): Promise<SupportTicket> => {
    const { data } = await apiClient.patch<SupportTicket>(
      `/support/admin/tickets/${id}/status`,
      { status, resolution },
    );
    return data;
  },
};
