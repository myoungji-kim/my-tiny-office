"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import { editEmployeeAction, hireAction } from "../app/people-actions";
import { hireWithCareerAction } from "../app/plaza-actions";
import { MAX_EMPLOYEE_NAME } from "../domain/employee";
import { getDictionary, type Locale } from "../i18n";
import type { CandidateView } from "../server/plaza";
import type { AreaView } from "../server/view-model";
import { CAST, castMember, type CastMember } from "../ui/paint";

import { CareerDialog, type Brought } from "./career-dialog";
import { spanOf } from "./dates";
import { Sprite } from "./sprite";

export interface Choice {
  readonly id: string;
  readonly label: string;
}

export interface Who {
  readonly id: string;
  readonly name: string;
  readonly species: string;
  readonly roleId: string;
  readonly teamId: string | undefined;
}

const Chevron = () => (
  <svg viewBox="0 0 11 8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 1.5l4.5 4.5L10 1.5" />
  </svg>
);

// Every hire after the first opens this dialog; a team is optional. With
// `edit` it corrects who someone already is. With `career`, while the plaza is
// on, it can bring experience from a past session; `from`, a candidate from the
// plaza, arrives with their look and their session.
export function HireDialog({
  locale,
  companyId,
  roles,
  teams,
  team,
  edit,
  career,
  from,
  onHired,
  onClose,
}: {
  readonly locale: Locale;
  readonly companyId: string;
  readonly roles: readonly Choice[];
  readonly teams: readonly Choice[];
  readonly team?: string;
  readonly edit?: Who;
  readonly career?: { readonly areas: readonly AreaView[]; readonly ready: boolean };
  readonly from?: CandidateView;
  readonly onHired?: (id: string, name: string, brought: Brought | undefined) => void;
  readonly onClose: () => void;
}) {
  const t = getDictionary(locale);
  const w = t.hire;
  const [chosen, setChosen] = useState<CastMember | undefined>(edit !== undefined ? castMember(edit.species) : from !== undefined ? castMember(from.species) : undefined);
  const [brought, setBrought] = useState<Brought | undefined>(undefined);
  // from the plaza the session is chosen, so summing it up is the next step
  const [reading, setReading] = useState<CandidateView | "pick" | undefined>(from !== undefined && career?.ready === true ? from : undefined);
  const [name, setName] = useState(edit?.name ?? "");
  const [role, setRole] = useState(edit?.roleId ?? roles[0]?.id ?? "");
  const [teamId, setTeamId] = useState(edit === undefined ? (team ?? "") : (edit.teamId ?? ""));
  const [error, setError] = useState<string | undefined>(undefined);
  const [pending, start] = useTransition();
  const first = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const returnTo = document.activeElement as HTMLElement | null;
    first.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      // a window opened over this one closes first
      if (e.key === "Escape" && document.querySelectorAll(".scrim").length === 1) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      returnTo?.focus({ preventScroll: true });
    };
  }, [onClose]);

  const trimmed = name.trim();
  // A nickname the user did not write is not their employee, so the button waits for both.
  const ready = chosen !== undefined && trimmed !== "" && !pending;

  const hire = () =>
    start(async () => {
      if (chosen === undefined) return;
      const who = { name: trimmed, species: chosen.key, roleId: role, teamId: teamId || undefined };
      // a candidate from the plaza came from their session, summed up or not
      const withCareer = edit === undefined && (brought !== undefined || from !== undefined);
      const result: { readonly id?: string; readonly error?: string } = withCareer
        ? await hireWithCareerAction(companyId, who, { sessionId: brought?.session.id ?? from?.id, expertise: brought?.knows ?? [], style: brought?.style ?? [] })
        : edit === undefined
          ? await hireAction(companyId, who)
          : await editEmployeeAction(companyId, edit.id, who);
      if (result.error !== undefined) {
        setError(t.errors[result.error as keyof typeof t.errors] ?? t.errors.unknown);
        return;
      }
      if (result.id !== undefined) onHired?.(result.id, trimmed, brought);
      onClose();
    });

  return (
    <div className="scrim" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="hire-title">
        <div className="m-hd">
          <span className="m-av">{chosen !== undefined && <Sprite species={chosen.key} size={32} />}</span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span className="m-t" id="hire-title">
              {edit === undefined ? w.title : t.people.editTitle}
            </span>
            <span className="m-s">{edit === undefined ? w.sub : t.people.editSub}</span>
          </span>
          <button className="ibtn" type="button" aria-label={w.cancel} onClick={onClose}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
              <path d="M4.5 4.5l7 7M11.5 4.5l-7 7" />
            </svg>
          </button>
        </div>
        <div className="m-sec">
          <span className="label">{w.species}</span>
          <div className="species">
            {CAST.map((member, i) => (
              <button
                key={member.key}
                ref={i === 0 ? first : undefined}
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
          <div className="picked">
            {chosen !== undefined && (
              <>
                <b>{chosen.species[locale]}</b>
                <span>{chosen.family[locale]}</span>
              </>
            )}
          </div>
          <div className="field">
            <label className="label" htmlFor="hire-name">
              {w.name}
            </label>
            <input
              className="input"
              id="hire-name"
              maxLength={MAX_EMPLOYEE_NAME}
              autoComplete="off"
              value={name}
              placeholder={chosen?.name[locale]}
              onChange={(e) => setName(e.target.value)}
            />
            <span className="hint">{w.nameHint}</span>
          </div>
          <div className="field">
            <label className="label" htmlFor="hire-role">
              {w.role}
            </label>
            <span className="select-wrap">
              <select className="select" id="hire-role" value={role} onChange={(e) => setRole(e.target.value)}>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
              <Chevron />
            </span>
          </div>
          <div className="field">
            <label className="label" htmlFor="hire-team">
              {w.team}
            </label>
            <span className="select-wrap">
              <select className="select" id="hire-team" value={teamId} onChange={(e) => setTeamId(e.target.value)}>
                <option value="">{w.noTeam}</option>
                {teams.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.label}
                  </option>
                ))}
              </select>
              <Chevron />
            </span>
          </div>
          {career !== undefined && edit === undefined && (
            <div className="field">
              <span className="label">{w.career}</span>
              <div className="career">
                {brought !== undefined ? (
                  <>
                    <span className="career-tx">
                      <b>{w.careerLine(brought.session.name, spanOf(locale, brought.session))}</b>
                      <span>{w.careerCarries(brought.knows.length, brought.style.length)}</span>
                    </span>
                    <button className="btn btn-secondary btn-sm" type="button" onClick={() => setReading(from ?? "pick")}>
                      {w.careerChange}
                    </button>
                    <button className="btn btn-secondary btn-sm" type="button" onClick={() => setBrought(undefined)}>
                      {w.careerDrop}
                    </button>
                  </>
                ) : from !== undefined ? (
                  <>
                    <span className="career-tx">
                      <b>{w.careerLine(from.name, spanOf(locale, from))}</b>
                      <span>{career.ready ? w.careerUnread : t.career.needClaude}</span>
                    </span>
                    <button className="btn btn-secondary btn-sm" type="button" disabled={!career.ready} onClick={() => setReading(from)}>
                      {w.careerRead}
                    </button>
                  </>
                ) : (
                  <>
                    <span className="career-tx">
                      <span>{w.careerNone}</span>
                    </span>
                    <button className="btn btn-secondary btn-sm" type="button" onClick={() => setReading("pick")}>
                      {w.careerAdd}
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
          {error !== undefined && (
            <p className="hint" role="alert">
              {error}
            </p>
          )}
        </div>
        <div className="m-foot">
          <button className="btn btn-secondary btn-md" type="button" onClick={onClose}>
            {w.cancel}
          </button>
          <button className="btn btn-primary btn-md" type="button" disabled={!ready} onClick={hire}>
            {edit === undefined ? w.hireAs(trimmed) : t.people.save}
          </button>
        </div>
      </div>
      {reading !== undefined && career !== undefined && (
        <CareerDialog
          locale={locale}
          companyId={companyId}
          areas={career.areas}
          ready={career.ready}
          session={reading === "pick" ? undefined : reading}
          onDone={(next) => {
            setBrought(next ?? undefined);
            setReading(undefined);
          }}
          onClose={() => setReading(undefined)}
        />
      )}
    </div>
  );
}
