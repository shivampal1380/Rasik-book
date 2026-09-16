-- CreateTable
CREATE TABLE "sub_heads" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sub_heads_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "book_entries" ADD COLUMN "subHeadId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "sub_heads_name_key" ON "sub_heads"("name");

-- CreateIndex
CREATE INDEX "book_entries_subHeadId_idx" ON "book_entries"("subHeadId");

-- AddForeignKey
ALTER TABLE "book_entries" ADD CONSTRAINT "book_entries_subHeadId_fkey" FOREIGN KEY ("subHeadId") REFERENCES "sub_heads"("id") ON DELETE SET NULL ON UPDATE CASCADE;