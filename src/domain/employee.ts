import type { EmployeeHired, EmployeeReturned, EmployeeWentOnVacation } from "./events";
import type { CompanyId, EmployeeId, EventId } from "./ids";
import type { Timestamp } from "./time";

export type Availability = "available" | "onVacation";

export interface Employee {
  readonly id: EmployeeId;
  readonly companyId: CompanyId;
  readonly name: string;
  readonly role: string;
  readonly availability: Availability;
  readonly vacationSince: Timestamp | undefined;
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
    vacationSince: undefined,
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
export function goOnVacation(
  employee: Employee,
  eventId: EventId,
  now: Timestamp,
): LeaveTransition<EmployeeWentOnVacation, "employeeOnVacation"> {
  if (employee.availability === "onVacation") return { ok: false, reason: "employeeOnVacation" };
  return {
    ok: true,
    employee: { ...employee, availability: "onVacation", vacationSince: now },
    events: [{ eventId, type: "EmployeeWentOnVacation", occurredAt: now, companyId: employee.companyId, employeeId: employee.id, employeeName: employee.name }],
  };
}

export function returnFromVacation(
  employee: Employee,
  eventId: EventId,
  now: Timestamp,
): LeaveTransition<EmployeeReturned, "employeeNotOnVacation"> {
  if (employee.availability !== "onVacation") return { ok: false, reason: "employeeNotOnVacation" };
  return {
    ok: true,
    employee: { ...employee, availability: "available", vacationSince: undefined },
    events: [{ eventId, type: "EmployeeReturned", occurredAt: now, companyId: employee.companyId, employeeId: employee.id, employeeName: employee.name }],
  };
}
