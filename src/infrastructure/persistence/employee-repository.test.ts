import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { Company } from "../../domain/company";
import type { Employee } from "../../domain/employee";
import { toCompanyId, toEmployeeId, toRoleId, toTeamId } from "../../domain/ids";

import { createSqliteCompanyRepository } from "./company-repository";
import { createSqliteEmployeeRepository } from "./employee-repository";
import { createSqliteRoleRepository, createSqliteTeamRepository } from "./organisation-repository";
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
  species: "fox",
  roleId: toRoleId("backend"),
  teamId: undefined,
  availability: "available",
  leaveSince: undefined,
  returnedAt: undefined,
  hiredAt,
  career: undefined,
};

let database: TestDatabase;

beforeEach(async () => {
  database = createTestDatabase();
  await createSqliteCompanyRepository(database.handle.db).save(company);
  const roles = createSqliteRoleRepository(database.handle.db);
  await roles.save({ id: toRoleId("backend"), companyId: company.id, name: "Backend Engineer", createdAt: hiredAt });
  await roles.save({ id: toRoleId("staff"), companyId: company.id, name: "Staff Engineer", createdAt: hiredAt });
  await createSqliteTeamRepository(database.handle.db).save({ id: toTeamId("server"), companyId: company.id, suggested: "backend", name: undefined, createdAt: hiredAt });
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

  it("round trips an employee on leave, on a team", async () => {
    const repository = createSqliteEmployeeRepository(database.handle.db);
    const away: Employee = { ...employee, teamId: toTeamId("server"), availability: "onLeave", leaveSince: hiredAt + 1 };

    await repository.save(away);

    await expect(repository.findById(employee.id)).resolves.toEqual(away);
  });

  it("updates an existing employee instead of failing on the primary key", async () => {
    const repository = createSqliteEmployeeRepository(database.handle.db);

    await repository.save(employee);
    await repository.save({ ...employee, roleId: toRoleId("staff") });

    await expect(repository.findById(employee.id)).resolves.toMatchObject({ roleId: "staff" });
  });

  it("returns undefined for an unknown id", async () => {
    const repository = createSqliteEmployeeRepository(database.handle.db);

    await expect(repository.findById(toEmployeeId("missing"))).resolves.toBeUndefined();
  });

  it("rejects an employee whose company, role or team does not exist", async () => {
    const repository = createSqliteEmployeeRepository(database.handle.db);

    await expect(repository.save({ ...employee, companyId: toCompanyId("missing") })).rejects.toThrow();
    await expect(repository.save({ ...employee, roleId: toRoleId("missing") })).rejects.toThrow();
    await expect(repository.save({ ...employee, teamId: toTeamId("missing") })).rejects.toThrow();
  });
});
