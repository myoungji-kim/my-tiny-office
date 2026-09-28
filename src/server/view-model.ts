import type { Company } from "../domain/company";
import { toCompanyId } from "../domain/ids";
import type { Priority, ProjectStatus } from "../domain/project";
import { liveReviews, statusOf, type EmployeeStatus } from "../domain/review";
import type { MemoryKind } from "../domain/memory";
import type { RecordedMilestone } from "../domain/milestone";
import { timeTaken, type Blocker, type TaskStatus } from "../domain/task";
import { createAppContext } from "../infrastructure/app-context";
import { getCompanyFiles, type CompanyFiles } from "../infrastructure/persistence/company-files";
import { readSettings } from "../infrastructure/persistence/settings";

export interface CompanyOption {
  readonly id: string;
  readonly name: string;
}

export interface WorkOnDesk {
  readonly taskId: string;
  readonly title: string;
  readonly minutes: number;
}

export interface EmployeeView {
  readonly id: string;
  readonly name: string;
  readonly species: string;
  readonly role: string;
  readonly roleId: string;
  readonly teamId: string | undefined;
  readonly hiredAt: number;
  readonly status: EmployeeStatus;
  // the task they are working on, or the one they are reviewing
  readonly task: WorkOnDesk | undefined;
  readonly review: WorkOnDesk | undefined;
  readonly lastFinished: string | undefined;
  readonly leaveSince: number | undefined;
  readonly finished: number;
  readonly reviewed: number;
}

export interface AreaView {
  readonly id: string;
  readonly starting: string | undefined;
  readonly name: string | undefined;
}

export interface MemoryView {
  readonly id: string;
  readonly kind: MemoryKind;
  readonly employeeId: string | undefined;
  readonly areaId: string | undefined;
  readonly text: string;
  // the task it was taught from, by title
  readonly source: string | undefined;
  readonly createdAt: number;
}

export interface TeamView {
  readonly id: string;
  readonly suggested: string | undefined;
  readonly name: string | undefined;
}

export interface RoleView {
  readonly id: string;
  readonly name: string;
}

export interface ProjectView {
  readonly id: string;
  readonly name: string;
  readonly description: string | undefined;
  readonly folder: string | undefined;
  readonly commands: readonly string[];
  readonly status: ProjectStatus;
  readonly priority: Priority;
  readonly heldReason: string | undefined;
  readonly startedAt: number | undefined;
  readonly finishedAt: number | undefined;
  // work is written down only in a planned or active project
  readonly takesWork: boolean;
}

export interface TaskView {
  readonly id: string;
  readonly projectId: string;
  readonly projectName: string;
  readonly area: string | undefined;
  readonly title: string;
  readonly description: string | undefined;
  readonly status: TaskStatus;
  readonly priority: Priority;
  readonly assigneeId: string | undefined;
  readonly assigneeName: string | undefined;
  readonly minutesTaken: number;
  readonly blocker: Blocker | undefined;
  readonly heldReason: string | undefined;
  readonly heldWithProject: boolean;
  readonly createdAt: number;
}

export type MilestoneView = RecordedMilestone;

// What the company has done, and how much of it in the last seven days.
export interface CompanyStats {
  readonly tasksDone: number;
  readonly tasksDoneThisWeek: number;
  readonly reviews: number;
  readonly reviewsThisWeek: number;
  readonly memories: number;
  readonly memoriesThisWeek: number;
}

export interface OfficeView {
  // when it was read, so every duration on screen is measured to the same moment
  readonly now: number;
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
  readonly teams: readonly TeamView[];
  readonly areas: readonly AreaView[];
  readonly memories: readonly MemoryView[];
  readonly milestones: readonly MilestoneView[];
  readonly stats: CompanyStats;
  readonly projects: readonly ProjectView[];
  readonly tasks: readonly TaskView[];
}

