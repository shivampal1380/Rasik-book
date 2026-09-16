-- AlterTable: sub-heads can belong to any main statement head.
ALTER TABLE "sub_heads" ADD COLUMN "parentHead" TEXT NOT NULL DEFAULT 'MED';