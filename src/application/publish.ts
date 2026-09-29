import type { TaskId } from "../domain/ids";
import * as taskDomain from "../domain/task";

import type { AppContext, UseCaseResult } from "./context";

export type PublishFailure = "noRemote" | "notGitHub" | "pushFailed";

// Where applied work goes up for review. The user's own git and GitHub
// sign-in do it; the app holds no token.
export interface Publisher {
  // Pushes the task's branch, then opens its pull request, or hands back the page that opens one.
  publish(folder: string, taskId: string, title: string, body: string): Promise<{ readonly ok: true; readonly url: string } | { readonly ok: false; readonly reason: PublishFailure }>;
}

// enough of any task's report, which the pull request carries as it was written
const STEPS_READ = 400;

// What the pull request says: the task as it was written, and what the work reported last.
async function bodyOf(ctx: AppContext, task: taskDomain.Task): Promise<string> {
  const said = (await ctx.runSteps.findByTask(task.companyId, task.id, STEPS_READ)).find((s) => s.kind === "say")?.detail;
  return [task.description, said].filter((part) => part !== undefined && part.trim() !== "").join("\n\n---\n\n");
}

export async function publishTask(
  ctx: AppContext,
  publisher: Publisher,
  taskId: TaskId,
): Promise<UseCaseResult<{ readonly task: taskDomain.Task }, "taskNotFound" | "taskNotDone" | "projectHasNoFolder" | PublishFailure>> {
  const task = await ctx.tasks.findById(taskId);
  if (task === undefined) return { ok: false, reason: "taskNotFound" };
  if (task.status !== "done") return { ok: false, reason: "taskNotDone" };
  const folder = (await ctx.projects.findById(task.projectId))?.folder;
  if (folder === undefined) return { ok: false, reason: "projectHasNoFolder" };

  const published = await publisher.publish(folder, task.id, task.title, await bodyOf(ctx, task));
  if (!published.ok) return published;
  const done = taskDomain.publishTask(task, published.url);
  if (!done.ok) return done;
  await ctx.tasks.save(done.task);
  return { ok: true, value: { task: done.task }, events: [] };
}
