import { assert, describe, expect, it } from "vitest";

import type { Employee } from "./employee";
import { toCompanyId, toEmployeeId, toEventId, toTaskId } from "./ids";
import {
  assignTask,
  completeTask,
  createTask,
  settleTask,
  startTask,
  taskProgress,
  type CreateTaskInput,
} from "./task";

const minute = 60_000;

const companyId = toCompanyId("company-1");
const otherCompanyId = toCompanyId("company-2");
const eventId = toEventId("event-1");

const createdAt = 1_700_000_000_000;
const startedAt = createdAt + 5 * minute;
const estimatedDuration = 30 * minute;
const scheduledCompletedAt = startedAt + estimatedDuration;

const minsu: Employee = {
  id: toEmployeeId("employee-1"),
  companyId,
  name: "Min-su",
  role: "Backend Engineer",
  availability: "available",
  hiredAt: createdAt,
};

const jieun: Employee = { ...minsu, id: toEmployeeId("employee-2"), name: "Ji-eun" };
const alex: Employee = { ...minsu, id: toEmployeeId("employee-3"), availability: "onVacation" };
const outsider: Employee = { ...minsu, id: toEmployeeId("employee-4"), companyId: otherCompanyId };

const input: CreateTaskInput = {
  id: toTaskId("task-1"),
  companyId,
  title: "Payment API",
  priority: "normal",
  estimatedDuration,
};

const created = createTask(input, eventId, createdAt);
assert(created.ok);
const backlogTask = created.task;

const assigned = assignTask(backlogTask, minsu, eventId, createdAt);
assert(assigned.ok);
const readyTask = assigned.task;

const started = startTask(readyTask, minsu, eventId, startedAt);
assert(started.ok);
const workingTask = started.task;

const completed = completeTask(workingTask, minsu, eventId, scheduledCompletedAt);
assert(completed.ok);
const doneTask = completed.task;

describe("createTask", () => {
  it("creates an unassigned backlog task", () => {
    expect(backlogTask).toEqual({
      id: input.id,
      companyId,
      title: "Payment API",
      description: undefined,
      status: "backlog",
      priority: "normal",
      assigneeId: undefined,
      estimatedDuration,
      createdAt,
      startedAt: undefined,
      completedAt: undefined,
    });
  });

  it("emits TaskCreated", () => {
    expect(created.events).toEqual([
      {
        eventId,
        type: "TaskCreated",
        occurredAt: createdAt,
        companyId,
        taskId: input.id,
        taskTitle: "Payment API",
        priority: "normal",
        estimatedDuration,
      },
    ]);
  });

  it.each([0, -1, Number.NaN])("rejects an estimatedDuration of %s", (duration) => {
    const result = createTask({ ...input, estimatedDuration: duration }, eventId, createdAt);

    expect(result).toEqual({ ok: false, reason: "invalidEstimatedDuration" });
  });
});

describe("assignTask", () => {
  it("marks the task ready for the assignee", () => {
    expect(readyTask.status).toBe("ready");
    expect(readyTask.assigneeId).toBe(minsu.id);
  });

  it("emits TaskAssigned with the employee name", () => {
    expect(assigned.events).toEqual([
      {
        eventId,
        type: "TaskAssigned",
        occurredAt: createdAt,
        companyId,
        taskId: input.id,
        taskTitle: "Payment API",
        employeeId: minsu.id,
        employeeName: "Min-su",
      },
    ]);
  });

  it("leaves the original task untouched", () => {
    expect(backlogTask.status).toBe("backlog");
    expect(backlogTask.assigneeId).toBeUndefined();
  });

  it("reassigns a task that is still ready", () => {
    const result = assignTask(readyTask, jieun, eventId, createdAt);

    assert(result.ok);
    expect(result.task.assigneeId).toBe(jieun.id);
  });

  it("rejects an employee from another company", () => {
    const result = assignTask(backlogTask, outsider, eventId, createdAt);

    expect(result).toEqual({ ok: false, reason: "employeeFromAnotherCompany" });
  });

  it("rejects an employee on vacation", () => {
    const result = assignTask(backlogTask, alex, eventId, createdAt);

    expect(result).toEqual({ ok: false, reason: "employeeOnVacation" });
  });

  it.each([
    ["working", workingTask],
    ["done", doneTask],
  ])("rejects a task that is %s", (_status, task) => {
    const result = assignTask(task, minsu, eventId, createdAt);

    expect(result).toEqual({ ok: false, reason: "taskNotAssignable" });
  });
});

