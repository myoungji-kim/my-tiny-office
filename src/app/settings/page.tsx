import Link from "next/link";
import { Fragment, type ReactNode } from "react";

import { isReady } from "../../application/runtime-status";
import { CheckRows, ClaudeChecks, type Row } from "../../components/claude-checks";
import { Head } from "../../components/head";
import { Icon } from "../../components/icons";
import { ConnectorCheckButton, RecheckButton } from "../../components/recheck-button";
import { CopyButton, DataActions, DeleteCompany, ExtensionPicker, LanguagePicker, PlazaPicker, WorkPicker } from "../../components/settings-parts";
import { Shell } from "../../components/shell";
import { WidthPicker } from "../../components/width-picker";
import { toCompanyId } from "../../domain/ids";
import { getDictionary, type Dictionary } from "../../i18n";
import { plazaShown } from "../../server/plaza";
import { getCompanyFiles } from "../../infrastructure/persistence/company-files";
import { isAtlassianServer } from "../../infrastructure/runtime/connectors";
import { installedExtensions } from "../../infrastructure/runtime/extensions";
import pkg from "../../../package.json";
import { checkedConnectors, chosenExtensions, companyScreen, param, workPaused, type SearchParams } from "../screen-data";

export const dynamic = "force-dynamic";

const KIND = { yes: Icon.yes, no: Icon.no, ask: Icon.ask } as const;

// `text in backticks` is code.
function withCode(text: string): ReactNode {
  return text.split("`").map((part, i) => (i % 2 === 1 ? <code key={i}>{part}</code> : part));
}

function ScopeRow({ kind, text }: { readonly kind: string; readonly text: string }) {
  return (
    <div className={`scope-row ${kind}`}>
      {KIND[kind as keyof typeof KIND]}
      <span>{withCode(text)}</span>
    </div>
  );
}

const whenText = (locale: string, at: number) =>
  new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(at);

// a connector as the account names it, without the prefix every claude.ai one has
const serverName = (server: string) => server.replace(/^claude_ai_/, "").replace(/_/g, " ");

// Only Atlassian is used; the rest are named so the user sees what the account has.
function connectorRows(servers: readonly string[] | undefined, w: Dictionary["settings"]): Row[] {
  if (servers === undefined) return [{ icon: "wait", title: w.toolsUnchecked, detail: w.toolsUncheckedWhy }];
  if (servers.length === 0) return [{ icon: "wait", title: w.toolsNone, detail: w.toolsNoneWhy }];
  return servers.map((s) => ({
    icon: isAtlassianServer(s) ? "ok" : "wait",
    title: serverName(s),
    detail: isAtlassianServer(s) ? w.toolUse : /github/i.test(s) ? w.toolLater : w.toolUnused,
  }));
}

// One tab at a time, named in the address so a link can open it; Claude Code
// is the one that matters most, so it comes first.
const TABS = ["claude", "skills", "general", "safety", "data"] as const;
type Tab = (typeof TABS)[number];

const TAB_ICON: Readonly<Record<Tab, ReactNode>> = {
  claude: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 5L2 8l2.5 3M11.5 5L14 8l-2.5 3M9.2 3.5L6.8 12.5" />
    </svg>
  ),
  skills: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
      <path d="M8 1.8l1.7 3.9 4.2.4-3.2 2.8 1 4.1L8 10.8 4.3 13l1-4.1-3.2-2.8 4.2-.4z" />
    </svg>
  ),
  general: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <path d="M2.5 4.5h11M2.5 8h11M2.5 11.5h11" />
      <circle cx="5.5" cy="4.5" r="1.3" fill="var(--surface)" />
      <circle cx="10.5" cy="8" r="1.3" fill="var(--surface)" />
      <circle cx="6.5" cy="11.5" r="1.3" fill="var(--surface)" />
    </svg>
  ),
  safety: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
      <path d="M8 1.8l5 2v4c0 3-2.2 5.2-5 6.4-2.8-1.2-5-3.4-5-6.4v-4z" />
    </svg>
  ),
  data: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
      <ellipse cx="8" cy="4" rx="5" ry="2" />
      <path d="M3 4v8c0 1.1 2.2 2 5 2s5-.9 5-2V4M3 8c0 1.1 2.2 2 5 2s5-.9 5-2" />
    </svg>
  ),
};

const panel = (title: string, why: string | undefined, body: ReactNode, className = "panel") => (
  <div className={className}>
    <div className="panel-hd">
      <h2>{title}</h2>
      {why !== undefined && <p>{why}</p>}
    </div>
    <div className="panel-bd">{body}</div>
  </div>
);

