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

/**
 * What `/api/auth/login` answers with.
 *
 * `user` carries the same fields as `/api/auth/me` — identity plus `kycStatus`,
 * `prefs`, `wallets` and `stats` — so a client can render its signed-in shell
 * from the login response alone. It used to be the thinner `PublicUser`, which
 * left out the one field that decides whether someone is a seller, forcing
 * every client into a second request before it could draw anything.
 *
 * Widened rather than pinned to a named type: `me()` composes its result and
 * this follows it, so the two can't drift apart.
 */
export interface AuthResult {
  user: Awaited<ReturnType<typeof import("./auth.service").me>>;
  tokens: AuthTokens;
}

export interface JwtPayload {
  sub: string;
  username: string;
  role: UserRole;
}
