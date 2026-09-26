import type { AppContext } from "../application/context";
import { settleDueTasks } from "../application/task";
import type { Availability } from "../domain/employee";
import { toCompanyId } from "../domain/ids";
import { taskProgress, type TaskPriority, type TaskStatus } from "../domain/task";
import { createAppContext } from "../infrastructure/app-context";

export interface CompanyOption {
  readonly id: string;
  readonly name: string;
}

export interface EmployeeView {
  readonly id: string;
  readonly name: string;
  readonly role: string;
  readonly availability: Availability;
  readonly workingOn: string | undefined;
}

export interface TaskView {
  readonly id: string;
  readonly title: string;
  readonly description: string | undefined;
  readonly status: TaskStatus;
  readonly priority: TaskPriority;
  readonly assigneeId: string | undefined;
  readonly assigneeName: string | undefined;
  readonly progress: number;
}

export interface OfficeView {
  readonly companies: readonly CompanyOption[];
  readonly company:
    | {
        readonly id: string;
        readonly name: string;
        readonly description: string | undefined;
        readonly foundedAt: number;
      }
    | undefined;
  readonly employees: readonly EmployeeView[];
  readonly tasks: readonly TaskView[];
}

const empty: OfficeView = {
  companies: [],
  company: undefined,
  employees: [],
  tasks: [],
};

export async function loadOffice(
  selectedCompanyId?: string,
  context?: AppContext,
): Promise<OfficeView> {
  const ctx = context ?? createAppContext();

  const companies = await ctx.companies.findAll();
  if (companies.length === 0) {
    return empty;
  }

  const requested =
    selectedCompanyId === undefined
      ? undefined
      : companies.find((candidate) => candidate.id === toCompanyId(selectedCompanyId));
  const company = requested ?? companies[0];

  await settleDueTasks(ctx, { companyId: company.id });

  const now = ctx.now();
  const employees = await ctx.employees.findByCompany(company.id);
  const tasks = await ctx.tasks.findByCompany(company.id);

  const nameById = new Map(employees.map((employee) => [employee.id, employee.name]));
  const workingTitleById = new Map(
    tasks
      .filter((task) => task.status === "working" && task.assigneeId !== undefined)
      .map((task) => [task.assigneeId, task.title]),
  );

  return {
    companies: companies.map((candidate) => ({ id: candidate.id, name: candidate.name })),
    company: {
      id: company.id,
      name: company.name,
      description: company.description,
      foundedAt: company.foundedAt,
    },
    employees: employees.map((employee) => ({
      id: employee.id,
      name: employee.name,
      role: employee.role,
      availability: employee.availability,
      workingOn: workingTitleById.get(employee.id),
    })),
    tasks: tasks.map((task) => ({
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      assigneeId: task.assigneeId,
      assigneeName: task.assigneeId === undefined ? undefined : nameById.get(task.assigneeId),
      progress: taskProgress(task, now),
    })),
  };
}
