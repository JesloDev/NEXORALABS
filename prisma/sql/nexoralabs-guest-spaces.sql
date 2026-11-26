-- NEXORALABS — GUEST SPACES upgrade (run ONCE on a database that already has the nexora_ tables)
-- Adds: GUEST role, per-space invite links, one-time auth tokens. Plain statements, no DO blocks.
-- Nothing is dropped or changed; existing data is untouched.
-- If "ALTER TYPE ... ADD VALUE" is refused inside a multi-statement run, run that single line on its own first.

ALTER TYPE "nexora_role" ADD VALUE IF NOT EXISTS 'GUEST';

CREATE TYPE "nexora_auth_token_kind" AS ENUM ('SPACE_JOIN', 'GUEST_LOGIN');
CREATE TABLE IF NOT EXISTS "nexora_space_invites" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "label" TEXT,
    "maxUses" INTEGER,
    "currentUses" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "nexora_space_invites_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "nexora_auth_tokens" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "kind" "nexora_auth_token_kind" NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "spaceId" TEXT,
    "inviteId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "nexora_auth_tokens_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "nexora_space_invites_token_key" ON "nexora_space_invites"("token");
CREATE INDEX IF NOT EXISTS "nexora_space_invites_spaceId_idx" ON "nexora_space_invites"("spaceId");
CREATE UNIQUE INDEX IF NOT EXISTS "nexora_auth_tokens_tokenHash_key" ON "nexora_auth_tokens"("tokenHash");
CREATE INDEX IF NOT EXISTS "nexora_auth_tokens_email_kind_createdAt_idx" ON "nexora_auth_tokens"("email", "kind", "createdAt");
ALTER TABLE "nexora_space_invites" ADD CONSTRAINT "nexora_space_invites_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "nexora_spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "nexora_space_invites" ADD CONSTRAINT "nexora_space_invites_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "nexora_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
