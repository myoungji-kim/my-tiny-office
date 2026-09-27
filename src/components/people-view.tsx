import { hireEmployeeAction } from "../app/actions";
import type { Dictionary } from "../i18n";
import type { EmployeeView, RoleView } from "../server/view-model";

import { ActionForm } from "./action-form";
import { Field, Select, TextInput } from "./fields";
import { StatusBadge, employeeStatus } from "./status";

export function PeopleView({
  t,
  companyId,
  employees,
  roles,
}: {
  readonly t: Dictionary;
  readonly companyId: string;
  readonly employees: readonly EmployeeView[];
  readonly roles: readonly RoleView[];
}) {
  return (
    <>
      <section className="rounded-xl border border-line bg-panel">
        <h2 className="border-b border-line px-5 py-3 font-mono text-xs tracking-[0.15em] text-muted uppercase">
          {t.people.heading}
        </h2>

        {employees.length === 0 ? (
          <p className="px-5 py-8 text-sm text-muted">{t.people.empty}</p>
        ) : (
          <ul className="divide-y divide-line">
            {employees.map((employee) => {
              const status = employeeStatus(employee.availability, employee.workingOn);

              return (
                <li
                  key={employee.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
                >
                  <div className="flex min-w-0 flex-col">
                    <span className="text-sm font-medium text-ink">{employee.name}</span>
                    <span className="text-xs text-muted">{employee.role}</span>
                    {employee.workingOn !== undefined && (
                      <span className="mt-0.5 truncate text-xs text-muted">
                        {t.people.workingOn}: {employee.workingOn}
                      </span>
                    )}
                  </div>
                  <StatusBadge label={t.availability[status]} status={status} />
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-line bg-panel p-5">
        <h2 className="mb-3 font-mono text-xs tracking-[0.15em] text-muted uppercase">
          {t.people.hire}
        </h2>

        <ActionForm
          action={hireEmployeeAction}
          errors={t.errors}
          submitLabel={t.people.hire}
          pendingLabel={t.people.hiring}
        >
          <input type="hidden" name="companyId" value={companyId} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t.people.name}>
              <TextInput name="name" required placeholder={t.people.namePlaceholder} />
            </Field>
            <Field label={t.people.role}>
              <Select name="roleId" defaultValue={roles[0]?.id}>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </ActionForm>
      </section>
    </>
  );
}
