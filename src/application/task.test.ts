import { assert, beforeEach, describe, expect, it } from "vitest";

import type { Employee } from "../domain/employee";
import { toCompanyId, toEventId, type ProjectId } from "../domain/ids";
import { finishWork } from "../domain/task";

import { createCompany } from "./company";
import type { AppContext } from "./context";
import { bringBack, hireEmployee, sendOnLeave } from "./employee";
import { allowCommand, createProject, finishProject, holdProject, startProject } from "./project";
import { createTestContext, firstRole } from "./test-context";
import type { Workspace } from "./agent-runtime";
import { applyTask, assignTask, createTask, editTask, holdTask, pickUpWork, removeTask, resumeTask, sendBack } from "./task";
import { removeProject } from "./project";

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

describe("editing work", () => {
  it("rewrites work nobody is running and hands it to someone else, or to whoever is free", async () => {
    const pay = await project();
    const planned = await project({ start: false });
    const mocha = await hire("모카");
    const written = await task(pay);
    const details = { projectId: planned, title: " Paginate history ", description: undefined, area: undefined, priority: "high" as const, assigneeId: mocha.id, reviewerId: undefined };

    const edited = await editTask(ctx, written.id, details);

    expect(edited).toMatchObject({ ok: true, value: { task: { projectId: planned, title: "Paginate history", priority: "high", assigneeId: mocha.id } } });
    await expect(editTask(ctx, written.id, { ...details, assigneeId: undefined })).resolves.toMatchObject({ ok: true, value: { task: { assigneeId: undefined } } });
  });

  it("changes running work for whoever has it, hands it over by starting over, and keeps its project", async () => {
    const pay = await project();
    const other = await project();
    const mocha = await hire("모카");
    const bori = await hire("보리");
    const running = await task(pay);
    assert((await assignTask(ctx, { taskId: running.id, employeeId: mocha.id })).ok);
    assert((await pickUpWork(ctx, companyId)).ok);
    const details = { projectId: pay, title: "Paginate by cursor", description: undefined, area: undefined, priority: "low" as const, assigneeId: mocha.id, reviewerId: undefined };

    now += minute;
    await expect(editTask(ctx, running.id, details)).resolves.toMatchObject({ ok: true, value: { task: { status: "working", title: "Paginate by cursor", revisedAt: now } } });
    // what the agent does not read does not restart it
    const revised = now;
    now += minute;
    await expect(editTask(ctx, running.id, { ...details, priority: "high" })).resolves.toMatchObject({ ok: true, value: { task: { priority: "high", revisedAt: revised } } });
    await expect(editTask(ctx, running.id, { ...details, projectId: other })).resolves.toEqual({ ok: false, reason: "projectLockedWhileRunning" });
    await expect(editTask(ctx, running.id, { ...details, assigneeId: bori.id })).resolves.toMatchObject({ ok: true, value: { task: { status: "backlog", assigneeId: bori.id } } });
  });

  it("leaves closed projects alone", async () => {
    const pay = await project();
    const done = await project();
    assert((await finishProject(ctx, done)).ok);
    const waiting = await task(pay);
    const details = { projectId: pay, title: "x", description: undefined, area: undefined, priority: "low" as const, assigneeId: undefined, reviewerId: undefined };

    await expect(editTask(ctx, waiting.id, { ...details, projectId: done })).resolves.toEqual({ ok: false, reason: "projectClosed" });
  });
});

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


  it("frees work handed to someone who went on leave", async () => {
    const pay = await project();
    const mocha = await hire("모카");
    const tofu = await hire("두부");
    const forTofu = await task(pay);
    assert((await assignTask(ctx, { taskId: forTofu.id, employeeId: tofu.id })).ok);
    assert((await sendOnLeave(ctx, tofu.id)).ok);

    const picked = await pickUpWork(ctx, companyId);
    assert(picked.ok);
    // 두부 is on leave, so the work handed to them is anyone's again
    expect(picked.value.started).toMatchObject([{ assigneeId: mocha.id }]);
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

  it("keeps the request it was sent back with, for its conversation", async () => {
    const { task: done } = await waitingForApproval();

    assert((await sendBack(ctx, done.id, "  split the retryable failures ")).ok);

    await expect(ctx.requests.findByTask(companyId, done.id)).resolves.toEqual([{ companyId, taskId: done.id, at: now, text: "split the retryable failures", kind: "sentBack" }]);
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

describe("throwing work away", () => {
  const thrown: string[] = [];
  const kept: string[] = [];
  const workspace = { discard: async (_: string, id: string) => void thrown.push(id), remove: async (_: string, id: string) => void kept.push(id) } as unknown as Workspace;

  it("deletes a task that is not finished, and refuses one that is", async () => {
    const pay = await project();
    const written = await task(pay);
    await ctx.requests.add({ companyId, taskId: written.id, at: now, text: "more", kind: "sentBack" });

    assert((await removeTask(ctx, workspace, written.id)).ok);
    await expect(ctx.tasks.findById(written.id)).resolves.toBeUndefined();
    await expect(ctx.requests.findByTask(companyId, written.id)).resolves.toEqual([]);
    expect(thrown).toContain(written.id);

    const done = await task(pay, "Done");
    await ctx.tasks.save({ ...done, status: "done", assigneeId: (await hire("모카")).id, startedAt: now, finishedAt: now, appliedAt: now });
    await expect(removeTask(ctx, workspace, done.id)).resolves.toEqual({ ok: false, reason: "taskNotRemovable" });
  });

  it("deletes a project with its tasks, and keeps an applied task's branch", async () => {
    const pay = await project();
    const open = await task(pay, "Open");
    const done = await task(pay, "Done");
    await ctx.tasks.save({ ...done, status: "done", assigneeId: (await hire("보리")).id, startedAt: now, finishedAt: now, appliedAt: now });

    assert((await removeProject(ctx, workspace, pay)).ok);
    await expect(ctx.projects.findById(pay)).resolves.toBeUndefined();
    await expect(ctx.tasks.findByCompany(companyId)).resolves.toEqual([]);
    expect(thrown).toContain(open.id);
    expect(kept).toContain(done.id);
    expect(thrown).not.toContain(done.id);
  });
});
