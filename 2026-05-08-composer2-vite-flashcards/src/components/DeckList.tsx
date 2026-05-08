import { useState } from 'react'
import type { Deck } from '../supabase'
import { supabase } from '../supabase'

type Props = {
  decks: Deck[]
  onCreated: () => Promise<void>
  onOpenDeck: (deck: Deck) => void
  onDeleted: () => Promise<void>
}

export function DeckList({
  decks,
  onCreated,
  onOpenDeck,
  onDeleted,
}: Props) {
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)

  const createDeck = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed || busy) return
    setBusy(true)
    const { error } = await supabase.from('decks').insert({ name: trimmed })
    setBusy(false)
    if (error) {
      alert(error.message)
      return
    }
    setName('')
    await onCreated()
  }

  const deleteDeck = async (deck: Deck) => {
    if (!confirm(`Delete deck “${deck.name}” and all its cards?`)) return
    const { error } = await supabase.from('decks').delete().eq('id', deck.id)
    if (error) {
      alert(error.message)
      return
    }
    await onDeleted()
  }

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 text-base font-medium text-slate-300">New deck</h2>
        <form onSubmit={createDeck} className="flex flex-wrap gap-2">
          <input
            className="min-w-[200px] flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 placeholder:text-slate-600 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            placeholder="Deck name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
          />
          <button
            type="submit"
            disabled={busy || !name.trim()}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-40"
          >
            Create
          </button>
        </form>
      </section>

      <section>
        <h2 className="mb-3 text-base font-medium text-slate-300">Your decks</h2>
        {decks.length === 0 ? (
          <p className="text-slate-500">No decks yet. Create one above.</p>
        ) : (
          <ul className="divide-y divide-slate-800 rounded-xl border border-slate-800 bg-slate-900/40">
            {decks.map((d) => (
              <li
                key={d.id}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
              >
                <button
                  type="button"
                  onClick={() => onOpenDeck(d)}
                  className="text-left font-medium text-emerald-400 hover:text-emerald-300"
                >
                  {d.name}
                </button>
                <button
                  type="button"
                  onClick={() => deleteDeck(d)}
                  className="text-xs text-slate-500 hover:text-rose-400"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
