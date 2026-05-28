import { createClient } from '@supabase/supabase-js'

const url =
  import.meta.env.VITE_SUPABASE_URL ??
  (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173')
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? 'anon-key'

export const supabase = createClient(url, anonKey)

export type Item = {
  id: string
  user_id: string
  name: string
  category: string
  quantity: number
  location: string
  created_at: string
  updated_at: string
}
