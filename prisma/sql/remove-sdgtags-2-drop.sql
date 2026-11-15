-- STEP 2 of 2. Run AFTER the new code is deployed on Vercel (the old code still reads this column).
-- Permanently deletes the sdgTags column and the values in it (they were unused text labels).
-- Does nothing if the column is already gone.
ALTER TABLE "nexora_pipeline_items" DROP COLUMN IF EXISTS "sdgTags";
