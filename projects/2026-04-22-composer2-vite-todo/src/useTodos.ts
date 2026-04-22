import { useCallback, useEffect, useState } from 'react'

export type Todo = { id: string; title: string; done: boolean }

const STORAGE_KEY = 'lite-todos'

function load(): Todo[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (item): item is Todo =>
        item != null &&
        typeof item === 'object' &&
        typeof (item as Todo).id === 'string' &&
        typeof (item as Todo).title === 'string' &&
        typeof (item as Todo).done === 'boolean',
    )
  } catch {
    return []
  }
}

export function useTodos() {
  const [todos, setTodos] = useState<Todo[]>(load)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos))
  }, [todos])

  const add = useCallback((title: string) => {
    const trimmed = title.trim()
    if (!trimmed) return
    setTodos((prev) => [
      ...prev,
      { id: crypto.randomUUID(), title: trimmed, done: false },
    ])
  }, [])

  const toggle = useCallback((id: string) => {
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
    )
  }, [])

  const remove = useCallback((id: string) => {
    setTodos((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const clearCompleted = useCallback(() => {
    setTodos((prev) => prev.filter((t) => !t.done))
  }, [])

  return { todos, add, toggle, remove, clearCompleted }
}
