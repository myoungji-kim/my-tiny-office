import { readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { childEnvironment, findExecutable, MAX_OUTPUT, runProcess } from "./run";

const node = process.execPath;

describe("runProcess", () => {
  it("passes arguments through untouched, shell syntax included", async () => {
    const hostile = ["a b", "$(whoami)", "`id`", "; rm -rf /", "& del x", "| echo", "\"quoted\"", "%PATH%"];
    const result = await runProcess(node, ["-e", "process.stdout.write(JSON.stringify(process.argv.slice(1)))", ...hostile]);

    expect(result.code).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual(hostile);
  });

  it("gives the input on stdin", async () => {
    const result = await runProcess(node, ["-e", "process.stdin.pipe(process.stdout)"], { input: "다음 업무\nline two" });

    expect(result.stdout).toBe("다음 업무\nline two");
  });

  it("stops a run that outlives its time", async () => {
    const result = await runProcess(node, ["-e", "setTimeout(() => {}, 10000)"], { timeoutMs: 200 });

    expect(result.timedOut).toBe(true);
    expect(result.code).not.toBe(0);
  });

  it("fails when the program is not there", async () => {
    await expect(runProcess(join("no", "such", "program"), [])).rejects.toThrow();
  });
});

describe("findExecutable", () => {
  const on = (files: string[]) => (path: string) => files.includes(path);

  it("finds a native program on PATH", () => {
    const found = findExecutable("claude", { PATH: "C:\\a;C:\\bin", PATHEXT: ".COM;.EXE;.BAT;.CMD" }, "win32", on([join("C:\\bin", "claude.exe")]));
    expect(found).toEqual({ kind: "found", path: join("C:\\bin", "claude.exe") });
  });

  it("refuses a .cmd shim rather than running it through a shell", () => {
    const found = findExecutable("claude", { PATH: "C:\\npm", PATHEXT: ".COM;.EXE;.BAT;.CMD" }, "win32", on([join("C:\\npm", "claude.cmd")]));
    expect(found.kind).toBe("shim");
  });

  it("prefers the native program when both are on PATH", () => {
    const found = findExecutable(
      "claude",
      { PATH: "C:\\npm;C:\\bin", PATHEXT: ".COM;.EXE;.BAT;.CMD" },
      "win32",
      on([join("C:\\npm", "claude.cmd"), join("C:\\bin", "claude.exe")]),
    );
    expect(found.kind).toBe("found");
  });

  it("uses the bare name on other platforms", () => {
    expect(findExecutable("claude", { PATH: "/usr/bin:/home/u/.local/bin" }, "linux", on([join("/home/u/.local/bin", "claude")])).kind).toBe("found");
    expect(findExecutable("claude", { PATH: "/usr/bin" }, "linux", on([]))).toEqual({ kind: "missing" });
  });
});

describe("findExecutable, and what it will not pick", () => {
  const on = (files: string[]) => (path: string) => files.includes(path);

  it("skips a relative PATH entry, which would resolve inside a worktree", () => {
    expect(findExecutable("claude", { PATH: ".;bin" }, "win32", on([join(".", "claude.exe"), join("bin", "claude.exe")]))).toEqual({ kind: "missing" });
    expect(findExecutable("claude", { PATH: "bin:/usr/bin" }, "linux", on([join("bin", "claude")]))).toEqual({ kind: "missing" });
  });

  it("counts only a native program as found on Windows", () => {
    const dir = "C:\\tools";
    expect(findExecutable("claude", { PATH: dir }, "win32", on([join(dir, "claude.ps1"), join(dir, "claude.js")]))).toEqual({ kind: "missing" });
    expect(findExecutable("claude", { PATH: dir }, "win32", on([join(dir, "claude.com")])).kind).toBe("found");
  });
});

describe("runProcess, and what it keeps from a child", () => {
  it("does not hand the server's API keys to a child", () => {
    const env = childEnvironment({ NODE_ENV: "test", PATH: "/bin", ANTHROPIC_API_KEY: "sk-x", ANTHROPIC_AUTH_TOKEN: "t", CLAUDE_CONFIG_DIR: "/c" });

    expect(env).toEqual({ NODE_ENV: "test", PATH: "/bin", CLAUDE_CONFIG_DIR: "/c" });
  });

  it("keeps no more output than it can hold", async () => {
    const result = await runProcess(node, ["-e", `process.stdout.write("x".repeat(${MAX_OUTPUT + 1000}))`]);

    expect(result.stdout.length).toBe(MAX_OUTPUT);
    expect(result.truncated).toBe(true);
  });

  it("stops what the program started too, and returns though a grandchild held the pipes", async () => {
    const pidFile = join(tmpdir(), `mto-grandchild-${process.pid}-${Date.now()}`);
    const grandchild = `require("fs").writeFileSync(${JSON.stringify(pidFile)}, String(process.pid)); setTimeout(() => {}, 60000)`;
    const parent = `require("child_process").spawn(process.execPath, ["-e", ${JSON.stringify(grandchild)}], { stdio: "inherit" }); setTimeout(() => {}, 60000)`;

    const started = Date.now();
    const result = await runProcess(node, ["-e", parent], { timeoutMs: 1500 });

    expect(result.timedOut).toBe(true);
    expect(Date.now() - started).toBeLessThan(10000);
    const pid = Number(readFileSync(pidFile, "utf8"));
    rmSync(pidFile, { force: true });
    await new Promise((r) => setTimeout(r, 300));
    expect(() => process.kill(pid, 0)).toThrow();
  }, 20000);
});
