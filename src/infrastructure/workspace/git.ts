import { randomUUID } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, resolve } from "node:path";

import { findExecutable, runProcess, type RunResult } from "../process/run";

export type WorktreeFailure = "gitMissing" | "notARepository" | "repositoryEmpty" | "worktreeFailed";

export type WorktreeResult = { readonly ok: true; readonly path: string; readonly branch: string } | { readonly ok: false; readonly reason: WorktreeFailure };

export interface FileChange {
  readonly path: string;
  readonly added: number;
  readonly removed: number;
}

// A worktree and its branch are named from the app's own task id and nothing
// else, so no text anyone wrote becomes a path or a ref.
const TASK_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export const worktreePath = (folder: string, taskId: string): string => {
  if (!TASK_ID.test(taskId)) throw new Error("Not a task id");
  return join(folder, ".worktrees", taskId);
};

export const branchOf = (taskId: string): string => {
  if (!TASK_ID.test(taskId)) throw new Error("Not a task id");
  return `mto/${taskId}`;
};

const DIFF_TIMEOUT_MS = 30_000;

// No repository hook runs and no external diff tool is called: an agent can
// edit files a hook or driver may point at, and those run with the user's
// rights, outside the session's boundary.
const NO_HOOKS = join(tmpdir(), "my-tiny-office-no-hooks", randomUUID());

async function git(args: readonly string[], cwd?: string): Promise<RunResult | undefined> {
  const found = findExecutable("git");
  if (found.kind !== "found") return undefined;
  return runProcess(found.path, ["-c", "core.quotepath=false", "-c", `core.hooksPath=${NO_HOOKS}`, ...args], { cwd, timeoutMs: DIFF_TIMEOUT_MS });
}

// The worktrees stay out of the user's own status and history.
function excludeWorktrees(commonDir: string): void {
  const file = join(commonDir, "info", "exclude");
  const line = ".worktrees/";
  const current = existsSync(file) ? readFileSync(file, "utf8") : "";
  if (current.split(/\r?\n/).includes(line)) return;
  mkdirSync(dirname(file), { recursive: true });
  appendFileSync(file, (current === "" || current.endsWith("\n") ? "" : "\n") + line + "\n");
}

// Gives the task a worktree of its own on its own branch, or the one it already has.
export async function prepareWorktree(folder: string, taskId: string): Promise<WorktreeResult> {
  const path = worktreePath(folder, taskId);
  const branch = branchOf(taskId);
  const top = await git(["-C", folder, "rev-parse", "--git-common-dir"]);
  if (top === undefined) return { ok: false, reason: "gitMissing" };
  if (top.code !== 0) return { ok: false, reason: "notARepository" };
  const common = top.stdout.trim();
  excludeWorktrees(isAbsolute(common) ? common : resolve(folder, common));

  if (existsSync(join(path, ".git"))) return { ok: true, path, branch };
  const head = await git(["-C", folder, "rev-parse", "--verify", "--quiet", "HEAD"]);
  if (head?.code !== 0) return { ok: false, reason: "repositoryEmpty" };

  const known = await git(["-C", folder, "rev-parse", "--verify", "--quiet", `refs/heads/${branch}`]);
  const added = await git(known?.code === 0 ? ["-C", folder, "worktree", "add", path, branch] : ["-C", folder, "worktree", "add", "-b", branch, path]);
  return added?.code === 0 ? { ok: true, path, branch } : { ok: false, reason: "worktreeFailed" };
}

// What the task changed against where its branch started, new files included.
export async function changesIn(path: string): Promise<readonly FileChange[]> {
  await git(["-C", path, "add", "--intent-to-add", "--all"]);
  const stat = await git(["-C", path, "diff", "--no-ext-diff", "--no-textconv", "--numstat", "HEAD"]);
  if (stat === undefined || stat.code !== 0) return [];
  return stat.stdout
    .split("\n")
    .map((line) => line.split("\t"))
    .filter((parts) => parts.length === 3)
    .map(([added, removed, file]) => ({ path: file, added: Number(added) || 0, removed: Number(removed) || 0 }));
}

// One file's diff as text; it is shown, never run or rendered as markup.
export async function diffOf(path: string, file: string): Promise<string> {
  const result = await git(["-C", path, "diff", "--no-ext-diff", "--no-textconv", "HEAD", "--", file]);
  return result?.code === 0 ? result.stdout : "";
}

// Approving commits the worktree to the task's branch. Nothing is pushed.
export async function commitAll(path: string, message: string): Promise<{ readonly ok: true; readonly commit: string | undefined } | { readonly ok: false }> {
  const staged = await git(["-C", path, "add", "--all"]);
  if (staged?.code !== 0) return { ok: false };
  const pending = await git(["-C", path, "diff", "--cached", "--quiet"]);
  if (pending?.code === 0) return { ok: true, commit: undefined };
  const committed = await git(["-C", path, "commit", "--no-verify", "-m", message]);
  if (committed?.code !== 0) return { ok: false };
  const head = await git(["-C", path, "rev-parse", "--short", "HEAD"]);
  return { ok: true, commit: head?.stdout.trim() };
}

export async function removeWorktree(folder: string, taskId: string): Promise<void> {
  await git(["-C", folder, "worktree", "remove", "--force", worktreePath(folder, taskId)]);
}
