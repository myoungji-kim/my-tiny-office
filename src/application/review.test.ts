import { assert, beforeEach, describe, expect, it } from "vitest";

import { toCompanyId, toEventId, type AreaId, type ProjectId } from "../domain/ids";
import { finishWork } from "../domain/task";

import { createCompany } from "./company";
import type { AppContext } from "./context";
import { hireEmployee, sendOnLeave } from "./employee";
import { forgetMemory, teachMemory } from "./memory";
import { addTeam, moveEmployee, removeTeam } from "./organisation";
import { createProject, finishProject, startProject } from "./project";
import { askForReview, settleReview, suggestReview } from "./review";
import { applyTask, createTask, holdTask, pickUpWork } from "./task";
import { createTestContext, firstRole } from "./test-context";

const companyId = toCompanyId("c");
let ctx: AppContext;
let now: number;
let security: AreaId;
let pay: ProjectId;

beforeEach(async () => {
  now = 1_700_000_000_000;
  ctx = createTestContext(() => now);
  await createCompany(ctx, { id: companyId, name: "TinySoft" });
  security = (await ctx.areas.findByCompany(companyId)).find((a) => a.starting === "security")!.id;
  const made = await createProject(ctx, { companyId, name: "결제 개편", priority: "high", folder: "/code/pay" });
  assert(made.ok);
  pay = made.value.project.id;
  assert((await startProject(ctx, pay)).ok);
});

async function hire(name: string, knowsSecurity = false) {
  const hired = await hireEmployee(ctx, { companyId, name, species: "cat", roleId: await firstRole(ctx, companyId) });
  assert(hired.ok);
  if (knowsSecurity) {
    assert((await teachMemory(ctx, { companyId, kind: "expertise", employeeId: hired.value.employee.id, areaId: security, text: "쿼리에 입력을 이어 붙이지 않아요" })).ok);
  }
  return hired.value.employee;
}

async function workInProgress(title = "결제 웹훅 서명 검증") {
  const made = await createTask(ctx, { companyId, projectId: pay, title, priority: "high", area: security });
  assert(made.ok);
  now += 1;
  return made.value.task;
}

describe("review", () => {
  it("starts now when the one who knows the area is free, and asks nobody who does not know it", async () => {
    // people pick up in the order they were hired
    const mocha = await hire("모카");
    const pip = await hire("삐약", true);
    const tofu = await hire("두부");
    const webhook = await workInProgress();
    const picked = await pickUpWork(ctx, companyId);
    assert(picked.ok);
    expect(picked.value.started).toMatchObject([{ id: webhook.id, assigneeId: mocha.id }]);

    const suggested = await suggestReview(ctx, webhook.id);
    assert(suggested.ok);
    await expect(askForReview(ctx, suggested.value.review.id, tofu.id)).resolves.toMatchObject({ reason: "reviewerDoesNotKnowArea" });
    await expect(askForReview(ctx, suggested.value.review.id, pip.id)).resolves.toMatchObject({
      ok: true,
      value: { review: { state: "reviewing", reviewerId: pip.id } },
    });
  });

  it("waits for a busy reviewer, who looks before taking anything new", async () => {
    const mocha = await hire("모카");
    const pip = await hire("삐약", true);
    const first = await workInProgress("first");
    const second = await workInProgress("second");
    const picked = await pickUpWork(ctx, companyId);
    assert(picked.ok);
    expect(picked.value.started.map((t) => t.assigneeId)).toEqual([mocha.id, pip.id]);

    const suggested = await suggestReview(ctx, first.id);
    assert(suggested.ok);
    const queued = await askForReview(ctx, suggested.value.review.id, pip.id);
    assert(queued.ok);
    expect(queued.value.review.state).toBe("queued");

    // 삐약 finishes their own task; a third one is waiting
    const pipsTask = (await ctx.tasks.findById(second.id))!;
    const done = finishWork(pipsTask, toEventId("f"), now);
    assert(done.ok);
    await ctx.tasks.save(done.task);
    await workInProgress("third");

    const next = await pickUpWork(ctx, companyId);
    assert(next.ok);
    expect(next.value.reviewing).toMatchObject([{ reviewerId: pip.id, state: "reviewing" }]);
    expect(next.value.started).toEqual([]);
  });

  it("never asks someone on leave, and suggests once per task", async () => {
    await hire("모카");
    const pip = await hire("삐약", true);
    const webhook = await workInProgress();
    assert((await pickUpWork(ctx, companyId)).ok);
    assert((await sendOnLeave(ctx, pip.id)).ok);

    const suggested = await suggestReview(ctx, webhook.id);
    assert(suggested.ok);
    await expect(suggestReview(ctx, webhook.id)).resolves.toMatchObject({ reason: "reviewAlreadyOpen" });
    await expect(askForReview(ctx, suggested.value.review.id, pip.id)).resolves.toMatchObject({ reason: "reviewerOnLeave" });
  });
});

