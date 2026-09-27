import * as employeeDomain from "../domain/employee";
import type { DomainEvent } from "../domain/events";
import { toEmployeeId, toEventId, type CompanyId, type EmployeeId } from "../domain/ids";
import { returnToBacklog } from "../domain/task";

import type { AppContext, UseCaseResult } from "./context";

export interface HireEmployeeInput {
  readonly companyId: CompanyId;
  readonly name: string;
  readonly role: string;
}

export type HireEmployeeFailure = "companyNotFound";

export type HireEmployeeResult = UseCaseResult<
  { readonly employee: employeeDomain.Employee },
  HireEmployeeFailure
>;

export async function hireEmployee(
  ctx: AppContext,
  input: HireEmployeeInput,
): Promise<HireEmployeeResult> {
  const now = ctx.now();

  const company = await ctx.companies.findById(input.companyId);
  if (company === undefined) {
    return { ok: false, reason: "companyNotFound" };
  }

  const { employee, events } = employeeDomain.hireEmployee(
    {
      id: toEmployeeId(ctx.newId()),
      companyId: input.companyId,
      name: input.name,
      role: input.role,
    },
    toEventId(ctx.newId()),
    now,
  );

  await ctx.employees.save(employee);

  return { ok: true, value: { employee }, events };
}

export type LeaveFailure = "employeeNotFound" | "employeeOnLeave" | "employeeNotOnLeave";

// Going on leave returns their work in progress to the backlog for whoever is free.
export async function sendOnLeave(
  ctx: AppContext,
  employeeId: EmployeeId,
): Promise<UseCaseResult<{ readonly employee: employeeDomain.Employee }, LeaveFailure>> {
  const employee = await ctx.employees.findById(employeeId);
  if (employee === undefined) return { ok: false, reason: "employeeNotFound" };
  const now = ctx.now();
  const away = employeeDomain.goOnLeave(employee, toEventId(ctx.newId()), now);
  if (!away.ok) return away;

  return ctx.withTransaction(async () => {
    const events: DomainEvent[] = [...away.events];
    for (const task of await ctx.tasks.findByCompany(employee.companyId)) {
      if (task.assigneeId !== employee.id || task.status !== "working") continue;
      const returned = returnToBacklog(task, toEventId(ctx.newId()), now);
      if (!returned.ok) continue;
      await ctx.tasks.save(returned.task);
      events.push(...returned.events);
    }
    await ctx.employees.save(away.employee);
    return { ok: true as const, value: { employee: away.employee }, events };
  });
}

export async function bringBack(
  ctx: AppContext,
  employeeId: EmployeeId,
): Promise<UseCaseResult<{ readonly employee: employeeDomain.Employee }, LeaveFailure>> {
  const employee = await ctx.employees.findById(employeeId);
  if (employee === undefined) return { ok: false, reason: "employeeNotFound" };
  const back = employeeDomain.returnFromLeave(employee, toEventId(ctx.newId()), ctx.now());
  if (!back.ok) return back;
  await ctx.employees.save(back.employee);
  return { ok: true, value: { employee: back.employee }, events: back.events };
}
