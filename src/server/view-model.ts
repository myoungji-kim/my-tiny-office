import type { Company } from "../domain/company";
import { toCompanyId } from "../domain/ids";
import type { Priority, ProjectStatus } from "../domain/project";
import { statusOf, type EmployeeStatus } from "../domain/review";
import { timeTaken, type TaskStatus } from "../domain/task";
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
  readonly status: EmployeeStatus;
  readonly workingOn: string | undefined;
}

export interface RoleView {
  readonly id: string;
  readonly name: string;
}

export interface ProjectView {
  readonly id: string;
  readonly name: string;
  readonly status: ProjectStatus;
  readonly priority: Priority;
}

export interface TaskView {
  readonly id: string;
  readonly projectName: string;
  readonly title: string;
  readonly description: string | undefined;
  readonly status: TaskStatus;
  readonly priority: Priority;
  readonly assigneeId: string | undefined;
  readonly assigneeName: string | undefined;
  readonly minutesTaken: number;
  readonly blocked: boolean;
}

export interface OfficeView {
  readonly companies: readonly CompanyOption[];
  // company files that could not be opened, left untouched
  readonly unreadable: number;
  readonly company:
    | {
        readonly id: string;
        readonly name: string;
        readonly description: string | undefined;
        readonly foundedAt: number;
      }
    | undefined;
  readonly employees: readonly EmployeeView[];
  readonly roles: readonly RoleView[];
  readonly projects: readonly ProjectView[];
  readonly tasks: readonly TaskView[];
}

const empty: OfficeView = {
  companies: [],
  unreadable: 0,
  company: undefined,
  employees: [],
  roles: [],
  projects: [],
  tasks: [],
};

export interface OfficeSource {
  readonly files?: CompanyFiles;
  readonly clock?: () => number;
}

// Every company is a file of its own. One that holds no company yet is
// skipped; one that cannot be opened is counted and left alone, so it never
// keeps the others from opening.
async function listCompanies(files: CompanyFiles): Promise<{ companies: Company[]; unreadable: number }> {
  const companies: Company[] = [];
  let unreadable = 0;
  for (const id of files.ids()) {
    try {
      const company = await createAppContext(files.open(id)).companies.findById(id);
      if (company !== undefined) companies.push(company);
    } catch {
      unreadable += 1;
    }
  }
  return { companies: companies.sort((a, b) => a.foundedAt - b.foundedAt || a.id.localeCompare(b.id)), unreadable };
}

export async function loadOffice(
  selectedCompanyId?: string,
  { files = getCompanyFiles(), clock }: OfficeSource = {},
): Promise<OfficeView> {
  const { companies, unreadable } = await listCompanies(files);
  if (companies.length === 0) {
    return { ...empty, unreadable };
  }

  const byId = (id: string | undefined) =>
    id === undefined ? undefined : companies.find((candidate) => candidate.id === toCompanyId(id));
  const company =
    byId(selectedCompanyId) ?? byId(readSettings(files.directory).lastCompanyId) ?? companies[0];

  const base = createAppContext(files.open(company.id));
  const ctx = clock === undefined ? base : { ...base, now: clock };

  const now = ctx.now();
  const employees = await ctx.employees.findByCompany(company.id);
  const tasks = await ctx.tasks.findByCompany(company.id);
  const projects = await ctx.projects.findByCompany(company.id);
  const roles = await ctx.roles.findByCompany(company.id);
  const reviews = await ctx.reviews.findByCompany(company.id);
  const roleName = new Map(roles.map((role) => [role.id, role.name]));
  const projectName = new Map(projects.map((project) => [project.id, project.name]));

  const nameById = new Map(employees.map((employee) => [employee.id, employee.name]));
  const workingTitleById = new Map(
    tasks
      .filter((task) => task.status === "working" && task.assigneeId !== undefined)
      .map((task) => [task.assigneeId, task.title]),
  );

  return {
    companies: companies.map((candidate) => ({ id: candidate.id, name: candidate.name })),
    unreadable,
    company: {
      id: company.id,
      name: company.name,
      description: company.description,
      foundedAt: company.foundedAt,
    },
    employees: employees.map((employee) => ({
      id: employee.id,
      name: employee.name,
      role: roleName.get(employee.roleId) ?? "",
      status: statusOf(employee, tasks, reviews),
      workingOn: workingTitleById.get(employee.id),
    })),
    roles: roles.map((role) => ({ id: role.id, name: role.name })),
    projects: projects.map((project) => ({
      id: project.id,
      name: project.name,
      status: project.status,
      priority: project.priority,
    })),
    tasks: tasks.map((task) => ({
      id: task.id,
      projectName: projectName.get(task.projectId) ?? "",
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      assigneeId: task.assigneeId,
      assigneeName: task.assigneeId === undefined ? undefined : nameById.get(task.assigneeId),
      minutesTaken: Math.floor(timeTaken(task, now) / 60_000),
      blocked: task.blocker !== undefined,
    })),
  };
}
