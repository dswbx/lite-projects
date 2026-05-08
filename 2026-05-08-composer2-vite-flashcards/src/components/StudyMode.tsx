import { useMemo, useState } from 'react'
import type { Card, Deck } from '../supabase'
import { supabase } from '../supabase'

function shuffle<T>(items: T[]): T[] {
  const a = [...items]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

type Props = {
  deck: Deck
  initialCards: Card[]
  onExit: () => void
}

export function StudyMode({ deck, initialCards, onExit }: Props) {
  const queue = useMemo(() => shuffle(initialCards), [initialCards])
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [sessionRight, setSessionRight] = useState(0)
  const [sessionWrong, setSessionWrong] = useState(0)
  const [busy, setBusy] = useState(false)

  const current = queue[index]
  const done = index >= queue.length
  const progressLabel = `${Math.min(index + (done ? 0 : 1), queue.length)} / ${queue.length}`

  const record = async (correct: boolean) => {
    if (!current || busy) return
    setBusy(true)
    const patch = correct
      ? { correct_count: current.correct_count + 1 }
      : { wrong_count: current.wrong_count + 1 }
    const { error } = await supabase
      .from('cards')
      .update(patch)
      .eq('id', current.id)
    setBusy(false)
    if (error) {
      alert(error.message)
      return
    }
    if (correct) setSessionRight((n) => n + 1)
    else setSessionWrong((n) => n + 1)
    setRevealed(false)
    setIndex((i) => i + 1)
  }

  if (done) {
    return (
      <div className="space-y-6 text-center">
        <p className="text-sm text-slate-500">{deck.name}</p>
        <h2 className="text-2xl font-semibold text-white">Session complete</h2>
        <p className="text-slate-400">
          This round:{' '}
          <span className="text-emerald-400">{sessionRight} correct</span>,{' '}
          <span className="text-rose-400">{sessionWrong} wrong</span>
        </p>
        <button
          type="button"
          onClick={onExit}
          className="rounded-lg bg-emerald-600 px-6 py-2.5 font-medium text-white hover:bg-emerald-500"
        >
          Back to deck
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>{deck.name}</span>
        <span>{progressLabel}</span>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl">
        <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">
          Question
        </p>
        <p className="whitespace-pre-wrap text-lg text-white">{current.question}</p>

        {!revealed ? (
          <button
            type="button"
            onClick={() => setRevealed(true)}
            className="mt-6 w-full rounded-lg bg-slate-800 py-3 font-medium text-slate-100 hover:bg-slate-700"
          >
            Show answer
          </button>
        ) : (
          <>
            <div className="mt-6 border-t border-slate-800 pt-6">
              <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">
                Answer
              </p>
              <p className="whitespace-pre-wrap text-lg text-emerald-300/95">
                {current.answer}
              </p>
            </div>
            <div className="mt-8 grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={busy}
                onClick={() => void record(false)}
                className="rounded-lg bg-rose-950/80 py-3 font-semibold text-rose-200 ring-1 ring-rose-800 hover:bg-rose-900/80 disabled:opacity-50"
              >
                Wrong
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void record(true)}
                className="rounded-lg bg-emerald-950/80 py-3 font-semibold text-emerald-200 ring-1 ring-emerald-800 hover:bg-emerald-900/80 disabled:opacity-50"
              >
                Right
              </button>
            </div>
          </>
        )}
      </div>

      <p className="text-center text-sm text-slate-500">
        Lifetime on this card: {current.correct_count} correct ·{' '}
        {current.wrong_count} wrong
      </p>
    </div>
  )
}
