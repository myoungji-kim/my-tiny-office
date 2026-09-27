import { assert, beforeEach, describe, expect, it } from "vitest";

import type { Employee } from "../domain/employee";
import { toCompanyId, toEventId, type ProjectId } from "../domain/ids";
import { finishWork } from "../domain/task";

import { createCompany } from "./company";
import type { AppContext } from "./context";
import { bringBack, hireEmployee, sendOnLeave } from "./employee";
import { allowCommand, createProject, finishProject, holdProject, startProject } from "./project";
import { createTestContext, firstRole } from "./test-context";
import { applyTask, assignTask, createTask, holdTask, pickUpWork, resumeTask, sendBack } from "./task";

const minute = 60_000;
const t0 = 1_700_000_000_000;
const companyId = toCompanyId("company");

let ctx: AppContext;
let now: number;

beforeEach(async () => {
  now = t0;
  ctx = createTestContext(() => now);
  await createCompany(ctx, { id: companyId, name: "TinySoft" });
});

async function project(options: { folder?: string; start?: boolean; priority?: "low" | "normal" | "high" } = {}): Promise<ProjectId> {
  const made = await createProject(ctx, { companyId, name: "결제 개편", priority: options.priority ?? "normal", folder: options.folder ?? "/code/pay" });
  assert(made.ok);
  if (options.start !== false) assert((await startProject(ctx, made.value.project.id)).ok);
  return made.value.project.id;
}

async function hire(name: string): Promise<Employee> {
  const hired = await hireEmployee(ctx, { companyId, name, species: "cat", roleId: await firstRole(ctx, companyId) });
  assert(hired.ok);
  return hired.value.employee;
}

async function task(projectId: ProjectId, title = "Paginate", priority: "low" | "normal" | "high" = "normal") {
  const made = await createTask(ctx, { companyId, projectId, title, priority });
  assert(made.ok);
  now += 1;
  return made.value.task;
}

describe("writing work down", () => {
  it("goes into a planned or active project and waits in the backlog", async () => {
    const planned = await project({ start: false });
    const written = await task(planned);

    expect(written).toMatchObject({ status: "backlog", projectId: planned });
  });

  it("is refused in a held or unknown project", async () => {
    const pay = await project();
    assert((await holdProject(ctx, pay, "later")).ok);

    await expect(createTask(ctx, { companyId, projectId: pay, title: "x", priority: "low" })).resolves.toMatchObject({ reason: "projectClosed" });
    await expect(createTask(ctx, { companyId, projectId: "nope" as ProjectId, title: "x", priority: "low" })).resolves.toMatchObject({
      reason: "projectNotFound",
    });
  });

  it("names an area only the company has", async () => {
    const pay = await project();

    await expect(createTask(ctx, { companyId, projectId: pay, title: "x", priority: "low", area: "nope" as never })).resolves.toMatchObject({
      reason: "areaNotFound",
    });
  });

  it("can name who takes it, and not someone on leave", async () => {
    const pay = await project();
    const mocha = await hire("모카");
    assert((await sendOnLeave(ctx, mocha.id)).ok);

    await expect(createTask(ctx, { companyId, projectId: pay, title: "x", priority: "low", assigneeId: mocha.id })).resolves.toMatchObject({
      reason: "employeeOnLeave",
    });
  });
});

