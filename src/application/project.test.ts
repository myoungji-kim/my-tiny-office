import { assert, beforeEach, describe, expect, it } from "vitest";

import { toAgentId, toCompanyId, toEventId, toRunId, type AreaId, type ProjectId } from "../domain/ids";
import { NO_OWN } from "../domain/project";
import { startRun } from "../domain/run";
import { blockTask } from "../domain/task";

import { createCompany } from "./company";
import type { AppContext } from "./context";
import { hireEmployee } from "./employee";
import { teachMemory } from "./memory";
import { allowCommand, createProject, editProject, holdProject, resumeProject, startProject } from "./project";
import { askForReview, suggestReview } from "./review";
import { createTask, pickUpWork } from "./task";
import { createTestContext, firstRole } from "./test-context";

const companyId = toCompanyId("c");
let ctx: AppContext;
let pay: ProjectId;
let security: AreaId;

beforeEach(async () => {
  ctx = createTestContext();
  await createCompany(ctx, { id: companyId, name: "TinySoft" });
  security = (await ctx.areas.findByCompany(companyId)).find((a) => a.starting === "security")!.id;
  const made = await createProject(ctx, { companyId, name: "결제 개편", priority: "high", folder: "/code/pay", commands: ["npm test"] });
  assert(made.ok);
  pay = made.value.project.id;
  assert((await startProject(ctx, pay)).ok);
});

async function hire(name: string) {
  const hired = await hireEmployee(ctx, { companyId, name, species: "cat", roleId: await firstRole(ctx, companyId) });
  assert(hired.ok);
  return hired.value.employee;
}

async function inProgress(title: string) {
  const made = await createTask(ctx, { companyId, projectId: pay, title, priority: "normal", area: security });
  assert(made.ok);
  return made.value.task;
}

describe("holding a project", () => {
  it("holds its work in progress with the same reason and ends the reviews on it", async () => {
    await hire("모카");
    const pip = await hire("삐약");
    assert((await teachMemory(ctx, { companyId, kind: "expertise", employeeId: pip.id, areaId: security, text: "서명 비교" })).ok);
    const webhook = await inProgress("webhook");
    await inProgress("queued");
    assert((await pickUpWork(ctx, companyId)).ok);
    const suggested = await suggestReview(ctx, webhook.id);
    assert(suggested.ok);
    // 모카 took the webhook first; 삐약 took the second task and reviews after it
    assert((await askForReview(ctx, suggested.value.review.id, pip.id)).ok);

    const held = await holdProject(ctx, pay, "결제 개편을 먼저 끝내기로");
    assert(held.ok);

    const tasks = await ctx.tasks.findByCompany(companyId);
    expect(tasks.map((t) => [t.title, t.status, t.heldReason, t.heldWithProject])).toEqual([
      ["webhook", "held", "결제 개편을 먼저 끝내기로", true],
      ["queued", "held", "결제 개편을 먼저 끝내기로", true],
    ]);
    await expect(ctx.reviews.findById(suggested.value.review.id)).resolves.toMatchObject({ state: "withdrawn" });
  });

  it("gives that work back to whoever had it on resume, and leaves work held on its own", async () => {
    const mocha = await hire("모카");
    await inProgress("webhook");
    assert((await pickUpWork(ctx, companyId)).ok);
    const alone = await inProgress("held on its own");
    await ctx.tasks.save({ ...alone, status: "held", heldFrom: "backlog", heldReason: "its own reason" });
    assert((await holdProject(ctx, pay, "later")).ok);

    assert((await resumeProject(ctx, pay)).ok);

    const tasks = await ctx.tasks.findByCompany(companyId);
    expect(tasks.map((t) => [t.title, t.status, t.assigneeId])).toEqual([
      ["webhook", "backlog", mocha.id],
      ["held on its own", "held", undefined],
    ]);
  });
});

describe("allowing a command", () => {
  it("lets every task stopped on it carry on", async () => {
    await hire("모카");
    const webhook = await inProgress("webhook");
    assert((await pickUpWork(ctx, companyId)).ok);
    const working = (await ctx.tasks.findById(webhook.id))!;
    const blocked = blockTask(working, { kind: "commandNotAllowed", command: "npm run typecheck" }, toEventId("b"), 1);
    assert(blocked.ok);
    await ctx.tasks.save(blocked.task);

    const allowed = await allowCommand(ctx, pay, "npm run typecheck");
    assert(allowed.ok);

    expect(allowed.value.project.commands).toEqual(["npm test", "npm run typecheck"]);
    await expect(ctx.tasks.findById(webhook.id)).resolves.toMatchObject({ status: "working", blocker: undefined });
    expect(allowed.events.map((e) => e.type)).toEqual(["ProjectCommandAllowed", "TaskUnblocked"]);
  });
});

describe("editProject", () => {
  it("keeps the folder while work made in it waits to be applied", async () => {
    const mocha = await hire("모카");
    const made = await createTask(ctx, { companyId, projectId: pay, title: "Paginate", priority: "normal", assigneeId: mocha.id });
    assert(made.ok);
    const agent = { id: toAgentId("a"), companyId, employeeId: mocha.id, runtime: "claudeCode" as const, createdAt: 0 };
    await ctx.agents.save(agent);
    await ctx.runs.save(startRun({ id: toRunId("r"), agent, taskId: made.value.task.id, sessionId: undefined }, 0));
    await ctx.tasks.save({ ...made.value.task, status: "approval" });
    const details = { name: "결제 개편", description: undefined, folder: "/code/other", commands: [], atlassian: false, writes: [], own: NO_OWN, priority: "high" as const };

    await expect(editProject(ctx, pay, details)).resolves.toMatchObject({ ok: false, reason: "folderInUse" });
    await ctx.tasks.save({ ...made.value.task, status: "done" });
    await expect(editProject(ctx, pay, details)).resolves.toMatchObject({ ok: true });
  });
});
