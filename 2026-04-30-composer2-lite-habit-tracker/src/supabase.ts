import { createClient } from '@supabase/supabase-js'

// supalite mounts auth and rest on the Vite dev server (same origin)
export const supabase = createClient(
  window.location.origin,
  'any-string-works-for-now',
)

export type Habit = {
  id: number
  user_id: string
  name: string
  created_at: string
}

export type HabitCompletion = {
  id: number
  habit_id: number
  user_id: string
  completed_on: string
}
