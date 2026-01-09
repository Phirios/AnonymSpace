-- Convert from per-user ban_from_messages to space-level ban_kicked_users setting
-- Drop the per-user column (no longer needed)
ALTER TABLE space_users DROP COLUMN IF EXISTS ban_from_messages;

-- Add space-level ban_kicked_users column
-- When true, kicked users cannot see messages after kick time (even when finished)
-- When false, kicked users become spectators (can see all messages when finished)
ALTER TABLE spaces ADD COLUMN ban_kicked_users BOOLEAN NOT NULL DEFAULT FALSE;
