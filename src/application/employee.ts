import * as employeeDomain from "../domain/employee";
import type { DomainEvent } from "../domain/events";
import { toEmployeeId, toEventId, toMemoryId, type AreaId, type CompanyId, type EmployeeId, type RoleId, type TeamId } from "../domain/ids";
import * as memoryDomain from "../domain/memory";
import type { NameFailure } from "../domain/name";
import { releaseReview } from "../domain/review";
import { returnToBacklog } from "../domain/task";

import type { AppContext, UseCaseResult } from "./context";
import { recordMilestones } from "./history";
import { withdrawReviewsOn } from "./review";

export interface HireEmployeeInput {
  readonly companyId: CompanyId;
  readonly name: string;
  readonly species: employeeDomain.Species;
  readonly roleId: RoleId;
  readonly teamId?: TeamId;
  // with experience: the session, and the lines of it the user kept
  readonly career?: employeeDomain.Career;
  readonly brought?: { readonly expertise: readonly { readonly areaId: AreaId; readonly text: string }[]; readonly style: readonly string[] };
}

export type HireEmployeeFailure = "companyNotFound" | "roleNotFound" | "teamNotFound" | "areaNotFound" | NameFailure | memoryDomain.TeachFailure;

type EmployeeResult<TFailure extends string> = UseCaseResult<{ readonly employee: employeeDomain.Employee }, TFailure>;

export function hireEmployee(ctx: AppContext, input: HireEmployeeInput): Promise<EmployeeResult<HireEmployeeFailure>> {
  return ctx.withTransaction(async () => {
    if ((await ctx.companies.findById(input.companyId)) === undefined) return { ok: false, reason: "companyNotFound" };
    if (!(await ctx.roles.findByCompany(input.companyId)).some((r) => r.id === input.roleId)) {
      return { ok: false, reason: "roleNotFound" };
    }
    if (input.teamId !== undefined && !(await ctx.teams.findByCompany(input.companyId)).some((t) => t.id === input.teamId)) {
      return { ok: false, reason: "teamNotFound" };
    }

    const brought = input.brought ?? { expertise: [], style: [] };
    const areas = await ctx.areas.findByCompany(input.companyId);
    if (brought.expertise.some((m) => !areas.some((a) => a.id === m.areaId))) return { ok: false, reason: "areaNotFound" };
    const lines = [
      ...brought.expertise.map((m) => ({ kind: "expertise" as const, areaId: m.areaId, text: m.text.trim() })),
      ...brought.style.map((text) => ({ kind: "style" as const, areaId: undefined, text: text.trim() })),
    ];
    // checked before anyone is hired, so a bad line never leaves half a hire
    if (lines.some((l) => l.text === "")) return { ok: false, reason: "memoryTextRequired" };
    if (lines.some((l) => l.text.length > memoryDomain.MAX_MEMORY_TEXT)) return { ok: false, reason: "memoryTextTooLong" };

    const hired = employeeDomain.hireEmployee({ ...input, id: toEmployeeId(ctx.newId()) }, toEventId(ctx.newId()), ctx.now());
    if (!hired.ok) return hired;
    await ctx.employees.save(hired.employee);

    const events: DomainEvent[] = [...hired.events];
    for (const line of lines) {
      const taught = memoryDomain.teach(
        { id: toMemoryId(ctx.newId()), companyId: input.companyId, employeeId: hired.employee.id, broughtIn: true, ...line },
        toEventId(ctx.newId()),
        ctx.now(),
      );
      if (!taught.ok) return taught;
      await ctx.memories.save(taught.value);
      events.push(...taught.events);
    }
    await recordMilestones(ctx, input.companyId, events);
    return { ok: true, value: { employee: hired.employee }, events };
  });
}

export interface EditEmployeeInput {
  readonly name: string;
  readonly species: employeeDomain.Species;
  readonly roleId: RoleId;
  readonly teamId: TeamId | undefined;
}

export function editEmployee(
  ctx: AppContext,
  employeeId: EmployeeId,
  input: EditEmployeeInput,
): Promise<EmployeeResult<"employeeNotFound" | "roleNotFound" | "teamNotFound" | NameFailure>> {
  return ctx.withTransaction(async () => {
    const employee = await ctx.employees.findById(employeeId);
    if (employee === undefined) return { ok: false, reason: "employeeNotFound" };
    if (!(await ctx.roles.findByCompany(employee.companyId)).some((r) => r.id === input.roleId)) return { ok: false, reason: "roleNotFound" };
    if (input.teamId !== undefined && !(await ctx.teams.findByCompany(employee.companyId)).some((t) => t.id === input.teamId)) {
      return { ok: false, reason: "teamNotFound" };
    }
    const edited = employeeDomain.editEmployee(employee, input);
    if (!edited.ok) return edited;

    const events: DomainEvent[] = [];
    let saved = edited.employee;
    if (input.teamId !== employee.teamId) {
      const moved = employeeDomain.moveToTeam(saved, input.teamId, toEventId(ctx.newId()), ctx.now());
      saved = moved.employee;
      events.push(...moved.events);
    }
    await ctx.employees.save(saved);
    await recordMilestones(ctx, employee.companyId, events);
    return { ok: true, value: { employee: saved }, events };
  });
}

