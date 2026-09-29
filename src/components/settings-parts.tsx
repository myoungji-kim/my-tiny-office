"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { setExtensionAction, setLocaleAction, setWorkPausedAction, switchCompanyAction } from "../app/actions";
import { deleteCompanyAction } from "../app/company-actions";
import { getDictionary, type Locale } from "../i18n";

import { uploadCompany, type Imported } from "./upload-company";

export function LanguagePicker({
  locale,
  label,
  names,
}: {
  readonly locale: Locale;
  readonly label: string;
  readonly names: Readonly<Record<Locale, string>>;
}) {
  const [, start] = useTransition();
  return (
    <div className="opts" role="radiogroup" aria-label={label}>
      {(Object.keys(names) as Locale[]).map((code) => (
        // each language is named in itself
        <button key={code} className="opt" type="button" role="radio" aria-checked={code === locale} lang={code} onClick={() => start(() => setLocaleAction(code))}>
          {names[code]}
        </button>
      ))}
    </div>
  );
}

interface ExtensionRow {
  readonly id: string;
  readonly name: string;
  readonly about: string | undefined;
  readonly on: boolean;
}

// The user's plugins and skills, each given to employees once ticked.
export function ExtensionPicker({ groups }: { readonly groups: readonly { readonly kind: "plugins" | "skills"; readonly title: string; readonly rows: readonly ExtensionRow[] }[] }) {
  const [pending, start] = useTransition();
  return groups
    .filter((g) => g.rows.length > 0)
    .map((g) => (
      <div key={g.kind} className="ext-group">
        <b>{g.title}</b>
        {g.rows.map((row) => (
          <label key={row.id} className="ext">
            <input type="checkbox" checked={row.on} disabled={pending} onChange={(e) => start(() => setExtensionAction(g.kind, row.id, e.target.checked))} />
            <span className="ext-tx">
              <b>{row.name}</b>
              {row.about !== undefined && <span>{row.about}</span>}
            </span>
          </label>
        ))}
      </div>
    ));
}

export function WorkPicker({ paused, label, auto, pause }: { readonly paused: boolean; readonly label: string; readonly auto: string; readonly pause: string }) {
  const [, start] = useTransition();
  return (
    <div className="opts" role="radiogroup" aria-label={label}>
      <button className="opt" type="button" role="radio" aria-checked={!paused} onClick={() => start(() => setWorkPausedAction(false))}>
        {auto}
      </button>
      <button className="opt" type="button" role="radio" aria-checked={paused} onClick={() => start(() => setWorkPausedAction(true))}>
        {pause}
      </button>
    </div>
  );
}

export function CopyButton({ text, copy, copied }: { readonly text: string; readonly copy: string; readonly copied: string }) {
  const [done, setDone] = useState(false);
  return (
    <button className="btn btn-secondary btn-sm" type="button" onClick={() => void navigator.clipboard.writeText(text).then(() => setDone(true))}>
      {done ? copied : copy}
    </button>
  );
}

export function DeleteCompany({
  companyId,
  name,
  words,
  errors,
}: {
  readonly companyId: string;
  readonly name: string;
  readonly words: {
    readonly deleteButton: string;
    readonly deleteAsk: string;
    readonly deleteLoses: string;
    readonly deleteKeep: string;
    readonly deleteType: string;
    readonly cancel: string;
  };
  readonly errors: Readonly<Record<string, string>>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | undefined>(undefined);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const remove = () =>
    start(async () => {
      const result = await deleteCompanyAction(companyId, typed);
      if (result.error !== undefined) return setError(errors[result.error] ?? errors.unknown);
      setOpen(false);
      router.push("/");
    });

  return (
    <>
      <button className="btn btn-danger btn-sm" type="button" onClick={() => setOpen(true)}>
        {words.deleteButton}
      </button>
      {open && (
        <div className="scrim" onPointerDown={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="modal" role="alertdialog" aria-modal="true" aria-label={words.deleteAsk}>
            <div className="m-hd">
              <span style={{ flex: 1, minWidth: 0 }}>
                <span className="m-t">{words.deleteAsk}</span>
              </span>
            </div>
            <div className="m-sec">
              <span className="m-s">{words.deleteLoses}</span>
              <span className="hint">{words.deleteKeep}</span>
              <div className="field">
                <label className="label" htmlFor="typed-name">
                  {words.deleteType}
                </label>
                <input className="input" id="typed-name" placeholder={name} autoComplete="off" autoFocus value={typed} onChange={(e) => setTyped(e.target.value)} />
              </div>
              {error !== undefined && (
                <p className="hint" role="alert">
                  {error}
                </p>
              )}
            </div>
            <div className="m-foot">
              <button className="btn btn-secondary btn-md" type="button" onClick={() => setOpen(false)}>
                {words.cancel}
              </button>
              <button className="btn btn-danger btn-md" type="button" disabled={pending || typed.trim() !== name} onClick={remove}>
                {words.deleteButton}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


// Moving is a copy of one company's file each way.
export function DataActions({ locale, companyId }: { readonly locale: Locale; readonly companyId: string }) {
  const t = getDictionary(locale);
  const words = t.settings;
  const errors: Readonly<Record<string, string>> = t.errors;
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [imported, setImported] = useState<Imported | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const [pending, start] = useTransition();

  const upload = (file: File) =>
    start(async () => {
      const answer = await uploadCompany(file);
      if ("error" in answer) {
        setImported(undefined);
        setError(errors[answer.error] ?? errors.unknown);
        return;
      }
      setError(undefined);
      setImported(answer);
      router.refresh();
    });

  return (
    <>
      <div className="data-acts">
        <a className="btn btn-secondary btn-sm" href={`/settings/export?company=${companyId}`} download>
          {words.exportDb}
        </a>
        <button className="btn btn-secondary btn-sm" type="button" disabled={pending} onClick={() => input.current?.click()}>
          {words.importDb}
        </button>
        <input
          ref={input}
          type="file"
          accept=".db"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file !== undefined) upload(file);
          }}
        />
      </div>
      {error !== undefined && (
        <p className="hint" role="alert">
          {error}
        </p>
      )}
      {imported !== undefined && (
        <div id="moved">
          <div className="notice notice-warn">
            <span className="n-ic">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 2.2l6 11H2z" />
                <path d="M8 6.6v3M8 11.4v.1" />
              </svg>
            </span>
            <span className="n-tx">
              <b>{words.importedTitle(imported.name)}</b>
              <span>{words.importedBody(imported.foldersToChoose)}</span>
            </span>
            <span className="n-acts">
              <button
                className="btn btn-secondary btn-sm"
                type="button"
                onClick={() =>
                  start(async () => {
                    await switchCompanyAction(imported.companyId);
                    router.push("/");
                  })
                }
              >
                {words.openIt(imported.name)}
              </button>
            </span>
          </div>
        </div>
      )}
    </>
  );
}
