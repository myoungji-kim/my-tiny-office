import { asc, eq } from "drizzle-orm";

import type { AreaRepository, MemoryRepository } from "../../application/repositories";
import { toAreaId, toCompanyId, toEmployeeId, toMemoryId, toTaskId } from "../../domain/ids";
import type { Area, Memory } from "../../domain/memory";

import type { AppDatabase } from "./database";
import { areas, memories } from "./schema";

function toArea(row: typeof areas.$inferSelect): Area {
  return {
    id: toAreaId(row.id),
    companyId: toCompanyId(row.companyId),
    starting: row.starting ?? undefined,
    name: row.name ?? undefined,
    createdAt: row.createdAt,
  };
}

function toMemory(row: typeof memories.$inferSelect): Memory {
  return {
    id: toMemoryId(row.id),
    companyId: toCompanyId(row.companyId),
    kind: row.kind,
    employeeId: row.employeeId === null ? undefined : toEmployeeId(row.employeeId),
    areaId: row.areaId === null ? undefined : toAreaId(row.areaId),
    text: row.text,
    sourceTaskId: row.sourceTaskId === null ? undefined : toTaskId(row.sourceTaskId),
    broughtIn: row.broughtIn,
    createdAt: row.createdAt,
  };
}

export function createSqliteAreaRepository(db: AppDatabase): AreaRepository {
  return {
    async findByCompany(companyId) {
      return db.select().from(areas).where(eq(areas.companyId, companyId)).orderBy(asc(areas.createdAt), asc(areas.id)).all().map(toArea);
    },
    async save(area) {
      const row = { companyId: area.companyId, starting: area.starting ?? null, name: area.name ?? null, createdAt: area.createdAt };
      db.insert(areas).values({ id: area.id, ...row }).onConflictDoUpdate({ target: areas.id, set: row }).run();
    },
    async remove(id) {
      db.delete(areas).where(eq(areas.id, id)).run();
    },
  };
}

export function createSqliteMemoryRepository(db: AppDatabase): MemoryRepository {
  return {
    async findByCompany(companyId) {
      return db.select().from(memories).where(eq(memories.companyId, companyId)).orderBy(asc(memories.createdAt), asc(memories.id)).all().map(toMemory);
    },
    async save(memory) {
      const row = {
        companyId: memory.companyId,
        kind: memory.kind,
        employeeId: memory.employeeId ?? null,
        areaId: memory.areaId ?? null,
        text: memory.text,
        sourceTaskId: memory.sourceTaskId ?? null,
        broughtIn: memory.broughtIn,
        createdAt: memory.createdAt,
      };
      db.insert(memories).values({ id: memory.id, ...row }).onConflictDoUpdate({ target: memories.id, set: row }).run();
    },
    async remove(id) {
      db.delete(memories).where(eq(memories.id, id)).run();
    },
  };
}
