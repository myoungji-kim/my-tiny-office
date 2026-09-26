import { assert, describe, expect, it } from "vitest";

import type { DomainEvent } from "../domain/events";
import { toCompanyId, toEmployeeId, toTaskId } from "../domain/ids";
import type { Task } from "../domain/task";

import { createCompany } from "./company";
import type { AppContext } from "./context";
import { hireEmployee } from "./employee";
import {
  createInMemoryCompanyRepository,
  createInMemoryEmployeeRepository,
  createInMemoryTaskRepository,
} from "./in-memory-repositories";
import { assignTask, completeTask, createTask, settleDueTasks, startTask } from "./task";

const minute = 60_000;
const baseTime = 1_700_000_000_000;
const estimatedDuration = 30 * minute;

interface TestContext {
  readonly ctx: AppContext;
  setNow(time: number): void;
  nowCalls(): number;
}

function createContext(): TestContext {
  let current = baseTime;
  let idCounter = 0;
  let calls = 0;

  const ctx: AppContext = {
    companies: createInMemoryCompanyRepository(),
    employees: createInMemoryEmployeeRepository(),
    tasks: createInMemoryTaskRepository(),
    now: () => {
      calls += 1;
      return current;
    },
    newId: () => `id-${(idCounter += 1)}`,
  };

  return {
    ctx,
    setNow: (time) => {
      current = time;
    },
    nowCalls: () => calls,
  };
}

async function seedCompanyEmployeeAndTask(t: TestContext) {
  const { company } = await createCompany(t.ctx, { name: "TinySoft" });

  const hired = await hireEmployee(t.ctx, {
    companyId: company.id,
    name: "Min-su",
    role: "Backend Engineer",
  });
  assert(hired.ok);

  const created = await createTask(t.ctx, {
    companyId: company.id,
    title: "Payment API",
    priority: "normal",
    estimatedDuration,
  });
  assert(created.ok);

  return { company, employee: hired.value.employee, task: created.value.task };
}

describe("task lifecycle", () => {
  it("runs the full company to completed task flow", async () => {
    const t = createContext();
    const startedAt = baseTime + 5 * minute;
    const completedAt = baseTime + 20 * minute;

    const { company, employee, task } = await seedCompanyEmployeeAndTask(t);
    expect(task.status).toBe("backlog");

    const assigned = await assignTask(t.ctx, { taskId: task.id, employeeId: employee.id });
    assert(assigned.ok);
    expect(assigned.value.task.status).toBe("ready");
    expect(assigned.value.task.assigneeId).toBe(employee.id);

    t.setNow(startedAt);
    const started = await startTask(t.ctx, { taskId: task.id });
    assert(started.ok);
    expect(started.value.task.status).toBe("working");
    expect(started.value.task.startedAt).toBe(startedAt);

    t.setNow(completedAt);
    const completed = await completeTask(t.ctx, { taskId: task.id });
    assert(completed.ok);
    expect(completed.value.task.status).toBe("done");
    expect(completed.value.task.completedAt).toBe(completedAt);

    await expect(t.ctx.tasks.findById(task.id)).resolves.toEqual(completed.value.task);
    await expect(t.ctx.companies.findById(company.id)).resolves.toEqual(company);
    await expect(t.ctx.tasks.findWorkingByCompany(company.id)).resolves.toEqual([]);
  });

  it("collects the domain events in order", async () => {
    const t = createContext();
    const events: DomainEvent[] = [];

    const { company, events: companyEvents } = await createCompany(t.ctx, { name: "TinySoft" });
    const hired = await hireEmployee(t.ctx, {
      companyId: company.id,
      name: "Min-su",
      role: "Backend Engineer",
    });
    assert(hired.ok);
    const created = await createTask(t.ctx, {
      companyId: company.id,
      title: "Payment API",
      priority: "normal",
      estimatedDuration,
    });
    assert(created.ok);
    const assigned = await assignTask(t.ctx, {
      taskId: created.value.task.id,
      employeeId: hired.value.employee.id,
    });
    assert(assigned.ok);
    const started = await startTask(t.ctx, { taskId: created.value.task.id });
    assert(started.ok);
    const completed = await completeTask(t.ctx, { taskId: created.value.task.id });
    assert(completed.ok);

    events.push(
      ...companyEvents,
      ...hired.events,
      ...created.events,
      ...assigned.events,
      ...started.events,
      ...completed.events,
    );

    expect(events.map((event) => event.type)).toEqual([
      "CompanyCreated",
      "EmployeeHired",
      "TaskCreated",
      "TaskAssigned",
      "TaskStarted",
      "TaskCompleted",
    ]);
    expect(events.every((event) => event.companyId === company.id)).toBe(true);
    expect(assigned.events[0]).toMatchObject({
      taskTitle: "Payment API",
      employeeName: "Min-su",
    });
  });
});

