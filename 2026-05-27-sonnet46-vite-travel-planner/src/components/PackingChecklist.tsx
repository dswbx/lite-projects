import { useState } from 'react'
import { supabase, type PackingItem } from '../lib/supabase'

type Props = {
  tripId: string
  items: PackingItem[]
  onItemsChange: (items: PackingItem[]) => void
}

const CATEGORIES = ['Clothing', 'Toiletries', 'Electronics', 'Documents', 'Health', 'Other']

export default function PackingChecklist({ tripId, items, onItemsChange }: Props) {
  const [newName, setNewName] = useState('')
  const [newCategory, setNewCategory] = useState('Other')
  const [adding, setAdding] = useState(false)
  const [filter, setFilter] = useState<'all' | 'packed' | 'unpacked'>('all')

  const grouped = items.reduce<Record<string, PackingItem[]>>((acc, item) => {
    const cat = item.category ?? 'Other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(item)
    return acc
  }, {})

  const packedCount = items.filter((i) => i.packed).length

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return

    const newItem = { trip_id: tripId, name: newName.trim(), packed: false, category: newCategory }
    const { data, error } = await supabase.from('packing_items').insert(newItem).select('*').single()

    if (!error && data) {
      onItemsChange([...items, data as PackingItem].sort((a, b) => {
        const catA = a.category ?? 'Other'
        const catB = b.category ?? 'Other'
        return catA.localeCompare(catB) || a.name.localeCompare(b.name)
      }))
    }

    setNewName('')
    setAdding(false)
  }

  async function handleToggle(item: PackingItem) {
    const { data, error } = await supabase
      .from('packing_items')
      .update({ packed: !item.packed })
      .eq('id', item.id)
      .select('*')
      .single()

    if (!error && data) {
      onItemsChange(items.map((i) => (i.id === item.id ? (data as PackingItem) : i)))
    }
  }

  async function handleDelete(itemId: string) {
    await supabase.from('packing_items').delete().eq('id', itemId)
    onItemsChange(items.filter((i) => i.id !== itemId))
  }

  const filteredGrouped = Object.entries(grouped).reduce<Record<string, PackingItem[]>>((acc, [cat, catItems]) => {
    const filtered = catItems.filter((item) => {
      if (filter === 'packed') return item.packed
      if (filter === 'unpacked') return !item.packed
      return true
    })
    if (filtered.length > 0) acc[cat] = filtered
    return acc
  }, {})

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-slate-900">Packing List</h3>
            <p className="text-sm text-slate-500 mt-0.5">
              {packedCount} of {items.length} packed
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
              {(['all', 'unpacked', 'packed'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1 rounded-md text-xs font-medium capitalize transition-all ${
                    filter === f
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>

        {items.length > 0 && (
          <div className="w-full bg-slate-100 rounded-full h-2 mb-4">
            <div
              className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${items.length ? (packedCount / items.length) * 100 : 0}%` }}
            />
          </div>
        )}

        {Object.entries(filteredGrouped).length === 0 && (
          <p className="text-slate-400 text-sm italic py-4 text-center">
            {items.length === 0 ? 'No items yet. Add your first packing item below!' : 'No items match the current filter.'}
          </p>
        )}

        {Object.entries(filteredGrouped).sort(([a], [b]) => a.localeCompare(b)).map(([category, catItems]) => (
          <div key={category} className="mb-4 last:mb-0">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{category}</h4>
            <div className="space-y-1.5">
              {catItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 group py-1.5 px-3 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  <button
                    onClick={() => handleToggle(item)}
                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      item.packed
                        ? 'bg-emerald-500 border-emerald-500'
                        : 'border-slate-300 hover:border-emerald-400'
                    }`}
                  >
                    {item.packed && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                  <span className={`flex-1 text-sm ${item.packed ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                    {item.name}
                  </span>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-400 transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        {adding ? (
          <form onSubmit={handleAddItem} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Item name</label>
              <input
                autoFocus
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Passport"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Category</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setNewCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                      newCategory === cat
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setAdding(false)}
                className="flex-1 px-4 py-2 border border-slate-200 rounded-xl text-slate-600 font-medium hover:bg-slate-50 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-xl transition-colors text-sm"
              >
                Add item
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="w-full flex items-center justify-center gap-2 text-indigo-600 hover:text-indigo-800 font-medium text-sm py-2 rounded-xl hover:bg-indigo-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add packing item
          </button>
        )}
      </div>
    </div>
  )
}
