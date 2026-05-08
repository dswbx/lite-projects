import { useCallback, useEffect, useState } from 'react'
import type { Card, Deck } from './supabase'
import { supabase } from './supabase'
import { DeckList } from './components/DeckList'
import { DeckView } from './components/DeckView'
import { StudyMode } from './components/StudyMode'

type Route =
  | { screen: 'decks' }
  | { screen: 'deck'; deck: Deck }
  | { screen: 'study'; deck: Deck; cards: Card[] }

export default function App() {
  const [route, setRoute] = useState<Route>({ screen: 'decks' })
  const [decks, setDecks] = useState<Deck[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refreshDecks = useCallback(async () => {
    const { data, error: qErr } = await supabase
      .from('decks')
      .select('*')
      .order('created_at', { ascending: false })
    if (qErr) {
      setError(qErr.message)
      return
    }
    setDecks((data ?? []) as Deck[])
    setError(null)
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      await refreshDecks()
      if (!cancelled) setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [refreshDecks])

  const openDeck = async (deck: Deck) => {
    setRoute({ screen: 'deck', deck })
  }

  const startStudy = async (deck: Deck) => {
    const { data, error: qErr } = await supabase
      .from('cards')
      .select('*')
      .eq('deck_id', deck.id)
    if (qErr) {
      setError(qErr.message)
      return
    }
    const cards = (data ?? []) as Card[]
    if (cards.length === 0) {
      setError('Add at least one card before studying.')
      return
    }
    setError(null)
    setRoute({ screen: 'study', deck, cards })
  }

  return (
    <div className="min-h-svh bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div className="flex items-center gap-3">
            {route.screen !== 'decks' && (
              <button
                type="button"
                onClick={() =>
                  setRoute(
                    route.screen === 'study'
                      ? { screen: 'deck', deck: route.deck }
                      : { screen: 'decks' },
                  )
                }
                className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800"
              >
                ← Back
              </button>
            )}
            <h1 className="text-lg font-semibold tracking-tight text-white">
              Flashcards
            </h1>
          </div>
          <p className="text-xs text-slate-500">
            Data stays in your browser session via Supabase Lite (local SQLite).
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        {error && (
          <div
            className="mb-6 rounded-lg border border-rose-900/80 bg-rose-950/50 px-4 py-3 text-sm text-rose-200"
            role="alert"
          >
            {error}
            <button
              type="button"
              className="ml-3 underline"
              onClick={() => setError(null)}
            >
              Dismiss
            </button>
          </div>
        )}

        {loading ? (
          <p className="text-slate-400">Loading…</p>
        ) : route.screen === 'decks' ? (
          <DeckList
            decks={decks}
            onCreated={async () => {
              await refreshDecks()
            }}
            onOpenDeck={openDeck}
            onDeleted={async () => {
              await refreshDecks()
            }}
          />
        ) : route.screen === 'deck' ? (
          <DeckView
            key={`${route.deck.id}-${route.deck.name}`}
            deck={route.deck}
            onStartStudy={() => startStudy(route.deck)}
            onDeckRenamed={async (updated) => {
              await refreshDecks()
              setRoute({ screen: 'deck', deck: updated })
            }}
          />
        ) : (
          <StudyMode
            deck={route.deck}
            initialCards={route.cards}
            onExit={() => setRoute({ screen: 'deck', deck: route.deck })}
          />
        )}
      </main>
    </div>
  )
}
