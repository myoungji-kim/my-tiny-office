"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createCompany } from "../application/company";
import type { AppContext } from "../application/context";
import { hireEmployee } from "../application/employee";
import { createProject } from "../application/project";
import { assignTask, createTask } from "../application/task";
import { MAX_COMPANY_NAME } from "../domain/company";
import { SPECIES, type Species } from "../domain/employee";
import { toCompanyId, toEmployeeId, toProjectId, toRoleId, toTaskId, type CompanyId } from "../domain/ids";
import { checkName } from "../domain/name";
import type { Priority } from "../domain/project";
import { createAppContext } from "../infrastructure/app-context";
import { getCompanyFiles } from "../infrastructure/persistence/company-files";
import { readSettings, writeSettings } from "../infrastructure/persistence/settings";

export interface ActionState {
  readonly error?: string;
}

function text(formData: FormData, field: string): string {
  const value = formData.get(field);
  return typeof value === "string" ? value.trim() : "";
}

function optionalText(formData: FormData, field: string): string | undefined {
  const value = text(formData, field);
  return value === "" ? undefined : value;
}

// Every action names its company, and only a company that has a file here is opened.
function contextOf(formData: FormData): AppContext | undefined {
  const id = text(formData, "companyId");
  const files = getCompanyFiles();
  return files.has(id) ? createAppContext(files.open(toCompanyId(id))) : undefined;
}

// A hire gets the first sprite nobody in the company has yet.
async function nextSpecies(ctx: AppContext, companyId: CompanyId): Promise<Species> {
  const taken = new Set((await ctx.employees.findByCompany(companyId)).map((e) => e.species));
  return SPECIES.find((s) => !taken.has(s)) ?? SPECIES[0];
}

function priority(formData: FormData): Priority {
  const value = formData.get("priority");
  return value === "low" || value === "high" ? value : "normal";
}

export async function createCompanyAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const name = text(formData, "name");
  // Checked before the company's file is made, so a bad name leaves no file behind.
  const named = checkName(name, MAX_COMPANY_NAME);
  if (!named.ok) {
    return { error: named.reason };
  }

  const files = getCompanyFiles();
  const id = toCompanyId(randomUUID());
  const created = await createCompany(createAppContext(files.create(id)), {
    id,
    name,
    description: optionalText(formData, "description"),
  });
  if (!created.ok) {
    return { error: created.reason };
  }
  writeSettings(files.directory, { ...readSettings(files.directory), lastCompanyId: id });

  revalidatePath("/");
  redirect(`/?company=${encodeURIComponent(id)}`);
}

export async function hireEmployeeAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = contextOf(formData);
  if (ctx === undefined) {
    return { error: "companyNotFound" };
  }

  const result = await hireEmployee(ctx, {
    companyId: toCompanyId(text(formData, "companyId")),
    name: text(formData, "name"),
    roleId: toRoleId(text(formData, "roleId")),
    species: await nextSpecies(ctx, toCompanyId(text(formData, "companyId"))),
  });
  if (!result.ok) {
    return { error: result.reason };
  }

  revalidatePath("/");
  return {};
}

export async function createTaskAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = contextOf(formData);
  if (ctx === undefined) {
    return { error: "companyNotFound" };
  }

  const result = await createTask(ctx, {
    companyId: toCompanyId(text(formData, "companyId")),
    title: text(formData, "title"),
    description: optionalText(formData, "description"),
    projectId: toProjectId(text(formData, "projectId")),
    priority: priority(formData),
  });
  if (!result.ok) {
    return { error: result.reason };
  }

  revalidatePath("/");
  return {};
}

export async function assignTaskAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = contextOf(formData);
  if (ctx === undefined) {
    return { error: "companyNotFound" };
  }

  const result = await assignTask(ctx, {
    taskId: toTaskId(text(formData, "taskId")),
    employeeId: toEmployeeId(text(formData, "employeeId")),
  });
  if (!result.ok) {
    return { error: result.reason };
  }

  revalidatePath("/");
  return {};
}

export async function createProjectAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = contextOf(formData);
  if (ctx === undefined) {
    return { error: "companyNotFound" };
  }

  const result = await createProject(ctx, {
    companyId: toCompanyId(text(formData, "companyId")),
    name: text(formData, "name"),
    priority: priority(formData),
  });
  if (!result.ok) {
    return { error: result.reason };
  }

  revalidatePath("/");
  return {};
}
