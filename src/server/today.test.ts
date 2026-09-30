import { assert, describe, expect, it } from "vitest";

import { createCompany } from "../application/company";
import { hireEmployee } from "../application/employee";
import { teachMemory } from "../application/memory";
import { createProject, startProject } from "../application/project";
import { createTask, pickUpWork } from "../application/task";
import { createTestContext, firstRole } from "../application/test-context";
import { toAgentId, toCompanyId, toReviewId, toRunId } from "../domain/ids";
import { endRun, startRun } from "../domain/run";

import { todayOf, type TodayFacts } from "./today";

const companyId = toCompanyId("c");
// ten in the morning, local time
const now = new Date(2026, 8, 26, 10, 0).getTime();
const yesterday = now - 86_400_000;

async function office(clock: { at: number }) {
  const ctx = createTestContext(() => clock.at);
  await createCompany(ctx, { id: companyId, name: "TinySoft" });
  const mocha = await hireEmployee(ctx, { companyId, name: "모카", species: "cat", roleId: await firstRole(ctx, companyId) });
  assert(mocha.ok);
  const project = await createProject(ctx, { companyId, name: "pay", priority: "normal", folder: "/code/pay" });
  assert(project.ok && (await startProject(ctx, project.value.project.id)).ok);
  const task = await createTask(ctx, { companyId, projectId: project.value.project.id, title: "Paginate", priority: "normal", assigneeId: mocha.value.employee.id });
  assert(task.ok);
  return { ctx, mocha: mocha.value.employee, taskId: task.value.task.id };
}

const factsOf = async (ctx: Awaited<ReturnType<typeof office>>["ctx"]): Promise<TodayFacts> => ({
  tasks: await ctx.tasks.findByCompany(companyId),
  reviews: await ctx.reviews.findByCompany(companyId),
  runs: await ctx.runs.findByCompany(companyId),
  agents: await ctx.agents.findByCompany(companyId),
  memories: await ctx.memories.findByCompany(companyId),
  employees: await ctx.employees.findByCompany(companyId),
});

describe("todayOf", () => {
  it("lists only what happened since midnight, newest first", async () => {
    const clock = { at: yesterday };
    const { ctx, mocha, taskId } = await office(clock);
    const agent = { id: toAgentId("a"), companyId, employeeId: mocha.id, runtime: "claudeCode" as const, createdAt: yesterday };
    await ctx.agents.save(agent);
    await ctx.runs.save(startRun({ id: toRunId("r"), agent, taskId, sessionId: undefined }, now - 3_600_000));

    expect(todayOf(await factsOf(ctx), now).map((i) => i.kind)).toEqual(["started"]);
  });

  it("says who started a task by their own first run, and never counts a review as starting it", async () => {
    const clock = { at: yesterday };
    const { ctx, mocha, taskId } = await office(clock);
    const bori = await hireEmployee(ctx, { companyId, name: "보리", species: "bunny", roleId: await firstRole(ctx, companyId) });
    const dubu = await hireEmployee(ctx, { companyId, name: "두부", species: "cat", roleId: await firstRole(ctx, companyId) });
    assert(bori.ok && dubu.ok);
    const agentOf = async (id: string, employeeId: typeof mocha.id) => {
      const agent = { id: toAgentId(id), companyId, employeeId, runtime: "claudeCode" as const, createdAt: yesterday };
      await ctx.agents.save(agent);
      return agent;
    };
    const [a, b, d] = [await agentOf("a", mocha.id), await agentOf("b", bori.value.employee.id), await agentOf("d", dubu.value.employee.id)];
    // 모카 began it yesterday and carries on today; 보리 took it over today; 두부 reviews it
    await ctx.runs.save(startRun({ id: toRunId("r1"), agent: a, taskId, sessionId: undefined }, yesterday));
    await ctx.runs.save(startRun({ id: toRunId("r2"), agent: a, taskId, sessionId: undefined }, now - 7_200_000));
    await ctx.runs.save(startRun({ id: toRunId("r3"), agent: b, taskId, sessionId: undefined }, now - 3_600_000));
    await ctx.reviews.save({ id: toReviewId("v"), companyId, taskId, reviewerId: dubu.value.employee.id, state: "reviewing", createdAt: now - 60_000, startedAt: now - 60_000, settledAt: undefined, verdict: undefined, comments: undefined });
    await ctx.runs.save(startRun({ id: toRunId("r4"), agent: d, taskId, sessionId: undefined }, now - 60_000));

    const items = todayOf(await factsOf(ctx), now).filter((i) => i.kind === "started" || i.kind === "reviewStarted");
    expect(items.map((i) => [i.kind, i.who])).toEqual([
      ["reviewStarted", dubu.value.employee.id],
      ["started", bori.value.employee.id],
    ]);
  });

  it("says a stop waits on the user only while the task is still stopped there", async () => {
    const clock = { at: now - 7_200_000 };
    const { ctx, mocha, taskId } = await office(clock);
    assert((await pickUpWork(ctx, companyId)).ok);
    const agent = { id: toAgentId("a"), companyId, employeeId: mocha.id, runtime: "claudeCode" as const, createdAt: clock.at };
    await ctx.agents.save(agent);
    const [area] = await ctx.areas.findByCompany(companyId);
    const taught = await teachMemory(ctx, { companyId, kind: "expertise", employeeId: mocha.id, areaId: area.id, text: "Indexes care about order" });
    assert(taught.ok);
    const run = startRun({ id: toRunId("r"), agent, taskId, sessionId: undefined }, clock.at);
    await ctx.runs.save({ ...endRun(run, { kind: "denied", command: "npm run e2e" }, 0, now - 60_000), memoriesUsed: [taught.value.memory.id] });

    const items = todayOf(await factsOf(ctx), now);
    expect(items[0]).toMatchObject({ kind: "memoryUsed", who: mocha.id, memory: "Indexes care about order" });
    // nothing blocked the task in this test, so the stop no longer waits on anyone
    expect(items.find((i) => i.kind === "stopped")).toMatchObject({ who: mocha.id, task: { id: taskId }, open: false });
  });

  it("names a hire with experience, and how much they brought", async () => {
    const clock = { at: now - 600_000 };
    const ctx = createTestContext(() => clock.at);
    await createCompany(ctx, { id: companyId, name: "TinySoft" });
    const [area] = await ctx.areas.findByCompany(companyId);
    const career = { sessionId: "b477a1ec-4706-4cc4-b017-a887aedc242e", folder: "/code/tinysoft", from: yesterday, to: yesterday };
    const bori = await hireEmployee(ctx, {
      companyId,
      name: "보리",
      species: "bunny",
      roleId: await firstRole(ctx, companyId),
      career,
      brought: { expertise: [{ areaId: area.id, text: "Retries share a key." }], style: ["Small commits"] },
    });
    assert(bori.ok);

    expect(todayOf(await factsOf(ctx), now)).toMatchObject([{ kind: "hired", who: bori.value.employee.id, brought: { folder: "tinysoft", lines: 2 } }]);
  });
});
