import type { Employee } from "./employee";
import type {
  TaskApplied,
  TaskAssigned,
  TaskBlocked,
  TaskCreated,
  TaskFinished,
  TaskHeld,
  TaskResumed,
  TaskReturned,
  TaskSentBack,
  TaskStarted,
  TaskUnblocked,
} from "./events";
import type { AreaId, CompanyId, EmployeeId, EventId, ProjectId, TaskId } from "./ids";
import type { AtlassianWrite, Priority } from "./project";
import type { Duration, Timestamp } from "./time";

// backlog → working → approval → done, and held off to the side. Work is
// picked up, never started by hand, and stops at approval: applying it is the
// one step the office does not take on its own.
export type TaskStatus = "backlog" | "working" | "approval" | "done" | "held";

// Blocked is not a status: a task is blocked out of the one it is in.
export type Blocker =
  | { readonly kind: "disconnected" }
  | { readonly kind: "commandNotAllowed"; readonly command: string }
  // a Jira or Confluence write the project does not allow: where it would go and what it would say
  | { readonly kind: "writeNotAllowed"; readonly write: AtlassianWrite; readonly target: string; readonly text: string }
  | { readonly kind: "budgetReached" }
  // the task's worktree could not be made in its project's folder
  | { readonly kind: "workspaceUnavailable" };

export interface Task {
  readonly id: TaskId;
  readonly companyId: CompanyId;
  readonly projectId: ProjectId;
  readonly title: string;
  readonly description: string | undefined;
  readonly area: AreaId | undefined;
  readonly priority: Priority;
  readonly assigneeId: EmployeeId | undefined;
  readonly status: TaskStatus;
  readonly blocker: Blocker | undefined;
  readonly heldReason: string | undefined;
  readonly heldFrom: "backlog" | "working" | "approval" | undefined;
  // held because its project was, so resuming the project resumes it
  readonly heldWithProject: boolean;
  readonly changesRequested: string | undefined;
  // the colleague who reviews it once it is first finished
  readonly reviewerId: EmployeeId | undefined;
  readonly createdAt: Timestamp;
  readonly startedAt: Timestamp | undefined;
  // Time is what the work has taken: runs add up, and a pause adds nothing.
  readonly workedFor: Duration;
  readonly runningSince: Timestamp | undefined;
  readonly finishedAt: Timestamp | undefined;
  readonly appliedAt: Timestamp | undefined;
  // where applied work went up for review: its pull request, or the page that opens one
  readonly publishedUrl: string | undefined;
}

// What the user asked for when they sent the work back, as they wrote it.
export interface TaskRequest {
  readonly companyId: CompanyId;
  readonly taskId: TaskId;
  readonly at: Timestamp;
  readonly text: string;
}

type Transition<TEvent, TFailure extends string> =
  | { readonly ok: true; readonly task: Task; readonly events: readonly [TEvent] }
  | { readonly ok: false; readonly reason: TFailure };

export function timeTaken(task: Task, now: Timestamp): Duration {
  return task.workedFor + (task.runningSince === undefined ? 0 : Math.max(now - task.runningSince, 0));
}

// Stops the clock, keeping what has run so far.
const paused = (task: Task, now: Timestamp): Task => ({
  ...task,
  workedFor: timeTaken(task, now),
  runningSince: undefined,
});

const base = (task: Task, eventId: EventId, now: Timestamp) => ({
  eventId,
  occurredAt: now,
  companyId: task.companyId,
  taskId: task.id,
  taskTitle: task.title,
});

const assignable = (task: Task, employee: Employee) =>
  employee.companyId !== task.companyId
    ? ("employeeFromAnotherCompany" as const)
    : employee.availability !== "available"
      ? ("employeeOnLeave" as const)
      : undefined;

export interface CreateTaskInput {
  readonly id: TaskId;
  readonly companyId: CompanyId;
  readonly projectId: ProjectId;
  readonly title: string;
  readonly description?: string;
  readonly area?: AreaId;
  readonly priority: Priority;
  readonly reviewerId?: EmployeeId;
}

export type CreateTaskFailure = "taskTitleRequired";

export function createTask(input: CreateTaskInput, eventId: EventId, now: Timestamp): Transition<TaskCreated, CreateTaskFailure> {
  const title = input.title.trim();
  if (title === "") return { ok: false, reason: "taskTitleRequired" };

  const task: Task = {
    id: input.id,
    companyId: input.companyId,
    projectId: input.projectId,
    title,
    description: input.description?.trim() || undefined,
    area: input.area,
    priority: input.priority,
    assigneeId: undefined,
    status: "backlog",
    blocker: undefined,
    heldReason: undefined,
    heldFrom: undefined,
    heldWithProject: false,
    changesRequested: undefined,
    reviewerId: input.reviewerId,
    createdAt: now,
    startedAt: undefined,
    workedFor: 0,
    runningSince: undefined,
    finishedAt: undefined,
    appliedAt: undefined,
    publishedUrl: undefined,
  };
  return {
    ok: true,
    task,
    events: [{ ...base(task, eventId, now), type: "TaskCreated", projectId: task.projectId, priority: task.priority }],
  };
}

