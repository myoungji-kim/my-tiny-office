import type { DomainEvent } from "../domain/events";
import { toEventId, toProjectId, type ProjectId } from "../domain/ids";
import * as projectDomain from "../domain/project";
import type { AtlassianWrite } from "../domain/project";
import * as taskDomain from "../domain/task";

import type { Workspace } from "./agent-runtime";
import type { AppContext, UseCaseResult } from "./context";
import { recordMilestones } from "./history";
import { withdrawReviewsOn } from "./review";
import { forgetTask } from "./task";

type ProjectResult<TFailure extends string> = UseCaseResult<{ readonly project: projectDomain.Project }, TFailure>;

export type CreateProjectInput = Omit<projectDomain.CreateProjectInput, "id">;

export async function createProject(
  ctx: AppContext,
  input: CreateProjectInput,
): Promise<ProjectResult<"companyNotFound" | projectDomain.CreateProjectFailure>> {
  if ((await ctx.companies.findById(input.companyId)) === undefined) return { ok: false, reason: "companyNotFound" };
  const created = projectDomain.createProject({ ...input, id: toProjectId(ctx.newId()) }, toEventId(ctx.newId()), ctx.now());
  if (!created.ok) return created;
  await ctx.projects.save(created.project);
  return { ok: true, value: { project: created.project }, events: created.events };
}

type Transition<TFailure extends string> =
  | { readonly ok: true; readonly project: projectDomain.Project; readonly events: readonly DomainEvent[] }
  | { readonly ok: false; readonly reason: TFailure };

// Loads the project, applies one transition and saves it; `after` carries the
// change to the project's tasks inside the same transaction.
function changeProject<TFailure extends string>(
  ctx: AppContext,
  projectId: ProjectId,
  change: (project: projectDomain.Project, tasks: readonly taskDomain.Task[]) => Transition<TFailure>,
  after: (project: projectDomain.Project, tasks: readonly taskDomain.Task[], events: readonly DomainEvent[]) => Promise<readonly DomainEvent[]> = async () => [],
): Promise<ProjectResult<"projectNotFound" | TFailure>> {
  return ctx.withTransaction(async () => {
    const project = await ctx.projects.findById(projectId);
    if (project === undefined) return { ok: false, reason: "projectNotFound" };
    const tasks = (await ctx.tasks.findByCompany(project.companyId)).filter((t) => t.projectId === project.id);
    const changed = change(project, tasks);
    if (!changed.ok) return changed;
    await ctx.projects.save(changed.project);
    const events = [...changed.events, ...(await after(changed.project, tasks, changed.events))];
    return { ok: true, value: { project: changed.project }, events };
  });
}

const eventId = (ctx: AppContext) => toEventId(ctx.newId());

type TaskChange =
  | { readonly ok: true; readonly task: taskDomain.Task; readonly events: readonly DomainEvent[] }
  | { readonly ok: false };

// Saves the tasks that changed; one a transition refused is left as it was.
async function saveAll(ctx: AppContext, changes: readonly TaskChange[]): Promise<DomainEvent[]> {
  const events: DomainEvent[] = [];
  for (const change of changes) {
    if (!change.ok) continue;
    await ctx.tasks.save(change.task);
    events.push(...change.events);
  }
  return events;
}

export function editProject(
  ctx: AppContext,
  projectId: ProjectId,
  details: projectDomain.ProjectDetails,
): Promise<ProjectResult<"projectNotFound" | projectDomain.EditProjectFailure>> {
  return ctx.withTransaction(async () => {
    const project = await ctx.projects.findById(projectId);
    if (project === undefined) return { ok: false, reason: "projectNotFound" };
    const running = (await ctx.tasks.findByCompany(project.companyId)).filter((t) => t.projectId === project.id && t.status === "working").length;
    const edited = projectDomain.editProject(project, details, running);
    if (!edited.ok) return edited;
    await ctx.projects.save(edited.project);
    return { ok: true, value: { project: edited.project }, events: [] };
  });
}

export const startProject = (ctx: AppContext, projectId: ProjectId) =>
  changeProject(ctx, projectId, (p) => projectDomain.startProject(p, eventId(ctx), ctx.now()));

