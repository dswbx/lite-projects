import { ListChecks } from "lucide-react";
import type { Task } from "../lib/supabase";
import { TaskRow } from "./TaskRow";

type TaskListProps = {
  tasks: Task[];
  busyTaskId: string | null;
  onToggle: (task: Task) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

export function TaskList({ tasks, busyTaskId, onToggle, onDelete }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state__icon"><ListChecks size={24} strokeWidth={1.6} /></div>
        <p className="eyebrow">Clear runway</p>
        <h3>Nothing on the slate yet.</h3>
        <p>Add one small thing above. Momentum likes a short list.</p>
      </div>
    );
  }

  return (
    <ul className="task-list" aria-label="Your tasks">
      {tasks.map((task) => (
        <TaskRow
          key={task.id}
          task={task}
          busy={busyTaskId === task.id}
          onToggle={onToggle}
          onDelete={onDelete}
        />
      ))}
    </ul>
  );
}
