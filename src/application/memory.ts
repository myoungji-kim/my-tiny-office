import type { DomainEvent } from "../domain/events";
import { toAreaId, toEventId, toMemoryId, type AreaId, type CompanyId, type EmployeeId, type MemoryId, type TaskId } from "../domain/ids";
import * as memoryDomain from "../domain/memory";

import type { AppContext, UseCaseResult } from "./context";
import { recordMilestones } from "./history";

export interface TeachInput {
  readonly companyId: CompanyId;
  readonly kind: memoryDomain.MemoryKind;
  readonly employeeId?: EmployeeId;
  readonly areaId?: AreaId;
  readonly text: string;
  readonly sourceTaskId?: TaskId;
}

// Teaching is not work: someone on leave can be taught too, and carries it
// from the first task after they are back.
export async function teachMemory(
  ctx: AppContext,
  input: TeachInput,
): Promise<UseCaseResult<{ readonly memory: memoryDomain.Memory }, "employeeNotFound" | "areaNotFound" | memoryDomain.TeachFailure>> {
  if (input.employeeId !== undefined) {
    const employee = await ctx.employees.findById(input.employeeId);
    if (employee === undefined || employee.companyId !== input.companyId) return { ok: false, reason: "employeeNotFound" };
  }
  if (input.areaId !== undefined) {
    const known = (await ctx.areas.findByCompany(input.companyId)).some((a) => a.id === input.areaId);
    if (!known) return { ok: false, reason: "areaNotFound" };
  }
  const taught = memoryDomain.teach({ ...input, id: toMemoryId(ctx.newId()) }, toEventId(ctx.newId()), ctx.now());
  if (!taught.ok) return taught;
  await ctx.memories.save(taught.value);
  await recordMilestones(ctx, input.companyId, taught.events);
  return { ok: true, value: { memory: taught.value }, events: taught.events };
}

// A memory that stops being used is corrected or deleted; there is no archive.
export async function forgetMemory(
  ctx: AppContext,
  companyId: CompanyId,
  memoryId: MemoryId,
): Promise<UseCaseResult<{ readonly memory: memoryDomain.Memory }, "memoryNotFound">> {
  const memory = (await ctx.memories.findByCompany(companyId)).find((m) => m.id === memoryId);
  if (memory === undefined) return { ok: false, reason: "memoryNotFound" };
  const event = memoryDomain.forget(memory, toEventId(ctx.newId()), ctx.now());
  await ctx.memories.remove(memory.id);
  return { ok: true, value: { memory }, events: [event] };
}

export async function addArea(
  ctx: AppContext,
  companyId: CompanyId,
  name: string,
): Promise<UseCaseResult<{ readonly area: memoryDomain.Area }, "areaNameRequired" | "areaNameTooLong">> {
  const added = memoryDomain.addArea({ id: toAreaId(ctx.newId()), companyId, name }, toEventId(ctx.newId()), ctx.now());
  if (!added.ok) return added;
  await ctx.areas.save(added.value);
  return { ok: true, value: { area: added.value }, events: added.events };
}

export async function renameArea(
  ctx: AppContext,
  companyId: CompanyId,
  areaId: AreaId,
  name: string,
): Promise<UseCaseResult<{ readonly area: memoryDomain.Area }, "areaNotFound" | "areaNameRequired" | "areaNameTooLong">> {
  const area = (await ctx.areas.findByCompany(companyId)).find((a) => a.id === areaId);
  if (area === undefined) return { ok: false, reason: "areaNotFound" };
  const renamed = memoryDomain.renameArea(area, name, toEventId(ctx.newId()), ctx.now());
  if (!renamed.ok) return renamed;
  await ctx.areas.save(renamed.value);
  return { ok: true, value: { area: renamed.value }, events: renamed.events };
}

// Removing an area that holds memory moves that memory, and the tasks that
// name it, to another area first.
export async function removeArea(
  ctx: AppContext,
  companyId: CompanyId,
  areaId: AreaId,
  moveTo?: AreaId,
): Promise<UseCaseResult<{ readonly moved: number }, "areaNotFound" | "moveTargetNotFound" | "areaHoldsMemory">> {
  const areas = await ctx.areas.findByCompany(companyId);
  const area = areas.find((a) => a.id === areaId);
  if (area === undefined) return { ok: false, reason: "areaNotFound" };
  if (moveTo !== undefined && (moveTo === areaId || !areas.some((a) => a.id === moveTo))) {
    return { ok: false, reason: "moveTargetNotFound" };
  }

  return ctx.withTransaction(async () => {
    const memories = await ctx.memories.findByCompany(companyId);
    const inArea = memories.filter((m) => m.areaId === areaId);
    if (inArea.length > 0 && moveTo === undefined) return { ok: false as const, reason: "areaHoldsMemory" as const };

    for (const memory of inArea) await ctx.memories.save({ ...memory, areaId: moveTo });
    for (const task of await ctx.tasks.findByCompany(companyId)) {
      if (task.area === areaId) await ctx.tasks.save({ ...task, area: moveTo });
    }
    const events: DomainEvent[] = [];
    const removed = memoryDomain.removeArea(area, [], toEventId(ctx.newId()), ctx.now());
    if (removed.ok) events.push(...removed.events);
    await ctx.areas.remove(area.id);
    return { ok: true as const, value: { moved: inArea.length }, events };
  });
}
