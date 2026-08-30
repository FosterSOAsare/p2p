-- Withdrawals: make money leaving the platform a record, not just a ledger row.
--
-- Before this a payout wrote a single `transactions` row and nothing else: no
-- reference to make a retry idempotent, no state to represent "sent" vs "still
-- to send", and nothing for an admin to look at. Deposits already had all three
-- via `payment_intents`; this is the same shape on the way out.

CREATE TYPE "WithdrawalStatus" AS ENUM ('pending', 'completed', 'rejected');

CREATE TABLE "withdrawals" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'GHS',
    "destination" TEXT NOT NULL,
    "status" "WithdrawalStatus" NOT NULL DEFAULT 'pending',
    "reviewNote" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "withdrawals_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "withdrawals_reference_key" ON "withdrawals"("reference");
CREATE INDEX "withdrawals_status_createdAt_idx" ON "withdrawals"("status", "createdAt");
CREATE INDEX "withdrawals_userId_createdAt_idx" ON "withdrawals"("userId", "createdAt");

ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- The reviewer is nullable and must survive the admin's account being removed,
-- so this one does NOT cascade.
ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_reviewedById_fkey"
    FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
