import { moveToTeam } from "../domain/employee";
import type { DomainEvent } from "../domain/events";
import { toEventId, toRoleId, toTeamId, type CompanyId, type EmployeeId, type RoleId, type TeamId } from "../domain/ids";
import * as org from "../domain/organisation";

import type { AppContext, UseCaseResult } from "./context";
import { recordMilestones } from "./history";

type NameFailure = "nameRequired" | "nameTooLong";

// A title is shown as written, so two alike would be one role on every screen.
async function roleNameTaken(ctx: AppContext, role: org.Role): Promise<boolean> {
  const name = role.name.toLowerCase();
  return (await ctx.roles.findByCompany(role.companyId)).some((r) => r.id !== role.id && r.name.toLowerCase() === name);
}

export async function addRole(ctx: AppContext, companyId: CompanyId, name: string): Promise<UseCaseResult<{ readonly role: org.Role }, NameFailure | "nameTaken">> {
  const made = org.createRole({ id: toRoleId(ctx.newId()), companyId, name }, ctx.now());
  if (!made.ok) return made;
  if (await roleNameTaken(ctx, made.value)) return { ok: false, reason: "nameTaken" };
  await ctx.roles.save(made.value);
  return { ok: true, value: { role: made.value }, events: [] };
}

export async function renameRole(
  ctx: AppContext,
  companyId: CompanyId,
  roleId: RoleId,
  name: string,
): Promise<UseCaseResult<{ readonly role: org.Role }, "roleNotFound" | NameFailure | "nameTaken">> {
  const role = (await ctx.roles.findByCompany(companyId)).find((r) => r.id === roleId);
  if (role === undefined) return { ok: false, reason: "roleNotFound" };
  const renamed = org.renameRole(role, name);
  if (!renamed.ok) return renamed;
  if (await roleNameTaken(ctx, renamed.value)) return { ok: false, reason: "nameTaken" };
  await ctx.roles.save(renamed.value);
  return { ok: true, value: { role: renamed.value }, events: [] };
}

// Removing a role people hold changes them to another first; the last role stays.
export function removeRole(
  ctx: AppContext,
  companyId: CompanyId,
  roleId: RoleId,
  moveTo?: RoleId,
): Promise<UseCaseResult<{ readonly moved: number }, "roleNotFound" | "moveTargetNotFound" | "lastRole" | "roleHeld">> {
  return ctx.withTransaction(async () => {
    const roles = await ctx.roles.findByCompany(companyId);
    if (!roles.some((r) => r.id === roleId)) return { ok: false, reason: "roleNotFound" };
    if (moveTo !== undefined && (moveTo === roleId || !roles.some((r) => r.id === moveTo))) {
      return { ok: false, reason: "moveTargetNotFound" };
    }

    const holders = (await ctx.employees.findByCompany(companyId)).filter((e) => e.roleId === roleId);
    const refused = org.canRemoveRole(roles, holders.length, moveTo !== undefined);
    if (refused !== undefined) return { ok: false, reason: refused };
    if (moveTo !== undefined) {
      for (const employee of holders) await ctx.employees.save({ ...employee, roleId: moveTo });
    }
    await ctx.roles.remove(roleId);
    return { ok: true, value: { moved: holders.length }, events: [] };
  });
}

// Two teams the user named the same would be one team on every screen.
async function teamNameTaken(ctx: AppContext, team: org.Team): Promise<boolean> {
  return (
    team.name !== undefined &&
    (await ctx.teams.findByCompany(team.companyId)).some((t) => t.id !== team.id && t.name?.toLowerCase() === team.name?.toLowerCase())
  );
}

export async function addTeam(
  ctx: AppContext,
  companyId: CompanyId,
  team: { readonly suggested: org.SuggestedTeam } | { readonly name: string },
): Promise<UseCaseResult<{ readonly team: org.Team }, NameFailure | "nameTaken">> {
  const made = org.createTeam({ id: toTeamId(ctx.newId()), companyId, ...team }, ctx.now());
  if (!made.ok) return made;
  if (await teamNameTaken(ctx, made.value)) return { ok: false, reason: "nameTaken" };
  await ctx.teams.save(made.value);
  return { ok: true, value: { team: made.value }, events: [] };
}

export async function renameTeam(
  ctx: AppContext,
  companyId: CompanyId,
  teamId: TeamId,
  name: string,
): Promise<UseCaseResult<{ readonly team: org.Team }, "teamNotFound" | NameFailure | "nameTaken">> {
  const team = (await ctx.teams.findByCompany(companyId)).find((t) => t.id === teamId);
  if (team === undefined) return { ok: false, reason: "teamNotFound" };
  const renamed = org.renameTeam(team, name);
  if (!renamed.ok) return renamed;
  if (await teamNameTaken(ctx, renamed.value)) return { ok: false, reason: "nameTaken" };
  await ctx.teams.save(renamed.value);
  return { ok: true, value: { team: renamed.value }, events: [] };
}

// Removing a team moves its people to another team, or to none.
export function removeTeam(
  ctx: AppContext,
  companyId: CompanyId,
  teamId: TeamId,
  moveTo?: TeamId,
): Promise<UseCaseResult<{ readonly moved: number }, "teamNotFound" | "moveTargetNotFound">> {
  return ctx.withTransaction(async () => {
    const teams = await ctx.teams.findByCompany(companyId);
    if (!teams.some((t) => t.id === teamId)) return { ok: false, reason: "teamNotFound" };
    if (moveTo !== undefined && (moveTo === teamId || !teams.some((t) => t.id === moveTo))) {
      return { ok: false, reason: "moveTargetNotFound" };
    }

    const events: DomainEvent[] = [];
    const members = (await ctx.employees.findByCompany(companyId)).filter((e) => e.teamId === teamId);
    for (const employee of members) {
      const moved = moveToTeam(employee, moveTo, toEventId(ctx.newId()), ctx.now());
      await ctx.employees.save(moved.employee);
      events.push(...moved.events);
    }
    await ctx.teams.remove(teamId);
    await recordMilestones(ctx, companyId, events);
    return { ok: true, value: { moved: members.length }, events };
  });
}

export function moveEmployee(
  ctx: AppContext,
  employeeId: EmployeeId,
  teamId: TeamId | undefined,
): Promise<UseCaseResult<{ readonly employeeId: EmployeeId }, "employeeNotFound" | "teamNotFound">> {
  return ctx.withTransaction(async () => {
    const employee = await ctx.employees.findById(employeeId);
    if (employee === undefined) return { ok: false, reason: "employeeNotFound" };
    if (teamId !== undefined && !(await ctx.teams.findByCompany(employee.companyId)).some((t) => t.id === teamId)) {
      return { ok: false, reason: "teamNotFound" };
    }
    const moved = moveToTeam(employee, teamId, toEventId(ctx.newId()), ctx.now());
    await ctx.employees.save(moved.employee);
    await recordMilestones(ctx, employee.companyId, moved.events);
    return { ok: true, value: { employeeId }, events: moved.events };
  });
}
