import type { CompanyCreated } from "./events";
import type { CompanyId, EventId } from "./ids";
import { checkName, type NameFailure } from "./name";
import type { Timestamp } from "./time";

export interface Company {
  readonly id: CompanyId;
  readonly name: string;
  readonly description: string | undefined;
  readonly foundedAt: Timestamp;
}

export interface CreateCompanyInput {
  readonly id: CompanyId;
  readonly name: string;
  readonly description?: string;
}

export const MAX_COMPANY_NAME = 40;

export type CreateCompanyResult =
  | { readonly ok: true; readonly company: Company; readonly events: readonly [CompanyCreated] }
  | { readonly ok: false; readonly reason: NameFailure };

export function renameCompany(company: Company, raw: string): { readonly ok: true; readonly company: Company } | { readonly ok: false; readonly reason: NameFailure } {
  const checked = checkName(raw, MAX_COMPANY_NAME);
  if (!checked.ok) return checked;
  return { ok: true, company: { ...company, name: checked.name } };
}

export function createCompany(
  input: CreateCompanyInput,
  eventId: EventId,
  now: Timestamp,
): CreateCompanyResult {
  const checked = checkName(input.name, MAX_COMPANY_NAME);
  if (!checked.ok) return checked;

  const company: Company = {
    id: input.id,
    name: checked.name,
    description: input.description?.trim() || undefined,
    foundedAt: now,
  };

  return {
    ok: true,
    company,
    events: [
      {
        eventId,
        type: "CompanyCreated",
        occurredAt: now,
        companyId: company.id,
        name: company.name,
      },
    ],
  };
}
