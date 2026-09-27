import { assert, describe, expect, it } from "vitest";

import { toCompanyId, toEmployeeId } from "../domain/ids";

import { createCompany } from "./company";
import type { AppContext } from "./context";
import { hireEmployee } from "./employee";
import {
  createInMemoryCompanyRepository,
  createInMemoryEmployeeRepository,
  createInMemoryProjectRepository,
  createInMemoryTaskRepository,
  withoutTransaction,
} from "./in-memory-repositories";

const now = 1_700_000_000_000;

function createContext(): AppContext {
  let counter = 0;

  return {
    companies: createInMemoryCompanyRepository(),
    employees: createInMemoryEmployeeRepository(),
    projects: createInMemoryProjectRepository(),
    tasks: createInMemoryTaskRepository(),
    now: () => now,
    newId: () => `id-${(counter += 1)}`,
    withTransaction: withoutTransaction,
  };
}

describe("hireEmployee", () => {
  it("hires an available employee into an existing company", async () => {
    const ctx = createContext();
    const { company } = await createCompany(ctx, { name: "TinySoft" });

    const result = await hireEmployee(ctx, {
      companyId: company.id,
      name: "Min-su",
      role: "Backend Engineer",
    });

    assert(result.ok);
    expect(result.value.employee).toEqual({
      id: toEmployeeId("id-3"),
      companyId: company.id,
      name: "Min-su",
      role: "Backend Engineer",
      availability: "available",
      hiredAt: now,
    });
  });

  it("saves the employee", async () => {
    const ctx = createContext();
    const { company } = await createCompany(ctx, { name: "TinySoft" });

    const result = await hireEmployee(ctx, {
      companyId: company.id,
      name: "Min-su",
      role: "Backend Engineer",
    });

    assert(result.ok);
    await expect(ctx.employees.findById(result.value.employee.id)).resolves.toEqual(
      result.value.employee,
    );
  });

  it("emits EmployeeHired", async () => {
    const ctx = createContext();
    const { company } = await createCompany(ctx, { name: "TinySoft" });

    const result = await hireEmployee(ctx, {
      companyId: company.id,
      name: "Min-su",
      role: "Backend Engineer",
    });

    assert(result.ok);
    expect(result.events).toEqual([
      {
        eventId: "id-4",
        type: "EmployeeHired",
        occurredAt: now,
        companyId: company.id,
        employeeId: toEmployeeId("id-3"),
        employeeName: "Min-su",
        role: "Backend Engineer",
      },
    ]);
  });

  it("rejects hiring into a company that does not exist", async () => {
    const ctx = createContext();

    const result = await hireEmployee(ctx, {
      companyId: toCompanyId("missing"),
      name: "Min-su",
      role: "Backend Engineer",
    });

    expect(result).toEqual({ ok: false, reason: "companyNotFound" });
    await expect(ctx.employees.findById(toEmployeeId("id-1"))).resolves.toBeUndefined();
  });
});
