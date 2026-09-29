import { existsSync } from "node:fs";

import { toCompanyId, toTaskId } from "../domain/ids";
import type { Review, ReviewState, Verdict } from "../domain/review";
import type { Run, RunStep, StepKind } from "../domain/run";
import type { TaskRequest } from "../domain/task";
import { createAppContext } from "../infrastructure/app-context";
import { getCompanyFiles } from "../infrastructure/persistence/company-files";
import { branchOf, changesIn, diffOf, worktreePath, type FileChange } from "../infrastructure/workspace/git";

// One message of a task's conversation: an employee's report, a colleague's
// review, or what the user asked for when they sent the work back.
export type TalkMessage =
  | {
      readonly kind: "report";
      readonly id: string;
      readonly by: string;
      readonly at: number;
      readonly text: string;
      // a run's closing report, what it says while it runs, or its last words before it stopped
      readonly when: "final" | "live" | "stopped";
      readonly suggestions: readonly { readonly runId: string; readonly text: string }[];
    }
  | { readonly kind: "review"; readonly id: string; readonly by: string; readonly at: number; readonly text: string; readonly verdict: Verdict }
  | { readonly kind: "request"; readonly id: string; readonly at: number; readonly text: string };

export interface TaskWork {
  readonly steps: readonly { readonly at: number; readonly kind: Exclude<StepKind, "say">; readonly detail: string }[];
  readonly talk: readonly TalkMessage[];
  readonly changes: readonly FileChange[];
  readonly sessionId: string | undefined;
  // every memory a run of this task said it drew on
  readonly memoriesUsed: readonly string[];
  // the colleague's review it has, the latest asked for
  readonly review: { readonly state: ReviewState; readonly reviewerId: string | undefined } | undefined;
  readonly worktree: string | undefined;
  readonly branch: string;
}

// enough for every run's report on any task worked on for a while
const STEPS_READ = 400;

const whenOf = (run: Run): "final" | "live" | "stopped" => (run.state !== "ended" ? "live" : run.end?.kind === "finished" ? "final" : "stopped");

// The conversation, oldest first. A run's report is the last thing it said;
// a review speaks once it has settled; the user's requests are as they wrote them.
function conversation(taskId: string, runs: readonly Run[], employeeOf: (agentId: string) => string | undefined, steps: readonly RunStep[], reviews: readonly Review[], requests: readonly TaskRequest[]): TalkMessage[] {
  const talk: TalkMessage[] = [];
  for (const run of runs.filter((r) => r.taskId === taskId)) {
    const said = steps.filter((s) => s.runId === run.id && s.kind === "say").sort((a, b) => a.at - b.at).at(-1);
    const by = employeeOf(run.agentId);
    if (said === undefined || by === undefined) continue;
    talk.push({ kind: "report", id: run.id, by, at: said.at, text: said.detail, when: whenOf(run), suggestions: run.suggestions.map((text) => ({ runId: run.id, text })) });
  }
  for (const review of reviews.filter((r) => r.taskId === taskId && r.state === "settled")) {
    if (review.reviewerId === undefined || review.verdict === undefined || review.settledAt === undefined) continue;
    talk.push({ kind: "review", id: review.id, by: review.reviewerId, at: review.settledAt, text: review.comments ?? "", verdict: review.verdict });
  }
  requests.forEach((r, i) => talk.push({ kind: "request", id: `${taskId}:${i}`, at: r.at, text: r.text }));
  return talk.sort((a, b) => a.at - b.at);
}

// What a task's runs did and what its worktree now holds. Read from the task's
// own records and folder only; nothing here comes from the browser but ids.
async function taskIn(companyId: string, taskId: string) {
  const files = getCompanyFiles();
  if (!files.has(companyId)) return undefined;
  const ctx = createAppContext(files.open(toCompanyId(companyId)));
  const task = await ctx.tasks.findById(toTaskId(taskId));
  if (task === undefined || task.companyId !== companyId) return undefined;
  return { ctx, task, folder: (await ctx.projects.findById(task.projectId))?.folder };
}

export async function loadTaskWork(companyId: string, taskId: string): Promise<TaskWork | undefined> {
  const found = await taskIn(companyId, taskId);
  if (found === undefined) return undefined;
  const { ctx, task, folder } = found;

  const [steps, runs, reviews, requests, agents] = await Promise.all([
    ctx.runSteps.findByTask(task.companyId, task.id, STEPS_READ),
    ctx.runs.findByCompany(task.companyId),
    ctx.reviews.findByCompany(task.companyId),
    ctx.requests.findByTask(task.companyId, task.id),
    ctx.agents.findByCompany(task.companyId),
  ]);
  const sessionId = runs
    .filter((r) => r.taskId === task.id && r.sessionId !== undefined)
    .sort((a, b) => b.startedAt - a.startedAt)[0]?.sessionId;
  const review = reviews.filter((r) => r.taskId === task.id && r.state !== "suggested").sort((a, b) => b.createdAt - a.createdAt)[0];
  const worktree = folder === undefined ? undefined : worktreePath(folder, task.id);
  const present = worktree !== undefined && existsSync(worktree);
  const employeeOf = (agentId: string) => agents.find((a) => a.id === agentId)?.employeeId;

  return {
    steps: steps.flatMap((s) => (s.kind === "say" ? [] : [{ at: s.at, kind: s.kind, detail: s.detail }])),
    talk: conversation(task.id, runs, employeeOf, steps, reviews, requests),
    changes: present && folder !== undefined ? await changesIn(folder, task.id) : [],
    sessionId,
    review: review && { state: review.state, reviewerId: review.reviewerId },
    memoriesUsed: [...new Set(runs.filter((r) => r.taskId === task.id).flatMap((r) => r.memoriesUsed))],
    worktree: present ? worktree : undefined,
    branch: branchOf(task.id),
  };
}

// One file's diff, only for a file the task's worktree says it changed.
export async function loadDiff(companyId: string, taskId: string, file: string): Promise<string> {
  const found = await taskIn(companyId, taskId);
  if (found?.folder === undefined) return "";
  const changed = await changesIn(found.folder, found.task.id);
  return changed.some((c) => c.path === file) ? diffOf(found.folder, found.task.id, file) : "";
}