export default async function SettingsPage({ searchParams }: { searchParams: SearchParams }) {
  const { locale, office, status, company } = await companyScreen();
  const t = getDictionary(locale);
  const w = t.settings;
  const asked = await param(searchParams, "tab");
  const tab: Tab = TABS.find((x) => x === asked) ?? "claude";
  const path = getCompanyFiles().pathOf(toCompanyId(company.id));
  const connectors = checkedConnectors();
  const chosen = chosenExtensions();
  const installed = tab === "skills" ? installedExtensions() : undefined;
  const names: Readonly<Record<Tab, string>> = { claude: "Claude Code", skills: w.tabSkills, general: w.tabGeneral, safety: w.tabSafety, data: w.tabData };

  return (
    <Shell
      locale={locale}
      status={status}
      companies={office.companies}
      company={company}
      employees={office.employees}
      screen="settings"
      head={
        <Head
          title={w.title}
          sub={w.headSub}
          tabs={TABS.map((x) => (
            <Link key={x} className="tab" role="tab" aria-selected={x === tab} href={x === "claude" ? "/settings" : `/settings?tab=${x}`}>
              {TAB_ICON[x]}
              <span>{names[x]}</span>
            </Link>
          ))}
        />
      }
    >
      <div className="set-list">
        {tab === "claude" && (
          <>
            {panel(
              "Claude Code",
              w.claudeWhy,
              <>
                <ClaudeChecks status={status} words={t.claude} />
                <div className="recheck">
                  <RecheckButton label={t.claude.recheck} busyLabel={t.claude.checking} doneLabel={t.claude.checkedNow} />
                </div>
              </>,
            )}
            {panel(
              w.toolsTitle,
              w.toolsWhy,
              <>
                <CheckRows rows={connectorRows(connectors?.servers, w)} words={t.claude} />
                <div className="recheck">
                  <ConnectorCheckButton label={connectors === undefined ? w.toolsCheck : w.toolsRecheck} busyLabel={w.toolsChecking} doneLabel={t.claude.checkedNow} failed={w.toolsFailed} disabled={!isReady(status)} />
                </div>
                <p className="hint">{!isReady(status) ? w.toolsNeedClaude : connectors === undefined ? w.toolsCost : w.toolsWhen(whenText(locale, connectors.checkedAt))}</p>
              </>,
            )}
          </>
        )}

        {tab === "skills" &&
          installed !== undefined &&
          panel(
            w.extTitle,
            w.extWhy,
            <>
              {installed.plugins.length + installed.skills.length === 0 ? (
                <p className="col-empty" style={{ margin: 0 }}>
                  {w.extNone}
                </p>
              ) : (
                <ExtensionPicker
                  groups={[
                    { kind: "plugins", title: w.extPlugins, rows: installed.plugins.map((x) => ({ id: x.id, name: x.name, about: x.about, on: chosen?.plugins.includes(x.id) === true })) },
                    { kind: "skills", title: w.extSkills, rows: installed.skills.map((x) => ({ id: x.id, name: x.name, about: x.about, on: chosen?.skills.includes(x.id) === true })) },
                  ]}
                />
              )}
              <p className="hint">{w.extHint}</p>
            </>,
          )}

        {tab === "general" && (
          <>
            {panel(w.workTitle, w.workWhy, <WorkPicker paused={workPaused()} label={w.workTitle} auto={w.workAuto} pause={w.workPaused} />)}
            {panel(w.plazaTitle, w.plazaWhy, <PlazaPicker shown={plazaShown()} label={w.plazaTitle} show={w.plazaShow} hide={w.plazaHide} />)}
            {panel(w.widthTitle, w.widthWhy, <WidthPicker label={w.widthTitle} names={w.widthsLong} look="opts" />)}
            {panel(w.langTitle, w.langWhy, <LanguagePicker locale={locale} label={w.langTitle} names={w.langNames} />)}
          </>
        )}

        {tab === "safety" && (
          <>
            {panel(
              w.scopeTitle,
              w.scopeWhy,
              <div className="scope">
                {w.brief.yes.map((row) => (
                  <ScopeRow key={row} kind="yes" text={row} />
                ))}
                {w.brief.no.map((row) => (
                  <ScopeRow key={row} kind="no" text={row} />
                ))}
              </div>,
            )}
            <div className="set-list guide">
              {w.guide.map((section) => (
                <Fragment key={section.title}>
                  {panel(
                    section.title,
                    undefined,
                    <div className="scope">
                      {section.rows.map((row) => (
                        <ScopeRow key={row} kind={section.kind} text={row} />
                      ))}
                    </div>,
                  )}
                </Fragment>
              ))}
            </div>
          </>
        )}

        {tab === "data" && (
          <>
            {panel(
              w.dataTitle,
              w.dataWhy,
              <>
                <div className="folder">
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
                    <path d="M3 1.8h6.4L13 5.4v8.8H3z" />
                    <path d="M9.2 1.8v3.8H13" />
                  </svg>
                  <span className="path">{path}</span>
                  <CopyButton text={path} copy={w.copy} copied={w.copied} />
                </div>
                <span className="hint">{w.dataHint}</span>
                <DataActions locale={locale} companyId={company.id} />
                <span className="hint">{w.moveHint}</span>
              </>,
            )}
            {panel(
              w.deleteTitle,
              undefined,
              <div className="danger-row">
                <p>{w.deleteWhy}</p>
                <DeleteCompany
                  companyId={company.id}
                  name={company.name}
                  errors={t.errors}
                  words={{
                    deleteButton: w.deleteButton,
                    deleteAsk: w.deleteAsk(company.name),
                    deleteLoses: w.deleteLoses(office.employees.length, office.memories.length),
                    deleteKeep: w.deleteKeep,
                    deleteType: w.deleteType,
                    cancel: w.cancel,
                  }}
                />
              </div>,
              "panel panel-danger",
            )}
            <div className="panel">
              <div className="panel-bd">
                <div className="kv">
                  <span>{w.version}</span>
                  <b>v{pkg.version}</b>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </Shell>
  );
}
