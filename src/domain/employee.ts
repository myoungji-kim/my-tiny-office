import type { EmployeeHired, EmployeeReturned, EmployeeWentOnLeave } from "./events";
import type { CompanyId, EmployeeId, EventId } from "./ids";
import type { Timestamp } from "./time";

export type Availability = "available" | "onLeave";

export interface Employee {
  readonly id: EmployeeId;
  readonly companyId: CompanyId;
  readonly name: string;
  readonly role: string;
  readonly availability: Availability;
  readonly leaveSince: Timestamp | undefined;
  readonly hiredAt: Timestamp;
}

export interface HireEmployeeInput {
  readonly id: EmployeeId;
  readonly companyId: CompanyId;
  readonly name: string;
  readonly role: string;
}

export interface HireEmployeeResult {
  readonly employee: Employee;
  readonly events: readonly [EmployeeHired];
}

export function hireEmployee(
  input: HireEmployeeInput,
  eventId: EventId,
  now: Timestamp,
): HireEmployeeResult {
  const employee: Employee = {
    id: input.id,
    companyId: input.companyId,
    name: input.name,
    role: input.role,
    availability: "available",
    leaveSince: undefined,
    hiredAt: now,
  };

  return {
    employee,
    events: [
      {
        eventId,
        type: "EmployeeHired",
        occurredAt: now,
        companyId: employee.companyId,
        employeeId: employee.id,
        employeeName: employee.name,
        role: employee.role,
      },
    ],
  };
}

type LeaveTransition<TEvent, TFailure extends string> =
  | { readonly ok: true; readonly employee: Employee; readonly events: readonly [TEvent] }
  | { readonly ok: false; readonly reason: TFailure };

// Leave has no return date: it keeps since when, and ends when the user says so.
export function goOnLeave(
  employee: Employee,
  eventId: EventId,
  now: Timestamp,
): LeaveTransition<EmployeeWentOnLeave, "employeeOnLeave"> {
  if (employee.availability === "onLeave") return { ok: false, reason: "employeeOnLeave" };
  return {
    ok: true,
    employee: { ...employee, availability: "onLeave", leaveSince: now },
    events: [{ eventId, type: "EmployeeWentOnLeave", occurredAt: now, companyId: employee.companyId, employeeId: employee.id, employeeName: employee.name }],
  };
}

export function returnFromLeave(
  employee: Employee,
  eventId: EventId,
  now: Timestamp,
): LeaveTransition<EmployeeReturned, "employeeNotOnLeave"> {
  if (employee.availability !== "onLeave") return { ok: false, reason: "employeeNotOnLeave" };
  return {
    ok: true,
    employee: { ...employee, availability: "available", leaveSince: undefined },
    events: [{ eventId, type: "EmployeeReturned", occurredAt: now, companyId: employee.companyId, employeeId: employee.id, employeeName: employee.name }],
  };
}
