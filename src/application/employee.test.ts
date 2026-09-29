import { assert, beforeEach, describe, expect, it } from "vitest";

import { toCompanyId, toRoleId, toTeamId } from "../domain/ids";

import { createCompany } from "./company";
import type { AppContext } from "./context";
import { editEmployee, hireEmployee, letGo } from "./employee";
import { teachMemory } from "./memory";
import { createProject, startProject } from "./project";
import { createTask, pickUpWork } from "./task";
import { addTeam } from "./organisation";
import { createTestContext, firstRole } from "./test-context";

const now = 1_700_000_000_000;
const companyId = toCompanyId("c");
let ctx: AppContext;

beforeEach(async () => {
  ctx = createTestContext(() => now);
  await createCompany(ctx, { id: companyId, name: "TinySoft" });
});

describe("editEmployee", () => {
  it("corrects who someone is, and a new team is a move", async () => {
    const roleId = await firstRole(ctx, companyId);
    const hired = await hireEmployee(ctx, { companyId, name: "Min-su", species: "fox", roleId });
    const team = await addTeam(ctx, companyId, { suggested: "backend" });
    assert(hired.ok && team.ok);

    const edited = await editEmployee(ctx, hired.value.employee.id, { name: " Mocha ", species: "cat", roleId, teamId: team.value.team.id });

    assert(edited.ok);
    expect(edited.value.employee).toMatchObject({ name: "Mocha", species: "cat", teamId: team.value.team.id, hiredAt: now });
    expect(edited.events).toMatchObject([{ type: "EmployeeMoved", teamId: team.value.team.id }]);
    await expect(editEmployee(ctx, hired.value.employee.id, { name: " ", species: "cat", roleId, teamId: undefined })).resolves.toEqual({
      ok: false,
      reason: "nameRequired",
    });
  });
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

describe("letGo", () => {
  it("returns their work, takes what they were taught with them, and keeps them only as a name", async () => {
    const roleId = await firstRole(ctx, companyId);
    const mocha = await hireEmployee(ctx, { companyId, name: "모카", species: "cat", roleId });
    const bori = await hireEmployee(ctx, { companyId, name: "보리", species: "cat", roleId });
    assert(mocha.ok && bori.ok);
    const project = await createProject(ctx, { companyId, name: "pay", priority: "normal", folder: "/code/pay" });
    assert(project.ok && (await startProject(ctx, project.value.project.id)).ok);
    const work = await createTask(ctx, { companyId, projectId: project.value.project.id, title: "Paginate", priority: "normal", assigneeId: mocha.value.employee.id, reviewerId: bori.value.employee.id });
    assert(work.ok);
    assert((await pickUpWork(ctx, companyId)).ok);
    assert((await teachMemory(ctx, { companyId, kind: "style", employeeId: mocha.value.employee.id, text: "Small commits" })).ok);
    assert((await teachMemory(ctx, { companyId, kind: "company", text: "Korean first" })).ok);

    assert((await letGo(ctx, mocha.value.employee.id)).ok);
    assert((await letGo(ctx, bori.value.employee.id)).ok);

    await expect(ctx.tasks.findById(work.value.task.id)).resolves.toMatchObject({ status: "backlog", assigneeId: undefined, reviewerId: undefined });
    expect((await ctx.memories.findByCompany(companyId)).map((m) => m.text)).toEqual(["Korean first"]);
    await expect(ctx.employees.findById(mocha.value.employee.id)).resolves.toMatchObject({ name: "모카", availability: "left" });
    await expect(letGo(ctx, mocha.value.employee.id)).resolves.toEqual({ ok: false, reason: "employeeGone" });
    // nobody let go picks work up again
    assert((await pickUpWork(ctx, companyId)).ok);
    await expect(ctx.tasks.findById(work.value.task.id)).resolves.toMatchObject({ status: "backlog" });
  });
});
