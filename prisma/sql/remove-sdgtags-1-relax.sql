-- STEP 1 of 2 (safe to run while the current site is live).
-- Makes the old sdgTags column optional so the new code (which no longer writes it) can insert companies.
-- Run this BEFORE deploying the new code.
ALTER TABLE "nexora_pipeline_items" ALTER COLUMN "sdgTags" DROP NOT NULL;
