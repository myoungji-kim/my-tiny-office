import { describe, expect, it } from "vitest";

import type { Executable, RunResult } from "../process/run";

import { checkClaudeCode, type StatusDeps } from "./claude-code-status";

const ok = (stdout: string, code = 0): RunResult => ({ code, stdout, stderr: "", timedOut: false, truncated: false });

function deps(found: Executable, answers: Record<string, RunResult | Error>): StatusDeps & { calls: string[][] } {
  const calls: string[][] = [];
  return {
    calls,
    find: () => found,
    run: async (file, args) => {
      calls.push([file, ...args]);
      const answer = answers[args.join(" ")];
      if (answer instanceof Error) throw answer;
      if (answer === undefined) throw new Error("unexpected " + args.join(" "));
      return answer;
    },
  };
}

const exe: Executable = { kind: "found", path: "C:\\bin\\claude.exe" };
const signedIn = JSON.stringify({ loggedIn: true, authMethod: "claude.ai", subscriptionType: "team", email: "someone@example.com", orgName: "Org" });

describe("checkClaudeCode", () => {
  it("is ready when found, running and signed in, and keeps only the plan", async () => {
    const status = await checkClaudeCode(deps(exe, { "--version": ok("2.1.283 (Claude Code)"), "auth status --json": ok(signedIn) }));

    expect(status).toEqual({ state: "ready", version: "2.1.283", plan: "team" });
    expect(JSON.stringify(status)).not.toContain("example.com");
  });

  it("says when it is signed out, whatever the exit code", async () => {
    const out = JSON.stringify({ loggedIn: false });

    await expect(checkClaudeCode(deps(exe, { "--version": ok("2.1.283"), "auth status --json": ok(out, 1) }))).resolves.toEqual({
      state: "signedOut",
      version: "2.1.283",
    });
    await expect(checkClaudeCode(deps(exe, { "--version": ok("2.1.283"), "auth status --json": ok("not json") }))).resolves.toMatchObject({
      state: "signedOut",
    });
  });

  it("tells not installed, a .cmd shim and a program that will not run apart", async () => {
    await expect(checkClaudeCode(deps({ kind: "missing" }, {}))).resolves.toEqual({ state: "notInstalled" });
    await expect(checkClaudeCode(deps({ kind: "shim", path: "C:\\npm\\claude.cmd" }, {}))).resolves.toEqual({
      state: "shimOnly",
      path: "C:\\npm\\claude.cmd",
    });
    await expect(checkClaudeCode(deps(exe, { "--version": new Error("spawn EACCES") }))).resolves.toEqual({ state: "broken", path: exe.path });
    await expect(checkClaudeCode(deps(exe, { "--version": ok("", 1) }))).resolves.toMatchObject({ state: "broken" });
  });

  it("never shows a plan name it does not recognise as one", async () => {
    const odd = JSON.stringify({ loggedIn: true, subscriptionType: "<script>" });

    await expect(checkClaudeCode(deps(exe, { "--version": ok("2.1.283"), "auth status --json": ok(odd) }))).resolves.toEqual({
      state: "ready",
      version: "2.1.283",
      plan: undefined,
    });
  });
});
