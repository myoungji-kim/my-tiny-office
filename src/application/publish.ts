import type { TaskId } from "../domain/ids";
import * as taskDomain from "../domain/task";

import type { AppContext, UseCaseResult } from "./context";

export type PublishFailure = "noRemote" | "notGitHub" | "branchGone" | "baseNotFound" | "pushFailed";

// What the task's repository says, read on this computer without asking the remote.
export interface Repository {
  readonly remote: string | undefined;
  readonly github: boolean;
  readonly branchExists: boolean;
  // origin's branches, and the one it points at
  readonly bases: readonly string[];
  readonly base: string | undefined;
}

export interface PullRequest {
  readonly base: string;
  readonly title: string;
  readonly body: string;
}

// Where applied work goes up for review. The user's own git and GitHub
// sign-in do it; the app holds no token.
export interface Publisher {
  look(folder: string, taskId: string): Promise<Repository>;
  // Pushes the task's branch, then opens its pull request, or hands back the page that opens one.
  publish(folder: string, taskId: string, pr: PullRequest): Promise<{ readonly ok: true; readonly url: string } | { readonly ok: false; readonly reason: PublishFailure }>;
}

// enough of any task's report, which the pull request carries as it was written
const STEPS_READ = 400;
const MAX_TITLE = 256;

type Found = { readonly ok: true; readonly task: taskDomain.Task; readonly folder: string } | { readonly ok: false; readonly reason: "taskNotFound" | "taskNotDone" | "projectHasNoFolder" };

async function appliedTask(ctx: AppContext, taskId: TaskId): Promise<Found> {
  const task = await ctx.tasks.findById(taskId);
  if (task === undefined) return { ok: false, reason: "taskNotFound" };
  if (task.status !== "done") return { ok: false, reason: "taskNotDone" };
  const folder = (await ctx.projects.findById(task.projectId))?.folder;
  if (folder === undefined) return { ok: false, reason: "projectHasNoFolder" };
  return { ok: true, task, folder };
}

// What the window starts from: the repository as it is, and the pull request
// written from the task and what its work reported last.
export async function draftPublish(ctx: AppContext, publisher: Publisher, taskId: TaskId) {
  const found = await appliedTask(ctx, taskId);
  if (!found.ok) return found;
  const { task, folder } = found;
  const said = (await ctx.runSteps.findByTask(task.companyId, task.id, STEPS_READ)).find((s) => s.kind === "say")?.detail;
  const body = [task.description, said].filter((part) => part !== undefined && part.trim() !== "").join("\n\n---\n\n");
  return { ok: true as const, repository: await publisher.look(folder, task.id), title: task.title, body };
}

export async function publishTask(
  ctx: AppContext,
  publisher: Publisher,
  taskId: TaskId,
  pr: PullRequest,
): Promise<UseCaseResult<{ readonly task: taskDomain.Task }, "taskNotFound" | "taskNotDone" | "projectHasNoFolder" | "titleRequired" | PublishFailure>> {
  const found = await appliedTask(ctx, taskId);
  if (!found.ok) return found;
  const title = pr.title.trim().slice(0, MAX_TITLE);
  if (title === "") return { ok: false, reason: "titleRequired" };
  // the branch it goes into must be one origin has, never text from the browser as it came
  const repository = await publisher.look(found.folder, found.task.id);
  if (!repository.bases.includes(pr.base)) return { ok: false, reason: "baseNotFound" };

  const published = await publisher.publish(found.folder, found.task.id, { base: pr.base, title, body: pr.body });
  if (!published.ok) return published;
  const now = await ctx.tasks.findById(found.task.id);
  if (now === undefined) return { ok: false, reason: "taskNotFound" };
  const done = taskDomain.publishTask(now, published.url);
  if (!done.ok) return done;
  await ctx.tasks.save(done.task);
  return { ok: true, value: { task: done.task }, events: [] };
}