export type LeaveFailure = "employeeNotFound" | "employeeOnLeave" | "employeeNotOnLeave";

// Going on leave returns their work in progress to the backlog for whoever is
// free, and any review they were asked for goes back to be offered again.
export function sendOnLeave(ctx: AppContext, employeeId: EmployeeId): Promise<EmployeeResult<LeaveFailure>> {
  return ctx.withTransaction(async () => {
    const employee = await ctx.employees.findById(employeeId);
    if (employee === undefined) return { ok: false, reason: "employeeNotFound" };
    const now = ctx.now();
    const away = employeeDomain.goOnLeave(employee, toEventId(ctx.newId()), now);
    if (!away.ok) return away;

    const events: DomainEvent[] = [...away.events];
    const returned = [];
    for (const task of await ctx.tasks.findByCompany(employee.companyId)) {
      if (task.assigneeId !== employee.id) continue;
      const back = returnToBacklog(task, toEventId(ctx.newId()), now);
      if (!back.ok) continue;
      await ctx.tasks.save(back.task);
      if (task.status === "working") returned.push(task.id);
      events.push(...back.events);
    }
    events.push(...(await withdrawReviewsOn(ctx, employee.companyId, returned)));

    for (const review of await ctx.reviews.findByCompany(employee.companyId)) {
      if (review.reviewerId !== employee.id) continue;
      const released = releaseReview(review, toEventId(ctx.newId()), now);
      if (!released.ok) continue;
      await ctx.reviews.save(released.review);
      events.push(...released.events);
    }

    await ctx.employees.save(away.employee);
    return { ok: true, value: { employee: away.employee }, events };
  });
}

// Letting someone go returns their work to the backlog, gives back any review
// they were asked for, and what they were taught leaves with them. The
// history keeps their hire and that they left, and their past work keeps
// their name; someone who never worked leaves no trace at all.
export function letGo(ctx: AppContext, employeeId: EmployeeId): Promise<EmployeeResult<"employeeNotFound" | "employeeGone">> {
  return ctx.withTransaction(async () => {
    const employee = await ctx.employees.findById(employeeId);
    if (employee === undefined) return { ok: false, reason: "employeeNotFound" };
    const now = ctx.now();
    const gone = employeeDomain.letGo(employee, toEventId(ctx.newId()), now);
    if (!gone.ok) return gone;

    const events: DomainEvent[] = [];
    const returned = [];
    for (const task of await ctx.tasks.findByCompany(employee.companyId)) {
      // a colleague named to review it is asked no more
      const unnamed = task.reviewerId === employee.id ? { ...task, reviewerId: undefined } : task;
      const back = task.assigneeId === employee.id ? returnToBacklog(unnamed, toEventId(ctx.newId()), now) : undefined;
      if (back?.ok) {
        await ctx.tasks.save(back.task);
        if (task.status === "working") returned.push(task.id);
        events.push(...back.events);
      } else {
        // work waiting on them goes to whoever picks it up next
        const freed = task.assigneeId === employee.id && task.status !== "done" ? { ...unnamed, assigneeId: undefined } : unnamed;
        if (freed !== task) await ctx.tasks.save(freed);
      }
    }
    events.push(...(await withdrawReviewsOn(ctx, employee.companyId, returned)));
    for (const review of await ctx.reviews.findByCompany(employee.companyId)) {
      if (review.reviewerId !== employee.id) continue;
      const released = releaseReview(review, toEventId(ctx.newId()), now);
      if (!released.ok) continue;
      await ctx.reviews.save(released.review);
      events.push(...released.events);
    }
    for (const memory of await ctx.memories.findByCompany(employee.companyId)) {
      if (memory.employeeId === employee.id) await ctx.memories.remove(memory.id);
    }

    const worked = employeeDomain.hasWorked(employee.id, await ctx.agents.findByCompany(employee.companyId), await ctx.runs.findByCompany(employee.companyId));
    const named =
      (await ctx.tasks.findByCompany(employee.companyId)).some((t) => t.assigneeId === employee.id || t.reviewerId === employee.id) ||
      (await ctx.reviews.findByCompany(employee.companyId)).some((r) => r.reviewerId === employee.id);
    if (!worked && !named) {
      await ctx.agents.removeByEmployee(employee.id);
      await ctx.milestones.removeJoined(employee.id);
      await ctx.employees.remove(employee.id);
      return { ok: true, value: { employee: gone.employee }, events };
    }
    await ctx.employees.save(gone.employee);
    await recordMilestones(ctx, employee.companyId, gone.events);
    return { ok: true, value: { employee: gone.employee }, events: [...events, ...gone.events] };
  });
}

export async function bringBack(ctx: AppContext, employeeId: EmployeeId): Promise<EmployeeResult<LeaveFailure>> {
  const employee = await ctx.employees.findById(employeeId);
  if (employee === undefined) return { ok: false, reason: "employeeNotFound" };
  const back = employeeDomain.returnFromLeave(employee, toEventId(ctx.newId()), ctx.now());
  if (!back.ok) return back;
  await ctx.employees.save(back.employee);
  return { ok: true, value: { employee: back.employee }, events: back.events };
}
