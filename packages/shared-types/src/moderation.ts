import { ModerationDecision } from './enums';

export interface ModerationCase {
  id: string;
  listingId: string;
  assignedToId: string | null;
  decision: ModerationDecision | null;
  reasons: string[];
  internalNotes: string | null;
  publicReason: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

export interface ModerationDecisionRequest {
  decision: ModerationDecision;
  reasons?: string[];
  internalNotes?: string;
  publicReason?: string;
}

export interface AuditLogEntry {
  id: string;
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  changes: Record<string, unknown>;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}
