import * as companyDomain from "../domain/company";
import type { CompanyCreated } from "../domain/events";
import { toAreaId, toCompanyId, toEventId, toRoleId, type CompanyId } from "../domain/ids";
import { startingAreas, STARTING_AREAS } from "../domain/memory";
import { startingRoles, STARTING_ROLES } from "../domain/organisation";

import type { AppContext } from "./context";
import { recordMilestones } from "./history";

export interface CreateCompanyInput {
  // Given when the company must match a file already chosen for it.
  readonly id?: CompanyId;
  readonly name: string;
  readonly description?: string;
}

export interface CreateCompanyOutput {
  readonly company: companyDomain.Company;
  readonly events: readonly [CompanyCreated];
}

export function createCompany(ctx: AppContext, input: CreateCompanyInput): Promise<CreateCompanyOutput> {
  return ctx.withTransaction(() => create(ctx, input));
}

async function create(ctx: AppContext, input: CreateCompanyInput): Promise<CreateCompanyOutput> {
  const now = ctx.now();

  const { company, events } = companyDomain.createCompany(
    { id: input.id ?? toCompanyId(ctx.newId()), name: input.name, description: input.description },
    toEventId(ctx.newId()),
    now,
  );

  await ctx.companies.save(company);
  for (const area of startingAreas(company.id, STARTING_AREAS.map(() => toAreaId(ctx.newId())), now)) {
    await ctx.areas.save(area);
  }
  for (const role of startingRoles(company.id, STARTING_ROLES.map(() => toRoleId(ctx.newId())), now)) {
    await ctx.roles.save(role);
  }
  await recordMilestones(ctx, company.id, events);

  return { company, events };
}