export type AssignTaskFailure = "taskNotAssignable" | "employeeFromAnotherCompany" | "employeeOnLeave";

// Naming who does it; whether they start now is the pick-up's business.
export function assignTask(task: Task, employee: Employee, eventId: EventId, now: Timestamp): Transition<TaskAssigned, AssignTaskFailure> {
  if (task.status !== "backlog") return { ok: false, reason: "taskNotAssignable" };
  const refused = assignable(task, employee);
  if (refused !== undefined) return { ok: false, reason: refused };
  return {
    ok: true,
    task: { ...task, assigneeId: employee.id },
    events: [{ ...base(task, eventId, now), type: "TaskAssigned", employeeId: employee.id, employeeName: employee.name }],
  };
}

export interface TaskDetails {
  readonly projectId: ProjectId;
  readonly title: string;
  readonly description: string | undefined;
  readonly area: AreaId | undefined;
  readonly priority: Priority;
  readonly reviewerId: EmployeeId | undefined;
}

export type EditTaskFailure = "taskNotEditable" | "taskTitleRequired" | "employeeFromAnotherCompany" | "employeeOnLeave" | "reviewerIsAssignee";

// Work nobody is running can be rewritten and handed to someone else, or to
// whoever is free. Running work changes through its agent, and finished work
// is the record of what happened.
export function editTask(task: Task, details: TaskDetails, assignee: Employee | undefined): { readonly ok: true; readonly task: Task } | { readonly ok: false; readonly reason: EditTaskFailure } {
  if (task.status !== "backlog" && task.status !== "held") return { ok: false, reason: "taskNotEditable" };
  const title = details.title.trim();
  if (title === "") return { ok: false, reason: "taskTitleRequired" };
  const refused = assignee === undefined ? undefined : assignable(task, assignee);
  if (refused !== undefined) return { ok: false, reason: refused };
  if (details.reviewerId !== undefined && details.reviewerId === assignee?.id) return { ok: false, reason: "reviewerIsAssignee" };
  return {
    ok: true,
    task: {
      ...task,
      reviewerId: details.reviewerId,
      projectId: details.projectId,
      title,
      description: details.description?.trim() || undefined,
      area: details.area,
      priority: details.priority,
      assigneeId: assignee?.id,
    },
  };
}

export type StartTaskFailure = "taskNotInBacklog" | "taskHasAnotherAssignee" | "employeeFromAnotherCompany" | "employeeOnLeave";

export function startTask(task: Task, employee: Employee, eventId: EventId, now: Timestamp): Transition<TaskStarted, StartTaskFailure> {
  if (task.status !== "backlog") return { ok: false, reason: "taskNotInBacklog" };
  if (task.assigneeId !== undefined && task.assigneeId !== employee.id) return { ok: false, reason: "taskHasAnotherAssignee" };
  const refused = assignable(task, employee);
  if (refused !== undefined) return { ok: false, reason: refused };
  return {
    ok: true,
    task: { ...task, status: "working", assigneeId: employee.id, startedAt: task.startedAt ?? now, runningSince: now },
    events: [{ ...base(task, eventId, now), type: "TaskStarted", employeeId: employee.id, employeeName: employee.name }],
  };
}

export function finishWork(task: Task, eventId: EventId, now: Timestamp): Transition<TaskFinished, "taskNotWorking" | "taskBlocked"> {
  if (task.status !== "working") return { ok: false, reason: "taskNotWorking" };
  if (task.blocker !== undefined) return { ok: false, reason: "taskBlocked" };
  const finished: Task = { ...paused(task, now), status: "approval", finishedAt: now, changesRequested: undefined };
  return {
    ok: true,
    task: finished,
    events: [{ ...base(task, eventId, now), type: "TaskFinished", employeeId: task.assigneeId, took: finished.workedFor }],
  };
}

export function applyTask(task: Task, eventId: EventId, now: Timestamp): Transition<TaskApplied, "taskNotAwaitingApproval"> {
  if (task.status !== "approval") return { ok: false, reason: "taskNotAwaitingApproval" };
  return {
    ok: true,
    task: { ...task, status: "done", appliedAt: now },
    events: [{ ...base(task, eventId, now), type: "TaskApplied" }],
  };
}

// A finished task is the record of what happened; anything else can be thrown away.
export const isRemovable = (task: Task): boolean => task.status !== "done";

