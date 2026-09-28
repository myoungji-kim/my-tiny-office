import { describe, expect, it } from "vitest";

import type { Employee } from "./employee";
import { toCompanyId, toEmployeeId, toProjectId, toRoleId, toTaskId } from "./ids";
import { pickUps } from "./pick-up";
import type { Priority, Project, ProjectStatus } from "./project";
import type { Task, TaskStatus } from "./task";

const companyId = toCompanyId("c");

const person = (id: string, availability: Employee["availability"] = "available"): Employee => ({
  id: toEmployeeId(id),
  companyId,
  name: id,
  species: "cat",
  roleId: toRoleId("r"),
  teamId: undefined,
  availability,
  leaveSince: undefined,
  hiredAt: 0,
});

const project = (id: string, priority: Priority, status: ProjectStatus = "active"): Project => ({
  id: toProjectId(id),
  companyId,
  name: id,
  description: undefined,
  folder: "/code/" + id,
  folderConfirmed: true,
  commands: [],
  status,
  priority,
  heldReason: undefined,
  createdAt: 0,
  startedAt: 0,
  finishedAt: undefined,
});

const task = (id: string, projectId: string, priority: Priority, createdAt: number, extra: Partial<Task> = {}): Task => ({
  id: toTaskId(id),
  companyId,
  projectId: toProjectId(projectId),
  title: id,
  description: undefined,
  area: undefined,
  priority,
  assigneeId: undefined,
  status: "backlog" as TaskStatus,
  blocker: undefined,
  heldReason: undefined,
  heldFrom: undefined,
  heldWithProject: false,
  changesRequested: undefined,
  createdAt,
  startedAt: undefined,
  workedFor: 0,
  runningSince: undefined,
  finishedAt: undefined,
  appliedAt: undefined,
  ...extra,
});

describe("pickUps", () => {
  const projects = [project("pay", "high"), project("order", "normal"), project("admin", "low", "held"), project("settle", "high", "planned")];

  it("orders by the project's priority, then the task's, then the oldest", () => {
    const tasks = [
      task("order-high", "order", "high", 1),
      task("pay-low", "pay", "low", 2),
      task("pay-normal-new", "pay", "normal", 9),
      task("pay-normal-old", "pay", "normal", 3),
    ];

    const picked = pickUps(projects, tasks, [person("a"), person("b"), person("c"), person("d")], []);

    expect(picked.map((p) => p.taskId)).toEqual(["pay-normal-old", "pay-normal-new", "pay-low", "order-high"]);
  });

  it("picks nothing from a held or planned project", () => {
    const tasks = [task("admin-1", "admin", "high", 1), task("settle-1", "settle", "high", 1)];

    expect(pickUps(projects, tasks, [person("a")], [])).toEqual([]);
  });

  it("picks nothing from a folder not chosen on this computer", () => {
    const imported = projects.map((p) => ({ ...p, folderConfirmed: false }));

    expect(pickUps(imported, [task("pay-1", "pay", "high", 1)], [person("a")], [])).toEqual([]);
  });

  it("gives one thing at a time, and nothing to someone busy or on leave", () => {
    const tasks = [
      task("running", "pay", "high", 1, { status: "working", assigneeId: toEmployeeId("busy") }),
      task("next", "pay", "high", 2),
    ];

    expect(pickUps(projects, tasks, [person("busy"), person("away", "onLeave")], [])).toEqual([]);
  });

  it("keeps work handed to someone for them, and they take it before anything else", () => {
    const tasks = [
      task("unclaimed-high", "pay", "high", 1),
      task("for-b", "order", "low", 2, { assigneeId: toEmployeeId("b") }),
    ];

    const picked = pickUps(projects, tasks, [person("a"), person("b")], []);

    expect(picked).toEqual([
      { employeeId: "a", taskId: "unclaimed-high" },
      { employeeId: "b", taskId: "for-b" },
    ]);
    expect(pickUps(projects, [tasks[1]], [person("a")], [])).toEqual([]);
  });
});
