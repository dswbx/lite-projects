import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

export const supabase = createClient<Database>(
  window.location.origin,
  'local-anon-key',
)
