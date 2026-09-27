import Link from "next/link";

import type { Dictionary } from "../i18n";
import type { EmployeeView, TaskView } from "../server/view-model";

import { StatusBadge, employeeStatus, type EmployeeStatus } from "./status";
import { viewHref } from "./shell";

const deskTone: Record<EmployeeStatus, { screen: string; body: string }> = {
  available: { screen: "fill-sage/40", body: "fill-sage" },
  working: { screen: "fill-blue/50", body: "fill-blue" },
  onVacation: { screen: "fill-parchment", body: "fill-amber" },
};

function Desk({ status }: { readonly status: EmployeeStatus }) {
  const tone = deskTone[status];

  return (
    <svg viewBox="0 0 64 60" className="h-20 w-20" aria-hidden="true">
      <rect
        x="18"
        y="4"
        width="28"
        height="19"
        rx="2"
        className="fill-panel stroke-line"
        strokeWidth="2"
      />
      <rect x="22" y="8" width="20" height="11" rx="1" className={tone.screen} />
      <rect x="6" y="28" width="52" height="4" rx="2" className="fill-parchment" />
      <circle cx="32" cy="40" r="6" className={tone.body} />
      <rect x="23" y="47" width="18" height="11" rx="5.5" className={tone.body} />
    </svg>
  );
}

export function OfficeView({
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
  const activeTasks = tasks.filter((task) => task.status === "working" || task.status === "approval");

  return (
    <>
      <section className="rounded-xl border border-line bg-panel">
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <h2 className="font-mono text-xs tracking-[0.15em] text-muted uppercase">
            {t.office.room}
          </h2>
          <span className="font-mono text-xs text-muted">
            {t.office.coffee} · {t.office.whiteboard}
          </span>
        </div>

        {employees.length === 0 ? (
          <div className="flex flex-col items-start gap-3 px-5 py-10">
            <p className="text-sm text-muted">{t.office.noEmployees}</p>
            <Link
              href={viewHref("people", companyId)}
              className="rounded-md bg-ink px-3 py-1.5 text-sm font-medium text-cream"
            >
              {t.office.hireFirst}
            </Link>
          </div>
        ) : (
          <ul className="flex flex-wrap gap-6 px-5 py-6">
            {employees.map((employee) => {
              const status = employeeStatus(employee.availability, employee.workingOn);

              return (
                <li key={employee.id} className="flex w-28 flex-col items-center gap-1 text-center">
                  <Desk status={status} />
                  <span className="text-sm font-medium text-ink">{employee.name}</span>
                  <StatusBadge label={t.availability[status]} status={status} />
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-line bg-panel">
        <h2 className="border-b border-line px-5 py-3 font-mono text-xs tracking-[0.15em] text-muted uppercase">
          {t.office.activeWork}
        </h2>

        {activeTasks.length === 0 ? (
          <p className="px-5 py-8 text-sm text-muted">{t.office.noActiveWork}</p>
        ) : (
          <ul className="divide-y divide-line">
            {activeTasks.map((task) => (
              <li
                key={task.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
              >
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-medium text-ink">{task.title}</span>
                  <span className="text-xs text-muted">
                    {task.assigneeName ?? t.work.unassigned} · {t.taskStatus[task.status]}
                  </span>
                </div>
                <span className="font-mono text-xs text-muted">{t.work.minutes(task.minutesTaken)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
