import type { DomainEvent } from "../domain/events";
import { toEventId, toReviewId, type CompanyId, type EmployeeId, type ReviewId, type TaskId } from "../domain/ids";
import { expertiseOf } from "../domain/memory";
import * as reviewDomain from "../domain/review";
import * as taskDomain from "../domain/task";

import type { AppContext, UseCaseResult } from "./context";
import { recordMilestones } from "./history";

type ReviewResult<TFailure extends string> = UseCaseResult<{ readonly review: reviewDomain.Review }, TFailure>;

// Offered only when someone besides the assignee has been taught the area.
export function suggestReview(
  ctx: AppContext,
  taskId: TaskId,
): Promise<ReviewResult<"taskNotFound" | "reviewAlreadyOpen" | "taskNotWorking" | "taskHasNoArea" | "nobodyKnowsArea">> {
  return ctx.withTransaction(async () => {
    const task = await ctx.tasks.findById(taskId);
    if (task === undefined) return { ok: false, reason: "taskNotFound" };
    if ((await ctx.reviews.findByCompany(task.companyId)).some((r) => r.taskId === task.id && reviewDomain.isOpen(r))) {
      return { ok: false, reason: "reviewAlreadyOpen" };
    }
    const [employees, memories] = await Promise.all([ctx.employees.findByCompany(task.companyId), ctx.memories.findByCompany(task.companyId)]);
    const othersWhoKnow = employees.filter(
      (e) => e.id !== task.assigneeId && task.area !== undefined && expertiseOf(e.id, memories).has(task.area),
    ).length;

    const made = reviewDomain.suggestReview({ id: toReviewId(ctx.newId()), task, othersWhoKnow }, toEventId(ctx.newId()), ctx.now());
    if (!made.ok) return made;
    await ctx.reviews.save(made.review);
    return { ok: true, value: { review: made.review }, events: made.events };
  });
}

export function askForReview(
  ctx: AppContext,
  reviewId: ReviewId,
  reviewerId: EmployeeId,
): Promise<ReviewResult<"reviewNotFound" | "taskNotFound" | "employeeNotFound" | reviewDomain.AskFailure>> {
  return ctx.withTransaction(async () => {
    const review = await ctx.reviews.findById(reviewId);
    if (review === undefined) return { ok: false, reason: "reviewNotFound" };
    const task = await ctx.tasks.findById(review.taskId);
    if (task === undefined) return { ok: false, reason: "taskNotFound" };
    const reviewer = await ctx.employees.findById(reviewerId);
    if (reviewer === undefined || reviewer.companyId !== review.companyId) return { ok: false, reason: "employeeNotFound" };

    const [tasks, reviews, memories] = await Promise.all([
      ctx.tasks.findByCompany(review.companyId),
      ctx.reviews.findByCompany(review.companyId),
      ctx.memories.findByCompany(review.companyId),
    ]);
    const busy = reviewDomain.statusOf(reviewer, tasks, reviews) !== "available";
    const asked = reviewDomain.askReviewer(review, task, reviewer, expertiseOf(reviewer.id, memories), busy, toEventId(ctx.newId()), ctx.now());
    if (!asked.ok) return asked;
    await ctx.reviews.save(asked.review);
    return { ok: true, value: { review: asked.review }, events: asked.events };
  });
}

export function settleReview(
  ctx: AppContext,
  reviewId: ReviewId,
  outcome: { readonly verdict: reviewDomain.Verdict; readonly comments: string | undefined },
): Promise<ReviewResult<"reviewNotFound" | "reviewNotUnderWay">> {
  return ctx.withTransaction(async () => {
    const review = await ctx.reviews.findById(reviewId);
    if (review === undefined) return { ok: false, reason: "reviewNotFound" };
    const reviewer = review.reviewerId === undefined ? undefined : await ctx.employees.findById(review.reviewerId);
    if (reviewer === undefined) return { ok: false, reason: "reviewNotUnderWay" };
    const settled = reviewDomain.settleReview(review, reviewer, outcome, toEventId(ctx.newId()), ctx.now());
    if (!settled.ok) return settled;
    await ctx.reviews.save(settled.review);
    await recordMilestones(ctx, review.companyId, settled.events);
    return { ok: true, value: { review: settled.review }, events: settled.events };
  });
}

export type RequestReviewFailure =
  | "taskNotFound"
  | "employeeNotFound"
  | "reviewAlreadyOpen"
  | "taskNotAwaitingApproval"
  | reviewDomain.AskFailure
  | "taskHasNoArea"
  | "nobodyKnowsArea";

// Finished work goes back to being worked on while the colleague looks at it:
// straight away if they are free, once they finish if not. Everything is
// checked before anything is saved.
export function requestReview(ctx: AppContext, taskId: TaskId, reviewerId: EmployeeId): Promise<ReviewResult<RequestReviewFailure>> {
  return ctx.withTransaction(async () => {
    const task = await ctx.tasks.findById(taskId);
    if (task === undefined) return { ok: false, reason: "taskNotFound" };
    const reviewer = await ctx.employees.findById(reviewerId);
    if (reviewer === undefined || reviewer.companyId !== task.companyId) return { ok: false, reason: "employeeNotFound" };
    const [tasks, reviews, memories] = await Promise.all([
      ctx.tasks.findByCompany(task.companyId),
      ctx.reviews.findByCompany(task.companyId),
      ctx.memories.findByCompany(task.companyId),
    ]);
    if (reviews.some((r) => r.taskId === task.id && reviewDomain.isOpen(r))) return { ok: false, reason: "reviewAlreadyOpen" };

    const reopened = taskDomain.reopenForReview(task);
    if (!reopened.ok) return reopened;
    const now = ctx.now();
    const suggested = reviewDomain.suggestReview({ id: toReviewId(ctx.newId()), task: reopened.task, othersWhoKnow: 1 }, toEventId(ctx.newId()), now);
    if (!suggested.ok) return suggested;
    const busy = reviewDomain.statusOf(reviewer, tasks, reviews) !== "available";
    const asked = reviewDomain.askReviewer(suggested.review, reopened.task, reviewer, expertiseOf(reviewer.id, memories), busy, toEventId(ctx.newId()), now);
    if (!asked.ok) return asked;

    await ctx.tasks.save(reopened.task);
    await ctx.reviews.save(asked.review);
    return { ok: true, value: { review: asked.review }, events: [...suggested.events, ...asked.events] };
  });
}

// For use inside another use case's transaction, when work leaves `working`.
export async function withdrawReviewsOn(ctx: AppContext, companyId: CompanyId, taskIds: readonly TaskId[]): Promise<DomainEvent[]> {
  if (taskIds.length === 0) return [];
  const events: DomainEvent[] = [];
  for (const review of await ctx.reviews.findByCompany(companyId)) {
    if (!taskIds.includes(review.taskId)) continue;
    const withdrawn = reviewDomain.withdrawReview(review, toEventId(ctx.newId()), ctx.now());
    if (!withdrawn.ok) continue;
    await ctx.reviews.save(withdrawn.review);
    events.push(...withdrawn.events);
  }
  return events;
}
