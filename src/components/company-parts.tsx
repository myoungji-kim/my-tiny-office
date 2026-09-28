"use client";

import { useCallback, useEffect, useRef, useState, useTransition, type ReactNode } from "react";

import type { Outcome } from "../app/action-context";
import { addAreaAction, addRoleAction, removeAreaAction, removeRoleAction, renameAreaAction, renameCompanyAction, renameRoleAction } from "../app/company-actions";
import { forgetMemoryAction } from "../app/people-actions";
import { MAX_COMPANY_NAME } from "../domain/company";
import { MAX_AREA_NAME } from "../domain/memory";
import { MAX_NAME } from "../domain/organisation";
import { getDictionary, type Locale } from "../i18n";
import type { AreaView, EmployeeView, MemoryView, RoleView } from "../server/view-model";

import { Icon } from "./icons";
import { MemoryCard } from "./memory-card";
import { MoveDialog } from "./move-dialog";
import { areaName } from "./names";
import { RowMenu } from "./row-menu";
import { Sprite } from "./sprite";
import { TeachDialog } from "./teach-dialog";

// One line of text, saved or put back; the name taken or refused says why in place.
function NameForm({
  className,
  initial,
  max,
  placeholder,
  label,
  save,
  cancel,
  errors,
  onSubmit,
  onDone,
}: {
  readonly className: string;
  readonly initial: string;
  readonly max: number;
  readonly placeholder?: string;
  readonly label: string;
  readonly save: string;
  readonly cancel: string;
  readonly errors: Readonly<Record<string, string>>;
  readonly onSubmit: (name: string) => Promise<Outcome>;
  readonly onDone: () => void;
}) {
  const [name, setName] = useState(initial);
  const [error, setError] = useState<string | undefined>(undefined);
  const [pending, start] = useTransition();
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => input.current?.select(), []);

  return (
    <form
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        const trimmed = name.trim();
        if (trimmed === "") return;
        if (trimmed === initial) return onDone();
        start(async () => {
          const result = await onSubmit(trimmed);
          if (result.error !== undefined) setError(errors[result.error] ?? errors.unknown);
          else onDone();
        });
      }}
    >
      <input
        ref={input}
        className="input"
        maxLength={max}
        autoComplete="off"
        placeholder={placeholder}
        aria-label={label}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && onDone()}
      />
      <button className={className === "co-name" ? "btn btn-primary btn-sm" : "btn btn-primary btn-md"} type="submit" disabled={pending}>
        {save}
      </button>
      <button className={className === "co-name" ? "btn btn-secondary btn-sm" : "btn btn-secondary btn-md"} type="button" onClick={onDone}>
        {cancel}
      </button>
      {error !== undefined && <p className="hint">{error}</p>}
    </form>
  );
}

export function CompanyName({ locale, companyId, name }: { readonly locale: Locale; readonly companyId: string; readonly name: string }) {
  const t = getDictionary(locale);
  const w = t.company;
  const [editing, setEditing] = useState(false);
  const done = useCallback(() => setEditing(false), []);
  return editing ? (
    <NameForm
      className="co-name"
      initial={name}
      max={MAX_COMPANY_NAME}
      label={w.rename}
      save={w.save}
      cancel={w.cancel}
      errors={t.errors}
      onSubmit={(next) => renameCompanyAction(companyId, next)}
      onDone={done}
    />
  ) : (
    <span className="co-name">
      <b>{name}</b>
      <button className="ibtn ibtn-sm" type="button" aria-label={w.rename} onClick={() => setEditing(true)}>
        {Icon.pen}
      </button>
    </span>
  );
}

interface Row {
  readonly id: string;
  readonly label: string;
  readonly members: readonly EmployeeView[];
  readonly count: string;
  // what it holds that has to go somewhere before it can be deleted
  readonly holds: number;
}

interface ListWords {
  readonly add: string;
  readonly menu: string;
  readonly nameLabel: string;
  readonly placeholder: string;
  readonly moveTitle: (label: string) => string;
  readonly moveSub: (n: number) => string;
  readonly moveLabel: string;
  readonly moveConfirm: string;
}

