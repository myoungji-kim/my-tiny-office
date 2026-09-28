"use server";

import { revalidatePath } from "next/cache";

import { renameCompany } from "../application/company";
import { addArea, removeArea, renameArea } from "../application/memory";
import { addRole, removeRole, renameRole } from "../application/organisation";
import { toAreaId, toCompanyId, toRoleId } from "../domain/ids";
import { getCompanyFiles } from "../infrastructure/persistence/company-files";
import { readSettings, writeSettings } from "../infrastructure/persistence/settings";

import { contextFor, inCompany, optional, str, type Outcome } from "./action-context";

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

// Deleting is for good, so the company's name typed out is the confirmation,
// checked here as well as on screen.
export async function deleteCompanyAction(companyId: string, typedName: string): Promise<Outcome> {
  const ctx = contextFor(companyId);
  if (ctx === undefined) return { error: "companyNotFound" };
  const company = await ctx.companies.findById(toCompanyId(companyId));
  if (company === undefined) return { error: "companyNotFound" };
  if (str(typedName).trim() !== company.name) return { error: "nameMismatch" };

  const files = getCompanyFiles();
  files.remove(company.id);
  const next = files.ids()[0];
  writeSettings(files.directory, { ...readSettings(files.directory), lastCompanyId: next });
  revalidatePath("/", "layout");
  return {};
}
