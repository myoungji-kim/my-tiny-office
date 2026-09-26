import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { Company } from "../../domain/company";
import { toCompanyId } from "../../domain/ids";

import { createSqliteCompanyRepository } from "./company-repository";
import { createTestDatabase, type TestDatabase } from "./test-database";

const foundedAt = 1_700_000_000_000;

const company: Company = {
  id: toCompanyId("company-1"),
  name: "TinySoft",
  description: "A tiny office",
  foundedAt,
};

let database: TestDatabase;

beforeEach(() => {
  database = createTestDatabase();
});

afterEach(() => {
  database.cleanup();
});

describe("sqlite company repository", () => {
  it("returns a saved company unchanged", async () => {
    const repository = createSqliteCompanyRepository(database.handle.db);

    await repository.save(company);

    await expect(repository.findById(company.id)).resolves.toEqual(company);
  });

  it("keeps a missing description as undefined rather than null", async () => {
    const repository = createSqliteCompanyRepository(database.handle.db);
    const withoutDescription: Company = { ...company, description: undefined };

    await repository.save(withoutDescription);

    const found = await repository.findById(company.id);
    expect(found).toEqual(withoutDescription);
    expect(found?.description).toBeUndefined();
  });

  it("updates an existing company instead of failing on the primary key", async () => {
    const repository = createSqliteCompanyRepository(database.handle.db);

    await repository.save(company);
    await repository.save({ ...company, name: "TinySoft Renamed" });

    await expect(repository.findById(company.id)).resolves.toMatchObject({
      name: "TinySoft Renamed",
    });
  });

  it("returns undefined for an unknown id", async () => {
    const repository = createSqliteCompanyRepository(database.handle.db);

    await expect(repository.findById(toCompanyId("missing"))).resolves.toBeUndefined();
  });

  it("shares data across repository instances", async () => {
    await createSqliteCompanyRepository(database.handle.db).save(company);

    const other = createSqliteCompanyRepository(database.handle.db);

    await expect(other.findById(company.id)).resolves.toEqual(company);
  });
});
