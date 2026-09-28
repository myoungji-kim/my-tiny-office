"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import { addTeamAction, moveEmployeeAction, removeTeamAction, renameTeamAction } from "../app/people-actions";
import type { Outcome } from "../app/action-context";
import { MAX_NAME } from "../domain/organisation";
import { getDictionary, type Locale } from "../i18n";
import type { EmployeeView, TeamView } from "../server/view-model";

import { HireDialog, type Choice } from "./hire-dialog";
import { Icon } from "./icons";
import { teamName } from "./names";
import { statusColor } from "./presence";
import { RowMenu } from "./row-menu";
import { Sprite } from "./sprite";

function TeamForm({
  initial,
  words,
  errors,
  onSubmit,
  onCancel,
}: {
  readonly initial: string;
  readonly words: ReturnType<typeof getDictionary>["people"];
  readonly errors: Readonly<Record<string, string>>;
  readonly onSubmit: (name: string) => Promise<Outcome>;
  readonly onCancel: () => void;
}) {
  const [name, setName] = useState(initial);
  const [error, setError] = useState<string | undefined>(undefined);
  const [pending, start] = useTransition();
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => input.current?.select(), []);

  return (
    <form
      className="team-form"
      onSubmit={(e) => {
        e.preventDefault();
        const trimmed = name.trim();
        if (trimmed === "") return;
        if (trimmed === initial) return onCancel();
        start(async () => {
          const result = await onSubmit(trimmed);
          if (result.error !== undefined) setError(errors[result.error] ?? errors.unknown);
          else onCancel();
        });
      }}
    >
      <input
        ref={input}
        className="input"
        maxLength={MAX_NAME}
        autoComplete="off"
        placeholder={words.teamPlaceholder}
        aria-label={words.teamName}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && onCancel()}
      />
      <button className="btn btn-primary btn-md" type="submit" disabled={pending}>
        {words.save}
      </button>
      <button className="btn btn-secondary btn-md" type="button" onClick={onCancel}>
        {words.cancel}
      </button>
      {error !== undefined && <p className="hint">{error}</p>}
    </form>
  );
}

// Removing a team that still has people asks where they go first.
function MoveDialog({
  title,
  sub,
  words,
  options,
  onConfirm,
  onClose,
}: {
  readonly title: string;
  readonly sub: string;
  readonly words: ReturnType<typeof getDictionary>["people"];
  readonly options: readonly Choice[];
  readonly onConfirm: (into: string | undefined) => void;
  readonly onClose: () => void;
}) {
  const [into, setInto] = useState("");
  const cancel = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    cancel.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="scrim" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="move-title">
        <div className="m-hd">
          <span style={{ flex: 1, minWidth: 0 }}>
            <span className="m-t" id="move-title">
              {title}
            </span>
            <span className="m-s">{sub}</span>
          </span>
        </div>
        <div className="m-sec">
          <label className="label" htmlFor="move-to">
            {words.moveToTeam}
          </label>
          <span className="select-wrap">
            <select className="select" id="move-to" value={into} onChange={(e) => setInto(e.target.value)}>
              <option value="">{words.noTeam}</option>
              {options.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
            {Icon.chevron}
          </span>
        </div>
        <div className="m-foot">
          <button ref={cancel} className="btn btn-secondary btn-md" type="button" onClick={onClose}>
            {words.cancel}
          </button>
          <button className="btn btn-danger btn-md" type="button" onClick={() => onConfirm(into || undefined)}>
            {words.moveAndRemove}
          </button>
        </div>
      </div>
    </div>
  );
}

