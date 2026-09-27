import { assert, beforeEach, describe, expect, it } from "vitest";

import { toCompanyId, toRoleId, toTeamId } from "../domain/ids";

import { createCompany } from "./company";
import type { AppContext } from "./context";
import { hireEmployee } from "./employee";
import { createTestContext, firstRole } from "./test-context";

const now = 1_700_000_000_000;
const companyId = toCompanyId("c");
let ctx: AppContext;

beforeEach(async () => {
  ctx = createTestContext(() => now);
  await createCompany(ctx, { id: companyId, name: "TinySoft" });
});

describe("hireEmployee", () => {
  it("hires someone available, on no team, into the company", async () => {
    const roleId = await firstRole(ctx, companyId);

    const result = await hireEmployee(ctx, { companyId, name: "Min-su", species: "fox", roleId });

    assert(result.ok);
    expect(result.value.employee).toMatchObject({ name: "Min-su", species: "fox", roleId, teamId: undefined, availability: "available", hiredAt: now });
    await expect(ctx.employees.findById(result.value.employee.id)).resolves.toEqual(result.value.employee);
    expect(result.events).toMatchObject([{ type: "EmployeeHired", employeeName: "Min-su", roleId }]);
  });

  it("takes only a role and team the company has", async () => {
    const roleId = await firstRole(ctx, companyId);

    await expect(hireEmployee(ctx, { companyId, name: "a", species: "cat", roleId: toRoleId("nope") })).resolves.toEqual({
      ok: false,
      reason: "roleNotFound",
    });
    await expect(hireEmployee(ctx, { companyId, name: "a", species: "cat", roleId, teamId: toTeamId("nope") })).resolves.toEqual({
      ok: false,
      reason: "teamNotFound",
    });
  });

  it("refuses a company that does not exist", async () => {
    const result = await hireEmployee(ctx, { companyId: toCompanyId("missing"), name: "Min-su", species: "cat", roleId: toRoleId("r") });

    expect(result).toEqual({ ok: false, reason: "companyNotFound" });
  });
});
