import { describe, expect, it } from "vitest";

import { en } from "../i18n/en";

import { rowsFor } from "./claude-checks";

const w = en.claude;

describe("the Claude Code checklist", () => {
  it("shows the one command that fixes each state, and never runs it", () => {
    expect(rowsFor({ state: "signedOut", version: "2.1.283" }, w)).toMatchObject([
      { icon: "ok", title: w.installed, value: "2.1.283" },
      { icon: "bad", title: w.signedOut, command: "claude auth login" },
    ]);
    expect(rowsFor({ state: "shimOnly", path: "C:\npm\claude.cmd" }, w)).toMatchObject([
      { icon: "bad", title: w.shim, command: "claude install" },
      { icon: "wait", title: w.signInStep },
    ]);
  });

  it("waits on sign-in until Claude Code is there and runs", () => {
    for (const status of [{ state: "notInstalled" as const }, { state: "broken" as const, path: "x" }]) {
      const rows = rowsFor(status, w);
      expect(rows.map((r) => r.icon)).toEqual(["bad", "wait"]);
      expect(rows.some((r) => r.command !== undefined)).toBe(false);
    }
  });

  it("is all ticks when ready, with the plan beside sign-in", () => {
    expect(rowsFor({ state: "ready", version: "2.1.283", plan: "pro" }, w)).toMatchObject([
      { icon: "ok", value: "2.1.283" },
      { icon: "ok", value: "pro" },
    ]);
  });
});
