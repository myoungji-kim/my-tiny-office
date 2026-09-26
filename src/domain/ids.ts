declare const brand: unique symbol;

type Branded<T, B extends string> = T & { readonly [brand]: B };

export type CompanyId = Branded<string, "CompanyId">;
export type EmployeeId = Branded<string, "EmployeeId">;
export type TaskId = Branded<string, "TaskId">;
export type EventId = Branded<string, "EventId">;

export const toCompanyId = (value: string): CompanyId => value as CompanyId;
export const toEmployeeId = (value: string): EmployeeId => value as EmployeeId;
export const toTaskId = (value: string): TaskId => value as TaskId;
export const toEventId = (value: string): EventId => value as EventId;
