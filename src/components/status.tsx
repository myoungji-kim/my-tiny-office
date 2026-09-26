import type { Availability } from "../domain/employee";
import type { TaskStatus } from "../domain/task";

const availabilityTone: Record<Availability | "working", string> = {
  available: "bg-sage/20 text-ink",
  working: "bg-blue/25 text-ink",
  onVacation: "bg-amber/25 text-ink",
};

const availabilityDot: Record<Availability | "working", string> = {
  available: "bg-sage",
  working: "bg-blue",
  onVacation: "bg-amber",
};

const taskTone: Record<TaskStatus, string> = {
  backlog: "bg-parchment text-muted",
  ready: "bg-lavender/30 text-ink",
  working: "bg-blue/25 text-ink",
  done: "bg-sage/25 text-ink",
};

export type EmployeeStatus = Availability | "working";

export function employeeStatus(
  availability: Availability,
  workingOn: string | undefined,
): EmployeeStatus {
  if (availability === "onVacation") {
    return "onVacation";
  }
  return workingOn === undefined ? "available" : "working";
}

export function StatusBadge({
  label,
  status,
}: {
  readonly label: string;
  readonly status: EmployeeStatus;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${availabilityTone[status]}`}
    >
      <span className={`size-1.5 rounded-full ${availabilityDot[status]}`} />
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

export function ProgressBar({ value }: { readonly value: number }) {
  const percent = Math.round(value * 100);

  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-28 overflow-hidden rounded-full bg-parchment">
        <div className="h-full rounded-full bg-blue" style={{ width: `${percent}%` }} />
      </div>
      <span className="font-mono text-xs text-muted">{percent}%</span>
    </div>
  );
}
