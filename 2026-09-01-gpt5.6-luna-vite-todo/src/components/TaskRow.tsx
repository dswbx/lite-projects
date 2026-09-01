import { Check, Trash2 } from "lucide-react";
import type { Task } from "../lib/supabase";

type TaskRowProps = {
  task: Task;
  onToggle: (task: Task) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  busy: boolean;
};

export function TaskRow({ task, onToggle, onDelete, busy }: TaskRowProps) {
  return (
    <li className={task.completed ? "task-row is-complete" : "task-row"}>
      <button
        className="task-check"
        type="button"
        aria-label={task.completed ? `Mark ${task.title} as active` : `Mark ${task.title} as complete`}
        aria-pressed={task.completed}
        disabled={busy}
        onClick={() => void onToggle(task)}
      >
        {task.completed && <Check size={15} strokeWidth={2.6} />}
      </button>
      <span className="task-title">{task.title}</span>
      <button
        className="icon-button task-delete"
        type="button"
        aria-label={`Delete ${task.title}`}
        disabled={busy}
        onClick={() => void onDelete(task.id)}
      >
        <Trash2 size={17} />
      </button>
    </li>
  );
}
