import { eq } from "drizzle-orm";

import type { EmployeeRepository } from "../../application/repositories";
import type { Employee } from "../../domain/employee";
import { toCompanyId, toEmployeeId } from "../../domain/ids";

import type { AppDatabase } from "./database";
import { employees } from "./schema";

type EmployeeRow = typeof employees.$inferSelect;

function toEmployee(row: EmployeeRow): Employee {
  return {
    id: toEmployeeId(row.id),
    companyId: toCompanyId(row.companyId),
    name: row.name,
    role: row.role,
    availability: row.availability,
    hiredAt: row.hiredAt,
  };
}

function toRow(employee: Employee): typeof employees.$inferInsert {
  return {
    id: employee.id,
    companyId: employee.companyId,
    name: employee.name,
    role: employee.role,
    availability: employee.availability,
    hiredAt: employee.hiredAt,
  };
}

export function createSqliteEmployeeRepository(db: AppDatabase): EmployeeRepository {
  return {
    async findById(id) {
      const row = db.select().from(employees).where(eq(employees.id, id)).get();
      return row === undefined ? undefined : toEmployee(row);
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
