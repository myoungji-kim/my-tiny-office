import { and, asc, desc, eq } from "drizzle-orm";

import type { AgentRepository, RunRepository, RunStepRepository, TaskRequestRepository } from "../../application/repositories";
import { toAgentId, toCompanyId, toEmployeeId, toMemoryId, toRunId, toTaskId } from "../../domain/ids";
import type { Agent, Run, RunEnd, RunStep } from "../../domain/run";

import type { AppDatabase } from "./database";
import { agents, runs, runSteps, taskRequests } from "./schema";

export function createSqliteAgentRepository(db: AppDatabase): AgentRepository {
  return {
    async findByCompany(companyId) {
      return db
        .select()
        .from(agents)
        .where(eq(agents.companyId, companyId))
        .orderBy(asc(agents.createdAt), asc(agents.id))
        .all()
        .map(
          (row): Agent => ({
            id: toAgentId(row.id),
            companyId: toCompanyId(row.companyId),
            employeeId: toEmployeeId(row.employeeId),
            runtime: row.runtime,
            createdAt: row.createdAt,
          }),
        );
    },
    async save(agent) {
      const row = { companyId: agent.companyId, employeeId: agent.employeeId, runtime: agent.runtime, createdAt: agent.createdAt };
      db.insert(agents).values({ id: agent.id, ...row }).onConflictDoUpdate({ target: agents.id, set: row }).run();
    },
  };
}

function endOf(row: typeof runs.$inferSelect): RunEnd | undefined {
  if (row.end === null) return undefined;
  if (row.end === "denied") return { kind: "denied", command: row.deniedCommand ?? "" };
  return { kind: row.end };
}

// A JSON list of strings; anything unreadable in the column is an empty list, rather than an error.
function stringsOf(raw: string): string[] {
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function toRun(row: typeof runs.$inferSelect): Run {
  return {
    id: toRunId(row.id),
    companyId: toCompanyId(row.companyId),
    taskId: toTaskId(row.taskId),
    agentId: toAgentId(row.agentId),
    sessionId: row.sessionId ?? undefined,
    state: row.state,
    end: endOf(row),
    costUsd: row.costUsd,
    memoriesUsed: stringsOf(row.memoriesUsed).map(toMemoryId),
    suggestions: stringsOf(row.suggestions),
    startedAt: row.startedAt,
    endedAt: row.endedAt ?? undefined,
  };
}

export function createSqliteRunRepository(db: AppDatabase): RunRepository {
  return {
    async findById(id) {
      const row = db.select().from(runs).where(eq(runs.id, id)).get();
      return row === undefined ? undefined : toRun(row);
    },
    async findByCompany(companyId) {
      return db.select().from(runs).where(eq(runs.companyId, companyId)).orderBy(asc(runs.startedAt), asc(runs.id)).all().map(toRun);
    },
    async save(run) {
      const row = {
        companyId: run.companyId,
        taskId: run.taskId,
        agentId: run.agentId,
        sessionId: run.sessionId ?? null,
        state: run.state,
        end: run.end?.kind ?? null,
        deniedCommand: run.end?.kind === "denied" ? run.end.command : null,
        costUsd: run.costUsd,
        memoriesUsed: JSON.stringify(run.memoriesUsed),
        suggestions: JSON.stringify(run.suggestions),
        startedAt: run.startedAt,
        endedAt: run.endedAt ?? null,
      };
      db.insert(runs).values({ id: run.id, ...row }).onConflictDoUpdate({ target: runs.id, set: row }).run();
    },
  };
}

export function createSqliteRunStepRepository(db: AppDatabase, newId: () => string): RunStepRepository {
  return {
    async add(step) {
      db.insert(runSteps).values({ id: newId(), ...step }).run();
    },
    async findByTask(companyId, taskId, limit) {
      return db
        .select()
        .from(runSteps)
        .where(and(eq(runSteps.companyId, companyId), eq(runSteps.taskId, taskId)))
        .orderBy(desc(runSteps.at), desc(runSteps.id))
        .limit(limit)
        .all()
        .map(
          (row): RunStep => ({
            companyId: toCompanyId(row.companyId),
            taskId: toTaskId(row.taskId),
            runId: toRunId(row.runId),
            at: row.at,
            kind: row.kind,
            detail: row.detail,
          }),
        );
    },
  };
}

export function createSqliteTaskRequestRepository(db: AppDatabase, newId: () => string): TaskRequestRepository {
  return {
    async add(request) {
      db.insert(taskRequests).values({ id: newId(), ...request }).run();
    },
    async findByTask(companyId, taskId) {
      return db
        .select()
        .from(taskRequests)
        .where(and(eq(taskRequests.companyId, companyId), eq(taskRequests.taskId, taskId)))
        .orderBy(asc(taskRequests.at), asc(taskRequests.id))
        .all()
        .map((row) => ({ companyId: toCompanyId(row.companyId), taskId: toTaskId(row.taskId), at: row.at, text: row.text }));
    },
  };
}
