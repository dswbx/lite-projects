import { CalendarDays, Plus, Repeat2 } from "lucide-react";
import { useState } from "react";
import type { Recurrence } from "../lib/supabase";

type TaskComposerProps = {
  onCreate: (title: string, dueDate: string | null, recurrence: Recurrence) => Promise<void>;
  disabled?: boolean;
};

export function TaskComposer({ onCreate, disabled = false }: TaskComposerProps) {
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [recurrence, setRecurrence] = useState<Recurrence>("none");
  const [isAdding, setIsAdding] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle || isAdding || disabled || (recurrence === "daily" && !dueDate)) return;

    setIsAdding(true);
    try {
      await onCreate(trimmedTitle, dueDate || null, recurrence);
      setTitle("");
      setDueDate("");
      setRecurrence("none");
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
          required={recurrence === "daily"}
          disabled={disabled || isAdding}
        />
      </label>
      <label className="composer-repeat">
        <Repeat2 size={16} aria-hidden="true" />
        <span className="sr-only">Repeat</span>
        <select
          aria-label="Repeat"
          value={recurrence}
          onChange={(event) => setRecurrence(event.target.value as Recurrence)}
          disabled={disabled || isAdding}
        >
          <option value="none">No repeat</option>
          <option value="daily">Every day</option>
        </select>
      </label>
      <button className="button button--citrus" type="submit" disabled={disabled || isAdding || !title.trim()}>
        <Plus size={18} />
        <span>{isAdding ? "Adding…" : "Add task"}</span>
      </button>
    </form>
  );
}
