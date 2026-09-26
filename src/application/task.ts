import * as employeeDomain from "../domain/employee";
import type { TaskCompleted } from "../domain/events";
import { toEventId, toTaskId, type CompanyId, type EmployeeId, type TaskId } from "../domain/ids";
import * as taskDomain from "../domain/task";
import type { Duration } from "../domain/time";

import type { AppContext, UseCaseResult } from "./context";

export interface CreateTaskInput {
  readonly companyId: CompanyId;
  readonly title: string;
  readonly description?: string;
  readonly priority: taskDomain.TaskPriority;
  readonly estimatedDuration: Duration;
}

export type CreateTaskFailure = "companyNotFound" | taskDomain.CreateTaskFailure;
export type AssignTaskFailure =
  | "taskNotFound"
  | "employeeNotFound"
  | taskDomain.AssignTaskFailure;
export type StartTaskFailure =
  | "taskNotFound"
  | "employeeNotFound"
  | taskDomain.StartTaskFailure;
export type CompleteTaskFailure =
  | "taskNotFound"
  | "taskHasNoAssignee"
  | "employeeNotFound"
  | taskDomain.CompleteTaskFailure;
export type SettleDueTasksFailure =
  | "companyNotFound"
  | "taskHasNoAssignee"
  | "employeeNotFound"
  | taskDomain.SettleTaskFailure;

type TaskUseCaseResult<TFailure extends string> = UseCaseResult<
  { readonly task: taskDomain.Task },
  TFailure
>;

export type CreateTaskResult = TaskUseCaseResult<CreateTaskFailure>;
export type AssignTaskResult = TaskUseCaseResult<AssignTaskFailure>;
export type StartTaskResult = TaskUseCaseResult<StartTaskFailure>;
export type CompleteTaskResult = TaskUseCaseResult<CompleteTaskFailure>;
export type SettleDueTasksResult = UseCaseResult<
  { readonly settledTasks: readonly taskDomain.Task[] },
  SettleDueTasksFailure
>;

export async function createTask(
  ctx: AppContext,
  input: CreateTaskInput,
): Promise<CreateTaskResult> {
  const now = ctx.now();

  const company = await ctx.companies.findById(input.companyId);
  if (company === undefined) {
    return { ok: false, reason: "companyNotFound" };
  }

  const created = taskDomain.createTask(
    {
      id: toTaskId(ctx.newId()),
      companyId: input.companyId,
      title: input.title,
      description: input.description,
      priority: input.priority,
      estimatedDuration: input.estimatedDuration,
    },
    toEventId(ctx.newId()),
    now,
  );
  if (!created.ok) {
    return { ok: false, reason: created.reason };
  }

  await ctx.tasks.save(created.task);

  return { ok: true, value: { task: created.task }, events: created.events };
}

export async function assignTask(
  ctx: AppContext,
  input: { readonly taskId: TaskId; readonly employeeId: EmployeeId },
): Promise<AssignTaskResult> {
  const now = ctx.now();

  const task = await ctx.tasks.findById(input.taskId);
  if (task === undefined) {
    return { ok: false, reason: "taskNotFound" };
  }

  const employee = await ctx.employees.findById(input.employeeId);
  if (employee === undefined) {
    return { ok: false, reason: "employeeNotFound" };
  }

  const assigned = taskDomain.assignTask(task, employee, toEventId(ctx.newId()), now);
  if (!assigned.ok) {
    return { ok: false, reason: assigned.reason };
  }

  await ctx.tasks.save(assigned.task);

  return { ok: true, value: { task: assigned.task }, events: assigned.events };
}

export async function startTask(
  ctx: AppContext,
  input: { readonly taskId: TaskId },
): Promise<StartTaskResult> {
  const now = ctx.now();

  const task = await ctx.tasks.findById(input.taskId);
  if (task === undefined) {
    return { ok: false, reason: "taskNotFound" };
  }
  if (task.assigneeId === undefined) {
    return { ok: false, reason: "taskHasNoAssignee" };
  }

  const employee = await ctx.employees.findById(task.assigneeId);
  if (employee === undefined) {
    return { ok: false, reason: "employeeNotFound" };
  }

  const started = taskDomain.startTask(task, employee, toEventId(ctx.newId()), now);
  if (!started.ok) {
    return { ok: false, reason: started.reason };
  }

  await ctx.tasks.save(started.task);

  return { ok: true, value: { task: started.task }, events: started.events };
}

export async function completeTask(
  ctx: AppContext,
  input: { readonly taskId: TaskId },
): Promise<CompleteTaskResult> {
  const now = ctx.now();

  const task = await ctx.tasks.findById(input.taskId);
  if (task === undefined) {
    return { ok: false, reason: "taskNotFound" };
  }
  if (task.assigneeId === undefined) {
    return { ok: false, reason: "taskHasNoAssignee" };
  }

  const employee = await ctx.employees.findById(task.assigneeId);
  if (employee === undefined) {
    return { ok: false, reason: "employeeNotFound" };
  }

  const completed = taskDomain.completeTask(task, employee, toEventId(ctx.newId()), now);
  if (!completed.ok) {
    return { ok: false, reason: completed.reason };
  }

  await ctx.tasks.save(completed.task);

  return { ok: true, value: { task: completed.task }, events: completed.events };
}

interface DueTask {
  readonly task: taskDomain.Task;
  readonly employee: employeeDomain.Employee;
}

export async function settleDueTasks(
  ctx: AppContext,
  input: { readonly companyId: CompanyId },
): Promise<SettleDueTasksResult> {
  const now = ctx.now();

  const company = await ctx.companies.findById(input.companyId);
  if (company === undefined) {
    return { ok: false, reason: "companyNotFound" };
  }

  const workingTasks = await ctx.tasks.findWorkingByCompany(input.companyId);

  // Everything is resolved before the first write, so an inconsistent task
  // fails the whole use case instead of leaving a half-settled company.
  const dueTasks: DueTask[] = [];
  for (const task of workingTasks) {
    if (task.startedAt === undefined) {
      return { ok: false, reason: "taskNotWorking" };
    }
    if (taskDomain.taskProgress(task, now) < 1) {
      continue;
    }
    if (task.assigneeId === undefined) {
      return { ok: false, reason: "taskHasNoAssignee" };
    }

    const employee = await ctx.employees.findById(task.assigneeId);
    if (employee === undefined) {
      return { ok: false, reason: "employeeNotFound" };
    }

    dueTasks.push({ task, employee });
  }

  return ctx.withTransaction(async (): Promise<SettleDueTasksResult> => {
    const settlements: { task: taskDomain.Task; event: TaskCompleted }[] = [];
    for (const { task, employee } of dueTasks) {
      const settled = taskDomain.settleTask(task, employee, toEventId(ctx.newId()), now);
      if (!settled.ok) {
        return { ok: false, reason: settled.reason };
      }

      settlements.push({ task: settled.task, event: settled.events[0] });
    }

    settlements.sort((a, b) => a.event.completedAt - b.event.completedAt);

    for (const { task } of settlements) {
      await ctx.tasks.save(task);
    }

    return {
      ok: true,
      value: { settledTasks: settlements.map((settlement) => settlement.task) },
      events: settlements.map((settlement) => settlement.event),
    };
  });
}
