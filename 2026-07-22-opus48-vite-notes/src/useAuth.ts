import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function init() {
      const { data } = await supabase.auth.getSession()
      const session = data.session

      // getSession() only reads the locally stored token; it does not check that the
      // user still exists on the server. If the database was reset (or the account
      // deleted), the stored token points at a user that is gone — leaving it in place
      // makes every read return nothing and every write fail with a foreign-key error.
      // Validate against the server and drop the stale session if the user is missing.
      if (session) {
        const { error } = await supabase.auth.getUser()
        if (error) {
          await supabase.auth.signOut()
          if (!cancelled) {
            setSession(null)
            setLoading(false)
          }
          return
        }
      }

      if (!cancelled) {
        setSession(session)
        setLoading(false)
      }
    }

    init()

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!cancelled) setSession(session)
    })

    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [])

  return { session, loading }
}
