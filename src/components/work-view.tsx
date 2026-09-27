import {
  assignTaskAction,
  completeTaskAction,
  createTaskAction,
  startTaskAction,
} from "../app/actions";
import type { TaskStatus } from "../domain/task";
import type { Dictionary } from "../i18n";
import type { EmployeeView, TaskView } from "../server/view-model";

import { ActionForm } from "./action-form";
import { Field, Select, TextArea, TextInput } from "./fields";
import { ProgressBar, TaskStatusBadge } from "./status";

const columns: readonly TaskStatus[] = ["backlog", "ready", "working", "done"];

function AssignForm({
  t,
  companyId,
  task,
  employees,
}: {
  readonly t: Dictionary;
  readonly companyId: string;
  readonly task: TaskView;
  readonly employees: readonly EmployeeView[];
}) {
  if (employees.length === 0) {
    return <p className="text-xs text-muted">{t.work.noEmployeesToAssign}</p>;
  }

  return (
    <ActionForm
      action={assignTaskAction}
      errors={t.errors}
      submitLabel={t.work.assign}
      pendingLabel={t.work.assigning}
      tone="quiet"
      layout="inline"
    >
      <input type="hidden" name="companyId" value={companyId} />
      <input type="hidden" name="taskId" value={task.id} />
      <Field label={t.work.assignTo}>
        <Select name="employeeId" defaultValue={task.assigneeId ?? employees[0].id}>
          {employees.map((employee) => (
            <option key={employee.id} value={employee.id}>
              {employee.name}
            </option>
          ))}
        </Select>
      </Field>
    </ActionForm>
  );
}

function TaskActions({
  t,
  companyId,
  task,
  employees,
}: {
  readonly t: Dictionary;
  readonly companyId: string;
  readonly task: TaskView;
  readonly employees: readonly EmployeeView[];
}) {
  switch (task.status) {
    case "backlog":
      return <AssignForm t={t} companyId={companyId} task={task} employees={employees} />;
    case "ready":
      return (
        <div className="flex flex-wrap items-end gap-3">
          <AssignForm t={t} companyId={companyId} task={task} employees={employees} />
          <ActionForm
            action={startTaskAction}
            errors={t.errors}
            submitLabel={t.work.start}
            pendingLabel={t.work.starting}
            layout="inline"
          >
            <input type="hidden" name="companyId" value={companyId} />
            <input type="hidden" name="taskId" value={task.id} />
          </ActionForm>
        </div>
      );
    case "working":
      return (
        <ActionForm
          action={completeTaskAction}
          errors={t.errors}
          submitLabel={t.work.complete}
          pendingLabel={t.work.completing}
          layout="inline"
        >
          <input type="hidden" name="companyId" value={companyId} />
          <input type="hidden" name="taskId" value={task.id} />
        </ActionForm>
      );
    case "done":
      return null;
  }
}

function TaskCard({
  t,
  companyId,
  task,
  employees,
}: {
  readonly t: Dictionary;
  readonly companyId: string;
  readonly task: TaskView;
  readonly employees: readonly EmployeeView[];
}) {
  return (
    <li className="flex flex-col gap-2 rounded-lg border border-line bg-panel p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col">
          <span className="text-sm font-medium text-ink">{task.title}</span>
          {task.description !== undefined && (
            <span className="text-xs text-muted">{task.description}</span>
          )}
        </div>
        <TaskStatusBadge label={t.taskStatus[task.status]} status={task.status} />
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
        <span>{task.assigneeName ?? t.work.unassigned}</span>
        <span className="font-mono">{t.priority[task.priority]}</span>
        {task.status === "working" && <ProgressBar value={task.progress} />}
      </div>

      <TaskActions t={t} companyId={companyId} task={task} employees={employees} />
    </li>
  );
}

export function WorkView({
  t,
  companyId,
  employees,
  tasks,
}: {
  readonly t: Dictionary;
  readonly companyId: string;
  readonly employees: readonly EmployeeView[];
  readonly tasks: readonly TaskView[];
}) {
  return (
    <>
      <section className="rounded-xl border border-line bg-panel p-5">
        <h2 className="mb-3 font-mono text-xs tracking-[0.15em] text-muted uppercase">
          {t.work.newTask}
        </h2>

        <ActionForm
          action={createTaskAction}
          errors={t.errors}
          submitLabel={t.work.newTask}
          pendingLabel={t.work.creating}
        >
          <input type="hidden" name="companyId" value={companyId} />
          <Field label={t.work.title}>
            <TextInput name="title" required placeholder={t.work.titlePlaceholder} />
          </Field>
          <Field label={t.work.description} hint={t.onboarding.optional}>
            <TextArea name="description" placeholder={t.work.descriptionPlaceholder} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t.work.priority}>
              <Select name="priority" defaultValue="normal">
                <option value="low">{t.priority.low}</option>
                <option value="normal">{t.priority.normal}</option>
                <option value="high">{t.priority.high}</option>
              </Select>
            </Field>
            <Field label={t.work.estimatedDuration}>
              <TextInput name="estimatedMinutes" type="number" min={1} defaultValue={30} required />
            </Field>
          </div>
        </ActionForm>
      </section>

      {tasks.length === 0 ? (
        <p className="rounded-xl border border-line bg-panel px-5 py-8 text-sm text-muted">
          {t.work.empty}
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {columns.map((status) => {
            const column = tasks.filter((task) => task.status === status);
            if (column.length === 0) {
              return null;
            }

            return (
              <section key={status} className="flex flex-col gap-2">
                <h3 className="font-mono text-xs tracking-[0.15em] text-muted uppercase">
                  {t.taskStatus[status]}
                </h3>
                <ul className="flex flex-col gap-2">
                  {column.map((task) => (
                    <TaskCard key={task.id} t={t} companyId={companyId} task={task} employees={employees} />
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
