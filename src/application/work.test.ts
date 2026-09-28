import { assert, beforeEach, describe, expect, it } from "vitest";

import { toCompanyId, type TaskId } from "../domain/ids";

import type { AgentEvent, AgentRuntime, LaunchInput, Workspace } from "./agent-runtime";
import { createCompany } from "./company";
import type { AppContext } from "./context";
import { hireEmployee } from "./employee";
import { teachMemory } from "./memory";
import { allowCommand, createProject, startProject } from "./project";
import { approveTask, carryOn, createTask, holdTask, sendBack, settleSuggestion } from "./task";
import { createTestContext, firstRole } from "./test-context";
import { createWorkSupervisor, type WorkSupervisor } from "./work";

const companyId = toCompanyId("company");
const SESSION = "b477a1ec-4706-4cc4-b017-a887aedc242e";

interface Launched {
  readonly input: LaunchInput;
  emit(event: AgentEvent): void;
  exit(): void;
  stopped: boolean;
}

let ctx: AppContext;
let launched: Launched[];
let workspaceWorks: boolean;
// runs while a worktree is being prepared, as a user acting meanwhile would
let whilePreparing: (taskId: string) => Promise<void>;
let committed: string[];
let ready: boolean;
let picksUp: boolean;
let supervisor: WorkSupervisor;

const runtime: AgentRuntime = {
  launch(input, onEvent, onExit) {
    const run: Launched = {
      input,
      emit: onEvent,
      exit: onExit,
      stopped: false,
    };
    launched.push(run);
    return {
      stop: () => {
        run.stopped = true;
        onExit();
      },
    };
  },
};

const workspace: Workspace = {
  prepare: async (folder, taskId) => {
    await whilePreparing(taskId);
    return workspaceWorks ? { ok: true, path: `${folder}/.worktrees/${taskId}` } : { ok: false };
  },
  commit: async (_, taskId, message) => {
    committed.push(`${taskId}:${message}`);
    return true;
  },
  remove: async () => undefined,
};

beforeEach(async () => {
  ctx = createTestContext();
  launched = [];
  committed = [];
  workspaceWorks = true;
  whilePreparing = async () => undefined;
  ready = true;
  picksUp = true;
  supervisor = createWorkSupervisor({ runtime, workspace, companies: () => [{ companyId, ctx }], ready: async () => ready, picksUp: () => picksUp });
  await createCompany(ctx, { id: companyId, name: "TinySoft" });
});

// A company with one person and one task waiting in a started project.
async function oneTask(): Promise<TaskId> {
  const hired = await hireEmployee(ctx, { companyId, name: "모카", species: "cat", roleId: await firstRole(ctx, companyId) });
  assert(hired.ok);
  const project = await createProject(ctx, { companyId, name: "pay", priority: "normal", folder: "/code/pay", commands: ["npm test"] });
  assert(project.ok);
  assert((await startProject(ctx, project.value.project.id)).ok);
  const task = await createTask(ctx, { companyId, projectId: project.value.project.id, title: "Paginate", description: "Twenty a page.", priority: "normal" });
  assert(task.ok);
  return task.value.task.id;
}

// Ticks until what the runs reported has all been written.
const settle = async () => {
  for (let i = 0; i < 3; i += 1) await supervisor.kick();
};
const statusOf = async (id: TaskId) => ctx.tasks.findById(id);

