import * as employeeDomain from "../domain/employee";
import { toEmployeeId, toEventId, type CompanyId } from "../domain/ids";

import type { AppContext, UseCaseResult } from "./context";

export interface HireEmployeeInput {
  readonly companyId: CompanyId;
  readonly name: string;
  readonly role: string;
}

export type HireEmployeeFailure = "companyNotFound";

export type HireEmployeeResult = UseCaseResult<
  { readonly employee: employeeDomain.Employee },
  HireEmployeeFailure
>;

export async function hireEmployee(
  ctx: AppContext,
  input: HireEmployeeInput,
): Promise<HireEmployeeResult> {
  const now = ctx.now();

  const company = await ctx.companies.findById(input.companyId);
  if (company === undefined) {
    return { ok: false, reason: "companyNotFound" };
  }

  const { employee, events } = employeeDomain.hireEmployee(
    {
      id: toEmployeeId(ctx.newId()),
      companyId: input.companyId,
      name: input.name,
      role: input.role,
    },
    toEventId(ctx.newId()),
    now,
  );

  await ctx.employees.save(employee);

  return { ok: true, value: { employee }, events };
}
