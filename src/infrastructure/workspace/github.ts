import type { Publisher } from "../../application/publish";
import { findExecutable, runProcess } from "../process/run";

import { branchOf, originOf, pushBranch } from "./git";

interface Repository {
  readonly host: string;
  readonly owner: string;
  readonly name: string;
}

const PART = /^[A-Za-z0-9._-]+$/;

// A repository on GitHub, or on a company's own GitHub, as its remote names it:
// https://host/owner/repo(.git) or git@host:owner/repo(.git). Anything else is not one.
export function githubRepository(remote: string): Repository | undefined {
  const found = /^(?:https:\/\/(?:[^@/]+@)?([^/:]+)\/|(?:ssh:\/\/)?git@([^/:]+)[:/])([^/]+)\/([^/]+?)(?:\.git)?\/?$/.exec(remote.trim());
  if (found === null) return undefined;
  const host = (found[1] ?? found[2]).toLowerCase();
  const [owner, name] = [found[3], found[4]];
  if (!(host === "github.com" || host.startsWith("github.")) || !PART.test(owner) || !PART.test(name)) return undefined;
  return { host, owner, name };
}

// GitHub's own page for a new pull request from the branch, filled in; the
// user reads it over and opens it there. A long body is cut to keep the address usable.
const MAX_BODY_IN_URL = 5_000;
export function newPullRequestUrl(repo: Repository, branch: string, title: string, body: string): string {
  const query = new URLSearchParams({ expand: "1", title, body: body.length > MAX_BODY_IN_URL ? body.slice(0, MAX_BODY_IN_URL) + "\n\n…" : body });
  return `https://${repo.host}/${repo.owner}/${repo.name}/compare/${branch}?${query}`;
}

const GH_TIMEOUT_MS = 60_000;

// With GitHub CLI signed in to the host, the pull request is opened for the
// user; it answers with its address, or names the one the branch already has.
async function openWithGh(folder: string, repo: Repository, branch: string, title: string, body: string): Promise<string | undefined> {
  const gh = findExecutable("gh");
  if (gh.kind !== "found") return undefined;
  const signedIn = await runProcess(gh.path, ["auth", "status", "--hostname", repo.host], { cwd: folder, timeoutMs: GH_TIMEOUT_MS });
  if (signedIn.code !== 0) return undefined;
  const made = await runProcess(gh.path, ["pr", "create", "--head", branch, "--title", title, "--body-file", "-"], { cwd: folder, input: body, timeoutMs: GH_TIMEOUT_MS });
  const pull = new RegExp(`https://${repo.host.replace(/\./g, "\\.")}/${repo.owner}/${repo.name}/pull/\\d+`);
  return pull.exec(made.stdout)?.[0] ?? pull.exec(made.stderr)?.[0];
}

export const githubPublisher: Publisher = {
  async publish(folder, taskId, title, body) {
    const remote = await originOf(folder);
    if (remote === undefined) return { ok: false, reason: "noRemote" };
    const repo = githubRepository(remote);
    if (repo === undefined) return { ok: false, reason: "notGitHub" };
    if (!(await pushBranch(folder, taskId))) return { ok: false, reason: "pushFailed" };
    const branch = branchOf(taskId);
    return { ok: true, url: (await openWithGh(folder, repo, branch, title, body)) ?? newPullRequestUrl(repo, branch, title, body) };
  },
};
