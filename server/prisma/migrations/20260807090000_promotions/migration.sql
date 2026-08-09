-- CreateEnum
CREATE TYPE "PromotionStatus" AS ENUM ('active', 'paused', 'expired', 'cancelled');

-- CreateEnum
CREATE TYPE "PromotionPlan" AS ENUM ('7d', '14d', '30d');

-- AlterEnum
ALTER TYPE "TransactionType" ADD VALUE 'promotion';

-- CreateTable
CREATE TABLE "promotions" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "status" "PromotionStatus" NOT NULL DEFAULT 'active',
    "plan" "PromotionPlan" NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "amount" DECIMAL(14,2) NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3),
    "remainingMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promotions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "promotions_listingId_status_idx" ON "promotions"("listingId", "status");

-- CreateIndex
CREATE INDEX "promotions_sellerId_status_idx" ON "promotions"("sellerId", "status");

-- CreateIndex
CREATE INDEX "promotions_status_endsAt_idx" ON "promotions"("status", "endsAt");

-- AddForeignKey
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
