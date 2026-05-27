import { createClient } from '@supabase/supabase-js'

// the supalite vite plugin mounts /auth/v1, /rest/v1, /_system on the same
// origin as the vite dev server -- no separate port, no .env file needed.
// anon key: supalite accepts any non-empty string per README ("No anon key is required yet").
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? window.location.origin
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? 'dev-anon-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Trip = {
  id: string
  user_id: string
  title: string
  destination: string
  start_date: string
  end_date: string
  notes: string | null
  created_at: string
  updated_at: string
}

export type TripDay = {
  id: string
  trip_id: string
  day_date: string
  notes: string | null
  created_at: string
  updated_at: string
}

export type Activity = {
  id: string
  trip_day_id: string
  title: string
  description: string | null
  time_of_day: string | null
  created_at: string
  updated_at: string
}

export type PackingItem = {
  id: string
  trip_id: string
  name: string
  packed: boolean
  category: string | null
  created_at: string
}
