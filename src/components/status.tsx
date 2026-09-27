import type { EmployeeStatus } from "../domain/review";
import type { TaskStatus } from "../domain/task";

const statusTone: Record<EmployeeStatus, string> = {
  available: "bg-sage/20 text-ink",
  working: "bg-blue/25 text-ink",
  reviewing: "bg-lavender/30 text-ink",
  onLeave: "bg-amber/25 text-ink",
};

const statusDot: Record<EmployeeStatus, string> = {
  available: "bg-sage",
  working: "bg-blue",
  reviewing: "bg-lavender",
  onLeave: "bg-amber",
};

const taskTone: Record<TaskStatus, string> = {
  backlog: "bg-parchment text-muted",
  working: "bg-blue/25 text-ink",
  approval: "bg-lavender/30 text-ink",
  done: "bg-sage/25 text-ink",
  held: "bg-amber/25 text-ink",
};

export function StatusBadge({
  label,
  status,
}: {
  readonly label: string;
  readonly status: EmployeeStatus;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${statusTone[status]}`}
    >
      <span className={`size-1.5 rounded-full ${statusDot[status]}`} />
      {label}
    </span>
  );
}

export function TaskStatusBadge({
  label,
  status,
}: {
  readonly label: string;
  readonly status: TaskStatus;
}) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${taskTone[status]}`}
    >
      {label}
    </span>
  );
}
