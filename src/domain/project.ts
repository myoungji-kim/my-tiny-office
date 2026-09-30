import type {
  ProjectCommandAllowed,
  ProjectWriteAllowed,
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

// What a task may write to Jira or Confluence once the project allows it.
// Anything else the connector can do, or any other connector, is never allowed.
export const ATLASSIAN_WRITES = [
  "jiraComment",
  "jiraEdit",
  "jiraTransition",
  "jiraCreate",
  "jiraWorklog",
  "jiraLink",
  "confluenceEdit",
  "confluenceCreate",
  "confluenceComment",
] as const;
export type AtlassianWrite = (typeof ATLASSIAN_WRITES)[number];

export const isAtlassianWrite = (value: unknown): value is AtlassianWrite => (ATLASSIAN_WRITES as readonly unknown[]).includes(value);

export interface OwnExtensions {
  readonly skillsOff: readonly string[];
  readonly pluginsOn: readonly string[];
}

export const NO_OWN: OwnExtensions = { skillsOff: [], pluginsOn: [] };
const EXTENSION_NAME = /^[A-Za-z0-9._@-]{1,100}$/;
const MAX_OWN = 50;

// Names that could be a skill's folder or a plugin's id, each once.
export function ownOf(raw: Partial<OwnExtensions> | undefined): OwnExtensions {
  const names = (list: readonly string[] | undefined) => [...new Set((list ?? []).filter((n) => typeof n === "string" && EXTENSION_NAME.test(n)))].slice(0, MAX_OWN);
  return { skillsOff: names(raw?.skillsOff), pluginsOn: names(raw?.pluginsOn) };
}

export interface Project {
  readonly id: ProjectId;
  readonly companyId: CompanyId;
  readonly name: string;
  readonly description: string | undefined;
  readonly folder: string | undefined;
  // Choosing a folder on this computer is the consent to work in it; one
  // that came with an imported company is not, until it is chosen again.
  readonly folderConfirmed: boolean;
  // Exact commands its employees may run; nothing else runs.
  readonly commands: readonly string[];
  // Its employees read Jira and Confluence through the Atlassian connector.
  readonly atlassian: boolean;
  // The writes they make there without asking; only with the connector on.
  readonly writes: readonly AtlassianWrite[];
  // Of the skills and plugins its own folder carries: skills are given unless
  // turned off, plugins only once turned on.
  readonly own: OwnExtensions;
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
export const MAX_COMMANDS = 20;

// A command becomes a Claude Code permission rule, `Bash(<command>)`, where `*`
// is a wildcard and a parenthesis ends the rule. It is also shown to the user
// to approve, so it is one plain command: no invisible or reordering
// characters, and nothing that chains or redirects another command.
const UNSEEN = /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u;
const WIDENS = /[*();&|`$<>]/;

export function isAllowableCommand(command: string): boolean {
  return (
    command.length > 0 &&
    command.length <= MAX_COMMAND &&
    command === command.trim() &&
    !UNSEEN.test(command) &&
    !WIDENS.test(command)
  );
}

export interface CreateProjectInput {
  readonly id: ProjectId;
  readonly companyId: CompanyId;
  readonly name: string;
  readonly description?: string;
  readonly folder?: string;
  readonly commands?: readonly string[];
  readonly atlassian?: boolean;
  readonly writes?: readonly AtlassianWrite[];
  readonly own?: OwnExtensions;
  readonly priority: Priority;
}

export type CreateProjectFailure = "projectNameRequired" | "commandNotAllowable" | "tooManyCommands" | "writeNotAllowable";

// Writes go with the connector: turning it off lets them go too.
const writesOf = (atlassian: boolean, writes: readonly AtlassianWrite[] | undefined) => (atlassian ? [...new Set(writes ?? [])] : []);

export function createProject(
  input: CreateProjectInput,
  eventId: EventId,
  now: Timestamp,
): Transition<ProjectCreated, CreateProjectFailure> {
  const name = input.name.trim();
  if (name === "") return { ok: false, reason: "projectNameRequired" };
  const commands = [...new Set(input.commands ?? [])];
  if (!commands.every(isAllowableCommand)) return { ok: false, reason: "commandNotAllowable" };
  if (commands.length > MAX_COMMANDS) return { ok: false, reason: "tooManyCommands" };
  const writes = writesOf(input.atlassian === true, input.writes);
  if (!writes.every(isAtlassianWrite)) return { ok: false, reason: "writeNotAllowable" };

  const project: Project = {
    id: input.id,
    companyId: input.companyId,
    name,
    description: input.description?.trim() || undefined,
    folder: input.folder,
    folderConfirmed: true,
    commands,
    atlassian: input.atlassian === true,
    writes,
    own: ownOf(input.own),
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

export interface ProjectDetails {
  readonly name: string;
  readonly description: string | undefined;
  readonly folder: string | undefined;
  readonly commands: readonly string[];
  readonly atlassian: boolean;
  readonly writes: readonly AtlassianWrite[];
  readonly own: OwnExtensions;
  readonly priority: Priority;
}

export type EditProjectFailure = CreateProjectFailure | "folderInUse";

// A project's details can change at any time, except its folder while work is
// running in it: the runs already have their worktrees there.
export function editProject(
  project: Project,
  details: ProjectDetails,
  running: number,
): { readonly ok: true; readonly project: Project } | { readonly ok: false; readonly reason: EditProjectFailure } {
  const name = details.name.trim();
  if (name === "") return { ok: false, reason: "projectNameRequired" };
  const commands = [...new Set(details.commands)];
  if (!commands.every(isAllowableCommand)) return { ok: false, reason: "commandNotAllowable" };
  if (commands.length > MAX_COMMANDS) return { ok: false, reason: "tooManyCommands" };
  const writes = writesOf(details.atlassian, details.writes);
  if (!writes.every(isAtlassianWrite)) return { ok: false, reason: "writeNotAllowable" };
  if (details.folder !== project.folder && running > 0) return { ok: false, reason: "folderInUse" };
  return {
    ok: true,
    // the dialog shows the folder and its boundary, so saving it is choosing it
    project: { ...project, name, description: details.description?.trim() || undefined, folder: details.folder, folderConfirmed: true, commands, atlassian: details.atlassian, writes, own: ownOf(details.own), priority: details.priority },
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

export function startProject(
  project: Project,
  eventId: EventId,
  now: Timestamp,
): Transition<ProjectStarted, "projectNotPlanned" | "projectHasNoFolder" | "folderNotChosenHere"> {
  if (project.status !== "planned") return { ok: false, reason: "projectNotPlanned" };
  if (project.folder === undefined) return { ok: false, reason: "projectHasNoFolder" };
  if (!project.folderConfirmed) return { ok: false, reason: "folderNotChosenHere" };
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
): Transition<ProjectCommandAllowed, "commandNotAllowable" | "tooManyCommands"> {
  if (!isAllowableCommand(command)) return { ok: false, reason: "commandNotAllowable" };
  const commands = project.commands.includes(command) ? project.commands : [...project.commands, command];
  if (commands.length > MAX_COMMANDS) return { ok: false, reason: "tooManyCommands" };
  return {
    ok: true,
    project: { ...project, commands },
    events: [{ ...event("ProjectCommandAllowed", project, eventId, now), command }],
  };
}

// A write allowed from a stopped task is the project's from then on.
export function allowWrite(
  project: Project,
  write: AtlassianWrite,
  eventId: EventId,
  now: Timestamp,
): Transition<ProjectWriteAllowed, "writeNotAllowable" | "connectorOff"> {
  if (!isAtlassianWrite(write)) return { ok: false, reason: "writeNotAllowable" };
  if (!project.atlassian) return { ok: false, reason: "connectorOff" };
  const writes = project.writes.includes(write) ? project.writes : [...project.writes, write];
  return {
    ok: true,
    project: { ...project, writes },
    events: [{ ...event("ProjectWriteAllowed", project, eventId, now), write }],
  };
}
