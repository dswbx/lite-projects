import { useState } from 'react'
import { supabase } from '../lib/supabase'
import type { WorkoutWithDetails } from '../types/database'

type Props = {
  workout: WorkoutWithDetails
  onBack: () => void
  onDeleted: () => void
}

function formatDate(iso: string) {
  const [y, m, d] = iso.split('-')
  return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export function WorkoutDetail({ workout, onBack, onDeleted }: Props) {
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    if (!confirm('Delete this workout permanently?')) return

    setDeleting(true)
    setError(null)

    const { error: deleteError } = await supabase.from('workouts').delete().eq('id', workout.id)

    setDeleting(false)

    if (deleteError) {
      setError(deleteError.message)
      return
    }

    onDeleted()
  }

  const exercises = workout.workout_exercises ?? []

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={onBack}
        className="text-sm font-medium text-muted hover:text-ember"
      >
        ← Back to history
      </button>

      <header>
        <p className="text-xs uppercase tracking-wider text-muted">{formatDate(workout.workout_date)}</p>
        <h2 className="mt-1 font-display text-3xl font-bold uppercase tracking-tight text-chalk">
          {workout.title}
        </h2>
        {workout.notes && <p className="mt-2 text-sm text-muted">{workout.notes}</p>}
      </header>

      <div className="space-y-5">
        {exercises.map((ex) => (
          <section
            key={ex.id}
            className="rounded-xl border border-steel bg-slate/50 p-5"
          >
            <h3 className="font-display text-lg font-semibold uppercase tracking-wide text-ember">
              {ex.name}
            </h3>
            <table className="mt-3 w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-muted">
                  <th className="pb-2 pr-4">Set</th>
                  <th className="pb-2 pr-4">Reps</th>
                  <th className="pb-2">Weight</th>
                </tr>
              </thead>
              <tbody>
                {(ex.exercise_sets ?? []).map((s) => (
                  <tr key={s.id} className="border-t border-steel/80">
                    <td className="py-2.5 pr-4 font-display font-semibold text-muted">
                      {s.set_number}
                    </td>
                    <td className="py-2.5 pr-4">{s.reps}</td>
                    <td className="py-2.5">{s.weight_lbs} lbs</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}
      </div>

      {error && (
        <p className="rounded-lg border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        className="text-sm text-red-400 hover:text-red-300 disabled:opacity-50"
      >
        {deleting ? 'Deleting…' : 'Delete workout'}
      </button>
    </div>
  )
}
