import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Movie, MovieUpdate } from '../types/database'
import { MovieCard } from './MovieCard'

type StatusFilter = 'all' | 'to_watch' | 'watched'
type SortMode = 'added' | 'rating_desc' | 'rating_asc'

type Props = {
  session: Session
}

export function WatchlistApp({ session }: Props) {
  const [movies, setMovies] = useState<Movie[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sortMode, setSortMode] = useState<SortMode>('added')

  const loadMovies = useCallback(async () => {
    setLoading(true)
    setError(null)

    let query = supabase.from('movies').select('*')

    if (statusFilter === 'to_watch') {
      query = query.eq('watched', false)
    } else if (statusFilter === 'watched') {
      query = query.eq('watched', true)
    }

    if (sortMode === 'rating_desc') {
      query = query.order('rating', { ascending: false, nullsFirst: false })
    } else if (sortMode === 'rating_asc') {
      query = query.order('rating', { ascending: true, nullsFirst: true })
    } else {
      query = query.order('created_at', { ascending: false })
    }

    const { data, error: fetchError } = await query

    if (fetchError) {
      setError(fetchError.message)
      setMovies([])
    } else {
      setMovies(data ?? [])
    }
    setLoading(false)
  }, [statusFilter, sortMode])

  useEffect(() => {
    void loadMovies()
  }, [loadMovies])

  const counts = useMemo(() => {
    const toWatch = movies.filter((m) => !m.watched).length
    const watched = movies.filter((m) => m.watched).length
    return { toWatch, watched, total: movies.length }
  }, [movies])

  async function handleAdd(e: FormEvent) {
    e.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) return

    const { error: insertError } = await supabase.from('movies').insert({
      user_id: session.user.id,
      title: trimmed,
      notes: notes.trim() || null,
    })

    if (insertError) {
      setError(insertError.message)
      return
    }

    setTitle('')
    setNotes('')
    await loadMovies()
  }

  async function handleUpdate(id: string, patch: MovieUpdate) {
    const { error: updateError } = await supabase.from('movies').update(patch).eq('id', id)

    if (updateError) {
      setError(updateError.message)
      return
    }

    await loadMovies()
  }

  async function handleDelete(id: string) {
    const { error: deleteError } = await supabase.from('movies').delete().eq('id', id)

    if (deleteError) {
      setError(deleteError.message)
      return
    }

    await loadMovies()
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <header className="mb-10 flex flex-wrap items-end justify-between gap-4 border-b border-panel-edge pb-6">
        <div className="text-left">
          <p className="font-display text-xs uppercase tracking-[0.35em] text-amber">
            Your reel
          </p>
          <h1 className="font-display text-3xl font-medium text-cream">Watchlist</h1>
          <p className="mt-1 text-sm text-muted">{session.user.email}</p>
        </div>
        <button
          type="button"
          onClick={() => void signOut()}
          className="text-sm text-muted underline-offset-2 hover:text-cream hover:underline"
        >
          Sign out
        </button>
      </header>

      <form
        onSubmit={(e) => void handleAdd(e)}
        className="mb-8 rounded-xl border border-panel-edge bg-panel/60 p-5 text-left"
      >
        <h2 className="font-display text-lg text-cream">Add a film</h2>
        <label className="mt-4 block text-sm text-muted">
          Title
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="e.g. The Grand Budapest Hotel"
            className="mt-1 w-full rounded-lg border border-panel-edge bg-ink px-3 py-2.5 text-cream outline-none ring-amber/40 focus:ring-2"
          />
        </label>
        <label className="mt-3 block text-sm text-muted">
          Notes (optional)
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Why you want to see it, where to stream…"
            className="mt-1 w-full resize-y rounded-lg border border-panel-edge bg-ink px-3 py-2 text-cream outline-none ring-amber/40 focus:ring-2"
          />
        </label>
        <button
          type="submit"
          className="mt-4 rounded-lg bg-amber px-5 py-2.5 text-sm font-medium text-ink hover:bg-amber-dim"
        >
          Add to list
        </button>
      </form>

      <div className="mb-6 flex flex-wrap items-center gap-3 text-left">
        <fieldset className="flex flex-wrap gap-2">
          <legend className="sr-only">Filter by status</legend>
          {(
            [
              ['all', 'All'],
              ['to_watch', 'To watch'],
              ['watched', 'Watched'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setStatusFilter(value)}
              className={`rounded-full px-3 py-1.5 text-xs uppercase tracking-wide transition ${
                statusFilter === value
                  ? 'bg-amber text-ink'
                  : 'border border-panel-edge text-muted hover:text-cream'
              }`}
            >
              {label}
            </button>
          ))}
        </fieldset>

        <label className="ml-auto flex items-center gap-2 text-sm text-muted">
          Sort
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
            className="rounded-lg border border-panel-edge bg-ink px-2 py-1.5 text-cream"
          >
            <option value="added">Recently added</option>
            <option value="rating_desc">Rating (high first)</option>
            <option value="rating_asc">Rating (low first)</option>
          </select>
        </label>
      </div>

      {error && (
        <p className="mb-4 rounded-lg border border-crimson/40 bg-crimson/10 px-4 py-2 text-sm text-crimson">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-muted">Loading your films…</p>
      ) : movies.length === 0 ? (
        <p className="rounded-xl border border-dashed border-panel-edge py-12 text-muted">
          {statusFilter === 'all'
            ? 'No films yet. Add one above.'
            : statusFilter === 'to_watch'
              ? 'Nothing left to watch in this view.'
              : 'No watched films yet.'}
        </p>
      ) : (
        <ul className="space-y-4">
          {movies.map((movie) => (
            <li key={movie.id}>
              <MovieCard
                movie={movie}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
              />
            </li>
          ))}
        </ul>
      )}

      {statusFilter === 'all' && !loading && movies.length > 0 && (
        <p className="mt-8 text-center text-xs text-muted">
          {counts.toWatch} to watch · {counts.watched} watched
        </p>
      )}
    </div>
  )
}
