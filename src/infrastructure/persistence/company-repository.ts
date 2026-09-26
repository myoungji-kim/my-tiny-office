import { eq } from "drizzle-orm";

import type { CompanyRepository } from "../../application/repositories";
import type { Company } from "../../domain/company";
import { toCompanyId } from "../../domain/ids";

import type { AppDatabase } from "./database";
import { companies } from "./schema";

type CompanyRow = typeof companies.$inferSelect;

function toCompany(row: CompanyRow): Company {
  return {
    id: toCompanyId(row.id),
    name: row.name,
    description: row.description ?? undefined,
    foundedAt: row.foundedAt,
  };
}

function toRow(company: Company): typeof companies.$inferInsert {
  return {
    id: company.id,
    name: company.name,
    description: company.description ?? null,
    foundedAt: company.foundedAt,
  };
}

export function createSqliteCompanyRepository(db: AppDatabase): CompanyRepository {
  return {
    async findById(id) {
      const row = db.select().from(companies).where(eq(companies.id, id)).get();
      return row === undefined ? undefined : toCompany(row);
    },

    async save(company) {
      const { id, ...updatable } = toRow(company);
      db.insert(companies)
        .values({ id, ...updatable })
        .onConflictDoUpdate({ target: companies.id, set: updatable })
        .run();
    },
  };
}
