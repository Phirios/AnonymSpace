ALTER TABLE spaces ADD COLUMN creator_id UUID REFERENCES space_users(id) ON DELETE SET NULL;
ALTER TABLE spaces ADD COLUMN last_activity TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX idx_spaces_last_activity ON spaces(last_activity);
