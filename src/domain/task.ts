import type { Employee } from "./employee";
import type { TaskAssigned, TaskCompleted, TaskCreated, TaskStarted } from "./events";
import type { CompanyId, EmployeeId, EventId, TaskId } from "./ids";
import type { Duration, Timestamp } from "./time";

export type TaskStatus = "backlog" | "ready" | "working" | "done";
export type TaskPriority = "low" | "normal" | "high";

export interface Task {
  readonly id: TaskId;
  readonly companyId: CompanyId;
  readonly title: string;
  readonly description: string | undefined;
  readonly status: TaskStatus;
  readonly priority: TaskPriority;
  readonly assigneeId: EmployeeId | undefined;
  readonly estimatedDuration: Duration;
  readonly createdAt: Timestamp;
  readonly startedAt: Timestamp | undefined;
  readonly completedAt: Timestamp | undefined;
}

type TaskTransition<TEvent, TFailure extends string> =
  | { readonly ok: true; readonly task: Task; readonly events: readonly [TEvent] }
  | { readonly ok: false; readonly reason: TFailure };

export interface CreateTaskInput {
  readonly id: TaskId;
  readonly companyId: CompanyId;
  readonly title: string;
  readonly description?: string;
  readonly priority: TaskPriority;
  readonly estimatedDuration: Duration;
}

export type CreateTaskFailure = "invalidEstimatedDuration";
export type AssignTaskFailure =
  | "taskNotAssignable"
  | "employeeFromAnotherCompany"
  | "employeeOnVacation";
export type StartTaskFailure = "taskNotReady" | "taskHasNoAssignee" | "employeeNotAssignee";
export type CompleteTaskFailure = "taskNotWorking" | "employeeNotAssignee";
export type SettleTaskFailure = "taskNotWorking" | "employeeNotAssignee" | "taskNotDueYet";

export type CreateTaskResult = TaskTransition<TaskCreated, CreateTaskFailure>;
export type AssignTaskResult = TaskTransition<TaskAssigned, AssignTaskFailure>;
export type StartTaskResult = TaskTransition<TaskStarted, StartTaskFailure>;
export type CompleteTaskResult = TaskTransition<TaskCompleted, CompleteTaskFailure>;
export type SettleTaskResult = TaskTransition<TaskCompleted, SettleTaskFailure>;

export function createTask(
  input: CreateTaskInput,
  eventId: EventId,
  now: Timestamp,
): CreateTaskResult {
  if (!Number.isFinite(input.estimatedDuration) || input.estimatedDuration <= 0) {
    return { ok: false, reason: "invalidEstimatedDuration" };
  }

  const task: Task = {
    id: input.id,
    companyId: input.companyId,
    title: input.title,
    description: input.description,
    status: "backlog",
    priority: input.priority,
    assigneeId: undefined,
    estimatedDuration: input.estimatedDuration,
    createdAt: now,
    startedAt: undefined,
    completedAt: undefined,
  };

  return {
    ok: true,
    task,
    events: [
      {
        eventId,
        type: "TaskCreated",
        occurredAt: now,
        companyId: task.companyId,
        taskId: task.id,
        taskTitle: task.title,
        priority: task.priority,
        estimatedDuration: task.estimatedDuration,
      },
    ],
  };
}

export function assignTask(
  task: Task,
  employee: Employee,
  eventId: EventId,
  now: Timestamp,
): AssignTaskResult {
  if (task.status !== "backlog" && task.status !== "ready") {
    return { ok: false, reason: "taskNotAssignable" };
  }
  if (employee.companyId !== task.companyId) {
    return { ok: false, reason: "employeeFromAnotherCompany" };
  }
  if (employee.availability !== "available") {
    return { ok: false, reason: "employeeOnVacation" };
  }

  const assigned: Task = { ...task, status: "ready", assigneeId: employee.id };

  return {
    ok: true,
    task: assigned,
    events: [
      {
        eventId,
        type: "TaskAssigned",
        occurredAt: now,
        companyId: assigned.companyId,
        taskId: assigned.id,
        taskTitle: assigned.title,
        employeeId: employee.id,
        employeeName: employee.name,
      },
    ],
  };
}

export function startTask(
  task: Task,
  employee: Employee,
  eventId: EventId,
  now: Timestamp,
): StartTaskResult {
  if (task.status !== "ready") {
    return { ok: false, reason: "taskNotReady" };
  }
  if (task.assigneeId === undefined) {
    return { ok: false, reason: "taskHasNoAssignee" };
  }
  if (employee.id !== task.assigneeId) {
    return { ok: false, reason: "employeeNotAssignee" };
  }

  const started: Task = { ...task, status: "working", startedAt: now };

  return {
    ok: true,
    task: started,
    events: [
      {
        eventId,
        type: "TaskStarted",
        occurredAt: now,
        companyId: started.companyId,
        taskId: started.id,
        taskTitle: started.title,
        employeeId: employee.id,
        employeeName: employee.name,
      },
    ],
  };
}

export function completeTask(
  task: Task,
  employee: Employee,
  eventId: EventId,
  now: Timestamp,
): CompleteTaskResult {
  if (task.status !== "working") {
    return { ok: false, reason: "taskNotWorking" };
  }
  if (employee.id !== task.assigneeId) {
    return { ok: false, reason: "employeeNotAssignee" };
  }

  return {
    ok: true,
    task: { ...task, status: "done", completedAt: now },
    events: [taskCompletedEvent(task, employee, eventId, now, now)],
  };
}

export function settleTask(
  task: Task,
  employee: Employee,
  eventId: EventId,
  now: Timestamp,
): SettleTaskResult {
  if (task.status !== "working" || task.startedAt === undefined) {
    return { ok: false, reason: "taskNotWorking" };
  }
  if (employee.id !== task.assigneeId) {
    return { ok: false, reason: "employeeNotAssignee" };
  }

  const scheduledCompletedAt = task.startedAt + task.estimatedDuration;
  if (now < scheduledCompletedAt) {
    return { ok: false, reason: "taskNotDueYet" };
  }

  return {
    ok: true,
    task: { ...task, status: "done", completedAt: scheduledCompletedAt },
    events: [taskCompletedEvent(task, employee, eventId, now, scheduledCompletedAt)],
  };
}

export function taskProgress(task: Task, now: Timestamp): number {
  switch (task.status) {
    case "backlog":
    case "ready":
      return 0;
    case "done":
      return 1;
    case "working":
      if (task.startedAt === undefined) {
        return 0;
      }
      return Math.min(Math.max((now - task.startedAt) / task.estimatedDuration, 0), 1);
  }
}

function taskCompletedEvent(
  task: Task,
  employee: Employee,
  eventId: EventId,
  occurredAt: Timestamp,
  completedAt: Timestamp,
): TaskCompleted {
  return {
    eventId,
    type: "TaskCompleted",
    occurredAt,
    companyId: task.companyId,
    taskId: task.id,
    taskTitle: task.title,
    employeeId: employee.id,
    employeeName: employee.name,
    completedAt,
  };
}
