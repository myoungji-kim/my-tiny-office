import type { DomainEvent } from "../domain/events";
import { toMilestoneId, type CompanyId, type TeamId } from "../domain/ids";
import { alreadyRecorded, milestonesFor, type Milestone, type RecordedMilestone } from "../domain/milestone";

import type { AppContext } from "./context";

// Called by each use case, inside its transaction and after its writes, with
// the events it just caused: the facts read here are the company as it now
// stands.
export async function recordMilestones(ctx: AppContext, companyId: CompanyId, events: readonly DomainEvent[]): Promise<void> {
  if (events.length === 0) return;

  const [history, employees, tasks, reviews, memories] = await Promise.all([
    ctx.milestones.findByCompany(companyId),
    ctx.employees.findByCompany(companyId),
    ctx.tasks.findByCompany(companyId),
    ctx.reviews.findByCompany(companyId),
    ctx.memories.findByCompany(companyId),
  ]);
  const recorded: Milestone[] = [...history];
  let hires = history.filter((m) => m.kind === "joined").length;

  for (const event of events) {
    if (event.type === "EmployeeHired") hires += 1;
    const facts = {
      hires,
      tasksApplied: tasks.filter((t) => t.status === "done").length,
      reviewsSettled: reviews.filter((r) => r.state === "settled").length,
      memories: memories.length,
      teamMembers: (teamId: TeamId) => employees.filter((e) => e.teamId === teamId).length,
      teamFormed: (teamId: TeamId) => recorded.some((m) => m.kind === "teamFormed" && m.teamId === teamId),
    };
    for (const milestone of milestonesFor(event, facts)) {
      if (alreadyRecorded(milestone, recorded)) continue;
      const saved: RecordedMilestone = { ...milestone, id: toMilestoneId(ctx.newId()), companyId, at: event.occurredAt };
      await ctx.milestones.add(saved);
      recorded.push(saved);
    }
  }
}
