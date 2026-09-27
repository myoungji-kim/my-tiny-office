import type {
  ProjectCommandAllowed,
  ProjectCreated,
  ProjectFinished,
  ProjectHeld,
  ProjectReopened,
  ProjectResumed,
  ProjectStarted,
} from "./events";
import type { CompanyId, EventId, ProjectId } from "./ids";
import type { Timestamp } from "./time";

export type ProjectStatus = "planned" | "active" | "held" | "done";
export type Priority = "low" | "normal" | "high";

export const PRIORITY_RANK: Readonly<Record<Priority, number>> = { high: 0, normal: 1, low: 2 };

export interface Project {
  readonly id: ProjectId;
  readonly companyId: CompanyId;
  readonly name: string;
  readonly description: string | undefined;
  readonly folder: string | undefined;
  // Exact commands its employees may run; nothing else runs.
  readonly commands: readonly string[];
  readonly status: ProjectStatus;
  readonly priority: Priority;
  readonly heldReason: string | undefined;
  readonly createdAt: Timestamp;
  readonly startedAt: Timestamp | undefined;
  readonly finishedAt: Timestamp | undefined;
}

type Transition<TEvent, TFailure extends string> =
  | { readonly ok: true; readonly project: Project; readonly events: readonly [TEvent] }
  | { readonly ok: false; readonly reason: TFailure };

const MAX_COMMAND = 200;

// A command becomes a Claude Code permission rule, `Bash(<command>)`, where `*`
// is a wildcard and a parenthesis ends the rule, so neither may appear in one.
export function isAllowableCommand(command: string): boolean {
  return (
    command.length > 0 &&
    command.length <= MAX_COMMAND &&
    command === command.trim() &&
    !/[*()\r\n\t\0]/.test(command)
  );
}

export interface CreateProjectInput {
  readonly id: ProjectId;
  readonly companyId: CompanyId;
  readonly name: string;
  readonly description?: string;
  readonly folder?: string;
  readonly commands?: readonly string[];
  readonly priority: Priority;
}

export type CreateProjectFailure = "projectNameRequired" | "commandNotAllowable";

export function createProject(
  input: CreateProjectInput,
  eventId: EventId,
  now: Timestamp,
): Transition<ProjectCreated, CreateProjectFailure> {
  const name = input.name.trim();
  if (name === "") return { ok: false, reason: "projectNameRequired" };
  const commands = [...new Set(input.commands ?? [])];
  if (!commands.every(isAllowableCommand)) return { ok: false, reason: "commandNotAllowable" };

  const project: Project = {
    id: input.id,
    companyId: input.companyId,
    name,
    description: input.description?.trim() || undefined,
    folder: input.folder,
    commands,
    status: "planned",
    priority: input.priority,
    heldReason: undefined,
    createdAt: now,
    startedAt: undefined,
    finishedAt: undefined,
  };
  return {
    ok: true,
    project,
    events: [{ eventId, type: "ProjectCreated", occurredAt: now, companyId: project.companyId, projectId: project.id, projectName: project.name }],
  };
}

const event = <T extends string>(type: T, project: Project, eventId: EventId, now: Timestamp) => ({
  eventId,
  type,
  occurredAt: now,
  companyId: project.companyId,
  projectId: project.id,
  projectName: project.name,
});

export function startProject(project: Project, eventId: EventId, now: Timestamp): Transition<ProjectStarted, "projectNotPlanned" | "projectHasNoFolder"> {
  if (project.status !== "planned") return { ok: false, reason: "projectNotPlanned" };
  if (project.folder === undefined) return { ok: false, reason: "projectHasNoFolder" };
  return {
    ok: true,
    project: { ...project, status: "active", startedAt: now },
    events: [event("ProjectStarted", project, eventId, now)],
  };
}

export function holdProject(project: Project, reason: string, eventId: EventId, now: Timestamp): Transition<ProjectHeld, "projectNotActive" | "reasonRequired"> {
  if (project.status !== "active") return { ok: false, reason: "projectNotActive" };
  const why = reason.trim();
  if (why === "") return { ok: false, reason: "reasonRequired" };
  return {
    ok: true,
    project: { ...project, status: "held", heldReason: why },
    events: [{ ...event("ProjectHeld", project, eventId, now), reason: why }],
  };
}

export function resumeProject(project: Project, eventId: EventId, now: Timestamp): Transition<ProjectResumed, "projectNotHeld"> {
  if (project.status !== "held") return { ok: false, reason: "projectNotHeld" };
  return {
    ok: true,
    project: { ...project, status: "active", heldReason: undefined },
    events: [event("ProjectResumed", project, eventId, now)],
  };
}

// Finishing is the user's call, and only once nothing is in progress or waiting for approval.
export function finishProject(
  project: Project,
  openWork: number,
  eventId: EventId,
  now: Timestamp,
): Transition<ProjectFinished, "projectNotActive" | "workStillOpen"> {
  if (project.status !== "active") return { ok: false, reason: "projectNotActive" };
  if (openWork > 0) return { ok: false, reason: "workStillOpen" };
  return {
    ok: true,
    project: { ...project, status: "done", finishedAt: now },
    events: [event("ProjectFinished", project, eventId, now)],
  };
}

export function reopenProject(project: Project, eventId: EventId, now: Timestamp): Transition<ProjectReopened, "projectNotDone"> {
  if (project.status !== "done") return { ok: false, reason: "projectNotDone" };
  return {
    ok: true,
    project: { ...project, status: "active", finishedAt: undefined },
    events: [event("ProjectReopened", project, eventId, now)],
  };
}

export function allowCommand(
  project: Project,
  command: string,
  eventId: EventId,
  now: Timestamp,
): Transition<ProjectCommandAllowed, "commandNotAllowable"> {
  if (!isAllowableCommand(command)) return { ok: false, reason: "commandNotAllowable" };
  const commands = project.commands.includes(command) ? project.commands : [...project.commands, command];
  return {
    ok: true,
    project: { ...project, commands },
    events: [{ ...event("ProjectCommandAllowed", project, eventId, now), command }],
  };
}
