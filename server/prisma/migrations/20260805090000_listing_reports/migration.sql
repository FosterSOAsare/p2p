-- CreateEnum
CREATE TYPE "ListingReportStatus" AS ENUM ('open', 'actioned', 'dismissed');

-- CreateTable
CREATE TABLE "listing_reports" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reason" "ListingRemovalReason" NOT NULL,
    "note" TEXT,
    "status" "ListingReportStatus" NOT NULL DEFAULT 'open',
    "reviewNote" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "listing_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "listing_reports_status_createdAt_idx" ON "listing_reports"("status", "createdAt");

-- CreateIndex
CREATE INDEX "listing_reports_listingId_idx" ON "listing_reports"("listingId");

-- CreateIndex
CREATE UNIQUE INDEX "listing_reports_listingId_reporterId_key" ON "listing_reports"("listingId", "reporterId");

-- AddForeignKey
ALTER TABLE "listing_reports" ADD CONSTRAINT "listing_reports_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_reports" ADD CONSTRAINT "listing_reports_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_reports" ADD CONSTRAINT "listing_reports_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
