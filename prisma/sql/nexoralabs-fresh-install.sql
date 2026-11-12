-- NEXORALABS database schema (PostgreSQL) — FRESH INSTALL (empty database / no nexora_ tables yet)
-- No DO blocks and no dollar-quoting. Every statement is plain SQL, so it runs in any query console
-- (Aiven console, DBeaver, psql). Nothing is dropped, truncated or renamed.
-- Run each statement in order (or the whole file). Running it twice will error on CREATE TYPE and ADD CONSTRAINT.

-- 1. Enums
CREATE TYPE "nexora_role" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'EMPLOYEE');
CREATE TYPE "nexora_user_status" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'REJECTED');
CREATE TYPE "nexora_waitlist_status" AS ENUM ('PENDING_VERIFICATION', 'CONFIRMED', 'CONTACTED');
CREATE TYPE "nexora_chat_type" AS ENUM ('DIRECT', 'GROUP', 'CHANNEL');
CREATE TYPE "nexora_chat_member_role" AS ENUM ('ADMIN', 'MEMBER');
CREATE TYPE "nexora_announcement_category" AS ENUM ('NEWS', 'UPDATE', 'EVENT', 'PARTNERSHIP', 'ACHIEVEMENT');
CREATE TYPE "nexora_notification_type" AS ENUM ('LOGIN', 'ACCOUNT_CHANGE', 'NEW_MESSAGE', 'APPROVAL', 'WAITLIST_CONFIRM', 'SYSTEM');
CREATE TYPE "nexora_space_visibility" AS ENUM ('PUBLIC', 'PRIVATE');
CREATE TYPE "nexora_space_role" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- 2. Tables
CREATE TABLE IF NOT EXISTS "nexora_users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT,
    "image" TEXT,
    "role" "nexora_role" NOT NULL DEFAULT 'EMPLOYEE',
    "status" "nexora_user_status" NOT NULL DEFAULT 'PENDING',
    "emailVerified" TIMESTAMP(3),
    "verifyToken" TEXT,
    "verifyTokenExpiry" TIMESTAMP(3),
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "rejectedReason" TEXT,
    "passwordResetToken" TEXT,
    "passwordResetTokenExpiry" TIMESTAMP(3),
    "passwordChangedAt" TIMESTAMP(3),
    "title" TEXT,
    "department" TEXT,
    "phone" TEXT,
    "bio" TEXT,
    "location" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "inviteLinkId" TEXT,
    CONSTRAINT "nexora_users_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "nexora_waitlist" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "company" TEXT,
    "role" TEXT,
    "interest" TEXT,
    "message" TEXT,
    "status" "nexora_waitlist_status" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "verifyToken" TEXT,
    "verifyTokenExpiry" TIMESTAMP(3),
    "otp" TEXT,
    "otpExpiry" TIMESTAMP(3),
    "otpAttempts" INTEGER NOT NULL DEFAULT 0,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "nexora_waitlist_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "nexora_invite_links" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "label" TEXT,
    "createdBy" TEXT NOT NULL,
    "maxUses" INTEGER NOT NULL DEFAULT 1,
    "currentUses" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "nexora_invite_links_pkey" PRIMARY KEY ("id")
);
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
CREATE TABLE IF NOT EXISTS "nexora_chats" (
    "id" TEXT NOT NULL,
    "type" "nexora_chat_type" NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "avatar" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "spaceId" TEXT,
    "topic" TEXT,
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "nexora_chats_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "nexora_chat_members" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "nexora_chat_member_role" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastReadAt" TIMESTAMP(3),
    CONSTRAINT "nexora_chat_members_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "nexora_messages" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "editedAt" TIMESTAMP(3),
    "parentId" TEXT,
    CONSTRAINT "nexora_messages_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "nexora_announcements" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" "nexora_announcement_category" NOT NULL DEFAULT 'NEWS',
    "imageUrl" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "nexora_announcements_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "nexora_activity_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "nexora_activity_logs_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "nexora_notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "nexora_notification_type" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "link" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "nexora_notifications_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "nexora_pipeline_items" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sdgTags" TEXT NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "iconName" TEXT NOT NULL DEFAULT 'Leaf',
    "published" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "nexora_pipeline_items_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "nexora_comments" (
    "id" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "authorRole" TEXT,
    "authorCompany" TEXT,
    "content" TEXT NOT NULL,
    "rating" INTEGER NOT NULL DEFAULT 5,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "nexora_comments_pkey" PRIMARY KEY ("id")
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

-- 3. Indexes
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

-- 4. Foreign keys
ALTER TABLE "nexora_users" ADD CONSTRAINT "nexora_users_inviteLinkId_fkey" FOREIGN KEY ("inviteLinkId") REFERENCES "nexora_invite_links"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "nexora_invite_links" ADD CONSTRAINT "nexora_invite_links_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "nexora_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nexora_chats" ADD CONSTRAINT "nexora_chats_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "nexora_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nexora_chats" ADD CONSTRAINT "nexora_chats_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "nexora_spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "nexora_chat_members" ADD CONSTRAINT "nexora_chat_members_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "nexora_chats"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "nexora_chat_members" ADD CONSTRAINT "nexora_chat_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "nexora_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "nexora_messages" ADD CONSTRAINT "nexora_messages_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "nexora_chats"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "nexora_messages" ADD CONSTRAINT "nexora_messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "nexora_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "nexora_messages" ADD CONSTRAINT "nexora_messages_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "nexora_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "nexora_announcements" ADD CONSTRAINT "nexora_announcements_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "nexora_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nexora_activity_logs" ADD CONSTRAINT "nexora_activity_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "nexora_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "nexora_notifications" ADD CONSTRAINT "nexora_notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "nexora_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "nexora_pipeline_items" ADD CONSTRAINT "nexora_pipeline_items_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "nexora_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nexora_comments" ADD CONSTRAINT "nexora_comments_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "nexora_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nexora_spaces" ADD CONSTRAINT "nexora_spaces_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "nexora_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nexora_space_members" ADD CONSTRAINT "nexora_space_members_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "nexora_spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "nexora_space_members" ADD CONSTRAINT "nexora_space_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "nexora_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "nexora_pages" ADD CONSTRAINT "nexora_pages_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "nexora_spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "nexora_pages" ADD CONSTRAINT "nexora_pages_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "nexora_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "nexora_pages" ADD CONSTRAINT "nexora_pages_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "nexora_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nexora_pages" ADD CONSTRAINT "nexora_pages_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "nexora_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "nexora_reactions" ADD CONSTRAINT "nexora_reactions_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "nexora_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "nexora_reactions" ADD CONSTRAINT "nexora_reactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "nexora_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
