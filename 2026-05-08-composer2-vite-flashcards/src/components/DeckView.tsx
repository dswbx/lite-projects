import { useCallback, useEffect, useState } from 'react'
import type { Card, Deck } from '../supabase'
import { supabase } from '../supabase'

type Props = {
  deck: Deck
  onStartStudy: () => void | Promise<void>
  onDeckRenamed: (deck: Deck) => Promise<void>
}

export function DeckView({ deck, onStartStudy, onDeckRenamed }: Props) {
  const [cards, setCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(true)
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [deckName, setDeckName] = useState(deck.name)
  const [savingName, setSavingName] = useState(false)

  const loadCards = useCallback(async () => {
    const { data, error } = await supabase
      .from('cards')
      .select('*')
      .eq('deck_id', deck.id)
      .order('created_at', { ascending: true })
    if (error) {
      alert(error.message)
      return
    }
    setCards((data ?? []) as Card[])
  }, [deck.id])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      await loadCards()
      if (!cancelled) setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [loadCards])

  const addCard = async (e: React.FormEvent) => {
    e.preventDefault()
    const q = question.trim()
    const a = answer.trim()
    if (!q || !a) return
    const { error } = await supabase.from('cards').insert({
      deck_id: deck.id,
      question: q,
      answer: a,
    })
    if (error) {
      alert(error.message)
      return
    }
    setQuestion('')
    setAnswer('')
    await loadCards()
  }

  const deleteCard = async (card: Card) => {
    if (!confirm('Remove this card?')) return
    const { error } = await supabase.from('cards').delete().eq('id', card.id)
    if (error) {
      alert(error.message)
      return
    }
    await loadCards()
  }

  const renameDeck = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = deckName.trim()
    if (!trimmed || trimmed === deck.name) return
    setSavingName(true)
    const { error } = await supabase
      .from('decks')
      .update({ name: trimmed })
      .eq('id', deck.id)
    setSavingName(false)
    if (error) {
      alert(error.message)
      return
    }
    await onDeckRenamed({ ...deck, name: trimmed })
  }

  const totalCorrect = cards.reduce((s, c) => s + c.correct_count, 0)
  const totalWrong = cards.reduce((s, c) => s + c.wrong_count, 0)

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <form onSubmit={renameDeck} className="min-w-0 flex-1 space-y-2">
          <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
            Deck name
          </label>
          <div className="flex flex-wrap gap-2">
            <input
              className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              value={deckName}
              onChange={(e) => setDeckName(e.target.value)}
              maxLength={120}
            />
            <button
              type="submit"
              disabled={savingName || deckName.trim() === deck.name}
              className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-40"
            >
              Save name
            </button>
          </div>
        </form>
        <button
          type="button"
          onClick={() => void onStartStudy()}
          disabled={cards.length === 0}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Study deck
        </button>
      </div>

      <div className="flex flex-wrap gap-4 text-sm">
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 px-4 py-2">
          <span className="text-slate-500">Cards </span>
          <span className="font-medium text-white">{cards.length}</span>
        </div>
        <div className="rounded-lg border border-emerald-900/50 bg-emerald-950/30 px-4 py-2">
          <span className="text-emerald-600/80">Correct (total) </span>
          <span className="font-medium text-emerald-400">{totalCorrect}</span>
        </div>
        <div className="rounded-lg border border-rose-900/50 bg-rose-950/30 px-4 py-2">
          <span className="text-rose-600/80">Wrong (total) </span>
          <span className="font-medium text-rose-400">{totalWrong}</span>
        </div>
      </div>

      <section>
        <h2 className="mb-3 text-base font-medium text-slate-300">Add card</h2>
        <form onSubmit={addCard} className="space-y-3">
          <textarea
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 placeholder:text-slate-600 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            placeholder="Question"
            rows={2}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
          <textarea
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 placeholder:text-slate-600 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            placeholder="Answer"
            rows={2}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
          />
          <button
            type="submit"
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Add card
          </button>
        </form>
      </section>

      <section>
        <h2 className="mb-3 text-base font-medium text-slate-300">Cards</h2>
        {loading ? (
          <p className="text-slate-500">Loading cards…</p>
        ) : cards.length === 0 ? (
          <p className="text-slate-500">No cards in this deck yet.</p>
        ) : (
          <ul className="space-y-3">
            {cards.map((c) => (
              <li
                key={c.id}
                className="rounded-xl border border-slate-800 bg-slate-900/40 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1 space-y-2">
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      Question
                    </p>
                    <p className="whitespace-pre-wrap text-slate-200">
                      {c.question}
                    </p>
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      Answer
                    </p>
                    <p className="whitespace-pre-wrap text-slate-400">
                      {c.answer}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteCard(c)}
                    className="shrink-0 text-xs text-slate-500 hover:text-rose-400"
                  >
                    Remove
                  </button>
                </div>
                <div className="mt-3 flex gap-4 border-t border-slate-800 pt-3 text-sm">
                  <span className="text-emerald-500">
                    ✓ {c.correct_count} correct
                  </span>
                  <span className="text-rose-500">
                    ✗ {c.wrong_count} wrong
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
