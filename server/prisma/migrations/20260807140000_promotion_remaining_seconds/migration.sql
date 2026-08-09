-- Pausing a 30-day spotlight banked 2_592_000_000 ms into an INTEGER column
-- that stops at 2_147_483_647, so the write failed outright. Seconds hold the
-- same term in the same four bytes with decades to spare.
ALTER TABLE "promotions" RENAME COLUMN "remainingMs" TO "remainingSeconds";

-- Integer division, rounded up, so a pause already on the books doesn't lose
-- the fraction of a second it banked.
UPDATE "promotions"
SET "remainingSeconds" = ("remainingSeconds" + 999) / 1000
WHERE "remainingSeconds" IS NOT NULL;
