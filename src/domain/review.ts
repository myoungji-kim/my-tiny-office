import type { Employee } from "./employee";
import type { ReviewQueued, ReviewReleased, ReviewSettled, ReviewStarted, ReviewSuggested, ReviewWithdrawn } from "./events";
import type { AreaId, CompanyId, EmployeeId, EventId, ReviewId } from "./ids";
import type { Task } from "./task";
import type { Timestamp } from "./time";

// A PullRequest in the MVP is the app's own record of a colleague's review,
// never a hosting provider's. It lives inside `working`: the task is worked on
// throughout, and moves to approval when the work itself is finished.
// Withdrawn is a review the work moved on from before it settled.
export type ReviewState = "suggested" | "queued" | "reviewing" | "settled" | "withdrawn";

export interface Review {
  readonly id: ReviewId;
  readonly companyId: CompanyId;
  readonly taskId: Task["id"];
  readonly reviewerId: EmployeeId | undefined;
  readonly state: ReviewState;
  readonly createdAt: Timestamp;
  readonly startedAt: Timestamp | undefined;
  readonly settledAt: Timestamp | undefined;
}

type Transition<TEvent, TFailure extends string> =
  | { readonly ok: true; readonly review: Review; readonly events: readonly [TEvent] }
  | { readonly ok: false; readonly reason: TFailure };

const base = (review: Review, eventId: EventId, now: Timestamp) => ({
  eventId,
  occurredAt: now,
  companyId: review.companyId,
  reviewId: review.id,
  taskId: review.taskId,
});

// The office offers a second pair of eyes on work in an area someone else knows.
// If nobody else has been taught the area there is nobody to suggest, and the
// user is told so rather than shown an empty review.
export function suggestReview(
  input: { readonly id: ReviewId; readonly task: Task; readonly othersWhoKnow: number },
  eventId: EventId,
  now: Timestamp,
): Transition<ReviewSuggested, "taskNotWorking" | "taskHasNoArea" | "nobodyKnowsArea"> {
  if (input.task.status !== "working") return { ok: false, reason: "taskNotWorking" };
  if (input.task.area === undefined) return { ok: false, reason: "taskHasNoArea" };
  if (input.othersWhoKnow === 0) return { ok: false, reason: "nobodyKnowsArea" };
  const review: Review = {
    id: input.id,
    companyId: input.task.companyId,
    taskId: input.task.id,
    reviewerId: undefined,
    state: "suggested",
    createdAt: now,
    startedAt: undefined,
    settledAt: undefined,
  };
  return { ok: true, review, events: [{ ...base(review, eventId, now), type: "ReviewSuggested" }] };
}

export type AskFailure = "reviewNotOpen" | "taskNotWorking" | "reviewerIsAssignee" | "reviewerOnLeave" | "reviewerDoesNotKnowArea";

// Only someone taught the task's area may review it. Someone free looks now;
// someone busy looks once they finish; nobody on leave is asked.
export function askReviewer(
  review: Review,
  task: Task,
  reviewer: Employee,
  expertise: ReadonlySet<AreaId>,
  reviewerBusy: boolean,
  eventId: EventId,
  now: Timestamp,
): Transition<ReviewStarted | ReviewQueued, AskFailure> {
  if (review.state !== "suggested") return { ok: false, reason: "reviewNotOpen" };
  if (task.status !== "working") return { ok: false, reason: "taskNotWorking" };
  if (reviewer.id === task.assigneeId) return { ok: false, reason: "reviewerIsAssignee" };
  if (reviewer.availability === "onLeave") return { ok: false, reason: "reviewerOnLeave" };
  if (task.area === undefined || !expertise.has(task.area)) return { ok: false, reason: "reviewerDoesNotKnowArea" };

  if (reviewerBusy) {
    const queued: Review = { ...review, reviewerId: reviewer.id, state: "queued" };
    return { ok: true, review: queued, events: [{ ...base(queued, eventId, now), type: "ReviewQueued", reviewerId: reviewer.id, reviewerName: reviewer.name }] };
  }
  const started: Review = { ...review, reviewerId: reviewer.id, state: "reviewing", startedAt: now };
  return { ok: true, review: started, events: [{ ...base(started, eventId, now), type: "ReviewStarted", reviewerId: reviewer.id, reviewerName: reviewer.name }] };
}

export function startQueuedReview(review: Review, reviewer: Employee, eventId: EventId, now: Timestamp): Transition<ReviewStarted, "reviewNotQueued"> {
  if (review.state !== "queued" || review.reviewerId !== reviewer.id) return { ok: false, reason: "reviewNotQueued" };
  const started: Review = { ...review, state: "reviewing", startedAt: now };
  return { ok: true, review: started, events: [{ ...base(started, eventId, now), type: "ReviewStarted", reviewerId: reviewer.id, reviewerName: reviewer.name }] };
}

export function settleReview(review: Review, reviewer: Employee, eventId: EventId, now: Timestamp): Transition<ReviewSettled, "reviewNotUnderWay"> {
  if (review.state !== "reviewing" || review.reviewerId !== reviewer.id) return { ok: false, reason: "reviewNotUnderWay" };
  const settled: Review = { ...review, state: "settled", settledAt: now };
  return { ok: true, review: settled, events: [{ ...base(settled, eventId, now), type: "ReviewSettled", reviewerId: reviewer.id, reviewerName: reviewer.name }] };
}

export const isOpen = (review: Review): boolean => review.state !== "settled" && review.state !== "withdrawn";

// A review lives inside `working`: once the work is finished, held or handed
// back, whatever was still open about it ends.
export function withdrawReview(review: Review, eventId: EventId, now: Timestamp): Transition<ReviewWithdrawn, "reviewNotOpen"> {
  if (!isOpen(review)) return { ok: false, reason: "reviewNotOpen" };
  const withdrawn: Review = { ...review, state: "withdrawn" };
  return { ok: true, review: withdrawn, events: [{ ...base(withdrawn, eventId, now), type: "ReviewWithdrawn" }] };
}

// A reviewer going on leave gives the review back to be offered to someone else.
export function releaseReview(review: Review, eventId: EventId, now: Timestamp): Transition<ReviewReleased, "reviewNotAsked"> {
  if (review.state !== "queued" && review.state !== "reviewing") return { ok: false, reason: "reviewNotAsked" };
  const released: Review = { ...review, state: "suggested", reviewerId: undefined, startedAt: undefined };
  return { ok: true, review: released, events: [{ ...base(released, eventId, now), type: "ReviewReleased" }] };
}

// Working and reviewing are both the one thing someone is on.
export type EmployeeStatus = "working" | "reviewing" | "available" | "onLeave";

// Reviews on work that is no longer in progress do not keep anyone.
export function liveReviews(tasks: readonly Task[], reviews: readonly Review[]): Review[] {
  const working = new Set(tasks.filter((t) => t.status === "working").map((t) => t.id));
  return reviews.filter((r) => isOpen(r) && working.has(r.taskId));
}

export function statusOf(employee: Employee, tasks: readonly Task[], reviews: readonly Review[]): EmployeeStatus {
  if (employee.availability === "onLeave") return "onLeave";
  if (liveReviews(tasks, reviews).some((r) => r.state === "reviewing" && r.reviewerId === employee.id)) return "reviewing";
  if (tasks.some((t) => t.status === "working" && t.assigneeId === employee.id)) return "working";
  return "available";
}
