import type { DomainEvent } from "./events";
import type { CompanyId, EmployeeId, MilestoneId, ProjectId, TeamId } from "./ids";
import type { Timestamp } from "./time";

// The company's history, recorded as it happens and never rebuilt, so a hire
// stays in it after the person leaves: names are kept as they were then.
export type Milestone =
  | { readonly kind: "founded" }
  | { readonly kind: "joined"; readonly employeeId: EmployeeId; readonly employeeName: string; readonly first: boolean }
  | { readonly kind: "teamFormed"; readonly teamId: TeamId }
  | { readonly kind: "firstTaskDone" }
  | { readonly kind: "tasksDone"; readonly count: number }
  | { readonly kind: "firstReview" }
  | { readonly kind: "memories"; readonly count: number }
  | { readonly kind: "projectFinished"; readonly projectId: ProjectId; readonly projectName: string };

export type MilestoneKind = Milestone["kind"];

export type RecordedMilestone = Milestone & {
  readonly id: MilestoneId;
  readonly companyId: CompanyId;
  readonly at: Timestamp;
};

export const TASK_MARKS = [10, 50, 100, 500] as const;
export const MEMORY_MARKS = [10, 50, 100] as const;

// What the company looked like right after the event, as far as milestones care.
export interface CompanyFacts {
  readonly hires: number;
  readonly tasksApplied: number;
  readonly reviewsSettled: number;
  readonly memories: number;
  readonly teamMembers: (teamId: TeamId) => number;
  readonly teamFormed: (teamId: TeamId) => boolean;
}

function teamFormedBy(teamId: TeamId | undefined, facts: CompanyFacts): Milestone[] {
  return teamId !== undefined && facts.teamMembers(teamId) >= 1 && !facts.teamFormed(teamId) ? [{ kind: "teamFormed", teamId }] : [];
}

// Counts can fall and rise again (a memory forgotten and taught back), so a
// mark already in the history is never recorded a second time.
export function alreadyRecorded(milestone: Milestone, history: readonly Milestone[]): boolean {
  switch (milestone.kind) {
    case "founded":
    case "firstTaskDone":
    case "firstReview":
      return history.some((m) => m.kind === milestone.kind);
    case "tasksDone":
    case "memories":
      return history.some((m) => m.kind === milestone.kind && m.count === milestone.count);
    case "teamFormed":
      return history.some((m) => m.kind === "teamFormed" && m.teamId === milestone.teamId);
    case "joined":
      return history.some((m) => m.kind === "joined" && m.employeeId === milestone.employeeId);
    case "projectFinished":
      return false;
  }
}

export function milestonesFor(event: DomainEvent, facts: CompanyFacts): Milestone[] {
  switch (event.type) {
    case "CompanyCreated":
      return [{ kind: "founded" }];
    case "EmployeeHired":
      return [
        { kind: "joined", employeeId: event.employeeId, employeeName: event.employeeName, first: facts.hires === 1 },
        ...teamFormedBy(event.teamId, facts),
      ];
    case "EmployeeMoved":
      return teamFormedBy(event.teamId, facts);
    case "TaskApplied": {
      const count = facts.tasksApplied;
      return [
        ...(count === 1 ? [{ kind: "firstTaskDone" } as const] : []),
        ...((TASK_MARKS as readonly number[]).includes(count) ? [{ kind: "tasksDone", count } as const] : []),
      ];
    }
    case "ReviewSettled":
      return facts.reviewsSettled === 1 ? [{ kind: "firstReview" }] : [];
    case "MemoryTaught":
      return (MEMORY_MARKS as readonly number[]).includes(facts.memories) ? [{ kind: "memories", count: facts.memories }] : [];
    case "ProjectFinished":
      return [{ kind: "projectFinished", projectId: event.projectId, projectName: event.projectName }];
    default:
      return [];
  }
}
