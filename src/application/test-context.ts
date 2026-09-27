import type { CompanyId, RoleId } from "../domain/ids";

import type { AppContext } from "./context";
import {
  createInMemoryAreaRepository,
  createInMemoryCompanyRepository,
  createInMemoryEmployeeRepository,
  createInMemoryMemoryRepository,
  createInMemoryMilestoneRepository,
  createInMemoryProjectRepository,
  createInMemoryReviewRepository,
  createInMemoryRoleRepository,
  createInMemoryTaskRepository,
  createInMemoryTeamRepository,
  withoutTransaction,
} from "./in-memory-repositories";

// A context over in-memory repositories with a counting id and a clock the
// test moves itself.
export function createTestContext(clock: () => number = () => 1_700_000_000_000): AppContext {
  let counter = 0;
  return {
    companies: createInMemoryCompanyRepository(),
    employees: createInMemoryEmployeeRepository(),
    projects: createInMemoryProjectRepository(),
    tasks: createInMemoryTaskRepository(),
    areas: createInMemoryAreaRepository(),
    memories: createInMemoryMemoryRepository(),
    roles: createInMemoryRoleRepository(),
    teams: createInMemoryTeamRepository(),
    reviews: createInMemoryReviewRepository(),
    milestones: createInMemoryMilestoneRepository(),
    now: clock,
    newId: () => `id-${(counter += 1)}`,
    withTransaction: withoutTransaction,
  };
}

export async function firstRole(ctx: AppContext, companyId: CompanyId): Promise<RoleId> {
  return (await ctx.roles.findByCompany(companyId))[0].id;
}
