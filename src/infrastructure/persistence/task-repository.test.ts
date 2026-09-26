import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { Company } from "../../domain/company";
import type { Employee } from "../../domain/employee";
import { toCompanyId, toEmployeeId, toTaskId } from "../../domain/ids";
import type { Task } from "../../domain/task";

import { createSqliteCompanyRepository } from "./company-repository";
import { createSqliteEmployeeRepository } from "./employee-repository";
import { createSqliteTaskRepository } from "./task-repository";
import { createTestDatabase, type TestDatabase } from "./test-database";

const minute = 60_000;
const createdAt = 1_700_000_000_000;
const estimatedDuration = 30 * minute;

const company: Company = {
  id: toCompanyId("company-1"),
  name: "TinySoft",
  description: undefined,
  foundedAt: createdAt,
};

const rival: Company = { ...company, id: toCompanyId("company-2"), name: "RivalSoft" };

const employee: Employee = {
  id: toEmployeeId("employee-1"),
  companyId: company.id,
  name: "Min-su",
  role: "Backend Engineer",
  availability: "available",
  hiredAt: createdAt,
};

const backlogTask: Task = {
  id: toTaskId("task-1"),
  companyId: company.id,
  title: "Payment API",
  description: undefined,
  status: "backlog",
  priority: "normal",
  assigneeId: undefined,
  estimatedDuration,
  createdAt,
  startedAt: undefined,
  completedAt: undefined,
};

const workingTask: Task = {
  ...backlogTask,
  id: toTaskId("task-2"),
  title: "Refund API",
  description: "Handle partial refunds",
  status: "working",
  priority: "high",
  assigneeId: employee.id,
  startedAt: createdAt + minute,
};

let database: TestDatabase;

beforeEach(async () => {
  database = createTestDatabase();
  const companies = createSqliteCompanyRepository(database.handle.db);
  await companies.save(company);
  await companies.save(rival);
  await createSqliteEmployeeRepository(database.handle.db).save(employee);
});

afterEach(() => {
  database.cleanup();
});

describe("sqlite task repository", () => {
  it("keeps every unset field as undefined rather than null", async () => {
    const repository = createSqliteTaskRepository(database.handle.db);

    await repository.save(backlogTask);

    const found = await repository.findById(backlogTask.id);
    expect(found).toEqual(backlogTask);
    expect(found?.description).toBeUndefined();
    expect(found?.assigneeId).toBeUndefined();
    expect(found?.startedAt).toBeUndefined();
    expect(found?.completedAt).toBeUndefined();
  });

  it("round trips an assigned task", async () => {
    const repository = createSqliteTaskRepository(database.handle.db);

    await repository.save(workingTask);

    const found = await repository.findById(workingTask.id);
    expect(found).toEqual(workingTask);
    expect(found?.assigneeId).toBe(employee.id);
  });

  it("round trips a completed task", async () => {
    const repository = createSqliteTaskRepository(database.handle.db);
    const doneTask: Task = {
      ...workingTask,
      status: "done",
      completedAt: createdAt + minute + estimatedDuration,
    };

    await repository.save(doneTask);

    await expect(repository.findById(doneTask.id)).resolves.toEqual(doneTask);
  });

  it("updates an existing task instead of failing on the primary key", async () => {
    const repository = createSqliteTaskRepository(database.handle.db);

    await repository.save(backlogTask);
    await repository.save({ ...backlogTask, status: "ready", assigneeId: employee.id });

    await expect(repository.findById(backlogTask.id)).resolves.toMatchObject({
      status: "ready",
      assigneeId: employee.id,
    });
  });

  it("returns undefined for an unknown id", async () => {
    const repository = createSqliteTaskRepository(database.handle.db);

    await expect(repository.findById(toTaskId("missing"))).resolves.toBeUndefined();
  });

  it("rejects a task whose company does not exist", async () => {
    const repository = createSqliteTaskRepository(database.handle.db);

    await expect(
      repository.save({ ...backlogTask, companyId: toCompanyId("missing") }),
    ).rejects.toThrow();
  });

  describe("findWorkingByCompany", () => {
    it("returns only the working tasks of that company", async () => {
      const repository = createSqliteTaskRepository(database.handle.db);
      const rivalTask: Task = {
        ...workingTask,
        id: toTaskId("task-3"),
        companyId: rival.id,
        assigneeId: undefined,
      };

      await repository.save(backlogTask);
      await repository.save(workingTask);
      await repository.save(rivalTask);

      await expect(repository.findWorkingByCompany(company.id)).resolves.toEqual([workingTask]);
    });

    it("returns an empty array when nothing is being worked on", async () => {
      const repository = createSqliteTaskRepository(database.handle.db);

      await repository.save(backlogTask);

      await expect(repository.findWorkingByCompany(company.id)).resolves.toEqual([]);
    });
  });
});
