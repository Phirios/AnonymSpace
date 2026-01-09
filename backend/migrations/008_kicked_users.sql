-- Track kicked users in spaces
ALTER TABLE space_users ADD COLUMN is_kicked BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE space_users ADD COLUMN kicked_at TIMESTAMP WITH TIME ZONE;
