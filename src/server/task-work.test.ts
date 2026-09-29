import { describe, expect, it } from "vitest";

import type { Review } from "../domain/review";
import type { Run } from "../domain/run";
import type { Task } from "../domain/task";

import { logOf } from "./task-work";

const min = 60_000;
const task = { id: "t1", createdAt: 0, appliedAt: 90 * min } as unknown as Task;
const run = (id: string, agentId: string, startedAt: number, endedAt: number, end: Run["end"]) => ({ id, taskId: "t1", agentId, startedAt, endedAt, end }) as unknown as Run;
const employeeOf = (agentId: string) => ({ a1: "mocha", a2: "bori" })[agentId];

describe("a task's history", () => {
  it("says what happened in order, the review once as the review", () => {
    const runs = [run("r1", "a1", 1 * min, 20 * min, { kind: "finished" }), run("r2", "a2", 21 * min, 25 * min, { kind: "finished" }), run("r3", "a1", 40 * min, 41 * min, { kind: "denied", command: "x" })];
    const reviews = [{ taskId: "t1", reviewerId: "bori", state: "settled", startedAt: 21 * min, settledAt: 25 * min }] as unknown as Review[];

    const log = logOf(task, runs, employeeOf, reviews, [{ at: 30 * min, text: "more" } as never]);

    expect(log.map((e) => [e.kind, e.by, e.took])).toEqual([
      ["created", undefined, undefined],
      ["started", "mocha", undefined],
      ["finished", "mocha", 19],
      ["reviewStarted", "bori", undefined],
      ["reviewDone", "bori", undefined],
      ["sentBack", undefined, undefined],
      ["started", "mocha", undefined],
      ["stoppedAtRun", "mocha", undefined],
      ["applied", undefined, undefined],
    ]);
  });
});
