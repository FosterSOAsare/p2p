/**
 * Seeds the three accounts the app is demoed with. Idempotent — every write is
 * an upsert, so re-running is safe and only fills in what's missing:
 *
 *   system_site  system@site.com     admin
 *   reaper_fa    asare4ster@gmail.com  buyer (plain user)
 *   seller1      seller1@gmail.com   seller, KYC already verified
 *
 * All three land with a verified email and a GHS wallet, so they can sign in
 * and transact immediately without the verify-email or KYC round trips.
 *
 * All three share the password Password4u@1. The hash is written on FIRST
 * CREATE ONLY — re-running won't clobber a password you've since changed.
 * Pass --reset-password to force it back.
 *
 * Usage:  npx tsx scripts/seed-users.ts
 *         npx tsx scripts/seed-users.ts --reset-password
 *         SEED_PASSWORD=somethingElse npx tsx scripts/seed-users.ts
 */
import argon2 from "argon2";
import { prisma } from "../src/shared/lib/prisma";
import type { UserRole } from "../src/generated/prisma/client";

// Same argon2id parameters as auth.service.ts — a hash written here has to
// verify against the real login path.
const ARGON2_OPTS = {
  type: argon2.argon2id,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
} as const;

const PASSWORD = process.env.SEED_PASSWORD ?? "Password4u@1";
const RESET_PASSWORD = process.argv.includes("--reset-password");

interface SeedUser {
  username: string;
  email: string;
  fullName: string;
  role: UserRole;
  phone?: string;
}

const USERS: SeedUser[] = [
  { username: "system_site", email: "system@site.com", fullName: "P2P Market System", role: "admin" },
  { username: "reaper_fa", email: "asare4ster@gmail.com", fullName: "Reaper FA", role: "user", phone: "+233200000001" },
  { username: "seller1", email: "seller1@gmail.com", fullName: "Seller One", role: "user", phone: "+233200000002" },
];

async function upsertUser(spec: SeedUser, passwordHash: string) {
  const user = await prisma.user.upsert({
    where: { username: spec.username },
    create: {
      username: spec.username,
      email: spec.email,
      passwordHash,
      fullName: spec.fullName,
      phone: spec.phone ?? null,
      role: spec.role,
      status: "active",
      emailVerifiedAt: new Date(),
    },
    // Deliberately narrow: identity and access flags only. Anything the account
    // has accumulated since (avatar, notification prefs, password) is left alone.
    update: {
      email: spec.email,
      fullName: spec.fullName,
      role: spec.role,
      status: "active",
      emailVerifiedAt: new Date(),
      ...(RESET_PASSWORD ? { passwordHash } : {}),
    },
  });

  // Signup gives every account a GHS wallet; seeded accounts need one too or
  // funding a deal fails on a missing wallet rather than a low balance.
  await prisma.wallet.upsert({
    where: { userId_currency: { userId: user.id, currency: "GHS" } },
    create: { userId: user.id, currency: "GHS" },
    update: {},
  });

  return user;
}

async function main() {
  const passwordHash = await argon2.hash(PASSWORD, ARGON2_OPTS);

  const seeded = new Map<string, string>();
  for (const spec of USERS) {
    const user = await upsertUser(spec, passwordHash);
    seeded.set(spec.username, user.id);
    console.log(`✅ @${user.username.padEnd(12)} ${user.email.padEnd(22)} role: ${user.role}`);
  }

  // ---- seller1's KYC, pre-approved by system_site ----
  const sellerId = seeded.get("seller1")!;
  const adminId = seeded.get("system_site")!;

  await prisma.kycProfile.upsert({
    where: { userId: sellerId },
    create: {
      userId: sellerId,
      legalName: "Seller One",
      storeName: "Seller One Store",
      country: "Ghana",
      address: "12 Oxford Street, Osu, Accra",
      idType: "Ghana Card",
      idNumber: "GHA-000000001-0",
      momoNumber: "+233200000002", // fiat payout destination
      status: "verified",
      reviewedById: adminId,
      reviewedAt: new Date(),
    },
    // Re-approve if someone flipped it to rejected while testing, but don't
    // overwrite store details that may have been edited.
    update: {
      status: "verified",
      rejectionReason: null,
      reviewedById: adminId,
      reviewedAt: new Date(),
    },
  });
  console.log(`✅ @seller1 KYC verified (approved by @system_site)`);

  console.log(
    RESET_PASSWORD
      ? `\n🔑 Password reset for all three: ${PASSWORD}`
      : `\n🔑 Password for newly created accounts: ${PASSWORD} (existing passwords left untouched — use --reset-password to force)`,
  );

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
