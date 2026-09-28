"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import { hireAction } from "../app/actions";
import { MAX_EMPLOYEE_NAME } from "../domain/employee";
import { getDictionary, type Locale } from "../i18n";
import { CAST, type CastMember } from "../ui/paint";

import { Sprite } from "./sprite";

export interface Choice {
  readonly id: string;
  readonly label: string;
}

const Chevron = () => (
  <svg viewBox="0 0 11 8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 1.5l4.5 4.5L10 1.5" />
  </svg>
);

// Every hire after the first opens this dialog; a team is optional.
export function HireDialog({
  locale,
  companyId,
  roles,
  teams,
  team,
  onClose,
}: {
  readonly locale: Locale;
  readonly companyId: string;
  readonly roles: readonly Choice[];
  readonly teams: readonly Choice[];
  readonly team?: string;
  readonly onClose: () => void;
}) {
  const t = getDictionary(locale);
  const w = t.hire;
  const [chosen, setChosen] = useState<CastMember | undefined>(undefined);
  const [name, setName] = useState("");
  const [role, setRole] = useState(roles[0]?.id ?? "");
  const [teamId, setTeamId] = useState(team ?? "");
  const [error, setError] = useState<string | undefined>(undefined);
  const [pending, start] = useTransition();
  const first = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const returnTo = document.activeElement as HTMLElement | null;
    first.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
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
      const result = await hireAction({ companyId, name: trimmed, species: chosen.key, roleId: role, teamId: teamId || undefined });
      if (result.error !== undefined) {
        setError(t.errors[result.error as keyof typeof t.errors] ?? t.errors.unknown);
        return;
      }
      onClose();
    });

  return (
    <div className="scrim" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="hire-title">
        <div className="m-hd">
          <span className="m-av">{chosen !== undefined && <Sprite species={chosen.key} size={32} />}</span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span className="m-t" id="hire-title">
              {w.title}
            </span>
            <span className="m-s">{w.sub}</span>
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
            {w.hireAs(trimmed)}
          </button>
        </div>
      </div>
    </div>
  );
}
