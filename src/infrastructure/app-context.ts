import { randomUUID } from "node:crypto";

import type { AppContext } from "../application/context";

import { createSqliteCompanyRepository } from "./persistence/company-repository";
import type { DatabaseHandle } from "./persistence/database";
import { createSqliteEmployeeRepository } from "./persistence/employee-repository";
import { createSqliteMilestoneRepository, createSqliteReviewRepository } from "./persistence/history-repository";
import { createSqliteAreaRepository, createSqliteMemoryRepository } from "./persistence/memory-repository";
import { createSqliteRoleRepository, createSqliteTeamRepository } from "./persistence/organisation-repository";
import { createSqliteProjectRepository } from "./persistence/project-repository";
import { createSqliteAgentRepository, createSqliteRunRepository, createSqliteRunStepRepository, createSqliteTaskRequestRepository } from "./persistence/run-repository";
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
    agents: createSqliteAgentRepository(handle.db),
    runs: createSqliteRunRepository(handle.db),
    runSteps: createSqliteRunStepRepository(handle.db, randomUUID),
    requests: createSqliteTaskRequestRepository(handle.db, randomUUID),
    now: () => Date.now(),
    newId: () => randomUUID(),
    withTransaction: handle.withTransaction,
  };
}
