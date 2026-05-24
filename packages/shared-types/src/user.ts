import { UserRole, UserStatus, VerificationStatus } from './enums';

/** Per-user notification preferences. Missing keys are treated as opted-in. */
export interface UserNotificationPrefs {
  emailOnInquiry?: boolean;
  emailOnMessage?: boolean;
  pushNotifications?: boolean;
  /** Catch-all for new types added later — keyed by NotificationType. */
  [key: string]: boolean | undefined;
}

export interface User {
  id: string;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: UserStatus;
  avatarUrl: string | null;
  bio: string | null;
  preferredLocale: string;
  preferredTheme: 'light' | 'dark';
  emailVerified: boolean;
  phoneVerified: boolean;
  phoneVerifiedAt?: string | null;
  identityVerificationStatus: VerificationStatus;
  /** Set true on successful Nafath callback. Drives the "ID Verified" badge. */
  isNafathVerified?: boolean;
  nafathVerifiedAt?: string | null;
  agencyId: string | null;
  agencyName: string | null;
  /** REGA broker licence number — required for agents to be visibly trusted. */
  licenseNumber: string | null;
  registrationNumber: string | null;
  /** Expiry date of the submitted REGA licence (ISO date, no time). */
  regaLicenseExpiry?: string | null;
  /** Flipped true by an admin after cross-checking the licence on the REGA portal. */
  regaVerified?: boolean;
  regaVerifiedAt?: string | null;
  notificationPreferences: UserNotificationPrefs | null;
  // Host stats (Airbnb-style Superhost surfacing)
  responseRate?: number | null;
  responseTime?: string | null;
  isSuperhost?: boolean;
  totalCompletedBookings?: number;
  totalEarnings?: number;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
}

/** Aggregated host stats — returned by `GET /users/:id/host-stats`. */
export interface HostStats {
  userId: string;
  responseRate: number | null;
  responseTime: string | null;
  isSuperhost: boolean;
  totalCompletedBookings: number;
  totalEarnings: number;
  averageRating: number | null;
  reviewCount: number;
}

export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  phone?: string;
  bio?: string;
  avatarUrl?: string;
  preferredLocale?: string;
  notificationPreferences?: UserNotificationPrefs;
  agencyName?: string;
  licenseNumber?: string;
  registrationNumber?: string;
}

export interface UpdateUserStatusRequest {
  status: UserStatus;
  reason?: string;
}

export interface UpdateUserRoleRequest {
  role: UserRole;
}

export interface AgentProfile {
  userId: string;
  licenseNumber: string | null;
  licenseExpiresAt: string | null;
  yearsExperience: number;
  specialties: string[];
  serviceAreas: string[];
  languages: string[];
  rating: number;
  reviewCount: number;
  listingCount: number;
}

export interface Agency {
  id: string;
  name: string;
  nameEn: string | null;
  registrationNumber: string;
  licenseNumber: string;
  description: string | null;
  websiteUrl: string | null;
  logoUrl: string | null;
  ownerId: string;
  status: UserStatus;
  createdAt: string;
}
