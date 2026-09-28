"use server";

import { bringBack, editEmployee, hireEmployee, sendOnLeave } from "../application/employee";
import { forgetMemory, reviseMemory, teachMemory } from "../application/memory";
import { addTeam, moveEmployee, removeTeam, renameTeam } from "../application/organisation";
import { assignTask, createTask } from "../application/task";
import { SPECIES } from "../domain/employee";
import { toAreaId, toEmployeeId, toMemoryId, toProjectId, toRoleId, toTaskId, toTeamId } from "../domain/ids";

import { inCompany, optional, priorityOf, str, type Outcome } from "./action-context";

const speciesOf = (value: unknown) => SPECIES.find((s) => s === value);
const teamOf = (value: unknown) => {
  const id = optional(value);
  return id === undefined ? undefined : toTeamId(id);
};
const areaOf = (value: unknown) => {
  const id = optional(value);
  return id === undefined ? undefined : toAreaId(id);
};

export interface WhoInput {
  readonly name: string;
  readonly species: string;
  readonly roleId: string;
  readonly teamId: string | undefined;
}

export async function hireAction(companyId: string, input: WhoInput): Promise<Outcome> {
  const species = speciesOf(input.species);
  if (species === undefined) return { error: "speciesUnknown" };
  return inCompany(companyId, (ctx, id) =>
    hireEmployee(ctx, { companyId: id, name: str(input.name), species, roleId: toRoleId(str(input.roleId)), teamId: teamOf(input.teamId) }),
  );
}

export async function editEmployeeAction(companyId: string, employeeId: string, input: WhoInput): Promise<Outcome> {
  const species = speciesOf(input.species);
  if (species === undefined) return { error: "speciesUnknown" };
  return inCompany(companyId, (ctx) =>
    editEmployee(ctx, toEmployeeId(str(employeeId)), { name: str(input.name), species, roleId: toRoleId(str(input.roleId)), teamId: teamOf(input.teamId) }),
  );
}

export async function sendOnLeaveAction(companyId: string, employeeId: string): Promise<Outcome> {
  return inCompany(companyId, (ctx) => sendOnLeave(ctx, toEmployeeId(str(employeeId))));
}

export async function bringBackAction(companyId: string, employeeId: string): Promise<Outcome> {
  return inCompany(companyId, (ctx) => bringBack(ctx, toEmployeeId(str(employeeId))));
}

export async function moveEmployeeAction(companyId: string, employeeId: string, teamId: string | undefined): Promise<Outcome> {
  return inCompany(companyId, (ctx) => moveEmployee(ctx, toEmployeeId(str(employeeId)), teamOf(teamId)));
}

export async function addTeamAction(companyId: string, name: string): Promise<Outcome> {
  return inCompany(companyId, (ctx, id) => addTeam(ctx, id, { name: str(name) }));
}

export async function renameTeamAction(companyId: string, teamId: string, name: string): Promise<Outcome> {
  return inCompany(companyId, (ctx, id) => renameTeam(ctx, id, toTeamId(str(teamId)), str(name)));
}

export async function removeTeamAction(companyId: string, teamId: string, moveTo: string | undefined): Promise<Outcome> {
  return inCompany(companyId, (ctx, id) => removeTeam(ctx, id, toTeamId(str(teamId)), teamOf(moveTo)));
}

export interface TeachInput {
  readonly kind: "expertise" | "style";
  readonly employeeId: string;
  readonly areaId: string | undefined;
  readonly text: string;
  readonly sourceTaskId: string | undefined;
}

export async function teachAction(companyId: string, input: TeachInput): Promise<Outcome> {
  const kind = input.kind === "style" ? "style" : "expertise";
  const source = optional(input.sourceTaskId);
  return inCompany(companyId, (ctx, id) =>
    teachMemory(ctx, {
      companyId: id,
      kind,
      employeeId: toEmployeeId(str(input.employeeId)),
      areaId: kind === "expertise" ? areaOf(input.areaId) : undefined,
      text: str(input.text),
      sourceTaskId: source === undefined ? undefined : toTaskId(source),
    }),
  );
}

export async function reviseMemoryAction(companyId: string, memoryId: string, text: string, areaId: string | undefined): Promise<Outcome> {
  return inCompany(companyId, (ctx, id) => reviseMemory(ctx, id, toMemoryId(str(memoryId)), { text: str(text), areaId: areaOf(areaId) }));
}

export async function forgetMemoryAction(companyId: string, memoryId: string): Promise<Outcome> {
  return inCompany(companyId, (ctx, id) => forgetMemory(ctx, id, toMemoryId(str(memoryId))));
}

export async function assignAction(companyId: string, taskId: string, employeeId: string): Promise<Outcome> {
  return inCompany(companyId, (ctx) => assignTask(ctx, { taskId: toTaskId(str(taskId)), employeeId: toEmployeeId(str(employeeId)) }));
}

export interface NewTaskInput {
  readonly projectId: string;
  readonly title: string;
  readonly description: string;
  readonly areaId: string | undefined;
  readonly priority: string;
}

// A task made for someone goes straight to them.
export async function createForAction(companyId: string, employeeId: string, input: NewTaskInput): Promise<Outcome> {
  return inCompany(companyId, (ctx, id) =>
    createTask(ctx, {
      companyId: id,
      projectId: toProjectId(str(input.projectId)),
      title: str(input.title),
      description: optional(str(input.description).trim()),
      area: areaOf(input.areaId),
      priority: priorityOf(input.priority),
      assigneeId: toEmployeeId(str(employeeId)),
    }),
  );
}
