"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createCompany } from "../application/company";
import { hireEmployee } from "../application/employee";
import { assignTask, completeTask, createTask, startTask } from "../application/task";
import { toCompanyId, toEmployeeId, toTaskId } from "../domain/ids";
import type { TaskPriority } from "../domain/task";
import { createAppContext } from "../infrastructure/app-context";

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

  const { company } = await createCompany(createAppContext(), {
    name,
    description: optionalText(formData, "description"),
  });

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

  const result = await hireEmployee(createAppContext(), {
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

  const result = await createTask(createAppContext(), {
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
  const result = await assignTask(createAppContext(), {
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
  const result = await startTask(createAppContext(), {
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
  const result = await completeTask(createAppContext(), {
    taskId: toTaskId(text(formData, "taskId")),
  });
  if (!result.ok) {
    return { error: result.reason };
  }

  revalidatePath("/");
  return {};
}
