import { createHash, randomBytes } from "node:crypto";
import argon2 from "argon2";
import { prisma } from "../../shared/lib/prisma";
import { ApiError } from "../../shared/lib/errors";
import { env } from "../../shared/config/env";
import type { User } from "../../generated/prisma/client";
import * as tokenService from "./token.service";
import type {
  AuthResult,
  AuthTokens,
  ChangePasswordInput,
  LoginInput,
  PublicUser,
  RequestContext,
  SignupInput,
} from "./auth.model";

// Same argon2id parameters as the TaaS API.
const ARGON2_OPTS = {
  type: argon2.argon2id,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
} as const;

// Simulated email delivery (proposal scope): single-use tokens kept in memory,
// links printed to the server console instead of being emailed.
const emailVerifyTokens = new Map<string, { userId: string; exp: number }>();
const passwordResetTokens = new Map<string, { userId: string; exp: number }>();

const VERIFY_TOKEN_TTL_MS = 24 * 60 * 60_000; // 24 h
const RESET_TOKEN_TTL_MS = 30 * 60_000; // 30 min

// ---------- Signup & email verification ----------

export async function signup(input: SignupInput, ctx: RequestContext): Promise<AuthResult> {
  const [usernameTaken, emailTaken] = await Promise.all([
    prisma.user.findUnique({ where: { username: input.username } }),
    prisma.user.findUnique({ where: { email: input.email } }),
  ]);
  if (usernameTaken) throw ApiError.conflict("Username is taken");
  if (emailTaken) throw ApiError.conflict("An account with this email already exists");

  const passwordHash = await argon2.hash(input.password, ARGON2_OPTS);

  const user = await prisma.user
    .create({
      data: {
        username: input.username,
        email: input.email,
        passwordHash,
        fullName: input.fullName,
        wallets: { create: { currency: "GHS" } }
      },
    })
    .catch((err: unknown) => {
      // Race on the unique indexes between the checks above and the insert.
      if (err && typeof err === "object" && (err as { code?: string }).code === "P2002") {
        throw ApiError.conflict("Username or email already taken");
      }
      throw err;
    });

  sendVerificationEmail(user);
  const tokens = await startSession(user, ctx);
  return { user: publicUser(user), tokens };
}

function sendVerificationEmail(user: User): void {
  const token = randomBytes(32).toString("base64url");
  emailVerifyTokens.set(hashToken(token), {
    userId: user.id,
    exp: Date.now() + VERIFY_TOKEN_TTL_MS,
  });
  const link = `${env.WEB_ORIGIN}/verify-email?token=${token}`;
  console.log(`[mail:simulated] Email verification for ${user.email}: ${link}`);
}

export async function verifyEmail(token: string): Promise<void> {
  const key = hashToken(token);
  const record = emailVerifyTokens.get(key);
  if (!record || record.exp < Date.now()) {
    emailVerifyTokens.delete(key);
    throw ApiError.badRequest("This verification link is invalid or has expired");
  }
  emailVerifyTokens.delete(key);
  await prisma.user.update({
    where: { id: record.userId },
    data: { emailVerifiedAt: new Date() },
  });
}

export async function resendVerification(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user && !user.emailVerifiedAt) sendVerificationEmail(user);
}

// ---------- Login ----------

export async function login(input: LoginInput, ctx: RequestContext): Promise<AuthResult> {
  const isEmail = input.identifier.includes("@");
  const user = isEmail
    ? await prisma.user.findUnique({ where: { email: input.identifier } })
    : await prisma.user.findUnique({ where: { username: input.identifier } });

  if (!user) {
    // Equalize timing with the argon2.verify below (both lookup paths).
    await argon2.hash("dummy-to-equalize-timing").catch(() => undefined);
    throw ApiError.unauthorized("Invalid credentials");
  }
  if (user.status === "suspended") throw ApiError.forbidden("This account is suspended");

  const ok = await argon2.verify(user.passwordHash, input.password);
  if (!ok) throw ApiError.unauthorized("Invalid credentials");

  const tokens = await startSession(user, ctx);
  return { user: publicUser(user), tokens };
}

// ---------- Sessions & token rotation ----------

async function startSession(user: User, ctx: RequestContext): Promise<AuthTokens> {
  const { token: refreshToken, hash } = tokenService.generateRefreshToken();
  await prisma.session.create({
    data: {
      userId: user.id,
      refreshTokenHash: hash,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      expiresAt: new Date(Date.now() + tokenService.refreshTtlMs()),
    },
  });
  const accessToken = tokenService.signAccessToken({
    sub: user.id,
    username: user.username,
    role: user.role,
  });
  return { accessToken, refreshToken };
}

