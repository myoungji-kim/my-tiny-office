import type { DomainEvent } from "../domain/events";
import { toMilestoneId, type CompanyId, type TeamId } from "../domain/ids";
import { milestonesFor, type RecordedMilestone } from "../domain/milestone";

import type { AppContext } from "./context";

// Called by each use case with the events it just caused, after its writes,
// so the facts read here are the company as it now stands.
export async function recordMilestones(
  ctx: AppContext,
  companyId: CompanyId,
  events: readonly DomainEvent[],
): Promise<RecordedMilestone[]> {
  const relevant = events.filter((e) =>
    ["CompanyCreated", "EmployeeHired", "EmployeeMoved", "TaskApplied", "ReviewSettled", "MemoryTaught", "ProjectFinished"].includes(e.type),
  );
  if (relevant.length === 0) return [];

  const [history, employees, tasks, reviews, memories] = await Promise.all([
    ctx.milestones.findByCompany(companyId),
    ctx.employees.findByCompany(companyId),
    ctx.tasks.findByCompany(companyId),
    ctx.reviews.findByCompany(companyId),
    ctx.memories.findByCompany(companyId),
  ]);
  const recorded: RecordedMilestone[] = [];
  const formed = new Set(history.filter((m) => m.kind === "teamFormed").map((m) => m.teamId));
  let hires = history.filter((m) => m.kind === "joined").length;

  for (const event of relevant) {
    if (event.type === "EmployeeHired") hires += 1;
    const facts = {
      hires,
      tasksApplied: tasks.filter((t) => t.status === "done").length,
      reviewsSettled: reviews.filter((r) => r.state === "settled").length,
      memories: memories.length,
      teamMembers: (teamId: TeamId) => employees.filter((e) => e.teamId === teamId).length,
      teamFormed: (teamId: TeamId) => formed.has(teamId),
    };
    for (const milestone of milestonesFor(event, facts)) {
      const saved = { ...milestone, id: toMilestoneId(ctx.newId()), companyId, at: event.occurredAt } as RecordedMilestone;
      if (saved.kind === "teamFormed") formed.add(saved.teamId);
      await ctx.milestones.add(saved);
      recorded.push(saved);
    }
  }
  return recorded;
}
