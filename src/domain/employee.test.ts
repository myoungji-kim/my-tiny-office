import { assert, describe, expect, it } from "vitest";

import { goOnLeave, hireEmployee, isSpecies, moveToTeam, returnFromLeave, SPECIES } from "./employee";
import { toCompanyId, toEmployeeId, toEventId, toRoleId, toTeamId } from "./ids";

const now = 1_700_000_000_000;
const input = {
  id: toEmployeeId("mocha"),
  companyId: toCompanyId("c"),
  name: " 모카 ",
  species: "cat" as const,
  roleId: toRoleId("backend"),
};

function hired() {
  const result = hireEmployee(input, toEventId("e"), now);
  assert(result.ok);
  return result;
}

describe("hireEmployee", () => {
  it("starts available with no team, a sprite and a role", () => {
    expect(hired().employee).toEqual({
      id: input.id,
      companyId: input.companyId,
      name: "모카",
      species: "cat",
      roleId: input.roleId,
      teamId: undefined,
      availability: "available",
      leaveSince: undefined,
      hiredAt: now,
    });
    expect(hired().events).toMatchObject([{ type: "EmployeeHired", employeeName: "모카", roleId: "backend", teamId: undefined }]);
  });

  it("needs a name the user wrote, of a sensible length", () => {
    expect(hireEmployee({ ...input, name: "  " }, toEventId("e"), now)).toEqual({ ok: false, reason: "employeeNameRequired" });
    expect(hireEmployee({ ...input, name: "가".repeat(21) }, toEventId("e"), now)).toEqual({ ok: false, reason: "employeeNameTooLong" });
  });

  it("knows the twenty species and nothing else", () => {
    expect(SPECIES).toHaveLength(20);
    expect(isSpecies("frog")).toBe(true);
    expect(isSpecies("dragon")).toBe(false);
  });
});

describe("leave", () => {
  it("keeps since when, and ends when they are brought back", () => {
    const away = goOnLeave(hired().employee, toEventId("e"), now + 5);
    assert(away.ok);
    expect(away.employee).toMatchObject({ availability: "onLeave", leaveSince: now + 5 });
    expect(goOnLeave(away.employee, toEventId("e"), now)).toEqual({ ok: false, reason: "employeeOnLeave" });

    const back = returnFromLeave(away.employee, toEventId("e"), now + 9);
    assert(back.ok);
    expect(back.employee).toMatchObject({ availability: "available", leaveSince: undefined });
  });
});

describe("moveToTeam", () => {
  it("puts someone on a team, or on none", () => {
    const joined = moveToTeam(hired().employee, toTeamId("backend"), toEventId("e"), now);
    expect(joined.employee.teamId).toBe("backend");
    expect(moveToTeam(joined.employee, undefined, toEventId("e"), now).employee.teamId).toBeUndefined();
  });
});
