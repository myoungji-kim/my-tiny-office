import { assert, beforeEach, describe, expect, it } from "vitest";

import { toCompanyId } from "../domain/ids";
import { STARTING_ROLES } from "../domain/organisation";

import { createCompany } from "./company";
import type { AppContext } from "./context";
import { hireEmployee } from "./employee";
import { addRole, addTeam, moveEmployee, removeRole, removeTeam, renameRole, renameTeam } from "./organisation";
import { createTestContext, firstRole } from "./test-context";

const companyId = toCompanyId("c");
let ctx: AppContext;

beforeEach(async () => {
  ctx = createTestContext();
  await createCompany(ctx, { id: companyId, name: "TinySoft" });
});

async function hire(name: string) {
  const hired = await hireEmployee(ctx, { companyId, name, species: "cat", roleId: await firstRole(ctx, companyId) });
  assert(hired.ok);
  return hired.value.employee;
}

describe("roles", () => {
  it("start as the company's six titles, and no teams", async () => {
    expect((await ctx.roles.findByCompany(companyId)).map((r) => r.name)).toEqual([...STARTING_ROLES]);
    await expect(ctx.teams.findByCompany(companyId)).resolves.toEqual([]);
  });

  it("are added and renamed as written", async () => {
    const added = await addRole(ctx, companyId, " Staff Engineer ");
    assert(added.ok);
    const renamed = await renameRole(ctx, companyId, added.value.role.id, "Principal Engineer");
    assert(renamed.ok);

    expect(renamed.value.role.name).toBe("Principal Engineer");
  });

  it("move their holders before going, and the last one stays", async () => {
    const mocha = await hire("모카");
    const roles = await ctx.roles.findByCompany(companyId);

    await expect(removeRole(ctx, companyId, mocha.roleId)).resolves.toMatchObject({ reason: "roleHeld" });
    const removed = await removeRole(ctx, companyId, mocha.roleId, roles[1].id);
    assert(removed.ok);
    await expect(ctx.employees.findById(mocha.id)).resolves.toMatchObject({ roleId: roles[1].id });

    for (const role of (await ctx.roles.findByCompany(companyId)).slice(0, -1)) {
      const left = await ctx.roles.findByCompany(companyId);
      await removeRole(ctx, companyId, role.id, left.find((r) => r.id !== role.id)!.id);
    }
    const last = await ctx.roles.findByCompany(companyId);
    expect(last).toHaveLength(1);
    await expect(removeRole(ctx, companyId, last[0].id)).resolves.toMatchObject({ reason: "lastRole" });
  });
});

describe("teams", () => {
  it("are suggested in both languages or named by the user", async () => {
    const suggested = await addTeam(ctx, companyId, { suggested: "backend" });
    const named = await addTeam(ctx, companyId, { name: "게임 서버팀" });
    assert(suggested.ok && named.ok);
    expect(suggested.value.team).toMatchObject({ suggested: "backend", name: undefined });

    const renamed = await renameTeam(ctx, companyId, suggested.value.team.id, "서버팀");
    assert(renamed.ok);
    expect(renamed.value.team).toMatchObject({ suggested: "backend", name: "서버팀" });
  });

  it("never share a name the user gave", async () => {
    const payments = await addTeam(ctx, companyId, { name: "Payments" });
    const games = await addTeam(ctx, companyId, { name: "Games" });
    assert(payments.ok && games.ok);

    await expect(addTeam(ctx, companyId, { name: "payments" })).resolves.toEqual({ ok: false, reason: "nameTaken" });
    await expect(renameTeam(ctx, companyId, games.value.team.id, "PAYMENTS")).resolves.toEqual({ ok: false, reason: "nameTaken" });
    await expect(renameTeam(ctx, companyId, payments.value.team.id, "Payments")).resolves.toMatchObject({ ok: true });
  });

  it("move their people to another team or to none when removed", async () => {
    const backend = await addTeam(ctx, companyId, { suggested: "backend" });
    const frontend = await addTeam(ctx, companyId, { suggested: "frontend" });
    assert(backend.ok && frontend.ok);
    const mocha = await hire("모카");
    const tofu = await hire("두부");
    assert((await moveEmployee(ctx, mocha.id, backend.value.team.id)).ok);
    assert((await moveEmployee(ctx, tofu.id, frontend.value.team.id)).ok);

    const intoFrontend = await removeTeam(ctx, companyId, backend.value.team.id, frontend.value.team.id);
    assert(intoFrontend.ok);
    await expect(ctx.employees.findById(mocha.id)).resolves.toMatchObject({ teamId: frontend.value.team.id });

    const intoNone = await removeTeam(ctx, companyId, frontend.value.team.id);
    assert(intoNone.ok);
    expect(intoNone.value.moved).toBe(2);
    await expect(ctx.employees.findByCompany(companyId)).resolves.toMatchObject([{ teamId: undefined }, { teamId: undefined }]);
  });
});
