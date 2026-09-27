import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, assert, beforeEach, describe, expect, it } from "vitest";

import { createCompany } from "../application/company";
import type { AppContext } from "../application/context";
import { hireEmployee } from "../application/employee";
import { assignTask, completeTask, createTask, startTask } from "../application/task";
import { toCompanyId, toEmployeeId, type CompanyId } from "../domain/ids";
import { createAppContext } from "../infrastructure/app-context";
import {
  createCompanyFiles,
  type CompanyFiles,
} from "../infrastructure/persistence/company-files";
import { writeSettings } from "../infrastructure/persistence/settings";
import { createSqliteTaskRepository } from "../infrastructure/persistence/task-repository";

import { loadOffice } from "./view-model";

const minute = 60_000;
const baseTime = 1_700_000_000_000;
const estimatedDuration = 30 * minute;

let directory: string;
let files: CompanyFiles;
let current: number;
// the context of the company seeded last
let ctx: AppContext;
let seeded = 0;

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), "my-tiny-office-"));
  files = createCompanyFiles(directory);
  current = baseTime;
});

afterEach(() => {
  files.close();
  rmSync(directory, { recursive: true, force: true });
});

const load = (selected?: string) => loadOffice(selected, { files, clock: () => current });

async function seedCompany(name = "TinySoft") {
  const id = toCompanyId(randomUUID());
  ctx = { ...createAppContext(files.create(id)), now: () => current };
  // each company founded a moment after the last, so "oldest" is well defined
  const founded = current + seeded++;
  const { company } = await createCompany({ ...ctx, now: () => founded }, { id, name, description: "A tiny office" });
  return company;
}

async function seedEmployee(companyId: CompanyId) {
  const hired = await hireEmployee(ctx, {
    companyId,
    name: "Min-su",
    role: "Backend Developer",
  });
  assert(hired.ok);
  return hired.value.employee;
}

describe("loadOffice", () => {
  it("reports no company on a fresh database", async () => {
    const office = await load();

    expect(office.company).toBeUndefined();
    expect(office.companies).toEqual([]);
  });

  it("selects the only company automatically", async () => {
    const company = await seedCompany();

    const office = await load();

    expect(office.company).toMatchObject({ id: company.id, name: "TinySoft" });
    expect(office.companies).toHaveLength(1);
  });

  it("selects the requested company when several exist", async () => {
    await seedCompany("TinySoft");
    const rival = await seedCompany("RivalSoft");

    const office = await load(rival.id);

    expect(office.company?.name).toBe("RivalSoft");
    expect(office.companies).toHaveLength(2);
  });

  it("shows a hired employee as available", async () => {
    const company = await seedCompany();
    await seedEmployee(company.id);

    const office = await load(company.id);

    expect(office.employees).toEqual([
      {
        id: expect.any(String),
        name: "Min-su",
        role: "Backend Developer",
        availability: "available",
        workingOn: undefined,
      },
    ]);
  });

  it("keeps each company in a file of its own", async () => {
    const tiny = await seedCompany("TinySoft");
    const rival = await seedCompany("RivalSoft");

    expect(files.ids()).toHaveLength(2);
    await expect(createAppContext(files.open(tiny.id)).companies.findAll()).resolves.toEqual([tiny]);
    await expect(createAppContext(files.open(rival.id)).companies.findAll()).resolves.toEqual([rival]);
  });

  it("opens the company opened last when none is asked for", async () => {
    await seedCompany("TinySoft");
    const rival = await seedCompany("RivalSoft");
    writeSettings(directory, { lastCompanyId: rival.id });

    const office = await load();

    expect(office.company?.name).toBe("RivalSoft");
  });

  it("falls back to the oldest company when the one asked for is not here", async () => {
    await seedCompany("TinySoft");
    await seedCompany("RivalSoft");

    const office = await load(randomUUID());

    expect(office.company?.name).toBe("TinySoft");
  });

  it("skips a file that holds no company yet", async () => {
    files.create(toCompanyId(randomUUID()));

    const office = await load();

    expect(office.company).toBeUndefined();
  });

  it("keeps the company data after the database is reopened", async () => {
    const company = await seedCompany();
    await seedEmployee(company.id);

    files.close();
    files = createCompanyFiles(directory);
    const office = await load(company.id);

    expect(office.company?.name).toBe("TinySoft");
    expect(office.employees).toHaveLength(1);
  });
});

