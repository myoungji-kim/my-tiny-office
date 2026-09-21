import type { CompanyCreated } from "./events";
import type { CompanyId, EventId } from "./ids";
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

export interface CreateCompanyResult {
  readonly company: Company;
  readonly events: readonly [CompanyCreated];
}

export function createCompany(
  input: CreateCompanyInput,
  eventId: EventId,
  now: Timestamp,
): CreateCompanyResult {
  const company: Company = {
    id: input.id,
    name: input.name,
    description: input.description,
    foundedAt: now,
  };

  return {
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
