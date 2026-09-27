import { assert, describe, expect, it } from "vitest";

import { toCompanyId, toEventId, toProjectId } from "./ids";
import {
  allowCommand,
  createProject,
  finishProject,
  holdProject,
  isAllowableCommand,
  reopenProject,
  resumeProject,
  startProject,
  type Project,
} from "./project";

const t0 = 1_700_000_000_000;
const eventId = toEventId("event-1");

function planned(folder?: string): Project {
  const created = createProject(
    { id: toProjectId("pay"), companyId: toCompanyId("c"), name: " 결제 개편 ", priority: "high", folder, commands: ["npm test", "npm test"] },
    eventId,
    t0,
  );
  assert(created.ok);
  return created.project;
}

function active(): Project {
  const started = startProject(planned("/code/pay"), eventId, t0 + 1);
  assert(started.ok);
  return started.project;
}

describe("a project's life", () => {
  it("is planned when made, with its commands once each", () => {
    expect(planned()).toMatchObject({ status: "planned", name: "결제 개편", commands: ["npm test"], startedAt: undefined });
  });

  it("starts only with a folder, and that is when its span begins", () => {
    expect(startProject(planned(), eventId, t0)).toMatchObject({ reason: "projectHasNoFolder" });
    expect(active()).toMatchObject({ status: "active", startedAt: t0 + 1 });
  });

  it("is held with a reason and resumed", () => {
    expect(holdProject(active(), " ", eventId, t0)).toMatchObject({ reason: "reasonRequired" });
    const held = holdProject(active(), "payments first", eventId, t0);
    assert(held.ok);
    expect(held.project).toMatchObject({ status: "held", heldReason: "payments first" });

    const resumed = resumeProject(held.project, eventId, t0);
    assert(resumed.ok);
    expect(resumed.project).toMatchObject({ status: "active", heldReason: undefined });
  });

  it("finishes only once nothing is in progress or waiting, and can be reopened", () => {
    expect(finishProject(active(), 2, eventId, t0)).toMatchObject({ reason: "workStillOpen" });
    const done = finishProject(active(), 0, eventId, t0 + 9);
    assert(done.ok);
    expect(done.project).toMatchObject({ status: "done", finishedAt: t0 + 9 });

    const reopened = reopenProject(done.project, eventId, t0 + 10);
    assert(reopened.ok);
    expect(reopened.project).toMatchObject({ status: "active", finishedAt: undefined, startedAt: t0 + 1 });
  });
});

describe("commands", () => {
  it("accepts an exact command", () => {
    const allowed = allowCommand(active(), "npm run typecheck", eventId, t0);
    assert(allowed.ok);
    expect(allowed.project.commands).toEqual(["npm test", "npm run typecheck"]);
  });

  it("refuses anything that would widen or break a permission rule", () => {
    for (const command of ["npm *", "npm test)", "rm (x)", "npm test\nrm -rf /", " npm test", "", "x".repeat(201), "a\tb"]) {
      expect(isAllowableCommand(command)).toBe(false);
    }
    expect(createProject({ id: toProjectId("p"), companyId: toCompanyId("c"), name: "p", priority: "low", commands: ["npm *"] }, eventId, t0)).toMatchObject({
      reason: "commandNotAllowable",
    });
  });
});
