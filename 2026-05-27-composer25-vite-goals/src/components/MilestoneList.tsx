import { useState } from 'react'
import type { Milestone } from '../lib/database.types'

type MilestoneListProps = {
  milestones: Milestone[]
  onToggle: (id: string, completed: boolean) => Promise<void>
  onAdd: (title: string) => Promise<string | null>
  onDelete: (id: string) => Promise<void>
}

export function MilestoneList({
  milestones,
  onToggle,
  onAdd,
  onDelete,
}: MilestoneListProps) {
  const [newTitle, setNewTitle] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const done = milestones.filter((m) => m.completed).length
  const total = milestones.length
  const pct = total === 0 ? 0 : Math.round((done / total) * 100)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const title = newTitle.trim()
    if (!title) return
    setError(null)
    setBusy(true)
    const message = await onAdd(title)
    if (message) setError(message)
    else setNewTitle('')
    setBusy(false)
  }

  return (
    <section className="mt-6">
      <div className="mb-3 flex items-end justify-between gap-4">
        <h3 className="font-display text-lg font-semibold text-ink">Milestones</h3>
        {total > 0 && (
          <span className="text-sm text-ink-muted">
            {done}/{total} · {pct}%
          </span>
        )}
      </div>

      {total > 0 && (
        <div className="mb-4 h-2 overflow-hidden rounded-full bg-paper-dark">
          <div
            className="h-full rounded-full bg-moss transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      <ul className="space-y-2">
        {milestones.map((m) => (
          <li
            key={m.id}
            className="group flex items-start gap-3 rounded-lg border border-line/80 bg-white/40 px-3 py-2.5"
          >
            <input
              type="checkbox"
              checked={m.completed}
              onChange={() => onToggle(m.id, !m.completed)}
              className="mt-1 size-4 rounded border-line text-moss focus:ring-moss/40"
              aria-label={`Mark "${m.title}" complete`}
            />
            <span
              className={`flex-1 text-sm ${m.completed ? 'text-ink-muted line-through' : 'text-ink'}`}
            >
              {m.title}
            </span>
            <button
              type="button"
              onClick={() => onDelete(m.id)}
              className="text-xs text-ink-muted opacity-0 transition group-hover:opacity-100 hover:text-clay"
              aria-label={`Remove milestone ${m.title}`}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>

      <form onSubmit={handleAdd} className="mt-3 flex gap-2">
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Add a milestone…"
          className="min-w-0 flex-1 rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-moss/30"
        />
        <button
          type="submit"
          disabled={busy}
          className="shrink-0 rounded-lg bg-moss/90 px-3 py-2 text-sm font-medium text-paper hover:bg-moss disabled:opacity-60"
        >
          Add
        </button>
      </form>
      {error && <p className="mt-2 text-sm text-clay">{error}</p>}
    </section>
  )
}
