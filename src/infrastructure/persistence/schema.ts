import { sql, type SQL } from "drizzle-orm";
import { check, index, integer, real, sqliteTable, text, type AnySQLiteColumn } from "drizzle-orm/sqlite-core";

import { SPECIES, type Availability } from "../../domain/employee";
import { STARTING_AREAS, type MemoryKind } from "../../domain/memory";
import type { MilestoneKind } from "../../domain/milestone";
import { SUGGESTED_TEAMS } from "../../domain/organisation";
import type { Priority, ProjectStatus } from "../../domain/project";
import type { ReviewState } from "../../domain/review";
import { RUNTIMES, type RunEnd, type RunState, type StepKind } from "../../domain/run";
import type { TaskStatus } from "../../domain/task";

// Each list is checked against its domain union, and each CHECK is built from
// its list, so widening a union without touching the schema fails to compile.
const availabilities = ["available", "onLeave"] as const satisfies readonly Availability[];
const priorities = ["low", "normal", "high"] as const satisfies readonly Priority[];
const projectStatuses = ["planned", "active", "held", "done"] as const satisfies readonly ProjectStatus[];
const taskStatuses = ["backlog", "working", "approval", "done", "held"] as const satisfies readonly TaskStatus[];
const heldFrom = ["backlog", "working", "approval"] as const satisfies readonly TaskStatus[];
const memoryKinds = ["expertise", "style", "company"] as const satisfies readonly MemoryKind[];
const reviewStates = ["suggested", "queued", "reviewing", "settled", "withdrawn"] as const satisfies readonly ReviewState[];
const milestoneKinds = [
  "founded",
  "joined",
  "teamFormed",
  "firstTaskDone",
  "tasksDone",
  "firstReview",
  "memories",
  "projectFinished",
] as const satisfies readonly MilestoneKind[];

const runStates = ["starting", "running", "ended"] as const satisfies readonly RunState[];
const runEnds = ["finished", "denied", "writeDenied", "budgetReached", "failed", "stopped", "disconnected"] as const satisfies readonly RunEnd["kind"][];
const stepKinds = ["read", "edit", "run", "say"] as const satisfies readonly StepKind[];

// The values are the constant lists above, never user input.
const oneOf = (column: AnySQLiteColumn, values: readonly string[]): SQL =>
  sql`${column} in (${sql.raw(values.map((v) => `'${v}'`).join(", "))})`;

export const companies = sqliteTable("companies", {
  id: text("id").primaryKey().notNull(),
  name: text("name").notNull(),
  description: text("description"),
  foundedAt: integer("founded_at").notNull(),
});

export const roles = sqliteTable(
  "roles",
  {
    id: text("id").primaryKey().notNull(),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id),
    name: text("name").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [index("idx_roles_company").on(table.companyId)],
);

export const teams = sqliteTable(
  "teams",
  {
    id: text("id").primaryKey().notNull(),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id),
    suggested: text("suggested", { enum: SUGGESTED_TEAMS }),
    name: text("name"),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    index("idx_teams_company").on(table.companyId),
    check("teams_suggested", sql`${table.suggested} is null or ${oneOf(table.suggested, SUGGESTED_TEAMS)}`),
    check("teams_named", sql`${table.suggested} is not null or ${table.name} is not null`),
  ],
);

export const employees = sqliteTable(
  "employees",
  {
    id: text("id").primaryKey().notNull(),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id),
    name: text("name").notNull(),
    species: text("species", { enum: SPECIES }).notNull(),
    roleId: text("role_id")
      .notNull()
      .references(() => roles.id),
    teamId: text("team_id").references(() => teams.id),
    availability: text("availability", { enum: availabilities }).notNull(),
    leaveSince: integer("leave_since"),
    hiredAt: integer("hired_at").notNull(),
  },
  (table) => [
    index("idx_employees_company").on(table.companyId),
    check("employees_species", oneOf(table.species, SPECIES)),
    check("employees_availability", oneOf(table.availability, availabilities)),
    check("employees_leave", sql`${table.availability} = 'onLeave' or ${table.leaveSince} is null`),
  ],
);

