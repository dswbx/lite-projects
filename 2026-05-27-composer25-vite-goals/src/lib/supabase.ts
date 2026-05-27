import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const url =
  import.meta.env.VITE_SUPABASE_URL ??
  (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173')

const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? 'dev-anon-key'

export const supabase = createClient<Database>(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})
