import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { useMatch, useNavigate, useSearchParams } from 'react-router-dom'
import type { User } from '@supabase/supabase-js'
import { supabase, type Note, type NoteShare } from './lib/supabase'

export function Notes({ user }: { user: User }) {
  const [myNotes, setMyNotes] = useState<Note[]>([])
  const [sharedNotes, setSharedNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const navigate = useNavigate()
  const selectedId = useMatch('/note/:id')?.params.id
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTag = searchParams.get('tag')

  const load = useCallback(async () => {
    setError(null)
    // Own notes and notes shared with me are two disjoint sets (RLS lets me read both;
    // filtering by user_id keeps shared notes out of "my notes").
    const [mine, shared] = await Promise.all([
      supabase
        .from('notes')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false }),
      supabase
        .from('notes')
        .select('*')
        .neq('user_id', user.id)
        .order('updated_at', { ascending: false }),
    ])
    if (mine.error) setError(mine.error.message)
    else setMyNotes(mine.data as Note[])
    if (shared.error) setError(shared.error.message)
    else setSharedNotes(shared.data as Note[])
    setLoading(false)
  }, [user.id])

  useEffect(() => {
    load()
  }, [load])

  const search = searchParams.toString()
  const openNote = (noteId: string) => navigate({ pathname: `/note/${noteId}`, search })
  const openList = () => navigate({ pathname: '/', search })

  function setTagFilter(tag: string | null) {
    const next = new URLSearchParams(searchParams)
    if (tag) next.set('tag', tag)
    else next.delete('tag')
    setSearchParams(next)
  }

  const allTags = useMemo(() => {
    const set = new Set<string>()
    for (const n of myNotes) for (const t of n.tags) set.add(t)
    return [...set].sort()
  }, [myNotes])

  const visibleNotes = activeTag
    ? myNotes.filter((n) => n.tags.includes(activeTag))
    : myNotes

  async function createNote() {
    setError(null)
    const tags = activeTag ? [activeTag] : []
    const { data, error } = await supabase
      .from('notes')
      .insert({ user_id: user.id, title: '', content: '', tags })
      .select()
      .single()
    if (error) {
      // A foreign-key failure here means our session points at a user that no longer
      // exists (e.g. the database was reset). Recover by signing out cleanly.
      if (/foreign key/i.test(error.message)) {
        setError('Your session is no longer valid. Signing you out — please sign in again.')
        await supabase.auth.signOut()
        return
      }
      return setError(error.message)
    }
    const note = data as Note
    setMyNotes((prev) => [note, ...prev])
    openNote(note.id)
  }

  async function saveNote(
    id: string,
    fields: { title: string; content: string; tags: string[] },
  ) {
    const updated_at = new Date().toISOString()
    setMyNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, ...fields, updated_at } : n)),
    )
    const { error } = await supabase.from('notes').update({ ...fields, updated_at }).eq('id', id)
    if (error) setError(error.message)
  }

  async function deleteNote(id: string) {
    const prev = myNotes
    setMyNotes((n) => n.filter((x) => x.id !== id))
    if (selectedId === id) openList()
    const { error } = await supabase.from('notes').delete().eq('id', id)
    if (error) {
      setError(error.message)
      setMyNotes(prev)
    }
  }

  const selected =
    myNotes.find((n) => n.id === selectedId) ??
    sharedNotes.find((n) => n.id === selectedId) ??
    null
  const selectedIsMine = selected ? selected.user_id === user.id : false

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

          {allTags.length > 0 && (
            <div className="p-3 border-b border-slate-200 flex flex-wrap gap-1.5">
              <FilterChip active={!activeTag} onClick={() => setTagFilter(null)}>
                All
              </FilterChip>
              {allTags.map((tag) => (
                <FilterChip
                  key={tag}
                  active={activeTag === tag}
                  onClick={() => setTagFilter(tag)}
                >
                  #{tag}
                </FilterChip>
              ))}
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            <SectionLabel>My notes</SectionLabel>
            <ul>
              {loading ? (
                <li className="p-4 text-sm text-slate-400">Loading…</li>
              ) : visibleNotes.length === 0 ? (
                <li className="p-4 text-sm text-slate-400">
                  {activeTag ? `No notes tagged #${activeTag}.` : 'No notes yet. Create one!'}
                </li>
              ) : (
                visibleNotes.map((note) => (
                  <NoteRow
                    key={note.id}
                    note={note}
                    selected={note.id === selectedId}
                    onClick={() => openNote(note.id)}
                  />
                ))
              )}
            </ul>

            {sharedNotes.length > 0 && (
              <>
                <SectionLabel>Shared with me</SectionLabel>
                <ul>
                  {sharedNotes.map((note) => (
                    <NoteRow
                      key={note.id}
                      note={note}
                      selected={note.id === selectedId}
                      onClick={() => openNote(note.id)}
                      badge="read-only"
                    />
                  ))}
                </ul>
              </>
            )}
          </div>
        </aside>

        {/* Editor */}
        <main className="bg-slate-50 overflow-y-auto">
          {!selected ? (
            <div className="h-full flex items-center justify-center text-slate-400">
              Select a note or create a new one
            </div>
          ) : selectedIsMine ? (
            <Editor
              key={selected.id}
              note={selected}
              user={user}
              onSave={saveNote}
              onDelete={deleteNote}
              onTagClick={setTagFilter}
            />
          ) : (
            <ReadOnlyNote key={selected.id} note={selected} />
          )}
        </main>
      </div>
    </div>
  )
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`text-xs rounded-full px-2.5 py-1 ${
        active ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
      }`}
    >
      {children}
    </button>
  )
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="px-4 pt-4 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
      {children}
    </div>
  )
}