export const projects = sqliteTable(
  "projects",
  {
    id: text("id").primaryKey().notNull(),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id),
    name: text("name").notNull(),
    description: text("description"),
    folder: text("folder"),
    // 0 for a folder chosen on another computer, until it is chosen again here
    folderConfirmed: integer("folder_confirmed", { mode: "boolean" }).notNull().default(true),
    // a JSON array of exact commands
    commands: text("commands").notNull().default("[]"),
    atlassian: integer("atlassian", { mode: "boolean" }).notNull().default(false),
    // a JSON array of the Jira and Confluence writes allowed
    writes: text("writes").notNull().default("[]"),
    status: text("status", { enum: projectStatuses }).notNull(),
    priority: text("priority", { enum: priorities }).notNull(),
    heldReason: text("held_reason"),
    createdAt: integer("created_at").notNull(),
    startedAt: integer("started_at"),
    finishedAt: integer("finished_at"),
  },
  (table) => [
    index("idx_projects_company").on(table.companyId),
    check("projects_status", oneOf(table.status, projectStatuses)),
    check("projects_priority", oneOf(table.priority, priorities)),
    check("projects_folder", sql`${table.status} = 'planned' or ${table.folder} is not null`),
    check("projects_held_reason", sql`${table.status} <> 'held' or ${table.heldReason} is not null`),
    check("projects_finished_at", sql`${table.status} <> 'done' or ${table.finishedAt} is not null`),
  ],
);

export const areas = sqliteTable(
  "areas",
  {
    id: text("id").primaryKey().notNull(),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id),
    starting: text("starting", { enum: STARTING_AREAS }),
    name: text("name"),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    index("idx_areas_company").on(table.companyId),
    check("areas_starting", sql`${table.starting} is null or ${oneOf(table.starting, STARTING_AREAS)}`),
    check("areas_named", sql`${table.starting} is not null or ${table.name} is not null`),
  ],
);

export const tasks = sqliteTable(
  "tasks",
  {
    id: text("id").primaryKey().notNull(),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id),
    title: text("title").notNull(),
    description: text("description"),
    area: text("area").references(() => areas.id),
    priority: text("priority", { enum: priorities }).notNull(),
    assigneeId: text("assignee_id").references(() => employees.id),
    status: text("status", { enum: taskStatuses }).notNull(),
    // a JSON Blocker
    blocker: text("blocker"),
    heldReason: text("held_reason"),
    heldFrom: text("held_from", { enum: heldFrom }),
    heldWithProject: integer("held_with_project", { mode: "boolean" }).notNull().default(false),
    changesRequested: text("changes_requested"),
    // the colleague who reviews it once it is first finished; read as unset when they cannot
    reviewerId: text("reviewer_id"),
    createdAt: integer("created_at").notNull(),
    startedAt: integer("started_at"),
    workedFor: integer("worked_for").notNull().default(0),
    runningSince: integer("running_since"),
    finishedAt: integer("finished_at"),
    appliedAt: integer("applied_at"),
    publishedUrl: text("published_url"),
  },
  (table) => [
    index("idx_tasks_company_status").on(table.companyId, table.status),
    index("idx_tasks_project").on(table.projectId),
    check("tasks_status", oneOf(table.status, taskStatuses)),
    check("tasks_priority", oneOf(table.priority, priorities)),
    check("tasks_held_from", sql`${table.heldFrom} is null or ${oneOf(table.heldFrom, heldFrom)}`),
    check("tasks_worked_for", sql`${table.workedFor} >= 0`),
    check("tasks_working", sql`${table.status} <> 'working' or (${table.assigneeId} is not null and ${table.startedAt} is not null)`),
    check("tasks_running", sql`${table.runningSince} is null or ${table.status} = 'working'`),
    check("tasks_held", sql`${table.status} <> 'held' or (${table.heldReason} is not null and ${table.heldFrom} is not null)`),
    check("tasks_finished", sql`${table.status} not in ('approval', 'done') or ${table.finishedAt} is not null`),
    check("tasks_applied", sql`${table.status} <> 'done' or ${table.appliedAt} is not null`),
  ],
);

export const memories = sqliteTable(
  "memories",
  {
    id: text("id").primaryKey().notNull(),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id),
    kind: text("kind", { enum: memoryKinds }).notNull(),
    employeeId: text("employee_id").references(() => employees.id),
    areaId: text("area_id").references(() => areas.id),
    text: text("text").notNull(),
    // kept when its task is deleted: where a memory came from outlives the task
    sourceTaskId: text("source_task_id"),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    index("idx_memories_company").on(table.companyId),
    check("memories_kind", oneOf(table.kind, memoryKinds)),
    check("memories_area", sql`(${table.kind} = 'expertise') = (${table.areaId} is not null)`),
    check("memories_owner", sql`(${table.kind} = 'company') = (${table.employeeId} is null)`),
  ],
);

