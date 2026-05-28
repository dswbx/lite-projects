CREATE TABLE items (
   id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   user_id     UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
   name        TEXT NOT NULL,
   category    TEXT NOT NULL,
   quantity    INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 0),
   location    TEXT NOT NULL,
   created_at  TIMESTAMP DEFAULT NOW(),
   updated_at  TIMESTAMP DEFAULT NOW()
);

ALTER TABLE items ENABLE ROW LEVEL SECURITY;

CREATE POLICY items_select ON items FOR SELECT TO authenticated
   USING (user_id = auth.uid());

CREATE POLICY items_insert ON items FOR INSERT TO authenticated
   WITH CHECK (user_id = auth.uid());

CREATE POLICY items_update ON items FOR UPDATE TO authenticated
   USING (user_id = auth.uid())
   WITH CHECK (user_id = auth.uid());

CREATE POLICY items_delete ON items FOR DELETE TO authenticated
   USING (user_id = auth.uid());
