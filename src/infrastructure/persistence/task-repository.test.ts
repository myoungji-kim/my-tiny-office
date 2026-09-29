import { sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { Company } from "../../domain/company";
import type { Employee } from "../../domain/employee";
import { toAreaId, toCompanyId, toEmployeeId, toProjectId, toRoleId, toTaskId } from "../../domain/ids";
import type { Project } from "../../domain/project";
import type { Task } from "../../domain/task";

import { createSqliteCompanyRepository } from "./company-repository";
import { createSqliteEmployeeRepository } from "./employee-repository";
import { createSqliteAreaRepository } from "./memory-repository";
import { createSqliteRoleRepository } from "./organisation-repository";
import { createSqliteProjectRepository } from "./project-repository";
import { createSqliteTaskRepository } from "./task-repository";
import { createTestDatabase, type TestDatabase } from "./test-database";

const t0 = 1_700_000_000_000;
const company: Company = { id: toCompanyId("c"), name: "TinySoft", description: undefined, foundedAt: t0 };
const mocha: Employee = {
  id: toEmployeeId("mocha"),
  companyId: company.id,
  name: "모카",
  species: "cat",
  roleId: toRoleId("r"),
  teamId: undefined,
  availability: "available",
  leaveSince: undefined,
  hiredAt: t0,
};
const pay: Project = {
  id: toProjectId("pay"),
  companyId: company.id,
  name: "결제 개편",
  description: undefined,
  folder: "/code/pay",
  folderConfirmed: true,
  commands: ["npm test", "npm run lint"],
  atlassian: false,
  writes: [],
  status: "active",
  priority: "high",
  heldReason: undefined,
  createdAt: t0,
  startedAt: t0,
  finishedAt: undefined,
};
const backlog: Task = {
  id: toTaskId("t1"),
  companyId: company.id,
  projectId: pay.id,
  title: "Paginate",
  description: undefined,
  area: toAreaId("db"),
  priority: "normal",
  assigneeId: undefined,
  status: "backlog",
  blocker: undefined,
  heldReason: undefined,
  heldFrom: undefined,
  heldWithProject: false,
  changesRequested: undefined,
  reviewerId: undefined,
  createdAt: t0,
  startedAt: undefined,
  workedFor: 0,
  runningSince: undefined,
  finishedAt: undefined,
  appliedAt: undefined,
  publishedUrl: undefined,
};

let database: TestDatabase;

beforeEach(async () => {
  database = createTestDatabase();
  await createSqliteCompanyRepository(database.handle.db).save(company);
  await createSqliteRoleRepository(database.handle.db).save({ id: toRoleId("r"), companyId: company.id, name: "Backend Engineer", createdAt: t0 });
  await createSqliteEmployeeRepository(database.handle.db).save(mocha);
  await createSqliteProjectRepository(database.handle.db).save(pay);
  await createSqliteAreaRepository(database.handle.db).save({ id: toAreaId("db"), companyId: company.id, starting: "database", name: undefined, createdAt: t0 });
});

afterEach(() => {
  database.cleanup();
});

describe("tasks", () => {
  it("round-trips every field, a blocker included", async () => {
    const repo = createSqliteTaskRepository(database.handle.db);
    const blocked: Task = {
      ...backlog,
      status: "working",
      assigneeId: mocha.id,
      startedAt: t0,
      workedFor: 8 * 60_000,
      blocker: { kind: "commandNotAllowed", command: "npm run typecheck" },
    };

    await repo.save(blocked);

    await expect(repo.findById(blocked.id)).resolves.toEqual(blocked);
    await expect(repo.findByCompany(company.id)).resolves.toEqual([blocked]);
  });

  it("refuses rows that break the flow's rules", async () => {
    const repo = createSqliteTaskRepository(database.handle.db);

    await expect(repo.save({ ...backlog, status: "working" })).rejects.toThrow();
    await expect(repo.save({ ...backlog, status: "held" })).rejects.toThrow();
    await expect(repo.save({ ...backlog, status: "done", finishedAt: t0 })).rejects.toThrow();
    await expect(repo.save({ ...backlog, runningSince: t0 })).rejects.toThrow();
  });

  it("keeps a stop before a Jira write with where it goes and what it says", async () => {
    const repo = createSqliteTaskRepository(database.handle.db);
    const blocked: Task = { ...backlog, status: "working", assigneeId: mocha.id, startedAt: t0, blocker: { kind: "writeNotAllowed", write: "jiraComment", target: "ORD-231", text: "타입을 좁혔어요." } };

    await repo.save(blocked);

    await expect(repo.findById(blocked.id)).resolves.toEqual(blocked);
  });

  it("keeps where applied work went up, and only a web address", async () => {
    const repo = createSqliteTaskRepository(database.handle.db);
    const done: Task = { ...backlog, status: "done", assigneeId: mocha.id, startedAt: t0, finishedAt: t0, appliedAt: t0, publishedUrl: "https://github.com/o/r/pull/7" };
    await repo.save(done);
    await expect(repo.findById(done.id)).resolves.toMatchObject({ publishedUrl: "https://github.com/o/r/pull/7" });

    database.handle.db.run(sql`update tasks set published_url = 'javascript:alert(1)' where id = 't1'`);
    await expect(repo.findById(done.id)).resolves.toMatchObject({ publishedUrl: undefined });
  });

  it("reads an unreadable blocker as a lost connection, never as unblocked", async () => {
    const repo = createSqliteTaskRepository(database.handle.db);
    await repo.save({ ...backlog, status: "working", assigneeId: mocha.id, startedAt: t0, blocker: { kind: "disconnected" } });
    database.handle.db.run(sql`update tasks set blocker = '{broken' where id = 't1'`);

    await expect(repo.findById(backlog.id)).resolves.toMatchObject({ blocker: { kind: "disconnected" } });
  });
});

describe("projects", () => {
  it("round-trips a project with its commands", async () => {
    await expect(createSqliteProjectRepository(database.handle.db).findById(pay.id)).resolves.toEqual(pay);
  });

  it("drops a command it could not allow today, however it got into the file", async () => {
    database.handle.db.run(sql`update projects set commands = '["npm test", "rm *", "a)b", 7]' where id = 'pay'`);

    await expect(createSqliteProjectRepository(database.handle.db).findById(pay.id)).resolves.toMatchObject({ commands: ["npm test"] });
  });

  it("keeps the Jira and Confluence writes it allows only with the connector on, and none it could not allow", async () => {
    const repo = createSqliteProjectRepository(database.handle.db);
    await repo.save({ ...pay, atlassian: true, writes: ["jiraComment", "confluenceEdit"] });
    await expect(repo.findById(pay.id)).resolves.toMatchObject({ atlassian: true, writes: ["jiraComment", "confluenceEdit"] });

    database.handle.db.run(sql`update projects set writes = '["jiraComment", "sendGmail", 7]' where id = 'pay'`);
    await expect(repo.findById(pay.id)).resolves.toMatchObject({ writes: ["jiraComment"] });
    database.handle.db.run(sql`update projects set atlassian = 0 where id = 'pay'`);
    await expect(repo.findById(pay.id)).resolves.toMatchObject({ atlassian: false, writes: [] });
  });

  it("refuses an active project without a folder", async () => {
    await expect(createSqliteProjectRepository(database.handle.db).save({ ...pay, folder: undefined })).rejects.toThrow();
  });
});
