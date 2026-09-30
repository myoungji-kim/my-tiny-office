import type { Employee } from "./employee";
import type { EmployeeId, ProjectId, ReviewId, TaskId } from "./ids";
import { PRIORITY_RANK, type Project } from "./project";
import { holdsTheWork, liveReviews, type Review } from "./review";
import type { Task } from "./task";

export interface PickUp {
  readonly employeeId: EmployeeId;
  readonly taskId: TaskId;
}

// Someone reviewing is busy, and someone with a review waiting looks at it
// before they take anything else.
function occupied(tasks: readonly Task[], reviews: readonly Review[]): Set<EmployeeId> {
  return new Set([
    ...tasks.flatMap((t) => (t.status === "working" && t.assigneeId !== undefined ? [t.assigneeId] : [])),
    ...liveReviews(tasks, reviews).flatMap((r) => (r.reviewerId !== undefined ? [r.reviewerId] : [])),
  ]);
}

// Queued reviews whose reviewer is now free, the oldest first, one each. Work
// that only waits for its own review keeps its author from nothing, or two
// colleagues reviewing each other would wait on each other for good.
export function reviewsToStart(tasks: readonly Task[], reviews: readonly Review[], employees: readonly Employee[]): ReviewId[] {
  const live = liveReviews(tasks, reviews);
  const waitingOnReview = new Set(live.filter(holdsTheWork).map((r) => r.taskId));
  const working = new Set(tasks.filter((t) => t.status === "working" && !waitingOnReview.has(t.id)).map((t) => t.assigneeId));
  const reviewing = new Set(live.filter((r) => r.state === "reviewing").map((r) => r.reviewerId));
  const started = new Set<EmployeeId>();
  const result: ReviewId[] = [];
  for (const review of live.filter((r) => r.state === "queued").sort((a, b) => a.createdAt - b.createdAt)) {
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
  reviews: readonly Review[],
): PickUp[] {
  // nothing runs in a folder that has not been chosen on this computer
  const projectRank = new Map<ProjectId, number>(
    projects.filter((p) => p.status === "active" && p.folderConfirmed).map((p) => [p.id, PRIORITY_RANK[p.priority]]),
  );
  const busy = occupied(tasks, reviews);
  const waiting = tasks
    .filter((t) => t.status === "backlog" && projectRank.has(t.projectId))
    .sort(
      (a, b) =>
        (projectRank.get(a.projectId) ?? 0) - (projectRank.get(b.projectId) ?? 0) ||
        PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
        a.createdAt - b.createdAt ||
        a.id.localeCompare(b.id),
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
