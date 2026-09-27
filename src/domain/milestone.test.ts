import { describe, expect, it } from "vitest";

import { toCompanyId, toEmployeeId, toEventId, toMemoryId, toProjectId, toReviewId, toRoleId, toTaskId, toTeamId } from "./ids";
import { alreadyRecorded, milestonesFor, type CompanyFacts } from "./milestone";

const t0 = 1_700_000_000_000;
const base = { eventId: toEventId("e"), occurredAt: t0, companyId: toCompanyId("c") };
const facts = (extra: Partial<CompanyFacts> = {}): CompanyFacts => ({
  hires: 1,
  tasksApplied: 0,
  reviewsSettled: 0,
  memories: 0,
  teamMembers: () => 0,
  teamFormed: () => false,
  ...extra,
});

const hired = {
  ...base,
  type: "EmployeeHired" as const,
  employeeId: toEmployeeId("m"),
  employeeName: "모카",
  roleId: toRoleId("r"),
  teamId: toTeamId("t"),
};

describe("milestonesFor", () => {
  it("calls out the first hire, and forms a team with its first member", () => {
    expect(milestonesFor(hired, facts({ teamMembers: () => 1 }))).toEqual([
      { kind: "joined", employeeId: "m", employeeName: "모카", first: true },
      { kind: "teamFormed", teamId: "t" },
    ]);
    expect(milestonesFor(hired, facts({ hires: 2, teamMembers: () => 1, teamFormed: () => true }))).toEqual([
      { kind: "joined", employeeId: "m", employeeName: "모카", first: false },
    ]);
  });

  it("forms a team that several people move into at once", () => {
    const moved = { ...base, type: "EmployeeMoved" as const, employeeId: toEmployeeId("m"), employeeName: "모카", teamId: toTeamId("t") };

    expect(milestonesFor(moved, facts({ teamMembers: () => 3 }))).toEqual([{ kind: "teamFormed", teamId: "t" }]);
  });

  it("marks the first task applied, then 10 · 50 · 100 · 500", () => {
    const applied = { ...base, type: "TaskApplied" as const, taskId: toTaskId("t"), taskTitle: "t" };

    expect(milestonesFor(applied, facts({ tasksApplied: 1 }))).toEqual([{ kind: "firstTaskDone" }]);
    expect(milestonesFor(applied, facts({ tasksApplied: 2 }))).toEqual([]);
    expect(milestonesFor(applied, facts({ tasksApplied: 50 }))).toEqual([{ kind: "tasksDone", count: 50 }]);
  });

  it("marks the first review settled and memory at 10 · 50 · 100", () => {
    const settled = { ...base, type: "ReviewSettled" as const, reviewId: toReviewId("r"), taskId: toTaskId("t"), reviewerId: toEmployeeId("p"), reviewerName: "삐약" };
    const taught = { ...base, type: "MemoryTaught" as const, memoryId: toMemoryId("m"), kind: "company" as const, employeeId: undefined, areaId: undefined };

    expect(milestonesFor(settled, facts({ reviewsSettled: 1 }))).toEqual([{ kind: "firstReview" }]);
    expect(milestonesFor(settled, facts({ reviewsSettled: 2 }))).toEqual([]);
    expect(milestonesFor(taught, facts({ memories: 10 }))).toEqual([{ kind: "memories", count: 10 }]);
    expect(milestonesFor(taught, facts({ memories: 11 }))).toEqual([]);
  });
});

describe("alreadyRecorded", () => {
  it("never records a mark twice, however the count got back to it", () => {
    const history = [{ kind: "memories" as const, count: 10 }, { kind: "firstTaskDone" as const }, { kind: "teamFormed" as const, teamId: toTeamId("t") }];

    expect(alreadyRecorded({ kind: "memories", count: 10 }, history)).toBe(true);
    expect(alreadyRecorded({ kind: "memories", count: 50 }, history)).toBe(false);
    expect(alreadyRecorded({ kind: "firstTaskDone" }, history)).toBe(true);
    expect(alreadyRecorded({ kind: "teamFormed", teamId: toTeamId("t") }, history)).toBe(true);
    expect(alreadyRecorded({ kind: "teamFormed", teamId: toTeamId("u") }, history)).toBe(false);
  });

  it("records every project that finishes, each time", () => {
    const done = { kind: "projectFinished" as const, projectId: toProjectId("p"), projectName: "결제 개편" };

    expect(alreadyRecorded(done, [done])).toBe(false);
  });
});
