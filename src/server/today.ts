import type { Employee } from "../domain/employee";
import { toCompanyId } from "../domain/ids";
import type { Memory } from "../domain/memory";
import type { Review } from "../domain/review";
import type { Agent, Run } from "../domain/run";
import type { Task } from "../domain/task";
import { createAppContext } from "../infrastructure/app-context";
import { getCompanyFiles } from "../infrastructure/persistence/company-files";

// 오늘: what happened in the office since midnight, newest first, read from
// what the company already keeps. Only what still waits on the user carries
// the way to it.

export type TodayKind = "started" | "reviewStarted" | "memoryUsed" | "waiting" | "applied" | "leave" | "lost" | "stopped" | "stoppedAtWrite" | "budget" | "hired";

export interface TodayItem {
  readonly at: number;
  readonly kind: TodayKind;
  readonly who: string | undefined;
  readonly task: { readonly id: string; readonly title: string; readonly projectId: string } | undefined;
  readonly areaId: string | undefined;
  readonly memory: string | undefined;
  // minutes the finished work took
  readonly took: number | undefined;
  // a hire with experience: what they brought, from where
  readonly brought: { readonly folder: string; readonly lines: number } | undefined;
  // it still waits on the user
  readonly open: boolean;
}

export interface TodayFacts {
  readonly tasks: readonly Task[];
  readonly reviews: readonly Review[];
  readonly runs: readonly Run[];
  readonly agents: readonly Agent[];
  readonly memories: readonly Memory[];
  readonly employees: readonly Employee[];
}

const folderName = (folder: string) => folder.split(/[\\/]/).filter(Boolean).at(-1) ?? folder;

export function startOfDay(now: number): number {
  const day = new Date(now);
  day.setHours(0, 0, 0, 0);
  return day.getTime();
}

export function todayOf(facts: TodayFacts, now: number): TodayItem[] {
  const since = startOfDay(now);
  const today = (at: number | undefined): at is number => at !== undefined && at >= since && at <= now;
  const tasks = new Map(facts.tasks.map((t) => [t.id as string, t]));
  const memories = new Map(facts.memories.map((m) => [m.id as string, m]));
  const agentOwner = new Map(facts.agents.map((a) => [a.id as string, a.employeeId as string]));
  const taskOf = (t: Task) => ({ id: t.id, title: t.title, projectId: t.projectId });
  const blank = { who: undefined, task: undefined, areaId: undefined, memory: undefined, took: undefined, brought: undefined, open: false };
  const items: TodayItem[] = [];

  for (const t of facts.tasks) {
    if (today(t.startedAt)) items.push({ ...blank, at: t.startedAt, kind: "started", who: t.assigneeId, task: taskOf(t) });
    if (today(t.finishedAt) && t.status === "approval")
      items.push({ ...blank, at: t.finishedAt, kind: "waiting", who: t.assigneeId, task: taskOf(t), took: Math.max(1, Math.round(t.workedFor / 60_000)), open: true });
    if (today(t.appliedAt)) items.push({ ...blank, at: t.appliedAt, kind: "applied", task: taskOf(t) });
  }

  for (const r of facts.reviews) {
    const task = tasks.get(r.taskId);
    if (task !== undefined && today(r.startedAt)) items.push({ ...blank, at: r.startedAt, kind: "reviewStarted", who: r.reviewerId, task: taskOf(task), areaId: task.area });
  }

  for (const run of facts.runs) {
    const task = tasks.get(run.taskId);
    if (task === undefined || !today(run.endedAt)) continue;
    const who = agentOwner.get(run.agentId);
    for (const id of run.memoriesUsed) {
      const memory = memories.get(id);
      if (memory !== undefined) items.push({ ...blank, at: run.endedAt, kind: "memoryUsed", who, task: taskOf(task), memory: memory.text });
    }
    const blocked = task.status === "working" ? task.blocker?.kind : undefined;
    const stop =
      run.end?.kind === "disconnected"
        ? { kind: "lost" as const, open: blocked === "disconnected" }
        : run.end?.kind === "denied"
          ? { kind: "stopped" as const, open: blocked === "commandNotAllowed" }
          : run.end?.kind === "writeDenied"
            ? { kind: "stoppedAtWrite" as const, open: blocked === "writeNotAllowed" }
            : run.end?.kind === "budgetReached"
              ? { kind: "budget" as const, open: blocked === "budgetReached" }
              : undefined;
    if (stop !== undefined) items.push({ ...blank, at: run.endedAt, who, task: taskOf(task), ...stop });
  }

  for (const e of facts.employees) {
    if (e.availability === "left") continue;
    if (e.availability === "onLeave" && today(e.leaveSince)) items.push({ ...blank, at: e.leaveSince, kind: "leave", who: e.id });
    if (today(e.hiredAt)) {
      const lines = facts.memories.filter((m) => m.employeeId === e.id && m.broughtIn).length;
      items.push({ ...blank, at: e.hiredAt, kind: "hired", who: e.id, brought: e.career === undefined ? undefined : { folder: folderName(e.career.folder), lines } });
    }
  }

  return items.sort((a, b) => b.at - a.at);
}

export async function loadToday(companyId: string, now: number): Promise<TodayItem[]> {
  const files = getCompanyFiles();
  if (!files.has(companyId)) return [];
  const id = toCompanyId(companyId);
  const ctx = createAppContext(files.open(id));
  const [tasks, reviews, runs, agents, memories, employees] = await Promise.all([
    ctx.tasks.findByCompany(id),
    ctx.reviews.findByCompany(id),
    ctx.runs.findByCompany(id),
    ctx.agents.findByCompany(id),
    ctx.memories.findByCompany(id),
    ctx.employees.findByCompany(id),
  ]);
  return todayOf({ tasks, reviews, runs, agents, memories, employees }, now);
}
