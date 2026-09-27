import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import type { Availability } from "../../domain/employee";
import { STARTING_AREAS, type MemoryKind } from "../../domain/memory";
import type { Priority, ProjectStatus } from "../../domain/project";
import type { TaskStatus } from "../../domain/task";

// Listing the values here keeps the schema in sync with the domain unions:
// widening a union without updating these arrays fails to compile.
const availabilities = ["available", "onLeave"] as const satisfies readonly Availability[];
const priorities = ["low", "normal", "high"] as const satisfies readonly Priority[];
const projectStatuses = ["planned", "active", "held", "done"] as const satisfies readonly ProjectStatus[];
const taskStatuses = ["backlog", "working", "approval", "done", "held"] as const satisfies readonly TaskStatus[];
const heldFrom = ["backlog", "working", "approval"] as const;

export const companies = sqliteTable("companies", {
  id: text("id").primaryKey().notNull(),
  name: text("name").notNull(),
  description: text("description"),
  foundedAt: integer("founded_at").notNull(),
});

export const employees = sqliteTable(
  "employees",
  {
    id: text("id").primaryKey().notNull(),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id),
    name: text("name").notNull(),
    role: text("role").notNull(),
    availability: text("availability", { enum: availabilities }).notNull(),
    leaveSince: integer("leave_since"),
    hiredAt: integer("hired_at").notNull(),
  },
  (table) => [
    index("idx_employees_company").on(table.companyId),
    check("employees_availability", sql`${table.availability} in ('available', 'onLeave')`),
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
    // a JSON array of exact commands
    commands: text("commands").notNull().default("[]"),
    status: text("status", { enum: projectStatuses }).notNull(),
    priority: text("priority", { enum: priorities }).notNull(),
    heldReason: text("held_reason"),
    createdAt: integer("created_at").notNull(),
    startedAt: integer("started_at"),
    finishedAt: integer("finished_at"),
  },
  (table) => [
    index("idx_projects_company").on(table.companyId),
    check("projects_status", sql`${table.status} in ('planned', 'active', 'held', 'done')`),
    check("projects_priority", sql`${table.priority} in ('low', 'normal', 'high')`),
    check("projects_folder", sql`${table.status} = 'planned' or ${table.folder} is not null`),
    check("projects_held_reason", sql`${table.status} <> 'held' or ${table.heldReason} is not null`),
    check("projects_finished_at", sql`${table.status} <> 'done' or ${table.finishedAt} is not null`),
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
    area: text("area"),
    priority: text("priority", { enum: priorities }).notNull(),
    assigneeId: text("assignee_id").references(() => employees.id),
    status: text("status", { enum: taskStatuses }).notNull(),
    // a JSON Blocker
    blocker: text("blocker"),
    heldReason: text("held_reason"),
    heldFrom: text("held_from", { enum: heldFrom }),
    changesRequested: text("changes_requested"),
    createdAt: integer("created_at").notNull(),
    startedAt: integer("started_at"),
    workedFor: integer("worked_for").notNull().default(0),
    runningSince: integer("running_since"),
    finishedAt: integer("finished_at"),
    appliedAt: integer("applied_at"),
  },
  (table) => [
    index("idx_tasks_company_status").on(table.companyId, table.status),
    index("idx_tasks_project").on(table.projectId),
    check("tasks_status", sql`${table.status} in ('backlog', 'working', 'approval', 'done', 'held')`),
    check("tasks_priority", sql`${table.priority} in ('low', 'normal', 'high')`),
    check("tasks_worked_for", sql`${table.workedFor} >= 0`),
    check("tasks_working", sql`${table.status} <> 'working' or (${table.assigneeId} is not null and ${table.startedAt} is not null)`),
    check("tasks_running", sql`${table.runningSince} is null or ${table.status} = 'working'`),
    check("tasks_held", sql`${table.status} <> 'held' or (${table.heldReason} is not null and ${table.heldFrom} is not null)`),
    check("tasks_finished", sql`${table.status} not in ('approval', 'done') or ${table.finishedAt} is not null`),
    check("tasks_applied", sql`${table.status} <> 'done' or ${table.appliedAt} is not null`),
  ],
);

const startingAreas = STARTING_AREAS;
const memoryKinds = ["expertise", "style", "company"] as const satisfies readonly MemoryKind[];

export const areas = sqliteTable(
  "areas",
  {
    id: text("id").primaryKey().notNull(),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id),
    starting: text("starting", { enum: startingAreas }),
    name: text("name"),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    index("idx_areas_company").on(table.companyId),
    check("areas_named", sql`${table.starting} is not null or ${table.name} is not null`),
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
    sourceTaskId: text("source_task_id"),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    index("idx_memories_company").on(table.companyId),
    check("memories_kind", sql`${table.kind} in ('expertise', 'style', 'company')`),
    check("memories_area", sql`(${table.kind} = 'expertise') = (${table.areaId} is not null)`),
    check("memories_owner", sql`(${table.kind} = 'company') = (${table.employeeId} is null)`),
  ],
);
