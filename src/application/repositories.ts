import type { Company } from "../domain/company";
import type { Employee } from "../domain/employee";
import type { AreaId, CompanyId, EmployeeId, MemoryId, ProjectId, ReviewId, RoleId, TaskId, TeamId } from "../domain/ids";
import type { Area, Memory } from "../domain/memory";
import type { RecordedMilestone } from "../domain/milestone";
import type { Role, Team } from "../domain/organisation";
import type { Review } from "../domain/review";
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

export interface AreaRepository {
  findByCompany(companyId: CompanyId): Promise<readonly Area[]>;
  save(area: Area): Promise<void>;
  remove(id: AreaId): Promise<void>;
}

export interface RoleRepository {
  findByCompany(companyId: CompanyId): Promise<readonly Role[]>;
  save(role: Role): Promise<void>;
  remove(id: RoleId): Promise<void>;
}

export interface TeamRepository {
  findByCompany(companyId: CompanyId): Promise<readonly Team[]>;
  save(team: Team): Promise<void>;
  remove(id: TeamId): Promise<void>;
}

export interface ReviewRepository {
  findById(id: ReviewId): Promise<Review | undefined>;
  findByCompany(companyId: CompanyId): Promise<readonly Review[]>;
  save(review: Review): Promise<void>;
}

// History is only ever added to.
export interface MilestoneRepository {
  findByCompany(companyId: CompanyId): Promise<readonly RecordedMilestone[]>;
  add(milestone: RecordedMilestone): Promise<void>;
}

export interface MemoryRepository {
  findByCompany(companyId: CompanyId): Promise<readonly Memory[]>;
  save(memory: Memory): Promise<void>;
  remove(id: MemoryId): Promise<void>;
}
