import { asc, eq } from "drizzle-orm";

import type { ProjectRepository } from "../../application/repositories";
import { toCompanyId, toProjectId } from "../../domain/ids";
import { isAllowableCommand, isAtlassianWrite, type Project } from "../../domain/project";

import type { AppDatabase } from "./database";
import { projects } from "./schema";

type ProjectRow = typeof projects.$inferSelect;

// A command that could not be allowed today is dropped on the way in, so a
// hand-edited or imported file cannot widen what employees may run.
function toCommands(raw: string): string[] {
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? value.filter((c): c is string => typeof c === "string" && isAllowableCommand(c)) : [];
  } catch {
    return [];
  }
}

// Likewise a write no project could allow is dropped, and none is kept with the connector off.
function toWrites(raw: string, atlassian: boolean) {
  if (!atlassian) return [];
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? [...new Set(value.filter(isAtlassianWrite))] : [];
  } catch {
    return [];
  }
}

function toProject(row: ProjectRow): Project {
  return {
    id: toProjectId(row.id),
    companyId: toCompanyId(row.companyId),
    name: row.name,
    description: row.description ?? undefined,
    folder: row.folder ?? undefined,
    folderConfirmed: row.folderConfirmed,
    commands: toCommands(row.commands),
    atlassian: row.atlassian,
    writes: toWrites(row.writes, row.atlassian),
    status: row.status,
    priority: row.priority,
    heldReason: row.heldReason ?? undefined,
    createdAt: row.createdAt,
    startedAt: row.startedAt ?? undefined,
    finishedAt: row.finishedAt ?? undefined,
  };
}

function toRow(project: Project): typeof projects.$inferInsert {
  return {
    id: project.id,
    companyId: project.companyId,
    name: project.name,
    description: project.description ?? null,
    folder: project.folder ?? null,
    folderConfirmed: project.folderConfirmed,
    commands: JSON.stringify(project.commands),
    atlassian: project.atlassian,
    writes: JSON.stringify(project.writes),
    status: project.status,
    priority: project.priority,
    heldReason: project.heldReason ?? null,
    createdAt: project.createdAt,
    startedAt: project.startedAt ?? null,
    finishedAt: project.finishedAt ?? null,
  };
}

export function createSqliteProjectRepository(db: AppDatabase): ProjectRepository {
  return {
    async findById(id) {
      const row = db.select().from(projects).where(eq(projects.id, id)).get();
      return row === undefined ? undefined : toProject(row);
    },

    async findByCompany(companyId) {
      return db.select().from(projects).where(eq(projects.companyId, companyId)).orderBy(asc(projects.createdAt), asc(projects.id)).all().map(toProject);
    },

    async save(project) {
      const { id, ...updatable } = toRow(project);
      db.insert(projects)
        .values({ id, ...updatable })
        .onConflictDoUpdate({ target: projects.id, set: updatable })
        .run();
    },

    async remove(id) {
      db.delete(projects).where(eq(projects.id, id)).run();
    },
  };
}
