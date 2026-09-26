import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import type { Availability } from "../../domain/employee";
import type { TaskPriority, TaskStatus } from "../../domain/task";

// Listing the values here keeps the schema in sync with the domain unions:
// widening a union without updating these arrays fails to compile.
const availabilities = ["available", "onVacation"] as const satisfies readonly Availability[];
const taskStatuses = [
  "backlog",
  "ready",
  "working",
  "done",
] as const satisfies readonly TaskStatus[];
const taskPriorities = ["low", "normal", "high"] as const satisfies readonly TaskPriority[];

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
    hiredAt: integer("hired_at").notNull(),
  },
  (table) => [
    check("employees_availability", sql`${table.availability} in ('available', 'onVacation')`),
  ],
);

export const tasks = sqliteTable(
  "tasks",
  {
    id: text("id").primaryKey().notNull(),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id),
    title: text("title").notNull(),
    description: text("description"),
    status: text("status", { enum: taskStatuses }).notNull(),
    priority: text("priority", { enum: taskPriorities }).notNull(),
    assigneeId: text("assignee_id").references(() => employees.id),
    estimatedDuration: integer("estimated_duration").notNull(),
    createdAt: integer("created_at").notNull(),
    startedAt: integer("started_at"),
    completedAt: integer("completed_at"),
  },
  (table) => [
    index("idx_tasks_company_status").on(table.companyId, table.status),
    check("tasks_status", sql`${table.status} in ('backlog', 'ready', 'working', 'done')`),
    check("tasks_priority", sql`${table.priority} in ('low', 'normal', 'high')`),
    check("tasks_estimated_duration", sql`${table.estimatedDuration} > 0`),
    check("tasks_started_at", sql`${table.status} <> 'working' or ${table.startedAt} is not null`),
    check("tasks_completed_at", sql`${table.status} <> 'done' or ${table.completedAt} is not null`),
  ],
);
