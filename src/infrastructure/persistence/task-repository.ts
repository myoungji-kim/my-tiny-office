import { asc, eq } from "drizzle-orm";

import type { TaskRepository } from "../../application/repositories";
import { toAreaId, toCompanyId, toEmployeeId, toProjectId, toTaskId } from "../../domain/ids";
import type { Blocker, Task } from "../../domain/task";

import type { AppDatabase } from "./database";
import { tasks } from "./schema";

type TaskRow = typeof tasks.$inferSelect;

// Anything unreadable in the column reads as a lost connection: the task
// stays visibly blocked rather than silently runnable.
function toBlocker(raw: string | null): Blocker | undefined {
  if (raw === null) return undefined;
  try {
    const value = JSON.parse(raw) as { kind?: unknown; command?: unknown };
    if (value.kind === "commandNotAllowed" && typeof value.command === "string") {
      return { kind: "commandNotAllowed", command: value.command };
    }
    if (value.kind === "budgetReached") return { kind: "budgetReached" };
  } catch {
    // fall through
  }
  return { kind: "disconnected" };
}

function toTask(row: TaskRow): Task {
  return {
    id: toTaskId(row.id),
    companyId: toCompanyId(row.companyId),
    projectId: toProjectId(row.projectId),
    title: row.title,
    description: row.description ?? undefined,
    area: row.area === null ? undefined : toAreaId(row.area),
    priority: row.priority,
    assigneeId: row.assigneeId === null ? undefined : toEmployeeId(row.assigneeId),
    status: row.status,
    blocker: toBlocker(row.blocker),
    heldReason: row.heldReason ?? undefined,
    heldFrom: row.heldFrom ?? undefined,
    heldWithProject: row.heldWithProject,
    changesRequested: row.changesRequested ?? undefined,
    createdAt: row.createdAt,
    startedAt: row.startedAt ?? undefined,
    workedFor: row.workedFor,
    runningSince: row.runningSince ?? undefined,
    finishedAt: row.finishedAt ?? undefined,
    appliedAt: row.appliedAt ?? undefined,
  };
}

function toRow(task: Task): typeof tasks.$inferInsert {
  return {
    id: task.id,
    companyId: task.companyId,
    projectId: task.projectId,
    title: task.title,
    description: task.description ?? null,
    area: task.area ?? null,
    priority: task.priority,
    assigneeId: task.assigneeId ?? null,
    status: task.status,
    blocker: task.blocker === undefined ? null : JSON.stringify(task.blocker),
    heldReason: task.heldReason ?? null,
    heldFrom: task.heldFrom ?? null,
    heldWithProject: task.heldWithProject,
    changesRequested: task.changesRequested ?? null,
    createdAt: task.createdAt,
    startedAt: task.startedAt ?? null,
    workedFor: task.workedFor,
    runningSince: task.runningSince ?? null,
    finishedAt: task.finishedAt ?? null,
    appliedAt: task.appliedAt ?? null,
  };
}

export function createSqliteTaskRepository(db: AppDatabase): TaskRepository {
  return {
    async findById(id) {
      const row = db.select().from(tasks).where(eq(tasks.id, id)).get();
      return row === undefined ? undefined : toTask(row);
    },

    async findByCompany(companyId) {
      return db.select().from(tasks).where(eq(tasks.companyId, companyId)).orderBy(asc(tasks.createdAt), asc(tasks.id)).all().map(toTask);
    },

    async save(task) {
      const { id, ...updatable } = toRow(task);
      db.insert(tasks)
        .values({ id, ...updatable })
        .onConflictDoUpdate({ target: tasks.id, set: updatable })
        .run();
    },
  };
}
