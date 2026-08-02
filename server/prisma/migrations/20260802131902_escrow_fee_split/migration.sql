-- CreateEnum
CREATE TYPE "FeeSplit" AS ENUM ('buyer', 'seller', 'split');

-- AlterTable
ALTER TABLE "escrows" ADD COLUMN     "feeSplit" "FeeSplit" NOT NULL DEFAULT 'split';
