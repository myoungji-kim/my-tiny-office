import type { EmployeeHired } from "./events";
import type { CompanyId, EmployeeId, EventId } from "./ids";
import type { Timestamp } from "./time";

export type Availability = "available" | "onVacation";

export interface Employee {
  readonly id: EmployeeId;
  readonly companyId: CompanyId;
  readonly name: string;
  readonly role: string;
  readonly availability: Availability;
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
