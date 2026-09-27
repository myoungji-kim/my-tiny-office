import { describe, expect, it } from "vitest";

import { toCompanyId } from "../domain/ids";

import { createCompany } from "./company";
import type { AppContext } from "./context";
import {
  createInMemoryAreaRepository,
  createInMemoryCompanyRepository,
  createInMemoryMemoryRepository,
  createInMemoryEmployeeRepository,
  createInMemoryProjectRepository,
  createInMemoryRoleRepository,
  createInMemoryTaskRepository,
  createInMemoryTeamRepository,
  withoutTransaction,
} from "./in-memory-repositories";

const foundedAt = 1_700_000_000_000;

function createContext(): AppContext {
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
    now: () => foundedAt,
    newId: () => `id-${(counter += 1)}`,
    withTransaction: withoutTransaction,
  };
}

describe("createCompany", () => {
  it("returns a company with a generated id", async () => {
    const ctx = createContext();

    const { company } = await createCompany(ctx, { name: "TinySoft" });

    expect(company).toEqual({
      id: toCompanyId("id-1"),
      name: "TinySoft",
      description: undefined,
      foundedAt,
    });
  });

  it("saves the company", async () => {
    const ctx = createContext();

    const { company } = await createCompany(ctx, {
      name: "TinySoft",
      description: "A tiny office",
    });

    await expect(ctx.companies.findById(company.id)).resolves.toEqual(company);
  });

  it("emits CompanyCreated", async () => {
    const ctx = createContext();

    const { events } = await createCompany(ctx, { name: "TinySoft" });

    expect(events).toEqual([
      {
        eventId: "id-2",
        type: "CompanyCreated",
        occurredAt: foundedAt,
        companyId: toCompanyId("id-1"),
        name: "TinySoft",
      },
    ]);
  });
});
