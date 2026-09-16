-- Add explicit control over how columns 6 and 7 behave in the statement PDF:
-- ON → sub-head logic (column 6 lists sub-heads, column 7 = Amount);
-- OFF → columns 6 and 7 print as normal main head columns.
ALTER TABLE "pdf_config"
ADD COLUMN "subHeadMode" BOOLEAN NOT NULL DEFAULT true;