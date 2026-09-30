import { assert, describe, expect, it } from "vitest";

import type { Employee } from "./employee";
import { toAreaId, toCompanyId, toEmployeeId, toEventId, toProjectId, toReviewId, toRoleId, toTaskId } from "./ids";
import { pickUps, reviewsToStart } from "./pick-up";
import { NO_OWN, type Project } from "./project";
import { askReviewer, liveReviews, releaseReview, reviewerToAsk, settleReview, startQueuedReview, statusOf, suggestReview, withdrawReview, type Review } from "./review";
import type { Task } from "./task";

const t0 = 1_700_000_000_000;
const e = toEventId("e");
const companyId = toCompanyId("c");
const security = toAreaId("security");

const person = (id: string, extra: Partial<Employee> = {}): Employee => ({
  id: toEmployeeId(id),
  companyId,
  name: id,
  species: "cat",
  roleId: toRoleId("r"),
  teamId: undefined,
  availability: "available",
  leaveSince: undefined,
  returnedAt: undefined,
  hiredAt: t0,
  career: undefined,
  ...extra,
});

const pay: Project = {
  id: toProjectId("pay"),
  companyId,
  name: "pay",
  description: undefined,
  folder: "/code",
  folderConfirmed: true,
  commands: [],
  atlassian: false,
  writes: [],
  own: NO_OWN,
  status: "active",
  priority: "normal",
  heldReason: undefined,
  createdAt: t0,
  startedAt: t0,
  finishedAt: undefined,
};

const task = (id: string, extra: Partial<Task> = {}): Task => ({
  id: toTaskId(id),
  companyId,
  projectId: pay.id,
  title: id,
  description: undefined,
  area: security,
  priority: "normal",
  assigneeId: toEmployeeId("mocha"),
  status: "working",
  blocker: undefined,
  heldReason: undefined,
  heldFrom: undefined,
  heldWithProject: false,
  changesRequested: undefined,
  reviewerId: undefined,
  createdAt: t0,
  startedAt: t0,
  workedFor: 0,
  runningSince: t0,
  finishedAt: undefined,
  appliedAt: undefined,
  publishedUrl: undefined,
  revisedAt: undefined,
  ...extra,
});

const webhook = task("webhook");
const knowsSecurity = new Set([security]);

function suggested(): Review {
  const made = suggestReview({ id: toReviewId("r1"), task: webhook, othersWhoKnow: 1 }, e, t0);
  assert(made.ok);
  return made.review;
}

describe("review", () => {
  it("is suggested only on work in progress that names an area", () => {
    expect(suggested()).toMatchObject({ state: "suggested", reviewerId: undefined });
    expect(suggestReview({ id: toReviewId("r"), task: task("x", { area: undefined }), othersWhoKnow: 1 }, e, t0)).toMatchObject({ reason: "taskHasNoArea" });
    expect(suggestReview({ id: toReviewId("r"), task: task("x", { status: "approval" }), othersWhoKnow: 1 }, e, t0)).toMatchObject({ reason: "taskNotWorking" });
  });

  it("asks only someone taught the area, never the assignee or someone on leave", () => {
    const pip = person("pip");

    expect(askReviewer(suggested(), webhook, pip, new Set(), false, e, t0)).toMatchObject({ reason: "reviewerDoesNotKnowArea" });
    expect(askReviewer(suggested(), webhook, person("mocha"), knowsSecurity, false, e, t0)).toMatchObject({ reason: "reviewerIsAssignee" });
    expect(askReviewer(suggested(), webhook, person("pip", { availability: "onLeave" }), knowsSecurity, false, e, t0)).toMatchObject({
      reason: "reviewerOnLeave",
    });
  });

  it("starts now for someone free, and queues for someone busy until they are free", () => {
    const now = askReviewer(suggested(), webhook, person("pip"), knowsSecurity, false, e, t0 + 1);
    assert(now.ok);
    expect(now.review).toMatchObject({ state: "reviewing", reviewerId: "pip", startedAt: t0 + 1 });

    const later = askReviewer(suggested(), webhook, person("pip"), knowsSecurity, true, e, t0 + 1);
    assert(later.ok);
    expect(later.review).toMatchObject({ state: "queued", startedAt: undefined });
    const started = startQueuedReview(later.review, person("pip"), e, t0 + 9);
    assert(started.ok);
    expect(started.review).toMatchObject({ state: "reviewing", startedAt: t0 + 9 });

    const settled = settleReview(started.review, person("pip"), { verdict: "changes", comments: "retry 나눠 주세요" }, e, t0 + 20);
    assert(settled.ok);
    expect(settled.review).toMatchObject({ state: "settled", settledAt: t0 + 20 });
  });

  it("makes the reviewer someone on one thing at a time", () => {
    const reviewing = askReviewer(suggested(), webhook, person("pip"), knowsSecurity, false, e, t0);
    assert(reviewing.ok);
    const tasks = [webhook, task("next", { status: "backlog", assigneeId: undefined })];

    expect(statusOf(person("pip"), tasks, [reviewing.review])).toBe("reviewing");
    expect(statusOf(person("mocha"), tasks, [reviewing.review])).toBe("working");
    expect(pickUps([pay], tasks, [person("pip")], [reviewing.review])).toEqual([]);
  });

  it("is looked at before new work once the reviewer is free", () => {
    const queued = askReviewer(suggested(), webhook, person("pip"), knowsSecurity, true, e, t0);
    assert(queued.ok);
    const pipsOwn = task("pips-own", { assigneeId: toEmployeeId("pip") });
    const next = task("next", { status: "backlog", assigneeId: undefined });

    expect(reviewsToStart([webhook, pipsOwn], [queued.review], [person("pip")])).toEqual([]);
    expect(reviewsToStart([webhook, { ...pipsOwn, status: "approval" }, next], [queued.review], [person("pip")])).toEqual(["r1"]);
    expect(pickUps([pay], [webhook, next], [person("pip")], [queued.review])).toEqual([]);
  });
});

