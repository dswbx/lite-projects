import type { Task } from "../lib/supabase";

export type TaskFilter = "all" | "today" | "overdue";

type TaskFiltersProps = {
  value: TaskFilter;
  onChange: (value: TaskFilter) => void;
  tasks: Task[];
  today: string;
};

export function TaskFilters({ value, onChange, tasks, today }: TaskFiltersProps) {
  const todayCount = tasks.filter((task) => task.due_date === today).length;
  const overdueCount = tasks.filter((task) => !task.completed && task.due_date !== null && task.due_date < today).length;
  const filters: Array<{ value: TaskFilter; label: string; count?: number }> = [
    { value: "all", label: "All" },
    { value: "today", label: "Due today", count: todayCount },
    { value: "overdue", label: "Overdue", count: overdueCount },
  ];

  return (
    <div className="task-filters" role="group" aria-label="Filter tasks">
      {filters.map((filter) => (
        <button
          key={filter.value}
          className={value === filter.value ? "filter-button is-active" : "filter-button"}
          type="button"
          aria-pressed={value === filter.value}
          onClick={() => onChange(filter.value)}
        >
          {filter.label}
          {filter.count !== undefined && <span className="filter-count">{filter.count}</span>}
        </button>
      ))}
    </div>
  );
}
