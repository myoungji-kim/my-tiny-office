import * as companyDomain from "../domain/company";
import type { CompanyCreated } from "../domain/events";
import { toCompanyId, toEventId } from "../domain/ids";

import type { AppContext } from "./context";

export interface CreateCompanyInput {
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
    { id: toCompanyId(ctx.newId()), name: input.name, description: input.description },
    toEventId(ctx.newId()),
    now,
  );

  await ctx.companies.save(company);

  return { company, events };
}
