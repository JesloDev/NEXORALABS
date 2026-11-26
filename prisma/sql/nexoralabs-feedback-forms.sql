-- Feedback forms. Run once on a database that already has the nexora_ tables.
CREATE TABLE IF NOT EXISTS "nexora_feedback_forms" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "questions" TEXT NOT NULL DEFAULT '[]',
    "open" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "nexora_feedback_forms_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "nexora_feedback_responses" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "answers" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "nexora_feedback_responses_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "nexora_feedback_forms_token_key" ON "nexora_feedback_forms"("token");
CREATE INDEX IF NOT EXISTS "nexora_feedback_forms_spaceId_idx" ON "nexora_feedback_forms"("spaceId");
CREATE INDEX IF NOT EXISTS "nexora_feedback_responses_formId_createdAt_idx" ON "nexora_feedback_responses"("formId", "createdAt");
ALTER TABLE "nexora_feedback_forms" ADD CONSTRAINT "nexora_feedback_forms_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "nexora_spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "nexora_feedback_forms" ADD CONSTRAINT "nexora_feedback_forms_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "nexora_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "nexora_feedback_responses" ADD CONSTRAINT "nexora_feedback_responses_formId_fkey" FOREIGN KEY ("formId") REFERENCES "nexora_feedback_forms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
