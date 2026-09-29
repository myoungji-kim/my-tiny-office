import type { Employee } from "../domain/employee";
import { toAgentId, toEventId, toRunId, type CompanyId, type EmployeeId, type MemoryId, type ReviewId, type RunId, type TaskId } from "../domain/ids";
import { carriedBy, type Memory } from "../domain/memory";
import * as reviewDomain from "../domain/review";
import { endRun, isLive, readReport, reported, reportDetail, sessionStarted, sessionToContinue, startRun, type Agent, type RunEnd } from "../domain/run";
import * as taskDomain from "../domain/task";

import type { AgentEvent, AgentRuntime, RunningAgent, Workspace } from "./agent-runtime";
import type { AppContext } from "./context";
import { requestReview, settleReview } from "./review";
import { pickUpWork } from "./task";

const taught = (own: readonly Memory[]): string[] => (own.length === 0 ? [] : ["", "What you have been taught, which you follow:", ...own.map((m, i) => `${i + 1}. ${m.text}`)]);

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
    "You cannot delete files, and no command is there for it. To remove one, end your final message with a line `Remove: <path from this folder>` for each; they are removed when you finish.",
    "",
    "Begin your final message with one sentence that sums up what you did; the rest follows it.",
    "If this task showed you something about this project that later tasks should know — a convention, a command, a pitfall — end your final message with at most two lines, each `Worth remembering: <one sentence>`, written in the language the task is written in. Leave them out when nothing stands out.",
    ...taught(own),
  ];
  if (own.length > 0) {
    lines.push(
      "",
      "End your final message with one last line naming the numbers above that you actually drew on, such as `Memories used: 2, 5`, or `Memories used: none`.",
    );
  }
  return lines.join("\n") + "\n";
}

// A reviewer reads a colleague's work and says what they think; nothing more.
function reviewerPrompt(reviewer: Employee, own: readonly Memory[]): string {
  return (
    [
      `You are ${reviewer.name}, reviewing a colleague's work on one task. The current folder is their copy of the project, and you can only read it: change nothing.`,
      "Read their changes, given below, and the files around them as you need. Say briefly what is good, then what should change, the most important first, each concrete enough to act on. Write in the language the task is written in.",
      "End with one last line: `Verdict: approve` if it can be applied as it is, or `Verdict: changes` if it should change first.",
      ...taught(own),
    ].join("\n") + "\n"
  );
}

// What the agent is told on this launch: the task itself in a new session,
// or why it is picking its own session up again.
function taskPrompt(task: taskDomain.Task, continuing: boolean, begun: boolean, lastEnd: RunEnd | undefined, commands: readonly string[]): string {
  if (task.changesRequested !== undefined) {
    return continuing
      ? `Your work was sent back with this request:\n\n${task.changesRequested}\n\nMake the changes.`
      : `${brief(task)}\n\nSomeone worked on this before, and it was sent back with this request:\n\n${task.changesRequested}`;
  }
  if (!continuing) return begun ? `${brief(task)}\n\nWork on it has already begun in this folder: carry on from what is there.` : brief(task);
  if (lastEnd?.kind === "denied") {
    return commands.includes(lastEnd.command)
      ? `\`${lastEnd.command}\` is allowed now. Carry on with the task.`
      : `The user did not allow \`${lastEnd.command}\`. Carry on with the task without it.`;
  }
  return "Carry on with the task where you left off.";
}

const reviewPrompt = (task: taskDomain.Task, author: string, diff: string, again: boolean): string =>
  `${again ? `${author} has changed the work since your last review. ` : ""}${author} did this task:\n\n${brief(task)}\n\nTheir changes:\n\n\`\`\`diff\n${diff}\n\`\`\``;

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
  // the review this run is, when it is a colleague's rather than the work itself
  readonly reviewId: ReviewId | undefined;
  readonly ctx: AppContext;
  handle: RunningAgent;
  stopping: boolean;
  denied: string | undefined;
  result: Extract<AgentEvent, { kind: "result" }> | undefined;
  // what it carries, in the order the prompt numbered it
  readonly carried: readonly MemoryId[];
  used: readonly MemoryId[];
  suggestions: readonly string[];
}