const empty: Omit<OfficeView, "now"> = {
  companies: [],
  unreadable: 0,
  company: undefined,
  employees: [],
  roles: [],
  teams: [],
  areas: [],
  memories: [],
  milestones: [],
  stats: { tasksDone: 0, tasksDoneThisWeek: 0, reviews: 0, reviewsThisWeek: 0, memories: 0, memoriesThisWeek: 0 },
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
    return { ...empty, now: Date.now(), unreadable };
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
  const teams = await ctx.teams.findByCompany(company.id);
  const areas = await ctx.areas.findByCompany(company.id);
  const memories = await ctx.memories.findByCompany(company.id);
  const milestones = await ctx.milestones.findByCompany(company.id);
  const weekAgo = now - 7 * 24 * 60 * 60_000;
  const within = (at: number | undefined) => at !== undefined && at > weekAgo;
  const applied = tasks.filter((task) => task.status === "done");
  const settled = reviews.filter((review) => review.state === "settled");
  const roleName = new Map(roles.map((role) => [role.id, role.name]));
  const projectName = new Map(projects.map((project) => [project.id, project.name]));

  const nameById = new Map(employees.map((employee) => [employee.id, employee.name]));
  const taskById = new Map(tasks.map((task) => [task.id, task]));
  const minutes = (ms: number) => Math.floor(ms / 60_000);

  const deskOf = (employeeId: string) => {
    const working = tasks.find((task) => task.status === "working" && task.assigneeId === employeeId);
    const reviewing = liveReviews(tasks, reviews).find((r) => r.state === "reviewing" && r.reviewerId === employeeId);
    const reviewed = reviewing === undefined ? undefined : taskById.get(reviewing.taskId);
    const finished = tasks
      .filter((task) => task.assigneeId === employeeId && task.finishedAt !== undefined)
      .sort((a, b) => (b.finishedAt ?? 0) - (a.finishedAt ?? 0))[0];
    return {
      task: working && { taskId: working.id, title: working.title, minutes: minutes(timeTaken(working, now)) },
      review: reviewing && reviewed && { taskId: reviewed.id, title: reviewed.title, minutes: minutes(now - (reviewing.startedAt ?? now)) },
      lastFinished: finished?.title,
    };
  };

  return {
    now,
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
      species: employee.species,
      role: roleName.get(employee.roleId) ?? "",
      roleId: employee.roleId,
      teamId: employee.teamId,
      hiredAt: employee.hiredAt,
      finished: tasks.filter((task) => task.assigneeId === employee.id && task.status === "done").length,
      reviewed: reviews.filter((review) => review.reviewerId === employee.id && review.state === "settled").length,
      status: statusOf(employee, tasks, reviews),
      leaveSince: employee.leaveSince,
      ...deskOf(employee.id),
    })),
    roles: roles.map((role) => ({ id: role.id, name: role.name })),
    teams: teams.map((team) => ({ id: team.id, suggested: team.suggested, name: team.name })),
    areas: areas.map((area) => ({ id: area.id, starting: area.starting, name: area.name })),
    milestones,
    stats: {
      tasksDone: applied.length,
      tasksDoneThisWeek: applied.filter((task) => within(task.appliedAt)).length,
      reviews: settled.length,
      reviewsThisWeek: settled.filter((review) => within(review.settledAt)).length,
      memories: memories.length,
      memoriesThisWeek: memories.filter((memory) => within(memory.createdAt)).length,
    },
    memories: memories.map((memory) => ({
      id: memory.id,
      kind: memory.kind,
      employeeId: memory.employeeId,
      areaId: memory.areaId,
      text: memory.text,
      source: memory.sourceTaskId === undefined ? undefined : taskById.get(memory.sourceTaskId)?.title,
      createdAt: memory.createdAt,
    })),
    projects: projects.map((project) => ({
      id: project.id,
      name: project.name,
      description: project.description,
      folder: project.folder,
      commands: project.commands,
      status: project.status,
      priority: project.priority,
      heldReason: project.heldReason,
      startedAt: project.startedAt,
      finishedAt: project.finishedAt,
      takesWork: project.status === "planned" || project.status === "active",
    })),
    tasks: tasks.map((task) => ({
      id: task.id,
      projectId: task.projectId,
      projectName: projectName.get(task.projectId) ?? "",
      title: task.title,
      area: task.area,
      description: task.description,
      status: task.status,
      priority: task.priority,
      assigneeId: task.assigneeId,
      assigneeName: task.assigneeId === undefined ? undefined : nameById.get(task.assigneeId),
      minutesTaken: Math.floor(timeTaken(task, now) / 60_000),
      blocker: task.blocker,
      heldReason: task.heldReason,
      heldWithProject: task.heldWithProject,
      createdAt: task.createdAt,
    })),
  };
}
