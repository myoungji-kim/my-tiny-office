import type { EmployeeHired, EmployeeMoved, EmployeeReturned, EmployeeWentOnLeave } from "./events";
import type { CompanyId, EmployeeId, EventId, RoleId, TeamId } from "./ids";
import { checkName, type NameFailure } from "./name";
import type { Timestamp } from "./time";

// "left": let go; kept so what they did keeps their name, and never given work again
export type Availability = "available" | "onLeave" | "left";

// The species only decides the sprite; it is never spelled out beside the name.
export const SPECIES = [
  "cat", "fox", "squirrel", "bunny", "dog", "bear", "panda", "mouse", "hamster", "koala",
  "chick", "owl", "sheep", "hedgehog", "duck", "penguin", "pig", "cow", "deer", "frog",
] as const;
export type Species = (typeof SPECIES)[number];

export const MAX_EMPLOYEE_NAME = 20;

export interface Employee {
  readonly id: EmployeeId;
  readonly companyId: CompanyId;
  readonly name: string;
  readonly species: Species;
  readonly roleId: RoleId;
  readonly teamId: TeamId | undefined;
  readonly availability: Availability;
  readonly leaveSince: Timestamp | undefined;
  readonly hiredAt: Timestamp;
}

export interface HireEmployeeInput {
  readonly id: EmployeeId;
  readonly companyId: CompanyId;
  readonly name: string;
  readonly species: Species;
  readonly roleId: RoleId;
  readonly teamId?: TeamId;
}

export type HireEmployeeResult =
  | { readonly ok: true; readonly employee: Employee; readonly events: readonly [EmployeeHired] }
  | { readonly ok: false; readonly reason: NameFailure };

// Hiring has no cap: every hire brings a desk.
export function hireEmployee(
  input: HireEmployeeInput,
  eventId: EventId,
  now: Timestamp,
): HireEmployeeResult {
  const checked = checkName(input.name, MAX_EMPLOYEE_NAME);
  if (!checked.ok) return checked;
  const name = checked.name;

  const employee: Employee = {
    id: input.id,
    companyId: input.companyId,
    name,
    species: input.species,
    roleId: input.roleId,
    teamId: input.teamId,
    availability: "available",
    leaveSince: undefined,
    hiredAt: now,
  };

  return {
    ok: true,
    employee,
    events: [
      {
        eventId,
        type: "EmployeeHired",
        occurredAt: now,
        companyId: employee.companyId,
        employeeId: employee.id,
        employeeName: employee.name,
        roleId: employee.roleId,
        teamId: employee.teamId,
      },
    ],
  };
}

// Who someone is can be corrected; nothing they have done changes with it.
export function editEmployee(
  employee: Employee,
  changes: { readonly name: string; readonly species: Species; readonly roleId: RoleId },
): { readonly ok: true; readonly employee: Employee } | { readonly ok: false; readonly reason: NameFailure } {
  const checked = checkName(changes.name, MAX_EMPLOYEE_NAME);
  if (!checked.ok) return checked;
  return { ok: true, employee: { ...employee, name: checked.name, species: changes.species, roleId: changes.roleId } };
}

export function moveToTeam(employee: Employee, teamId: TeamId | undefined, eventId: EventId, now: Timestamp): { readonly employee: Employee; readonly events: readonly [EmployeeMoved] } {
  return {
    employee: { ...employee, teamId },
    events: [{ eventId, type: "EmployeeMoved", occurredAt: now, companyId: employee.companyId, employeeId: employee.id, employeeName: employee.name, teamId }],
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
  if (employee.availability !== "available") return { ok: false, reason: "employeeOnLeave" };
  return {
    ok: true,
    employee: { ...employee, availability: "onLeave", leaveSince: now },
    events: [{ eventId, type: "EmployeeWentOnLeave", occurredAt: now, companyId: employee.companyId, employeeId: employee.id, employeeName: employee.name }],
  };
}

export function letGo(employee: Employee): { readonly ok: true; readonly employee: Employee } | { readonly ok: false; readonly reason: "employeeGone" } {
  if (employee.availability === "left") return { ok: false, reason: "employeeGone" };
  return { ok: true, employee: { ...employee, availability: "left", leaveSince: undefined } };
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
