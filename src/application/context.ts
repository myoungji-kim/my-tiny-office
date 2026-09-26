import type { DomainEvent } from "../domain/events";
import type { Timestamp } from "../domain/time";

import type { CompanyRepository, EmployeeRepository, TaskRepository } from "./repositories";

export type Clock = () => Timestamp;
export type NewId = () => string;
export type TransactionRunner = <T>(work: () => Promise<T>) => Promise<T>;

export interface AppContext {
  readonly companies: CompanyRepository;
  readonly employees: EmployeeRepository;
  readonly tasks: TaskRepository;
  readonly now: Clock;
  readonly newId: NewId;
  readonly withTransaction: TransactionRunner;
}

export type UseCaseResult<TValue, TFailure extends string> =
  | { readonly ok: true; readonly value: TValue; readonly events: readonly DomainEvent[] }
  | { readonly ok: false; readonly reason: TFailure };
