import * as employeeDomain from "../domain/employee";
import type { DomainEvent } from "../domain/events";
import { toEmployeeId, toEventId, type CompanyId, type EmployeeId, type RoleId, type TeamId } from "../domain/ids";
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
}

export type HireEmployeeFailure = "companyNotFound" | "roleNotFound" | "teamNotFound" | NameFailure;

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

    const hired = employeeDomain.hireEmployee({ ...input, id: toEmployeeId(ctx.newId()) }, toEventId(ctx.newId()), ctx.now());
    if (!hired.ok) return hired;

    await ctx.employees.save(hired.employee);
    await recordMilestones(ctx, input.companyId, hired.events);
    return { ok: true, value: { employee: hired.employee }, events: hired.events };
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

export async function bringBack(ctx: AppContext, employeeId: EmployeeId): Promise<EmployeeResult<LeaveFailure>> {
  const employee = await ctx.employees.findById(employeeId);
  if (employee === undefined) return { ok: false, reason: "employeeNotFound" };
  const back = employeeDomain.returnFromLeave(employee, toEventId(ctx.newId()), ctx.now());
  if (!back.ok) return back;
  await ctx.employees.save(back.employee);
  return { ok: true, value: { employee: back.employee }, events: back.events };
}
