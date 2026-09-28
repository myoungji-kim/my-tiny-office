import type { Employee } from "../domain/employee";
import { toAgentId, toEventId, toRunId, type CompanyId, type EmployeeId, type MemoryId, type RunId, type TaskId } from "../domain/ids";
import { carriedBy, type Memory } from "../domain/memory";
import { drewOn, endRun, isLive, memoriesInReport, reportDetail, sessionStarted, sessionToContinue, startRun, type Agent, type RunEnd } from "../domain/run";
import * as taskDomain from "../domain/task";

import type { AgentEvent, AgentRuntime, RunningAgent, Workspace } from "./agent-runtime";
import type { AppContext } from "./context";
import { pickUpWork } from "./task";

// Who the agent is, the boundary it works in, and everything it carries, numbered.
function memoryPrompt(employee: Employee, own: readonly Memory[], commands: readonly string[]): string {
  const allowed = commands.map((c) => "`" + c + "`").join(", ");
  const lines = [
    `You are ${employee.name}, working on one task in the current folder, which is your own copy of the project.`,
    "Work only in this folder. Do not commit, push or open pull requests: the user reviews your changes and applies them.",
    "You are already in the folder: never cd. Look at files with Read, Glob and Grep, not with shell commands.",
    commands.length === 0
      ? "No shell command is allowed in this project."
      : `The only shell commands allowed are these, each run on its own exactly as written, never joined with && ; | or redirected: ${allowed}.`,
    "If you need a command that is not allowed, try it once on its own; the user decides whether to allow it.",
  ];
  if (own.length > 0) {
    lines.push("", "What you have been taught, which you follow:");
    own.forEach((m, i) => lines.push(`${i + 1}. ${m.text}`));
    lines.push(
      "",
      "End your final message with one line of its own naming the numbers above that you actually drew on, such as `Memories used: 2, 5`, or `Memories used: none`.",
    );
  }
  return lines.join("\n") + "\n";
}

// What the agent is told on this launch: the task itself in a new session,
// or why it is picking its own session up again.
function taskPrompt(task: taskDomain.Task, continuing: boolean, begun: boolean, lastEnd: RunEnd | undefined, commands: readonly string[]): string {
  if (task.changesRequested !== undefined) {
    return continuing
      ? `The user sent your work back:\n\n${task.changesRequested}\n\nMake the changes.`
      : `${brief(task)}\n\nSomeone worked on this before, and the user sent it back:\n\n${task.changesRequested}`;
  }
  if (!continuing) return begun ? `${brief(task)}\n\nWork on it has already begun in this folder: carry on from what is there.` : brief(task);
  if (lastEnd?.kind === "denied") {
    return commands.includes(lastEnd.command)
      ? `\`${lastEnd.command}\` is allowed now. Carry on with the task.`
      : `The user did not allow \`${lastEnd.command}\`. Carry on with the task without it.`;
  }
  return "Carry on with the task where you left off.";
}

const brief = (task: taskDomain.Task) => (task.description === undefined ? `Task: ${task.title}` : `Task: ${task.title}\n\n${task.description}`);

async function agentOf(ctx: AppContext, employee: Employee): Promise<Agent> {
  const existing = (await ctx.agents.findByCompany(employee.companyId)).find((a) => a.employeeId === employee.id);
  if (existing !== undefined) return existing;
  const agent: Agent = { id: toAgentId(ctx.newId()), companyId: employee.companyId, employeeId: employee.id, runtime: "claudeCode", createdAt: ctx.now() };
  await ctx.agents.save(agent);
  return agent;
}

export interface CompanyWork {
  readonly companyId: CompanyId;
  readonly ctx: AppContext;
}

interface LiveRun {
  readonly runId: RunId;
  readonly companyId: CompanyId;
  readonly taskId: TaskId;
  readonly employeeId: EmployeeId;
  readonly ctx: AppContext;
  handle: RunningAgent;
  stopping: boolean;
  denied: string | undefined;
  result: Extract<AgentEvent, { kind: "result" }> | undefined;
  // what it carries, in the order the prompt numbered it
  readonly carried: readonly MemoryId[];
  used: readonly MemoryId[];
}

// A task wants a run while it is being worked on, unblocked, by this person.
const wantsRun = (task: taskDomain.Task | undefined, employeeId: EmployeeId | undefined): task is taskDomain.Task =>
  task !== undefined && task.status === "working" && task.blocker === undefined && task.assigneeId !== undefined && (employeeId === undefined || task.assigneeId === employeeId);

