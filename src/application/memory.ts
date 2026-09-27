import { toAreaId, toEventId, toMemoryId, type AreaId, type CompanyId, type EmployeeId, type MemoryId, type TaskId } from "../domain/ids";
import * as memoryDomain from "../domain/memory";
import type { NameFailure } from "../domain/name";

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
export function teachMemory(
  ctx: AppContext,
  input: TeachInput,
): Promise<UseCaseResult<{ readonly memory: memoryDomain.Memory }, "employeeNotFound" | "areaNotFound" | "taskNotFound" | memoryDomain.TeachFailure>> {
  return ctx.withTransaction(async () => {
    if (input.employeeId !== undefined) {
      const employee = await ctx.employees.findById(input.employeeId);
      if (employee === undefined || employee.companyId !== input.companyId) return { ok: false, reason: "employeeNotFound" };
    }
    if (input.areaId !== undefined && !(await ctx.areas.findByCompany(input.companyId)).some((a) => a.id === input.areaId)) {
      return { ok: false, reason: "areaNotFound" };
    }
    if (input.sourceTaskId !== undefined && (await ctx.tasks.findById(input.sourceTaskId))?.companyId !== input.companyId) {
      return { ok: false, reason: "taskNotFound" };
    }
    const taught = memoryDomain.teach({ ...input, id: toMemoryId(ctx.newId()) }, toEventId(ctx.newId()), ctx.now());
    if (!taught.ok) return taught;
    await ctx.memories.save(taught.value);
    await recordMilestones(ctx, input.companyId, taught.events);
    return { ok: true, value: { memory: taught.value }, events: taught.events };
  });
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
): Promise<UseCaseResult<{ readonly area: memoryDomain.Area }, NameFailure>> {
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
): Promise<UseCaseResult<{ readonly area: memoryDomain.Area }, "areaNotFound" | NameFailure>> {
  const area = (await ctx.areas.findByCompany(companyId)).find((a) => a.id === areaId);
  if (area === undefined) return { ok: false, reason: "areaNotFound" };
  const renamed = memoryDomain.renameArea(area, name, toEventId(ctx.newId()), ctx.now());
  if (!renamed.ok) return renamed;
  await ctx.areas.save(renamed.value);
  return { ok: true, value: { area: renamed.value }, events: renamed.events };
}

// Removing an area that holds memory moves that memory, and the tasks that
// name it, to another area first; with nowhere to move, it stays.
export function removeArea(
  ctx: AppContext,
  companyId: CompanyId,
  areaId: AreaId,
  moveTo?: AreaId,
): Promise<UseCaseResult<{ readonly moved: number }, "areaNotFound" | "moveTargetNotFound" | "areaHoldsMemory">> {
  return ctx.withTransaction(async () => {
    const areas = await ctx.areas.findByCompany(companyId);
    const area = areas.find((a) => a.id === areaId);
    if (area === undefined) return { ok: false, reason: "areaNotFound" };
    if (moveTo !== undefined && (moveTo === areaId || !areas.some((a) => a.id === moveTo))) {
      return { ok: false, reason: "moveTargetNotFound" };
    }

    const memories = await ctx.memories.findByCompany(companyId);
    const moved = memories.map((m) => (m.areaId === areaId && moveTo !== undefined ? { ...m, areaId: moveTo } : m));
    const removed = memoryDomain.removeArea(area, moved, toEventId(ctx.newId()), ctx.now());
    if (!removed.ok) return removed;

    const inArea = memories.filter((m) => m.areaId === areaId);
    for (const memory of inArea) await ctx.memories.save({ ...memory, areaId: moveTo });
    for (const task of await ctx.tasks.findByCompany(companyId)) {
      if (task.area === areaId) await ctx.tasks.save({ ...task, area: moveTo });
    }
    await ctx.areas.remove(area.id);
    return { ok: true, value: { moved: inArea.length }, events: removed.events };
  });
}
