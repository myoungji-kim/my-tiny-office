import type { AreaAdded, AreaRemoved, AreaRenamed, MemoryRemoved, MemoryTaught } from "./events";
import type { AreaId, CompanyId, EmployeeId, EventId, MemoryId, TaskId } from "./ids";
import { checkName, type NameFailure } from "./name";
import type { Timestamp } from "./time";

// The company owns its areas. The seven it starts with are named by the
// dictionary, so they read in either language until the user renames one.
export const STARTING_AREAS = ["architecture", "typeSafety", "database", "security", "localization", "product", "quality"] as const;
export type StartingArea = (typeof STARTING_AREAS)[number];

export interface Area {
  readonly id: AreaId;
  readonly companyId: CompanyId;
  readonly starting: StartingArea | undefined;
  // What the user wrote; for a starting area, only once renamed.
  readonly name: string | undefined;
  readonly createdAt: Timestamp;
}

// 기억 is expert knowledge in an area; 일하는 방식 is how one person works;
// 회사 기억 is what everyone follows. Only the first has an area.
export type MemoryKind = "expertise" | "style" | "company";

export interface Memory {
  readonly id: MemoryId;
  readonly companyId: CompanyId;
  readonly kind: MemoryKind;
  readonly employeeId: EmployeeId | undefined;
  readonly areaId: AreaId | undefined;
  readonly text: string;
  // The task it was taught from; none when it was told directly.
  readonly sourceTaskId: TaskId | undefined;
  readonly createdAt: Timestamp;
}

export const MAX_MEMORY_TEXT = 200;
export const MAX_AREA_NAME = 40;

type Result<TValue, TEvent, TFailure extends string> =
  | { readonly ok: true; readonly value: TValue; readonly events: readonly [TEvent] }
  | { readonly ok: false; readonly reason: TFailure };

export function startingAreas(companyId: CompanyId, ids: readonly AreaId[], now: Timestamp): Area[] {
  // a millisecond apart, so they read back in the order they are listed
  return STARTING_AREAS.map((starting, i) => ({ id: ids[i], companyId, starting, name: undefined, createdAt: now + i }));
}

export function addArea(
  input: { readonly id: AreaId; readonly companyId: CompanyId; readonly name: string },
  eventId: EventId,
  now: Timestamp,
): Result<Area, AreaAdded, NameFailure> {
  const checked = checkName(input.name, MAX_AREA_NAME);
  if (!checked.ok) return checked;
  const name = checked.name;
  const area: Area = { id: input.id, companyId: input.companyId, starting: undefined, name, createdAt: now };
  return { ok: true, value: area, events: [{ eventId, type: "AreaAdded", occurredAt: now, companyId: area.companyId, areaId: area.id, areaName: name }] };
}

// Memory and tasks point at an area by id, so a rename changes nothing else.
export function renameArea(area: Area, raw: string, eventId: EventId, now: Timestamp): Result<Area, AreaRenamed, NameFailure> {
  const checked = checkName(raw, MAX_AREA_NAME);
  if (!checked.ok) return checked;
  const name = checked.name;
  return { ok: true, value: { ...area, name }, events: [{ eventId, type: "AreaRenamed", occurredAt: now, companyId: area.companyId, areaId: area.id, areaName: name }] };
}

// An area that holds memory is removed only once that memory has moved.
export function removeArea(
  area: Area,
  memories: readonly Memory[],
  eventId: EventId,
  now: Timestamp,
): Result<Area, AreaRemoved, "areaHoldsMemory"> {
  if (memories.some((m) => m.areaId === area.id)) return { ok: false, reason: "areaHoldsMemory" };
  return { ok: true, value: area, events: [{ eventId, type: "AreaRemoved", occurredAt: now, companyId: area.companyId, areaId: area.id }] };
}

export interface TeachInput {
  readonly id: MemoryId;
  readonly companyId: CompanyId;
  readonly kind: MemoryKind;
  readonly employeeId?: EmployeeId;
  readonly areaId?: AreaId;
  readonly text: string;
  readonly sourceTaskId?: TaskId;
}

export type TeachFailure = "memoryTextRequired" | "memoryTextTooLong" | "areaRequired" | "areaNotAllowed" | "employeeRequired" | "employeeNotAllowed";

export function teach(input: TeachInput, eventId: EventId, now: Timestamp): Result<Memory, MemoryTaught, TeachFailure> {
  const text = input.text.trim();
  if (text === "") return { ok: false, reason: "memoryTextRequired" };
  if (text.length > MAX_MEMORY_TEXT) return { ok: false, reason: "memoryTextTooLong" };
  if (input.kind === "expertise" && input.areaId === undefined) return { ok: false, reason: "areaRequired" };
  if (input.kind !== "expertise" && input.areaId !== undefined) return { ok: false, reason: "areaNotAllowed" };
  if (input.kind === "company" && input.employeeId !== undefined) return { ok: false, reason: "employeeNotAllowed" };
  if (input.kind !== "company" && input.employeeId === undefined) return { ok: false, reason: "employeeRequired" };

  const memory: Memory = {
    id: input.id,
    companyId: input.companyId,
    kind: input.kind,
    employeeId: input.employeeId,
    areaId: input.areaId,
    text,
    sourceTaskId: input.sourceTaskId,
    createdAt: now,
  };
  return {
    ok: true,
    value: memory,
    events: [{ eventId, type: "MemoryTaught", occurredAt: now, companyId: memory.companyId, memoryId: memory.id, kind: memory.kind, employeeId: memory.employeeId, areaId: memory.areaId }],
  };
}

export function forget(memory: Memory, eventId: EventId, now: Timestamp): MemoryRemoved {
  return { eventId, type: "MemoryRemoved", occurredAt: now, companyId: memory.companyId, memoryId: memory.id, employeeId: memory.employeeId };
}

// Expertise is taught, never assigned: an area is someone's once they have
// been taught something in it, and that is what lets them review it.
export function expertiseOf(employeeId: EmployeeId, memories: readonly Memory[]): Set<AreaId> {
  return new Set(
    memories.flatMap((m) => (m.kind === "expertise" && m.employeeId === employeeId && m.areaId !== undefined ? [m.areaId] : [])),
  );
}

