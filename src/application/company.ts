import * as companyDomain from "../domain/company";
import { toAreaId, toCompanyId, toEventId, toRoleId, type CompanyId } from "../domain/ids";
import type { NameFailure } from "../domain/name";
import { startingAreas, STARTING_AREAS } from "../domain/memory";
import { startingRoles, STARTING_ROLES } from "../domain/organisation";

import type { AppContext, UseCaseResult } from "./context";
import { recordMilestones } from "./history";

export interface CreateCompanyInput {
  // Given when the company must match a file already chosen for it.
  readonly id?: CompanyId;
  readonly name: string;
  readonly description?: string;
}

export type CreateCompanyResult = UseCaseResult<{ readonly company: companyDomain.Company }, NameFailure>;

// A company is made whole — its areas, roles and first line of history — or not at all.
export function createCompany(ctx: AppContext, input: CreateCompanyInput): Promise<CreateCompanyResult> {
  return ctx.withTransaction(() => create(ctx, input));
}

export async function renameCompany(
  ctx: AppContext,
  companyId: CompanyId,
  name: string,
): Promise<UseCaseResult<{ readonly company: companyDomain.Company }, "companyNotFound" | NameFailure>> {
  const company = await ctx.companies.findById(companyId);
  if (company === undefined) return { ok: false, reason: "companyNotFound" };
  const renamed = companyDomain.renameCompany(company, name);
  if (!renamed.ok) return renamed;
  await ctx.companies.save(renamed.company);
  return { ok: true, value: { company: renamed.company }, events: [] };
}

async function create(ctx: AppContext, input: CreateCompanyInput): Promise<CreateCompanyResult> {
  const now = ctx.now();

  const created = companyDomain.createCompany(
    { id: input.id ?? toCompanyId(ctx.newId()), name: input.name, description: input.description },
    toEventId(ctx.newId()),
    now,
  );
  if (!created.ok) return created;
  const { company, events } = created;

  await ctx.companies.save(company);
  for (const area of startingAreas(company.id, STARTING_AREAS.map(() => toAreaId(ctx.newId())), now)) {
    await ctx.areas.save(area);
  }
  for (const role of startingRoles(company.id, STARTING_ROLES.map(() => toRoleId(ctx.newId())), now)) {
    await ctx.roles.save(role);
  }
  await recordMilestones(ctx, company.id, events);

  return { ok: true, value: { company }, events };
}
