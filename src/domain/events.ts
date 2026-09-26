import type { CompanyId, EmployeeId, EventId, TaskId } from "./ids";
import type { TaskPriority } from "./task";
import type { Duration, Timestamp } from "./time";

interface DomainEventBase {
  readonly eventId: EventId;
  readonly occurredAt: Timestamp;
  readonly companyId: CompanyId;
}

export interface CompanyCreated extends DomainEventBase {
  readonly type: "CompanyCreated";
  readonly name: string;
}

export interface EmployeeHired extends DomainEventBase {
  readonly type: "EmployeeHired";
  readonly employeeId: EmployeeId;
  readonly employeeName: string;
  readonly role: string;
}

export interface TaskCreated extends DomainEventBase {
  readonly type: "TaskCreated";
  readonly taskId: TaskId;
  readonly taskTitle: string;
  readonly priority: TaskPriority;
  readonly estimatedDuration: Duration;
}

export interface TaskAssigned extends DomainEventBase {
  readonly type: "TaskAssigned";
  readonly taskId: TaskId;
  readonly taskTitle: string;
  readonly employeeId: EmployeeId;
  readonly employeeName: string;
}

export interface TaskStarted extends DomainEventBase {
  readonly type: "TaskStarted";
  readonly taskId: TaskId;
  readonly taskTitle: string;
  readonly employeeId: EmployeeId;
  readonly employeeName: string;
}

// completedAt is the in-game completion time, which is earlier than occurredAt
// when a task is settled after the application was closed.
export interface TaskCompleted extends DomainEventBase {
  readonly type: "TaskCompleted";
  readonly taskId: TaskId;
  readonly taskTitle: string;
  readonly employeeId: EmployeeId;
  readonly employeeName: string;
  readonly completedAt: Timestamp;
}

export type DomainEvent =
  | CompanyCreated
  | EmployeeHired
  | TaskCreated
  | TaskAssigned
  | TaskStarted
  | TaskCompleted;
