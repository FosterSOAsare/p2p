-- A removed listing is frozen: the seller can read it but not edit it, so an
-- appeal is an explanation rather than a resubmission. That removes the reason
-- for both columns — `corrections` described edits that can no longer be made,
-- and `removalSnapshot` existed only to diff the listing against them.
ALTER TABLE "listing_disputes" DROP COLUMN "corrections";

ALTER TABLE "listings" DROP COLUMN "removalSnapshot";
