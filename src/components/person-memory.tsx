"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import { forgetMemoryAction, reviseMemoryAction, teachAction } from "../app/people-actions";
import { MAX_MEMORY_TEXT } from "../domain/memory";
import { getDictionary, type Locale } from "../i18n";
import type { AreaView, EmployeeView, MemoryView } from "../server/view-model";

import { Icon } from "./icons";
import { MemoryCard } from "./memory-card";
import { areaName } from "./names";
import { RowMenu } from "./row-menu";
import { TeachDialog } from "./teach-dialog";

// `filter` is an area's id, or undefined for all of them.
export function MemoryPanel({
  locale,
  companyId,
  person,
  memories,
  areas,
  filter,
}: {
  readonly locale: Locale;
  readonly companyId: string;
  readonly person: EmployeeView;
  readonly memories: readonly MemoryView[];
  readonly areas: readonly AreaView[];
  readonly filter: string | undefined;
}) {
  const t = getDictionary(locale);
  const w = t.people;
  const [teaching, setTeaching] = useState<MemoryView | "new" | undefined>(undefined);
  const [, start] = useTransition();
  const stop = useCallback(() => setTeaching(undefined), [setTeaching]);

  const expertise = memories.filter((m) => m.kind === "expertise");
  // In the company's order, so an area does not jump to the top when first taught.
  const known = areas.filter((a) => expertise.some((m) => m.areaId === a.id));
  const shown = filter === undefined ? known : known.filter((a) => a.id === filter);
  const chars = memories.reduce((n, m) => n + m.text.length, 0);
  const title = filter === undefined ? w.memory : areaName(areas.find((a) => a.id === filter) ?? { id: "", starting: undefined, name: "" }, t.areas);

  const card = (m: MemoryView) => (
    <MemoryCard
      key={m.id}
      memory={m}
      words={w}
      menu={
        <RowMenu
            className="ibtn ibtn-sm mem-menu"
            label={w.memMenu}
            keep={w.keep}
            items={[
              { label: w.edit, icon: Icon.pen, run: () => setTeaching(m) },
              { label: w.remove, icon: Icon.trash, bad: true, confirm: w.removeWhy, run: () => start(async () => void (await forgetMemoryAction(companyId, m.id))) },
            ]}
          />
      }
    />
  );

  return (
    <div className="panel">
      <div className="panel-hd">
        <h2>{title}</h2>
        <p>
          {w.carried} · {w.chars(chars)}
        </p>
      </div>
      <div className="panel-bd">
        {shown.length === 0 && <p className="empty-line">{w.noMemory}</p>}
        {filter === undefined
          ? shown.map((a) => {
              const list = expertise.filter((m) => m.areaId === a.id);
              return (
                <div key={a.id} className="mem-group">
                  <div className="mem-hd">
                    <span className="area-chip">{areaName(a, t.areas)}</span>
                    <span className="mem-line" />
                    <span className="count">{list.length}</span>
                  </div>
                  {list.map(card)}
                </div>
              );
            })
          : expertise.filter((m) => m.areaId === filter).map(card)}
        <button className="mem-add" type="button" onClick={() => setTeaching("new")}>
          {Icon.plus}
          {w.tellThem}
        </button>
      </div>
      {teaching !== undefined && (
        <TeachDialog
          locale={locale}
          companyId={companyId}
          target={{ kind: "person", person }}
          memories={memories}
          areas={areas}
          area={filter}
          edit={teaching === "new" ? undefined : teaching}
          onClose={stop}
        />
      )}
    </div>
  );
}

function StyleForm({
  initial,
  words,
  errors,
  onSave,
  onCancel,
  inPlace,
}: {
  readonly initial: string;
  readonly words: ReturnType<typeof getDictionary>["people"];
  readonly errors: Readonly<Record<string, string>>;
  readonly onSave: (text: string) => Promise<{ readonly error?: string }>;
  readonly onCancel: () => void;
  readonly inPlace: boolean;
}) {
  const [text, setText] = useState(initial);
  const [error, setError] = useState<string | undefined>(undefined);
  const [pending, start] = useTransition();
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => input.current?.focus(), []);

  return (
    <>
      <form
        className={inPlace ? "style-form in-place" : "style-form"}
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim() === "") return;
          start(async () => {
            const result = await onSave(text);
            if (result.error !== undefined) setError(errors[result.error] ?? errors.unknown);
            else onCancel();
          });
        }}
      >
        <input
          ref={input}
          className="input"
          maxLength={MAX_MEMORY_TEXT}
          autoComplete="off"
          placeholder={words.stylePlaceholder}
          aria-label={words.addStyle}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && onCancel()}
        />
        <button className="btn btn-primary btn-md" type="submit" disabled={pending}>
          {words.save}
        </button>
        <button className="btn btn-secondary btn-md" type="button" onClick={onCancel}>
          {words.cancel}
        </button>
      </form>
      {error !== undefined && (
        <p className="hint" role="alert">
          {error}
        </p>
      )}
    </>
  );
}

// How someone works goes into every task, whatever its area.
export function StylePanel({
  locale,
  companyId,
  person,
  memories,
}: {
  readonly locale: Locale;
  readonly companyId: string;
  readonly person: EmployeeView;
  readonly memories: readonly MemoryView[];
}) {
  const t = getDictionary(locale);
  const w = t.people;
  const [editing, setEditing] = useState<string | undefined>(undefined);
  const [, start] = useTransition();
  const stop = useCallback(() => setEditing(undefined), [setEditing]);
  const rules = memories.filter((m) => m.kind === "style");

  return (
    <div className="panel">
      <div className="panel-hd">
        <h2>{w.howTheyWork}</h2>
        <p>{w.styleSub}</p>
      </div>
      <div className="panel-bd">
        {rules.map((rule) =>
          editing === rule.id ? (
            <StyleForm
              key={rule.id}
              initial={rule.text}
              words={w}
              errors={t.errors}
              inPlace
              onSave={(text) => reviseMemoryAction(companyId, rule.id, text, undefined)}
              onCancel={stop}
            />
          ) : (
            <div key={rule.id} className="style-line">
              {Icon.hand}
              <span>{rule.text}</span>
                <RowMenu
                  className="ibtn ibtn-sm line-menu"
                  label={w.styleMenu}
                  keep={w.keep}
                  items={[
                    { label: w.edit, icon: Icon.pen, run: () => setEditing(rule.id) },
                    { label: w.remove, icon: Icon.trash, bad: true, confirm: w.removeWhy, run: () => start(async () => void (await forgetMemoryAction(companyId, rule.id))) },
                  ]}
                />
            </div>
          ),
        )}
        {editing === "new" ? (
          <StyleForm
            initial=""
            words={w}
            errors={t.errors}
            inPlace={false}
            onSave={(text) => teachAction(companyId, { kind: "style", employeeId: person.id, areaId: undefined, text, sourceTaskId: undefined })}
            onCancel={stop}
          />
        ) : (
          <button className="mem-add" type="button" onClick={() => setEditing("new")}>
            {Icon.plus}
            {w.addStyle}
          </button>
        )}
      </div>
    </div>
  );
}
