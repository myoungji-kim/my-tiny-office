import type { Company } from "../domain/company";
import type { Employee } from "../domain/employee";
import type { AgentId, AreaId, CompanyId, EmployeeId, MemoryId, ProjectId, ReviewId, RoleId, TaskId, TeamId } from "../domain/ids";
import type { RecordedMilestone } from "../domain/milestone";
import type { Review } from "../domain/review";
import type { Area, Memory } from "../domain/memory";
import type { Role, Team } from "../domain/organisation";
import type { Project } from "../domain/project";
import type { Agent, Run, RunStep } from "../domain/run";
import type { Task } from "../domain/task";

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
  };
}

export const createInMemoryProjectRepository = (): ProjectRepository => createInMemoryList<ProjectId, Project>();
export const createInMemoryTaskRepository = (): TaskRepository => createInMemoryList<TaskId, Task>();
export const createInMemoryAreaRepository = (): AreaRepository => createInMemoryList<AreaId, Area>();
export const createInMemoryMemoryRepository = (): MemoryRepository => createInMemoryList<MemoryId, Memory>();
export const createInMemoryRoleRepository = (): RoleRepository => createInMemoryList<RoleId, Role>();
export const createInMemoryTeamRepository = (): TeamRepository => createInMemoryList<TeamId, Team>();
export const createInMemoryReviewRepository = (): ReviewRepository => createInMemoryList<ReviewId, Review>();

export function createInMemoryMilestoneRepository(): MilestoneRepository {
  const history: RecordedMilestone[] = [];
  return {
    async findByCompany(companyId) {
      return history.filter((m) => m.companyId === companyId).sort((a, b) => a.at - b.at);
    },
    async add(milestone) {
      history.push(milestone);
    },
  };
}

export const createInMemoryAgentRepository = (): AgentRepository => createInMemoryList<AgentId, Agent>();

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
  };
}

export function createInMemoryRunStepRepository(): RunStepRepository {
  const steps: RunStep[] = [];
  return {
    async add(step) {
      steps.push(step);
    },
    async findByTask(companyId, taskId, limit) {
      return steps.filter((s) => s.companyId === companyId && s.taskId === taskId).reverse().slice(0, limit);
    },
  };
}
