import { randomUUID } from "node:crypto";

import type { AppContext } from "../application/context";
import type { CompanyId } from "../domain/ids";

import { createSqliteCompanyRepository } from "./persistence/company-repository";
import { getCompanyFiles, type CompanyFiles } from "./persistence/company-files";
import type { DatabaseHandle } from "./persistence/database";
import { createSqliteEmployeeRepository } from "./persistence/employee-repository";
import { createSqliteMilestoneRepository, createSqliteReviewRepository } from "./persistence/history-repository";
import { createSqliteAreaRepository, createSqliteMemoryRepository } from "./persistence/memory-repository";
import { createSqliteRoleRepository, createSqliteTeamRepository } from "./persistence/organisation-repository";
import { createSqliteProjectRepository } from "./persistence/project-repository";
import { createSqliteTaskRepository } from "./persistence/task-repository";

export function createAppContext(handle: DatabaseHandle): AppContext {
  return {
    companies: createSqliteCompanyRepository(handle.db),
    employees: createSqliteEmployeeRepository(handle.db),
    projects: createSqliteProjectRepository(handle.db),
    tasks: createSqliteTaskRepository(handle.db),
    areas: createSqliteAreaRepository(handle.db),
    memories: createSqliteMemoryRepository(handle.db),
    roles: createSqliteRoleRepository(handle.db),
    teams: createSqliteTeamRepository(handle.db),
    reviews: createSqliteReviewRepository(handle.db),
    milestones: createSqliteMilestoneRepository(handle.db),
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