/** Rotates a refresh token. Reuse of an already-rotated token means theft:
 *  every session of that user is revoked. */
export async function refresh(refreshToken: string, ctx: RequestContext): Promise<AuthTokens> {
  const hash = tokenService.hashRefreshToken(refreshToken);
  const session = await prisma.session.findUnique({
    where: { refreshTokenHash: hash },
    include: { user: true },
  });
  if (!session) throw ApiError.unauthorized("Invalid session");

  if (session.revokedAt) {
    await prisma.session.updateMany({
      where: { userId: session.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    throw ApiError.unauthorized("Session reuse detected. Please log in again.");
  }
  if (session.expiresAt < new Date()) throw ApiError.unauthorized("Session expired");
  if (session.user.status !== "active") throw ApiError.unauthorized("Account is not active");

  // Rotate: revoke the old session, mint a new one.
  await prisma.session.update({
    where: { id: session.id },
    data: { revokedAt: new Date() },
  });
  return startSession(session.user, ctx);
}

export async function logout(refreshToken: string): Promise<void> {
  await prisma.session.updateMany({
    where: { refreshTokenHash: tokenService.hashRefreshToken(refreshToken), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

// ---------- Password reset & change ----------

export async function forgotPassword(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return; // Never reveal whether the email exists.
  const token = randomBytes(32).toString("base64url");
  passwordResetTokens.set(hashToken(token), {
    userId: user.id,
    exp: Date.now() + RESET_TOKEN_TTL_MS,
  });
  const link = `${env.WEB_ORIGIN}/reset-password?token=${token}`;
  console.log(`[mail:simulated] Password reset for ${email}: ${link}`);
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const key = hashToken(token);
  const record = passwordResetTokens.get(key);
  if (!record || record.exp < Date.now()) {
    passwordResetTokens.delete(key);
    throw ApiError.badRequest("This reset link is invalid or has expired");
  }
  passwordResetTokens.delete(key);

  const passwordHash = await argon2.hash(newPassword, ARGON2_OPTS);
  await prisma.user.update({ where: { id: record.userId }, data: { passwordHash } });
  // Reset invalidates all sessions.
  await prisma.session.updateMany({
    where: { userId: record.userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/** Changes the password, revokes every session, and returns a fresh pair so
 *  the current client stays logged in. */
export async function changePassword(
  userId: string,
  input: ChangePasswordInput,
  ctx: RequestContext,
): Promise<AuthTokens> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const ok = await argon2.verify(user.passwordHash, input.currentPassword);
  if (!ok) throw ApiError.badRequest("Current password is incorrect");

  const passwordHash = await argon2.hash(input.newPassword, ARGON2_OPTS);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  await prisma.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return startSession(user, ctx);
}

// ---------- Username availability & profile ----------

export async function isUsernameAvailable(username: string): Promise<boolean> {
  const existing = await prisma.user.findUnique({ where: { username } });
  return !existing;
}

/** GET /me — profile + KYC status + wallets + the dashboard counts the client shows. */
export async function me(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { kyc: { select: { status: true } }, wallets: true },
  });
  if (!user) throw ApiError.notFound("User not found");

  const [activeOrdersCount, spent, savedItemsCount] = await Promise.all([
    prisma.escrow.count({
      where: { buyerId: userId, status: { in: ["created", "funded", "delivered"] } },
    }),
    prisma.escrow.aggregate({
      _sum: { amount: true },
      where: { buyerId: userId, status: "disbursed" },
    }),
    prisma.savedListing.count({ where: { userId } }),
  ]);

  return {
    ...publicUser(user),
    kycStatus: user.kyc?.status ?? "unverified",
    wallets: user.wallets.map((w) => ({ currency: w.currency, balance: Number(w.balance) })),
    stats: {
      activeOrdersCount,
      totalSpent: Number(spent._sum.amount ?? 0),
      savedItemsCount,
    },
  };
}

// ---------- helpers ----------

function publicUser(user: User): PublicUser {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    fullName: user.fullName,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
    role: user.role,
    emailVerified: Boolean(user.emailVerifiedAt),
    phoneVerified: Boolean(user.phoneVerifiedAt),
    createdAt: user.createdAt.toISOString(),
  };
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
