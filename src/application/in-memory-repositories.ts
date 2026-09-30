import type { Company } from "../domain/company";
import type { Employee } from "../domain/employee";
import type { AgentId, AreaId, CompanyId, EmployeeId, MemoryId, ProjectId, ReviewId, RoleId, TaskId, TeamId } from "../domain/ids";
import type { RecordedMilestone } from "../domain/milestone";
import type { Review } from "../domain/review";
import type { Area, Memory } from "../domain/memory";
import type { Role, Team } from "../domain/organisation";
import type { Project } from "../domain/project";
import type { Agent, Run, RunStep } from "../domain/run";
import type { Task, TaskRequest } from "../domain/task";

import type { TransactionRunner } from "./context";
import type {
  AgentRepository,
  AreaRepository,
  CompanyRepository,
  EmployeeRepository,
  MemoryRepository,
  MilestoneRepository,
  ProjectRepository,
  ReviewRepository,
  RoleRepository,
  RunRepository,
  RunStepRepository,
  TaskRepository,
  TaskRequestRepository,
  TeamRepository,
} from "./repositories";

export const withoutTransaction: TransactionRunner = (work) => work();

export function createInMemoryCompanyRepository(): CompanyRepository {
  const companies = new Map<CompanyId, Company>();

  return {
    async findById(id) {
      return companies.get(id);
    },
    async save(company) {
      companies.set(company.id, company);
    },
  };
}

export function createInMemoryEmployeeRepository(): EmployeeRepository {
  const employees = new Map<EmployeeId, Employee>();

  return {
    async findById(id) {
      return employees.get(id);
    },
    async findByCompany(companyId) {
      return [...employees.values()]
        .filter((employee) => employee.companyId === companyId)
        .sort((a, b) => a.hiredAt - b.hiredAt);
    },
    async save(employee) {
      employees.set(employee.id, employee);
    },
    async remove(id) {
      employees.delete(id);
    },
  };
}

function createInMemoryList<TId extends string, TItem extends { readonly id: TId; readonly companyId: CompanyId; readonly createdAt: number }>() {
  const items = new Map<TId, TItem>();
  return {
    async findById(id: TId) {
      return items.get(id);
    },
    async findByCompany(companyId: CompanyId) {
      return [...items.values()]
        .filter((item) => item.companyId === companyId)
        .sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));
    },
    async save(item: TItem) {
      items.set(item.id, item);
    },
    async remove(id: TId) {
      items.delete(id);
    },
    async removeWhere(gone: (item: TItem) => boolean) {
      for (const [id, item] of items) if (gone(item)) items.delete(id);
    },
  };
}

export const createInMemoryProjectRepository = (): ProjectRepository => createInMemoryList<ProjectId, Project>();
export const createInMemoryTaskRepository = (): TaskRepository => createInMemoryList<TaskId, Task>();
export const createInMemoryAreaRepository = (): AreaRepository => createInMemoryList<AreaId, Area>();
export const createInMemoryMemoryRepository = (): MemoryRepository => createInMemoryList<MemoryId, Memory>();
export const createInMemoryRoleRepository = (): RoleRepository => createInMemoryList<RoleId, Role>();
export const createInMemoryTeamRepository = (): TeamRepository => createInMemoryList<TeamId, Team>();
export function createInMemoryReviewRepository(): ReviewRepository {
  const list = createInMemoryList<ReviewId, Review>();
  return { ...list, removeByTask: (taskId) => list.removeWhere((r) => r.taskId === taskId) };
}

export function createInMemoryMilestoneRepository(): MilestoneRepository {
  let history: RecordedMilestone[] = [];
  return {
    async findByCompany(companyId) {
      return history.filter((m) => m.companyId === companyId).sort((a, b) => a.at - b.at);
    },
    async add(milestone) {
      history.push(milestone);
    },
    async removeJoined(employeeId) {
      history = history.filter((m) => !(m.kind === "joined" && m.employeeId === employeeId));
    },
  };
}

export function createInMemoryAgentRepository(): AgentRepository {
  const list = createInMemoryList<AgentId, Agent>();
  return { ...list, removeByEmployee: (employeeId) => list.removeWhere((a) => a.employeeId === employeeId) };
}

export function createInMemoryRunRepository(): RunRepository {
  const runs = new Map<string, Run>();
  return {
    async findById(id) {
      return runs.get(id);
    },
    async findByCompany(companyId) {
      return [...runs.values()].filter((r) => r.companyId === companyId).sort((a, b) => a.startedAt - b.startedAt || a.id.localeCompare(b.id));
    },
    async save(run) {
      runs.set(run.id, run);
    },
    async removeByTask(taskId) {
      for (const [id, run] of runs) if (run.taskId === taskId) runs.delete(id);
    },
  };
}

export function createInMemoryTaskRequestRepository(): TaskRequestRepository {
  let requests: TaskRequest[] = [];
  return {
    async removeByTask(taskId) {
      requests = requests.filter((r) => r.taskId !== taskId);
    },
    async add(request) {
      requests.push(request);
    },
    async findByTask(companyId, taskId) {
      return requests.filter((r) => r.companyId === companyId && r.taskId === taskId).sort((a, b) => a.at - b.at);
    },
  };
}

export function createInMemoryRunStepRepository(): RunStepRepository {
  let steps: RunStep[] = [];
  return {
    async removeByTask(taskId) {
      steps = steps.filter((s) => s.taskId !== taskId);
    },
    async add(step) {
      steps.push(step);
    },
    async findByTask(companyId, taskId, limit) {
      return steps.filter((s) => s.companyId === companyId && s.taskId === taskId).reverse().slice(0, limit);
    },
  };
}