describe("task lifecycle through the office view", () => {
  async function seedAssignedTask() {
    const company = await seedCompany();
    const employee = await seedEmployee(company.id);

    const created = await createTask(ctx, {
      companyId: company.id,
      title: "Implement payment API",
      description: "Add payment endpoint and validation",
      priority: "high",
      estimatedDuration,
    });
    assert(created.ok);

    return { company, employee, task: created.value.task };
  }

  it("shows a new task as unassigned backlog work", async () => {
    const { company } = await seedAssignedTask();

    const office = await load(company.id);

    expect(office.tasks).toEqual([
      {
        id: expect.any(String),
        title: "Implement payment API",
        description: "Add payment endpoint and validation",
        status: "backlog",
        priority: "high",
        assigneeId: undefined,
        assigneeName: undefined,
        progress: 0,
      },
    ]);
  });

  it("names the assignee once the task is assigned", async () => {
    const { company, employee, task } = await seedAssignedTask();

    const assigned = await assignTask(ctx, { taskId: task.id, employeeId: employee.id });
    assert(assigned.ok);

    const office = await load(company.id);

    expect(office.tasks[0]).toMatchObject({ status: "ready", assigneeName: "Min-su" });
  });

  it("derives progress from the clock while the task is being worked on", async () => {
    const { company, employee, task } = await seedAssignedTask();
    await assignTask(ctx, { taskId: task.id, employeeId: employee.id });
    await startTask(ctx, { taskId: task.id });

    current = baseTime + 15 * minute;
    const office = await load(company.id);

    expect(office.tasks[0]).toMatchObject({ status: "working", progress: 0.5 });
    expect(office.employees[0]).toMatchObject({ workingOn: "Implement payment API" });
  });

  it("shows a completed task as done", async () => {
    const { company, employee, task } = await seedAssignedTask();
    await assignTask(ctx, { taskId: task.id, employeeId: employee.id });
    await startTask(ctx, { taskId: task.id });

    current = baseTime + 10 * minute;
    const completed = await completeTask(ctx, { taskId: task.id });
    assert(completed.ok);

    const office = await load(company.id);

    expect(office.tasks[0]).toMatchObject({ status: "done", progress: 1 });
    expect(office.employees[0]).toMatchObject({ workingOn: undefined });
  });

  it("settles a task that became due while the office was closed", async () => {
    const { company, employee, task } = await seedAssignedTask();
    await assignTask(ctx, { taskId: task.id, employeeId: employee.id });
    await startTask(ctx, { taskId: task.id });

    current = baseTime + 5 * 60 * minute;
    const office = await load(company.id);

    expect(office.tasks[0]).toMatchObject({ status: "done" });
    await expect(
      createSqliteTaskRepository(files.open(company.id).db).findById(task.id),
    ).resolves.toMatchObject({ completedAt: baseTime + estimatedDuration });
  });

  it("ignores a task that belongs to another company", async () => {
    const { company } = await seedAssignedTask();
    const rival = await seedCompany("RivalSoft");
    const rivalTask = await createTask(ctx, {
      companyId: rival.id,
      title: "Rival work",
      priority: "low",
      estimatedDuration,
    });
    assert(rivalTask.ok);

    const office = await load(company.id);

    expect(office.tasks.map((task) => task.title)).toEqual(["Implement payment API"]);
  });
});

describe("createAppContext", () => {
  it("wires repositories that share the database", async () => {
    const id = toCompanyId(randomUUID());
    const context = createAppContext(files.create(id));
    const { company } = await createCompany(context, { id, name: "TinySoft" });

    await expect(context.companies.findById(company.id)).resolves.toMatchObject({
      name: "TinySoft",
    });
    await expect(context.employees.findById(toEmployeeId("missing"))).resolves.toBeUndefined();
  });
});
