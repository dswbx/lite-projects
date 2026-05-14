import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { AuthForm } from './components/AuthForm'
import { JournalWorkspace } from './components/JournalWorkspace'

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600">
        Loading…
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-teal-50/40 text-slate-900">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:py-10">
        <header className="mb-8 flex flex-col gap-4 border-b border-slate-200/80 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              Daily journal
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              One page per calendar day. Sign in to keep entries private to your account.
            </p>
          </div>
          {session ? (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="truncate text-slate-600">{session.user.email}</span>
              <button
                type="button"
                onClick={() => void supabase.auth.signOut()}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 hover:bg-slate-50"
              >
                Sign out
              </button>
            </div>
          ) : null}
        </header>

        {session ? (
          <JournalWorkspace session={session} />
        ) : (
          <div className="mx-auto max-w-md space-y-4">
            <p className="text-sm text-slate-600">
              Create an account or sign in. Row level security ensures you only ever load your own rows.
            </p>
            <AuthForm />
          </div>
        )}
      </div>
    </div>
  )
}
