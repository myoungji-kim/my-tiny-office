import { assert, describe, expect, it } from "vitest";

import type { Employee } from "./employee";
import { toCompanyId, toEmployeeId, toEventId, toProjectId, toRoleId, toTaskId } from "./ids";
import {
  applyTask,
  assignTask,
  blockTask,
  createTask,
  finishWork,
  holdTask,
  resumeTask,
  returnToBacklog,
  sendBack,
  startTask,
  timeTaken,
  unblockTask,
  type Task,
} from "./task";

const minute = 60_000;
const t0 = 1_700_000_000_000;
const eventId = toEventId("event-1");
const companyId = toCompanyId("company-1");

const mocha: Employee = {
  id: toEmployeeId("mocha"),
  companyId,
  name: "모카",
  species: "cat",
  roleId: toRoleId("r"),
  teamId: undefined,
  availability: "available",
  leaveSince: undefined,
  hiredAt: t0,
};
const tofu: Employee = { ...mocha, id: toEmployeeId("tofu"), name: "두부" };

function backlog(): Task {
  const created = createTask(
    { id: toTaskId("t1"), companyId, projectId: toProjectId("pay"), title: " Paginate the history ", priority: "high" },
    eventId,
    t0,
  );
  assert(created.ok);
  return created.task;
}

function working(at = t0): Task {
  const started = startTask(backlog(), mocha, eventId, at);
  assert(started.ok);
  return started.task;
}

describe("createTask", () => {
  it("starts in the backlog with no one on it and no time taken", () => {
    const task = backlog();

    expect(task).toMatchObject({ status: "backlog", title: "Paginate the history", assigneeId: undefined, workedFor: 0 });
    expect(timeTaken(task, t0 + 99 * minute)).toBe(0);
  });

  it("needs a title", () => {
    expect(createTask({ id: toTaskId("t"), companyId, projectId: toProjectId("p"), title: "  ", priority: "low" }, eventId, t0)).toEqual({
      ok: false,
      reason: "taskTitleRequired",
    });
  });
});

describe("assignTask", () => {
  it("names who will do backlog work without starting it", () => {
    const result = assignTask(backlog(), mocha, eventId, t0);
    assert(result.ok);

    expect(result.task).toMatchObject({ status: "backlog", assigneeId: mocha.id });
  });

  it("refuses someone on leave or from another company", () => {
    expect(assignTask(backlog(), { ...mocha, availability: "onLeave" }, eventId, t0)).toMatchObject({ reason: "employeeOnLeave" });
    expect(assignTask(backlog(), { ...mocha, companyId: toCompanyId("other") }, eventId, t0)).toMatchObject({ reason: "employeeFromAnotherCompany" });
  });

  it("refuses work that has left the backlog", () => {
    expect(assignTask(working(), tofu, eventId, t0)).toMatchObject({ reason: "taskNotAssignable" });
  });
});

describe("startTask", () => {
  it("puts the one who picks it up on it and starts the clock", () => {
    const task = working();

    expect(task).toMatchObject({ status: "working", assigneeId: mocha.id, startedAt: t0, runningSince: t0 });
    expect(timeTaken(task, t0 + 7 * minute)).toBe(7 * minute);
  });

  it("leaves work handed to someone else for them", () => {
    const handed = assignTask(backlog(), tofu, eventId, t0);
    assert(handed.ok);

    expect(startTask(handed.task, mocha, eventId, t0)).toMatchObject({ reason: "taskHasAnotherAssignee" });
  });
});

describe("the way to approval", () => {
  it("stops at approval with the time it took", () => {
    const done = finishWork(working(), eventId, t0 + 52 * minute);
    assert(done.ok);

    expect(done.task).toMatchObject({ status: "approval", finishedAt: t0 + 52 * minute, runningSince: undefined });
    expect(timeTaken(done.task, t0 + 500 * minute)).toBe(52 * minute);
  });

  it("is applied only by the user, from approval", () => {
    const done = finishWork(working(), eventId, t0 + minute);
    assert(done.ok);
    const applied = applyTask(done.task, eventId, t0 + 2 * minute);
    assert(applied.ok);

    expect(applied.task).toMatchObject({ status: "done", appliedAt: t0 + 2 * minute });
    expect(applyTask(working(), eventId, t0)).toMatchObject({ reason: "taskNotAwaitingApproval" });
  });

  it("goes back to whoever did it with the reason, and keeps the time already taken", () => {
    const done = finishWork(working(), eventId, t0 + 10 * minute);
    assert(done.ok);
    const back = sendBack(done.task, " split the retryable failures ", eventId, t0 + 11 * minute);
    assert(back.ok);

    expect(back.task).toMatchObject({ status: "backlog", assigneeId: mocha.id, changesRequested: "split the retryable failures" });
    expect(sendBack(done.task, " ", eventId, t0)).toMatchObject({ reason: "reasonRequired" });

    const again = startTask(back.task, mocha, eventId, t0 + 20 * minute);
    assert(again.ok);
    const redone = finishWork(again.task, eventId, t0 + 25 * minute);
    assert(redone.ok);
    expect(timeTaken(redone.task, t0 + 99 * minute)).toBe(15 * minute);
    expect(redone.task.changesRequested).toBeUndefined();
  });
});

describe("blocked", () => {
  it("is a mark on working work that pauses the clock", () => {
    const blocked = blockTask(working(), { kind: "commandNotAllowed", command: "npm run typecheck" }, eventId, t0 + 8 * minute);
    assert(blocked.ok);

    expect(blocked.task).toMatchObject({ status: "working", blocker: { kind: "commandNotAllowed" } });
    expect(timeTaken(blocked.task, t0 + 60 * minute)).toBe(8 * minute);
    expect(finishWork(blocked.task, eventId, t0 + 9 * minute)).toMatchObject({ reason: "taskBlocked" });

    const unblocked = unblockTask(blocked.task, eventId, t0 + 30 * minute);
    assert(unblocked.ok);
    expect(timeTaken(unblocked.task, t0 + 32 * minute)).toBe(10 * minute);
  });
});

describe("hold and resume", () => {
  it("parks work in progress with its reason and queues it again for whoever had it", () => {
    const held = holdTask(working(), "agree on the scope first", eventId, t0 + 5 * minute);
    assert(held.ok);
    expect(held.task).toMatchObject({ status: "held", heldReason: "agree on the scope first", runningSince: undefined });

    const resumed = resumeTask(held.task, eventId, t0 + 60 * minute);
    assert(resumed.ok);
    expect(resumed.task).toMatchObject({ status: "backlog", assigneeId: mocha.id, heldReason: undefined });
    expect(timeTaken(resumed.task, t0 + 90 * minute)).toBe(5 * minute);
  });

  it("brings finished work back waiting for approval", () => {
    const done = finishWork(working(), eventId, t0 + minute);
    assert(done.ok);
    const held = holdTask(done.task, "later", eventId, t0 + 2 * minute);
    assert(held.ok);
    const resumed = resumeTask(held.task, eventId, t0 + 3 * minute);
    assert(resumed.ok);

    expect(resumed.task.status).toBe("approval");
  });
});

describe("returnToBacklog", () => {
  it("frees work in progress for whoever is free", () => {
    const returned = returnToBacklog(working(), eventId, t0 + 4 * minute);
    assert(returned.ok);

    expect(returned.task).toMatchObject({ status: "backlog", assigneeId: undefined, workedFor: 4 * minute });
  });
});
