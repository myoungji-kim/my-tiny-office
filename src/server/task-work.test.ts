import { describe, expect, it } from "vitest";

import type { Review } from "../domain/review";
import type { Run } from "../domain/run";
import type { Task } from "../domain/task";

import { logOf } from "./task-work";

const min = 60_000;
const task = { id: "t1", createdAt: 0, appliedAt: 90 * min } as unknown as Task;
const run = (id: string, agentId: string, startedAt: number, endedAt: number, end: Run["end"], costUsd = 0) => ({ id, taskId: "t1", agentId, startedAt, endedAt, end, costUsd }) as unknown as Run;
const employeeOf = (agentId: string) => ({ a1: "mocha", a2: "bori" })[agentId];

describe("a task's history", () => {
  it("says what happened in order, the review once as the review, and what each run cost where it ended", () => {
    const runs = [run("r1", "a1", 1 * min, 20 * min, { kind: "finished" }, 0.3), run("r2", "a2", 21 * min, 25 * min, { kind: "finished" }, 0.1), run("r3", "a1", 40 * min, 41 * min, { kind: "denied", command: "x" })];
    const reviews = [{ taskId: "t1", reviewerId: "bori", state: "settled", startedAt: 21 * min, settledAt: 25 * min }] as unknown as Review[];

    const log = logOf(task, runs, employeeOf, reviews, [{ at: 30 * min, text: "more", kind: "sentBack" } as never, { at: 40.5 * min, text: "tests too", kind: "note" } as never]);

    expect(log.map((e) => [e.kind, e.by, e.took, e.cost])).toEqual([
      ["created", undefined, undefined, undefined],
      ["started", "mocha", undefined, undefined],
      ["finished", "mocha", 19, 0.3],
      ["reviewStarted", "bori", undefined, undefined],
      ["reviewDone", "bori", undefined, 0.1],
      ["sentBack", undefined, undefined, undefined],
      ["started", "mocha", undefined, undefined],
      ["noted", undefined, undefined, undefined],
      ["stoppedAtRun", "mocha", undefined, undefined],
      ["applied", undefined, undefined, undefined],
    ]);
  });
});
