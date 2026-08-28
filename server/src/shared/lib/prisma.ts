import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client";
import { env } from "../config/env";

/**
 * Prisma 7 (Rust-free) requires a driver adapter — node-postgres works with Neon.
 *
 * The pool options matter more here than they would on a local database. Every
 * new connection costs a TCP + TLS handshake to us-east-2, which is several
 * hundred milliseconds before a single query runs, so the goal is to open few
 * connections and then keep them.
 *
 * - `max: 16` — sized above the widest single-request fan-out (the dashboard
 *   issues twelve queries at once), with headroom for a couple of overlapping
 *   requests. Below that, a wide batch queues behind itself and the
 *   `Promise.all` silently becomes sequential.
 * - `idleTimeoutMillis: 0` — never reap an idle connection. The default (10s)
 *   meant a quiet minute threw away every warm connection and the next request
 *   paid the handshake again, which is precisely the "first page is slow, then
 *   it's fine, then it's slow again" pattern.
 * - `keepAlive` — stops NAT/firewall idle timeouts silently dropping a
 *   connection we still believe in, which surfaces as one mysteriously slow
 *   request when the driver notices and reconnects.
 */
const adapter = new PrismaPg({
  connectionString: env.DATABASE_URL,
  max: 16,
  idleTimeoutMillis: 0,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10_000,
});

export const prisma = new PrismaClient({
  adapter,
  // Neon's pooled endpoint is a long way off (~600ms RTT), and a batch
  // $transaction spends four sequential round trips — BEGIN, the queries,
  // COMMIT — before it returns. Prisma's defaults are tuned for a database on
  // the same continent: 2s to *acquire* a transaction and 5s to run one. Both
  // are under what this link actually costs, so the moment two requests overlap
  // they die with P2028 (measured: 7 of 8 concurrent marketplace queries
  // failed at 2273ms). These raise the ceiling; they don't make anything slower.
  transactionOptions: { maxWait: 10_000, timeout: 20_000 },
});