// Keeps the running agents in step with the companies' tasks. The tasks are
// the truth: a tick starts a run for work that has none, stops one whose work
// no longer wants it, and marks a run that lost its process as disconnected.
export function createWorkSupervisor(deps: {
  readonly runtime: AgentRuntime;
  readonly workspace: Workspace;
  readonly companies: () => readonly CompanyWork[];
  readonly ready: () => Promise<boolean>;
  // whether whoever is free takes new work; a run already under way is not new work
  readonly picksUp: () => boolean;
  readonly onError?: (error: unknown) => void;
}) {
  const live = new Map<RunId, LiveRun>();
  let queue: Promise<void> = Promise.resolve();
  let tickQueued = false;

  // All of the supervisor's writes happen one at a time, in order.
  const serial = (work: () => Promise<void>): Promise<void> =>
    (queue = queue.then(work).catch((error: unknown) => deps.onError?.(error)));

  const eventId = (ctx: AppContext) => toEventId(ctx.newId());

  async function block(ctx: AppContext, taskId: TaskId, blocker: taskDomain.Blocker): Promise<void> {
    const task = await ctx.tasks.findById(taskId);
    if (task === undefined) return;
    const blocked = taskDomain.blockTask(task, blocker, eventId(ctx), ctx.now());
    if (blocked.ok) await ctx.tasks.save(blocked.task);
  }

  async function reconcile({ companyId, ctx }: CompanyWork): Promise<void> {
    // a run the database thinks is going, with no process behind it
    for (const run of (await ctx.runs.findByCompany(companyId)).filter(isLive)) {
      if (live.has(run.id)) continue;
      await ctx.runs.save(endRun(run, { kind: "disconnected" }, 0, ctx.now()));
      if (wantsRun(await ctx.tasks.findById(run.taskId), undefined)) await block(ctx, run.taskId, { kind: "disconnected" });
    }
    for (const entry of live.values()) {
      if (entry.companyId !== companyId || entry.stopping) continue;
      if (!wantsRun(await ctx.tasks.findById(entry.taskId), entry.employeeId)) stop(entry);
    }
  }

  function stop(entry: LiveRun): void {
    entry.stopping = true;
    entry.handle.stop();
  }

  async function launch(ctx: AppContext, task: taskDomain.Task): Promise<void> {
    const project = await ctx.projects.findById(task.projectId);
    const employee = task.assigneeId === undefined ? undefined : await ctx.employees.findById(task.assigneeId);
    if (employee === undefined) return;
    const prepared = project?.folder !== undefined && project.folderConfirmed ? await deps.workspace.prepare(project.folder, task.id) : { ok: false as const };
    if (!prepared.ok || project === undefined) return block(ctx, task.id, { kind: "workspaceUnavailable" });
    // preparing takes a while, and the task may have been held or handed over meanwhile
    const current = await ctx.tasks.findById(task.id);
    if (!wantsRun(current, employee.id)) return;

    const agent = await agentOf(ctx, employee);
    const runs = await ctx.runs.findByCompany(task.companyId);
    const resume = sessionToContinue(runs, task.id, agent.id);
    const last = runs.filter((r) => r.taskId === task.id && r.agentId === agent.id).sort((a, b) => b.startedAt - a.startedAt)[0];
    const begun = runs.some((r) => r.taskId === task.id);
    // the session is the runtime's to name; a resume that never names it did not take
    const run = startRun({ id: toRunId(ctx.newId()), agent, taskId: task.id, sessionId: undefined }, ctx.now());
    await ctx.runs.save(run);

    const carried = carriedBy(employee.id, await ctx.memories.findByCompany(task.companyId));
    const memory = memoryPrompt(employee, carried, project.commands);
    const entry: LiveRun = {
      runId: run.id,
      companyId: task.companyId,
      taskId: task.id,
      employeeId: employee.id,
      ctx,
      handle: { stop: () => undefined },
      stopping: false,
      denied: undefined,
      result: undefined,
      carried: carried.map((m) => m.id),
      used: [],
    };
    live.set(run.id, entry);
    try {
      entry.handle = deps.runtime.launch(
        { cwd: prepared.path, prompt: taskPrompt(current, resume !== undefined, begun, last?.end, project.commands), memory, commands: project.commands, resume },
        (event) => void serial(() => onEvent(entry, event)),
        () => void serial(() => onExit(entry)),
      );
    } catch (error) {
      // a launch that never started ends like a lost process
      await onExit(entry);
      throw error;
    }
  }

  async function onEvent(entry: LiveRun, event: AgentEvent): Promise<void> {
    const { ctx } = entry;
    if (event.kind === "session") {
      const run = await ctx.runs.findById(entry.runId);
      if (run !== undefined) await ctx.runs.save(sessionStarted(run, event.sessionId));
    } else if (event.kind === "step") {
      await ctx.runSteps.add({ companyId: entry.companyId, taskId: entry.taskId, runId: entry.runId, at: ctx.now(), kind: event.step, detail: event.detail });
    } else if (event.kind === "denied") {
      // the task stops on the first command it may not run; the user decides
      if (entry.denied === undefined) {
        entry.denied = event.command;
        entry.handle.stop();
      }
    } else {
      entry.result = event;
      if (event.report === undefined) return;
      const { report, used } = memoriesInReport(event.report, entry.carried);
      entry.used = used;
      if (report !== "") await ctx.runSteps.add({ companyId: entry.companyId, taskId: entry.taskId, runId: entry.runId, at: ctx.now(), kind: "say", detail: reportDetail(report) });
    }
  }

  function endOf(entry: LiveRun): RunEnd {
    if (entry.denied !== undefined) return { kind: "denied", command: entry.denied };
    if (entry.stopping) return { kind: "stopped" };
    if (entry.result !== undefined) return { kind: entry.result.outcome };
    return { kind: "disconnected" };
  }

  async function onExit(entry: LiveRun): Promise<void> {
    live.delete(entry.runId);
    const { ctx } = entry;
    const end = endOf(entry);
    const run = await ctx.runs.findById(entry.runId);
    if (run !== undefined) await ctx.runs.save(endRun(drewOn(run, entry.used), end, entry.result?.costUsd ?? 0, ctx.now()));

    kick();
    const task = await ctx.tasks.findById(entry.taskId);
    if (end.kind === "stopped" || !wantsRun(task, entry.employeeId)) return;
    if (end.kind === "finished") {
      const finished = taskDomain.finishWork(task, eventId(ctx), ctx.now());
      if (finished.ok) await ctx.tasks.save(finished.task);
    } else {
      await block(ctx, task.id, end.kind === "denied" ? { kind: "commandNotAllowed", command: end.command } : end.kind === "budgetReached" ? { kind: "budgetReached" } : { kind: "disconnected" });
    }
  }

  async function tick(): Promise<void> {
    const companies = deps.companies();
    const open = new Set(companies.map((c) => c.companyId));
    for (const entry of live.values()) if (!open.has(entry.companyId) && !entry.stopping) stop(entry);

    const ready = await deps.ready();
    for (const company of companies) {
      try {
        await reconcile(company);
        if (!ready) continue;
        if (deps.picksUp()) await pickUpWork(company.ctx, company.companyId);
        const running = new Set([...live.values()].map((e) => e.taskId));
        for (const task of await company.ctx.tasks.findByCompany(company.companyId)) {
          if (wantsRun(task, undefined) && !running.has(task.id)) await launchOrBlock(company.ctx, task);
        }
      } catch (error) {
        deps.onError?.(error);
      }
    }
  }

  // A launch that throws blocks its task rather than being tried again every tick.
  async function launchOrBlock(ctx: AppContext, task: taskDomain.Task): Promise<void> {
    try {
      await launch(ctx, task);
    } catch (error) {
      deps.onError?.(error);
      if (wantsRun(await ctx.tasks.findById(task.id), undefined)) await block(ctx, task.id, { kind: "workspaceUnavailable" });
    }
  }

  // Asks for a tick soon; several asks before it runs are one tick.
  function kick(): Promise<void> {
    if (tickQueued) return queue;
    tickQueued = true;
    return serial(async () => {
      tickQueued = false;
      await tick();
    });
  }

  return {
    kick,
    // Ends every run at once, as when the server stops; each is found lost and resumed later.
    stopAll: () => {
      for (const entry of live.values()) entry.handle.stop();
    },
  };
}

export type WorkSupervisor = ReturnType<typeof createWorkSupervisor>;
