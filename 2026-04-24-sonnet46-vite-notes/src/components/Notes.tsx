import { useState, useEffect, useCallback } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../supabase";
import type { Note } from "../supabase";
import NoteEditor from "./NoteEditor";

type Props = { session: Session };

export default function Notes({ session }: Props) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Note | null>(null);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchNotes = useCallback(async () => {
    let query = supabase.from("notes").select("*").order("updated_at", { ascending: false });
    if (search.trim()) {
      query = query.ilike("title", `%${search.trim()}%`);
    }
    const { data, error } = await query;
    if (!error && data) setNotes(data as Note[]);
    setLoading(false);
  }, [search]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  async function handleDelete(id: string) {
    await supabase.from("notes").delete().eq("id", id);
    setNotes((prev) => prev.filter((n) => n.id !== id));
    if (selected?.id === id) setSelected(null);
  }

  function handleSaved(note: Note) {
    setNotes((prev) => {
      const exists = prev.find((n) => n.id === note.id);
      if (exists) return prev.map((n) => (n.id === note.id ? note : n));
      return [note, ...prev];
    });
    setSelected(note);
    setCreating(false);
  }

  const filtered = notes.filter((n) =>
    search.trim() ? n.title.toLowerCase().includes(search.toLowerCase()) : true
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">Notes</h1>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400 hidden sm:block">{session.user.email}</span>
          <button
            onClick={handleSignOut}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden h-[calc(100vh-57px)]">
        {/* Sidebar */}
        <aside className="w-72 border-r border-gray-200 bg-white flex flex-col shrink-0">
          <div className="p-3 border-b border-gray-100 space-y-2">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title..."
              className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={() => { setCreating(true); setSelected(null); }}
              className="w-full py-1.5 px-3 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              + New note
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-sm text-gray-400 text-center">Loading...</div>
            ) : filtered.length === 0 ? (
              <div className="p-4 text-sm text-gray-400 text-center">
                {search ? "No notes match your search" : "No notes yet"}
              </div>
            ) : (
              filtered.map((note) => (
                <NoteListItem
                  key={note.id}
                  note={note}
                  active={selected?.id === note.id}
                  onClick={() => { setSelected(note); setCreating(false); }}
                  onDelete={() => handleDelete(note.id)}
                />
              ))
            )}
          </div>
        </aside>

        {/* Editor pane */}
        <main className="flex-1 overflow-auto">
          {creating ? (
            <NoteEditor
              key="new"
              note={null}
              userId={session.user.id}
              onSaved={handleSaved}
              onCancel={() => setCreating(false)}
            />
          ) : selected ? (
            <NoteEditor
              key={selected.id}
              note={selected}
              userId={session.user.id}
              onSaved={handleSaved}
              onCancel={() => setSelected(null)}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">
              Select a note or create a new one
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function NoteListItem({
  note,
  active,
  onClick,
  onDelete,
}: {
  note: Note;
  active: boolean;
  onClick: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`group flex items-start justify-between px-3 py-3 cursor-pointer border-b border-gray-100 hover:bg-gray-50 transition-colors ${
        active ? "bg-blue-50 border-blue-100" : ""
      }`}
    >
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-medium truncate ${active ? "text-blue-700" : "text-gray-800"}`}>
          {note.title || "Untitled"}
        </p>
        <p className="text-xs text-gray-400 mt-0.5 truncate">
          {note.content ? note.content.slice(0, 60) : "No content"}
        </p>
        <p className="text-xs text-gray-300 mt-0.5">
          {new Date(note.updated_at).toLocaleDateString()}
        </p>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="opacity-0 group-hover:opacity-100 ml-2 mt-0.5 text-gray-300 hover:text-red-500 transition-all shrink-0"
        title="Delete note"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  );
}
