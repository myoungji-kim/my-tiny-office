import { afterEach, assert, beforeEach, describe, expect, it } from "vitest";

import { createCompany } from "../../application/company";
import type { AppContext } from "../../application/context";
import { hireEmployee } from "../../application/employee";
import type { TaskRepository } from "../../application/repositories";
import { assignTask, createTask, settleDueTasks, startTask } from "../../application/task";
import type { CompanyId, EmployeeId } from "../../domain/ids";
import type { Task } from "../../domain/task";

import { createSqliteCompanyRepository } from "./company-repository";
import { createSqliteEmployeeRepository } from "./employee-repository";
import { createSqliteTaskRepository } from "./task-repository";
import { createTestDatabase, type TestDatabase } from "./test-database";

const minute = 60_000;
const baseTime = 1_700_000_000_000;
const relaunchedAt = baseTime + 300 * minute;

let database: TestDatabase;
let current: number;
let idCounter: number;

function createContext(tasks?: TaskRepository): AppContext {
  const handle = database.handle;

  return {
    companies: createSqliteCompanyRepository(handle.db),
    employees: createSqliteEmployeeRepository(handle.db),
    tasks: tasks ?? createSqliteTaskRepository(handle.db),
    now: () => current,
    newId: () => `id-${(idCounter += 1)}`,
    withTransaction: handle.withTransaction,
  };
}

function failOnSave(repository: TaskRepository, nth: number): TaskRepository {
  let saves = 0;

  return {
    findById: (id) => repository.findById(id),
    findByCompany: (id) => repository.findByCompany(id),
    findWorkingByCompany: (id) => repository.findWorkingByCompany(id),
    async save(task) {
      saves += 1;
      if (saves === nth) {
        throw new Error("save failed");
      }
      return repository.save(task);
    },
  };
}

async function startTaskAt(
  ctx: AppContext,
  companyId: CompanyId,
  employeeId: EmployeeId,
  title: string,
  estimatedDuration: number,
  startedAt: number,
): Promise<Task> {
  const created = await createTask(ctx, { companyId, title, priority: "normal", estimatedDuration });
  assert(created.ok);

  const assigned = await assignTask(ctx, { taskId: created.value.task.id, employeeId });
  assert(assigned.ok);

  current = startedAt;
  const started = await startTask(ctx, { taskId: created.value.task.id });
  assert(started.ok);

  return started.value.task;
}

beforeEach(() => {
  database = createTestDatabase();
  current = baseTime;
  idCounter = 0;
});

afterEach(() => {
  database.cleanup();
});

describe("settleDueTasks on sqlite", () => {
  async function seedTwoDueTasks() {
    const ctx = createContext();

    const { company } = await createCompany(ctx, { name: "TinySoft" });
    const hired = await hireEmployee(ctx, {
      companyId: company.id,
      name: "Min-su",
      role: "Backend Engineer",
    });
    assert(hired.ok);

    const longer = await startTaskAt(
      ctx,
      company.id,
      hired.value.employee.id,
      "Payment API",
      30 * minute,
      baseTime,
    );
    const shorter = await startTaskAt(
      ctx,
      company.id,
      hired.value.employee.id,
      "Fix typo",
      10 * minute,
      baseTime + 5 * minute,
    );

    return { ctx, company, longer, shorter };
  }

  it("completes every due task in one transaction", async () => {
    const { ctx, company, longer, shorter } = await seedTwoDueTasks();

    current = relaunchedAt;
    const result = await settleDueTasks(ctx, { companyId: company.id });

    assert(result.ok);
    expect(result.value.settledTasks.map((task) => task.title)).toEqual([
      "Fix typo",
      "Payment API",
    ]);

    const stored = createSqliteTaskRepository(database.handle.db);
    await expect(stored.findById(longer.id)).resolves.toMatchObject({
      status: "done",
      completedAt: baseTime + 30 * minute,
    });
    await expect(stored.findById(shorter.id)).resolves.toMatchObject({
      status: "done",
      completedAt: baseTime + 5 * minute + 10 * minute,
    });
  });

  it("leaves no task completed when one of the writes fails", async () => {
    const { company, longer, shorter } = await seedTwoDueTasks();

    const stored = createSqliteTaskRepository(database.handle.db);
    const failing = createContext(failOnSave(createSqliteTaskRepository(database.handle.db), 2));

    current = relaunchedAt;
    await expect(settleDueTasks(failing, { companyId: company.id })).rejects.toThrow("save failed");

    await expect(stored.findById(longer.id)).resolves.toMatchObject({ status: "working" });
    await expect(stored.findById(shorter.id)).resolves.toMatchObject({ status: "working" });
    await expect(stored.findWorkingByCompany(company.id)).resolves.toHaveLength(2);
  });
});
