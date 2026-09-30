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
    career:
      row.careerSession !== null && row.careerFolder !== null && row.careerFrom !== null && row.careerTo !== null
        ? { sessionId: row.careerSession, folder: row.careerFolder, from: row.careerFrom, to: row.careerTo }
        : undefined,
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
    careerSession: employee.career?.sessionId ?? null,
    careerFolder: employee.career?.folder ?? null,
    careerFrom: employee.career?.from ?? null,
    careerTo: employee.career?.to ?? null,
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
