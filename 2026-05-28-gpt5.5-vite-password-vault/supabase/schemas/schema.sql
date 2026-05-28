CREATE TABLE IF NOT EXISTS vault_entries (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  site_name TEXT NOT NULL CHECK (length(site_name) > 0),
  username TEXT NOT NULL CHECK (length(username) > 0),
  password_ciphertext TEXT NOT NULL CHECK (length(password_ciphertext) > 0),
  password_iv TEXT NOT NULL CHECK (length(password_iv) > 0),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE vault_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY vault_entries_select_own
  ON vault_entries
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY vault_entries_insert_own
  ON vault_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY vault_entries_update_own
  ON vault_entries
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY vault_entries_delete_own
  ON vault_entries
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS vault_entries_user_site_idx ON vault_entries (user_id, site_name);
