import type { Company } from "../domain/company";
import type { Employee } from "../domain/employee";
import type { AreaId, CompanyId, EmployeeId, MemoryId, ProjectId, ReviewId, RoleId, RunId, TaskId, TeamId } from "../domain/ids";
import type { Area, Memory } from "../domain/memory";
import type { RecordedMilestone } from "../domain/milestone";
import type { Role, Team } from "../domain/organisation";
import type { Review } from "../domain/review";
import type { Project } from "../domain/project";
import type { Agent, Run, RunStep } from "../domain/run";
import type { Task, TaskRequest } from "../domain/task";

export interface CompanyRepository {
  findById(id: CompanyId): Promise<Company | undefined>;
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

export interface AgentRepository {
  findByCompany(companyId: CompanyId): Promise<readonly Agent[]>;
  save(agent: Agent): Promise<void>;
}

export interface RunRepository {
  findById(id: RunId): Promise<Run | undefined>;
  findByCompany(companyId: CompanyId): Promise<readonly Run[]>;
  save(run: Run): Promise<void>;
}

// A task's requests are only ever added to, and read oldest first.
export interface TaskRequestRepository {
  add(request: TaskRequest): Promise<void>;
  findByTask(companyId: CompanyId, taskId: TaskId): Promise<readonly TaskRequest[]>;
}

// What a run reported is only ever added to; a task's page reads the newest.
export interface RunStepRepository {
  add(step: RunStep): Promise<void>;
  findByTask(companyId: CompanyId, taskId: TaskId, limit: number): Promise<readonly RunStep[]>;
}
