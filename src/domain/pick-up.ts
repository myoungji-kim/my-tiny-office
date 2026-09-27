import type { Employee } from "./employee";
import type { EmployeeId, ProjectId, TaskId } from "./ids";
import { PRIORITY_RANK, type Project } from "./project";
import type { Task } from "./task";

export interface PickUp {
  readonly employeeId: EmployeeId;
  readonly taskId: TaskId;
}

// Who starts what next. One thing at a time per person; only active projects'
// backlogs are picked from; what was handed to someone waits for them. Each
// free person takes their own work first, then the unclaimed, ordered by the
// project's priority, then the task's, then the oldest.
export function pickUps(
  projects: readonly Project[],
  tasks: readonly Task[],
  employees: readonly Employee[],
): PickUp[] {
  const projectById = new Map<ProjectId, Project>(projects.map((p) => [p.id, p]));
  const busy = new Set(tasks.filter((t) => t.status === "working").map((t) => t.assigneeId));
  const waiting = tasks
    .filter((t) => t.status === "backlog" && projectById.get(t.projectId)?.status === "active")
    .sort(
      (a, b) =>
        PRIORITY_RANK[projectById.get(a.projectId)!.priority] - PRIORITY_RANK[projectById.get(b.projectId)!.priority] ||
        PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
        a.createdAt - b.createdAt,
    );

  const taken = new Set<TaskId>();
  const result: PickUp[] = [];
  for (const employee of employees) {
    if (employee.availability !== "available" || busy.has(employee.id)) continue;
    const next =
      waiting.find((t) => !taken.has(t.id) && t.assigneeId === employee.id) ??
      waiting.find((t) => !taken.has(t.id) && t.assigneeId === undefined);
    if (next === undefined) continue;
    taken.add(next.id);
    result.push({ employeeId: employee.id, taskId: next.id });
  }
  return result;
}
