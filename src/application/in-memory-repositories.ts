import type { Company } from "../domain/company";
import type { Employee } from "../domain/employee";
import type { AreaId, CompanyId, EmployeeId, MemoryId, ProjectId, RoleId, TaskId, TeamId } from "../domain/ids";
import type { Area, Memory } from "../domain/memory";
import type { Role, Team } from "../domain/organisation";
import type { Project } from "../domain/project";
import type { Task } from "../domain/task";

import type { TransactionRunner } from "./context";
import type {
  AreaRepository,
  CompanyRepository,
  EmployeeRepository,
  MemoryRepository,
  ProjectRepository,
  RoleRepository,
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
    async findAll() {
      return [...companies.values()].sort((a, b) => a.foundedAt - b.foundedAt);
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

export function createInMemoryProjectRepository(): ProjectRepository {
  const projects = new Map<ProjectId, Project>();

  return {
    async findById(id) {
      return projects.get(id);
    },
    async findByCompany(companyId) {
      return [...projects.values()]
        .filter((project) => project.companyId === companyId)
        .sort((a, b) => a.createdAt - b.createdAt);
    },
    async save(project) {
      projects.set(project.id, project);
    },
  };
}

export function createInMemoryTaskRepository(): TaskRepository {
  const tasks = new Map<TaskId, Task>();

  return {
    async findById(id) {
      return tasks.get(id);
    },
    async findByCompany(companyId) {
      return [...tasks.values()]
        .filter((task) => task.companyId === companyId)
        .sort((a, b) => a.createdAt - b.createdAt);
    },
    async save(task) {
      tasks.set(task.id, task);
    },
  };
}

function createInMemoryList<TId, TItem extends { readonly id: TId; readonly companyId: CompanyId; readonly createdAt: number }>() {
  const items = new Map<TId, TItem>();
  return {
    async findByCompany(companyId: CompanyId) {
      return [...items.values()].filter((item) => item.companyId === companyId).sort((a, b) => a.createdAt - b.createdAt);
    },
    async save(item: TItem) {
      items.set(item.id, item);
    },
    async remove(id: TId) {
      items.delete(id);
    },
  };
}

export const createInMemoryAreaRepository = (): AreaRepository => createInMemoryList<AreaId, Area>();
export const createInMemoryMemoryRepository = (): MemoryRepository => createInMemoryList<MemoryId, Memory>();
export const createInMemoryRoleRepository = (): RoleRepository => createInMemoryList<RoleId, Role>();
export const createInMemoryTeamRepository = (): TeamRepository => createInMemoryList<TeamId, Team>();
