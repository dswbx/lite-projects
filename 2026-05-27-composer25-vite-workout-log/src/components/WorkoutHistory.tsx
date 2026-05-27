import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Workout, WorkoutWithDetails } from '../types/database'
import { WorkoutDetail } from './WorkoutDetail'

function formatDate(iso: string) {
  const [y, m, d] = iso.split('-')
  return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

type Props = {
  refreshKey: number
}

export function WorkoutHistory({ refreshKey }: Props) {
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [selected, setSelected] = useState<WorkoutWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadList = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await supabase
      .from('workouts')
      .select('*')
      .order('workout_date', { ascending: false })
      .order('created_at', { ascending: false })

    setLoading(false)

    if (fetchError) {
      setError(fetchError.message)
      return
    }

    setWorkouts(data ?? [])
  }, [])

  useEffect(() => {
    loadList()
  }, [loadList, refreshKey])

  async function openWorkout(id: string) {
    const { data, error: fetchError } = await supabase
      .from('workouts')
      .select(
        `
        *,
        workout_exercises (
          *,
          exercise_sets (*)
        )
      `,
      )
      .eq('id', id)
      .order('sort_order', { referencedTable: 'workout_exercises', ascending: true })
      .order('set_number', { referencedTable: 'workout_exercises.exercise_sets', ascending: true })
      .single()

    if (fetchError) {
      setError(fetchError.message)
      return
    }

    const row = data as WorkoutWithDetails
    row.workout_exercises = (row.workout_exercises ?? []).map((ex) => ({
      ...ex,
      exercise_sets: [...(ex.exercise_sets ?? [])].sort(
        (a, b) => a.set_number - b.set_number,
      ),
    }))

    setSelected(row)
  }

  if (selected) {
    return (
      <WorkoutDetail
        workout={selected}
        onBack={() => setSelected(null)}
        onDeleted={() => {
          setSelected(null)
          loadList()
        }}
      />
    )
  }

  return (
    <div className="space-y-4">
      {loading && <p className="text-sm text-muted">Loading your history…</p>}
      {error && (
        <p className="rounded-lg border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}
      {!loading && !error && workouts.length === 0 && (
        <div className="rounded-xl border border-dashed border-steel px-6 py-12 text-center">
          <p className="font-display text-lg uppercase text-muted">No workouts yet</p>
          <p className="mt-2 text-sm text-muted">
            Log your first session on the Log tab.
          </p>
        </div>
      )}
      <ul className="space-y-3">
        {workouts.map((w) => (
          <li key={w.id}>
            <button
              type="button"
              onClick={() => openWorkout(w.id)}
              className="group flex w-full items-center justify-between gap-4 rounded-xl border border-steel bg-slate/50 px-5 py-4 text-left transition hover:border-ember/50 hover:bg-slate"
            >
              <div>
                <p className="font-display text-lg font-semibold uppercase tracking-wide text-chalk group-hover:text-ember">
                  {w.title}
                </p>
                <p className="mt-0.5 text-sm text-muted">{formatDate(w.workout_date)}</p>
              </div>
              <span className="font-display text-2xl text-steel group-hover:text-ember">
                →
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
