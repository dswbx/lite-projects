import { useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase, type Item } from './supabase'

type FormState = {
  name: string
  category: string
  quantity: number
  location: string
}

const empty: FormState = { name: '', category: '', quantity: 1, location: '' }

export function Inventory({ session }: { session: Session }) {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(empty)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [filterCategory, setFilterCategory] = useState('')
  const [filterLocation, setFilterLocation] = useState('')

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    else setItems(data as Item[])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const payload = {
      name: form.name.trim(),
      category: form.category.trim(),
      quantity: Number(form.quantity),
      location: form.location.trim(),
      user_id: session.user.id,
    }
    if (!payload.name || !payload.category || !payload.location) {
      setError('Name, category, and location are required.')
      return
    }
    if (editingId) {
      const { error } = await supabase
        .from('items')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', editingId)
      if (error) return setError(error.message)
    } else {
      const { error } = await supabase.from('items').insert(payload)
      if (error) return setError(error.message)
    }
    setForm(empty)
    setEditingId(null)
    load()
  }

  function startEdit(item: Item) {
    setEditingId(item.id)
    setForm({
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      location: item.location,
    })
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(empty)
  }

  async function onDelete(id: string) {
    if (!confirm('Delete this item?')) return
    const { error } = await supabase.from('items').delete().eq('id', id)
    if (error) setError(error.message)
    else load()
  }

  const categories = useMemo(
    () => Array.from(new Set(items.map((i) => i.category))).sort(),
    [items],
  )
  const locations = useMemo(
    () => Array.from(new Set(items.map((i) => i.location))).sort(),
    [items],
  )
  const filtered = useMemo(
    () =>
      items.filter(
        (i) =>
          (!filterCategory || i.category === filterCategory) &&
          (!filterLocation || i.location === filterLocation),
      ),
    [items, filterCategory, filterLocation],
  )

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold">Home Inventory</h1>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-slate-500">{session.user.email}</span>
            <button
              onClick={() => supabase.auth.signOut()}
              className="px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <h2 className="text-lg font-medium mb-4">
            {editingId ? 'Edit item' : 'Add an item'}
          </h2>
          <form
            onSubmit={onSubmit}
            className="grid grid-cols-1 md:grid-cols-5 gap-3"
          >
            <input
              type="text"
              required
              placeholder="Name (e.g. Hammer)"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="md:col-span-2 px-3 py-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
            <input
              type="text"
              required
              placeholder="Category (e.g. Tools)"
              list="cat-list"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="px-3 py-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
            <datalist id="cat-list">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
            <input
              type="number"
              min={0}
              required
              placeholder="Qty"
              value={form.quantity}
              onChange={(e) =>
                setForm({ ...form, quantity: Number(e.target.value) })
              }
              className="px-3 py-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
            <input
              type="text"
              required
              placeholder="Location (e.g. Garage)"
              list="loc-list"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              className="px-3 py-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
            <datalist id="loc-list">
              {locations.map((l) => (
                <option key={l} value={l} />
              ))}
            </datalist>
            <div className="md:col-span-5 flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
              >
                {editingId ? 'Save changes' : 'Add item'}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="px-4 py-2 rounded-md border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        </section>

        <section>
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <h2 className="text-lg font-medium mr-auto">
              {filtered.length} item{filtered.length === 1 ? '' : 's'}
            </h2>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <select
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value)}
              className="px-3 py-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
            >
              <option value="">All locations</option>
              {locations.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
            {(filterCategory || filterLocation) && (
              <button
                onClick={() => {
                  setFilterCategory('')
                  setFilterLocation('')
                }}
                className="text-sm text-indigo-600 hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>

          {loading ? (
            <p className="text-slate-500">Loading…</p>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl">
              <p className="text-slate-500">
                {items.length === 0
                  ? 'No items yet. Add your first one above.'
                  : 'No items match the current filters.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
              <table className="w-full text-sm">
                <thead className="text-left text-slate-500 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Category</th>
                    <th className="px-4 py-3 font-medium">Qty</th>
                    <th className="px-4 py-3 font-medium">Location</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-slate-100 dark:border-slate-800 last:border-0"
                    >
                      <td className="px-4 py-3 font-medium">{item.name}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-xs">
                          {item.category}
                        </span>
                      </td>
                      <td className="px-4 py-3">{item.quantity}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                        {item.location}
                      </td>
                      <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                        <button
                          onClick={() => startEdit(item)}
                          className="text-indigo-600 hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => onDelete(item.id)}
                          className="text-red-600 hover:underline"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
