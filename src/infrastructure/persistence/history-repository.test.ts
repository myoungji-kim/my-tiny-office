import { afterEach, assert, beforeEach, describe, expect, it } from "vitest";

import { createCompany } from "../../application/company";
import type { AppContext } from "../../application/context";
import { hireEmployee } from "../../application/employee";
import { teachMemory } from "../../application/memory";
import { createProject, startProject } from "../../application/project";
import { askForReview, settleReview, suggestReview } from "../../application/review";
import { createTask, pickUpWork } from "../../application/task";
import { toCompanyId, toReviewId } from "../../domain/ids";
import { createAppContext } from "../app-context";

import { createTestDatabase, type TestDatabase } from "./test-database";

const companyId = toCompanyId("c");
let database: TestDatabase;
let ctx: AppContext;

beforeEach(async () => {
  database = createTestDatabase();
  ctx = createAppContext(database.handle);
  await createCompany(ctx, { id: companyId, name: "TinySoft" });
});

afterEach(() => {
  database.cleanup();
});

describe("reviews and history on SQLite", () => {
  it("keep a review through its states, and the history it leaves", async () => {
    const roleId = (await ctx.roles.findByCompany(companyId))[0].id;
    const security = (await ctx.areas.findByCompany(companyId)).find((a) => a.starting === "security")!.id;
    const mocha = await hireEmployee(ctx, { companyId, name: "모카", species: "cat", roleId });
    const pip = await hireEmployee(ctx, { companyId, name: "삐약", species: "chick", roleId });
    assert(mocha.ok && pip.ok);
    assert((await teachMemory(ctx, { companyId, kind: "expertise", employeeId: pip.value.employee.id, areaId: security, text: "서명은 timingSafeEqual로" })).ok);
    const pay = await createProject(ctx, { companyId, name: "pay", priority: "normal", folder: "/code/pay" });
    assert(pay.ok);
    assert((await startProject(ctx, pay.value.project.id)).ok);
    const webhook = await createTask(ctx, { companyId, projectId: pay.value.project.id, title: "webhook", priority: "high", area: security });
    assert(webhook.ok);
    assert((await pickUpWork(ctx, companyId)).ok);

    const suggested = await suggestReview(ctx, webhook.value.task.id);
    assert(suggested.ok);
    const asked = await askForReview(ctx, suggested.value.review.id, pip.value.employee.id);
    assert(asked.ok);
    const settled = await settleReview(ctx, asked.value.review.id, { verdict: "approve", comments: undefined });
    assert(settled.ok);

    await expect(ctx.reviews.findById(asked.value.review.id)).resolves.toEqual(settled.value.review);
    const history = await ctx.milestones.findByCompany(companyId);
    expect(history.map((m) => m.kind)).toEqual(["founded", "joined", "joined", "firstReview"]);
    expect(history[1]).toMatchObject({ kind: "joined", employeeName: "모카", first: true });
  });

  it("refuses a review that skips its reviewer", async () => {
    const pay = await createProject(ctx, { companyId, name: "pay", priority: "normal" });
    assert(pay.ok);
    const task = await createTask(ctx, { companyId, projectId: pay.value.project.id, title: "t", priority: "low" });
    assert(task.ok);

    await expect(
      ctx.reviews.save({ id: toReviewId("r"), companyId, taskId: task.value.task.id, reviewerId: undefined, state: "reviewing", createdAt: 1, startedAt: 1, settledAt: undefined, verdict: undefined, comments: undefined }),
    ).rejects.toThrow();
  });
});