// Holding a project holds its work in progress with the same reason; finished
// work waiting for approval can still be applied.
export const holdProject = (ctx: AppContext, projectId: ProjectId, reason: string) =>
  changeProject(
    ctx,
    projectId,
    (p) => projectDomain.holdProject(p, reason, eventId(ctx), ctx.now()),
    async (project, tasks) => {
      const working = tasks.filter((t) => t.status === "working");
      const held = await saveAll(ctx, working.map((t) => taskDomain.holdTask(t, project.heldReason ?? reason, eventId(ctx), ctx.now(), true)));
      return [...held, ...(await withdrawReviewsOn(ctx, project.companyId, working.map((t) => t.id)))];
    },
  );

// Resuming gives the work held with the project back to whoever had it.
export const resumeProject = (ctx: AppContext, projectId: ProjectId) =>
  changeProject(
    ctx,
    projectId,
    (p) => projectDomain.resumeProject(p, eventId(ctx), ctx.now()),
    async (_, tasks) =>
      saveAll(ctx, tasks.filter((t) => t.status === "held" && t.heldWithProject).map((t) => taskDomain.resumeTask(t, eventId(ctx), ctx.now()))),
  );

export const reopenProject = (ctx: AppContext, projectId: ProjectId) =>
  changeProject(ctx, projectId, (p) => projectDomain.reopenProject(p, eventId(ctx), ctx.now()));

// Open work is what is in progress or waiting for approval; unstarted work closes as it is.
export const finishProject = (ctx: AppContext, projectId: ProjectId) =>
  changeProject(
    ctx,
    projectId,
    (p, tasks) =>
      projectDomain.finishProject(p, tasks.filter((t) => t.status === "working" || t.status === "approval").length, eventId(ctx), ctx.now()),
    async (project, _, events) => {
      await recordMilestones(ctx, project.companyId, events);
      return [];
    },
  );

// A project goes with its tasks. Work not yet applied is thrown away; an
// applied task's branch holds what was committed, so it stays.
export async function removeProject(ctx: AppContext, workspace: Workspace, projectId: ProjectId): Promise<UseCaseResult<Record<string, never>, "projectNotFound">> {
  const project = await ctx.projects.findById(projectId);
  if (project === undefined) return { ok: false, reason: "projectNotFound" };
  const mine = (await ctx.tasks.findByCompany(project.companyId)).filter((t) => t.projectId === project.id);
  await ctx.withTransaction(async () => {
    for (const task of mine) await forgetTask(ctx, task.id);
    await ctx.projects.remove(project.id);
  });
  if (project.folder !== undefined) {
    for (const task of mine) {
      if (task.status === "done") await workspace.remove(project.folder, task.id);
      else await workspace.discard(project.folder, task.id);
    }
  }
  return { ok: true, value: {}, events: [] };
}

// Likewise a Jira or Confluence write, for every task stopped on that kind of write.
export const allowWrite = (ctx: AppContext, projectId: ProjectId, write: AtlassianWrite) =>
  changeProject(
    ctx,
    projectId,
    (p) => projectDomain.allowWrite(p, write, eventId(ctx), ctx.now()),
    async (_, tasks) =>
      saveAll(
        ctx,
        tasks
          .filter((t) => t.blocker?.kind === "writeNotAllowed" && t.blocker.write === write)
          .map((t) => taskDomain.unblockTask(t, eventId(ctx), ctx.now())),
      ),
  );

// A command allowed from a stopped task is the project's from then on, and
// every task stopped on that same command carries on.
export const allowCommand = (ctx: AppContext, projectId: ProjectId, command: string) =>
  changeProject(
    ctx,
    projectId,
    (p) => projectDomain.allowCommand(p, command, eventId(ctx), ctx.now()),
    async (_, tasks) =>
      saveAll(
        ctx,
        tasks
          .filter((t) => t.blocker?.kind === "commandNotAllowed" && t.blocker.command === command)
          .map((t) => taskDomain.unblockTask(t, eventId(ctx), ctx.now())),
      ),
  );
