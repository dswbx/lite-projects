import { CalendarDays, Plus } from "lucide-react";
import { useState } from "react";

type TaskComposerProps = {
  onCreate: (title: string, dueDate: string | null) => Promise<void>;
  disabled?: boolean;
};

export function TaskComposer({ onCreate, disabled = false }: TaskComposerProps) {
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle || isAdding || disabled) return;

    setIsAdding(true);
    try {
      await onCreate(trimmedTitle, dueDate || null);
      setTitle("");
      setDueDate("");
    } finally {
      setIsAdding(false);
    }
  }

  return (
    <form className="composer" onSubmit={handleSubmit}>
      <label className="sr-only" htmlFor="new-task">Add a task</label>
      <input
        id="new-task"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="What needs your attention?"
        disabled={disabled || isAdding}
      />
      <label className="composer-date">
        <CalendarDays size={16} aria-hidden="true" />
        <span className="sr-only">Due date</span>
        <input
          type="date"
          aria-label="Due date"
          value={dueDate}
          onChange={(event) => setDueDate(event.target.value)}
          disabled={disabled || isAdding}
        />
      </label>
      <button className="button button--citrus" type="submit" disabled={disabled || isAdding || !title.trim()}>
        <Plus size={18} />
        <span>{isAdding ? "Adding…" : "Add task"}</span>
      </button>
    </form>
  );
}
