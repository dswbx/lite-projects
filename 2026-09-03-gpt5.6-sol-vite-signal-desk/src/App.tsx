import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { AuthScreen } from '@/components/app/auth-screen'
import { WorkspaceApp } from '@/components/app/workspace-app'
import { Skeleton } from '@/components/ui/skeleton'
import { authService } from '@/features/auth/api'
import { supabase } from '@/lib/supabase'

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    async function restoreSession() {
      const params = new URLSearchParams(window.location.search)
      const code = params.get('code')
      if (window.location.pathname === '/auth/callback' && code) {
        await authService.exchangeCodeForSession(code)
        window.history.replaceState({}, document.title, '/')
      }
      const result = await authService.getSession()
      if (mounted) {
        setSession(result.ok ? result.data : null)
        setLoading(false)
      }
    }
    void restoreSession()

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setLoading(false)
    })

    return () => {
      mounted = false
      data.subscription.unsubscribe()
    }
  }, [])

  if (loading) {
    return (
      <main className="grid min-h-svh place-items-center bg-background p-6">
        <div className="flex w-full max-w-sm flex-col gap-4" aria-label="Loading Signal Desk">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-64 w-full" />
        </div>
      </main>
    )
  }

  return session ? <WorkspaceApp session={session} /> : <AuthScreen />
}
