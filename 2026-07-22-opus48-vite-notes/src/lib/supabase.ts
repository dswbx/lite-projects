import { createClient } from '@supabase/supabase-js'

// The @supabase/lite Vite plugin injects both of these at dev/preview time:
// VITE_SUPABASE_URL (the current origin) and a dev VITE_SUPABASE_ANON_KEY.
const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(url, anonKey)

export type Note = {
  id: string
  user_id: string
  title: string
  content: string
  created_at: string
  updated_at: string
}
