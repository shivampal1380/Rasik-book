-- Add DISABLED to HeadRole so a head can be hidden from the statement
-- entirely (no column, no sub-head option). Applied on its own so the enum
-- value is committed before any new code uses it.

ALTER TYPE "HeadRole" ADD VALUE 'DISABLED';