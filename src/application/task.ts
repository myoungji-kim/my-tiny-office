import type { DomainEvent } from "../domain/events";
import { toEventId, toTaskId, type AreaId, type CompanyId, type EmployeeId, type ProjectId, type TaskId } from "../domain/ids";
import { pickUps, reviewsToStart } from "../domain/pick-up";
import type { Priority } from "../domain/project";
import { startQueuedReview, type Review } from "../domain/review";
import * as taskDomain from "../domain/task";

import type { Workspace } from "./agent-runtime";
import type { AppContext, UseCaseResult } from "./context";
import { recordMilestones } from "./history";
import { withdrawReviewsOn } from "./review";

type TaskResult<TFailure extends string> = UseCaseResult<{ readonly task: taskDomain.Task }, TFailure>;

export interface CreateTaskInput {
  readonly companyId: CompanyId;
  readonly projectId: ProjectId;
  readonly title: string;
  readonly description?: string;
  readonly area?: AreaId;
  readonly priority: Priority;
  readonly assigneeId?: EmployeeId;
}

export type CreateTaskFailure =
  | "projectNotFound"
  | "areaNotFound"
  | "projectClosed"
  | "employeeNotFound"
  | taskDomain.CreateTaskFailure
  | taskDomain.AssignTaskFailure;

// Work is written down in a planned or active project, never a held or done one.
export async function createTask(ctx: AppContext, input: CreateTaskInput): Promise<TaskResult<CreateTaskFailure>> {
  const project = await ctx.projects.findById(input.projectId);
  if (project === undefined || project.companyId !== input.companyId) return { ok: false, reason: "projectNotFound" };
  if (project.status !== "planned" && project.status !== "active") return { ok: false, reason: "projectClosed" };
  if (input.area !== undefined && !(await ctx.areas.findByCompany(input.companyId)).some((a) => a.id === input.area)) {
    return { ok: false, reason: "areaNotFound" };
  }

  const now = ctx.now();
  const created = taskDomain.createTask({ ...input, id: toTaskId(ctx.newId()) }, toEventId(ctx.newId()), now);
  if (!created.ok) return created;

  let task = created.task;
  const events: DomainEvent[] = [...created.events];
  if (input.assigneeId !== undefined) {
    const employee = await ctx.employees.findById(input.assigneeId);
    if (employee === undefined) return { ok: false, reason: "employeeNotFound" };
    const assigned = taskDomain.assignTask(task, employee, toEventId(ctx.newId()), now);
    if (!assigned.ok) return assigned;
    task = assigned.task;
    events.push(...assigned.events);
  }

  await ctx.tasks.save(task);
  return { ok: true, value: { task }, events };
}

export async function assignTask(
  ctx: AppContext,
  input: { readonly taskId: TaskId; readonly employeeId: EmployeeId },
): Promise<TaskResult<"taskNotFound" | "employeeNotFound" | taskDomain.AssignTaskFailure>> {
  const task = await ctx.tasks.findById(input.taskId);
  if (task === undefined) return { ok: false, reason: "taskNotFound" };
  const employee = await ctx.employees.findById(input.employeeId);
  if (employee === undefined) return { ok: false, reason: "employeeNotFound" };

  const assigned = taskDomain.assignTask(task, employee, toEventId(ctx.newId()), ctx.now());
  if (!assigned.ok) return assigned;
  await ctx.tasks.save(assigned.task);
  return { ok: true, value: { task: assigned.task }, events: assigned.events };
}

export function editTask(
  ctx: AppContext,
  taskId: TaskId,
  details: taskDomain.TaskDetails & { readonly assigneeId: EmployeeId | undefined },
): Promise<TaskResult<"taskNotFound" | "projectNotFound" | "projectClosed" | "areaNotFound" | "employeeNotFound" | taskDomain.EditTaskFailure>> {
  return ctx.withTransaction(async () => {
    const task = await ctx.tasks.findById(taskId);
    if (task === undefined) return { ok: false, reason: "taskNotFound" };
    const project = await ctx.projects.findById(details.projectId);
    if (project === undefined || project.companyId !== task.companyId) return { ok: false, reason: "projectNotFound" };
    if (project.id !== task.projectId && project.status !== "planned" && project.status !== "active") return { ok: false, reason: "projectClosed" };
    if (details.area !== undefined && !(await ctx.areas.findByCompany(task.companyId)).some((a) => a.id === details.area)) {
      return { ok: false, reason: "areaNotFound" };
    }
    const assignee = details.assigneeId === undefined ? undefined : await ctx.employees.findById(details.assigneeId);
    if (details.assigneeId !== undefined && assignee === undefined) return { ok: false, reason: "employeeNotFound" };

    const edited = taskDomain.editTask(task, details, assignee);
    if (!edited.ok) return edited;
    await ctx.tasks.save(edited.task);
    return { ok: true, value: { task: edited.task }, events: [] };
  });
}

type TaskTransition<TFailure extends string> =
  | { readonly ok: true; readonly task: taskDomain.Task; readonly events: readonly DomainEvent[] }
  | { readonly ok: false; readonly reason: TFailure };

