import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, assert, beforeEach, describe, expect, it } from "vitest";

import { branchOf, changesIn, commitAll, diffOf, prepareWorktree, removeFiles, removeWorktree, worktreePath } from "./git";

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

    expect(await changesIn(repo, TASK)).toEqual([
      { path: "a.txt", added: 1, removed: 0 },
      { path: "b.txt", added: 1, removed: 0 },
    ]);
    expect(await diffOf(repo, TASK, "a.txt")).toContain("+two");
    expect(await diffOf(repo, TASK, "b.txt")).toBe("@@ -0,0 +1,1 @@\n+new");
    // looking is only looking: nothing was staged to find out
    expect(execFileSync("git", ["-C", made.path, "diff", "--cached", "--name-only"], { encoding: "utf8" })).toBe("");

    const committed = await commitAll(repo, TASK, "Paginate the history");
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

    await commitAll(repo, TASK, "c");
    expect(existsSync(marker)).toBe(false);

    // the same commit made by hand does run it, so the check above means something
    writeFileSync(join(made.path, "d.txt"), "x\n");
    execFileSync("git", ["-C", made.path, "add", "d.txt"]);
    execFileSync("git", ["-C", made.path, "commit", "-q", "-m", "d"]);
    expect(existsSync(marker)).toBe(true);
  });

  it("never takes the git directory, or a monitor, from the worktree's own .git file", async () => {
    const made = await prepareWorktree(repo, TASK);
    assert(made.ok);
    const marker = join(repo, "monitor-ran");
    // what an agent could write inside its worktree: a git directory of its own, with a command to run
    const fake = join(made.path, "fake-git");
    execFileSync("git", ["init", "-q", "--bare", fake]);
    execFileSync("git", ["--git-dir", fake, "config", "core.bare", "false"]);
    const script = join(made.path, "monitor.js");
    writeFileSync(script, `require("fs").writeFileSync(${JSON.stringify(marker)}, "x");`);
    execFileSync("git", ["--git-dir", fake, "config", "core.fsmonitor", `"${process.execPath.split("\\").join("/")}" "${script.split("\\").join("/")}"`]);
    rmSync(join(made.path, ".git"), { force: true });
    writeFileSync(join(made.path, ".git"), `gitdir: ${fake}\n`);
    writeFileSync(join(made.path, "a.txt"), "changed\n");

    expect((await changesIn(repo, TASK)).map((c) => c.path)).toContain("a.txt");
    await diffOf(repo, TASK, "a.txt");
    await commitAll(repo, TASK, "x");

    expect(existsSync(marker)).toBe(false);
    expect(run("log", "-1", "--format=%s", branchOf(TASK)).trim()).toBe("x");

    // a git that trusts the worktree's .git file does run it, so the check above means something
    execFileSync("git", ["-C", made.path, "status", "--porcelain"]);
    expect(existsSync(marker)).toBe(true);
  });

  it("lists a renamed file and one named outside ASCII as they are, each with its diff", async () => {
    const made = await prepareWorktree(repo, TASK);
    assert(made.ok);
    execFileSync("git", ["-C", made.path, "mv", "a.txt", "moved.txt"]);
    writeFileSync(join(made.path, "새 파일.txt"), "x\n");

    const changes = await changesIn(repo, TASK);

    expect(changes.map((c) => c.path)).toEqual(["a.txt", "moved.txt", "새 파일.txt"]);
    for (const c of changes) expect(await diffOf(repo, TASK, c.path)).not.toBe("");
  });

  it("removes only files inside the worktree that the agent asked for", async () => {
    const made = await prepareWorktree(repo, TASK);
    assert(made.ok);
    writeFileSync(join(made.path, "b.txt"), "x");
    writeFileSync(join(repo, "outside.txt"), "keep");

    const removed = await removeFiles(repo, TASK, ["a.txt", "b.txt", "../../outside.txt", join(repo, "outside.txt"), ".git", ".GIT/config", "missing.txt"]);

    expect(removed).toEqual(["a.txt", "b.txt"]);
    expect(existsSync(join(made.path, "a.txt"))).toBe(false);
    expect(existsSync(join(repo, "outside.txt"))).toBe(true);
    expect(existsSync(join(made.path, ".git"))).toBe(true);
    expect(await changesIn(repo, TASK)).toEqual([{ path: "a.txt", added: 0, removed: 1 }]);
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
