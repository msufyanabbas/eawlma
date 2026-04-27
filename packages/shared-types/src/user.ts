import { UserRole, UserStatus, VerificationStatus } from './enums';

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
  emailVerified: boolean;
  phoneVerified: boolean;
  identityVerificationStatus: VerificationStatus;
  agencyId: string | null;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
}

export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  phone?: string;
  bio?: string;
  avatarUrl?: string;
  preferredLocale?: string;
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
