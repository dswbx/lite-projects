import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL ?? window.location.origin,
  import.meta.env.VITE_SUPABASE_ANON_KEY ?? 'local-development-key',
)
