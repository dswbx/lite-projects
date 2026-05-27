import { useState, useRef } from 'react'

type Props = {
  notes: string
  onSave: (notes: string) => void
}

export default function DayNotes({ notes, onSave }: Props) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(notes)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function handleFocus() {
    setEditing(true)
    setValue(notes)
    setTimeout(() => textareaRef.current?.focus(), 0)
  }

  function handleBlur() {
    setEditing(false)
    if (value !== notes) {
      onSave(value)
    }
  }

  if (!editing) {
    return (
      <div
        onClick={handleFocus}
        className={`min-h-[2rem] text-sm rounded-lg px-3 py-2 cursor-text border border-transparent hover:border-slate-200 hover:bg-slate-50 transition-colors ${
          notes ? 'text-slate-600' : 'text-slate-400 italic'
        }`}
      >
        {notes || 'Add day notes...'}
      </div>
    )
  }

  return (
    <textarea
      ref={textareaRef}
      rows={3}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={handleBlur}
      placeholder="Notes for this day..."
      className="w-full text-sm px-3 py-2 border border-indigo-300 rounded-lg text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none transition"
    />
  )
}
