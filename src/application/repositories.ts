import type { Company } from "../domain/company";
import type { Employee } from "../domain/employee";
import type { CompanyId, EmployeeId, ProjectId, TaskId } from "../domain/ids";
import type { Project } from "../domain/project";
import type { Task } from "../domain/task";

export interface CompanyRepository {
  findById(id: CompanyId): Promise<Company | undefined>;
  findAll(): Promise<readonly Company[]>;
  save(company: Company): Promise<void>;
}

export interface EmployeeRepository {
  findById(id: EmployeeId): Promise<Employee | undefined>;
  findByCompany(companyId: CompanyId): Promise<readonly Employee[]>;
  save(employee: Employee): Promise<void>;
}

export interface ProjectRepository {
  findById(id: ProjectId): Promise<Project | undefined>;
  findByCompany(companyId: CompanyId): Promise<readonly Project[]>;
  save(project: Project): Promise<void>;
}

export interface TaskRepository {
  findById(id: TaskId): Promise<Task | undefined>;
  findByCompany(companyId: CompanyId): Promise<readonly Task[]>;
  save(task: Task): Promise<void>;
}
