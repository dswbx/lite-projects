### 2026-05-27T17:45:00Z — Vite plugin setup
- `@supabase/lite/vite` plugin worked seamlessly, no need to run a separate backend process.
- why it mattered: Reduced complexity in scaffolding the project.
- versions: @supabase/lite@0.3.1-next.1, vite@8.0.14

### 2026-05-27T17:45:00Z — Supabase-js compatibility
- Used standard `@supabase/supabase-js` client for auth and database queries.
- why it mattered: Existing knowledge of Supabase transferred directly, making development fast.
- versions: @supabase/supabase-js@2.106.2, @supabase/lite@0.3.1-next.1
