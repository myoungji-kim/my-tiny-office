import { afterEach, assert, beforeEach, describe, expect, it } from "vitest";

import { createCompany } from "../../application/company";
import type { AppContext } from "../../application/context";
import { hireEmployee } from "../../application/employee";
import { createProject } from "../../application/project";
import { createTask } from "../../application/task";
import { toAgentId, toRunId, type CompanyId, type TaskId } from "../../domain/ids";
import { endRun, sessionStarted, startRun, type Agent } from "../../domain/run";
import { createAppContext } from "../app-context";

import { createTestDatabase, type TestDatabase } from "./test-database";

let database: TestDatabase;
let ctx: AppContext;
let companyId: CompanyId;
let taskId: TaskId;
let agent: Agent;

beforeEach(async () => {
  database = createTestDatabase();
  ctx = createAppContext(database.handle);
  const company = await createCompany(ctx, { name: "TinySoft" });
  assert(company.ok);
  companyId = company.value.company.id;
  const roleId = (await ctx.roles.findByCompany(companyId))[0].id;
  const hired = await hireEmployee(ctx, { companyId, name: "모카", species: "cat", roleId });
  const project = await createProject(ctx, { companyId, name: "pay", priority: "normal", folder: "/code/pay" });
  assert(hired.ok && project.ok);
  const task = await createTask(ctx, { companyId, projectId: project.value.project.id, title: "Paginate", priority: "normal" });
  assert(task.ok);
  taskId = task.value.task.id;
  agent = { id: toAgentId("agent-1"), companyId, employeeId: hired.value.employee.id, runtime: "claudeCode", createdAt: 1 };
  await ctx.agents.save(agent);
});

afterEach(() => database.cleanup());

describe("runs on disk", () => {
  it("keep an agent per employee, and a run's session, end and cost", async () => {
    const run = startRun({ id: toRunId("run-1"), agent, taskId, sessionId: undefined }, 10);
    await ctx.runs.save(run);
    await ctx.runs.save(endRun(sessionStarted(run, "s-1"), { kind: "denied", command: "npm run e2e" }, 0.25, 20));

    await expect(ctx.agents.findByCompany(companyId)).resolves.toEqual([agent]);
    await expect(ctx.runs.findById(run.id)).resolves.toEqual({
      ...run,
      sessionId: "s-1",
      state: "ended",
      end: { kind: "denied", command: "npm run e2e" },
      costUsd: 0.25,
      endedAt: 20,
    });
    await expect(ctx.agents.save({ ...agent, id: toAgentId("agent-2") })).rejects.toThrow();
  });

  it("keep the kind of write a run was denied", async () => {
    const run = startRun({ id: toRunId("run-1"), agent, taskId, sessionId: undefined }, 10);
    await ctx.runs.save(endRun(run, { kind: "writeDenied", write: "jiraTransition" }, 0, 20));

    await expect(ctx.runs.findById(run.id)).resolves.toMatchObject({ end: { kind: "writeDenied", write: "jiraTransition" } });
  });

  it("hand back a task's newest steps first", async () => {
    const run = startRun({ id: toRunId("run-1"), agent, taskId, sessionId: undefined }, 10);
    await ctx.runs.save(run);
    for (const [at, detail] of [[1, "src/a.ts"], [2, "npm test"], [3, "src/b.ts"]] as const) {
      await ctx.runSteps.add({ companyId, taskId, runId: run.id, at, kind: "read", detail });
    }

    const steps = await ctx.runSteps.findByTask(companyId, taskId, 2);

    expect(steps.map((s) => s.detail)).toEqual(["src/b.ts", "npm test"]);
  });
});
