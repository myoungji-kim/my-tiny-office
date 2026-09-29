import { asc, eq } from "drizzle-orm";

import type { MilestoneRepository, ReviewRepository } from "../../application/repositories";
import { toCompanyId, toEmployeeId, toMilestoneId, toProjectId, toReviewId, toTaskId, toTeamId } from "../../domain/ids";
import type { RecordedMilestone } from "../../domain/milestone";
import type { Review } from "../../domain/review";

import type { AppDatabase } from "./database";
import { milestones, reviews } from "./schema";

function toReview(row: typeof reviews.$inferSelect): Review {
  return {
    id: toReviewId(row.id),
    companyId: toCompanyId(row.companyId),
    taskId: toTaskId(row.taskId),
    reviewerId: row.reviewerId === null ? undefined : toEmployeeId(row.reviewerId),
    state: row.state,
    createdAt: row.createdAt,
    startedAt: row.startedAt ?? undefined,
    settledAt: row.settledAt ?? undefined,
    verdict: row.verdict === "approve" || row.verdict === "changes" ? row.verdict : undefined,
    comments: row.comments ?? undefined,
  };
}

export function createSqliteReviewRepository(db: AppDatabase): ReviewRepository {
  return {
    async findById(id) {
      const row = db.select().from(reviews).where(eq(reviews.id, id)).get();
      return row === undefined ? undefined : toReview(row);
    },
    async findByCompany(companyId) {
      return db.select().from(reviews).where(eq(reviews.companyId, companyId)).orderBy(asc(reviews.createdAt), asc(reviews.id)).all().map(toReview);
    },
    async save(review) {
      const row = {
        companyId: review.companyId,
        taskId: review.taskId,
        reviewerId: review.reviewerId ?? null,
        state: review.state,
        createdAt: review.createdAt,
        startedAt: review.startedAt ?? null,
        settledAt: review.settledAt ?? null,
        verdict: review.verdict ?? null,
        comments: review.comments ?? null,
      };
      db.insert(reviews).values({ id: review.id, ...row }).onConflictDoUpdate({ target: reviews.id, set: row }).run();
    },
  };
}

// A row that no longer reads as a milestone is skipped rather than shown wrong.
function toMilestone(row: typeof milestones.$inferSelect): RecordedMilestone | undefined {
  const base = { id: toMilestoneId(row.id), companyId: toCompanyId(row.companyId), at: row.at };
  switch (row.kind) {
    case "founded":
    case "firstTaskDone":
    case "firstReview":
      return { ...base, kind: row.kind };
    case "joined":
      return row.employeeId === null || row.employeeName === null
        ? undefined
        : { ...base, kind: "joined", employeeId: toEmployeeId(row.employeeId), employeeName: row.employeeName, first: row.first === true };
    case "teamFormed":
      return row.teamId === null ? undefined : { ...base, kind: "teamFormed", teamId: toTeamId(row.teamId) };
    case "tasksDone":
    case "memories":
      return row.count === null ? undefined : { ...base, kind: row.kind, count: row.count };
    case "projectFinished":
      return row.projectId === null || row.projectName === null
        ? undefined
        : { ...base, kind: "projectFinished", projectId: toProjectId(row.projectId), projectName: row.projectName };
  }
}

export function createSqliteMilestoneRepository(db: AppDatabase): MilestoneRepository {
  return {
    async findByCompany(companyId) {
      return db
        .select()
        .from(milestones)
        .where(eq(milestones.companyId, companyId))
        .orderBy(asc(milestones.at), asc(milestones.id))
        .all()
        .map(toMilestone)
        .filter((m): m is RecordedMilestone => m !== undefined);
    },
    async add(milestone) {
      db.insert(milestones)
        .values({
          id: milestone.id,
          companyId: milestone.companyId,
          kind: milestone.kind,
          at: milestone.at,
          employeeId: "employeeId" in milestone ? milestone.employeeId : null,
          employeeName: "employeeName" in milestone ? milestone.employeeName : null,
          first: "first" in milestone ? milestone.first : null,
          teamId: "teamId" in milestone ? milestone.teamId : null,
          count: "count" in milestone ? milestone.count : null,
          projectId: "projectId" in milestone ? milestone.projectId : null,
          projectName: "projectName" in milestone ? milestone.projectName : null,
        })
        .run();
    },
  };
}
