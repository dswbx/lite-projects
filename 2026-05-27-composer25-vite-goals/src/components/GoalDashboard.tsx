import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Goal } from '../lib/database.types'
import { useAuth } from '../context/AuthContext'
import { GoalForm } from './GoalForm'
import { GoalDetail } from './GoalDetail'

function formatDate(iso: string | null) {
  if (!iso) return 'No date'
  return new Date(iso + 'T12:00:00').toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function GoalDashboard() {
  const { user, signOut } = useAuth()
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showNew, setShowNew] = useState(false)

  const loadGoals = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('goals')
      .select('*')
      .order('target_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false })

    if (err) setError(err.message)
    else setGoals(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    void loadGoals()
  }, [loadGoals])

  async function createGoal(values: {
    title: string
    description: string
    target_date: string | null
  }) {
    if (!user) return 'Not signed in'
    const { data, error: err } = await supabase
      .from('goals')
      .insert({ ...values, user_id: user.id })
      .select()
      .single()

    if (err) return err.message
    setGoals((prev) => [data, ...prev])
    setShowNew(false)
    setSelectedId(data.id)
    return null
  }

  if (selectedId) {
    return (
      <GoalDetail
        goalId={selectedId}
        onBack={() => setSelectedId(null)}
        onDeleted={() => {
          setSelectedId(null)
          void loadGoals()
        }}
      />
    )
  }

  return (
    <div>
      <header className="mb-10 flex flex-wrap items-start justify-between gap-4 border-b border-line pb-6">
        <div>
          <p className="font-display text-sm font-medium tracking-wide text-moss uppercase">
            Northstar
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold text-ink">Your goals</h1>
          <p className="mt-1 text-sm text-ink-muted">{user?.email}</p>
        </div>
        <button
          type="button"
          onClick={() => void signOut()}
          className="text-sm text-ink-muted hover:text-ink"
        >
          Sign out
        </button>
      </header>

      <div className="mb-6 flex items-center justify-between gap-4">
        <p className="text-ink-muted">
          {goals.length === 0
            ? 'No goals yet — add your first one.'
            : `${goals.length} goal${goals.length === 1 ? '' : 's'}`}
        </p>
        <button
          type="button"
          onClick={() => setShowNew((v) => !v)}
          className="rounded-lg bg-moss px-4 py-2 text-sm font-medium text-paper hover:bg-moss-light"
        >
          {showNew ? 'Close form' : 'New goal'}
        </button>
      </div>

      {showNew && (
        <div className="mb-8">
          <GoalForm submitLabel="Create goal" onSubmit={createGoal} />
        </div>
      )}

      {error && (
        <p className="mb-4 rounded-lg bg-clay/15 px-3 py-2 text-sm text-clay">{error}</p>
      )}

      {loading ? (
        <p className="text-ink-muted">Loading…</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {goals.map((g) => (
            <li key={g.id}>
              <button
                type="button"
                onClick={() => setSelectedId(g.id)}
                className="group w-full rounded-xl border border-line bg-white/50 p-5 text-left transition hover:border-moss/40 hover:shadow-md hover:shadow-moss/5"
              >
                <h2 className="font-display text-xl font-semibold text-ink group-hover:text-moss">
                  {g.title}
                </h2>
                <p className="mt-2 line-clamp-2 text-sm text-ink-muted">
                  {g.description || 'No description'}
                </p>
                <p className="mt-3 text-xs font-medium tracking-wide text-clay uppercase">
                  {formatDate(g.target_date)}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
