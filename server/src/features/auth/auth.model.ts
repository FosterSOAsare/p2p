/** Domain types / DTOs for the auth feature. */

export type UserRole = "user" | "admin";

export interface SignupInput {
  username: string;
  email: string;
  password: string;
  fullName: string;
}

export interface LoginInput {
  /** Email or username (docs/13 §13.4) */
  identifier: string;
  password: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

/** ip/user-agent captured by controllers and stored on the session row. */
export interface RequestContext {
  ip?: string;
  userAgent?: string;
}

export interface PublicUser {
  id: string;
  username: string;
  email: string;
  fullName: string;
  phone: string | null;
  avatarUrl: string | null;
  role: UserRole;
  emailVerified: boolean;
  phoneVerified: boolean;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResult {
  user: PublicUser;
  tokens: AuthTokens;
}

export interface JwtPayload {
  sub: string;
  username: string;
  role: UserRole;
}
