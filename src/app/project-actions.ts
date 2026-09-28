"use server";

import { createProject, editProject, finishProject, holdProject, reopenProject, resumeProject, startProject, allowCommand } from "../application/project";
import { createTask, editTask, resumeTask } from "../application/task";
import { toAreaId, toEmployeeId, toProjectId, toTaskId } from "../domain/ids";
import { checkFolder } from "../infrastructure/workspace/folder";

import { inCompany, optional, priorityOf, str, type Outcome } from "./action-context";

export type FolderOutcome = { readonly error: string } | { readonly folder: string; readonly scripts: readonly string[] };

// What the dialog shows before the user consents to a folder.
export async function checkFolderAction(path: string): Promise<FolderOutcome> {
  const checked = checkFolder(str(path));
  return checked.ok ? { folder: checked.folder, scripts: checked.scripts } : { error: checked.reason };
}

export interface ProjectInput {
  readonly name: string;
  readonly description: string;
  readonly priority: string;
  readonly folder: string | undefined;
  readonly commands: readonly string[];
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

export interface TaskInput {
  readonly projectId: string;
  readonly title: string;
  readonly description: string;
  readonly areaId: string | undefined;
  readonly priority: string;
  readonly assigneeId: string | undefined;
}

function taskDetails(input: TaskInput) {
  const area = optional(input.areaId);
  const assignee = optional(input.assigneeId);
  return {
    projectId: toProjectId(str(input.projectId)),
    title: str(input.title),
    description: optional(str(input.description).trim()),
    area: area === undefined ? undefined : toAreaId(area),
    priority: priorityOf(input.priority),
    assigneeId: assignee === undefined ? undefined : toEmployeeId(assignee),
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
