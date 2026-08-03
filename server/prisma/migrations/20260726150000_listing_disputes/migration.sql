-- CreateEnum
CREATE TYPE "ListingDisputeStatus" AS ENUM ('open', 'approved', 'rejected');

-- AlterTable
ALTER TABLE "listings" ADD COLUMN     "disputeAllowed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "removalSnapshot" JSONB;

-- CreateTable
CREATE TABLE "listing_disputes" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "status" "ListingDisputeStatus" NOT NULL DEFAULT 'open',
    "explanation" TEXT NOT NULL,
    "corrections" TEXT,
    "reviewNote" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "listing_disputes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "listing_disputes_status_createdAt_idx" ON "listing_disputes"("status", "createdAt");

-- CreateIndex
CREATE INDEX "listing_disputes_listingId_idx" ON "listing_disputes"("listingId");

-- AddForeignKey
ALTER TABLE "listing_disputes" ADD CONSTRAINT "listing_disputes_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_disputes" ADD CONSTRAINT "listing_disputes_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_disputes" ADD CONSTRAINT "listing_disputes_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