export const reviews = sqliteTable(
  "reviews",
  {
    id: text("id").primaryKey().notNull(),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id),
    taskId: text("task_id")
      .notNull()
      .references(() => tasks.id),
    reviewerId: text("reviewer_id").references(() => employees.id),
    state: text("state", { enum: reviewStates }).notNull(),
    createdAt: integer("created_at").notNull(),
    startedAt: integer("started_at"),
    settledAt: integer("settled_at"),
    // what the reviewer concluded and said; read as none when unreadable
    verdict: text("verdict"),
    comments: text("comments"),
  },
  (table) => [
    index("idx_reviews_company").on(table.companyId),
    check("reviews_state", oneOf(table.state, reviewStates)),
    check("reviews_reviewer", sql`${table.state} not in ('queued', 'reviewing', 'settled') or ${table.reviewerId} is not null`),
    check("reviews_started", sql`${table.state} not in ('reviewing', 'settled') or ${table.startedAt} is not null`),
    check("reviews_settled", sql`${table.state} <> 'settled' or ${table.settledAt} is not null`),
  ],
);

// The history keeps names as they were, and points at no row that may go.
export const milestones = sqliteTable(
  "milestones",
  {
    id: text("id").primaryKey().notNull(),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id),
    kind: text("kind", { enum: milestoneKinds }).notNull(),
    at: integer("at").notNull(),
    employeeId: text("employee_id"),
    employeeName: text("employee_name"),
    first: integer("first", { mode: "boolean" }),
    teamId: text("team_id"),
    count: integer("count"),
    projectId: text("project_id"),
    projectName: text("project_name"),
  },
  (table) => [
    index("idx_milestones_company").on(table.companyId, table.at),
    check("milestones_kind", oneOf(table.kind, milestoneKinds)),
  ],
);

// An agent belongs to one employee, and is what the company's runs are launched as.
export const agents = sqliteTable(
  "agents",
  {
    id: text("id").primaryKey().notNull(),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id),
    employeeId: text("employee_id")
      .notNull()
      .unique()
      .references(() => employees.id),
    runtime: text("runtime", { enum: RUNTIMES }).notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [index("idx_agents_company").on(table.companyId), check("agents_runtime", oneOf(table.runtime, RUNTIMES))],
);

export const runs = sqliteTable(
  "runs",
  {
    id: text("id").primaryKey().notNull(),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id),
    taskId: text("task_id")
      .notNull()
      .references(() => tasks.id),
    agentId: text("agent_id")
      .notNull()
      .references(() => agents.id),
    sessionId: text("session_id"),
    state: text("state", { enum: runStates }).notNull(),
    end: text("end", { enum: runEnds }),
    // the command it was denied, when that is how it ended
    // the command denied, or for a denied write its kind
    deniedCommand: text("denied_command"),
    costUsd: real("cost_usd").notNull().default(0),
    // the memories the agent said it drew on, as a JSON list of ids
    memoriesUsed: text("memories_used").notNull().default("[]"),
    // what the agent thought worth remembering, until the user teaches or passes on it
    suggestions: text("suggestions").notNull().default("[]"),
    startedAt: integer("started_at").notNull(),
    endedAt: integer("ended_at"),
  },
  (table) => [
    index("idx_runs_company").on(table.companyId, table.startedAt),
    check("runs_state", oneOf(table.state, runStates)),
    check("runs_end", sql`${table.end} is null or ${oneOf(table.end, runEnds)}`),
    check("runs_ended", sql`(${table.state} = 'ended') = (${table.end} is not null and ${table.endedAt} is not null)`),
    check("runs_denied", sql`(${table.end} in ('denied', 'writeDenied')) = (${table.deniedCommand} is not null)`),
  ],
);

// What the user asked of the work when they sent it back, kept as said.
export const taskRequests = sqliteTable(
  "task_requests",
  {
    id: text("id").primaryKey().notNull(),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id),
    taskId: text("task_id")
      .notNull()
      .references(() => tasks.id),
    at: integer("at").notNull(),
    text: text("text").notNull(),
  },
  (table) => [index("idx_task_requests_task").on(table.taskId, table.at)],
);

export const runSteps = sqliteTable(
  "run_steps",
  {
    id: text("id").primaryKey().notNull(),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id),
    taskId: text("task_id")
      .notNull()
      .references(() => tasks.id),
    runId: text("run_id")
      .notNull()
      .references(() => runs.id),
    at: integer("at").notNull(),
    kind: text("kind", { enum: stepKinds }).notNull(),
    detail: text("detail").notNull(),
  },
  (table) => [index("idx_run_steps_task").on(table.taskId, table.at), check("run_steps_kind", oneOf(table.kind, stepKinds))],
);
