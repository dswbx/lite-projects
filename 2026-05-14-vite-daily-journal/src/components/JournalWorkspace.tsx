import type { Session } from '@supabase/supabase-js'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  formatEntryDateLabel,
  localDateString,
  nextLocalDay,
  previousLocalDay,
} from '../lib/dates'
import type { JournalEntry } from '../supabase'
import { supabase } from '../supabase'

type Props = {
  session: Session
}

export function JournalWorkspace({ session }: Props) {
  const [selectedDate, setSelectedDate] = useState(() => localDateString())

  const [rows, setRows] = useState<JournalEntry[]>([])
  const [draftBody, setDraftBody] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const byDate = useMemo(() => {
    const m = new Map<string, JournalEntry>()
    for (const r of rows) m.set(r.entry_date, r)
    return m
  }, [rows])

  const pickDate = useCallback((d: string, list: JournalEntry[]) => {
    setSelectedDate(d)
    const row = list.find((r) => r.entry_date === d)
    setDraftBody(row?.body ?? '')
  }, [])

  const loadEntries = useCallback(async (dateForDraft: string) => {
    const { data, error: qErr } = await supabase
      .from('journal_entries')
      .select('id, user_id, entry_date, body, created_at, updated_at')
      .order('entry_date', { ascending: false })

    if (qErr) {
      setError(qErr.message)
      setLoading(false)
      return
    }
    const list = (data ?? []) as JournalEntry[]
    setRows(list)
    setLoading(false)
    const row = list.find((r) => r.entry_date === dateForDraft)
    setDraftBody(row?.body ?? '')
  }, [])

  /* eslint-disable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect -- mount-only supabase fetch */
  useEffect(() => {
    void loadEntries(selectedDate)
  }, [loadEntries])
  /* eslint-enable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect */

  const activeRow = byDate.get(selectedDate)
  const todayStr = localDateString()
  const sortedDates = useMemo(
    () => [...new Set(rows.map((r) => r.entry_date))].sort((a, b) => (a < b ? 1 : a > b ? -1 : 0)),
    [rows],
  )

  async function saveEntry() {
    setError(null)
    setSaving(true)
    const trimmed = draftBody.trim()
    const nowIso = new Date().toISOString()

    if (activeRow) {
      const { error: upErr } = await supabase
        .from('journal_entries')
        .update({ body: trimmed, updated_at: nowIso })
        .eq('id', activeRow.id)
      setSaving(false)
      if (upErr) {
        setError(upErr.message)
        return
      }
    } else {
      const { error: insErr } = await supabase.from('journal_entries').insert({
        user_id: session.user.id,
        entry_date: selectedDate,
        body: trimmed,
      })
      setSaving(false)
      if (insErr) {
        setError(insErr.message)
        return
      }
    }
    setLoading(true)
    await loadEntries(selectedDate)
  }

  async function deleteEntry() {
    if (!activeRow) return
    setError(null)
    setSaving(true)
    const { error: delErr } = await supabase.from('journal_entries').delete().eq('id', activeRow.id)
    setSaving(false)
    if (delErr) {
      setError(delErr.message)
      return
    }
    setLoading(true)
    await loadEntries(selectedDate)
  }

  if (loading && rows.length === 0) {
    return (
      <p className="text-sm text-slate-500" aria-live="polite">
        Loading journal…
      </p>
    )
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,220px)_1fr]">
      <aside className="space-y-4 lg:sticky lg:top-8 lg:self-start">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Jump to date
          </h2>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => pickDate(e.target.value, rows)}
            className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm outline-none focus:border-teal-600"
          />
        </div>
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Days with entries
          </h2>
          <ul className="mt-2 max-h-64 space-y-1 overflow-y-auto rounded-lg border border-slate-200 bg-white p-1">
            {sortedDates.length === 0 ? (
              <li className="px-2 py-2 text-sm text-slate-500">No saved days yet.</li>
            ) : (
              sortedDates.map((d) => (
                <li key={d}>
                  <button
                    type="button"
                    onClick={() => pickDate(d, rows)}
                    className={`w-full rounded-md px-2 py-1.5 text-left text-sm ${
                      d === selectedDate
                        ? 'bg-teal-100 font-medium text-teal-900'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {formatEntryDateLabel(d)}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      </aside>

      <section className="min-w-0 space-y-4">
        {error ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div>
            <p className="text-lg font-medium text-slate-900">{formatEntryDateLabel(selectedDate)}</p>
            {selectedDate === todayStr ? (
              <p className="text-xs text-teal-700">Today</p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => pickDate(previousLocalDay(selectedDate), rows)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
            >
              Previous day
            </button>
            <button
              type="button"
              onClick={() => pickDate(nextLocalDay(selectedDate), rows)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
            >
              Next day
            </button>
            <button
              type="button"
              onClick={() => pickDate(localDateString(), rows)}
              className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-1.5 text-sm text-teal-900 hover:bg-teal-100"
            >
              Today
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <label htmlFor="entry-body" className="mb-2 block text-xs font-medium text-slate-600">
            Entry
          </label>
          <textarea
            id="entry-body"
            value={draftBody}
            onChange={(e) => setDraftBody(e.target.value)}
            rows={14}
            placeholder="Write something for this day…"
            className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm leading-relaxed outline-none focus:border-teal-600"
          />
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => void saveEntry()}
              className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-50"
            >
              {saving ? 'Saving…' : activeRow ? 'Save changes' : 'Save entry'}
            </button>
            {activeRow ? (
              <button
                type="button"
                disabled={saving}
                onClick={() => void deleteEntry()}
                className="rounded-lg border border-red-200 px-4 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                Delete this day
              </button>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  )
}
