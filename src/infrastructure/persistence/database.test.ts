import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { Company } from "../../domain/company";
import { toCompanyId } from "../../domain/ids";

import { createSqliteCompanyRepository } from "./company-repository";
import { createTestDatabase, type TestDatabase } from "./test-database";

const foundedAt = 1_700_000_000_000;

const company: Company = {
  id: toCompanyId("company-1"),
  name: "TinySoft",
  description: undefined,
  foundedAt,
};

const rival: Company = { ...company, id: toCompanyId("company-2"), name: "RivalSoft" };

let database: TestDatabase;

beforeEach(() => {
  database = createTestDatabase();
});

afterEach(() => {
  database.cleanup();
});

describe("database initialization", () => {
  it("keeps existing data when the same file is opened again", async () => {
    await createSqliteCompanyRepository(database.handle.db).save(company);

    const reopened = database.reopen();

    await expect(
      createSqliteCompanyRepository(reopened.db).findById(company.id),
    ).resolves.toEqual(company);
  });

  it("applies migrations only once", async () => {
    await createSqliteCompanyRepository(database.handle.db).save(company);

    database.reopen();
    const reopened = database.reopen();

    await expect(
      createSqliteCompanyRepository(reopened.db).findById(company.id),
    ).resolves.toEqual(company);
  });
});

describe("withTransaction", () => {
  it("keeps every write when the work succeeds", async () => {
    const repository = createSqliteCompanyRepository(database.handle.db);

    await database.handle.withTransaction(async () => {
      await repository.save(company);
      await repository.save(rival);
    });

    await expect(repository.findById(company.id)).resolves.toEqual(company);
    await expect(repository.findById(rival.id)).resolves.toEqual(rival);
  });

  it("discards every write when the work throws", async () => {
    const repository = createSqliteCompanyRepository(database.handle.db);

    await expect(
      database.handle.withTransaction(async () => {
        await repository.save(company);
        await repository.save(rival);
        throw new Error("write failed");
      }),
    ).rejects.toThrow("write failed");

    await expect(repository.findById(company.id)).resolves.toBeUndefined();
    await expect(repository.findById(rival.id)).resolves.toBeUndefined();
  });

  it("runs queued transactions one after another", async () => {
    const repository = createSqliteCompanyRepository(database.handle.db);

    await Promise.all([
      database.handle.withTransaction(() => repository.save(company)),
      database.handle.withTransaction(() => repository.save(rival)),
    ]);

    await expect(repository.findById(company.id)).resolves.toEqual(company);
    await expect(repository.findById(rival.id)).resolves.toEqual(rival);
  });
});
