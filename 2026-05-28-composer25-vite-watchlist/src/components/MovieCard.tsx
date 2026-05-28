import { useState } from 'react'
import type { Movie, MovieUpdate } from '../types/database'
import { StarRating } from './StarRating'

type Props = {
  movie: Movie
  onUpdate: (id: string, patch: MovieUpdate) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export function MovieCard({ movie, onUpdate, onDelete }: Props) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(movie.title)
  const [notes, setNotes] = useState(movie.notes ?? '')
  const [rating, setRating] = useState<number | null>(movie.rating)
  const [review, setReview] = useState(movie.review ?? '')
  const [busy, setBusy] = useState(false)

  async function saveDetails() {
    setBusy(true)
    await onUpdate(movie.id, {
      title: title.trim(),
      notes: notes.trim() || null,
    })
    setBusy(false)
    setEditing(false)
  }

  async function toggleWatched() {
    if (movie.watched) {
      setBusy(true)
      await onUpdate(movie.id, {
        watched: false,
        rating: null,
        review: null,
      })
      setRating(null)
      setReview('')
      setBusy(false)
      return
    }

    setEditing(true)
  }

  async function saveWatched() {
    if (!rating) return
    setBusy(true)
    await onUpdate(movie.id, {
      watched: true,
      rating,
      review: review.trim() || null,
    })
    setBusy(false)
    setEditing(false)
  }

  return (
    <article className="rounded-xl border border-panel-edge bg-panel/80 p-5 transition hover:border-amber/30">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 text-left">
          {editing && !movie.watched ? (
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded border border-panel-edge bg-ink px-2 py-1 font-display text-xl text-cream"
            />
          ) : (
            <h3 className="font-display text-xl text-cream">{movie.title}</h3>
          )}
          <p className="mt-1 text-xs uppercase tracking-widest text-muted">
            {movie.watched ? 'Watched' : 'On your list'}
          </p>
        </div>

        <div className="flex shrink-0 gap-2">
          {!movie.watched && (
            <button
              type="button"
              disabled={busy}
              onClick={() => setEditing((v) => !v)}
              className="rounded-lg border border-panel-edge px-3 py-1.5 text-xs text-muted hover:border-amber/50 hover:text-cream"
            >
              Edit
            </button>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={() => onDelete(movie.id)}
            className="rounded-lg border border-crimson/40 px-3 py-1.5 text-xs text-crimson hover:bg-crimson/10"
          >
            Remove
          </button>
        </div>
      </div>

      {movie.notes && !editing && (
        <p className="mt-3 text-left text-sm leading-relaxed text-muted">{movie.notes}</p>
      )}

      {editing && !movie.watched && (
        <div className="mt-4 space-y-3 text-left">
          <label className="block text-sm text-muted">
            Notes (optional)
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="mt-1 w-full resize-y rounded-lg border border-panel-edge bg-ink px-3 py-2 text-sm text-cream"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy || !title.trim()}
              onClick={saveDetails}
              className="rounded-lg bg-amber px-4 py-2 text-sm font-medium text-ink"
            >
              Save
            </button>
            <button
              type="button"
              onClick={toggleWatched}
              className="rounded-lg border border-amber/50 px-4 py-2 text-sm text-amber"
            >
              Mark watched
            </button>
          </div>
        </div>
      )}

      {movie.watched && (
        <div className="mt-4 text-left">
          <StarRating value={movie.rating} onChange={() => {}} disabled />
          {movie.review && (
            <p className="mt-2 text-sm italic leading-relaxed text-cream/90">
              &ldquo;{movie.review}&rdquo;
            </p>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={toggleWatched}
            className="mt-3 text-xs text-muted underline-offset-2 hover:text-cream hover:underline"
          >
            Move back to watchlist
          </button>
        </div>
      )}

      {editing && !movie.watched && (
        <div className="mt-4 border-t border-panel-edge pt-4 text-left">
          <p className="text-sm text-amber">Rate this film to mark it watched</p>
          <StarRating value={rating} onChange={setRating} />
          <label className="mt-3 block text-sm text-muted">
            Review (optional)
            <textarea
              value={review}
              onChange={(e) => setReview(e.target.value)}
              rows={3}
              placeholder="What stayed with you?"
              className="mt-1 w-full resize-y rounded-lg border border-panel-edge bg-ink px-3 py-2 text-sm text-cream"
            />
          </label>
          <button
            type="button"
            disabled={busy || !rating}
            onClick={saveWatched}
            className="mt-3 rounded-lg bg-amber px-4 py-2 text-sm font-medium text-ink disabled:opacity-50"
          >
            Save as watched
          </button>
        </div>
      )}

      {!movie.watched && !editing && (
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setEditing(true)
          }}
          className="mt-4 text-sm text-amber underline-offset-2 hover:underline"
        >
          Mark as watched & rate
        </button>
      )}
    </article>
  )
}
