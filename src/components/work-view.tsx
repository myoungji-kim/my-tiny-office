import { assignTaskAction, createProjectAction, createTaskAction } from "../app/actions";
import type { TaskStatus } from "../domain/task";
import type { Dictionary } from "../i18n";
import type { EmployeeView, ProjectView, TaskView } from "../server/view-model";

import { ActionForm } from "./action-form";
import { Field, Select, TextArea, TextInput } from "./fields";
import { TaskStatusBadge } from "./status";

const columns: readonly TaskStatus[] = ["backlog", "working", "approval", "done", "held"];

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
          {task.description !== undefined && <span className="text-xs text-muted">{task.description}</span>}
        </div>
        <TaskStatusBadge label={t.taskStatus[task.status]} status={task.status} />
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
        <span>{task.projectName}</span>
        <span>{task.assigneeName ?? t.work.unassigned}</span>
        <span className="font-mono">{t.priority[task.priority]}</span>
        {task.status !== "backlog" && <span className="font-mono">{t.work.minutes(task.minutesTaken)}</span>}
      </div>

      {task.status === "backlog" && <AssignForm t={t} companyId={companyId} task={task} employees={employees} />}
    </li>
  );
}

function PrioritySelect({ t }: { readonly t: Dictionary }) {
  return (
    <Field label={t.work.priority}>
      <Select name="priority" defaultValue="normal">
        <option value="low">{t.priority.low}</option>
        <option value="normal">{t.priority.normal}</option>
        <option value="high">{t.priority.high}</option>
      </Select>
    </Field>
  );
}

export function WorkView({
  t,
  companyId,
  employees,
  projects,
  tasks,
}: {
  readonly t: Dictionary;
  readonly companyId: string;
  readonly employees: readonly EmployeeView[];
  readonly projects: readonly ProjectView[];
  readonly tasks: readonly TaskView[];
}) {
  const writable = projects.filter((project) => project.takesWork);

  return (
    <>
      <section className="rounded-xl border border-line bg-panel p-5">
        <h2 className="mb-3 font-mono text-xs tracking-[0.15em] text-muted uppercase">{t.work.newProject}</h2>
        <ActionForm action={createProjectAction} errors={t.errors} submitLabel={t.work.newProject} pendingLabel={t.work.creating}>
          <input type="hidden" name="companyId" value={companyId} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t.work.projectName}>
              <TextInput name="name" required placeholder={t.work.projectNamePlaceholder} />
            </Field>
            <PrioritySelect t={t} />
          </div>
        </ActionForm>
      </section>

      <section className="rounded-xl border border-line bg-panel p-5">
        <h2 className="mb-3 font-mono text-xs tracking-[0.15em] text-muted uppercase">{t.work.newTask}</h2>
        {writable.length === 0 ? (
          <p className="text-sm text-muted">{t.work.noProjects}</p>
        ) : (
          <ActionForm action={createTaskAction} errors={t.errors} submitLabel={t.work.newTask} pendingLabel={t.work.creating}>
            <input type="hidden" name="companyId" value={companyId} />
            <Field label={t.work.project}>
              <Select name="projectId" defaultValue={writable[0].id}>
                {writable.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t.work.title}>
              <TextInput name="title" required placeholder={t.work.titlePlaceholder} />
            </Field>
            <Field label={t.work.description} hint={t.work.optional}>
              <TextArea name="description" placeholder={t.work.descriptionPlaceholder} />
            </Field>
            <PrioritySelect t={t} />
          </ActionForm>
        )}
      </section>

      {tasks.length === 0 ? (
        <p className="rounded-xl border border-line bg-panel px-5 py-8 text-sm text-muted">{t.work.empty}</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {columns.map((status) => {
            const column = tasks.filter((task) => task.status === status);
            if (column.length === 0) {
              return null;
            }

            return (
              <section key={status} className="flex flex-col gap-2">
                <h3 className="font-mono text-xs tracking-[0.15em] text-muted uppercase">{t.taskStatus[status]}</h3>
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