describe("the history", () => {
  it("records what happens as it happens", async () => {
    const backend = await addTeam(ctx, companyId, { suggested: "backend" });
    assert(backend.ok);
    const mocha = await hire("모카");
    const pip = await hire("삐약", true);
    assert((await moveEmployee(ctx, mocha.id, backend.value.team.id)).ok);
    assert((await moveEmployee(ctx, pip.id, backend.value.team.id)).ok);

    const webhook = await workInProgress();
    assert((await pickUpWork(ctx, companyId)).ok);
    // 모카 was hired first and takes it; 삐약 reviews
    const suggested = await suggestReview(ctx, webhook.id);
    assert(suggested.ok);
    const asked = await askForReview(ctx, suggested.value.review.id, pip.id);
    assert(asked.ok);
    assert((await settleReview(ctx, asked.value.review.id)).ok);
    const working = (await ctx.tasks.findById(webhook.id))!;
    const done = finishWork(working, toEventId("f"), now);
    assert(done.ok);
    await ctx.tasks.save(done.task);
    assert((await applyTask(ctx, webhook.id)).ok);
    assert((await finishProject(ctx, pay)).ok);

    const kinds = (await ctx.milestones.findByCompany(companyId)).map((m) => m.kind);
    expect(kinds).toEqual([
      "founded",
      "joined",
      "joined",
      "teamFormed",
      "firstReview",
      "firstTaskDone",
      "projectFinished",
    ]);
    const history = await ctx.milestones.findByCompany(companyId);
    expect(history.filter((m) => m.kind === "joined")).toMatchObject([
      { employeeName: "모카", first: true },
      { employeeName: "삐약", first: false },
    ]);
  });
});

describe("a review when the work or the reviewer moves on", () => {
  it("is not offered when nobody besides the assignee knows the area", async () => {
    await hire("모카", true);
    const webhook = await workInProgress();
    assert((await pickUpWork(ctx, companyId)).ok);

    await expect(suggestReview(ctx, webhook.id)).resolves.toMatchObject({ reason: "nobodyKnowsArea" });
  });

  it("ends when its task is held, and the reviewer is free again", async () => {
    const mocha = await hire("모카");
    const pip = await hire("삐약", true);
    const webhook = await workInProgress();
    assert((await pickUpWork(ctx, companyId)).ok);
    const suggested = await suggestReview(ctx, webhook.id);
    assert(suggested.ok);
    const asked = await askForReview(ctx, suggested.value.review.id, pip.id);
    assert(asked.ok);

    assert((await holdTask(ctx, webhook.id, "after the release")).ok);

    await expect(ctx.reviews.findById(asked.value.review.id)).resolves.toMatchObject({ state: "withdrawn" });
    // both are free again: 모카 from the held task, 삐약 from the review
    await workInProgress("next");
    await workInProgress("after");
    const next = await pickUpWork(ctx, companyId);
    assert(next.ok);
    expect(next.value.started.map((t) => t.assigneeId)).toEqual([mocha.id, pip.id]);
  });

  it("goes back to be offered when its reviewer goes on leave", async () => {
    await hire("모카");
    const pip = await hire("삐약", true);
    const webhook = await workInProgress();
    assert((await pickUpWork(ctx, companyId)).ok);
    const suggested = await suggestReview(ctx, webhook.id);
    assert(suggested.ok);
    assert((await askForReview(ctx, suggested.value.review.id, pip.id)).ok);

    assert((await sendOnLeave(ctx, pip.id)).ok);

    await expect(ctx.reviews.findById(suggested.value.review.id)).resolves.toMatchObject({ state: "suggested", reviewerId: undefined });
  });
});

describe("the history keeps each mark once", () => {
  it("does not record 10 memories twice when one is forgotten and taught back", async () => {
    const mocha = await hire("모카");
    const teachOne = async (n: number) => {
      const taught = await teachMemory(ctx, { companyId, kind: "style", employeeId: mocha.id, text: "rule " + n });
      assert(taught.ok);
      return taught.value.memory;
    };
    const memories = [];
    for (let i = 0; i < 10; i++) memories.push(await teachOne(i));
    assert((await forgetMemory(ctx, companyId, memories[0].id)).ok);
    await teachOne(10);

    const marks = (await ctx.milestones.findByCompany(companyId)).filter((m) => m.kind === "memories");
    expect(marks).toHaveLength(1);
  });

  it("forms a team that people move into all at once", async () => {
    const backend = await addTeam(ctx, companyId, { suggested: "backend" });
    const old = await addTeam(ctx, companyId, { suggested: "frontend" });
    assert(backend.ok && old.ok);
    for (const name of ["모카", "두부"]) {
      const person = await hire(name);
      assert((await moveEmployee(ctx, person.id, old.value.team.id)).ok);
    }

    assert((await removeTeam(ctx, companyId, old.value.team.id, backend.value.team.id)).ok);

    const formed = (await ctx.milestones.findByCompany(companyId)).filter((m) => m.kind === "teamFormed");
    expect(formed.map((m) => m.kind === "teamFormed" && m.teamId)).toEqual([old.value.team.id, backend.value.team.id]);
  });
});
