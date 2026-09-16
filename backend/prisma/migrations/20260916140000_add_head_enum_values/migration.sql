-- Add the new Head enum values for the 13-head statement layout.
-- Kept in their own migration so the ADD VALUE statements are committed
-- before the seeded rows are inserted in the next migration.

ALTER TYPE "Head" ADD VALUE 'SS' BEFORE 'MED';
ALTER TYPE "Head" ADD VALUE 'SD' BEFORE 'MED';
ALTER TYPE "Head" ADD VALUE 'MPD' BEFORE 'MED';
ALTER TYPE "Head" ADD VALUE 'LSS' AFTER 'MSS';