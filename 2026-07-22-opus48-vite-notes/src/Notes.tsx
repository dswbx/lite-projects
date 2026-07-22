import { useCallback, useEffect, useMemo, useState } from 'react'
import { useMatch, useNavigate, useSearchParams } from 'react-router-dom'
import type { User } from '@supabase/supabase-js'
import { supabase, type Note } from './lib/supabase'

export function Notes({ user }: { user: User }) {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const navigate = useNavigate()
  const selectedId = useMatch('/note/:id')?.params.id
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTag = searchParams.get('tag')

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

  // Navigate helpers preserve the active tag filter in the URL.
  const search = searchParams.toString()
  const openNote = (noteId: string) =>
    navigate({ pathname: `/note/${noteId}`, search })
  const openList = () => navigate({ pathname: '/', search })

  function setTagFilter(tag: string | null) {
    const next = new URLSearchParams(searchParams)
    if (tag) next.set('tag', tag)
    else next.delete('tag')
    setSearchParams(next)
  }

  // All tags across the user's notes, for the filter bar.
  const allTags = useMemo(() => {
    const set = new Set<string>()
    for (const n of notes) for (const t of n.tags) set.add(t)
    return [...set].sort()
  }, [notes])

  const visibleNotes = activeTag
    ? notes.filter((n) => n.tags.includes(activeTag))
    : notes

  async function createNote() {
    setError(null)
    const tags = activeTag ? [activeTag] : []
    const { data, error } = await supabase
      .from('notes')
      .insert({ user_id: user.id, title: '', content: '', tags })
      .select()
      .single()
    if (error) {
      setError(error.message)
      return
    }
    const note = data as Note
    setNotes((prev) => [note, ...prev])
    openNote(note.id)
  }

  async function saveNote(
    id: string,
    fields: { title: string; content: string; tags: string[] },
  ) {
    const updated_at = new Date().toISOString()
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, ...fields, updated_at } : n)),
    )
    const { error } = await supabase
      .from('notes')
      .update({ ...fields, updated_at })
      .eq('id', id)
    if (error) setError(error.message)
  }

  async function deleteNote(id: string) {
    const prev = notes
    setNotes((n) => n.filter((x) => x.id !== id))
    if (selectedId === id) openList()
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
        <button onClick={openList} className="text-lg font-bold text-slate-900">
          Notes
        </button>
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

      {error && <p className="text-sm text-red-600 bg-red-50 px-4 py-2">{error}</p>}

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

          {/* Tag filter bar */}
          {allTags.length > 0 && (
            <div className="p-3 border-b border-slate-200 flex flex-wrap gap-1.5">
              <button
                onClick={() => setTagFilter(null)}
                className={`text-xs rounded-full px-2.5 py-1 ${
                  !activeTag
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All
              </button>
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setTagFilter(tag)}
                  className={`text-xs rounded-full px-2.5 py-1 ${
                    activeTag === tag
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}

          <ul className="flex-1 overflow-y-auto">
            {loading ? (
              <li className="p-4 text-sm text-slate-400">Loading…</li>
            ) : visibleNotes.length === 0 ? (
              <li className="p-4 text-sm text-slate-400">
                {activeTag ? `No notes tagged #${activeTag}.` : 'No notes yet. Create one!'}
              </li>
            ) : (
              visibleNotes.map((note) => (
                <li key={note.id}>
                  <button
                    onClick={() => openNote(note.id)}
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
                    {note.tags.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {note.tags.map((t) => (
                          <span
                            key={t}
                            className="text-[11px] text-slate-500 bg-slate-100 rounded-full px-2 py-0.5"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
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
              onTagClick={setTagFilter}
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
  onTagClick,
}: {
  note: Note
  onSave: (
    id: string,
    fields: { title: string; content: string; tags: string[] },
  ) => void
  onDelete: (id: string) => void
  onTagClick: (tag: string) => void
}) {
  const [title, setTitle] = useState(note.title)
  const [content, setContent] = useState(note.content)
  const [tags, setTags] = useState<string[]>(note.tags)
  const [tagDraft, setTagDraft] = useState('')

  // Debounced autosave of title/content/tags.
  useEffect(() => {
    if (
      title === note.title &&
      content === note.content &&
      tags.join(' ') === note.tags.join(' ')
    )
      return
    const t = setTimeout(() => onSave(note.id, { title, content, tags }), 500)
    return () => clearTimeout(t)
  }, [title, content, tags, note, onSave])

  function addTag(raw: string) {
    const tag = raw.trim().toLowerCase().replace(/^#/, '')
    if (tag && !tags.includes(tag)) setTags([...tags, tag])
    setTagDraft('')
  }

  function removeTag(tag: string) {
    setTags(tags.filter((t) => t !== tag))
  }

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
        className="w-full text-2xl font-bold text-slate-900 bg-transparent focus:outline-none mb-3 placeholder:text-slate-300"
      />

      {/* Tags */}
      <div className="flex flex-wrap items-center gap-1.5 mb-4">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 text-xs bg-slate-200 text-slate-700 rounded-full pl-2.5 pr-1 py-1"
          >
            <button
              onClick={() => onTagClick(tag)}
              className="hover:underline"
              title={`Filter by #${tag}`}
            >
              #{tag}
            </button>
            <button
              onClick={() => removeTag(tag)}
              className="w-4 h-4 rounded-full hover:bg-slate-300 text-slate-500 leading-none"
              aria-label={`Remove tag ${tag}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          value={tagDraft}
          onChange={(e) => setTagDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault()
              addTag(tagDraft)
            } else if (e.key === 'Backspace' && !tagDraft && tags.length) {
              removeTag(tags[tags.length - 1])
            }
          }}
          onBlur={() => tagDraft && addTag(tagDraft)}
          placeholder={tags.length ? 'Add tag…' : 'Add a tag (press Enter)'}
          className="text-xs bg-transparent focus:outline-none py-1 min-w-24 text-slate-700 placeholder:text-slate-400"
        />
      </div>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Start writing…"
        className="w-full min-h-[50vh] text-slate-700 bg-transparent focus:outline-none resize-none leading-relaxed placeholder:text-slate-300"
      />
    </div>
  )
}
