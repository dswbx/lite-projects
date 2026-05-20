import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, type Book, type BookStatus, STATUS_LABELS } from "../supabase";
import { BookCard } from "./BookCard";

type Filter = "all" | BookStatus;

export function BookList({ session }: { session: Session }) {
  const [books, setBooks] = useState<Book[]>([]);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("books")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) setErr(error.message);
    else setBooks(data ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    if (filter === "all") return books;
    return books.filter((b) => b.status === filter);
  }, [books, filter]);

  const counts = useMemo(() => {
    const c = { all: books.length, want_to_read: 0, reading: 0, finished: 0 };
    for (const b of books) c[b.status]++;
    return c;
  }, [books]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !author.trim()) return;
    setErr(null);
    const { error } = await supabase.from("books").insert({
      title: title.trim(),
      author: author.trim(),
      user_id: session.user.id,
      status: "want_to_read",
    });
    if (error) setErr(error.message);
    else {
      setTitle("");
      setAuthor("");
      load();
    }
  }

  const filters: { key: Filter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "want_to_read", label: STATUS_LABELS.want_to_read },
    { key: "reading", label: STATUS_LABELS.reading },
    { key: "finished", label: STATUS_LABELS.finished },
  ];

  return (
    <div>
      <form
        onSubmit={add}
        className="mb-8 rounded-xl border border-paper-dark/80 bg-white/70 p-5 shadow-sm"
      >
        <h2 className="mb-3 font-display text-xl text-ink">Add a book</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="rounded-md border border-paper-dark bg-paper/50 px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <input
            placeholder="Author"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            required
            className="rounded-md border border-paper-dark bg-paper/50 px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </div>
        <button
          type="submit"
          className="mt-3 rounded-md bg-shelf px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-accent"
        >
          Add to shelf
        </button>
      </form>

      <div className="mb-4 flex flex-wrap gap-2">
        {filters.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              filter === key
                ? "border-shelf bg-shelf text-paper"
                : "border-paper-dark text-ink-muted hover:border-accent"
            }`}
          >
            {label}
            <span className="ml-1 opacity-70">({counts[key]})</span>
          </button>
        ))}
      </div>

      {err ? <p className="mb-3 text-sm text-red-700">{err}</p> : null}

      <ul className="flex flex-col gap-4">
        {filtered.length === 0 ? (
          <li className="rounded-xl border border-dashed border-paper-dark p-8 text-center">
            <p className="font-display text-xl text-ink-muted">
              {books.length === 0
                ? "Your shelf is empty"
                : "Nothing in this section"}
            </p>
            <p className="mt-1 text-sm text-ink-muted">
              {books.length === 0
                ? "Add a title and author above to get started."
                : "Try another filter or add a new book."}
            </p>
          </li>
        ) : null}
        {filtered.map((book) => (
          <li key={book.id}>
            <BookCard book={book} onUpdated={load} />
          </li>
        ))}
      </ul>
    </div>
  );
}
