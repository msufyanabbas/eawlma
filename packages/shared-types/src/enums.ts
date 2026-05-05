// =============================================================================
// Eawlma — Shared enums (single source of truth between FE & BE)
// =============================================================================

export enum Locale {
  AR = 'ar',
  EN = 'en',
}

export enum UserRole {
  USER = 'user',
  AGENT = 'agent',
  AGENCY_ADMIN = 'agency_admin',
  MODERATOR = 'moderator',
  ADMIN = 'admin',
}

export enum UserStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  DEACTIVATED = 'deactivated',
}

export enum VerificationStatus {
  UNVERIFIED = 'unverified',
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
}

export enum ListingType {
  SALE = 'sale',
  RENT = 'rent',
}

export enum PropertyType {
  APARTMENT = 'apartment',
  VILLA = 'villa',
  TOWNHOUSE = 'townhouse',
  STUDIO = 'studio',
  PENTHOUSE = 'penthouse',
  DUPLEX = 'duplex',
  LAND = 'land',
  COMMERCIAL = 'commercial',
  OFFICE = 'office',
  WAREHOUSE = 'warehouse',
  FARM = 'farm',
  CHALET = 'chalet',
  HOTEL_APARTMENT = 'hotel_apartment',
  BUILDING = 'building',
}

export enum ListingStatus {
  DRAFT = 'draft',
  PENDING_REVIEW = 'pending_review',
  ACTIVE = 'active',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
  SOLD = 'sold',
  RENTED = 'rented',
  ARCHIVED = 'archived',
}

export enum ListingFurnishing {
  UNFURNISHED = 'unfurnished',
  SEMI_FURNISHED = 'semi_furnished',
  FURNISHED = 'furnished',
}

export enum RentPeriod {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly',
}

export enum MediaType {
  IMAGE = 'image',
  VIDEO = 'video',
  TOUR_360 = 'tour_360',
  FLOORPLAN = 'floorplan',
}

export enum InquiryStatus {
  NEW = 'new',
  CONTACTED = 'contacted',
  QUALIFIED = 'qualified',
  UNQUALIFIED = 'unqualified',
  CLOSED = 'closed',
}

export enum NotificationType {
  INQUIRY_RECEIVED = 'inquiry_received',
  MESSAGE_RECEIVED = 'message_received',
  LISTING_APPROVED = 'listing_approved',
  LISTING_REJECTED = 'listing_rejected',
  LISTING_EXPIRING = 'listing_expiring',
  LISTING_EXPIRED = 'listing_expired',
  PAYMENT_SUCCEEDED = 'payment_succeeded',
  PAYMENT_FAILED = 'payment_failed',
  ACCOUNT_VERIFIED = 'account_verified',
  PRICE_DROP = 'price_drop',
  SAVED_SEARCH_MATCH = 'saved_search_match',
}

export enum NotificationChannel {
  IN_APP = 'in_app',
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
}

export enum PaymentStatus {
  INITIATED = 'initiated',
  PENDING = 'pending',
  AUTHORIZED = 'authorized',
  CAPTURED = 'captured',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  VOIDED = 'voided',
}

export enum PaymentPurpose {
  FEATURED_LISTING = 'featured_listing',
  SUBSCRIPTION = 'subscription',
  LEAD_PACK = 'lead_pack',
}

export enum SubscriptionPlan {
  FREE = 'free',
  STARTER = 'starter',
  PRO = 'pro',
  AGENCY = 'agency',
  ENTERPRISE = 'enterprise',
}

export enum SubscriptionStatus {
  TRIALING = 'trialing',
  ACTIVE = 'active',
  PAST_DUE = 'past_due',
  CANCELED = 'canceled',
  EXPIRED = 'expired',
}

export enum ModerationDecision {
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CHANGES_REQUESTED = 'changes_requested',
}

export enum AuditAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LOGIN = 'login',
  LOGOUT = 'logout',
  PASSWORD_CHANGE = 'password_change',
  ROLE_CHANGE = 'role_change',
  STATUS_CHANGE = 'status_change',
  PAYMENT = 'payment',
  EXPORT = 'export',
}

export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}

export enum ListingSortField {
  CREATED_AT = 'createdAt',
  PRICE = 'price',
  AREA = 'area',
  RELEVANCE = 'relevance',
  POPULARITY = 'popularity',
}
