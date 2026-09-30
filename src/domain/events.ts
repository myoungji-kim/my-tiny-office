import type { AreaId, CompanyId, EmployeeId, EventId, MemoryId, ProjectId, ReviewId, RoleId, TaskId, TeamId } from "./ids";
import type { MemoryKind } from "./memory";
import type { AtlassianWrite, Priority } from "./project";
import type { Blocker } from "./task";
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

interface EmployeeEvent extends DomainEventBase {
  readonly employeeId: EmployeeId;
  readonly employeeName: string;
}

export interface EmployeeHired extends EmployeeEvent {
  readonly type: "EmployeeHired";
  readonly roleId: RoleId;
  readonly teamId: TeamId | undefined;
}

export interface EmployeeMoved extends EmployeeEvent {
  readonly type: "EmployeeMoved";
  readonly teamId: TeamId | undefined;
}

export interface EmployeeWentOnLeave extends EmployeeEvent {
  readonly type: "EmployeeWentOnLeave";
}

export interface EmployeeReturned extends EmployeeEvent {
  readonly type: "EmployeeReturned";
}

export interface EmployeeLeft extends EmployeeEvent {
  readonly type: "EmployeeLeft";
}

interface ProjectEvent extends DomainEventBase {
  readonly projectId: ProjectId;
  readonly projectName: string;
}

export interface ProjectCreated extends ProjectEvent {
  readonly type: "ProjectCreated";
}
export interface ProjectStarted extends ProjectEvent {
  readonly type: "ProjectStarted";
}
export interface ProjectHeld extends ProjectEvent {
  readonly type: "ProjectHeld";
  readonly reason: string;
}
export interface ProjectResumed extends ProjectEvent {
  readonly type: "ProjectResumed";
}
export interface ProjectFinished extends ProjectEvent {
  readonly type: "ProjectFinished";
}
export interface ProjectReopened extends ProjectEvent {
  readonly type: "ProjectReopened";
}
export interface ProjectWriteAllowed extends ProjectEvent {
  readonly type: "ProjectWriteAllowed";
  readonly write: AtlassianWrite;
}

export interface ProjectCommandAllowed extends ProjectEvent {
  readonly type: "ProjectCommandAllowed";
  readonly command: string;
}

interface TaskEvent extends DomainEventBase {
  readonly taskId: TaskId;
  readonly taskTitle: string;
}

export interface TaskCreated extends TaskEvent {
  readonly type: "TaskCreated";
  readonly projectId: ProjectId;
  readonly priority: Priority;
}
export interface TaskAssigned extends TaskEvent {
  readonly type: "TaskAssigned";
  readonly employeeId: EmployeeId;
  readonly employeeName: string;
}
export interface TaskStarted extends TaskEvent {
  readonly type: "TaskStarted";
  readonly employeeId: EmployeeId;
  readonly employeeName: string;
}
// The work is done on this computer and waits for the user to apply it.
export interface TaskFinished extends TaskEvent {
  readonly type: "TaskFinished";
  readonly employeeId: EmployeeId | undefined;
  readonly took: Duration;
}
export interface TaskApplied extends TaskEvent {
  readonly type: "TaskApplied";
}
export interface TaskSentBack extends TaskEvent {
  readonly type: "TaskSentBack";
  readonly reason: string;
}
export interface TaskHeld extends TaskEvent {
  readonly type: "TaskHeld";
  readonly reason: string;
}
export interface TaskResumed extends TaskEvent {
  readonly type: "TaskResumed";
}
export interface TaskBlocked extends TaskEvent {
  readonly type: "TaskBlocked";
  readonly blocker: Blocker;
}
export interface TaskUnblocked extends TaskEvent {
  readonly type: "TaskUnblocked";
}
export interface TaskReturned extends TaskEvent {
  readonly type: "TaskReturned";
}

export interface AreaAdded extends DomainEventBase {
  readonly type: "AreaAdded";
  readonly areaId: AreaId;
  readonly areaName: string;
}
export interface AreaRenamed extends DomainEventBase {
  readonly type: "AreaRenamed";
  readonly areaId: AreaId;
  readonly areaName: string;
}
export interface AreaRemoved extends DomainEventBase {
  readonly type: "AreaRemoved";
  readonly areaId: AreaId;
}

export interface MemoryTaught extends DomainEventBase {
  readonly type: "MemoryTaught";
  readonly memoryId: MemoryId;
  readonly kind: MemoryKind;
  readonly employeeId: EmployeeId | undefined;
  readonly areaId: AreaId | undefined;
}
export interface MemoryRemoved extends DomainEventBase {
  readonly type: "MemoryRemoved";
  readonly memoryId: MemoryId;
  readonly employeeId: EmployeeId | undefined;
}

interface ReviewEvent extends DomainEventBase {
  readonly reviewId: ReviewId;
  readonly taskId: TaskId;
}
export interface ReviewSuggested extends ReviewEvent {
  readonly type: "ReviewSuggested";
}
export interface ReviewQueued extends ReviewEvent {
  readonly type: "ReviewQueued";
  readonly reviewerId: EmployeeId;
  readonly reviewerName: string;
}
export interface ReviewStarted extends ReviewEvent {
  readonly type: "ReviewStarted";
  readonly reviewerId: EmployeeId;
  readonly reviewerName: string;
}
export interface ReviewSettled extends ReviewEvent {
  readonly type: "ReviewSettled";
  readonly reviewerId: EmployeeId;
  readonly reviewerName: string;
}
export interface ReviewWithdrawn extends ReviewEvent {
  readonly type: "ReviewWithdrawn";
}
export interface ReviewReleased extends ReviewEvent {
  readonly type: "ReviewReleased";
}

export type DomainEvent =
  | ReviewSuggested
  | ReviewQueued
  | ReviewStarted
  | ReviewSettled
  | ReviewWithdrawn
  | ReviewReleased
  | AreaAdded
  | AreaRenamed
  | AreaRemoved
  | MemoryTaught
  | MemoryRemoved
  | CompanyCreated
  | EmployeeHired
  | EmployeeMoved
  | EmployeeWentOnLeave
  | EmployeeReturned
  | EmployeeLeft
  | ProjectCreated
  | ProjectStarted
  | ProjectHeld
  | ProjectResumed
  | ProjectFinished
  | ProjectReopened
  | ProjectCommandAllowed
  | ProjectWriteAllowed
  | TaskCreated
  | TaskAssigned
  | TaskStarted
  | TaskFinished
  | TaskApplied
  | TaskSentBack
  | TaskHeld
  | TaskResumed
  | TaskBlocked
  | TaskUnblocked
  | TaskReturned;
