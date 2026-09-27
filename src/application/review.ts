import { toEventId, toReviewId, type EmployeeId, type ReviewId, type TaskId } from "../domain/ids";
import { expertiseOf } from "../domain/memory";
import * as reviewDomain from "../domain/review";

import type { AppContext, UseCaseResult } from "./context";
import { recordMilestones } from "./history";

type ReviewResult<TFailure extends string> = UseCaseResult<{ readonly review: reviewDomain.Review }, TFailure>;

const isOpen = (r: reviewDomain.Review) => r.state !== "settled";

export async function suggestReview(
  ctx: AppContext,
  taskId: TaskId,
): Promise<ReviewResult<"taskNotFound" | "reviewAlreadyOpen" | "taskNotWorking" | "taskHasNoArea">> {
  const task = await ctx.tasks.findById(taskId);
  if (task === undefined) return { ok: false, reason: "taskNotFound" };
  if ((await ctx.reviews.findByCompany(task.companyId)).some((r) => r.taskId === task.id && isOpen(r))) {
    return { ok: false, reason: "reviewAlreadyOpen" };
  }
  const made = reviewDomain.suggestReview({ id: toReviewId(ctx.newId()), task }, toEventId(ctx.newId()), ctx.now());
  if (!made.ok) return made;
  await ctx.reviews.save(made.review);
  return { ok: true, value: { review: made.review }, events: made.events };
}

export async function askForReview(
  ctx: AppContext,
  reviewId: ReviewId,
  reviewerId: EmployeeId,
): Promise<ReviewResult<"reviewNotFound" | "taskNotFound" | "employeeNotFound" | reviewDomain.AskFailure>> {
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
}

export async function settleReview(ctx: AppContext, reviewId: ReviewId): Promise<ReviewResult<"reviewNotFound" | "reviewNotUnderWay">> {
  const review = await ctx.reviews.findById(reviewId);
  if (review === undefined) return { ok: false, reason: "reviewNotFound" };
  const settled = reviewDomain.settleReview(review, toEventId(ctx.newId()), ctx.now());
  if (!settled.ok) return settled;
  await ctx.reviews.save(settled.review);
  await recordMilestones(ctx, review.companyId, settled.events);
  return { ok: true, value: { review: settled.review }, events: settled.events };
}
