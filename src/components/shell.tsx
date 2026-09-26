import Link from "next/link";
import type { ReactNode } from "react";

import type { Dictionary } from "../i18n";
import type { CompanyOption } from "../server/view-model";

import { CompanySwitcher } from "./company-switcher";

export type View = "office" | "people" | "work" | "company";

export const views: readonly View[] = ["office", "people", "work", "company"];

export function viewHref(view: View, companyId: string): string {
  return `/?view=${view}&company=${encodeURIComponent(companyId)}`;
}

export function Shell({
  t,
  companies,
  companyId,
  companyName,
  view,
  children,
}: {
  readonly t: Dictionary;
  readonly companies: readonly CompanyOption[];
  readonly companyId: string;
  readonly companyName: string;
  readonly view: View;
  readonly children: ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-3">
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-sm tracking-[0.2em] text-ink uppercase">
              {t.app.title}
            </span>
            <span className="hidden text-xs text-muted sm:inline">{t.app.tagline}</span>
          </div>

          <div className="flex items-center gap-4">
            {companies.length > 1 ? (
              <CompanySwitcher
                companies={companies}
                currentId={companyId}
                label={t.company.switch}
              />
            ) : (
              <span className="text-sm font-medium text-ink">{companyName}</span>
            )}
            <span className="flex items-center gap-1.5 font-mono text-xs text-muted">
              <span className="size-1.5 rounded-full bg-sage" />
              {t.app.systemOk}
            </span>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-6 py-6 md:grid-cols-[9rem_1fr]">
        <nav className="flex gap-1 md:flex-col">
          {views.map((candidate) => (
            <Link
              key={candidate}
              href={viewHref(candidate, companyId)}
              className={`rounded-md px-3 py-1.5 text-sm transition ${
                candidate === view
                  ? "bg-ink font-medium text-cream"
                  : "text-muted hover:bg-parchment hover:text-ink"
              }`}
            >
              {t.nav[candidate]}
            </Link>
          ))}
        </nav>

        <main className="flex min-w-0 flex-col gap-6">{children}</main>
      </div>
    </div>
  );
}
