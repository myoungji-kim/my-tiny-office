import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, assert, beforeEach, describe, expect, it } from "vitest";

import { createCompany } from "../application/company";
import type { AppContext } from "../application/context";
import { hireEmployee, letGo } from "../application/employee";
import { createProject, startProject } from "../application/project";
import { assignTask, createTask, pickUpWork } from "../application/task";
import { toCompanyId, toEmployeeId, type CompanyId } from "../domain/ids";
import { createAppContext } from "../infrastructure/app-context";
import {
  createCompanyFiles,
  type CompanyFiles,
} from "../infrastructure/persistence/company-files";
import { writeSettings } from "../infrastructure/persistence/settings";

import { loadOffice } from "./view-model";

const minute = 60_000;
const baseTime = 1_700_000_000_000;

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
  const created = await createCompany({ ...ctx, now: () => founded }, { id, name, description: "A tiny office" });
  assert(created.ok);
  return created.value.company;
}

async function seedEmployee(companyId: CompanyId) {
  const hired = await hireEmployee(ctx, {
    companyId,
    name: "Min-su",
    species: "cat",
    roleId: (await ctx.roles.findByCompany(companyId))[0].id,
  });
  assert(hired.ok);
  return hired.value.employee;
}

describe("loadOffice", () => {
  it("keeps someone let go out of every list, and names them on what they did", async () => {
    const company = await seedCompany();
    const employee = await seedEmployee(company.id);
    const project = await createProject(ctx, { companyId: company.id, name: "pay", priority: "normal", folder: "/code/pay" });
    assert(project.ok);
    const task = await createTask(ctx, { companyId: company.id, projectId: project.value.project.id, title: "Paginate", priority: "normal" });
    assert(task.ok);
    await ctx.tasks.save({ ...task.value.task, status: "done", assigneeId: employee.id, startedAt: current, finishedAt: current, appliedAt: current });
    assert((await letGo(ctx, employee.id)).ok);

    const office = await load();

    expect(office.employees).toEqual([]);
    expect(office.former).toEqual([{ id: employee.id, name: "Min-su", species: "cat" }]);
    expect(office.tasks[0]).toMatchObject({ assigneeName: "Min-su" });
  });

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
        species: expect.any(String),
        role: "Backend Engineer",
        roleId: expect.any(String),
        teamId: undefined,
        hiredAt: expect.any(Number),
        finished: 0,
        reviewed: 0,
        worked: false,
        status: "available",
        agentLost: false,
        task: undefined,
        review: undefined,
        lastFinished: undefined,
        leaveSince: undefined,
      },
    ]);
  });

  it("keeps each company in a file of its own", async () => {
    const tiny = await seedCompany("TinySoft");
    const rival = await seedCompany("RivalSoft");

    expect(files.ids()).toHaveLength(2);
    await expect(createAppContext(files.open(tiny.id)).companies.findById(tiny.id)).resolves.toEqual(tiny);
    await expect(createAppContext(files.open(tiny.id)).companies.findById(rival.id)).resolves.toBeUndefined();
    await expect(createAppContext(files.open(rival.id)).companies.findById(rival.id)).resolves.toEqual(rival);
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

describe("work through the office view", () => {
  async function seedWork() {
    const company = await seedCompany();
    const employee = await seedEmployee(company.id);
    const made = await createProject(ctx, { companyId: company.id, name: "결제 개편", priority: "high", folder: "/code/pay" });
    assert(made.ok);
    const created = await createTask(ctx, {
      companyId: company.id,
      projectId: made.value.project.id,
      title: "Implement payment API",
      description: "Add payment endpoint and validation",
      priority: "high",
    });
    assert(created.ok);
    return { company, employee, project: made.value.project, task: created.value.task };
  }

  it("shows a new task as unassigned backlog work in its project", async () => {
    const { company } = await seedWork();

    const office = await load(company.id);

    expect(office.projects).toMatchObject([{ name: "결제 개편", status: "planned", priority: "high" }]);
    expect(office.tasks).toEqual([
      {
        id: expect.any(String),
        projectId: office.projects[0].id,
        projectName: "결제 개편",
        area: undefined,
        title: "Implement payment API",
        description: "Add payment endpoint and validation",
        status: "backlog",
        priority: "high",
        assigneeId: undefined,
        assigneeName: undefined,
        minutesTaken: 0,
        blocker: undefined,
        heldReason: undefined,
        heldWithProject: false,
        createdAt: expect.any(Number),
      },
    ]);
  });

  it("names the assignee once the task is assigned", async () => {
    const { company, employee, task } = await seedWork();
    assert((await assignTask(ctx, { taskId: task.id, employeeId: employee.id })).ok);

    const office = await load(company.id);

    expect(office.tasks[0]).toMatchObject({ status: "backlog", assigneeName: "Min-su" });
  });

  it("shows the time work has taken, and who is on it", async () => {
    const { company, project } = await seedWork();
    assert((await startProject(ctx, project.id)).ok);
    assert((await pickUpWork(ctx, company.id)).ok);

    current = baseTime + 23 * minute;
    const office = await load(company.id);

    expect(office.tasks[0]).toMatchObject({ status: "working", minutesTaken: 23 });
    expect(office.employees[0]).toMatchObject({ task: { title: "Implement payment API" } });
  });

  it("marks whoever's agent was lost mid-task, and only them", async () => {
    const { company, project } = await seedWork();
    assert((await startProject(ctx, project.id)).ok);
    assert((await pickUpWork(ctx, company.id)).ok);
    expect((await load(company.id)).employees[0]).toMatchObject({ agentLost: false });

    const [task] = await ctx.tasks.findByCompany(company.id);
    await ctx.tasks.save({ ...task, blocker: { kind: "disconnected" } });

    expect((await load(company.id)).employees[0]).toMatchObject({ status: "working", agentLost: true });
  });

  it("never starts work by itself when the office is opened", async () => {
    const { company, project } = await seedWork();
    assert((await startProject(ctx, project.id)).ok);

    current = baseTime + 5 * 60 * minute;
    const office = await load(company.id);

    expect(office.tasks[0]).toMatchObject({ status: "backlog", minutesTaken: 0 });
  });
});

describe("createAppContext", () => {
  it("wires repositories that share the database", async () => {
    const id = toCompanyId(randomUUID());
    const context = createAppContext(files.create(id));
    const created = await createCompany(context, { id, name: "TinySoft" });
    assert(created.ok);
    const { company } = created.value;

    await expect(context.companies.findById(company.id)).resolves.toMatchObject({
      name: "TinySoft",
    });
    await expect(context.employees.findById(toEmployeeId("missing"))).resolves.toBeUndefined();
  });
});
