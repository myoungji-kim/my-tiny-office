import { afterEach, assert, beforeEach, describe, expect, it } from "vitest";

import type { Workspace } from "../../application/agent-runtime";
import { createCompany } from "../../application/company";
import type { AppContext } from "../../application/context";
import { hireEmployee } from "../../application/employee";
import { createProject, removeProject, startProject } from "../../application/project";
import { createTask, pickUpWork } from "../../application/task";
import { toAgentId, toCompanyId, toReviewId, toRunId } from "../../domain/ids";
import { startRun } from "../../domain/run";
import { createAppContext } from "../app-context";

import { createTestDatabase, type TestDatabase } from "./test-database";

const companyId = toCompanyId("c");
const workspace = { discard: async () => undefined, remove: async () => undefined } as unknown as Workspace;
let database: TestDatabase;
let ctx: AppContext;

beforeEach(async () => {
  database = createTestDatabase();
  ctx = createAppContext(database.handle);
  await createCompany(ctx, { id: companyId, name: "TinySoft" });
});

afterEach(() => database.cleanup());

describe("removing work on SQLite", () => {
  it("takes a project's tasks with everything they kept, in an order the file allows", async () => {
    const made = await createProject(ctx, { companyId, name: "pay", priority: "normal", folder: "/code/pay" });
    assert(made.ok);
    assert((await startProject(ctx, made.value.project.id)).ok);
    const written = await createTask(ctx, { companyId, projectId: made.value.project.id, title: "one", priority: "normal" });
    assert(written.ok);
    const hired = await hireEmployee(ctx, { companyId, name: "모카", species: "cat", roleId: (await ctx.roles.findByCompany(companyId))[0].id });
    assert(hired.ok);
    assert((await pickUpWork(ctx, companyId)).ok);
    const taskId = written.value.task.id;
    const agent = { id: toAgentId("a1"), companyId, employeeId: hired.value.employee.id, runtime: "claudeCode" as const, createdAt: 1 };
    await ctx.agents.save(agent);
    await ctx.runs.save(startRun({ id: toRunId("r1"), agent, taskId, sessionId: undefined }, 2));
    await ctx.runSteps.add({ companyId, taskId, runId: toRunId("r1"), at: 3, kind: "say", detail: "hi" });
    await ctx.requests.add({ companyId, taskId, at: 4, text: "more", kind: "sentBack" });
    await ctx.reviews.save({ id: toReviewId("v1"), companyId, taskId, reviewerId: undefined, state: "suggested", createdAt: 5, startedAt: undefined, settledAt: undefined, verdict: undefined, comments: undefined });

    assert((await removeProject(ctx, workspace, made.value.project.id)).ok);

    await expect(ctx.projects.findByCompany(companyId)).resolves.toEqual([]);
    await expect(ctx.tasks.findByCompany(companyId)).resolves.toEqual([]);
    await expect(ctx.runs.findByCompany(companyId)).resolves.toEqual([]);
    await expect(ctx.reviews.findByCompany(companyId)).resolves.toEqual([]);
    // the agent is the employee's, and stays with them
    await expect(ctx.agents.findByCompany(companyId)).resolves.toHaveLength(1);
  });
});
