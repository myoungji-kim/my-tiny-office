"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createCompany } from "../application/company";
import type { AppContext } from "../application/context";
import { hireEmployee } from "../application/employee";
import { assignTask, completeTask, createTask, startTask } from "../application/task";
import { toCompanyId, toEmployeeId, toTaskId } from "../domain/ids";
import type { TaskPriority } from "../domain/task";
import { companyContext, createAppContext } from "../infrastructure/app-context";
import { getCompanyFiles } from "../infrastructure/persistence/company-files";
import { readSettings, writeSettings } from "../infrastructure/persistence/settings";

const MINUTE = 60_000;

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
  return files.has(id) ? companyContext(toCompanyId(id), files) : undefined;
}

function priority(formData: FormData): TaskPriority {
  const value = formData.get("priority");
  return value === "low" || value === "high" ? value : "normal";
}

export async function createCompanyAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const name = text(formData, "name");
  if (name === "") {
    return { error: "companyNameRequired" };
  }

  const files = getCompanyFiles();
  const id = toCompanyId(randomUUID());
  const { company } = await createCompany(createAppContext(files.create(id)), {
    id,
    name,
    description: optionalText(formData, "description"),
  });
  writeSettings(files.directory, { ...readSettings(files.directory), lastCompanyId: company.id });

  revalidatePath("/");
  redirect(`/?company=${encodeURIComponent(company.id)}`);
}

export async function hireEmployeeAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const name = text(formData, "name");
  const role = text(formData, "role");
  if (name === "" || role === "") {
    return { error: "employeeFieldsRequired" };
  }

  const ctx = contextOf(formData);
  if (ctx === undefined) {
    return { error: "companyNotFound" };
  }

  const result = await hireEmployee(ctx, {
    companyId: toCompanyId(text(formData, "companyId")),
    name,
    role,
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
  const title = text(formData, "title");
  if (title === "") {
    return { error: "taskTitleRequired" };
  }

  const ctx = contextOf(formData);
  if (ctx === undefined) {
    return { error: "companyNotFound" };
  }

  const result = await createTask(ctx, {
    companyId: toCompanyId(text(formData, "companyId")),
    title,
    description: optionalText(formData, "description"),
    priority: priority(formData),
    estimatedDuration: Number(formData.get("estimatedMinutes")) * MINUTE,
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

export async function startTaskAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = contextOf(formData);
  if (ctx === undefined) {
    return { error: "companyNotFound" };
  }

  const result = await startTask(ctx, {
    taskId: toTaskId(text(formData, "taskId")),
  });
  if (!result.ok) {
    return { error: result.reason };
  }

  revalidatePath("/");
  return {};
}

export async function completeTaskAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = contextOf(formData);
  if (ctx === undefined) {
    return { error: "companyNotFound" };
  }

  const result = await completeTask(ctx, {
    taskId: toTaskId(text(formData, "taskId")),
  });
  if (!result.ok) {
    return { error: result.reason };
  }

  revalidatePath("/");
  return {};
}
