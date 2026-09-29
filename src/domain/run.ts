import type { AgentId, CompanyId, EmployeeId, MemoryId, RunId, TaskId } from "./ids";
import { MAX_MEMORY_TEXT } from "./memory";
import type { Timestamp } from "./time";

// The execution capability attached to an employee. The employee is who the
// user teaches; the agent is what does the work, on one runtime.
export const RUNTIMES = ["claudeCode"] as const;
export type RuntimeType = (typeof RUNTIMES)[number];

export interface Agent {
  readonly id: AgentId;
  readonly companyId: CompanyId;
  readonly employeeId: EmployeeId;
  readonly runtime: RuntimeType;
  readonly createdAt: Timestamp;
}

// One launch of an agent on a task. It keeps the session it ran in, so a later
// run of the same agent on the same task picks the conversation up again.
export type RunState = "starting" | "running" | "ended";

export type RunEnd =
  | { readonly kind: "finished" }
  // it needed a command the project does not allow
  | { readonly kind: "denied"; readonly command: string }
  | { readonly kind: "budgetReached" }
  | { readonly kind: "failed" }
  // ended on purpose: held, handed over, or changed
  | { readonly kind: "stopped" }
  // the process went away without saying how it ended
  | { readonly kind: "disconnected" };

export interface Run {
  readonly id: RunId;
  readonly companyId: CompanyId;
  readonly taskId: TaskId;
  readonly agentId: AgentId;
  readonly sessionId: string | undefined;
  readonly state: RunState;
  readonly end: RunEnd | undefined;
  readonly costUsd: number;
  // what the agent said it drew on of what it carried; its own account, not a trace
  readonly memoriesUsed: readonly MemoryId[];
  // what it thought worth remembering, until the user teaches it or passes
  readonly suggestions: readonly string[];
  readonly startedAt: Timestamp;
  readonly endedAt: Timestamp | undefined;
}

export type StepKind = "read" | "edit" | "run" | "say";

// What the agent reported doing, one line each.
export interface RunStep {
  readonly companyId: CompanyId;
  readonly taskId: TaskId;
  readonly runId: RunId;
  readonly at: Timestamp;
  readonly kind: StepKind;
  readonly detail: string;
}

export const MAX_STEP_DETAIL = 300;
// The agent's closing account of the work is kept whole, lines and all.
export const MAX_REPORT = 4000;

export function startRun(input: { readonly id: RunId; readonly agent: Agent; readonly taskId: TaskId; readonly sessionId: string | undefined }, now: Timestamp): Run {
  return {
    id: input.id,
    companyId: input.agent.companyId,
    taskId: input.taskId,
    agentId: input.agent.id,
    sessionId: input.sessionId,
    state: "starting",
    end: undefined,
    costUsd: 0,
    memoriesUsed: [],
    suggestions: [],
    startedAt: now,
    endedAt: undefined,
  };
}

// The runtime names the session once the run is under way.
export function sessionStarted(run: Run, sessionId: string): Run {
  return run.state === "ended" ? run : { ...run, state: "running", sessionId };
}

export function endRun(run: Run, end: RunEnd, costUsd: number, now: Timestamp): Run {
  if (run.state === "ended") return run;
  return { ...run, state: "ended", end, costUsd: run.costUsd + Math.max(costUsd, 0), endedAt: now };
}

export const isLive = (run: Run): boolean => run.state !== "ended";

export interface Reported {
  // what the agent said, without the closing lines below
  readonly report: string;
  readonly used: readonly MemoryId[];
  readonly suggestions: readonly string[];
  // files it asked the app to remove, since its own tools cannot
  readonly removals: readonly string[];
}

export const MAX_SUGGESTIONS = 2;

export const reported = (run: Run, { used, suggestions }: Pick<Reported, "used" | "suggestions">): Run => ({ ...run, memoriesUsed: [...new Set(used)], suggestions });

// Taught or passed on, a suggestion is done with.
export const settleSuggestion = (run: Run, text: string): Run => ({ ...run, suggestions: run.suggestions.filter((s) => s !== text) });

// The lines a report ends with: "Remove: <path>" for a file to delete,
// "Worth remembering: …" for something the next task should know, and
// "Memories used: 2, 5" (or "none") for the numbered memories it drew on.
// Anything else is part of what it said.
const USED_LINE = /^\W*memories used\W*:?\W*(.*?)\W*$/i;
// \W would take Korean too, so only markdown's marks are stripped around the words
const SUGGEST_LINE = /^[\s*_>-]*worth remembering[\s*_]*:[\s*_]*(.+?)\s*$/i;
const REMOVE_LINE = /^[\s*_>-]*remove[\s*_]*:[\s*_`]*(.+?)[\s*_`]*$/i;

export function readReport(text: string, carried: readonly MemoryId[]): Reported {
  const lines = text.trimEnd().split("\n");
  let used: MemoryId[] = [];
  const suggested: string[] = [];
  const removals: string[] = [];
  for (let last = lines.at(-1); last !== undefined; last = lines.at(-1)) {
    const usedLine = USED_LINE.exec(last.trim());
    const suggestLine = SUGGEST_LINE.exec(last.trim());
    const removeLine = REMOVE_LINE.exec(last.trim());
    if (removeLine !== null) removals.unshift(removeLine[1]);
    else if (usedLine !== null) used = [...usedLine[1].matchAll(/\d+/g)].map((m) => carried[Number(m[0]) - 1]).filter((id): id is MemoryId => id !== undefined);
    else if (suggestLine !== null) suggested.unshift(suggestLine[1].replace(/\*+$/, "").trim());
    else if (last.trim() !== "") break;
    lines.pop();
  }
  const suggestions = [...new Set(suggested)].filter((s) => s !== "" && s.length <= MAX_MEMORY_TEXT).slice(0, MAX_SUGGESTIONS);
  return { report: lines.join("\n").trimEnd(), used: [...new Set(used)], suggestions, removals: [...new Set(removals)] };
}

// The session a new run of this agent on this task continues, if any: a
// session belongs to one agent, so another employee starts afresh. A run that
// ended without the runtime naming a session was a resume that did not take —
// the session is gone, as after its retention or on another computer — so the
// next one starts afresh too; one stopped on purpose before that says nothing.
export function sessionToContinue(runs: readonly Run[], taskId: TaskId, agentId: AgentId): string | undefined {
  const latest = runs
    .filter((r) => r.taskId === taskId && r.agentId === agentId && !(r.sessionId === undefined && r.end?.kind === "stopped"))
    .sort((a, b) => b.startedAt - a.startedAt || b.id.localeCompare(a.id))[0];
  return latest?.sessionId;
}

export const stepDetail = (text: string): string => {
  const line = text.replace(/\s+/g, " ").trim();
  return line.length > MAX_STEP_DETAIL ? line.slice(0, MAX_STEP_DETAIL - 1) + "…" : line;
};

export const reportDetail = (text: string): string => {
  const report = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  return report.length > MAX_REPORT ? report.slice(0, MAX_REPORT - 1) + "…" : report;
};
