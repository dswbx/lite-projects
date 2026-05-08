import { createClient } from '@supabase/supabase-js'

// same-origin: vite plugin mounts /rest/v1 and /auth/v1 on the dev server
export const supabase = createClient(
  window.location.origin,
  'any-string-works-for-now',
)

export type Deck = {
  id: number
  name: string
  created_at: string
}

export type Card = {
  id: number
  deck_id: number
  question: string
  answer: string
  correct_count: number
  wrong_count: number
  created_at: string
}