describe("pickUpWork", () => {
  it("starts nothing in a planned project, and what is free once it starts", async () => {
    const pay = await project({ start: false });
    await task(pay);
    const mocha = await hire("모카");

    await expect(pickUpWork(ctx, companyId)).resolves.toMatchObject({ value: { started: [] } });

    assert((await startProject(ctx, pay)).ok);
    const picked = await pickUpWork(ctx, companyId);
    assert(picked.ok);
    expect(picked.value.started).toMatchObject([{ status: "working", assigneeId: mocha.id }]);
    expect(picked.events.map((e) => e.type)).toEqual(["TaskStarted"]);
  });

  it("gives each person one thing, the higher project first", async () => {
    const low = await project({ priority: "low" });
    const high = await project({ priority: "high" });
    const lowTask = await task(low, "low first written");
    const highTask = await task(high, "high");
    await hire("모카");

    const picked = await pickUpWork(ctx, companyId);
    assert(picked.ok);
    expect(picked.value.started.map((t) => t.id)).toEqual([highTask.id]);
    await expect(ctx.tasks.findById(lowTask.id)).resolves.toMatchObject({ status: "backlog" });

    const again = await pickUpWork(ctx, companyId);
    assert(again.ok);
    expect(again.value.started).toEqual([]);
  });

  it("leaves work handed to someone for them", async () => {
    const pay = await project();
    const mocha = await hire("모카");
    const tofu = await hire("두부");
    const forTofu = await task(pay);
    assert((await assignTask(ctx, { taskId: forTofu.id, employeeId: tofu.id })).ok);
    assert((await sendOnLeave(ctx, tofu.id)).ok);

    const picked = await pickUpWork(ctx, companyId);
    assert(picked.ok);
    // 모카 is free, but the only work was handed to 두부
    expect(picked.value.started).toEqual([]);
    expect(mocha.availability).toBe("available");
  });
});

describe("approval", () => {
  async function waitingForApproval() {
    const pay = await project();
    const mocha = await hire("모카");
    const written = await task(pay);
    assert((await pickUpWork(ctx, companyId)).ok);
    const working = (await ctx.tasks.findById(written.id))!;
    // what the runtime does when the run ends
    now += 52 * minute;
    const finished = finishWork(working, toEventId("finished"), now);
    assert(finished.ok);
    await ctx.tasks.save(finished.task);
    return { pay, mocha, task: finished.task };
  }

  it("applies finished work", async () => {
    const { task: done } = await waitingForApproval();

    const applied = await applyTask(ctx, done.id);
    assert(applied.ok);
    expect(applied.value.task).toMatchObject({ status: "done", appliedAt: now });
  });

  it("sends it back to whoever did it, who picks it up again", async () => {
    const { task: done, mocha } = await waitingForApproval();

    assert((await sendBack(ctx, done.id, "split the retryable failures")).ok);
    const picked = await pickUpWork(ctx, companyId);
    assert(picked.ok);
    expect(picked.value.started).toMatchObject([{ id: done.id, assigneeId: mocha.id, changesRequested: "split the retryable failures" }]);
  });

  it("holds and resumes it as finished work", async () => {
    const { task: done } = await waitingForApproval();

    assert((await holdTask(ctx, done.id, "after the release")).ok);
    const resumed = await resumeTask(ctx, done.id);
    assert(resumed.ok);
    expect(resumed.value.task.status).toBe("approval");
  });

  it("keeps a project from finishing while it waits", async () => {
    const { pay, task: done } = await waitingForApproval();

    await expect(finishProject(ctx, pay)).resolves.toMatchObject({ reason: "workStillOpen" });
    assert((await applyTask(ctx, done.id)).ok);
    await expect(finishProject(ctx, pay)).resolves.toMatchObject({ ok: true });
  });
});

describe("leave", () => {
  it("returns work in progress to the backlog, and the person comes back to nothing", async () => {
    const pay = await project();
    const mocha = await hire("모카");
    const written = await task(pay);
    assert((await pickUpWork(ctx, companyId)).ok);

    const away = await sendOnLeave(ctx, mocha.id);
    assert(away.ok);
    expect(away.value.employee).toMatchObject({ availability: "onLeave", leaveSince: now });
    expect(away.events.map((e) => e.type)).toEqual(["EmployeeWentOnLeave", "TaskReturned"]);
    await expect(ctx.tasks.findById(written.id)).resolves.toMatchObject({ status: "backlog", assigneeId: undefined });

    const back = await bringBack(ctx, mocha.id);
    assert(back.ok);
    expect(back.value.employee).toMatchObject({ availability: "available", leaveSince: undefined });
  });
});

describe("allowCommand", () => {
  it("adds an exact command to the project and refuses a pattern", async () => {
    const pay = await project();

    await expect(allowCommand(ctx, pay, "npm run typecheck")).resolves.toMatchObject({ value: { project: { commands: ["npm run typecheck"] } } });
    await expect(allowCommand(ctx, pay, "npm *")).resolves.toMatchObject({ reason: "commandNotAllowable" });
  });
});
