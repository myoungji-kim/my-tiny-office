"use server";

import { publishTask } from "../application/publish";
import { requestReview } from "../application/review";
import { createProject, editProject, finishProject, holdProject, reopenProject, resumeProject, startProject, allowCommand, allowWrite } from "../application/project";
import { approveTask, carryOn, createTask, editTask, holdTask, resumeTask, sendBack, settleSuggestion } from "../application/task";
import { toAreaId, toEmployeeId, toProjectId, toRunId, toTaskId } from "../domain/ids";
import { isAtlassianWrite } from "../domain/project";
import { checkFolder } from "../infrastructure/workspace/folder";
import { pickFolder } from "../infrastructure/workspace/folder-picker";
import { gitWorkspace } from "../infrastructure/workspace/git";
import { githubPublisher } from "../infrastructure/workspace/github";
import { loadDiff } from "../server/task-work";

import { inCompany, optional, priorityOf, str, type Outcome } from "./action-context";

export type FolderOutcome =
  | { readonly error: string }
  | { readonly folder: string; readonly scripts: readonly string[]; readonly repository: boolean };

const outcomeOf = (checked: ReturnType<typeof checkFolder>): FolderOutcome =>
  checked.ok ? { folder: checked.folder, scripts: checked.scripts, repository: checked.repository } : { error: checked.reason };

// What the dialog shows before the user consents to a folder.
export async function checkFolderAction(path: string): Promise<FolderOutcome> {
  return outcomeOf(checkFolder(str(path)));
}

// The system's own folder dialog, opened on this computer; what it returns is checked like a typed path.
export async function pickFolderAction(): Promise<FolderOutcome> {
  const picked = await pickFolder();
  return picked.ok ? outcomeOf(checkFolder(picked.path)) : { error: picked.reason };
}

export interface ProjectInput {
  readonly name: string;
  readonly description: string;
  readonly priority: string;
  readonly folder: string | undefined;
  readonly commands: readonly string[];
  readonly atlassian: boolean;
  readonly writes: readonly string[];
}

// The folder is checked again here: only what it resolves to on this computer is kept.
function details(input: ProjectInput) {
  const typed = optional(str(input.folder).trim());
  const folder = typed === undefined ? undefined : checkFolder(typed);
  if (folder !== undefined && !folder.ok) return { error: folder.reason } as const;
  return {
    name: str(input.name),
    description: optional(str(input.description).trim()),
    priority: priorityOf(input.priority),
    folder: folder?.folder,
    commands: Array.isArray(input.commands) ? input.commands.map(str) : [],
    atlassian: input.atlassian === true,
    writes: Array.isArray(input.writes) ? input.writes.filter(isAtlassianWrite) : [],
  };
}

export async function newProjectAction(companyId: string, input: ProjectInput): Promise<Outcome & { readonly projectId?: string }> {
  const checked = details(input);
  if ("error" in checked) return { error: checked.error };
  let projectId: string | undefined;
  const outcome = await inCompany(companyId, async (ctx, id) => {
    const made = await createProject(ctx, { companyId: id, ...checked });
    if (made.ok) projectId = made.value.project.id;
    return made;
  });
  return { ...outcome, projectId };
}

export async function editProjectAction(companyId: string, projectId: string, input: ProjectInput): Promise<Outcome> {
  const checked = details(input);
  if ("error" in checked) return { error: checked.error };
  return inCompany(companyId, (ctx) => editProject(ctx, toProjectId(str(projectId)), checked));
}

export async function startProjectAction(companyId: string, projectId: string): Promise<Outcome> {
  return inCompany(companyId, (ctx) => startProject(ctx, toProjectId(str(projectId))));
}

export async function holdProjectAction(companyId: string, projectId: string, reason: string): Promise<Outcome> {
  return inCompany(companyId, (ctx) => holdProject(ctx, toProjectId(str(projectId)), str(reason)));
}

export async function resumeProjectAction(companyId: string, projectId: string): Promise<Outcome> {
  return inCompany(companyId, (ctx) => resumeProject(ctx, toProjectId(str(projectId))));
}

