import { useState } from "react";
import {
  supabase,
  type Book,
  type BookStatus,
  STATUS_LABELS,
} from "../supabase";
import { StarRating } from "./StarRating";

const STATUS_STYLES: Record<BookStatus, string> = {
  want_to_read: "bg-want/15 text-want border-want/30",
  reading: "bg-reading/15 text-reading border-reading/30",
  finished: "bg-finished/15 text-finished border-finished/30",
};

type BookCardProps = {
  book: Book;
  onUpdated: () => void;
};

export function BookCard({ book, onUpdated }: BookCardProps) {
  const [editingReview, setEditingReview] = useState(false);
  const [rating, setRating] = useState(book.rating ?? 0);
  const [review, setReview] = useState(book.review ?? "");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function setStatus(status: BookStatus) {
    setErr(null);
    setBusy(true);
    const patch: Partial<Book> = { status };
    if (status !== "finished") {
      patch.rating = null;
      patch.review = null;
    }
    const { error } = await supabase
      .from("books")
      .update(patch)
      .eq("id", book.id);
    setBusy(false);
    if (error) setErr(error.message);
    else onUpdated();
  }

  async function saveReview() {
    if (book.status !== "finished") return;
    setErr(null);
    setBusy(true);
    const { error } = await supabase
      .from("books")
      .update({
        rating: rating || null,
        review: review.trim() || null,
      })
      .eq("id", book.id);
    setBusy(false);
    if (error) setErr(error.message);
    else {
      setEditingReview(false);
      onUpdated();
    }
  }

  async function remove() {
    if (!confirm(`Remove "${book.title}" from your list?`)) return;
    const { error } = await supabase.from("books").delete().eq("id", book.id);
    if (error) setErr(error.message);
    else onUpdated();
  }

  return (
    <article className="group rounded-xl border border-paper-dark/90 bg-white/80 p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-2xl font-semibold leading-tight text-ink">
            {book.title}
          </h3>
          <p className="mt-0.5 text-sm text-ink-muted">by {book.author}</p>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[book.status]}`}
        >
          {STATUS_LABELS[book.status]}
        </span>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {(["want_to_read", "reading", "finished"] as BookStatus[]).map((s) => (
          <button
            key={s}
            type="button"
            disabled={busy || book.status === s}
            onClick={() => setStatus(s)}
            className={`rounded-md border px-2.5 py-1 text-xs transition-colors disabled:opacity-40 ${
              book.status === s
                ? "border-shelf bg-shelf text-paper"
                : "border-paper-dark text-ink-muted hover:border-accent hover:text-accent"
            }`}
          >
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {book.status === "finished" ? (
        <div className="rounded-lg border border-paper-dark/60 bg-paper/40 p-3">
          {editingReview ? (
            <div className="flex flex-col gap-3">
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-muted">
                  Your rating
                </p>
                <StarRating
                  value={rating || null}
                  onChange={(n) => setRating(n)}
                />
              </div>
              <textarea
                placeholder="A few words about this book…"
                value={review}
                onChange={(e) => setReview(e.target.value)}
                rows={3}
                maxLength={500}
                className="w-full resize-y rounded-md border border-paper-dark bg-white px-3 py-2 text-sm outline-none focus:border-accent"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={saveReview}
                  disabled={busy}
                  className="rounded-md bg-accent px-3 py-1.5 text-sm text-paper hover:bg-accent-hover disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingReview(false);
                    setRating(book.rating ?? 0);
                    setReview(book.review ?? "");
                  }}
                  className="rounded-md px-3 py-1.5 text-sm text-ink-muted hover:text-ink"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div>
              {book.rating ? (
                <StarRating value={book.rating} onChange={() => {}} readonly />
              ) : (
                <p className="text-sm text-ink-muted">No rating yet</p>
              )}
              {book.review ? (
                <p className="mt-2 text-sm leading-relaxed text-ink">{book.review}</p>
              ) : null}
              <button
                type="button"
                onClick={() => setEditingReview(true)}
                className="mt-2 text-xs font-medium text-accent hover:text-accent-hover"
              >
                {book.rating || book.review ? "Edit review" : "Add rating & review"}
              </button>
            </div>
          )}
        </div>
      ) : null}

      {err ? <p className="mt-2 text-sm text-red-700">{err}</p> : null}

      <button
        type="button"
        onClick={remove}
        className="mt-3 text-xs text-ink-muted opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-700"
      >
        Remove from list
      </button>
    </article>
  );
}
