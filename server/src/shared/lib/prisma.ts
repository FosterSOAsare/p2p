import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client";
import { env } from "../config/env";

// Prisma 7 (Rust-free) requires a driver adapter — node-postgres works with Neon.
const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });

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