// Loads the task, applies one transition and saves it; `after` reacts to the
// change inside the same transaction and may add events of its own.
function changeTask<TFailure extends string>(
  ctx: AppContext,
  taskId: TaskId,
  change: (task: taskDomain.Task) => TaskTransition<TFailure>,
  after: (before: taskDomain.Task, events: readonly DomainEvent[]) => Promise<readonly DomainEvent[]> = async () => [],
): Promise<TaskResult<"taskNotFound" | TFailure>> {
  return ctx.withTransaction(async () => {
    const task = await ctx.tasks.findById(taskId);
    if (task === undefined) return { ok: false, reason: "taskNotFound" };
    const changed = change(task);
    if (!changed.ok) return changed;
    await ctx.tasks.save(changed.task);
    const events = [...changed.events, ...(await after(task, changed.events))];
    return { ok: true, value: { task: changed.task }, events };
  });
}

const eventId = (ctx: AppContext) => toEventId(ctx.newId());

export const applyTask = (ctx: AppContext, taskId: TaskId) =>
  changeTask(
    ctx,
    taskId,
    (t) => taskDomain.applyTask(t, eventId(ctx), ctx.now()),
    async (task, events) => {
      await recordMilestones(ctx, task.companyId, events);
      return [];
    },
  );

// Applying commits the work to the task's own branch first; nothing is pushed.
export async function approveTask(
  ctx: AppContext,
  workspace: Workspace,
  taskId: TaskId,
): Promise<TaskResult<"taskNotFound" | "taskNotAwaitingApproval" | "commitFailed">> {
  const task = await ctx.tasks.findById(taskId);
  if (task === undefined) return { ok: false, reason: "taskNotFound" };
  if (task.status !== "approval") return { ok: false, reason: "taskNotAwaitingApproval" };
  const folder = (await ctx.projects.findById(task.projectId))?.folder;
  if (folder !== undefined && !(await workspace.commit(folder, task.id, task.title))) return { ok: false, reason: "commitFailed" };

  const applied = await applyTask(ctx, taskId);
  if (applied.ok && folder !== undefined) await workspace.remove(folder, task.id);
  return applied;
}

// A stopped agent carries on in its own session; one stopped on a command
// carries on without it, since allowing a command is the project's to do.
export const carryOn = (ctx: AppContext, taskId: TaskId) => changeTask(ctx, taskId, (t) => taskDomain.unblockTask(t, eventId(ctx), ctx.now()));

export const sendBack = (ctx: AppContext, taskId: TaskId, reason: string) =>
  changeTask(ctx, taskId, (t) => taskDomain.sendBack(t, reason, eventId(ctx), ctx.now()));

// Work that stops being in progress takes its open review with it.
export const holdTask = (ctx: AppContext, taskId: TaskId, reason: string) =>
  changeTask(
    ctx,
    taskId,
    (t) => taskDomain.holdTask(t, reason, eventId(ctx), ctx.now()),
    async (task) => (task.status === "working" ? withdrawReviewsOn(ctx, task.companyId, [task.id]) : []),
  );

export const resumeTask = (ctx: AppContext, taskId: TaskId) =>
  changeTask(ctx, taskId, (t) => taskDomain.resumeTask(t, eventId(ctx), ctx.now()));

// Everyone who is free takes their next thing: a review waiting for them
// first, otherwise a task. Called by the runtime, which is what actually
// starts the work: a task never starts without an agent on it.
export async function pickUpWork(
  ctx: AppContext,
  companyId: CompanyId,
): Promise<UseCaseResult<{ readonly started: readonly taskDomain.Task[]; readonly reviewing: readonly Review[] }, "companyNotFound">> {
  if ((await ctx.companies.findById(companyId)) === undefined) return { ok: false, reason: "companyNotFound" };

  return ctx.withTransaction(async () => {
    const [projects, tasks, employees, reviews] = await Promise.all([
      ctx.projects.findByCompany(companyId),
      ctx.tasks.findByCompany(companyId),
      ctx.employees.findByCompany(companyId),
      ctx.reviews.findByCompany(companyId),
    ]);
    const now = ctx.now();
    const started: taskDomain.Task[] = [];
    const reviewing: Review[] = [];
    const events: DomainEvent[] = [];

    let current = [...reviews];
    for (const reviewId of reviewsToStart(tasks, reviews, employees)) {
      const review = current.find((r) => r.id === reviewId);
      const reviewer = employees.find((e) => e.id === review?.reviewerId);
      if (review === undefined || reviewer === undefined) continue;
      const result = startQueuedReview(review, reviewer, eventId(ctx), now);
      if (!result.ok) continue;
      await ctx.reviews.save(result.review);
      current = current.map((r) => (r.id === reviewId ? result.review : r));
      reviewing.push(result.review);
      events.push(...result.events);
    }

    for (const { employeeId, taskId } of pickUps(projects, tasks, employees, current)) {
      const task = tasks.find((t) => t.id === taskId);
      const employee = employees.find((e) => e.id === employeeId);
      if (task === undefined || employee === undefined) continue;
      const result = taskDomain.startTask(task, employee, eventId(ctx), now);
      if (!result.ok) continue;
      await ctx.tasks.save(result.task);
      started.push(result.task);
      events.push(...result.events);
    }
    return { ok: true, value: { started, reviewing }, events };
  });
}
