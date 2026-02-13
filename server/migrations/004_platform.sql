-- Platform admin support
ALTER TABLE users ADD COLUMN IF NOT EXISTS platform_role TEXT DEFAULT NULL;
-- Values: 'platform_admin' or NULL

ALTER TABLE stores ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