// Teams are the only level; everyone else sits under 팀 없음.
export function OrgChart({
  locale,
  companyId,
  employees,
  teams,
  roles,
}: {
  readonly locale: Locale;
  readonly companyId: string;
  readonly employees: readonly EmployeeView[];
  readonly teams: readonly TeamView[];
  readonly roles: readonly Choice[];
}) {
  const t = getDictionary(locale);
  const w = t.people;
  const [editing, setEditing] = useState<string | undefined>(undefined);
  const [removing, setRemoving] = useState<TeamView | undefined>(undefined);
  const [hireTeam, setHireTeam] = useState<string | undefined>(undefined);
  const [, start] = useTransition();
  const stopEditing = useCallback(() => setEditing(undefined), []);
  const stopRemoving = useCallback(() => setRemoving(undefined), []);
  const stopHiring = useCallback(() => setHireTeam(undefined), []);

  const label = (team: TeamView) => teamName(team, t.teams);
  const choices = teams.map((team) => ({ id: team.id, label: label(team) }));
  const loose = employees.filter((e) => e.teamId === undefined || !teams.some((team) => team.id === e.teamId));
  const act = (work: () => Promise<Outcome>) => start(async () => void (await work()));

  const personCard = (p: EmployeeView) => (
    <div key={p.id} className="tcard-wrap">
      <Link className="tcard" href={`/people/${p.id}`}>
        <span className="t-av">
          <Sprite species={p.species} size={36} />
          <span className="r-live" style={{ background: statusColor[p.status] }} />
        </span>
        <span style={{ minWidth: 0 }}>
          <span className="t-name">{p.name}</span>
          <span className="t-role">{p.role}</span>
        </span>
      </Link>
      <RowMenu
        label={w.personMenu}
        keep={w.keep}
        items={[
          ...teams
            .filter((team) => team.id !== p.teamId)
            .map((team) => ({ label: w.moveInto(label(team)), icon: Icon.swap, run: () => act(() => moveEmployeeAction(companyId, p.id, team.id)) })),
          ...(p.teamId === undefined ? [] : [{ label: w.leaveTeam, icon: Icon.x, run: () => act(() => moveEmployeeAction(companyId, p.id, undefined)) }]),
        ]}
      />
    </div>
  );

  return (
    <div className="org">
      {loose.length > 0 && (
        <div className="team-box">
          <div className="team-box-hd">
            <h2 className="muted">{w.noTeam}</h2>
            <span className="cnt">{loose.length}</span>
          </div>
          <div className="team-bd">
            <div className="tgrid">{loose.map(personCard)}</div>
          </div>
        </div>
      )}

      {teams.map((team) => {
        const members = employees.filter((e) => e.teamId === team.id);
        return (
          <div key={team.id} className="team-box">
            <div className="team-box-hd">
              {editing === team.id ? (
                <TeamForm
                  initial={label(team)}
                  words={w}
                  errors={t.errors}
                  onSubmit={(name) => renameTeamAction(companyId, team.id, name)}
                  onCancel={stopEditing}
                />
              ) : (
                <>
                  <h2>{label(team)}</h2>
                  <span className="cnt">{members.length}</span>
                  <RowMenu
                    label={w.teamMenu}
                    keep={w.keep}
                    items={[
                      { label: w.renameTeam, icon: Icon.pen, run: () => setEditing(team.id) },
                      members.length > 0
                        ? { label: w.remove, icon: Icon.trash, bad: true, run: () => setRemoving(team) }
                        : { label: w.remove, icon: Icon.trash, bad: true, confirm: w.removeWhy, run: () => act(() => removeTeamAction(companyId, team.id, undefined)) },
                    ]}
                  />
                </>
              )}
            </div>
            <div className="team-bd">
              <div className="tgrid">
                {members.map(personCard)}
                {members.length === 0 && (
                  <button className="vacant" type="button" onClick={() => setHireTeam(team.id)}>
                    {Icon.plus}
                    <span>{w.hireInto}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {editing === "new" ? (
        <div className="team-box">
          <div className="team-box-hd">
            <TeamForm initial="" words={w} errors={t.errors} onSubmit={(name) => addTeamAction(companyId, name)} onCancel={stopEditing} />
          </div>
        </div>
      ) : (
        <button className="mem-add" type="button" onClick={() => setEditing("new")}>
          {Icon.plus}
          {w.addTeam}
        </button>
      )}

      {removing !== undefined && (
        <MoveDialog
          title={w.removeTeamTitle(label(removing))}
          sub={w.removeTeamSub(employees.filter((e) => e.teamId === removing.id).length)}
          words={w}
          options={choices.filter((c) => c.id !== removing.id)}
          onClose={stopRemoving}
          onConfirm={(into) => {
            const team = removing;
            stopRemoving();
            act(() => removeTeamAction(companyId, team.id, into));
          }}
        />
      )}

      {hireTeam !== undefined && (
        <HireDialog locale={locale} companyId={companyId} roles={roles} teams={choices} team={hireTeam} onClose={stopHiring} />
      )}
    </div>
  );
}
