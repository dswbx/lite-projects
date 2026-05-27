import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { Goal, Milestone } from '../lib/database.types'
import { GoalForm } from './GoalForm'
import { MilestoneList } from './MilestoneList'

type GoalDetailProps = {
  goalId: string
  onBack: () => void
  onDeleted: () => void
}

function formatDate(iso: string | null) {
  if (!iso) return null
  return new Date(iso + 'T12:00:00').toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function GoalDetail({ goalId, onBack, onDeleted }: GoalDetailProps) {
  const { user } = useAuth()
  const [goal, setGoal] = useState<Goal | null>(null)
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    const [goalRes, msRes] = await Promise.all([
      supabase.from('goals').select('*').eq('id', goalId).maybeSingle(),
      supabase
        .from('milestones')
        .select('*')
        .eq('goal_id', goalId)
        .order('position', { ascending: true })
        .order('created_at', { ascending: true }),
    ])

    if (goalRes.error) setError(goalRes.error.message)
    else setGoal(goalRes.data)

    if (msRes.error) setError(msRes.error.message)
    else setMilestones(msRes.data ?? [])

    setLoading(false)
  }, [goalId])

  useEffect(() => {
    void load()
  }, [load])

  async function updateGoal(values: {
    title: string
    description: string
    target_date: string | null
  }) {
    const { error: err } = await supabase.from('goals').update(values).eq('id', goalId)
    if (err) return err.message
    setEditing(false)
    await load()
    return null
  }

  async function deleteGoal() {
    if (!confirm('Delete this goal and all its milestones?')) return
    const { error: err } = await supabase.from('goals').delete().eq('id', goalId)
    if (err) {
      setError(err.message)
      return
    }
    onDeleted()
  }

  async function addMilestone(title: string) {
    if (!user) return 'Not signed in'
    const position =
      milestones.length === 0 ? 0 : Math.max(...milestones.map((m) => m.position)) + 1
    const { error: err } = await supabase
      .from('milestones')
      .insert({ goal_id: goalId, user_id: user.id, title, position })
    if (err) return err.message
    await load()
    return null
  }

  async function toggleMilestone(id: string, completed: boolean) {
    const { error: err } = await supabase.from('milestones').update({ completed }).eq('id', id)
    if (err) setError(err.message)
    else
      setMilestones((prev) => prev.map((m) => (m.id === id ? { ...m, completed } : m)))
  }

  async function removeMilestone(id: string) {
    const { error: err } = await supabase.from('milestones').delete().eq('id', id)
    if (err) setError(err.message)
    else setMilestones((prev) => prev.filter((m) => m.id !== id))
  }

  if (loading) {
    return <p className="py-12 text-center text-ink-muted">Loading goal…</p>
  }

  if (!goal) {
    return (
      <div className="py-12 text-center">
        <p className="text-ink-muted">Goal not found.</p>
        <button type="button" onClick={onBack} className="mt-4 text-moss underline">
          Back to list
        </button>
      </div>
    )
  }

  const target = formatDate(goal.target_date)

  return (
    <article>
      <button
        type="button"
        onClick={onBack}
        className="mb-6 text-sm text-moss hover:underline"
      >
        ← All goals
      </button>

      {editing ? (
        <GoalForm
          initial={goal}
          submitLabel="Save changes"
          onSubmit={updateGoal}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <header>
          <h2 className="font-display text-3xl font-bold text-ink">{goal.title}</h2>
          {target && (
            <p className="mt-2 text-sm font-medium text-clay">Target · {target}</p>
          )}
          {goal.description && (
            <p className="mt-4 max-w-2xl leading-relaxed text-ink-muted">{goal.description}</p>
          )}
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded-lg border border-line px-3 py-1.5 text-sm text-ink hover:bg-paper-dark"
            >
              Edit goal
            </button>
            <button
              type="button"
              onClick={() => void deleteGoal()}
              className="rounded-lg border border-clay/40 px-3 py-1.5 text-sm text-clay hover:bg-clay/10"
            >
              Delete goal
            </button>
          </div>
        </header>
      )}

      {error && (
        <p className="mt-4 rounded-lg bg-clay/15 px-3 py-2 text-sm text-clay">{error}</p>
      )}

      <MilestoneList
        milestones={milestones}
        onToggle={toggleMilestone}
        onAdd={addMilestone}
        onDelete={removeMilestone}
      />
    </article>
  )
}