describe("startTask", () => {
  it("starts the task at the given time", () => {
    expect(workingTask.status).toBe("working");
    expect(workingTask.startedAt).toBe(startedAt);
  });

  it("emits TaskStarted", () => {
    expect(started.events).toEqual([
      {
        eventId,
        type: "TaskStarted",
        occurredAt: startedAt,
        companyId,
        taskId: input.id,
        taskTitle: "Payment API",
        employeeId: minsu.id,
        employeeName: "Min-su",
      },
    ]);
  });

  it("rejects a task that is not ready", () => {
    const result = startTask(backlogTask, minsu, eventId, startedAt);

    expect(result).toEqual({ ok: false, reason: "taskNotReady" });
  });

  it("rejects an employee who is not the assignee", () => {
    const result = startTask(readyTask, jieun, eventId, startedAt);

    expect(result).toEqual({ ok: false, reason: "employeeNotAssignee" });
  });
});

describe("completeTask", () => {
  it("completes the task at the given time", () => {
    expect(doneTask.status).toBe("done");
    expect(doneTask.completedAt).toBe(scheduledCompletedAt);
  });

  it("emits TaskCompleted with matching occurredAt and completedAt", () => {
    expect(completed.events).toEqual([
      {
        eventId,
        type: "TaskCompleted",
        occurredAt: scheduledCompletedAt,
        companyId,
        taskId: input.id,
        taskTitle: "Payment API",
        employeeId: minsu.id,
        employeeName: "Min-su",
        completedAt: scheduledCompletedAt,
      },
    ]);
  });

  it("rejects a task that is not working", () => {
    const result = completeTask(readyTask, minsu, eventId, scheduledCompletedAt);

    expect(result).toEqual({ ok: false, reason: "taskNotWorking" });
  });

  it("rejects an employee who is not the assignee", () => {
    const result = completeTask(workingTask, jieun, eventId, scheduledCompletedAt);

    expect(result).toEqual({ ok: false, reason: "employeeNotAssignee" });
  });
});

describe("settleTask", () => {
  const relaunchedAt = startedAt + 180 * minute;

  it("completes a task that finished while the application was closed", () => {
    const result = settleTask(workingTask, minsu, eventId, relaunchedAt);

    assert(result.ok);
    expect(result.task.status).toBe("done");
    expect(result.task.completedAt).toBe(scheduledCompletedAt);
  });

  it("records the scheduled completion time, not the time it was observed", () => {
    const result = settleTask(workingTask, minsu, eventId, relaunchedAt);

    assert(result.ok);
    expect(result.events[0].completedAt).toBe(scheduledCompletedAt);
    expect(result.events[0].occurredAt).toBe(relaunchedAt);
  });

  it("settles a task at the exact moment it becomes due", () => {
    const result = settleTask(workingTask, minsu, eventId, scheduledCompletedAt);

    assert(result.ok);
    expect(result.task.completedAt).toBe(scheduledCompletedAt);
  });

  it("rejects a task that is not due yet", () => {
    const result = settleTask(workingTask, minsu, eventId, scheduledCompletedAt - 1);

    expect(result).toEqual({ ok: false, reason: "taskNotDueYet" });
  });

  it("rejects a task that is not working", () => {
    const result = settleTask(readyTask, minsu, eventId, relaunchedAt);

    expect(result).toEqual({ ok: false, reason: "taskNotWorking" });
  });

  it("rejects an employee who is not the assignee", () => {
    const result = settleTask(workingTask, jieun, eventId, relaunchedAt);

    expect(result).toEqual({ ok: false, reason: "employeeNotAssignee" });
  });
});

describe("taskProgress", () => {
  it("is zero before the task starts", () => {
    expect(taskProgress(backlogTask, startedAt)).toBe(0);
    expect(taskProgress(readyTask, startedAt)).toBe(0);
  });

  it("is one when the task is done", () => {
    expect(taskProgress(doneTask, scheduledCompletedAt)).toBe(1);
  });

  it.each([
    [0, 0],
    [15 * minute, 0.5],
    [30 * minute, 1],
    [90 * minute, 1],
  ])("reports progress %s ms into the work", (elapsed, expected) => {
    expect(taskProgress(workingTask, startedAt + elapsed)).toBe(expected);
  });

  it("never reports negative progress", () => {
    expect(taskProgress(workingTask, startedAt - minute)).toBe(0);
  });
});
