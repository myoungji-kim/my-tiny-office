import type { DomainEvent } from "../domain/events";
import { toEventId, toTaskId, type CompanyId, type EmployeeId, type ProjectId, type TaskId } from "../domain/ids";
import { pickUps } from "../domain/pick-up";
import type { Priority } from "../domain/project";
import * as taskDomain from "../domain/task";

import type { AppContext, UseCaseResult } from "./context";

type TaskResult<TFailure extends string> = UseCaseResult<{ readonly task: taskDomain.Task }, TFailure>;

export interface CreateTaskInput {
  readonly companyId: CompanyId;
  readonly projectId: ProjectId;
  readonly title: string;
  readonly description?: string;
  readonly area?: string;
  readonly priority: Priority;
  readonly assigneeId?: EmployeeId;
}

export type CreateTaskFailure =
  | "projectNotFound"
  | "projectClosed"
  | "employeeNotFound"
  | taskDomain.CreateTaskFailure
  | taskDomain.AssignTaskFailure;

// Work is written down in a planned or active project, never a held or done one.
export async function createTask(ctx: AppContext, input: CreateTaskInput): Promise<TaskResult<CreateTaskFailure>> {
  const project = await ctx.projects.findById(input.projectId);
  if (project === undefined || project.companyId !== input.companyId) return { ok: false, reason: "projectNotFound" };
  if (project.status !== "planned" && project.status !== "active") return { ok: false, reason: "projectClosed" };

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

type TaskTransition<TFailure extends string> =
  | { readonly ok: true; readonly task: taskDomain.Task; readonly events: readonly DomainEvent[] }
  | { readonly ok: false; readonly reason: TFailure };

async function changeTask<TFailure extends string>(
  ctx: AppContext,
  taskId: TaskId,
  change: (task: taskDomain.Task) => TaskTransition<TFailure>,
): Promise<TaskResult<"taskNotFound" | TFailure>> {
  const task = await ctx.tasks.findById(taskId);
  if (task === undefined) return { ok: false, reason: "taskNotFound" };
  const changed = change(task);
  if (!changed.ok) return changed;
  await ctx.tasks.save(changed.task);
  return { ok: true, value: { task: changed.task }, events: changed.events };
}

const eventId = (ctx: AppContext) => toEventId(ctx.newId());

export const applyTask = (ctx: AppContext, taskId: TaskId) =>
  changeTask(ctx, taskId, (t) => taskDomain.applyTask(t, eventId(ctx), ctx.now()));

export const sendBack = (ctx: AppContext, taskId: TaskId, reason: string) =>
  changeTask(ctx, taskId, (t) => taskDomain.sendBack(t, reason, eventId(ctx), ctx.now()));

export const holdTask = (ctx: AppContext, taskId: TaskId, reason: string) =>
  changeTask(ctx, taskId, (t) => taskDomain.holdTask(t, reason, eventId(ctx), ctx.now()));

export const resumeTask = (ctx: AppContext, taskId: TaskId) =>
  changeTask(ctx, taskId, (t) => taskDomain.resumeTask(t, eventId(ctx), ctx.now()));

// Everyone who is free takes their next task. Called by the runtime, which is
// what actually starts the work: a task never starts without an agent on it.
export async function pickUpWork(
  ctx: AppContext,
  companyId: CompanyId,
): Promise<UseCaseResult<{ readonly started: readonly taskDomain.Task[] }, "companyNotFound">> {
  if ((await ctx.companies.findById(companyId)) === undefined) return { ok: false, reason: "companyNotFound" };

  return ctx.withTransaction(async () => {
    const [projects, tasks, employees] = await Promise.all([
      ctx.projects.findByCompany(companyId),
      ctx.tasks.findByCompany(companyId),
      ctx.employees.findByCompany(companyId),
    ]);
    const now = ctx.now();
    const started: taskDomain.Task[] = [];
    const events: DomainEvent[] = [];
    for (const { employeeId, taskId } of pickUps(projects, tasks, employees)) {
      const task = tasks.find((t) => t.id === taskId)!;
      const employee = employees.find((e) => e.id === employeeId)!;
      const result = taskDomain.startTask(task, employee, eventId(ctx), now);
      if (!result.ok) continue;
      await ctx.tasks.save(result.task);
      started.push(result.task);
      events.push(...result.events);
    }
    return { ok: true as const, value: { started }, events };
  });
}
