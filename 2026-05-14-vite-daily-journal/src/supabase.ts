import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  window.location.origin,
  'any-string-works-for-now',
)

export type JournalEntry = {
  id: number
  user_id: string
  entry_date: string
  body: string
  created_at: string
  updated_at: string
}
