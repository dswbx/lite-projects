import { useState, type FormEvent } from 'react'
import type { Goal } from '../lib/database.types'

type GoalFormProps = {
  initial?: Pick<Goal, 'title' | 'description' | 'target_date'>
  submitLabel: string
  onSubmit: (values: {
    title: string
    description: string
    target_date: string | null
  }) => Promise<string | null>
  onCancel?: () => void
}

export function GoalForm({ initial, submitLabel, onSubmit, onCancel }: GoalFormProps) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [targetDate, setTargetDate] = useState(initial?.target_date ?? '')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    const message = await onSubmit({
      title: title.trim(),
      description: description.trim(),
      target_date: targetDate || null,
    })
    if (message) setError(message)
    else if (!initial) {
      setTitle('')
      setDescription('')
      setTargetDate('')
    }
    setBusy(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-line bg-white/50 p-4">
      <label className="block">
        <span className="text-sm font-medium text-ink-muted">Title</span>
        <input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Run a half marathon"
          className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 outline-none focus:ring-2 focus:ring-moss/30"
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-ink-muted">Description</span>
        <textarea
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Why this matters and what success looks like…"
          className="mt-1 w-full resize-y rounded-lg border border-line bg-paper px-3 py-2 outline-none focus:ring-2 focus:ring-moss/30"
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-ink-muted">Target date</span>
        <input
          type="date"
          value={targetDate}
          onChange={(e) => setTargetDate(e.target.value)}
          className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 outline-none focus:ring-2 focus:ring-moss/30"
        />
      </label>
      {error && <p className="text-sm text-clay">{error}</p>}
      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-moss px-4 py-2 text-sm font-medium text-paper hover:bg-moss-light disabled:opacity-60"
        >
          {busy ? 'Saving…' : submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-sm text-ink-muted hover:text-ink"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}
