CREATE TABLE IF NOT EXISTS user_store_access (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  granted_by TEXT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, store_id)
);

CREATE INDEX IF NOT EXISTS idx_usa_user ON user_store_access(user_id);
CREATE INDEX IF NOT EXISTS idx_usa_store ON user_store_access(store_id);

-- Backfill existing users with their home store
INSERT INTO user_store_access (id, user_id, store_id)
SELECT gen_random_uuid()::text, id, store_id FROM users
ON CONFLICT DO NOTHING;
