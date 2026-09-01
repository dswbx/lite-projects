export type DueState = "today" | "overdue" | null;

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function todayKey(now = new Date()) {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function formatDueDate(dateKey: string) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(
    new Date(`${dateKey}T12:00:00`),
  );
}

export function dueState(dueDate: string | null, completed: boolean, today = todayKey()): DueState {
  if (!dueDate) return null;
  if (dueDate === today) return "today";
  if (!completed && dueDate < today) return "overdue";
  return null;
}
