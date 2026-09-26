import type { Company } from "../domain/company";
import type { Employee } from "../domain/employee";
import type { CompanyId, EmployeeId, TaskId } from "../domain/ids";
import type { Task } from "../domain/task";

import type { TransactionRunner } from "./context";
import type { CompanyRepository, EmployeeRepository, TaskRepository } from "./repositories";

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
    async save(employee) {
      employees.set(employee.id, employee);
    },
  };
}

export function createInMemoryTaskRepository(): TaskRepository {
  const tasks = new Map<TaskId, Task>();

  return {
    async findById(id) {
      return tasks.get(id);
    },
    async save(task) {
      tasks.set(task.id, task);
    },
    async findWorkingByCompany(companyId) {
      return [...tasks.values()].filter(
        (task) => task.companyId === companyId && task.status === "working",
      );
    },
  };
}
