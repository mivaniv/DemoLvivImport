-- CreateEnum
CREATE TYPE "ImportKind" AS ENUM ('SYNC', 'CLEANUP');

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "parentExternalId" TEXT;

-- AlterTable
ALTER TABLE "ImportRun" ADD COLUMN     "cleanupDone" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "fullExport" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "kind" "ImportKind" NOT NULL DEFAULT 'SYNC',
ADD COLUMN     "restored" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "hiddenAt" TIMESTAMP(3),
ADD COLUMN     "lastSeenRunId" INTEGER;

-- CreateIndex
CREATE INDEX "Product_lastSeenRunId_idx" ON "Product"("lastSeenRunId");
