-- NEXORALABS database schema (PostgreSQL) — UPGRADE (database already has the older nexora_ tables)
-- No DO blocks and no dollar-quoting. Every statement is plain SQL, so it runs in any query console
-- (Aiven console, DBeaver, psql). Nothing is dropped, truncated or renamed.
-- Brings an existing database up to date. Run ONCE. Existing data is untouched.

-- 1. New enum type values / types
ALTER TYPE "nexora_chat_type" ADD VALUE IF NOT EXISTS 'CHANNEL';
CREATE TYPE "nexora_space_visibility" AS ENUM ('PUBLIC', 'PRIVATE');
CREATE TYPE "nexora_space_role" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- 2. New columns on existing tables
ALTER TABLE "nexora_users" ADD COLUMN IF NOT EXISTS "passwordResetToken" TEXT;
ALTER TABLE "nexora_users" ADD COLUMN IF NOT EXISTS "passwordResetTokenExpiry" TIMESTAMP(3);
ALTER TABLE "nexora_users" ADD COLUMN IF NOT EXISTS "passwordChangedAt" TIMESTAMP(3);
ALTER TABLE "nexora_waitlist" ADD COLUMN IF NOT EXISTS "otp" TEXT;
ALTER TABLE "nexora_waitlist" ADD COLUMN IF NOT EXISTS "otpExpiry" TIMESTAMP(3);
ALTER TABLE "nexora_waitlist" ADD COLUMN IF NOT EXISTS "otpAttempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "nexora_chats" ADD COLUMN IF NOT EXISTS "spaceId" TEXT;
ALTER TABLE "nexora_chats" ADD COLUMN IF NOT EXISTS "topic" TEXT;
ALTER TABLE "nexora_chats" ADD COLUMN IF NOT EXISTS "isPrivate" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "nexora_chats" ADD COLUMN IF NOT EXISTS "archived" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "nexora_messages" ADD COLUMN IF NOT EXISTS "editedAt" TIMESTAMP(3);
ALTER TABLE "nexora_messages" ADD COLUMN IF NOT EXISTS "parentId" TEXT;

-- 3. New tables
CREATE TABLE IF NOT EXISTS "nexora_spaces" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "color" TEXT,
    "visibility" "nexora_space_visibility" NOT NULL DEFAULT 'PUBLIC',
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "nexora_spaces_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "nexora_space_members" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "nexora_space_role" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "nexora_space_members_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "nexora_pages" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "parentId" TEXT,
    "title" TEXT NOT NULL DEFAULT 'Untitled',
    "icon" TEXT,
    "content" TEXT NOT NULL DEFAULT '',
    "position" INTEGER NOT NULL DEFAULT 0,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "nexora_pages_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "nexora_reactions" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "nexora_reactions_pkey" PRIMARY KEY ("id")
);

-- 4. Indexes
CREATE UNIQUE INDEX IF NOT EXISTS "nexora_users_email_key" ON "nexora_users"("email");
CREATE INDEX IF NOT EXISTS "nexora_users_status_idx" ON "nexora_users"("status");
CREATE INDEX IF NOT EXISTS "nexora_users_role_idx" ON "nexora_users"("role");
CREATE UNIQUE INDEX IF NOT EXISTS "nexora_waitlist_email_key" ON "nexora_waitlist"("email");
CREATE INDEX IF NOT EXISTS "nexora_waitlist_status_idx" ON "nexora_waitlist"("status");
CREATE UNIQUE INDEX IF NOT EXISTS "nexora_invite_links_token_key" ON "nexora_invite_links"("token");
CREATE INDEX IF NOT EXISTS "nexora_invite_links_createdBy_idx" ON "nexora_invite_links"("createdBy");
CREATE INDEX IF NOT EXISTS "nexora_chats_type_idx" ON "nexora_chats"("type");
CREATE INDEX IF NOT EXISTS "nexora_chats_spaceId_idx" ON "nexora_chats"("spaceId");
CREATE UNIQUE INDEX IF NOT EXISTS "nexora_chat_members_chatId_userId_key" ON "nexora_chat_members"("chatId", "userId");
CREATE INDEX IF NOT EXISTS "nexora_chat_members_userId_idx" ON "nexora_chat_members"("userId");
CREATE INDEX IF NOT EXISTS "nexora_messages_chatId_createdAt_idx" ON "nexora_messages"("chatId", "createdAt");
CREATE INDEX IF NOT EXISTS "nexora_messages_parentId_idx" ON "nexora_messages"("parentId");
CREATE INDEX IF NOT EXISTS "nexora_messages_senderId_idx" ON "nexora_messages"("senderId");
CREATE INDEX IF NOT EXISTS "nexora_announcements_published_publishedAt_idx" ON "nexora_announcements"("published", "publishedAt");
CREATE INDEX IF NOT EXISTS "nexora_activity_logs_userId_idx" ON "nexora_activity_logs"("userId");
CREATE INDEX IF NOT EXISTS "nexora_activity_logs_createdAt_idx" ON "nexora_activity_logs"("createdAt");
CREATE INDEX IF NOT EXISTS "nexora_notifications_userId_read_idx" ON "nexora_notifications"("userId", "read");
CREATE INDEX IF NOT EXISTS "nexora_pipeline_items_published_sortOrder_idx" ON "nexora_pipeline_items"("published", "sortOrder");
CREATE INDEX IF NOT EXISTS "nexora_comments_published_featured_idx" ON "nexora_comments"("published", "featured");
CREATE UNIQUE INDEX IF NOT EXISTS "nexora_spaces_slug_key" ON "nexora_spaces"("slug");
CREATE INDEX IF NOT EXISTS "nexora_spaces_visibility_idx" ON "nexora_spaces"("visibility");
CREATE UNIQUE INDEX IF NOT EXISTS "nexora_space_members_spaceId_userId_key" ON "nexora_space_members"("spaceId", "userId");
CREATE INDEX IF NOT EXISTS "nexora_space_members_userId_idx" ON "nexora_space_members"("userId");
CREATE INDEX IF NOT EXISTS "nexora_pages_spaceId_parentId_idx" ON "nexora_pages"("spaceId", "parentId");
CREATE UNIQUE INDEX IF NOT EXISTS "nexora_reactions_messageId_userId_emoji_key" ON "nexora_reactions"("messageId", "userId", "emoji");
CREATE INDEX IF NOT EXISTS "nexora_reactions_messageId_idx" ON "nexora_reactions"("messageId");

-- 5. Foreign keys for the new tables and columns
ALTER TABLE "nexora_chats" ADD CONSTRAINT "nexora_chats_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "nexora_spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "nexora_messages" ADD CONSTRAINT "nexora_messages_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "nexora_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "nexora_spaces" ADD CONSTRAINT "nexora_spaces_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "nexora_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nexora_space_members" ADD CONSTRAINT "nexora_space_members_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "nexora_spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "nexora_space_members" ADD CONSTRAINT "nexora_space_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "nexora_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "nexora_pages" ADD CONSTRAINT "nexora_pages_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "nexora_spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "nexora_pages" ADD CONSTRAINT "nexora_pages_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "nexora_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "nexora_pages" ADD CONSTRAINT "nexora_pages_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "nexora_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nexora_pages" ADD CONSTRAINT "nexora_pages_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "nexora_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "nexora_reactions" ADD CONSTRAINT "nexora_reactions_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "nexora_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "nexora_reactions" ADD CONSTRAINT "nexora_reactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "nexora_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
