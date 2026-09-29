import Link from "next/link";
import type { ReactNode } from "react";

import { ClaudeChecks } from "../../components/claude-checks";
import { Head } from "../../components/head";
import { Icon } from "../../components/icons";
import { RecheckButton } from "../../components/recheck-button";
import { CopyButton, DataActions, DeleteCompany, LanguagePicker, WorkPicker } from "../../components/settings-parts";
import { Shell } from "../../components/shell";
import { WidthPicker } from "../../components/width-picker";
import { toCompanyId } from "../../domain/ids";
import { getDictionary } from "../../i18n";
import { getCompanyFiles } from "../../infrastructure/persistence/company-files";
import pkg from "../../../package.json";
import { companyScreen, param, workPaused, type SearchParams } from "../screen-data";

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

export default async function SettingsPage({ searchParams }: { searchParams: SearchParams }) {
  const { locale, office, status, company } = await companyScreen();
  const t = getDictionary(locale);
  const w = t.settings;
  const guide = (await param(searchParams, "view")) === "safety";
  const path = getCompanyFiles().pathOf(toCompanyId(company.id));

  const shell = (head: ReactNode, body: ReactNode) => (
    <Shell locale={locale} status={status} companies={office.companies} company={company} employees={office.employees} screen="settings" head={head}>
      {body}
    </Shell>
  );

  if (guide) {
    return shell(
      <div className="head">
        <Link className="crumb" href="/settings">
          {Icon.back}
          <span>{w.title}</span>
        </Link>
        <div className="head-row">
          <span>
            <h1>{w.guideTitle}</h1>
            <span className="sub">{w.guideSub}</span>
          </span>
        </div>
      </div>,
      <div className="set-list guide">
        {w.guide.map((section) => (
          <div key={section.title} className="panel">
            <div className="panel-hd">
              <h2>{section.title}</h2>
            </div>
            <div className="panel-bd">
              <div className="scope">
                {section.rows.map((row) => (
                  <ScopeRow key={row} kind={section.kind} text={row} />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>,
    );
  }

  return shell(
    <Head title={w.title} sub={w.headSub} />,
    <div className="set-list">
      <div className="panel">
        <div className="panel-hd">
          <h2>Claude Code</h2>
          <p>{w.claudeWhy}</p>
        </div>
        <div className="panel-bd">
          <ClaudeChecks status={status} words={t.claude} />
          <div className="recheck">
            <RecheckButton label={t.claude.recheck} busyLabel={t.claude.checking} />
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-hd">
          <h2>{w.scopeTitle}</h2>
          <p>{w.scopeWhy}</p>
        </div>
        <div className="panel-bd">
          <div className="scope">
            {w.brief.yes.map((row) => (
              <ScopeRow key={row} kind="yes" text={row} />
            ))}
            {w.brief.no.map((row) => (
              <ScopeRow key={row} kind="no" text={row} />
            ))}
          </div>
          <div className="scope-acts">
            <Link className="btn btn-secondary btn-sm" href="/settings?view=safety">
              {w.guideOpen}
            </Link>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-hd">
          <h2>{w.workTitle}</h2>
          <p>{w.workWhy}</p>
        </div>
        <div className="panel-bd">
          <WorkPicker paused={workPaused()} label={w.workTitle} auto={w.workAuto} pause={w.workPaused} />
        </div>
      </div>

      <div className="panel">
        <div className="panel-hd">
          <h2>{w.widthTitle}</h2>
          <p>{w.widthWhy}</p>
        </div>
        <div className="panel-bd">
          <WidthPicker label={w.widthTitle} names={w.widthsLong} look="opts" />
        </div>
      </div>

      <div className="panel">
        <div className="panel-hd">
          <h2>{w.langTitle}</h2>
          <p>{w.langWhy}</p>
        </div>
        <div className="panel-bd">
          <LanguagePicker locale={locale} label={w.langTitle} names={w.langNames} />
        </div>
      </div>

      <div className="panel">
        <div className="panel-hd">
          <h2>{w.dataTitle}</h2>
          <p>{w.dataWhy}</p>
        </div>
        <div className="panel-bd">
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
        </div>
      </div>

      <div className="panel panel-danger">
        <div className="panel-hd">
          <h2>{w.deleteTitle}</h2>
        </div>
        <div className="panel-bd">
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
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-bd">
          <div className="kv">
            <span>{w.version}</span>
            <b>v{pkg.version}</b>
          </div>
        </div>
      </div>
    </div>,
  );
}
