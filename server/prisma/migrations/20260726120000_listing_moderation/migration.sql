-- AlterEnum
ALTER TYPE "ListingStatus" ADD VALUE 'removed';

-- CreateEnum
CREATE TYPE "ListingRemovalReason" AS ENUM ('prohibited_item', 'duplicate', 'misleading', 'spam', 'guidelines', 'fraud', 'other');

-- AlterTable
ALTER TABLE "listings" ADD COLUMN     "removalReason" "ListingRemovalReason",
ADD COLUMN     "removalNote" TEXT,
ADD COLUMN     "removedAt" TIMESTAMP(3),
ADD COLUMN     "removedById" TEXT;

-- AddForeignKey
ALTER TABLE "listings" ADD CONSTRAINT "listings_removedById_fkey" FOREIGN KEY ("removedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