// Both lists the company owns are edited the same way: add at the foot, and a
// row's ⋯ renames it or deletes it, asking where its contents go first.
function ListEditor({
  locale,
  rows,
  words,
  max,
  keepLast,
  empty,
  create,
  rename,
  remove,
}: {
  readonly locale: Locale;
  readonly rows: readonly Row[];
  readonly words: ListWords;
  readonly max: number;
  // a list everyone needs one of keeps its last row
  readonly keepLast: boolean;
  readonly empty: (row: Row) => ReactNode;
  readonly create: (name: string) => Promise<Outcome>;
  readonly rename: (id: string, name: string) => Promise<Outcome>;
  readonly remove: (id: string, into: string | undefined) => Promise<Outcome>;
}) {
  const t = getDictionary(locale);
  const w = t.company;
  const [editing, setEditing] = useState<string | undefined>(undefined);
  const [moving, setMoving] = useState<Row | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const [, start] = useTransition();
  const done = useCallback(() => setEditing(undefined), [setEditing]);
  const stopMoving = useCallback(() => setMoving(undefined), [setMoving]);
  const act = (work: () => Promise<Outcome>) =>
    start(async () => {
      const result = await work();
      setError(result.error === undefined ? undefined : (t.errors[result.error as keyof typeof t.errors] ?? t.errors.unknown));
    });

  const form = (initial: string, submit: (name: string) => Promise<Outcome>) => (
    <NameForm
      className="area-form"
      initial={initial}
      max={max}
      placeholder={words.placeholder}
      label={words.nameLabel}
      save={w.save}
      cancel={w.cancel}
      errors={t.errors}
      onSubmit={submit}
      onDone={done}
    />
  );

  return (
    <>
      {rows.map((row) =>
        editing === row.id ? (
          <div key={row.id}>{form(row.label, (name) => rename(row.id, name))}</div>
        ) : (
          <div key={row.id} className="area-row">
            <span className="area-name">{row.label}</span>
            <span className="knows">
              {row.members.length > 0
                ? row.members.map((p) => (
                    <span key={p.id} className="who">
                      <span>
                        <Sprite species={p.species} size={20} />
                      </span>
                      {p.name}
                    </span>
                  ))
                : empty(row)}
            </span>
            <span className="area-n">{row.count}</span>
            <RowMenu
              label={words.menu}
              keep={w.keep}
              items={[
                { label: w.rename, icon: Icon.pen, run: () => setEditing(row.id) },
                ...(keepLast && rows.length <= 1
                  ? []
                  : [
                      row.holds > 0
                        ? { label: w.remove, icon: Icon.trash, bad: true, run: () => setMoving(row) }
                        : { label: w.remove, icon: Icon.trash, bad: true, confirm: w.removeWhy, run: () => act(() => remove(row.id, undefined)) },
                    ]),
              ]}
            />
          </div>
        ),
      )}
      {editing === "new" ? (
        form("", create)
      ) : (
        <button className="mem-add" type="button" onClick={() => setEditing("new")}>
          {Icon.plus}
          {words.add}
        </button>
      )}
      {error !== undefined && (
        <p className="hint" role="alert">
          {error}
        </p>
      )}
      {moving !== undefined && (
        <MoveDialog
          title={words.moveTitle(moving.label)}
          sub={words.moveSub(moving.holds)}
          label={words.moveLabel}
          options={rows.filter((r) => r.id !== moving.id).map((r) => ({ id: r.id, label: r.label }))}
          cancel={w.cancel}
          confirm={words.moveConfirm}
          onClose={stopMoving}
          onConfirm={(into) => {
            const row = moving;
            stopMoving();
            act(() => remove(row.id, into));
          }}
        />
      )}
    </>
  );
}

// Expertise is taught, never assigned, so an area nobody knows is taught to someone from here.
export function AreasPanel({
  locale,
  companyId,
  areas,
  employees,
  memories,
}: {
  readonly locale: Locale;
  readonly companyId: string;
  readonly areas: readonly AreaView[];
  readonly employees: readonly EmployeeView[];
  readonly memories: readonly MemoryView[];
}) {
  const t = getDictionary(locale);
  const w = t.company;
  const [teaching, setTeaching] = useState<string | undefined>(undefined);
  const stop = useCallback(() => setTeaching(undefined), [setTeaching]);
  const expertise = memories.filter((m) => m.kind === "expertise");
  const knowers = (id: string) => employees.filter((e) => expertise.some((m) => m.employeeId === e.id && m.areaId === id));
  const rows: Row[] = areas.map((a) => {
    const n = expertise.filter((m) => m.areaId === a.id).length;
    return { id: a.id, label: areaName(a, t.areas), members: knowers(a.id), count: w.memCount(n), holds: n };
  });
  const uncovered = rows.filter((r) => r.members.length === 0);

  return (
    <>
      {uncovered.length > 0 && employees.length > 0 && (
        <div className="notice notice-warn">
          <span className="n-ic">{Icon.alert}</span>
          <span className="n-tx">
            <b>{w.nobodyKnowsArea(uncovered.map((r) => r.label))}</b>
            <span>{w.nobodyKnowsWhy}</span>
          </span>
          <span className="n-acts">
            <button className="btn btn-secondary btn-sm" type="button" onClick={() => setTeaching(uncovered[0].id)}>
              {w.pickSomeone}
            </button>
          </span>
        </div>
      )}
      <div className="panel">
        <div className="panel-hd">
          <h2>{w.areasTitle}</h2>
          <p>{w.areasSub}</p>
        </div>
        <div className="panel-bd">
          <ListEditor
            locale={locale}
            rows={rows}
            max={MAX_AREA_NAME}
            keepLast={false}
            words={{
              add: w.addArea,
              menu: w.areaMenu,
              nameLabel: w.areaName,
              placeholder: w.areaPlaceholder,
              moveTitle: w.moveTitle,
              moveSub: w.moveSub,
              moveLabel: w.moveTo,
              moveConfirm: w.moveAndRemove,
            }}
            empty={(row) => (
              <span className="none">
                {w.nobodyYet}
                {employees.length > 0 && (
                  <>
                    {" · "}
                    <button className="teach-link" type="button" onClick={() => setTeaching(row.id)}>
                      {w.teachLink}
                    </button>
                  </>
                )}
              </span>
            )}
            create={(name) => addAreaAction(companyId, name)}
            rename={(id, name) => renameAreaAction(companyId, id, name)}
            remove={(id, into) => removeAreaAction(companyId, id, into)}
          />
        </div>
      </div>
      {teaching !== undefined && (
        <TeachDialog
          locale={locale}
          companyId={companyId}
          target={{ kind: "pick", people: employees }}
          memories={memories}
          areas={areas}
          area={teaching}
          onClose={stop}
        />
      )}
    </>
  );
}

