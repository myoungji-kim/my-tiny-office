import { randomUUID } from "node:crypto";

import type { AppContext } from "../application/context";
import type { CompanyId } from "../domain/ids";

import { createSqliteCompanyRepository } from "./persistence/company-repository";
import { getCompanyFiles, type CompanyFiles } from "./persistence/company-files";
import type { DatabaseHandle } from "./persistence/database";
import { createSqliteEmployeeRepository } from "./persistence/employee-repository";
import { createSqliteTaskRepository } from "./persistence/task-repository";

export function createAppContext(handle: DatabaseHandle): AppContext {
  return {
    companies: createSqliteCompanyRepository(handle.db),
    employees: createSqliteEmployeeRepository(handle.db),
    tasks: createSqliteTaskRepository(handle.db),
    now: () => Date.now(),
    newId: () => randomUUID(),
    withTransaction: handle.withTransaction,
  };
}

// A company's context reads and writes that company's file only.
export function companyContext(
  id: CompanyId,
  files: CompanyFiles = getCompanyFiles(),
): AppContext {
  return createAppContext(files.open(id));
}
