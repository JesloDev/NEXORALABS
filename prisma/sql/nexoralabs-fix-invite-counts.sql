-- One-off: set each employee invite link's used count from the accounts that actually registered with it.
UPDATE "nexora_invite_links" l SET "currentUses" = (SELECT COUNT(*) FROM "nexora_users" u WHERE u."inviteLinkId" = l."id");
