-- CreateEnum
CREATE TYPE "Head" AS ENUM ('ASS', 'MSS', 'BHETA', 'B_FUND', 'SBF', 'LANGAR', 'PCS', 'FF', 'MED');

-- CreateEnum
CREATE TYPE "BookStatus" AS ENUM ('OPEN', 'COMPLETED', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'OPERATOR');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'OPERATOR',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "books" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "bookNumber" TEXT NOT NULL,
    "status" "BookStatus" NOT NULL DEFAULT 'OPEN',
    "currentEntryNumber" INTEGER NOT NULL DEFAULT 1,
    "maxEntries" INTEGER NOT NULL DEFAULT 100,
    "pracharak" TEXT,
    "area" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "books_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "book_entries" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "entryNumber" INTEGER NOT NULL,
    "head" "Head" NOT NULL,
    "amount" INTEGER NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "book_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "oldValue" JSONB,
    "newValue" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "books_status_idx" ON "books"("status");

-- CreateIndex
CREATE INDEX "books_createdBy_idx" ON "books"("createdBy");

-- CreateIndex
CREATE UNIQUE INDEX "books_code_bookNumber_key" ON "books"("code", "bookNumber");

-- CreateIndex
CREATE INDEX "book_entries_bookId_head_idx" ON "book_entries"("bookId", "head");

-- CreateIndex
CREATE INDEX "book_entries_bookId_createdAt_idx" ON "book_entries"("bookId", "createdAt");

-- CreateIndex
CREATE INDEX "book_entries_createdBy_idx" ON "book_entries"("createdBy");

-- CreateIndex
CREATE UNIQUE INDEX "book_entries_bookId_entryNumber_key" ON "book_entries"("bookId", "entryNumber");

-- CreateIndex
CREATE INDEX "audit_logs_entity_entityId_idx" ON "audit_logs"("entity", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "books" ADD CONSTRAINT "books_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_entries" ADD CONSTRAINT "book_entries_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_entries" ADD CONSTRAINT "book_entries_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Database-level integrity checks:
-- 1) A book's physical pages are numbered 1..maxEntries
-- 2) A book can never exceed its maximum entries by construction
-- 3) Every financial entry must be a strictly positive amount
-- 4) A book's progress pointer must stay inside the valid range

ALTER TABLE "books"
    ADD CONSTRAINT "books_currentEntryNumber_range"
    CHECK ("currentEntryNumber" >= 1 AND "currentEntryNumber" <= "maxEntries");

ALTER TABLE "books"
    ADD CONSTRAINT "books_maxEntries_positive"
    CHECK ("maxEntries" > 0);

ALTER TABLE "book_entries"
    ADD CONSTRAINT "book_entries_entryNumber_range"
    CHECK ("entryNumber" >= 1);

ALTER TABLE "book_entries"
    ADD CONSTRAINT "book_entries_amount_positive"
    CHECK ("amount" > 0);
