import { asc, eq } from "drizzle-orm";

import type { EmployeeRepository } from "../../application/repositories";
import type { Employee } from "../../domain/employee";
import { toCompanyId, toEmployeeId, toRoleId, toTeamId } from "../../domain/ids";

import type { AppDatabase } from "./database";
import { employees } from "./schema";

type EmployeeRow = typeof employees.$inferSelect;

function toEmployee(row: EmployeeRow): Employee {
  return {
    id: toEmployeeId(row.id),
    companyId: toCompanyId(row.companyId),
    name: row.name,
    species: row.species,
    roleId: toRoleId(row.roleId),
    teamId: row.teamId === null ? undefined : toTeamId(row.teamId),
    availability: row.availability,
    leaveSince: row.leaveSince ?? undefined,
    hiredAt: row.hiredAt,
  };
}

function toRow(employee: Employee): typeof employees.$inferInsert {
  return {
    id: employee.id,
    companyId: employee.companyId,
    name: employee.name,
    species: employee.species,
    roleId: employee.roleId,
    teamId: employee.teamId ?? null,
    availability: employee.availability,
    leaveSince: employee.leaveSince ?? null,
    hiredAt: employee.hiredAt,
  };
}

export function createSqliteEmployeeRepository(db: AppDatabase): EmployeeRepository {
  return {
    async findById(id) {
      const row = db.select().from(employees).where(eq(employees.id, id)).get();
      return row === undefined ? undefined : toEmployee(row);
    },

    async findByCompany(companyId) {
      return db
        .select()
        .from(employees)
        .where(eq(employees.companyId, companyId))
        .orderBy(asc(employees.hiredAt), asc(employees.id))
        .all()
        .map(toEmployee);
    },

    async save(employee) {
      const { id, ...updatable } = toRow(employee);
      db.insert(employees)
        .values({ id, ...updatable })
        .onConflictDoUpdate({ target: employees.id, set: updatable })
        .run();
    },
  };
}
