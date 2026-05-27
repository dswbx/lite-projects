import { useState } from 'react'
import { useAuth } from './hooks/useAuth'
import { AuthScreen } from './components/AuthScreen'
import { WorkoutForm } from './components/WorkoutForm'
import { WorkoutHistory } from './components/WorkoutHistory'
import { supabase } from './lib/supabase'

type Tab = 'log' | 'history'

export default function App() {
  const { user, loading } = useAuth()
  const [tab, setTab] = useState<Tab>('log')
  const [historyRefresh, setHistoryRefresh] = useState(0)

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <p className="font-display text-sm uppercase tracking-widest text-muted">Loading…</p>
      </div>
    )
  }

  if (!user) {
    return <AuthScreen />
  }

  return (
    <div className="mx-auto min-h-dvh max-w-2xl px-5 py-8 pb-16">
      <header className="flex items-start justify-between gap-4 border-b border-steel pb-6">
        <div>
          <p className="font-display text-xs font-semibold uppercase tracking-[0.35em] text-ember">
            Iron Log
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold uppercase tracking-tight">
            Workout tracker
          </h1>
        </div>
        <button
          type="button"
          onClick={() => supabase.auth.signOut()}
          className="shrink-0 text-xs font-medium uppercase tracking-wider text-muted hover:text-chalk"
        >
          Sign out
        </button>
      </header>

      <nav className="mt-6 flex gap-1 rounded-lg bg-slate p-1">
        {(
          [
            ['log', 'Log workout'],
            ['history', 'History'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex-1 rounded-md py-2.5 font-display text-sm font-semibold uppercase tracking-wide transition ${
              tab === id
                ? 'bg-ember text-iron'
                : 'text-muted hover:text-chalk'
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      <main className="mt-8">
        {tab === 'log' ? (
          <WorkoutForm
            user={user}
            onSaved={() => {
              setHistoryRefresh((n) => n + 1)
              setTab('history')
            }}
          />
        ) : (
          <WorkoutHistory refreshKey={historyRefresh} />
        )}
      </main>
    </div>
  )
}
