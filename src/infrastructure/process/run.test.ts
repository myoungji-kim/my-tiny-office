import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { findExecutable, runProcess } from "./run";

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
