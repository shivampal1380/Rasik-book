-- Template statement layout upgraded to a 7th head slot so columns 6 and 7
-- can print as normal main heads when no sub-heads exist.
UPDATE "pdf_config"
SET "mainHeads" = ARRAY['BHETA','B_FUND','SBF','LANGAR','PCS','SS','FF']::"Head"[],
    "updatedAt" = NOW()
WHERE "id" = '00000000-0000-0000-0000-000000000042';