describe("createTask", () => {
  it("rejects a company that does not exist", async () => {
    const t = createContext();

    const result = await createTask(t.ctx, {
      companyId: toCompanyId("missing"),
      title: "Payment API",
      priority: "normal",
      estimatedDuration,
    });

    expect(result).toEqual({ ok: false, reason: "companyNotFound" });
  });

  it("propagates the domain rejection for a non-positive duration", async () => {
    const t = createContext();
    const { company } = await createCompany(t.ctx, { name: "TinySoft" });

    const result = await createTask(t.ctx, {
      companyId: company.id,
      title: "Payment API",
      priority: "normal",
      estimatedDuration: 0,
    });

    expect(result).toEqual({ ok: false, reason: "invalidEstimatedDuration" });
  });
});

describe("assignTask", () => {
  it("rejects a task that does not exist", async () => {
    const t = createContext();
    const { employee } = await seedCompanyEmployeeAndTask(t);

    const result = await assignTask(t.ctx, {
      taskId: toTaskId("missing"),
      employeeId: employee.id,
    });

    expect(result).toEqual({ ok: false, reason: "taskNotFound" });
  });

  it("rejects an employee that does not exist", async () => {
    const t = createContext();
    const { task } = await seedCompanyEmployeeAndTask(t);

    const result = await assignTask(t.ctx, {
      taskId: task.id,
      employeeId: toEmployeeId("missing"),
    });

    expect(result).toEqual({ ok: false, reason: "employeeNotFound" });
  });

  it("rejects an employee from another company", async () => {
    const t = createContext();
    const { task } = await seedCompanyEmployeeAndTask(t);

    const { company: rival } = await createCompany(t.ctx, { name: "RivalSoft" });
    const outsider = await hireEmployee(t.ctx, {
      companyId: rival.id,
      name: "Sam",
      role: "Backend Engineer",
    });
    assert(outsider.ok);

    const result = await assignTask(t.ctx, {
      taskId: task.id,
      employeeId: outsider.value.employee.id,
    });

    expect(result).toEqual({ ok: false, reason: "employeeFromAnotherCompany" });
  });

  it("rejects an employee on vacation", async () => {
    const t = createContext();
    const { employee, task } = await seedCompanyEmployeeAndTask(t);
    await t.ctx.employees.save({ ...employee, availability: "onVacation" });

    const result = await assignTask(t.ctx, { taskId: task.id, employeeId: employee.id });

    expect(result).toEqual({ ok: false, reason: "employeeOnVacation" });
  });

  it("does not save a new task state when it is rejected", async () => {
    const t = createContext();
    const { employee, task } = await seedCompanyEmployeeAndTask(t);
    await t.ctx.employees.save({ ...employee, availability: "onVacation" });

    await assignTask(t.ctx, { taskId: task.id, employeeId: employee.id });

    await expect(t.ctx.tasks.findById(task.id)).resolves.toEqual(task);
  });
});

describe("startTask", () => {
  it("rejects a task that does not exist", async () => {
    const t = createContext();

    const result = await startTask(t.ctx, { taskId: toTaskId("missing") });

    expect(result).toEqual({ ok: false, reason: "taskNotFound" });
  });

  it("rejects a task that has no assignee", async () => {
    const t = createContext();
    const { task } = await seedCompanyEmployeeAndTask(t);

    const result = await startTask(t.ctx, { taskId: task.id });

    expect(result).toEqual({ ok: false, reason: "taskHasNoAssignee" });
  });

  it("propagates the domain rejection for a task that is already done", async () => {
    const t = createContext();
    const { employee, task } = await seedCompanyEmployeeAndTask(t);

    await assignTask(t.ctx, { taskId: task.id, employeeId: employee.id });
    await startTask(t.ctx, { taskId: task.id });
    await completeTask(t.ctx, { taskId: task.id });

    const result = await startTask(t.ctx, { taskId: task.id });

    expect(result).toEqual({ ok: false, reason: "taskNotReady" });
  });
});

describe("completeTask", () => {
  it("propagates the domain rejection for a task that is not working", async () => {
    const t = createContext();
    const { employee, task } = await seedCompanyEmployeeAndTask(t);
    await assignTask(t.ctx, { taskId: task.id, employeeId: employee.id });

    const result = await completeTask(t.ctx, { taskId: task.id });

    expect(result).toEqual({ ok: false, reason: "taskNotWorking" });
  });
});