// A task wants a run while it is being worked on, unblocked, by this person.
const wantsRun = (task: taskDomain.Task | undefined, employeeId: EmployeeId | undefined): task is taskDomain.Task =>
  task !== undefined && task.status === "working" && task.blocker === undefined && task.assigneeId !== undefined && (employeeId === undefined || task.assigneeId === employeeId);

// ...and nobody works on it while a colleague's review is asked for.
const heldForReview = (taskId: TaskId, reviews: readonly reviewDomain.Review[]): boolean =>
  reviews.some((r) => r.taskId === taskId && reviewDomain.holdsTheWork(r));

// Keeps the running agents in step with the companies' tasks. The tasks are
// the truth: a tick starts a run for work that has none, stops one whose work
// no longer wants it, and marks a run that lost its process as disconnected.
// A review is a run too, the reviewer's, while the work waits on it.
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

  async function finish(ctx: AppContext, taskId: TaskId): Promise<void> {
    const task = await ctx.tasks.findById(taskId);
    if (task === undefined) return;
    const finished = taskDomain.finishWork(task, eventId(ctx), ctx.now());
    if (finished.ok) await ctx.tasks.save(finished.task);
  }

  // A review that did not conclude gives the work back to the user as it was.
  async function reviewFailed(ctx: AppContext, reviewId: ReviewId): Promise<void> {
    const review = await ctx.reviews.findById(reviewId);
    if (review === undefined) return;
    const withdrawn = reviewDomain.withdrawReview(review, eventId(ctx), ctx.now());
    if (withdrawn.ok) await ctx.reviews.save(withdrawn.review);
    await finish(ctx, review.taskId);
  }

  async function reconcile({ companyId, ctx }: CompanyWork): Promise<void> {
    const reviews = await ctx.reviews.findByCompany(companyId);
    const agents = await ctx.agents.findByCompany(companyId);
    // a run the database thinks is going, with no process behind it
    for (const run of (await ctx.runs.findByCompany(companyId)).filter(isLive)) {
      if (live.has(run.id)) continue;
      await ctx.runs.save(endRun(run, { kind: "disconnected" }, 0, ctx.now()));
      const by = agents.find((a) => a.id === run.agentId)?.employeeId;
      const review = reviews.find((r) => r.taskId === run.taskId && r.state === "reviewing" && r.reviewerId === by);
      if (review !== undefined) await reviewFailed(ctx, review.id);
      else if (wantsRun(await ctx.tasks.findById(run.taskId), undefined)) await block(ctx, run.taskId, { kind: "disconnected" });
    }
    const now = await ctx.reviews.findByCompany(companyId);
    for (const entry of live.values()) {
      if (entry.companyId !== companyId || entry.stopping) continue;
      const task = await ctx.tasks.findById(entry.taskId);
      const wanted =
        entry.reviewId === undefined
          ? wantsRun(task, entry.employeeId) && !heldForReview(entry.taskId, now)
          : task?.status === "working" && now.some((r) => r.id === entry.reviewId && r.state === "reviewing");
      if (!wanted) stop(entry);
    }
  }

  function stop(entry: LiveRun): void {
    entry.stopping = true;
    entry.handle.stop();
  }

  function track(entry: LiveRun, start: () => RunningAgent): void {
    live.set(entry.runId, entry);
    try {
      entry.handle = start();
    } catch (error) {
      // a launch that never started ends like a lost process
      void serial(() => onExit(entry));
      throw error;
    }
  }

  const entryFor = (ctx: AppContext, run: { readonly id: RunId }, task: taskDomain.Task, employee: Employee, reviewId: ReviewId | undefined, carried: readonly Memory[]): LiveRun => ({
    runId: run.id,
    companyId: task.companyId,
    taskId: task.id,
    employeeId: employee.id,
    reviewId,
    ctx,
    handle: { stop: () => undefined },
    stopping: false,
    denied: undefined,
    result: undefined,
    carried: carried.map((m) => m.id),
    used: [],
    suggestions: [],
  });

  async function launch(ctx: AppContext, task: taskDomain.Task): Promise<void> {
    const project = await ctx.projects.findById(task.projectId);
    const employee = task.assigneeId === undefined ? undefined : await ctx.employees.findById(task.assigneeId);
    if (employee === undefined) return;
    const prepared = project?.folder !== undefined && project.folderConfirmed ? await deps.workspace.prepare(project.folder, task.id) : { ok: false as const };
    if (!prepared.ok || project === undefined) return block(ctx, task.id, { kind: "workspaceUnavailable" });
    // preparing takes a while, and the task may have been held or handed over meanwhile
    const current = await ctx.tasks.findById(task.id);
    if (!wantsRun(current, employee.id) || heldForReview(task.id, await ctx.reviews.findByCompany(task.companyId))) return;

    const agent = await agentOf(ctx, employee);
    const runs = await ctx.runs.findByCompany(task.companyId);
    const resume = sessionToContinue(runs, task.id, agent.id);
    const last = runs.filter((r) => r.taskId === task.id && r.agentId === agent.id).sort((a, b) => b.startedAt - a.startedAt)[0];
    const begun = runs.some((r) => r.taskId === task.id);
    // the session is the runtime's to name; a resume that never names it did not take
    const run = startRun({ id: toRunId(ctx.newId()), agent, taskId: task.id, sessionId: undefined }, ctx.now());
    await ctx.runs.save(run);

    const carried = carriedBy(employee.id, await ctx.memories.findByCompany(task.companyId));
    const entry = entryFor(ctx, run, task, employee, undefined, carried);
    track(entry, () =>
      deps.runtime.launch(
        {
          cwd: prepared.path,
          prompt: taskPrompt(current, resume !== undefined, begun, last?.end, project.commands),
          memory: memoryPrompt(employee, carried, project.commands),
          commands: project.commands,
          resume,
          readOnly: false,
        },
        (event) => void serial(() => onEvent(entry, event)),
        () => void serial(() => onExit(entry)),
      ),
    );
  }

  // The reviewer reads the work where it is, with their own session and memory.
  async function launchReview(ctx: AppContext, review: reviewDomain.Review, task: taskDomain.Task): Promise<void> {
    const project = await ctx.projects.findById(task.projectId);
    const reviewer = review.reviewerId === undefined ? undefined : await ctx.employees.findById(review.reviewerId);
    const author = task.assigneeId === undefined ? undefined : await ctx.employees.findById(task.assigneeId);
    if (reviewer === undefined || project?.folder === undefined || !project.folderConfirmed) return reviewFailed(ctx, review.id);
    const prepared = await deps.workspace.prepare(project.folder, task.id);
    if (!prepared.ok) return reviewFailed(ctx, review.id);
    const diff = await deps.workspace.diff(project.folder, task.id);

    const agent = await agentOf(ctx, reviewer);
    const resume = sessionToContinue(await ctx.runs.findByCompany(task.companyId), task.id, agent.id);
    const run = startRun({ id: toRunId(ctx.newId()), agent, taskId: task.id, sessionId: undefined }, ctx.now());
    await ctx.runs.save(run);

    const carried = carriedBy(reviewer.id, await ctx.memories.findByCompany(task.companyId));
    const entry = entryFor(ctx, run, task, reviewer, review.id, carried);
    track(entry, () =>
      deps.runtime.launch(
        {
          cwd: prepared.path,
          prompt: reviewPrompt(task, author?.name ?? "A colleague", diff, resume !== undefined),
          memory: reviewerPrompt(reviewer, carried),
          commands: [],
          resume,
          readOnly: true,
        },
        (event) => void serial(() => onEvent(entry, event)),
        () => void serial(() => onExit(entry)),
      ),
    );
  }

  async function onEvent(entry: LiveRun, event: AgentEvent): Promise<void> {
    const { ctx } = entry;
    if (event.kind === "session") {
      const run = await ctx.runs.findById(entry.runId);
      if (run !== undefined) await ctx.runs.save(sessionStarted(run, event.sessionId));
    } else if (entry.reviewId !== undefined) {
      // a review's steps are the reviewer's reading, not the work; its words are the review
      if (event.kind === "result") entry.result = event;
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
      const { report, used, suggestions, removals } = readReport(event.report, entry.carried);
      entry.used = used;
      entry.suggestions = suggestions;
      if (removals.length > 0) await removeAsked(entry, removals);
      if (report !== "") await ctx.runSteps.add({ companyId: entry.companyId, taskId: entry.taskId, runId: entry.runId, at: ctx.now(), kind: "say", detail: reportDetail(report) });
    }
  }

  async function removeAsked(entry: LiveRun, paths: readonly string[]): Promise<void> {
    const { ctx } = entry;
    const task = await ctx.tasks.findById(entry.taskId);
    const folder = task === undefined ? undefined : (await ctx.projects.findById(task.projectId))?.folder;
    if (folder === undefined) return;
    for (const path of await deps.workspace.removeFiles(folder, entry.taskId, paths)) {
      await ctx.runSteps.add({ companyId: entry.companyId, taskId: entry.taskId, runId: entry.runId, at: ctx.now(), kind: "edit", detail: path });
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
    if (run !== undefined) await ctx.runs.save(endRun(reported(run, { used: entry.used, suggestions: entry.suggestions }), end, entry.result?.costUsd ?? 0, ctx.now()));
    kick();
    if (end.kind === "stopped") return;
    if (entry.reviewId !== undefined) return reviewEnded(entry, entry.reviewId, end);

    const task = await ctx.tasks.findById(entry.taskId);
    if (!wantsRun(task, entry.employeeId)) return;
    if (end.kind !== "finished") {
      return block(ctx, task.id, end.kind === "denied" ? { kind: "commandNotAllowed", command: end.command } : end.kind === "budgetReached" ? { kind: "budgetReached" } : { kind: "disconnected" });
    }
    await finish(ctx, task.id);
    // a reviewer named when the task was written looks at its first finished work, once
    const reviewed = (await ctx.reviews.findByCompany(task.companyId)).some((r) => r.taskId === task.id && r.state === "settled");
    if (task.reviewerId !== undefined && !reviewed) {
      const asked = await requestReview(ctx, task.id, task.reviewerId);
      if (!asked.ok) deps.onError?.(new Error(`The review named on the task was not asked for: ${asked.reason}`));
    }
  }

  // What the review concluded moves the work on: to approval as it is, or back
  // to whoever did it with what should change.
  async function reviewEnded(entry: LiveRun, reviewId: ReviewId, end: RunEnd): Promise<void> {
    const { ctx } = entry;
    const { verdict, comments } = reviewDomain.readVerdict(entry.result?.report ?? "");
    if (end.kind !== "finished" || verdict === undefined) return reviewFailed(ctx, reviewId);
    const settled = await settleReview(ctx, reviewId, { verdict, comments: comments || undefined });
    if (!settled.ok) return;
    if (verdict === "approve") return finish(ctx, entry.taskId);
    const task = await ctx.tasks.findById(entry.taskId);
    if (task === undefined) return;
    const back = taskDomain.reviewAskedForChanges(task, comments, eventId(ctx), ctx.now());
    if (back.ok) await ctx.tasks.save(back.task);
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
        const reviews = await company.ctx.reviews.findByCompany(company.companyId);
        const tasks = await company.ctx.tasks.findByCompany(company.companyId);
        const running = new Set([...live.values()].filter((e) => e.reviewId === undefined).map((e) => e.taskId));
        const reviewing = new Set([...live.values()].map((e) => e.reviewId));
        for (const task of tasks) {
          if (wantsRun(task, undefined) && !heldForReview(task.id, reviews) && !running.has(task.id)) await launchOrBlock(company.ctx, task);
        }
        for (const review of reviews) {
          const task = tasks.find((t) => t.id === review.taskId);
          if (review.state === "reviewing" && task?.status === "working" && !reviewing.has(review.id) && !running.has(task.id)) {
            await launchReviewOrGiveBack(company.ctx, review, task);
          }
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

  async function launchReviewOrGiveBack(ctx: AppContext, review: reviewDomain.Review, task: taskDomain.Task): Promise<void> {
    try {
      await launchReview(ctx, review, task);
    } catch (error) {
      deps.onError?.(error);
      await reviewFailed(ctx, review.id);
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
