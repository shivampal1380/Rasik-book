-- CreateEnum
CREATE TYPE "HeadRole" AS ENUM ('MAIN', 'SUB');

-- CreateTable
CREATE TABLE "head_configs" (
    "id" TEXT NOT NULL,
    "head" "Head" NOT NULL,
    "role" "HeadRole" NOT NULL DEFAULT 'MAIN',
    "parentHead" "Head",
    "sort" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "head_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "head_configs_head_key" ON "head_configs"("head");

-- Seed: all six real statement heads start as MAIN columns in layout order.
INSERT INTO "head_configs" ("id", "head", "role", "parentHead", "sort", "updatedAt")
VALUES
  ('00000000-0000-0000-0000-000000000001', 'BHETA',  'MAIN', NULL, 0, NOW()),
  ('00000000-0000-0000-0000-000000000002', 'B_FUND', 'MAIN', NULL, 1, NOW()),
  ('00000000-0000-0000-0000-000000000003', 'SBF',    'MAIN', NULL, 2, NOW()),
  ('00000000-0000-0000-0000-000000000004', 'LANGAR', 'MAIN', NULL, 3, NOW()),
  ('00000000-0000-0000-0000-000000000005', 'ASS',    'MAIN', NULL, 4, NOW()),
  ('00000000-0000-0000-0000-000000000006', 'MED',    'MAIN', NULL, 5, NOW());