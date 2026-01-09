-- Add ban_from_messages column to space_users
-- When true, kicked user cannot see messages after kick time (even when finished)
-- When false, kicked user becomes a spectator (can see all messages when finished)
ALTER TABLE space_users ADD COLUMN IF NOT EXISTS ban_from_messages BOOLEAN NOT NULL DEFAULT FALSE;
