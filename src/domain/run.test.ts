import { describe, expect, it } from "vitest";

import { toAgentId, toCompanyId, toEmployeeId, toRunId, toTaskId } from "./ids";
import { toMemoryId } from "./ids";
import { endRun, readReport, reportDetail, settleSuggestion, sessionStarted, sessionToContinue, startRun, stepDetail, type Agent } from "./run";

const agent = (id: string): Agent => ({ id: toAgentId(id), companyId: toCompanyId("c"), employeeId: toEmployeeId("e-" + id), runtime: "claudeCode", createdAt: 0 });
const task = toTaskId("t");

describe("a run", () => {
  it("starts, learns its session, and ends once with what it cost", () => {
    const started = startRun({ id: toRunId("r"), agent: agent("a"), taskId: task, sessionId: undefined }, 10);
    const running = sessionStarted(started, "s-1");
    const ended = endRun(running, { kind: "finished" }, 0.12, 20);

    expect(started).toMatchObject({ state: "starting", costUsd: 0 });
    expect(running).toMatchObject({ state: "running", sessionId: "s-1" });
    expect(ended).toMatchObject({ state: "ended", end: { kind: "finished" }, costUsd: 0.12, endedAt: 20 });
    expect(endRun(ended, { kind: "failed" }, 1, 30)).toBe(ended);
  });

  it("continues the same agent's last session on the task, never another agent's", () => {
    const a = agent("a");
    const b = agent("b");
    const runs = [
      { ...startRun({ id: toRunId("1"), agent: a, taskId: task, sessionId: "old" }, 1) },
      { ...startRun({ id: toRunId("2"), agent: a, taskId: task, sessionId: "new" }, 2) },
      { ...startRun({ id: toRunId("3"), agent: b, taskId: task, sessionId: "theirs" }, 3) },
    ];

    expect(sessionToContinue(runs, task, a.id)).toBe("new");
    expect(sessionToContinue(runs, task, toAgentId("c"))).toBeUndefined();
  });

  it("starts afresh after a resume that never named its session, not after one stopped on purpose", () => {
    const a = agent("a");
    const named = startRun({ id: toRunId("1"), agent: a, taskId: task, sessionId: "kept" }, 1);
    const stopped = endRun(startRun({ id: toRunId("2"), agent: a, taskId: task, sessionId: undefined }, 2), { kind: "stopped" }, 0, 3);
    const lost = endRun(startRun({ id: toRunId("3"), agent: a, taskId: task, sessionId: undefined }, 4), { kind: "disconnected" }, 0, 5);

    expect(sessionToContinue([named, stopped], task, a.id)).toBe("kept");
    expect(sessionToContinue([named, stopped, lost], task, a.id)).toBeUndefined();
  });

  it("reads which numbered memories a report drew on, and leaves the line out of it", () => {
    const carried = [toMemoryId("m1"), toMemoryId("m2"), toMemoryId("m3")];

    expect(readReport("Paginated.\n\n**Memories used:** 3, 1, 9", carried)).toEqual({ report: "Paginated.", used: ["m3", "m1"], suggestions: [], removals: [] });
    expect(readReport("Done.\nMemories used: none", carried)).toEqual({ report: "Done.", used: [], suggestions: [], removals: [] });
    expect(readReport("Done, using 2 of them.", carried)).toEqual({ report: "Done, using 2 of them.", used: [], suggestions: [], removals: [] });
  });

  it("keeps up to two things worth remembering, each short enough to teach", () => {
    const report = readReport(
      [
        "Done.",
        "",
        "Worth remembering: 테스트는 `npm run test:unit`으로 돌려요",
        "**Worth remembering:** Dates are stored as epoch ms",
        "Worth remembering: " + "x".repeat(300),
        "Worth remembering: a third one",
        "Memories used: 1",
      ].join("\n"),
      [toMemoryId("m1")],
    );

    expect(report).toEqual({ report: "Done.", used: ["m1"], removals: [], suggestions: ["테스트는 `npm run test:unit`으로 돌려요", "Dates are stored as epoch ms"] });
  });

  it("reads which files the agent asked to remove", () => {
    expect(readReport("Moved it.\nRemove: `memory-notes.md`\n**Remove:** old/a.js\nMemories used: none", []).removals).toEqual(["memory-notes.md", "old/a.js"]);
  });

  it("forgets a suggestion once taught or passed on", () => {
    const run = startRun({ id: toRunId("r"), agent: agent("a"), taskId: task, sessionId: undefined }, 1);
    expect(settleSuggestion({ ...run, suggestions: ["a", "b"] }, "a").suggestions).toEqual(["b"]);
  });

  it("keeps a step to one short line", () => {
    expect(stepDetail("  npm   test\n-- history ")).toBe("npm test -- history");
    expect(stepDetail("x".repeat(400))).toHaveLength(300);
  });

  it("keeps the closing report whole, lines and all", () => {
    expect(reportDetail("## 1. 제품\r\n\r\n\r\n\r\n- 로컬 도구\n")).toBe("## 1. 제품\n\n- 로컬 도구");
    expect(reportDetail("x".repeat(5000))).toHaveLength(4000);
  });
});
