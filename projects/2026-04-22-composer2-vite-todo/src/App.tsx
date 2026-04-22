import { useMemo, useState } from 'react'
import { useTodos } from './useTodos'

type Filter = 'all' | 'active' | 'completed'

export default function App() {
  const { todos, add, toggle, remove, clearCompleted } = useTodos()
  const [draft, setDraft] = useState('')
  const [filter, setFilter] = useState<Filter>('all')

  const visible = useMemo(() => {
    if (filter === 'active') return todos.filter((t) => !t.done)
    if (filter === 'completed') return todos.filter((t) => t.done)
    return todos
  }, [todos, filter])

  const activeCount = todos.filter((t) => !t.done).length
  const completedCount = todos.length - activeCount

  function submit() {
    add(draft)
    setDraft('')
  }

  return (
    <div className="min-h-dvh bg-gradient-to-b from-stone-100 to-stone-200 px-4 py-12 text-stone-900 dark:from-stone-950 dark:to-stone-900 dark:text-stone-100">
      <div className="mx-auto w-full max-w-lg font-display">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Todos
          </h1>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            Stored in this browser only
          </p>
        </header>

        <div className="rounded-2xl border border-stone-200/80 bg-white/90 p-5 shadow-lg shadow-stone-900/5 backdrop-blur dark:border-stone-800 dark:bg-stone-900/80">
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              submit()
            }}
          >
            <input
              className="min-w-0 flex-1 rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm outline-none ring-violet-500/30 placeholder:text-stone-400 focus:border-violet-400 focus:ring-2 dark:border-stone-700 dark:bg-stone-950 dark:focus:border-violet-500"
              placeholder="What needs doing?"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              aria-label="New todo title"
            />
            <button
              type="submit"
              className="shrink-0 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-violet-500 active:scale-[0.98] dark:bg-violet-500 dark:hover:bg-violet-400"
            >
              Add
            </button>
          </form>

          {todos.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-stone-100 pt-4 text-xs dark:border-stone-800">
              <div
                className="flex rounded-lg bg-stone-100 p-0.5 dark:bg-stone-800"
                role="tablist"
                aria-label="Filter todos"
              >
                {(
                  [
                    ['all', 'All'],
                    ['active', 'Active'],
                    ['completed', 'Done'],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={filter === key}
                    className={`rounded-md px-2.5 py-1 font-medium transition ${
                      filter === key
                        ? 'bg-white text-stone-900 shadow-sm dark:bg-stone-700 dark:text-stone-50'
                        : 'text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200'
                    }`}
                    onClick={() => setFilter(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <span className="text-stone-500 dark:text-stone-400">
                {activeCount} active
                {completedCount > 0 ? ` · ${completedCount} done` : ''}
              </span>
            </div>
          )}

          <ul className="mt-4 space-y-1" aria-label="Todo list">
            {visible.length === 0 && (
              <li className="rounded-xl border border-dashed border-stone-200 py-10 text-center text-sm text-stone-500 dark:border-stone-700 dark:text-stone-400">
                {todos.length === 0
                  ? 'Nothing here yet. Add your first task above.'
                  : filter === 'active'
                    ? 'No active tasks. Nice work.'
                    : 'No completed tasks in this view.'}
              </li>
            )}
            {visible.map((todo) => (
              <li
                key={todo.id}
                className="group flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-stone-50 dark:hover:bg-stone-800/60"
              >
                <input
                  type="checkbox"
                  checked={todo.done}
                  onChange={() => toggle(todo.id)}
                  className="size-4 shrink-0 rounded border-stone-300 text-violet-600 focus:ring-violet-500 dark:border-stone-600"
                  aria-label={`Mark "${todo.title}" as ${todo.done ? 'not done' : 'done'}`}
                />
                <span
                  className={`min-w-0 flex-1 text-left text-sm ${
                    todo.done
                      ? 'text-stone-400 line-through dark:text-stone-500'
                      : ''
                  }`}
                >
                  {todo.title}
                </span>
                <button
                  type="button"
                  className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-stone-400 opacity-0 transition hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                  onClick={() => remove(todo.id)}
                  aria-label={`Delete "${todo.title}"`}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>

          {completedCount > 0 && (
            <div className="mt-4 border-t border-stone-100 pt-4 dark:border-stone-800">
              <button
                type="button"
                className="text-xs font-medium text-stone-500 underline-offset-2 hover:text-red-600 hover:underline dark:text-stone-400 dark:hover:text-red-400"
                onClick={clearCompleted}
              >
                Clear completed
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