describe("two colleagues reviewing each other", () => {
  it("both start, since work waiting on its review keeps its author from nothing", () => {
    // mocha's webhook waits for pip, and pip's own work waits for mocha
    const pipsOwn = task("pips-own", { assigneeId: toEmployeeId("pip") });
    const forPip = askReviewer(suggested(), webhook, person("pip"), knowsSecurity, true, e, t0);
    const forMocha = askReviewer({ ...suggested(), id: toReviewId("r2"), taskId: pipsOwn.id }, pipsOwn, person("mocha"), knowsSecurity, true, e, t0 + 1);
    assert(forPip.ok && forMocha.ok);

    expect(reviewsToStart([webhook, pipsOwn], [forPip.review, forMocha.review], [person("pip"), person("mocha")])).toEqual(["r1", "r2"]);
  });
});

describe("a review that the work moved on from", () => {
  it("is not offered when nobody else knows the area", () => {
    expect(suggestReview({ id: toReviewId("r"), task: webhook, othersWhoKnow: 0 }, e, t0)).toMatchObject({ reason: "nobodyKnowsArea" });
  });

  it("keeps nobody once its task is no longer in progress, and can be withdrawn", () => {
    const reviewing = askReviewer(suggested(), webhook, person("pip"), knowsSecurity, false, e, t0);
    assert(reviewing.ok);
    const finished = { ...webhook, status: "approval" as const, runningSince: undefined, finishedAt: t0 };

    expect(liveReviews([finished], [reviewing.review])).toEqual([]);
    expect(statusOf(person("pip"), [finished], [reviewing.review])).toBe("available");

    const withdrawn = withdrawReview(reviewing.review, e, t0);
    assert(withdrawn.ok);
    expect(withdrawn.review.state).toBe("withdrawn");
    expect(withdrawReview(withdrawn.review, e, t0)).toMatchObject({ reason: "reviewNotOpen" });
  });

  it("goes back to be offered again when its reviewer goes on leave", () => {
    const queued = askReviewer(suggested(), webhook, person("pip"), knowsSecurity, true, e, t0);
    assert(queued.ok);

    const released = releaseReview(queued.review, e, t0);
    assert(released.ok);
    expect(released.review).toMatchObject({ state: "suggested", reviewerId: undefined });
  });
});

describe("who looks at finished work without being asked", () => {
  const bori = toEmployeeId("bori");
  const latte = toEmployeeId("latte");
  const done = (n: number, verdict: "approve" | "changes", by = bori): Review => ({
    id: toReviewId("r" + n),
    companyId,
    taskId: webhook.id,
    reviewerId: by,
    state: "settled",
    createdAt: t0 + n,
    startedAt: t0 + n,
    settledAt: t0 + n,
    verdict,
    comments: undefined,
  });

  it("is the reviewer named on the task, the first time", () => {
    expect(reviewerToAsk({ ...webhook, reviewerId: bori }, [])).toBe(bori);
    expect(reviewerToAsk(webhook, [])).toBeUndefined();
  });

  it("is whoever last asked for changes, to look at the fix", () => {
    expect(reviewerToAsk(webhook, [done(1, "changes", latte)])).toBe(latte);
    expect(reviewerToAsk({ ...webhook, reviewerId: bori }, [done(1, "changes"), done(2, "approve")])).toBeUndefined();
  });

  it("leaves it to the user after the last round", () => {
    expect(reviewerToAsk(webhook, [done(1, "changes"), done(2, "changes")])).toBe(bori);
    expect(reviewerToAsk(webhook, [done(1, "changes"), done(2, "changes"), done(3, "changes")])).toBeUndefined();
  });
});
