import { describe, expect, it } from "vitest";

import { hireEmployee } from "./employee";
import { toCompanyId, toEmployeeId, toEventId } from "./ids";

const companyId = toCompanyId("company-1");
const employeeId = toEmployeeId("employee-1");
const eventId = toEventId("event-1");
const now = 1_700_000_000_000;

const input = {
  id: employeeId,
  companyId,
  name: "Min-su",
  role: "Backend Engineer",
};

describe("hireEmployee", () => {
  it("hires an available employee at the given time", () => {
    const { employee } = hireEmployee(input, eventId, now);

    expect(employee).toEqual({
      id: employeeId,
      companyId,
      name: "Min-su",
      role: "Backend Engineer",
      availability: "available",
      leaveSince: undefined,
      hiredAt: now,
    });
  });

  it("emits EmployeeHired", () => {
    const { events } = hireEmployee(input, eventId, now);

    expect(events).toEqual([
      {
        eventId,
        type: "EmployeeHired",
        occurredAt: now,
        companyId,
        employeeId,
        employeeName: "Min-su",
        role: "Backend Engineer",
      },
    ]);
  });
});
