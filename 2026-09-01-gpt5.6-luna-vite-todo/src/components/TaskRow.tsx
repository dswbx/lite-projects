import { CalendarDays, Check, Trash2 } from "lucide-react";
import type { Task } from "../lib/supabase";
import { dueState, formatDueDate } from "../lib/dates";

type TaskRowProps = {
  task: Task;
  onToggle: (task: Task) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  busy: boolean;
  today: string;
};

export function TaskRow({ task, onToggle, onDelete, busy, today }: TaskRowProps) {
  const state = dueState(task.due_date, task.completed, today);

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
      <span className="task-copy">
        <span className="task-title">{task.title}</span>
        {task.due_date && (
          <span className={state ? `task-due task-due--${state}` : "task-due"}>
            <CalendarDays size={13} aria-hidden="true" />
            {state === "today" ? "Today" : state === "overdue" ? "Overdue" : formatDueDate(task.due_date)}
            {state && <span className="task-due__date">· {formatDueDate(task.due_date)}</span>}
          </span>
        )}
      </span>
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
