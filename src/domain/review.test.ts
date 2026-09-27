import { assert, describe, expect, it } from "vitest";

import type { Employee } from "./employee";
import { toAreaId, toCompanyId, toEmployeeId, toEventId, toMemoryId, toProjectId, toReviewId, toRoleId, toTaskId, toTeamId } from "./ids";
import { milestonesFor, type CompanyFacts } from "./milestone";
import { pickUps, reviewsToStart } from "./pick-up";
import type { Project } from "./project";
import { askReviewer, settleReview, startQueuedReview, statusOf, suggestReview, type Review } from "./review";
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
  hiredAt: t0,
  ...extra,
});

const pay: Project = {
  id: toProjectId("pay"),
  companyId,
  name: "pay",
  description: undefined,
  folder: "/code",
  commands: [],
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
  changesRequested: undefined,
  createdAt: t0,
  startedAt: t0,
  workedFor: 0,
  runningSince: t0,
  finishedAt: undefined,
  appliedAt: undefined,
  ...extra,
});

const webhook = task("webhook");
const knowsSecurity = new Set([security]);

function suggested(): Review {
  const made = suggestReview({ id: toReviewId("r1"), task: webhook }, e, t0);
  assert(made.ok);
  return made.review;
}

describe("review", () => {
  it("is suggested only on work in progress that names an area", () => {
    expect(suggested()).toMatchObject({ state: "suggested", reviewerId: undefined });
    expect(suggestReview({ id: toReviewId("r"), task: task("x", { area: undefined }) }, e, t0)).toMatchObject({ reason: "taskHasNoArea" });
    expect(suggestReview({ id: toReviewId("r"), task: task("x", { status: "approval" }) }, e, t0)).toMatchObject({ reason: "taskNotWorking" });
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

    const settled = settleReview(started.review, e, t0 + 20);
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

describe("milestonesFor", () => {
  const facts = (extra: Partial<CompanyFacts> = {}): CompanyFacts => ({
    hires: 1,
    tasksApplied: 0,
    reviewsSettled: 0,
    memories: 0,
    teamMembers: () => 0,
    teamFormed: () => false,
    ...extra,
  });
  const base = { eventId: e, occurredAt: t0, companyId };

  it("calls out the first hire, and forms a team with its first member once", () => {
    const hired = { ...base, type: "EmployeeHired" as const, employeeId: toEmployeeId("m"), employeeName: "모카", roleId: toRoleId("r"), teamId: toTeamId("t") };

    expect(milestonesFor(hired, facts({ teamMembers: () => 1 }))).toEqual([
      { kind: "joined", employeeId: "m", employeeName: "모카", first: true },
      { kind: "teamFormed", teamId: "t" },
    ]);
    expect(milestonesFor(hired, facts({ hires: 2, teamMembers: () => 1, teamFormed: () => true }))).toEqual([
      { kind: "joined", employeeId: "m", employeeName: "모카", first: false },
    ]);
  });

  it("marks the first task applied, then 10 · 50 · 100 · 500", () => {
    const applied = { ...base, type: "TaskApplied" as const, taskId: toTaskId("t"), taskTitle: "t" };

    expect(milestonesFor(applied, facts({ tasksApplied: 1 }))).toEqual([{ kind: "firstTaskDone" }]);
    expect(milestonesFor(applied, facts({ tasksApplied: 2 }))).toEqual([]);
    expect(milestonesFor(applied, facts({ tasksApplied: 50 }))).toEqual([{ kind: "tasksDone", count: 50 }]);
  });

  it("marks the first review settled and memory at 10 · 50 · 100", () => {
    const settled = { ...base, type: "ReviewSettled" as const, reviewId: toReviewId("r"), taskId: toTaskId("t"), reviewerId: toEmployeeId("p") };
    const taught = { ...base, type: "MemoryTaught" as const, memoryId: toMemoryId("m"), kind: "company" as const, employeeId: undefined, areaId: undefined };

    expect(milestonesFor(settled, facts({ reviewsSettled: 1 }))).toEqual([{ kind: "firstReview" }]);
    expect(milestonesFor(settled, facts({ reviewsSettled: 2 }))).toEqual([]);
    expect(milestonesFor(taught, facts({ memories: 10 }))).toEqual([{ kind: "memories", count: 10 }]);
    expect(milestonesFor(taught, facts({ memories: 11 }))).toEqual([]);
  });
});
