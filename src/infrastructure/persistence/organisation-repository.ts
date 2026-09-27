import { asc, eq } from "drizzle-orm";

import type { RoleRepository, TeamRepository } from "../../application/repositories";
import { toCompanyId, toRoleId, toTeamId } from "../../domain/ids";

import type { AppDatabase } from "./database";
import { roles, teams } from "./schema";

export function createSqliteRoleRepository(db: AppDatabase): RoleRepository {
  return {
    async findByCompany(companyId) {
      return db
        .select()
        .from(roles)
        .where(eq(roles.companyId, companyId))
        .orderBy(asc(roles.createdAt))
        .all()
        .map((row) => ({ id: toRoleId(row.id), companyId: toCompanyId(row.companyId), name: row.name, createdAt: row.createdAt }));
    },
    async save(role) {
      const row = { companyId: role.companyId, name: role.name, createdAt: role.createdAt };
      db.insert(roles).values({ id: role.id, ...row }).onConflictDoUpdate({ target: roles.id, set: row }).run();
    },
    async remove(id) {
      db.delete(roles).where(eq(roles.id, id)).run();
    },
  };
}

export function createSqliteTeamRepository(db: AppDatabase): TeamRepository {
  return {
    async findByCompany(companyId) {
      return db
        .select()
        .from(teams)
        .where(eq(teams.companyId, companyId))
        .orderBy(asc(teams.createdAt))
        .all()
        .map((row) => ({
          id: toTeamId(row.id),
          companyId: toCompanyId(row.companyId),
          suggested: row.suggested ?? undefined,
          name: row.name ?? undefined,
          createdAt: row.createdAt,
        }));
    },
    async save(team) {
      const row = { companyId: team.companyId, suggested: team.suggested ?? null, name: team.name ?? null, createdAt: team.createdAt };
      db.insert(teams).values({ id: team.id, ...row }).onConflictDoUpdate({ target: teams.id, set: row }).run();
    },
    async remove(id) {
      db.delete(teams).where(eq(teams.id, id)).run();
    },
  };
}
