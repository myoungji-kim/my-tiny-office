import * as companyDomain from "../domain/company";
import type { CompanyCreated } from "../domain/events";
import { toCompanyId, toEventId, type CompanyId } from "../domain/ids";

import type { AppContext } from "./context";

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

export async function createCompany(
  ctx: AppContext,
  input: CreateCompanyInput,
): Promise<CreateCompanyOutput> {
  const now = ctx.now();

  const { company, events } = companyDomain.createCompany(
    { id: input.id ?? toCompanyId(ctx.newId()), name: input.name, description: input.description },
    toEventId(ctx.newId()),
    now,
  );

  await ctx.companies.save(company);

  return { company, events };
}
