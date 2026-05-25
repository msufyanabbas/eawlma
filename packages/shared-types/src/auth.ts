import { UserRole } from './enums';

export interface RegisterRequest {
  email: string;
  // Password is optional: users can sign up email-only and verify via OTP.
  password?: string;
  // Name + phone became optional when the form was simplified to email + role.
  firstName?: string;
  lastName?: string;
  phone?: string;
  role?: UserRole;
  preferredLocale?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: number;  // seconds
  refreshTokenExpiresIn: number; // seconds
}

export interface AuthSessionUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  avatarUrl?: string | null;
  preferredLocale: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  identityVerified: boolean;
}

export interface AuthResponse {
  user: AuthSessionUser;
  tokens: AuthTokens;
}

export interface RequestOtpRequest {
  phone: string;
}

export interface VerifyOtpRequest {
  phone: string;
  code: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface JwtPayload {
  sub: string;       // user id
  email: string;
  role: UserRole;
  jti?: string;      // refresh token id (for rotation)
  iat?: number;
  exp?: number;
}
