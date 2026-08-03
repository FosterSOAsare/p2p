-- Dispute auto-resolution is out of scope: every ruling is an admin's, so the
-- deadline column was only ever written as NULL and never read. Dropping it
-- takes the composite index with it; the queue only ever filters on status.
DROP INDEX "disputes_status_autoResolveAt_idx";

ALTER TABLE "disputes" DROP COLUMN "autoResolveAt";

CREATE INDEX "disputes_status_idx" ON "disputes"("status");