function NoteRow({
  note,
  selected,
  onClick,
  badge,
}: {
  note: Note
  selected: boolean
  onClick: () => void
  badge?: string
}) {
  return (
    <li>
      <button
        onClick={onClick}
        className={`w-full text-left px-4 py-3 border-b border-slate-100 hover:bg-slate-50 ${
          selected ? 'bg-slate-100' : ''
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-900 truncate flex-1">
            {note.title.trim() || 'Untitled'}
          </span>
          {badge && (
            <span className="shrink-0 text-[10px] uppercase tracking-wide text-amber-700 bg-amber-100 rounded px-1.5 py-0.5">
              {badge}
            </span>
          )}
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
  )
}

function Editor({
  note,
  user,
  onSave,
  onDelete,
  onTagClick,
}: {
  note: Note
  user: User
  onSave: (id: string, fields: { title: string; content: string; tags: string[] }) => void
  onDelete: (id: string) => void
  onTagClick: (tag: string) => void
}) {
  const [title, setTitle] = useState(note.title)
  const [content, setContent] = useState(note.content)
  const [tags, setTags] = useState<string[]>(note.tags)
  const [tagDraft, setTagDraft] = useState('')

  useEffect(() => {
    if (
      title === note.title &&
      content === note.content &&
      tags.join(' ') === note.tags.join(' ')
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
  const removeTag = (tag: string) => setTags(tags.filter((t) => t !== tag))

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

      <div className="flex flex-wrap items-center gap-1.5 mb-4">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 text-xs bg-slate-200 text-slate-700 rounded-full pl-2.5 pr-1 py-1"
          >
            <button onClick={() => onTagClick(tag)} className="hover:underline" title={`Filter by #${tag}`}>
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
        className="w-full min-h-[40vh] text-slate-700 bg-transparent focus:outline-none resize-none leading-relaxed placeholder:text-slate-300"
      />

      <SharePanel note={note} user={user} />
    </div>
  )
}

function SharePanel({ note, user }: { note: Note; user: User }) {
  const [shares, setShares] = useState<NoteShare[]>([])
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const loadShares = useCallback(async () => {
    const { data, error } = await supabase
      .from('note_shares')
      .select('*')
      .eq('note_id', note.id)
      .order('created_at', { ascending: true })
    if (!error) setShares(data as NoteShare[])
  }, [note.id])

  useEffect(() => {
    loadShares()
  }, [loadShares])

  async function addShare(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const target = email.trim().toLowerCase()
    if (!target) return
    if (target === user.email?.toLowerCase()) {
      setError("That's your own email — you already have this note.")
      return
    }
    setBusy(true)
    const { data, error } = await supabase
      .from('note_shares')
      .insert({ note_id: note.id, owner_id: user.id, shared_with_email: target })
      .select()
      .single()
    setBusy(false)
    if (error) {
      // Unique violation = already shared with this person.
      setError(
        error.code === '23505'
          ? `Already shared with ${target}.`
          : error.message,
      )
      return
    }
    setShares((prev) => [...prev, data as NoteShare])
    setEmail('')
  }

  async function removeShare(id: string) {
    const prev = shares
    setShares((s) => s.filter((x) => x.id !== id))
    const { error } = await supabase.from('note_shares').delete().eq('id', id)
    if (error) {
      setError(error.message)
      setShares(prev)
    }
  }

  return (
    <div className="mt-8 border-t border-slate-200 pt-6">
      <h3 className="text-sm font-semibold text-slate-700 mb-1">Share this note</h3>
      <p className="text-xs text-slate-500 mb-3">
        People you share with can read this note (not edit or delete it). It won't appear as one
        of their own notes.
      </p>

      <form onSubmit={addShare} className="flex gap-2 mb-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="person@example.com"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
        />
        <button
          type="submit"
          disabled={busy}
          className="bg-slate-900 text-white rounded-lg px-4 py-1.5 text-sm font-medium hover:bg-slate-800 disabled:opacity-50"
        >
          Share
        </button>
      </form>

      {error && <p className="text-xs text-red-600 mb-2">{error}</p>}

      {shares.length > 0 ? (
        <ul className="space-y-1">
          {shares.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between text-sm bg-slate-50 rounded-lg px-3 py-1.5"
            >
              <span className="text-slate-700">{s.shared_with_email}</span>
              <button
                onClick={() => removeShare(s.id)}
                className="text-xs text-red-600 hover:text-red-700"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-slate-400">Not shared with anyone yet.</p>
      )}
    </div>
  )
}

function ReadOnlyNote({ note }: { note: Note }) {
  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-8">
      <div className="mb-4 text-xs inline-flex items-center gap-2 bg-amber-100 text-amber-800 rounded-full px-3 py-1">
        <span className="font-medium">Shared with you</span>
        <span className="text-amber-700">read-only</span>
      </div>

      <h1 className="text-2xl font-bold text-slate-900 mb-3">
        {note.title.trim() || 'Untitled'}
      </h1>

      {note.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {note.tags.map((t) => (
            <span
              key={t}
              className="text-xs bg-slate-200 text-slate-700 rounded-full px-2.5 py-1"
            >
              #{t}
            </span>
          ))}
        </div>
      )}

      <div className="text-slate-700 leading-relaxed whitespace-pre-wrap min-h-[40vh]">
        {note.content.trim() || <span className="text-slate-300">No content</span>}
      </div>
    </div>
  )
}
