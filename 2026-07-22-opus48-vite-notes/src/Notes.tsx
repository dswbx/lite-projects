import { useCallback, useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase, type Note } from './lib/supabase'

export function Notes({ user }: { user: User }) {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .order('updated_at', { ascending: false })
    if (error) {
      setError(error.message)
    } else {
      setNotes(data as Note[])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function createNote() {
    setError(null)
    const { data, error } = await supabase
      .from('notes')
      .insert({ user_id: user.id, title: '', content: '' })
      .select()
      .single()
    if (error) {
      setError(error.message)
      return
    }
    const note = data as Note
    setNotes((prev) => [note, ...prev])
    setSelectedId(note.id)
  }

  async function saveNote(id: string, title: string, content: string) {
    const updated_at = new Date().toISOString()
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, title, content, updated_at } : n)),
    )
    const { error } = await supabase
      .from('notes')
      .update({ title, content, updated_at })
      .eq('id', id)
    if (error) setError(error.message)
  }

  async function deleteNote(id: string) {
    const prev = notes
    setNotes((n) => n.filter((x) => x.id !== id))
    if (selectedId === id) setSelectedId(null)
    const { error } = await supabase.from('notes').delete().eq('id', id)
    if (error) {
      setError(error.message)
      setNotes(prev)
    }
  }

  const selected = notes.find((n) => n.id === selectedId) ?? null

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-900">Notes</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500 hidden sm:inline">{user.email}</span>
          <button
            onClick={() => supabase.auth.signOut()}
            className="text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            Sign out
          </button>
        </div>
      </header>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-4 py-2">{error}</p>
      )}

      <div className="flex-1 grid grid-cols-1 md:grid-cols-[320px_1fr] overflow-hidden">
        {/* List */}
        <aside className="border-r border-slate-200 bg-white flex flex-col">
          <div className="p-3 border-b border-slate-200">
            <button
              onClick={createNote}
              className="w-full bg-slate-900 text-white rounded-lg py-2 font-medium hover:bg-slate-800 transition-colors"
            >
              + New note
            </button>
          </div>
          <ul className="flex-1 overflow-y-auto">
            {loading ? (
              <li className="p-4 text-sm text-slate-400">Loading…</li>
            ) : notes.length === 0 ? (
              <li className="p-4 text-sm text-slate-400">No notes yet. Create one!</li>
            ) : (
              notes.map((note) => (
                <li key={note.id}>
                  <button
                    onClick={() => setSelectedId(note.id)}
                    className={`w-full text-left px-4 py-3 border-b border-slate-100 hover:bg-slate-50 ${
                      note.id === selectedId ? 'bg-slate-100' : ''
                    }`}
                  >
                    <div className="font-medium text-slate-900 truncate">
                      {note.title.trim() || 'Untitled'}
                    </div>
                    <div className="text-sm text-slate-500 truncate">
                      {note.content.trim() || 'No content'}
                    </div>
                  </button>
                </li>
              ))
            )}
          </ul>
        </aside>

        {/* Editor */}
        <main className="bg-slate-50 overflow-y-auto">
          {selected ? (
            <Editor
              key={selected.id}
              note={selected}
              onSave={saveNote}
              onDelete={deleteNote}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400">
              Select a note or create a new one
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

function Editor({
  note,
  onSave,
  onDelete,
}: {
  note: Note
  onSave: (id: string, title: string, content: string) => void
  onDelete: (id: string) => void
}) {
  const [title, setTitle] = useState(note.title)
  const [content, setContent] = useState(note.content)

  // Debounced autosave.
  useEffect(() => {
    if (title === note.title && content === note.content) return
    const t = setTimeout(() => onSave(note.id, title, content), 500)
    return () => clearTimeout(t)
  }, [title, content, note.id, note.title, note.content, onSave])

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-8">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-slate-400">
          Last edited {new Date(note.updated_at).toLocaleString()}
        </span>
        <button
          onClick={() => {
            if (confirm('Delete this note?')) onDelete(note.id)
          }}
          className="text-sm font-medium text-red-600 hover:text-red-700"
        >
          Delete
        </button>
      </div>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
        className="w-full text-2xl font-bold text-slate-900 bg-transparent focus:outline-none mb-4 placeholder:text-slate-300"
      />
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Start writing…"
        className="w-full min-h-[50vh] text-slate-700 bg-transparent focus:outline-none resize-none leading-relaxed placeholder:text-slate-300"
      />
    </div>
  )
}
