"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { startCompanyAction } from "../app/actions";
import { isReady, type ClaudeCodeStatus } from "../application/runtime-status";
import type { Locale } from "../i18n";
import { CAST, type CastMember } from "../ui/paint";

import { ClaudeChecks, type ClaudeWords } from "./claude-checks";
import { OfficePeek } from "./office-peek";
import { RecheckButton } from "./recheck-button";
import { Sprite } from "./sprite";

export interface FirstRunWords {
  readonly wordmark: string;
  readonly title: string;
  readonly lede: string;
  readonly checkLabel: string;
  readonly checkHint: string;
  readonly startNew: string;
  readonly companyTitle: string;
  readonly companySub: string;
  readonly companyLabel: string;
  readonly companyDefault: string;
  readonly companyHint: string;
  readonly next: string;
  readonly back: string;
  readonly hireTitle: string;
  readonly hireSub: string;
  readonly speciesLabel: string;
  readonly nameLabel: string;
  readonly nameHint: string;
  readonly roleLabel: string;
  readonly hire: string;
  readonly hiring: string;
  readonly opened: string;
  readonly oneEmployee: string;
  readonly noticeTitle: string;
  readonly noticeBody: string;
  readonly toOffice: string;
}

type Step = 1 | 2 | 3 | 4;

// Claude Code first, then the company, then its first hire: the office is
// never reached empty. Nothing is saved until the hire, which makes both.
export function FirstRun({
  locale,
  status: initialStatus,
  roles,
  words,
  claude,
  errors,
  another = false,
}: {
  readonly locale: Locale;
  readonly status: ClaudeCodeStatus;
  readonly roles: readonly string[];
  readonly words: FirstRunWords;
  readonly claude: ClaudeWords;
  readonly errors: Readonly<Record<string, string>>;
  readonly another?: boolean;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [step, setStep] = useState<Step>(another && isReady(initialStatus) ? 2 : 1);
  const [companyName, setCompanyName] = useState(words.companyDefault);
  const [chosen, setChosen] = useState<CastMember | undefined>(undefined);
  const [name, setName] = useState("");
  const [role, setRole] = useState(roles[0] ?? "");
  const [error, setError] = useState<string | undefined>(undefined);
  const [pending, start] = useTransition();
  const ready = isReady(status);

  const hire = () =>
    start(async () => {
      if (chosen === undefined) return;
      const result = await startCompanyAction({ companyName, employeeName: name, species: chosen.key, role });
      if ("error" in result) {
        setError(errors[result.error] ?? errors.unknown);
        return;
      }
      setError(undefined);
      setStep(4);
    });

  return (
    <div className="wizard">
      <div className="steps">
        {[1, 2, 3, 4].map((n) => (
          <i key={n} className={n === step ? "on" : n < step ? "done" : ""} />
        ))}
      </div>

      {step === 1 && (
        <div className="pane">
          <div className="brand">
            <span className="logo">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round">
                <path d="M2 6.5L8 2l6 4.5V13a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1z" />
              </svg>
            </span>
            <span className="wordmark">{words.wordmark}</span>
          </div>
          <h1>{words.title}</h1>
          <p className="lede">{words.lede}</p>
          <OfficePeek />
          <div className="field">
            <span className="label">{words.checkLabel}</span>
            <span className="hint" style={{ margin: "0 0 4px" }}>
              {words.checkHint}
            </span>
            <ClaudeChecks status={status} words={claude} />
            {!ready && (
              <div className="recheck">
                <RecheckButton label={claude.recheck} busyLabel={claude.checking} onChecked={setStatus} />
              </div>
            )}
          </div>
          <div className="acts">
            <button className="btn btn-primary btn-lg" type="button" disabled={!ready} onClick={() => setStep(2)}>
              {words.startNew}
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="pane">
          <h2>{words.companyTitle}</h2>
          <p className="sub">{words.companySub}</p>
          <div className="field">
            <label className="label" htmlFor="company-name">
              {words.companyLabel}
            </label>
            <input
              className="input input-lg"
              id="company-name"
              value={companyName}
              autoComplete="off"
              onChange={(e) => setCompanyName(e.target.value)}
            />
            <span className="hint">{words.companyHint}</span>
          </div>
          <div className="acts">
            <button className="btn btn-ghost btn-lg" type="button" onClick={() => setStep(1)}>
              {words.back}
            </button>
            <button className="btn btn-primary btn-lg" type="button" disabled={companyName.trim() === ""} onClick={() => setStep(3)}>
              {words.next}
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="pane">
          <h2>{words.hireTitle}</h2>
          <p className="sub">{words.hireSub}</p>
          <div className="field">
            <span className="label">{words.speciesLabel}</span>
            <div className="species">
              {CAST.map((member) => (
                <button
                  key={member.key}
                  className="sp"
                  type="button"
                  aria-pressed={chosen?.key === member.key}
                  aria-label={member.species[locale]}
                  onClick={() => setChosen(member)}
                >
                  <Sprite species={member.key} size={34} />
                </button>
              ))}
            </div>
            {chosen !== undefined && (
              <div className="picked">
                <b>{chosen.species[locale]}</b>
                <span>{chosen.family[locale]}</span>
              </div>
            )}
          </div>
          <div className="field">
            <label className="label" htmlFor="employee-name">
              {words.nameLabel}
            </label>
            <input
              className="input input-lg"
              id="employee-name"
              value={name}
              placeholder={(chosen ?? CAST[0]).name[locale]}
              autoComplete="off"
              onChange={(e) => setName(e.target.value)}
            />
            <span className="hint">{words.nameHint}</span>
          </div>
          <div className="field">
            <label className="label" htmlFor="employee-role">
              {words.roleLabel}
            </label>
            <span className="select-wrap">
              <select className="select select-lg" id="employee-role" value={role} onChange={(e) => setRole(e.target.value)}>
                {roles.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <svg viewBox="0 0 12 8" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1.5 2L6 6l4.5-4" />
              </svg>
            </span>
          </div>
          {error !== undefined && (
            <p className="hint" role="alert">
              {error}
            </p>
          )}
          <div className="acts">
            <button className="btn btn-ghost btn-lg" type="button" onClick={() => setStep(2)}>
              {words.back}
            </button>
            {/* A nickname the user did not write is not their employee, so the button waits for both. */}
            <button className="btn btn-primary btn-lg" type="button" disabled={chosen === undefined || name.trim() === "" || pending} onClick={hire}>
              {pending ? words.hiring : words.hire}
            </button>
          </div>
        </div>
      )}

      {step === 4 && chosen !== undefined && (
        <div className="pane">
          <h2>{words.opened}</h2>
          <p className="sub">
            {companyName.trim()} · {words.oneEmployee}
          </p>
          <div className="hired">
            <span className="h-av">
              <Sprite species={chosen.key} size={52} />
              <span className="h-live" />
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span className="h-name">{name.trim()}</span>
              <span className="h-role">{role}</span>
            </span>
          </div>
          <div className="notice">
            <span className="n-ic">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
                <circle cx="8" cy="8" r="6" />
                <path d="M8 7.4v4M8 5.2v.1" />
              </svg>
            </span>
            <span className="n-tx">
              <b>{words.noticeTitle}</b>
              <span>{words.noticeBody}</span>
            </span>
          </div>
          <div className="acts">
            <button
              className="btn btn-primary btn-lg"
              style={{ flex: 1 }}
              type="button"
              onClick={() => {
                router.push("/");
                router.refresh();
              }}
            >
              {words.toOffice}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
