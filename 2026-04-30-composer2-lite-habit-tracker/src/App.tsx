import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { AuthForm } from './components/AuthForm'
import { HabitBoard } from './components/HabitBoard'

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
      <div className="flex min-h-screen items-center justify-center bg-stone-50 text-neutral-600">
        Loading…
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-stone-100 text-neutral-900">
      <div className="mx-auto max-w-xl px-4 py-10 sm:px-6">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
              Habit tracker
            </h1>
            <p className="mt-1 text-sm text-neutral-600">
              Log today, build streaks, keep habits private to your account.
            </p>
          </div>
          {session ? (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="truncate text-neutral-600">{session.user.email}</span>
              <button
                type="button"
                onClick={() => void supabase.auth.signOut()}
                className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 hover:bg-neutral-50"
              >
                Sign out
              </button>
            </div>
          ) : null}
        </header>

        {session ? (
          <HabitBoard session={session} />
        ) : (
          <div className="space-y-6">
            <p className="text-sm text-neutral-600">
              Create an account or sign in to add habits and track daily completions. Your data stays tied to your login only.
            </p>
            <AuthForm />
          </div>
        )}
      </div>
    </div>
  )
}
