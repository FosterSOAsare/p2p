import { prisma } from "./prisma";

/**
 * A short-lived cache of the per-request identity lookup.
 *
 * `auth` middleware verifies the JWT and then reads the user row, because a
 * token outlives the facts in it: an account can be deleted or suspended while
 * a valid token is still in circulation. That check is correct and worth
 * keeping — but it was a database round trip on *every authenticated request*,
 * and against Neon's pooled endpoint (~450ms measured from here) it was the
 * single largest fixed cost in the app. Nothing could be faster than one round
 * trip, no matter how well the handler behind it was written.
 *
 * So the row is cached for a few seconds instead. The trade is explicit: a
 * suspension takes effect within `TTL_MS` rather than instantly, unless the code
 * that changed it calls `invalidateUser`, which the admin and KYC paths do — so
 * in practice the only way to observe staleness is to change the row directly in
 * the database.
 *
 * `kycStatus` rides along because `requireSeller` needed a *second* lookup for
 * it, doubling the fixed cost on every seller route.
 *
 * In-memory and per-process on purpose. A shared cache (Redis) would be correct
 * across instances, but this deployment is a single process, and adding a second
 * network hop to avoid a cached local read would defeat the point. If this ever
 * runs multi-instance, the TTL is the bound on how long instances can disagree.
 */

export interface CachedUser {
  id: string;
  username: string;
  role: "user" | "admin";
  status: string;
  kycStatus: string | null;
}

/** Short enough that a suspension is never long-lived, long enough to matter. */
const TTL_MS = 15_000;

interface Entry {
  user: CachedUser | null;
  expiresAt: number;
}

const cache = new Map<string, Entry>();

/**
 * Bounds memory without a dependency. Called on write, so the map is swept in
 * proportion to traffic rather than on a timer that keeps the process awake.
 */
function sweep(now: number) {
  if (cache.size < 500) return;
  for (const [key, entry] of cache) {
    if (entry.expiresAt <= now) cache.delete(key);
  }
}

/**
 * The user behind a token, from cache when fresh.
 *
 * A missing user is cached too (as `null`): a token for a deleted account would
 * otherwise re-query on every retry, which is exactly when a client is likely
 * to be hammering.
 */
export async function getAuthUser(userId: string): Promise<CachedUser | null> {
  const now = Date.now();
  const hit = cache.get(userId);
  if (hit && hit.expiresAt > now) return hit.user;

  const row = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      role: true,
      status: true,
      kyc: { select: { status: true } },
    },
  });

  const user: CachedUser | null = row
    ? {
        id: row.id,
        username: row.username,
        role: row.role,
        status: row.status,
        kycStatus: row.kyc?.status ?? null,
      }
    : null;

  sweep(now);
  cache.set(userId, { user, expiresAt: now + TTL_MS });
  return user;
}

/**
 * Drop a user's cached row so the next request re-reads it.
 *
 * Call after anything that changes what `auth` or `requireSeller` decide on:
 * suspension/reinstatement, and KYC approval/rejection. Cheap and safe to call
 * when unsure — the cost is one extra query on that user's next request.
 */
export function invalidateUser(userId: string): void {
  cache.delete(userId);
}

/** Used by the tests and by logout-all flows; also clears on demand. */
export function clearAuthCache(): void {
  cache.clear();
}