describe("the work supervisor", () => {
  it("runs picked-up work in its worktree and brings it to approval", async () => {
    const id = await oneTask();
    assert((await teachMemory(ctx, { companyId, kind: "company", text: "커밋은 conventional prefix로" })).ok);

    await settle();
    const [run] = launched;
    expect(run.input).toMatchObject({ cwd: `/code/pay/.worktrees/${id}`, commands: ["npm test"], resume: undefined, prompt: "Task: Paginate\n\nTwenty a page." });
    expect(run.input.memory).toContain("1. 커밋은 conventional prefix로");

    run.emit({ kind: "session", sessionId: SESSION });
    run.emit({ kind: "step", step: "edit", detail: "src/pay.ts" });
    run.emit({ kind: "result", outcome: "finished", costUsd: 0.05, report: undefined });
    run.exit();
    await settle();

    expect(await statusOf(id)).toMatchObject({ status: "approval", blocker: undefined });
    expect(await ctx.runs.findByCompany(companyId)).toMatchObject([{ state: "ended", end: { kind: "finished" }, sessionId: SESSION, costUsd: 0.05 }]);
    expect(await ctx.runSteps.findByTask(companyId, id, 10)).toMatchObject([{ kind: "edit", detail: "src/pay.ts" }]);
    expect(launched).toHaveLength(1);
  });

  it("records which memories the agent said it drew on, and shows the report without that line", async () => {
    const id = await oneTask();
    assert((await teachMemory(ctx, { companyId, kind: "company", text: "커밋은 conventional prefix로" })).ok);
    assert((await teachMemory(ctx, { companyId, kind: "company", text: "테스트를 먼저 써요" })).ok);
    await settle();
    expect(launched[0].input.memory).toContain("Memories used: 2, 5");

    launched[0].emit({ kind: "result", outcome: "finished", costUsd: 0, report: "Paginated.\nMemories used: 2" });
    launched[0].exit();
    await settle();

    const [run] = await ctx.runs.findByCompany(companyId);
    const memories = await ctx.memories.findByCompany(companyId);
    expect(run.memoriesUsed).toEqual([memories[1].id]);
    expect(await ctx.runSteps.findByTask(companyId, id, 10)).toMatchObject([{ kind: "say", detail: "Paginated." }]);
  });

  it("keeps what the agent thought worth remembering until the user settles it", async () => {
    const id = await oneTask();
    await settle();
    expect(launched[0].input.memory).toContain("Worth remembering:");

    launched[0].emit({ kind: "result", outcome: "finished", costUsd: 0, report: "Done.\nWorth remembering: 테스트는 npm test로 돌려요" });
    launched[0].exit();
    await settle();

    const [run] = await ctx.runs.findByCompany(companyId);
    expect(run.suggestions).toEqual(["테스트는 npm test로 돌려요"]);
    expect(await ctx.runSteps.findByTask(companyId, id, 10)).toMatchObject([{ kind: "say", detail: "Done." }]);

    assert((await settleSuggestion(ctx, run.id, "테스트는 npm test로 돌려요")).ok);
    expect((await ctx.runs.findById(run.id))?.suggestions).toEqual([]);
  });

  it("stops on a command the project does not allow, and carries on in the same session once it is allowed", async () => {
    const id = await oneTask();
    await settle();
    launched[0].emit({ kind: "session", sessionId: SESSION });
    launched[0].emit({ kind: "denied", command: "npm run e2e" });
    await settle();

    expect(launched[0].stopped).toBe(true);
    expect(await statusOf(id)).toMatchObject({ status: "working", blocker: { kind: "commandNotAllowed", command: "npm run e2e" } });

    const task = await statusOf(id);
    assert(task !== undefined);
    assert((await allowCommand(ctx, task.projectId, "npm run e2e")).ok);
    await settle();

    expect(launched[1].input).toMatchObject({ resume: SESSION, prompt: "`npm run e2e` is allowed now. Carry on with the task.", commands: ["npm test", "npm run e2e"] });
  });

  it("carries on without a command the user does not allow, and tells the agent how commands run", async () => {
    const id = await oneTask();
    await settle();
    expect(launched[0].input.memory).toContain("never cd");
    expect(launched[0].input.memory).toContain("`npm test`");
    launched[0].emit({ kind: "session", sessionId: SESSION });
    launched[0].emit({ kind: "denied", command: "cd x && git status" });
    await settle();

    assert((await carryOn(ctx, id)).ok);
    await settle();

    expect(launched[1].input).toMatchObject({ resume: SESSION, prompt: "The user did not allow `cd x && git status`. Carry on with the task without it." });
  });

  it("marks a run whose process is gone as disconnected, and reconnects to its session", async () => {
    const id = await oneTask();
    await settle();
    launched[0].emit({ kind: "session", sessionId: SESSION });
    // what the app finds after a restart: the run recorded, its process gone
    const other = createWorkSupervisor({ runtime, workspace, companies: () => [{ companyId, ctx }], ready: async () => true, picksUp: () => true });
    await other.kick();

    expect(await statusOf(id)).toMatchObject({ blocker: { kind: "disconnected" } });
    const runs = await ctx.runs.findByCompany(companyId);
    expect(runs.map((r) => r.end?.kind)).toEqual(["disconnected"]);

    assert((await carryOn(ctx, id)).ok);
    await other.kick();
    expect(launched.at(-1)?.input).toMatchObject({ resume: SESSION, prompt: "Carry on with the task where you left off." });
  });

  it("stops the run of work that is held, and leaves the task as the user put it", async () => {
    const id = await oneTask();
    await settle();
    assert((await holdTask(ctx, id, "기다려")).ok);
    await settle();

    expect(launched[0].stopped).toBe(true);
    expect(await statusOf(id)).toMatchObject({ status: "held" });
    expect((await ctx.runs.findByCompany(companyId))[0].end).toEqual({ kind: "stopped" });
  });

  it("commits approved work and resumes work sent back in the same session", async () => {
    const first = await oneTask();
    await settle();
    launched[0].emit({ kind: "session", sessionId: SESSION });
    launched[0].emit({ kind: "result", outcome: "finished", costUsd: 0, report: undefined });
    launched[0].exit();
    await settle();

    assert((await sendBack(ctx, first, "페이지 크기는 50")).ok);
    await settle();
    expect(launched[1].input).toMatchObject({ resume: SESSION, prompt: "The user sent your work back:\n\n페이지 크기는 50\n\nMake the changes." });
    launched[1].emit({ kind: "result", outcome: "finished", costUsd: 0, report: undefined });
    launched[1].exit();
    await settle();

    await expect(approveTask(ctx, workspace, first)).resolves.toMatchObject({ ok: true, value: { task: { status: "done" } } });
    expect(committed).toEqual([`${first}:Paginate`]);
  });

  it("blocks work whose folder has no worktree, and starts nothing while Claude Code is not ready", async () => {
    ready = false;
    const id = await oneTask();
    await settle();
    expect(launched).toEqual([]);
    expect(await statusOf(id)).toMatchObject({ status: "backlog" });

    ready = true;
    workspaceWorks = false;
    await settle();
    expect(launched).toEqual([]);
    expect(await statusOf(id)).toMatchObject({ status: "working", blocker: { kind: "workspaceUnavailable" } });
  });

  it("takes no new work while paused, and carries on what was stopped", async () => {
    const id = await oneTask();
    picksUp = false;
    await settle();
    expect(launched).toEqual([]);
    expect(await statusOf(id)).toMatchObject({ status: "backlog" });

    picksUp = true;
    await settle();
    launched[0].emit({ kind: "session", sessionId: SESSION });
    launched[0].emit({ kind: "result", outcome: "budgetReached", costUsd: 2, report: undefined });
    launched[0].exit();
    await settle();
    picksUp = false;
    assert((await carryOn(ctx, id)).ok);
    await settle();

    expect(launched[1].input).toMatchObject({ resume: SESSION });
  });

  it("starts afresh on work already begun when the session to resume is gone", async () => {
    const id = await oneTask();
    await settle();
    launched[0].emit({ kind: "session", sessionId: SESSION });
    launched[0].emit({ kind: "result", outcome: "budgetReached", costUsd: 2, report: undefined });
    launched[0].exit();
    await settle();
    assert((await carryOn(ctx, id)).ok);
    await settle();
    expect(launched[1].input.resume).toBe(SESSION);

    // the runtime could not find it, and ended without naming a session
    launched[1].exit();
    await settle();
    assert((await carryOn(ctx, id)).ok);
    await settle();

    expect(launched[2].input.resume).toBeUndefined();
    expect(launched[2].input.prompt).toContain("already begun in this folder");
  });

  it("does not launch work held while its worktree was being prepared", async () => {
    const id = await oneTask();
    whilePreparing = async (taskId) => {
      assert((await holdTask(ctx, taskId as TaskId, "잠깐")).ok);
    };
    await settle();

    expect(launched).toEqual([]);
    expect(await statusOf(id)).toMatchObject({ status: "held" });
  });

  it("blocks the one task whose worktree throws, and gets on with the rest", async () => {
    const first = await oneTask();
    const hired = await hireEmployee(ctx, { companyId, name: "보리", species: "cat", roleId: await firstRole(ctx, companyId) });
    assert(hired.ok);
    const task = await statusOf(first);
    assert(task !== undefined);
    const second = await createTask(ctx, { companyId, projectId: task.projectId, title: "Second", priority: "normal" });
    assert(second.ok);
    whilePreparing = async (taskId) => {
      if (taskId === first) throw new Error("EACCES");
    };
    await settle();

    expect(await statusOf(first)).toMatchObject({ blocker: { kind: "workspaceUnavailable" } });
    expect(launched.map((l) => l.input.prompt)).toEqual(["Task: Second"]);
  });

  it("ends a run that the budget stopped as blocked until the user carries on", async () => {
    const id = await oneTask();
    await settle();
    launched[0].emit({ kind: "result", outcome: "budgetReached", costUsd: 2.1, report: undefined });
    launched[0].exit();
    await settle();

    expect(await statusOf(id)).toMatchObject({ blocker: { kind: "budgetReached" } });
    expect((await ctx.runs.findByCompany(companyId))[0]).toMatchObject({ end: { kind: "budgetReached" }, costUsd: 2.1 });
  });
});
