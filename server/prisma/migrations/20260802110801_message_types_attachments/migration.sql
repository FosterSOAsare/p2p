-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('text', 'file', 'system');

-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "attachmentMime" TEXT,
ADD COLUMN     "attachmentName" TEXT,
ADD COLUMN     "attachmentSize" INTEGER,
ADD COLUMN     "attachmentUrl" TEXT,
ADD COLUMN     "type" "MessageType" NOT NULL DEFAULT 'text';
