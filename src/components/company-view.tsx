import type { Dictionary } from "../i18n";

export function CompanyView({
  t,
  name,
  description,
  founded,
  employeeCount,
  taskCount,
}: {
  readonly t: Dictionary;
  readonly name: string;
  readonly description: string | undefined;
  readonly founded: string;
  readonly employeeCount: number;
  readonly taskCount: number;
}) {
  const rows: readonly { label: string; value: string }[] = [
    { label: t.company.name, value: name },
    { label: t.company.description, value: description ?? t.company.noDescription },
    { label: t.company.founded, value: founded },
    { label: t.company.employeeCount, value: String(employeeCount) },
    { label: t.company.taskCount, value: String(taskCount) },
  ];

  return (
    <section className="rounded-xl border border-line bg-panel">
      <h2 className="border-b border-line px-5 py-3 font-mono text-xs tracking-[0.15em] text-muted uppercase">
        {t.company.heading}
      </h2>

      <dl className="divide-y divide-line">
        {rows.map((row) => (
          <div key={row.label} className="flex flex-wrap gap-2 px-5 py-3">
            <dt className="w-32 shrink-0 text-sm text-muted">{row.label}</dt>
            <dd className="min-w-0 text-sm text-ink">{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
