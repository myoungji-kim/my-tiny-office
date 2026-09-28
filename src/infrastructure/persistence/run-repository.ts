import { and, asc, desc, eq } from "drizzle-orm";

import type { AgentRepository, RunRepository, RunStepRepository } from "../../application/repositories";
import { toAgentId, toCompanyId, toEmployeeId, toRunId, toTaskId } from "../../domain/ids";
import type { Agent, Run, RunEnd, RunStep } from "../../domain/run";

import type { AppDatabase } from "./database";
import { agents, runs, runSteps } from "./schema";

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
