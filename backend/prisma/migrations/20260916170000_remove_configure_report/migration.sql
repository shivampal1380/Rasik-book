-- DropForeignKey
ALTER TABLE "book_entries" DROP CONSTRAINT "book_entries_subHeadId_fkey";

-- DropIndex
DROP INDEX "book_entries_subHeadId_idx";

-- AlterTable
ALTER TABLE "book_entries" DROP COLUMN "subHeadId";

-- DropTable
DROP TABLE "head_configs";

-- DropTable
DROP TABLE "sub_heads";

-- DropEnum
DROP TYPE "HeadRole";