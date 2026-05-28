import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { AuthPanel } from './components/AuthPanel'
import { WatchlistApp } from './components/WatchlistApp'
import { supabase } from './lib/supabase'

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setReady(true)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
    })

    return () => sub.subscription.unsubscribe()
  }, [])

  if (!ready) {
    return (
      <div className="flex min-h-svh items-center justify-center text-muted">
        Opening the curtain…
      </div>
    )
  }

  if (!session) {
    return (
      <main className="flex min-h-svh items-center justify-center px-4 py-12">
        <AuthPanel />
      </main>
    )
  }

  return (
    <main>
      <WatchlistApp session={session} />
    </main>
  )
}

export default App
