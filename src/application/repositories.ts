import type { Company } from "../domain/company";
import type { Employee } from "../domain/employee";
import type { CompanyId, EmployeeId, TaskId } from "../domain/ids";
import type { Task } from "../domain/task";

export interface CompanyRepository {
  findById(id: CompanyId): Promise<Company | undefined>;
  save(company: Company): Promise<void>;
}

export interface EmployeeRepository {
  findById(id: EmployeeId): Promise<Employee | undefined>;
  save(employee: Employee): Promise<void>;
}

export interface TaskRepository {
  findById(id: TaskId): Promise<Task | undefined>;
  save(task: Task): Promise<void>;
  findWorkingByCompany(companyId: CompanyId): Promise<readonly Task[]>;
}
