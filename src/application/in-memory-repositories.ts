import type { Company } from "../domain/company";
import type { Employee } from "../domain/employee";
import type { CompanyId, EmployeeId, ProjectId, TaskId } from "../domain/ids";
import type { Project } from "../domain/project";
import type { Task } from "../domain/task";

import type { TransactionRunner } from "./context";
import type { CompanyRepository, EmployeeRepository, ProjectRepository, TaskRepository } from "./repositories";

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
