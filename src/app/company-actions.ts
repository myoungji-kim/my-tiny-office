"use server";

import { renameCompany } from "../application/company";
import { addArea, removeArea, renameArea } from "../application/memory";
import { addRole, removeRole, renameRole } from "../application/organisation";
import { toAreaId, toRoleId } from "../domain/ids";

import { inCompany, optional, str, type Outcome } from "./action-context";

export async function renameCompanyAction(companyId: string, name: string): Promise<Outcome> {
  return inCompany(companyId, (ctx, id) => renameCompany(ctx, id, str(name)));
}

export async function addAreaAction(companyId: string, name: string): Promise<Outcome> {
  return inCompany(companyId, (ctx, id) => addArea(ctx, id, str(name)));
}

export async function renameAreaAction(companyId: string, areaId: string, name: string): Promise<Outcome> {
  return inCompany(companyId, (ctx, id) => renameArea(ctx, id, toAreaId(str(areaId)), str(name)));
}

export async function removeAreaAction(companyId: string, areaId: string, moveTo: string | undefined): Promise<Outcome> {
  const into = optional(moveTo);
  return inCompany(companyId, (ctx, id) => removeArea(ctx, id, toAreaId(str(areaId)), into === undefined ? undefined : toAreaId(into)));
}

export async function addRoleAction(companyId: string, name: string): Promise<Outcome> {
  return inCompany(companyId, (ctx, id) => addRole(ctx, id, str(name)));
}

export async function renameRoleAction(companyId: string, roleId: string, name: string): Promise<Outcome> {
  return inCompany(companyId, (ctx, id) => renameRole(ctx, id, toRoleId(str(roleId)), str(name)));
}

export async function removeRoleAction(companyId: string, roleId: string, moveTo: string | undefined): Promise<Outcome> {
  const into = optional(moveTo);
  return inCompany(companyId, (ctx, id) => removeRole(ctx, id, toRoleId(str(roleId)), into === undefined ? undefined : toRoleId(into)));
}
