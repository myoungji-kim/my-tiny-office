"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";

import { createCompany } from "../application/company";
import type { AppContext } from "../application/context";
import { bringBack, hireEmployee, sendOnLeave } from "../application/employee";
import { createProject } from "../application/project";
import { isReady, type ClaudeCodeStatus } from "../application/runtime-status";
import { assignTask, createTask } from "../application/task";
import { MAX_COMPANY_NAME } from "../domain/company";
import { MAX_EMPLOYEE_NAME, SPECIES, type Species } from "../domain/employee";
import { toCompanyId, toEmployeeId, toProjectId, toRoleId, toTaskId, toTeamId, type CompanyId } from "../domain/ids";
import { checkName } from "../domain/name";
import type { Priority } from "../domain/project";
import { createAppContext } from "../infrastructure/app-context";
import { getCompanyFiles } from "../infrastructure/persistence/company-files";
import { readSettings, writeSettings } from "../infrastructure/persistence/settings";
import { claudeCodeStatus } from "../infrastructure/runtime/claude-code-status";

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
function contextFor(id: unknown): AppContext | undefined {
  const files = getCompanyFiles();
  return typeof id === "string" && files.has(id) ? createAppContext(files.open(toCompanyId(id))) : undefined;
}

const contextOf = (formData: FormData) => contextFor(text(formData, "companyId"));

const optionalId = (value: unknown) => (typeof value === "string" && value !== "" ? value : undefined);

export interface Outcome {
  readonly error?: string;
}

// The company the screens open next; it stays until another is chosen.
export async function switchCompanyAction(companyId: string): Promise<void> {
  const files = getCompanyFiles();
  if (typeof companyId !== "string" || !files.has(companyId)) return;
  writeSettings(files.directory, { ...readSettings(files.directory), lastCompanyId: companyId });
  revalidatePath("/", "layout");
}

export interface HireInput {
  readonly companyId: string;
  readonly name: string;
  readonly species: string;
  readonly roleId: string;
  readonly teamId: string | undefined;
}

export async function hireAction(input: HireInput): Promise<Outcome> {
  const ctx = contextFor(input.companyId);
  if (ctx === undefined) return { error: "companyNotFound" };
  const species = SPECIES.find((s) => s === input.species);
  if (species === undefined) return { error: "speciesUnknown" };
  const teamId = optionalId(input.teamId);
  const result = await hireEmployee(ctx, {
    companyId: toCompanyId(input.companyId),
    name: String(input.name),
    species,
    roleId: toRoleId(String(input.roleId)),
    teamId: teamId === undefined ? undefined : toTeamId(teamId),
  });
  if (!result.ok) return { error: result.reason };
  revalidatePath("/", "layout");
  return {};
}

export async function sendOnLeaveAction(companyId: string, employeeId: string): Promise<Outcome> {
  const ctx = contextFor(companyId);
  if (ctx === undefined) return { error: "companyNotFound" };
  const result = await sendOnLeave(ctx, toEmployeeId(String(employeeId)));
  if (!result.ok) return { error: result.reason };
  revalidatePath("/", "layout");
  return {};
}

export async function bringBackAction(companyId: string, employeeId: string): Promise<Outcome> {
  const ctx = contextFor(companyId);
  if (ctx === undefined) return { error: "companyNotFound" };
  const result = await bringBack(ctx, toEmployeeId(String(employeeId)));
  if (!result.ok) return { error: result.reason };
  revalidatePath("/", "layout");
  return {};
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

export interface StartCompanyInput {
  readonly companyName: string;
  readonly employeeName: string;
  readonly species: string;
  readonly role: string;
}

export type StartCompanyResult = { readonly error: string } | { readonly companyId: string };

// First run: the company and its first hire, made only once Claude Code is
// ready. Everything is checked before the company's file is made, so a
// refused start leaves nothing behind.
export async function startCompanyAction(input: StartCompanyInput): Promise<StartCompanyResult> {
  if (!isReady(await claudeCodeStatus())) return { error: "claudeCodeNotReady" };
  const company = checkName(String(input.companyName), MAX_COMPANY_NAME);
  if (!company.ok) return { error: company.reason };
  const employee = checkName(String(input.employeeName), MAX_EMPLOYEE_NAME);
  if (!employee.ok) return { error: employee.reason };
  const species = SPECIES.find((s) => s === input.species);
  if (species === undefined) return { error: "speciesUnknown" };

  const files = getCompanyFiles();
  const id = toCompanyId(randomUUID());
  const ctx = createAppContext(files.create(id));
  const created = await createCompany(ctx, { id, name: company.name });
  if (!created.ok) return { error: created.reason };
  const roles = await ctx.roles.findByCompany(id);
  const role = roles.find((r) => r.name === input.role) ?? roles[0];
  const hired = await hireEmployee(ctx, { companyId: id, name: employee.name, species, roleId: role.id });
  if (!hired.ok) return { error: hired.reason };

  // No revalidation here: the wizard still has its arrival to show, and the
  // office loads fresh when the user goes there.
  writeSettings(files.directory, { ...readSettings(files.directory), lastCompanyId: id });
  return { companyId: id };
}

// 다시 확인: asks Claude Code again rather than trusting the last answer.
export async function recheckClaudeCodeAction(): Promise<ClaudeCodeStatus> {
  const status = await claudeCodeStatus({ refresh: true });
  revalidatePath("/");
  return status;
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
