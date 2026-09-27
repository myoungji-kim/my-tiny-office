import type { Employee } from "./employee";
import type { EmployeeId, ProjectId, ReviewId, TaskId } from "./ids";
import { PRIORITY_RANK, type Project } from "./project";
import type { Review } from "./review";
import type { Task } from "./task";

export interface PickUp {
  readonly employeeId: EmployeeId;
  readonly taskId: TaskId;
}

// Someone reviewing is busy, and someone with a review waiting looks at it
// before they take anything else.
function occupied(tasks: readonly Task[], reviews: readonly Review[]): Set<EmployeeId | undefined> {
  return new Set([
    ...tasks.filter((t) => t.status === "working").map((t) => t.assigneeId),
    ...reviews.filter((r) => r.state === "reviewing" || r.state === "queued").map((r) => r.reviewerId),
  ]);
}

// Queued reviews whose reviewer is now free, the oldest first, one each.
export function reviewsToStart(tasks: readonly Task[], reviews: readonly Review[], employees: readonly Employee[]): ReviewId[] {
  const working = new Set(tasks.filter((t) => t.status === "working").map((t) => t.assigneeId));
  const reviewing = new Set(reviews.filter((r) => r.state === "reviewing").map((r) => r.reviewerId));
  const started = new Set<EmployeeId>();
  const result: ReviewId[] = [];
  for (const review of [...reviews].filter((r) => r.state === "queued").sort((a, b) => a.createdAt - b.createdAt)) {
    const reviewer = employees.find((e) => e.id === review.reviewerId);
    if (reviewer === undefined || reviewer.availability !== "available") continue;
    if (working.has(reviewer.id) || reviewing.has(reviewer.id) || started.has(reviewer.id)) continue;
    started.add(reviewer.id);
    result.push(review.id);
  }
  return result;
}

// Who starts what next. One thing at a time per person; only active projects'
// backlogs are picked from; what was handed to someone waits for them. Each
// free person takes their own work first, then the unclaimed, ordered by the
// project's priority, then the task's, then the oldest.
export function pickUps(
  projects: readonly Project[],
  tasks: readonly Task[],
  employees: readonly Employee[],
  reviews: readonly Review[] = [],
): PickUp[] {
  const projectById = new Map<ProjectId, Project>(projects.map((p) => [p.id, p]));
  const busy = occupied(tasks, reviews);
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
