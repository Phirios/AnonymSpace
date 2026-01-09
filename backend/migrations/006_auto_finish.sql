-- Auto finish spaces after inactivity
ALTER TABLE spaces ADD COLUMN auto_finish_minutes INTEGER DEFAULT NULL;
