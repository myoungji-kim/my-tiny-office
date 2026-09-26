import { and, eq } from "drizzle-orm";

import type { TaskRepository } from "../../application/repositories";
import { toCompanyId, toEmployeeId, toTaskId } from "../../domain/ids";
import type { Task } from "../../domain/task";

import type { AppDatabase } from "./database";
import { tasks } from "./schema";

type TaskRow = typeof tasks.$inferSelect;

function toTask(row: TaskRow): Task {
  return {
    id: toTaskId(row.id),
    companyId: toCompanyId(row.companyId),
    title: row.title,
    description: row.description ?? undefined,
    status: row.status,
    priority: row.priority,
    assigneeId: row.assigneeId === null ? undefined : toEmployeeId(row.assigneeId),
    estimatedDuration: row.estimatedDuration,
    createdAt: row.createdAt,
    startedAt: row.startedAt ?? undefined,
    completedAt: row.completedAt ?? undefined,
  };
}

function toRow(task: Task): typeof tasks.$inferInsert {
  return {
    id: task.id,
    companyId: task.companyId,
    title: task.title,
    description: task.description ?? null,
    status: task.status,
    priority: task.priority,
    assigneeId: task.assigneeId ?? null,
    estimatedDuration: task.estimatedDuration,
    createdAt: task.createdAt,
    startedAt: task.startedAt ?? null,
    completedAt: task.completedAt ?? null,
  };
}

export function createSqliteTaskRepository(db: AppDatabase): TaskRepository {
  return {
    async findById(id) {
      const row = db.select().from(tasks).where(eq(tasks.id, id)).get();
      return row === undefined ? undefined : toTask(row);
    },

    async save(task) {
      const { id, ...updatable } = toRow(task);
      db.insert(tasks)
        .values({ id, ...updatable })
        .onConflictDoUpdate({ target: tasks.id, set: updatable })
        .run();
    },

    async findWorkingByCompany(companyId) {
      return db
        .select()
        .from(tasks)
        .where(and(eq(tasks.companyId, companyId), eq(tasks.status, "working")))
        .all()
        .map(toTask);
    },
  };
}
