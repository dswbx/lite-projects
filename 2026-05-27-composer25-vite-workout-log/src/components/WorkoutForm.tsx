import { useState, type FormEvent } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { SetRow, type SetDraft } from './SetRow'

type ExerciseDraft = {
  key: string
  name: string
  sets: SetDraft[]
}

function newExercise(): ExerciseDraft {
  return {
    key: crypto.randomUUID(),
    name: '',
    sets: [
      { set_number: 1, reps: '', weight_lbs: '' },
      { set_number: 2, reps: '', weight_lbs: '' },
      { set_number: 3, reps: '', weight_lbs: '' },
    ],
  }
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

type Props = {
  user: User
  onSaved: () => void
}

export function WorkoutForm({ user, onSaved }: Props) {
  const [title, setTitle] = useState('')
  const [workoutDate, setWorkoutDate] = useState(todayIso)
  const [notes, setNotes] = useState('')
  const [exercises, setExercises] = useState<ExerciseDraft[]>([newExercise()])
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function updateExercise(index: number, patch: Partial<ExerciseDraft>) {
    setExercises((prev) =>
      prev.map((ex, i) => (i === index ? { ...ex, ...patch } : ex)),
    )
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      setError('Give this workout a name.')
      return
    }

    const validExercises = exercises
      .map((ex) => ({
        ...ex,
        name: ex.name.trim(),
        sets: ex.sets.filter((s) => s.reps.trim() !== ''),
      }))
      .filter((ex) => ex.name && ex.sets.length > 0)

    if (validExercises.length === 0) {
      setError('Add at least one exercise with one completed set.')
      return
    }

    setSaving(true)

    const { data: workout, error: workoutError } = await supabase
      .from('workouts')
      .insert({
        user_id: user.id,
        title: trimmedTitle,
        notes: notes.trim() || null,
        workout_date: workoutDate,
      })
      .select('id')
      .single()

    if (workoutError || !workout) {
      setSaving(false)
      setError(workoutError?.message ?? 'Could not save workout.')
      return
    }

    for (let i = 0; i < validExercises.length; i++) {
      const ex = validExercises[i]
      const { data: exerciseRow, error: exError } = await supabase
        .from('workout_exercises')
        .insert({
          workout_id: workout.id,
          user_id: user.id,
          name: ex.name,
          sort_order: i,
        })
        .select('id')
        .single()

      if (exError || !exerciseRow) {
        setSaving(false)
        setError(exError?.message ?? 'Could not save exercise.')
        return
      }

      const setRows = ex.sets.map((s, idx) => ({
        exercise_id: exerciseRow.id,
        user_id: user.id,
        set_number: idx + 1,
        reps: parseInt(s.reps, 10),
        weight_lbs: parseFloat(s.weight_lbs) || 0,
      }))

      const { error: setsError } = await supabase.from('exercise_sets').insert(setRows)

      if (setsError) {
        setSaving(false)
        setError(setsError.message)
        return
      }
    }

    setSaving(false)
    setTitle('')
    setWorkoutDate(todayIso())
    setNotes('')
    setExercises([newExercise()])
    onSaved()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <section className="space-y-4">
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wider text-muted">
            Workout name
          </span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Push day, leg day…"
            className="mt-1.5 w-full rounded-lg border border-steel bg-slate px-4 py-3 text-chalk outline-none focus:border-ember focus:ring-2 focus:ring-ember/30"
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wider text-muted">
              Date
            </span>
            <input
              type="date"
              value={workoutDate}
              onChange={(e) => setWorkoutDate(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-steel bg-slate px-4 py-3 text-chalk outline-none focus:border-ember"
            />
          </label>
          <label className="block sm:col-span-1">
            <span className="text-xs font-medium uppercase tracking-wider text-muted">
              Notes (optional)
            </span>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Felt strong today"
              className="mt-1.5 w-full rounded-lg border border-steel bg-slate px-4 py-3 text-chalk outline-none focus:border-ember"
            />
          </label>
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-display text-xl font-semibold uppercase tracking-wide">
            Exercises
          </h2>
          <button
            type="button"
            onClick={() => setExercises((prev) => [...prev, newExercise()])}
            className="text-sm font-medium text-ember hover:text-chalk"
          >
            + Add exercise
          </button>
        </div>

        {exercises.map((ex, exIndex) => (
          <div
            key={ex.key}
            className="rounded-xl border border-steel bg-slate/60 p-5 shadow-lg shadow-black/20"
          >
            <div className="flex gap-3">
              <input
                value={ex.name}
                onChange={(e) => updateExercise(exIndex, { name: e.target.value })}
                placeholder="Exercise name"
                className="flex-1 rounded-lg border border-steel bg-iron px-3 py-2 font-medium text-chalk outline-none focus:border-ember"
              />
              {exercises.length > 1 && (
                <button
                  type="button"
                  onClick={() =>
                    setExercises((prev) => prev.filter((_, i) => i !== exIndex))
                  }
                  className="shrink-0 px-2 text-muted hover:text-red-400"
                >
                  Remove
                </button>
              )}
            </div>

            <div className="mt-4 grid grid-cols-[2.5rem_1fr_1fr_2rem] gap-2 text-xs uppercase tracking-wider text-muted">
              <span>Set</span>
              <span>Reps</span>
              <span>Weight (lbs)</span>
              <span />
            </div>

            <div className="mt-2 space-y-2">
              {ex.sets.map((set, setIndex) => (
                <SetRow
                  key={set.set_number}
                  set={set}
                  canRemove={ex.sets.length > 1}
                  onChange={(next) => {
                    const sets = [...ex.sets]
                    sets[setIndex] = next
                    updateExercise(exIndex, { sets })
                  }}
                  onRemove={() => {
                    const sets = ex.sets
                      .filter((_, i) => i !== setIndex)
                      .map((s, i) => ({ ...s, set_number: i + 1 }))
                    updateExercise(exIndex, { sets })
                  }}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={() =>
                updateExercise(exIndex, {
                  sets: [
                    ...ex.sets,
                    {
                      set_number: ex.sets.length + 1,
                      reps: '',
                      weight_lbs: '',
                    },
                  ],
                })
              }
              className="mt-3 text-sm text-muted hover:text-ember"
            >
              + Add set
            </button>
          </div>
        ))}
      </section>

      {error && (
        <p className="rounded-lg border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-lg bg-ember py-3.5 font-display text-lg font-semibold uppercase tracking-wide text-iron transition hover:bg-ember-dim disabled:opacity-50 sm:w-auto sm:px-12"
      >
        {saving ? 'Saving…' : 'Save workout'}
      </button>
    </form>
  )
}
