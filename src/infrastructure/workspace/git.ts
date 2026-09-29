import { randomUUID } from "node:crypto";
import { appendFileSync, existsSync, lstatSync, mkdirSync, readFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

import type { Workspace } from "../../application/agent-runtime";
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

const GIT_TIMEOUT_MS = 30_000;
// a new file bigger than this is counted, not read into a diff
const MAX_NEW_FILE = 1024 * 1024;

// No repository hook, filesystem monitor or external diff tool ever runs: an
// agent can edit files those may point at, and they would run with the user's
// rights, outside the session's boundary.
const NO_HOOKS = join(tmpdir(), "my-tiny-office-no-hooks", randomUUID());

async function git(args: readonly string[]): Promise<RunResult | undefined> {
  const found = findExecutable("git");
  if (found.kind !== "found") return undefined;
  const safe = ["-c", "core.quotepath=false", "-c", `core.hooksPath=${NO_HOOKS}`, "-c", "core.fsmonitor=false"];
  return runProcess(found.path, [...safe, ...args], { timeoutMs: GIT_TIMEOUT_MS });
}

async function commonDirOf(folder: string): Promise<string | undefined> {
  const top = await git(["-C", folder, "rev-parse", "--git-common-dir"]);
  if (top?.code !== 0) return undefined;
  const common = top.stdout.trim();
  return isAbsolute(common) ? common : resolve(folder, common);
}

// The task's worktree as git should see it: its git directory is the one the
// repository keeps for it, never what the `.git` file inside says, since the
// agent can rewrite that file to point at a directory it made.
async function worktreeGit(folder: string, taskId: string): Promise<{ readonly path: string; readonly args: readonly string[] } | undefined> {
  const path = worktreePath(folder, taskId);
  const common = await commonDirOf(folder);
  if (common === undefined || !existsSync(path)) return undefined;
  const admin = join(common, "worktrees", taskId);
  return existsSync(admin) ? { path, args: ["--git-dir", admin, "--work-tree", path] } : undefined;
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
  if (findExecutable("git").kind !== "found") return { ok: false, reason: "gitMissing" };
  const common = await commonDirOf(folder);
  if (common === undefined) return { ok: false, reason: "notARepository" };
  try {
    excludeWorktrees(common);
  } catch {
    return { ok: false, reason: "worktreeFailed" };
  }

  if ((await worktreeGit(folder, taskId)) !== undefined) return { ok: true, path, branch };
  const head = await git(["-C", folder, "rev-parse", "--verify", "--quiet", "HEAD"]);
  if (head?.code !== 0) return { ok: false, reason: "repositoryEmpty" };

  const known = await git(["-C", folder, "rev-parse", "--verify", "--quiet", `refs/heads/${branch}`]);
  const added = await git(known?.code === 0 ? ["-C", folder, "worktree", "add", path, branch] : ["-C", folder, "worktree", "add", "-b", branch, path]);
  return added?.code === 0 ? { ok: true, path, branch } : { ok: false, reason: "worktreeFailed" };
}

const DIFF = ["--no-ext-diff", "--no-textconv", "--no-renames"];

// Files git does not know yet, as the worktree lists them.
async function newFiles(wt: { readonly args: readonly string[] }): Promise<string[]> {
  const listed = await git([...wt.args, "ls-files", "--others", "--exclude-standard", "-z"]);
  return listed?.code === 0 ? listed.stdout.split("\0").filter((f) => f !== "") : [];
}

// A new file's lines, or none when it is not plain text a person could read.
function newFileLines(path: string, file: string): string[] | undefined {
  const full = join(path, file);
  const stat = lstatSync(full, { throwIfNoEntry: false });
  if (stat === undefined || !stat.isFile() || stat.size > MAX_NEW_FILE) return undefined;
  const text = readFileSync(full, "utf8");
  if (text.includes("\0")) return undefined;
  const lines = text.split(/\r?\n/);
  if (lines.at(-1) === "") lines.pop();
  return lines;
}

// What the task changed against where its branch started, new files
// included. It only reads: nothing is staged to find out.
export async function changesIn(folder: string, taskId: string): Promise<readonly FileChange[]> {
  const wt = await worktreeGit(folder, taskId);
  if (wt === undefined) return [];
  const stat = await git([...wt.args, "diff", ...DIFF, "--numstat", "-z", "HEAD"]);
  const tracked =
    stat?.code === 0
      ? stat.stdout
          .split("\0")
          .map((entry) => entry.split("\t"))
          .filter((parts) => parts.length === 3)
          .map(([added, removed, file]) => ({ path: file, added: Number(added) || 0, removed: Number(removed) || 0 }))
      : [];
  const created = (await newFiles(wt)).map((file) => ({ path: file, added: newFileLines(wt.path, file)?.length ?? 0, removed: 0 }));
  return [...tracked, ...created].sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
}

// One file's diff as text; it is shown, never run or rendered as markup.
export async function diffOf(folder: string, taskId: string, file: string): Promise<string> {
  const wt = await worktreeGit(folder, taskId);
  if (wt === undefined) return "";
  if ((await newFiles(wt)).includes(file)) {
    const lines = newFileLines(wt.path, file);
    return lines === undefined ? "" : [`@@ -0,0 +1,${lines.length} @@`, ...lines.map((l) => "+" + l)].join("\n");
  }
  const result = await git([...wt.args, "--literal-pathspecs", "diff", ...DIFF, "HEAD", "--", file]);
  return result?.code === 0 ? result.stdout : "";
}

// Approving commits the worktree to the task's branch. Nothing is pushed.
export async function commitAll(folder: string, taskId: string, message: string): Promise<{ readonly ok: true; readonly commit: string | undefined } | { readonly ok: false }> {
  const wt = await worktreeGit(folder, taskId);
  if (wt === undefined) return { ok: false };
  const staged = await git([...wt.args, "add", "--all"]);
  if (staged?.code !== 0) return { ok: false };
  const pending = await git([...wt.args, "diff", "--cached", "--quiet"]);
  if (pending?.code === 0) return { ok: true, commit: undefined };
  const committed = await git([...wt.args, "commit", "--no-verify", "-m", message]);
  if (committed?.code !== 0) return { ok: false };
  const head = await git([...wt.args, "rev-parse", "--short", "HEAD"]);
  return { ok: true, commit: head?.stdout.trim() };
}

export async function removeWorktree(folder: string, taskId: string): Promise<void> {
  await git(["-C", folder, "worktree", "remove", "--force", worktreePath(folder, taskId)]);
}

// A file the agent asked to remove, deleted only when it lies inside the
// worktree and outside its git data; a link is removed, never what it points at.
export async function removeFiles(folder: string, taskId: string, paths: readonly string[]): Promise<string[]> {
  const root = worktreePath(folder, taskId);
  const removed: string[] = [];
  for (const asked of paths) {
    if (isAbsolute(asked)) continue;
    const full = resolve(root, asked);
    const inside = relative(root, full);
    if (inside === "" || inside.startsWith("..") || isAbsolute(inside) || inside.split(sep)[0].toLowerCase() === ".git") continue;
    const stat = lstatSync(full, { throwIfNoEntry: false });
    if (stat === undefined || stat.isDirectory()) continue;
    unlinkSync(full);
    removed.push(inside.split(sep).join("/"));
  }
  return removed;
}

// what a reviewer is handed at most, so a huge change does not fill the whole prompt
const MAX_REVIEW_DIFF = 60_000;

// Every file's diff, one after another, for a reviewer to read.
export async function fullDiff(folder: string, taskId: string): Promise<string> {
  const parts: string[] = [];
  let size = 0;
  for (const change of await changesIn(folder, taskId)) {
    const diff = await diffOf(folder, taskId, change.path);
    const part = diff.startsWith("diff --git") ? diff : `--- ${change.path} (new)\n${diff}`;
    if (size + part.length > MAX_REVIEW_DIFF) {
      parts.push(`… ${change.path} and the rest are too long to show; read them in the folder.`);
      break;
    }
    parts.push(part);
    size += part.length;
  }
  return parts.join("\n");
}

// A task's work as the application sees it; a worktree already gone has nothing left to commit.
export const gitWorkspace: Workspace = {
  prepare: prepareWorktree,
  async commit(folder, taskId, message) {
    return !existsSync(worktreePath(folder, taskId)) || (await commitAll(folder, taskId, message)).ok;
  },
  remove: removeWorktree,
  removeFiles,
  diff: fullDiff,
};
