import { describe, expect, it } from "vitest";

import { toAgentId, toCompanyId, toEmployeeId, toRunId, toTaskId } from "./ids";
import { endRun, reportDetail, sessionStarted, sessionToContinue, startRun, stepDetail, type Agent } from "./run";

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

  it("keeps a step to one short line", () => {
    expect(stepDetail("  npm   test\n-- history ")).toBe("npm test -- history");
    expect(stepDetail("x".repeat(400))).toHaveLength(300);
  });

  it("keeps the closing report whole, lines and all", () => {
    expect(reportDetail("## 1. 제품\r\n\r\n\r\n\r\n- 로컬 도구\n")).toBe("## 1. 제품\n\n- 로컬 도구");
    expect(reportDetail("x".repeat(5000))).toHaveLength(4000);
  });
});
