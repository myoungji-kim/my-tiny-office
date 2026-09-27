import { settleDueTasks } from "../application/task";
import type { Company } from "../domain/company";
import type { Availability } from "../domain/employee";
import { toCompanyId } from "../domain/ids";
import { taskProgress, type TaskPriority, type TaskStatus } from "../domain/task";
import { createAppContext } from "../infrastructure/app-context";
import { getCompanyFiles, type CompanyFiles } from "../infrastructure/persistence/company-files";
import { readSettings } from "../infrastructure/persistence/settings";

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

export interface OfficeSource {
  readonly files?: CompanyFiles;
  readonly clock?: () => number;
}

// Every company is a file of its own; a file that holds no company yet is skipped.
async function listCompanies(files: CompanyFiles): Promise<Company[]> {
  const companies: Company[] = [];
  for (const id of files.ids()) {
    const company = await createAppContext(files.open(id)).companies.findById(id);
    if (company !== undefined) companies.push(company);
  }
  return companies.sort((a, b) => a.foundedAt - b.foundedAt);
}

export async function loadOffice(
  selectedCompanyId?: string,
  { files = getCompanyFiles(), clock }: OfficeSource = {},
): Promise<OfficeView> {
  const companies = await listCompanies(files);
  if (companies.length === 0) {
    return empty;
  }

  const byId = (id: string | undefined) =>
    id === undefined ? undefined : companies.find((candidate) => candidate.id === toCompanyId(id));
  const company =
    byId(selectedCompanyId) ?? byId(readSettings(files.directory).lastCompanyId) ?? companies[0];

  const base = createAppContext(files.open(company.id));
  const ctx = clock === undefined ? base : { ...base, now: clock };

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