export async function finishProjectAction(companyId: string, projectId: string): Promise<Outcome> {
  return inCompany(companyId, (ctx) => finishProject(ctx, toProjectId(str(projectId))));
}

export async function reopenProjectAction(companyId: string, projectId: string): Promise<Outcome> {
  return inCompany(companyId, (ctx) => reopenProject(ctx, toProjectId(str(projectId))));
}

export async function allowCommandAction(companyId: string, projectId: string, command: string): Promise<Outcome> {
  return inCompany(companyId, (ctx) => allowCommand(ctx, toProjectId(str(projectId)), str(command)));
}

export async function allowWriteAction(companyId: string, projectId: string, write: string): Promise<Outcome> {
  if (!isAtlassianWrite(write)) return { error: "writeNotAllowable" };
  return inCompany(companyId, (ctx) => allowWrite(ctx, toProjectId(str(projectId)), write));
}

export interface TaskInput {
  readonly projectId: string;
  readonly title: string;
  readonly description: string;
  readonly areaId: string | undefined;
  readonly priority: string;
  readonly assigneeId: string | undefined;
  readonly reviewerId: string | undefined;
}

function taskDetails(input: TaskInput) {
  const area = optional(input.areaId);
  const assignee = optional(input.assigneeId);
  const reviewer = optional(input.reviewerId);
  return {
    projectId: toProjectId(str(input.projectId)),
    title: str(input.title),
    description: optional(str(input.description).trim()),
    area: area === undefined ? undefined : toAreaId(area),
    priority: priorityOf(input.priority),
    assigneeId: assignee === undefined ? undefined : toEmployeeId(assignee),
    reviewerId: reviewer === undefined ? undefined : toEmployeeId(reviewer),
  };
}

export async function newTaskAction(companyId: string, input: TaskInput): Promise<Outcome> {
  return inCompany(companyId, (ctx, id) => createTask(ctx, { companyId: id, ...taskDetails(input) }));
}

export async function editTaskAction(companyId: string, taskId: string, input: TaskInput): Promise<Outcome> {
  return inCompany(companyId, (ctx) => editTask(ctx, toTaskId(str(taskId)), taskDetails(input)));
}

export async function resumeTaskAction(companyId: string, taskId: string): Promise<Outcome> {
  return inCompany(companyId, (ctx) => resumeTask(ctx, toTaskId(str(taskId))));
}

export async function approveTaskAction(companyId: string, taskId: string): Promise<Outcome> {
  return inCompany(companyId, (ctx) => approveTask(ctx, gitWorkspace, toTaskId(str(taskId))));
}

export async function publishTaskAction(companyId: string, taskId: string): Promise<Outcome> {
  return inCompany(companyId, (ctx) => publishTask(ctx, githubPublisher, toTaskId(str(taskId))));
}

export async function sendBackAction(companyId: string, taskId: string, reason: string): Promise<Outcome> {
  return inCompany(companyId, (ctx) => sendBack(ctx, toTaskId(str(taskId)), str(reason)));
}

export async function holdTaskAction(companyId: string, taskId: string, reason: string): Promise<Outcome> {
  return inCompany(companyId, (ctx) => holdTask(ctx, toTaskId(str(taskId)), str(reason)));
}

export async function carryOnAction(companyId: string, taskId: string): Promise<Outcome> {
  return inCompany(companyId, (ctx) => carryOn(ctx, toTaskId(str(taskId))));
}

export async function requestReviewAction(companyId: string, taskId: string, reviewerId: string): Promise<Outcome> {
  return inCompany(companyId, (ctx) => requestReview(ctx, toTaskId(str(taskId)), toEmployeeId(str(reviewerId))));
}

export async function settleSuggestionAction(companyId: string, runId: string, text: string): Promise<Outcome> {
  return inCompany(companyId, (ctx) => settleSuggestion(ctx, toRunId(str(runId)), str(text)));
}

export async function diffAction(companyId: string, taskId: string, file: string): Promise<string> {
  return loadDiff(str(companyId), str(taskId), str(file));
}
