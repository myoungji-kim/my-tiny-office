import type { DomainEvent } from "../domain/events";
import type { Timestamp } from "../domain/time";

import type {
  AreaRepository,
  CompanyRepository,
  EmployeeRepository,
  MemoryRepository,
  AgentRepository,
  MilestoneRepository,
  ProjectRepository,
  ReviewRepository,
  RoleRepository,
  RunRepository,
  RunStepRepository,
  TaskRequestRepository,
  TaskRepository,
  TeamRepository,
} from "./repositories";

export type TransactionRunner = <T>(work: () => Promise<T>) => Promise<T>;

export interface AppContext {
  readonly companies: CompanyRepository;
  readonly employees: EmployeeRepository;
  readonly projects: ProjectRepository;
  readonly tasks: TaskRepository;
  readonly areas: AreaRepository;
  readonly memories: MemoryRepository;
  readonly roles: RoleRepository;
  readonly teams: TeamRepository;
  readonly reviews: ReviewRepository;
  readonly milestones: MilestoneRepository;
  readonly agents: AgentRepository;
  readonly runs: RunRepository;
  readonly runSteps: RunStepRepository;
  readonly requests: TaskRequestRepository;
  readonly now: () => Timestamp;
  readonly newId: () => string;
  readonly withTransaction: TransactionRunner;
}

export type UseCaseResult<TValue, TFailure extends string> =
  | { readonly ok: true; readonly value: TValue; readonly events: readonly DomainEvent[] }
  | { readonly ok: false; readonly reason: TFailure };
