-- Users table for authentication
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Link space_users to authenticated users (optional, for tracking)
ALTER TABLE space_users ADD COLUMN auth_user_id UUID REFERENCES users(id) ON DELETE SET NULL;
