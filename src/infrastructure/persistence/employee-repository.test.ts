import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { Company } from "../../domain/company";
import type { Employee } from "../../domain/employee";
import { toCompanyId, toEmployeeId } from "../../domain/ids";

import { createSqliteCompanyRepository } from "./company-repository";
import { createSqliteEmployeeRepository } from "./employee-repository";
import { createTestDatabase, type TestDatabase } from "./test-database";

const hiredAt = 1_700_000_000_000;

const company: Company = {
  id: toCompanyId("company-1"),
  name: "TinySoft",
  description: undefined,
  foundedAt: hiredAt,
};

const employee: Employee = {
  id: toEmployeeId("employee-1"),
  companyId: company.id,
  name: "Min-su",
  role: "Backend Engineer",
  availability: "available",
  hiredAt,
};

let database: TestDatabase;

beforeEach(async () => {
  database = createTestDatabase();
  await createSqliteCompanyRepository(database.handle.db).save(company);
});

afterEach(() => {
  database.cleanup();
});

describe("sqlite employee repository", () => {
  it("returns a saved employee unchanged", async () => {
    const repository = createSqliteEmployeeRepository(database.handle.db);

    await repository.save(employee);

    await expect(repository.findById(employee.id)).resolves.toEqual(employee);
  });

  it("round trips an employee on vacation", async () => {
    const repository = createSqliteEmployeeRepository(database.handle.db);
    const onVacation: Employee = { ...employee, availability: "onVacation" };

    await repository.save(onVacation);

    await expect(repository.findById(employee.id)).resolves.toEqual(onVacation);
  });

  it("updates an existing employee instead of failing on the primary key", async () => {
    const repository = createSqliteEmployeeRepository(database.handle.db);

    await repository.save(employee);
    await repository.save({ ...employee, role: "Staff Engineer" });

    await expect(repository.findById(employee.id)).resolves.toMatchObject({
      role: "Staff Engineer",
    });
  });

  it("returns undefined for an unknown id", async () => {
    const repository = createSqliteEmployeeRepository(database.handle.db);

    await expect(repository.findById(toEmployeeId("missing"))).resolves.toBeUndefined();
  });

  it("rejects an employee whose company does not exist", async () => {
    const repository = createSqliteEmployeeRepository(database.handle.db);

    await expect(
      repository.save({ ...employee, companyId: toCompanyId("missing") }),
    ).rejects.toThrow();
  });
});
