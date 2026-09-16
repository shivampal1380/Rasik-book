-- CreateTable
CREATE TABLE "pdf_config" (
    "id" TEXT NOT NULL,
    "mainHeads" "Head"[] NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pdf_config_pkey" PRIMARY KEY ("id")
);

-- Seed: default statement layout — five columns + the column-6 parent head
-- (MED) which hosts all other visible heads as sub-heads.
INSERT INTO "pdf_config" ("id", "mainHeads", "updatedAt")
VALUES (
  '00000000-0000-0000-0000-000000000042',
  ARRAY['BHETA','B_FUND','SBF','LANGAR','PCS','MED']::"Head"[],
  NOW()
);