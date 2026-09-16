-- CreateTable
CREATE TABLE "head_visibility" (
    "head" "Head" NOT NULL,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "head_visibility_pkey" PRIMARY KEY ("head")
);

-- Seed: all 13 statement heads start visible.
INSERT INTO "head_visibility" ("head", "visible", "updatedAt")
VALUES
  ('BHETA',  true, NOW()),
  ('B_FUND', true, NOW()),
  ('SBF',    true, NOW()),
  ('LANGAR', true, NOW()),
  ('PCS',    true, NOW()),
  ('SS',     true, NOW()),
  ('FF',     true, NOW()),
  ('SD',     true, NOW()),
  ('MPD',    true, NOW()),
  ('MED',    true, NOW()),
  ('ASS',    true, NOW()),
  ('MSS',    true, NOW()),
  ('LSS',    true, NOW());