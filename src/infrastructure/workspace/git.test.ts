import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, assert, beforeEach, describe, expect, it } from "vitest";

import { branchOf, changesIn, commitAll, diffOf, prepareWorktree, removeWorktree, worktreePath } from "./git";

const TASK = "11111111-2222-4333-8444-555555555555";
let repo: string;

const run = (...args: string[]) => execFileSync("git", ["-C", repo, ...args], { encoding: "utf8" });

beforeEach(() => {
  repo = realpathSync.native(mkdtempSync(join(tmpdir(), "mto-git-")));
  run("init", "-q", "-b", "main");
  run("config", "user.email", "test@example.com");
  run("config", "user.name", "Test");
  writeFileSync(join(repo, "a.txt"), "one\n");
  run("add", "a.txt");
  run("commit", "-q", "-m", "init");
});

afterEach(() => rmSync(repo, { recursive: true, force: true }));

describe("a task's worktree", () => {
  it("is made on its own branch, kept out of the user's status, and reused", async () => {
    const made = await prepareWorktree(repo, TASK);

    assert(made.ok);
    expect(made).toMatchObject({ path: worktreePath(repo, TASK), branch: branchOf(TASK) });
    expect(run("status", "--porcelain")).toBe("");
    expect(readFileSync(join(repo, ".git", "info", "exclude"), "utf8")).toContain(".worktrees/");
    await expect(prepareWorktree(repo, TASK)).resolves.toEqual(made);
  });

  it("shows what changed, new files included, and commits it to the branch", async () => {
    const made = await prepareWorktree(repo, TASK);
    assert(made.ok);
    writeFileSync(join(made.path, "a.txt"), "one\ntwo\n");
    writeFileSync(join(made.path, "b.txt"), "new\n");

    expect(await changesIn(made.path)).toEqual([
      { path: "a.txt", added: 1, removed: 0 },
      { path: "b.txt", added: 1, removed: 0 },
    ]);
    expect(await diffOf(made.path, "a.txt")).toContain("+two");

    const committed = await commitAll(made.path, "Paginate the history");
    assert(committed.ok);
    expect(committed.commit).toMatch(/^[0-9a-f]{7,}$/);
    expect(run("log", "-1", "--format=%s", branchOf(TASK)).trim()).toBe("Paginate the history");
    expect(run("rev-parse", "--abbrev-ref", "HEAD").trim()).toBe("main");
  });

  it("runs no hook of the repository's", async () => {
    mkdirSync(join(repo, ".git", "hooks"), { recursive: true });
    const marker = join(repo, "hook-ran");
    writeFileSync(join(repo, ".git", "hooks", "post-commit"), `#!/bin/sh\necho x > "${marker.split("\\").join("/")}"\n`, { mode: 0o755 });
    const made = await prepareWorktree(repo, TASK);
    assert(made.ok);
    writeFileSync(join(made.path, "c.txt"), "x\n");

    await commitAll(made.path, "c");
    expect(existsSync(marker)).toBe(false);

    // the same commit made by hand does run it, so the check above means something
    writeFileSync(join(made.path, "d.txt"), "x\n");
    execFileSync("git", ["-C", made.path, "add", "d.txt"]);
    execFileSync("git", ["-C", made.path, "commit", "-q", "-m", "d"]);
    expect(existsSync(marker)).toBe(true);
  });

  it("refuses a folder that is not a repository or has no commit yet", async () => {
    const plain = mkdtempSync(join(tmpdir(), "mto-plain-"));
    await expect(prepareWorktree(plain, TASK)).resolves.toEqual({ ok: false, reason: "notARepository" });
    execFileSync("git", ["-C", plain, "init", "-q"]);
    await expect(prepareWorktree(plain, TASK)).resolves.toEqual({ ok: false, reason: "repositoryEmpty" });
    rmSync(plain, { recursive: true, force: true });
  });

  it("names nothing after text that is not a task id", () => {
    expect(() => worktreePath(repo, "../../etc")).toThrow();
    expect(() => branchOf("main; rm -rf")).toThrow();
  });

  it("is removed once the task is settled, keeping its branch", async () => {
    const made = await prepareWorktree(repo, TASK);
    assert(made.ok);

    await removeWorktree(repo, TASK);

    expect(existsSync(made.path)).toBe(false);
    expect(run("branch", "--list", branchOf(TASK))).toContain(branchOf(TASK));
  });
});