export function RolesPanel({
  locale,
  companyId,
  roles,
  employees,
}: {
  readonly locale: Locale;
  readonly companyId: string;
  readonly roles: readonly RoleView[];
  readonly employees: readonly EmployeeView[];
}) {
  const t = getDictionary(locale);
  const w = t.company;
  const rows: Row[] = roles.map((r) => {
    const holders = employees.filter((e) => e.roleId === r.id);
    return { id: r.id, label: r.name, members: holders, count: w.peopleCount(holders.length), holds: holders.length };
  });
  return (
    <div className="panel">
      <div className="panel-hd">
        <h2>{w.rolesTitle}</h2>
        <p>{w.rolesSub}</p>
      </div>
      <div className="panel-bd">
        <ListEditor
          locale={locale}
          rows={rows}
          max={MAX_NAME}
          keepLast
          words={{
            add: w.addRole,
            menu: w.roleMenu,
            nameLabel: w.roleName,
            placeholder: w.rolePlaceholder,
            moveTitle: w.moveRoleTitle,
            moveSub: w.moveRoleSub,
            moveLabel: w.moveRoleTo,
            moveConfirm: w.changeAndRemove,
          }}
          empty={() => <span className="none">{w.nobodyYet}</span>}
          create={(name) => addRoleAction(companyId, name)}
          rename={(id, name) => renameRoleAction(companyId, id, name)}
          remove={(id, into) => removeRoleAction(companyId, id, into)}
        />
      </div>
    </div>
  );
}

// What everyone follows; it has no area and goes into every task.
export function CompanyMemory({
  locale,
  companyId,
  memories,
  areas,
}: {
  readonly locale: Locale;
  readonly companyId: string;
  readonly memories: readonly MemoryView[];
  readonly areas: readonly AreaView[];
}) {
  const t = getDictionary(locale);
  const w = t.company;
  const [teaching, setTeaching] = useState<MemoryView | "new" | undefined>(undefined);
  const [, start] = useTransition();
  const stop = useCallback(() => setTeaching(undefined), [setTeaching]);
  const shared = memories.filter((m) => m.kind === "company");

  return (
    <div className="panel">
      <div className="panel-hd">
        <h2>{w.companyTitle}</h2>
        <p>{w.companySub}</p>
      </div>
      <div className="panel-bd">
        {shared.length === 0 && <p className="empty-line">{w.noMemory}</p>}
        {shared.map((m) => (
          <MemoryCard
            key={m.id}
            memory={m}
            words={t.people}
            menu={
              <RowMenu
                className="ibtn ibtn-sm mem-menu"
                label={w.memMenu}
                keep={w.keep}
                items={[
                  { label: t.people.edit, icon: Icon.pen, run: () => setTeaching(m) },
                  { label: w.remove, icon: Icon.trash, bad: true, confirm: w.removeWhy, run: () => start(async () => void (await forgetMemoryAction(companyId, m.id))) },
                ]}
              />
            }
          />
        ))}
        <button className="mem-add" type="button" onClick={() => setTeaching("new")}>
          {Icon.plus}
          {w.tellCompany}
        </button>
      </div>
      {teaching !== undefined && (
        <TeachDialog
          locale={locale}
          companyId={companyId}
          target={{ kind: "company" }}
          memories={memories}
          areas={areas}
          edit={teaching === "new" ? undefined : teaching}
          onClose={stop}
        />
      )}
    </div>
  );
}
