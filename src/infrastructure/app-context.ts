import { randomUUID } from "node:crypto";

import type { AppContext } from "../application/context";

import { createSqliteCompanyRepository } from "./persistence/company-repository";
import { getDatabase, type DatabaseHandle } from "./persistence/database";
import { createSqliteEmployeeRepository } from "./persistence/employee-repository";
import { createSqliteTaskRepository } from "./persistence/task-repository";

export function createAppContext(handle: DatabaseHandle = getDatabase()): AppContext {
  return {
    companies: createSqliteCompanyRepository(handle.db),
    employees: createSqliteEmployeeRepository(handle.db),
    tasks: createSqliteTaskRepository(handle.db),
    now: () => Date.now(),
    newId: () => randomUUID(),
    withTransaction: handle.withTransaction,
  };
}
