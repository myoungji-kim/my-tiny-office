import { assert, beforeEach, describe, expect, it } from "vitest";

import { toCompanyId, toEventId, toRunId } from "../domain/ids";
import { finishWork } from "../domain/task";

import { createCompany } from "./company";
import type { AppContext } from "./context";
import { hireEmployee } from "./employee";
import { createProject, startProject } from "./project";
import { publishTask, type Publisher } from "./publish";
import { applyTask, createTask, pickUpWork } from "./task";
import { createTestContext, firstRole } from "./test-context";

const companyId = toCompanyId("company");
let ctx: AppContext;
let sent: { folder: string; title: string; body: string }[];

const publisher = (outcome: Awaited<ReturnType<Publisher["publish"]>>): Publisher => ({
  async publish(folder, _taskId, title, body) {
    sent.push({ folder, title, body });
    return outcome;
  },
});

beforeEach(async () => {
  ctx = createTestContext(() => 1_700_000_000_000);
  sent = [];
  await createCompany(ctx, { id: companyId, name: "TinySoft" });
});

// A task the user has applied, with what its run reported last.
async function applied() {
  assert((await hireEmployee(ctx, { companyId, name: "모카", species: "cat", roleId: await firstRole(ctx, companyId) })).ok);
  const project = await createProject(ctx, { companyId, name: "pay", priority: "normal", folder: "/code/pay" });
  assert(project.ok);
  assert((await startProject(ctx, project.value.project.id)).ok);
  const made = await createTask(ctx, { companyId, projectId: project.value.project.id, title: "Paginate", description: "Twenty a page.", priority: "normal" });
  assert(made.ok);
  assert((await pickUpWork(ctx, companyId)).ok);
  const finished = finishWork((await ctx.tasks.findById(made.value.task.id))!, toEventId("f"), 2);
  assert(finished.ok);
  await ctx.tasks.save(finished.task);
  await ctx.runSteps.add({ companyId, taskId: made.value.task.id, runId: toRunId("r1"), at: 1, kind: "say", detail: "Started." });
  await ctx.runSteps.add({ companyId, taskId: made.value.task.id, runId: toRunId("r1"), at: 3, kind: "say", detail: "Twenty a page now." });
  assert((await applyTask(ctx, made.value.task.id)).ok);
  return made.value.task.id;
}

describe("publishing applied work", () => {
  it("sends the task with its last report, and keeps where it went", async () => {
    const id = await applied();

    const published = await publishTask(ctx, publisher({ ok: true, url: "https://github.com/o/r/pull/7" }), id);

    expect(published).toMatchObject({ ok: true, value: { task: { publishedUrl: "https://github.com/o/r/pull/7" } } });
    expect(sent).toEqual([{ folder: "/code/pay", title: "Paginate", body: "Twenty a page.\n\n---\n\nTwenty a page now." }]);
    await expect(ctx.tasks.findById(id)).resolves.toMatchObject({ publishedUrl: "https://github.com/o/r/pull/7" });
  });

  it("keeps nothing when the push does not go through", async () => {
    const id = await applied();

    await expect(publishTask(ctx, publisher({ ok: false, reason: "pushFailed" }), id)).resolves.toEqual({ ok: false, reason: "pushFailed" });
    await expect(ctx.tasks.findById(id)).resolves.toMatchObject({ publishedUrl: undefined });
  });

  it("sends only applied work", async () => {
    assert((await hireEmployee(ctx, { companyId, name: "모카", species: "cat", roleId: await firstRole(ctx, companyId) })).ok);
    const project = await createProject(ctx, { companyId, name: "pay", priority: "normal", folder: "/code/pay" });
    assert(project.ok);
    const made = await createTask(ctx, { companyId, projectId: project.value.project.id, title: "Paginate", priority: "normal" });
    assert(made.ok);

    await expect(publishTask(ctx, publisher({ ok: true, url: "https://x" }), made.value.task.id)).resolves.toEqual({ ok: false, reason: "taskNotDone" });
    expect(sent).toEqual([]);
  });
});
