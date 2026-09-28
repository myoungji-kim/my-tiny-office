import Link from "next/link";
import type { ReactNode } from "react";

import type { ClaudeCodeStatus } from "../application/runtime-status";
import { getDictionary, type Locale } from "../i18n";
import type { CompanyOption, EmployeeView } from "../server/view-model";

import { CompanyMenu } from "./company-menu";
import { statusClass } from "./presence";
import { RuntimeNotice } from "./runtime-notice";
import { Sprite } from "./sprite";

import pkg from "../../package.json";

export type Screen = "office" | "projects" | "people" | "company" | "settings";

const HREF: Readonly<Record<Screen, string>> = {
  office: "/",
  projects: "/projects",
  people: "/people",
  company: "/company",
  settings: "/settings",
};

const ICON: Readonly<Record<Screen, ReactNode>> = {
  office: (
    <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
      <rect x="2.5" y="3.5" width="13" height="11.5" rx="1.5" />
      <path d="M6 7.5h1.8M10.2 7.5H12M6 11h1.8M10.2 11H12" />
    </svg>
  ),
  projects: (
    <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
      <path d="M2.5 5.5h4.5L8.5 8h7v6.5h-13z" />
    </svg>
  ),
  people: (
    <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="9" cy="6" r="2.8" />
      <path d="M3.5 15c0-3 2.5-5.5 5.5-5.5s5.5 2.5 5.5 5.5" />
    </svg>
  ),
  company: (
    <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <path d="M3.5 14.5v-3.5M9 14.5v-7M14.5 14.5v-10.5" />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
};

function NavLink({ screen, current, label }: { readonly screen: Screen; readonly current: Screen; readonly label: string }) {
  return (
    <Link href={HREF[screen]} aria-current={screen === current ? "page" : undefined}>
      {ICON[screen]}
      <span>{label}</span>
    </Link>
  );
}

// Whichever screen is open, the sidebar shows who is in and what they are doing,
// and a stopped Claude Code is said first, above the screen's own content.
export function Shell({
  locale,
  status,
  companies,
  company,
  employees,
  screen,
  current,
  head,
  children,
}: {
  readonly locale: Locale;
  readonly status: ClaudeCodeStatus;
  readonly companies: readonly CompanyOption[];
  readonly company: CompanyOption;
  readonly employees: readonly EmployeeView[];
  readonly screen: Screen;
  // the person whose page is open
  readonly current?: string;
  readonly head: ReactNode;
  readonly children: ReactNode;
}) {
  const t = getDictionary(locale);
  return (
    <div className="app" data-screen={screen}>
      <nav className="side">
        <div className="side-head">
          <Link className="side-top" href={HREF.company}>
            <span className="logo">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
                <path d="M2 6.5L8 2l6 4.5V13a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1z" />
              </svg>
            </span>
            <span className="side-id">
              <span className="side-name">{company.name}</span>
              <span className="side-ver">v{pkg.version}</span>
            </span>
          </Link>
          <CompanyMenu companies={companies} currentId={company.id} words={t.companies} />
        </div>

        <div className="nav">
          {(["office", "projects", "people", "company"] as const).map((s) => (
            <NavLink key={s} screen={s} current={screen} label={t.nav[s]} />
          ))}
        </div>

        <div className="rule" />
        <div>
          {employees.map((e) => (
            <Link key={e.id} className="member" href={`/people/${e.id}`} aria-current={e.id === current ? "page" : undefined}>
              <span className="av">
                <Sprite species={e.species} size={22} />
              </span>
              <span>{e.name}</span>
              <span className="m-state">
                <span className={`dot ${statusClass(e.status)}`} />
              </span>
            </Link>
          ))}
        </div>

        <div className="side-foot">
          <div className="rule" style={{ margin: "0 4px 10px" }} />
          <div className="nav">
            <NavLink screen="settings" current={screen} label={t.nav.settings} />
          </div>
        </div>
      </nav>

      <div className="main">
        {head}
        <div className="body">
          <RuntimeNotice status={status} words={t.claude} />
          {children}
        </div>
      </div>
    </div>
  );
}
