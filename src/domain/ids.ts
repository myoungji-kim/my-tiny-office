declare const brand: unique symbol;

type Branded<T, B extends string> = T & { readonly [brand]: B };

export type CompanyId = Branded<string, "CompanyId">;
export type EmployeeId = Branded<string, "EmployeeId">;
export type ProjectId = Branded<string, "ProjectId">;
export type TaskId = Branded<string, "TaskId">;
export type EventId = Branded<string, "EventId">;
export type AreaId = Branded<string, "AreaId">;
export type MemoryId = Branded<string, "MemoryId">;
export type RoleId = Branded<string, "RoleId">;
export type TeamId = Branded<string, "TeamId">;
export type ReviewId = Branded<string, "ReviewId">;
export type MilestoneId = Branded<string, "MilestoneId">;
export type AgentId = Branded<string, "AgentId">;
export type RunId = Branded<string, "RunId">;

export const toCompanyId = (value: string): CompanyId => value as CompanyId;
export const toEmployeeId = (value: string): EmployeeId => value as EmployeeId;
export const toProjectId = (value: string): ProjectId => value as ProjectId;
export const toTaskId = (value: string): TaskId => value as TaskId;
export const toEventId = (value: string): EventId => value as EventId;
export const toAreaId = (value: string): AreaId => value as AreaId;
export const toMemoryId = (value: string): MemoryId => value as MemoryId;
export const toRoleId = (value: string): RoleId => value as RoleId;
export const toTeamId = (value: string): TeamId => value as TeamId;
export const toReviewId = (value: string): ReviewId => value as ReviewId;
export const toMilestoneId = (value: string): MilestoneId => value as MilestoneId;
export const toAgentId = (value: string): AgentId => value as AgentId;
export const toRunId = (value: string): RunId => value as RunId;
