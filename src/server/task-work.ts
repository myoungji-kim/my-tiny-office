import { existsSync } from "node:fs";

import { toCompanyId, toTaskId } from "../domain/ids";
import type { StepKind } from "../domain/run";
import { createAppContext } from "../infrastructure/app-context";
import { getCompanyFiles } from "../infrastructure/persistence/company-files";
import { branchOf, changesIn, diffOf, worktreePath, type FileChange } from "../infrastructure/workspace/git";

export interface TaskWork {
  readonly steps: readonly { readonly at: number; readonly kind: StepKind; readonly detail: string }[];
  readonly changes: readonly FileChange[];
  readonly sessionId: string | undefined;
  readonly worktree: string | undefined;
  readonly branch: string;
}

const STEPS_SHOWN = 40;

// What a task's runs did and what its worktree now holds. Read from the task's
// own records and folder only; nothing here comes from the browser but ids.
export async function loadTaskWork(companyId: string, taskId: string): Promise<TaskWork | undefined> {
  const files = getCompanyFiles();
  if (!files.has(companyId)) return undefined;
  const ctx = createAppContext(files.open(toCompanyId(companyId)));
  const task = await ctx.tasks.findById(toTaskId(taskId));
  if (task === undefined || task.companyId !== companyId) return undefined;
  const folder = (await ctx.projects.findById(task.projectId))?.folder;

  const [steps, runs] = await Promise.all([ctx.runSteps.findByTask(task.companyId, task.id, STEPS_SHOWN), ctx.runs.findByCompany(task.companyId)]);
  const sessionId = runs
    .filter((r) => r.taskId === task.id && r.sessionId !== undefined)
    .sort((a, b) => b.startedAt - a.startedAt)[0]?.sessionId;
  const worktree = folder === undefined ? undefined : worktreePath(folder, task.id);
  const present = worktree !== undefined && existsSync(worktree);

  return {
    steps: steps.map((s) => ({ at: s.at, kind: s.kind, detail: s.detail })),
    changes: present ? await changesIn(worktree) : [],
    sessionId,
    worktree: present ? worktree : undefined,
    branch: branchOf(task.id),
  };
}

// One file's diff, only for a file the task's worktree says it changed.
export async function loadDiff(companyId: string, taskId: string, file: string): Promise<string> {
  const work = await loadTaskWork(companyId, taskId);
  if (work?.worktree === undefined || !work.changes.some((c) => c.path === file)) return "";
  return diffOf(work.worktree, file);
}
