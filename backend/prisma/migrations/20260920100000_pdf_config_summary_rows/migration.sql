-- Two configurable head rows (7 and 8) in the fixed 9-row PDF summary block.
ALTER TABLE "pdf_config"
  ADD COLUMN "summaryRow7" "Head",
  ADD COLUMN "summaryRow8" "Head";