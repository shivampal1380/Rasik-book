-- AlterTable
ALTER TABLE "book_entries" ADD COLUMN     "correctedAt" TIMESTAMP(3),
ADD COLUMN     "isCorrected" BOOLEAN NOT NULL DEFAULT false;
