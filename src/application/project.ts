import type { DomainEvent } from "../domain/events";
import { toEventId, toProjectId, type CompanyId, type ProjectId } from "../domain/ids";
import * as projectDomain from "../domain/project";

import type { AppContext, UseCaseResult } from "./context";
import { recordMilestones } from "./history";

type ProjectResult<TFailure extends string> = UseCaseResult<{ readonly project: projectDomain.Project }, TFailure>;

export interface CreateProjectInput {
  readonly companyId: CompanyId;
  readonly name: string;
  readonly description?: string;
  readonly folder?: string;
  readonly commands?: readonly string[];
  readonly priority: projectDomain.Priority;
}

export async function createProject(
  ctx: AppContext,
  input: CreateProjectInput,
): Promise<ProjectResult<"companyNotFound" | projectDomain.CreateProjectFailure>> {
  if ((await ctx.companies.findById(input.companyId)) === undefined) {
    return { ok: false, reason: "companyNotFound" };
  }
  const created = projectDomain.createProject(
    { ...input, id: toProjectId(ctx.newId()) },
    toEventId(ctx.newId()),
    ctx.now(),
  );
  if (!created.ok) return created;
  await ctx.projects.save(created.project);
  return { ok: true, value: { project: created.project }, events: created.events };
}

type Transition<TFailure extends string> =
  | { readonly ok: true; readonly project: projectDomain.Project; readonly events: readonly DomainEvent[] }
  | { readonly ok: false; readonly reason: TFailure };

async function changeProject<TFailure extends string>(
  ctx: AppContext,
  projectId: ProjectId,
  change: (project: projectDomain.Project) => Transition<TFailure> | Promise<Transition<TFailure>>,
): Promise<ProjectResult<"projectNotFound" | TFailure>> {
  const project = await ctx.projects.findById(projectId);
  if (project === undefined) return { ok: false, reason: "projectNotFound" };
  const changed = await change(project);
  if (!changed.ok) return changed;
  await ctx.projects.save(changed.project);
  return { ok: true, value: { project: changed.project }, events: changed.events };
}

const eventId = (ctx: AppContext) => toEventId(ctx.newId());

export const startProject = (ctx: AppContext, projectId: ProjectId) =>
  changeProject(ctx, projectId, async (p) => projectDomain.startProject(p, eventId(ctx), ctx.now()));

export const holdProject = (ctx: AppContext, projectId: ProjectId, reason: string) =>
  changeProject(ctx, projectId, async (p) => projectDomain.holdProject(p, reason, eventId(ctx), ctx.now()));

export const resumeProject = (ctx: AppContext, projectId: ProjectId) =>
  changeProject(ctx, projectId, async (p) => projectDomain.resumeProject(p, eventId(ctx), ctx.now()));

export const reopenProject = (ctx: AppContext, projectId: ProjectId) =>
  changeProject(ctx, projectId, async (p) => projectDomain.reopenProject(p, eventId(ctx), ctx.now()));

// Open work is what is in progress or waiting for approval; unstarted work closes as it is.
export async function finishProject(ctx: AppContext, projectId: ProjectId) {
  const result = await changeProject(ctx, projectId, async (p) => {
    const open = (await ctx.tasks.findByCompany(p.companyId)).filter(
      (t) => t.projectId === p.id && (t.status === "working" || t.status === "approval"),
    ).length;
    return projectDomain.finishProject(p, open, eventId(ctx), ctx.now());
  });
  if (result.ok) await recordMilestones(ctx, result.value.project.companyId, result.events);
  return result;
}

export const allowCommand = (ctx: AppContext, projectId: ProjectId, command: string) =>
  changeProject(ctx, projectId, async (p) => projectDomain.allowCommand(p, command, eventId(ctx), ctx.now()));