describe("settleDueTasks", () => {
  async function seedWorkingTask(t: TestContext) {
    const { company, employee, task } = await seedCompanyEmployeeAndTask(t);
    await assignTask(t.ctx, { taskId: task.id, employeeId: employee.id });
    const started = await startTask(t.ctx, { taskId: task.id });
    assert(started.ok);

    return { company, employee, task: started.value.task };
  }

  it("rejects a company that does not exist", async () => {
    const t = createContext();

    const result = await settleDueTasks(t.ctx, { companyId: toCompanyId("missing") });

    expect(result).toEqual({ ok: false, reason: "companyNotFound" });
  });

  it("completes a task that became due while the application was closed", async () => {
    const t = createContext();
    const { company, task } = await seedWorkingTask(t);
    const scheduledCompletedAt = baseTime + estimatedDuration;
    const relaunchedAt = baseTime + 5 * 60 * minute;

    t.setNow(relaunchedAt);
    const result = await settleDueTasks(t.ctx, { companyId: company.id });

    assert(result.ok);
    expect(result.value.settledTasks).toHaveLength(1);
    expect(result.value.settledTasks[0].completedAt).toBe(scheduledCompletedAt);
    await expect(t.ctx.tasks.findById(task.id)).resolves.toMatchObject({ status: "done" });
  });

  it("records the scheduled completion time and the time it was observed", async () => {
    const t = createContext();
    const { company } = await seedWorkingTask(t);
    const relaunchedAt = baseTime + 5 * 60 * minute;

    t.setNow(relaunchedAt);
    const result = await settleDueTasks(t.ctx, { companyId: company.id });

    assert(result.ok);
    expect(result.events).toEqual([
      expect.objectContaining({
        type: "TaskCompleted",
        occurredAt: relaunchedAt,
        completedAt: baseTime + estimatedDuration,
      }),
    ]);
  });

  it("leaves a task that is not due yet untouched", async () => {
    const t = createContext();
    const { company, task } = await seedWorkingTask(t);

    t.setNow(baseTime + estimatedDuration - 1);
    const result = await settleDueTasks(t.ctx, { companyId: company.id });

    assert(result.ok);
    expect(result.value.settledTasks).toEqual([]);
    expect(result.events).toEqual([]);
    await expect(t.ctx.tasks.findById(task.id)).resolves.toMatchObject({ status: "working" });
  });

  it("settles several tasks in scheduled completion order", async () => {
    const t = createContext();
    const { company, employee } = await seedWorkingTask(t);

    const shorter = await createTask(t.ctx, {
      companyId: company.id,
      title: "Fix typo",
      priority: "low",
      estimatedDuration: 10 * minute,
    });
    assert(shorter.ok);
    await assignTask(t.ctx, { taskId: shorter.value.task.id, employeeId: employee.id });

    t.setNow(baseTime + 5 * minute);
    await startTask(t.ctx, { taskId: shorter.value.task.id });

    t.setNow(baseTime + 5 * 60 * minute);
    const result = await settleDueTasks(t.ctx, { companyId: company.id });

    assert(result.ok);
    expect(result.value.settledTasks.map((task) => task.title)).toEqual([
      "Fix typo",
      "Payment API",
    ]);
    expect(result.events.map((event) => event.occurredAt)).toEqual([
      baseTime + 5 * 60 * minute,
      baseTime + 5 * 60 * minute,
    ]);
  });

  it("reads the clock once for the whole settlement", async () => {
    const t = createContext();
    const { company } = await seedWorkingTask(t);

    t.setNow(baseTime + 5 * 60 * minute);
    const callsBefore = t.nowCalls();
    await settleDueTasks(t.ctx, { companyId: company.id });

    expect(t.nowCalls() - callsBefore).toBe(1);
  });

  it("rejects a working task that has no assignee", async () => {
    const t = createContext();
    const { company } = await seedWorkingTask(t);
    await t.ctx.tasks.save(inconsistentTask(company.id, { assigneeId: undefined }));

    t.setNow(baseTime + 5 * 60 * minute);
    const result = await settleDueTasks(t.ctx, { companyId: company.id });

    expect(result).toEqual({ ok: false, reason: "taskHasNoAssignee" });
  });

  it("rejects a working task whose assignee no longer exists", async () => {
    const t = createContext();
    const { company } = await seedWorkingTask(t);
    await t.ctx.tasks.save(
      inconsistentTask(company.id, { assigneeId: toEmployeeId("gone") }),
    );

    t.setNow(baseTime + 5 * 60 * minute);
    const result = await settleDueTasks(t.ctx, { companyId: company.id });

    expect(result).toEqual({ ok: false, reason: "employeeNotFound" });
  });

  it("rejects a working task that was never started", async () => {
    const t = createContext();
    const { company } = await seedWorkingTask(t);
    await t.ctx.tasks.save(
      inconsistentTask(company.id, { assigneeId: toEmployeeId("gone"), startedAt: undefined }),
    );

    t.setNow(baseTime + 5 * 60 * minute);
    const result = await settleDueTasks(t.ctx, { companyId: company.id });

    expect(result).toEqual({ ok: false, reason: "taskNotWorking" });
  });

  it("saves nothing when one of the due tasks is inconsistent", async () => {
    const t = createContext();
    const { company, task } = await seedWorkingTask(t);
    await t.ctx.tasks.save(inconsistentTask(company.id, { assigneeId: undefined }));

    t.setNow(baseTime + 5 * 60 * minute);
    await settleDueTasks(t.ctx, { companyId: company.id });

    await expect(t.ctx.tasks.findById(task.id)).resolves.toEqual(task);
  });
});

function inconsistentTask(
  companyId: Task["companyId"],
  overrides: Partial<Task>,
): Task {
  return {
    id: toTaskId("broken"),
    companyId,
    title: "Broken",
    description: undefined,
    status: "working",
    priority: "normal",
    assigneeId: toEmployeeId("employee-x"),
    estimatedDuration,
    createdAt: baseTime,
    startedAt: baseTime,
    completedAt: undefined,
    ...overrides,
  };
}
