"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";

import { createCompany } from "../application/company";
import { hireEmployee } from "../application/employee";
import { isReady, type ClaudeCodeStatus } from "../application/runtime-status";
import { MAX_COMPANY_NAME } from "../domain/company";
import { MAX_EMPLOYEE_NAME, SPECIES } from "../domain/employee";
import { toCompanyId } from "../domain/ids";
import { checkName } from "../domain/name";
import { createAppContext } from "../infrastructure/app-context";
import { getCompanyFiles } from "../infrastructure/persistence/company-files";
import { readSettings, writeSettings } from "../infrastructure/persistence/settings";
import { claudeCodeStatus } from "../infrastructure/runtime/claude-code-status";
import { getWork } from "../infrastructure/work";

// The company the screens open next; it stays until another is chosen.
export async function switchCompanyAction(companyId: string): Promise<void> {
  const files = getCompanyFiles();
  if (typeof companyId !== "string" || !files.has(companyId)) return;
  writeSettings(files.directory, { ...readSettings(files.directory), lastCompanyId: companyId });
  revalidatePath("/", "layout");
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

export async function setLocaleAction(locale: string): Promise<void> {
  if (locale !== "ko" && locale !== "en") return;
  const files = getCompanyFiles();
  writeSettings(files.directory, { ...readSettings(files.directory), locale });
  revalidatePath("/", "layout");
}

// Pausing stops anyone taking new work on this computer; resuming lets them again at once.
export async function setWorkPausedAction(paused: boolean): Promise<void> {
  const files = getCompanyFiles();
  writeSettings(files.directory, { ...readSettings(files.directory), workPaused: paused === true || undefined });
  void getWork().kick();
  revalidatePath("/", "layout");
}

// 다시 확인: asks Claude Code again rather than trusting the last answer.
export async function recheckClaudeCodeAction(): Promise<ClaudeCodeStatus> {
  const status = await claudeCodeStatus({ refresh: true });
  revalidatePath("/", "layout");
  return status;
}
