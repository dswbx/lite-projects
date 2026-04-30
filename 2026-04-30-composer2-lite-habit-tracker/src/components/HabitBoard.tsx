import type { Session } from '@supabase/supabase-js'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { computeCurrentStreak } from '../lib/streak'
import { localDateString } from '../lib/dates'
import type { Habit } from '../supabase'
import { supabase } from '../supabase'

type Props = {
  session: Session
}

export function HabitBoard({ session }: Props) {
  const [habits, setHabits] = useState<Habit[]>([])
  const [completionByHabit, setCompletionByHabit] = useState<
    Record<number, string[]>
  >({})
  const [newName, setNewName] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const todayStr = useMemo(() => localDateString(), [])

  const loadData = useCallback(async () => {
    setError(null)
    const { data: habitRows, error: habitErr } = await supabase
      .from('habits')
      .select('id, user_id, name, created_at')
      .order('created_at', { ascending: true })

    if (habitErr) {
      setError(habitErr.message)
      setLoading(false)
      return
    }

    const list = (habitRows ?? []) as Habit[]
    setHabits(list)

    if (list.length === 0) {
      setCompletionByHabit({})
      setLoading(false)
      return
    }

    const ids = list.map((h) => h.id)
    const { data: compRows, error: compErr } = await supabase
      .from('habit_completions')
      .select('habit_id, completed_on')
      .in('habit_id', ids)

    if (compErr) {
      setError(compErr.message)
      setLoading(false)
      return
    }

    const map: Record<number, string[]> = {}
    for (const row of compRows ?? []) {
      const hid = row.habit_id as number
      const day = row.completed_on as string
      if (!map[hid]) map[hid] = []
      map[hid].push(day)
    }
    setCompletionByHabit(map)
    setLoading(false)
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  async function addHabit(e: React.FormEvent) {
    e.preventDefault()
    const name = newName.trim()
    if (!name) return
    setError(null)
    const { error: insertErr } = await supabase.from('habits').insert({
      user_id: session.user.id,
      name,
    })
    if (insertErr) {
      setError(insertErr.message)
      return
    }
    setNewName('')
    setLoading(true)
    await loadData()
  }

  async function removeHabit(id: number) {
    setError(null)
    const { error: delErr } = await supabase.from('habits').delete().eq('id', id)
    if (delErr) {
      setError(delErr.message)
      return
    }
    setLoading(true)
    await loadData()
  }

  async function toggleToday(habitId: number) {
    setError(null)
    const existing = completionByHabit[habitId]?.includes(todayStr)
    if (existing) {
      const { error: delErr } = await supabase
        .from('habit_completions')
        .delete()
        .eq('habit_id', habitId)
        .eq('completed_on', todayStr)
      if (delErr) {
        setError(delErr.message)
        return
      }
    } else {
      const { error: insErr } = await supabase.from('habit_completions').insert({
        habit_id: habitId,
        user_id: session.user.id,
        completed_on: todayStr,
      })
      if (insErr) {
        setError(insErr.message)
        return
      }
    }
    await loadData()
  }

  if (loading && habits.length === 0) {
    return (
      <p className="text-sm text-neutral-500" aria-live="polite">
        Loading habits…
      </p>
    )
  }

  return (
    <div className="space-y-6">
      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <form onSubmit={addHabit} className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <label htmlFor="habit-name" className="mb-1 block text-xs font-medium text-neutral-600">
            New habit
          </label>
          <input
            id="habit-name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Morning walk"
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
        >
          Add
        </button>
      </form>

      {habits.length === 0 ? (
        <p className="text-sm text-neutral-600">
          You have no habits yet. Add one above to start tracking.
        </p>
      ) : (
        <ul className="space-y-3">
          {habits.map((h) => {
            const dates = completionByHabit[h.id] ?? []
            const streak = computeCurrentStreak(dates)
            const doneToday = dates.includes(todayStr)
            return (
              <li
                key={h.id}
                className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-medium text-neutral-900">{h.name}</p>
                  <p className="mt-1 text-sm text-neutral-600">
                    Streak:{' '}
                    <span className="font-semibold tabular-nums text-emerald-800">
                      {streak}
                    </span>{' '}
                    {streak === 1 ? 'day' : 'days'}
                    {!doneToday ? (
                      <span className="text-neutral-500"> · not checked in today yet</span>
                    ) : null}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void toggleToday(h.id)}
                    className={`rounded-lg px-3 py-2 text-sm font-medium ${
                      doneToday
                        ? 'bg-emerald-100 text-emerald-900 ring-2 ring-emerald-600'
                        : 'border border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-50'
                    }`}
                  >
                    {doneToday ? "Today's done" : 'Mark today'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void removeHabit(h.id)}
                    className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-700 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