// Only applied work goes up, and the user sends it.
export function publishTask(task: Task, url: string): { readonly ok: true; readonly task: Task } | { readonly ok: false; readonly reason: "taskNotDone" } {
  if (task.status !== "done") return { ok: false, reason: "taskNotDone" };
  return { ok: true, task: { ...task, publishedUrl: url } };
}

// Back to whoever did it: they pick it up as soon as they are free.
export function sendBack(task: Task, reason: string, eventId: EventId, now: Timestamp): Transition<TaskSentBack, "taskNotAwaitingApproval" | "reasonRequired"> {
  if (task.status !== "approval") return { ok: false, reason: "taskNotAwaitingApproval" };
  const why = reason.trim();
  if (why === "") return { ok: false, reason: "reasonRequired" };
  return {
    ok: true,
    task: { ...task, status: "backlog", changesRequested: why, finishedAt: undefined },
    events: [{ ...base(task, eventId, now), type: "TaskSentBack", reason: why }],
  };
}

// Finished work goes back to being worked on while a colleague reviews it;
// nobody runs on it until the review settles.
export function reopenForReview(task: Task): { readonly ok: true; readonly task: Task } | { readonly ok: false; readonly reason: "taskNotAwaitingApproval" } {
  if (task.status !== "approval") return { ok: false, reason: "taskNotAwaitingApproval" };
  return { ok: true, task: { ...task, status: "working", finishedAt: undefined, runningSince: undefined } };
}

// A review that asks for changes hands the work back to whoever did it, as
// the user sending it back would.
export function reviewAskedForChanges(task: Task, comments: string, eventId: EventId, now: Timestamp): Transition<TaskSentBack, "taskNotWorking"> {
  if (task.status !== "working") return { ok: false, reason: "taskNotWorking" };
  return {
    ok: true,
    task: { ...paused(task, now), status: "backlog", changesRequested: comments.trim() || undefined },
    events: [{ ...base(task, eventId, now), type: "TaskSentBack", reason: comments.trim() }],
  };
}

export function holdTask(
  task: Task,
  reason: string,
  eventId: EventId,
  now: Timestamp,
  withProject = false,
): Transition<TaskHeld, "taskNotHoldable" | "reasonRequired"> {
  if (task.status !== "backlog" && task.status !== "working" && task.status !== "approval") {
    return { ok: false, reason: "taskNotHoldable" };
  }
  const why = reason.trim();
  if (why === "") return { ok: false, reason: "reasonRequired" };
  return {
    ok: true,
    task: { ...paused(task, now), status: "held", heldFrom: task.status, heldReason: why, heldWithProject: withProject, blocker: undefined },
    events: [{ ...base(task, eventId, now), type: "TaskHeld", reason: why }],
  };
}

// Finished work comes back waiting for approval; anything else queues again
// for whoever had it.
export function resumeTask(task: Task, eventId: EventId, now: Timestamp): Transition<TaskResumed, "taskNotHeld"> {
  if (task.status !== "held") return { ok: false, reason: "taskNotHeld" };
  return {
    ok: true,
    task: {
      ...task,
      status: task.heldFrom === "approval" ? "approval" : "backlog",
      heldFrom: undefined,
      heldReason: undefined,
      heldWithProject: false,
    },
    events: [{ ...base(task, eventId, now), type: "TaskResumed" }],
  };
}

export function blockTask(task: Task, blocker: Blocker, eventId: EventId, now: Timestamp): Transition<TaskBlocked, "taskNotWorking"> {
  if (task.status !== "working") return { ok: false, reason: "taskNotWorking" };
  return {
    ok: true,
    task: { ...paused(task, now), blocker },
    events: [{ ...base(task, eventId, now), type: "TaskBlocked", blocker }],
  };
}

export function unblockTask(task: Task, eventId: EventId, now: Timestamp): Transition<TaskUnblocked, "taskNotBlocked"> {
  if (task.status !== "working" || task.blocker === undefined) return { ok: false, reason: "taskNotBlocked" };
  return {
    ok: true,
    task: { ...task, blocker: undefined, runningSince: now },
    events: [{ ...base(task, eventId, now), type: "TaskUnblocked" }],
  };
}

// When its employee goes on leave or is let go, their work in progress and
// what was waiting for them go back to the backlog for whoever is free.
export function returnToBacklog(task: Task, eventId: EventId, now: Timestamp): Transition<TaskReturned, "taskNotTheirs"> {
  if (task.status !== "working" && task.status !== "backlog") return { ok: false, reason: "taskNotTheirs" };
  if (task.assigneeId === undefined) return { ok: false, reason: "taskNotTheirs" };
  return {
    ok: true,
    task: { ...paused(task, now), status: "backlog", assigneeId: undefined, blocker: undefined },
    events: [{ ...base(task, eventId, now), type: "TaskReturned" }],
  };
}
