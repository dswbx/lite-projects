import { Plus } from "lucide-react";
import { useState } from "react";

type TaskComposerProps = {
  onCreate: (title: string) => Promise<void>;
  disabled?: boolean;
};

export function TaskComposer({ onCreate, disabled = false }: TaskComposerProps) {
  const [title, setTitle] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle || isAdding || disabled) return;

    setIsAdding(true);
    try {
      await onCreate(trimmedTitle);
      setTitle("");
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
      <button className="button button--citrus" type="submit" disabled={disabled || isAdding || !title.trim()}>
        <Plus size={18} />
        <span>{isAdding ? "Adding…" : "Add task"}</span>
      </button>
    </form>
  );
}
