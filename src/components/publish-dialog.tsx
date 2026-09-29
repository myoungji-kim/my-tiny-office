"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import { publishDraftAction, publishTaskAction, type PublishDraft } from "../app/project-actions";
import { getDictionary, type Locale } from "../i18n";

import { Icon } from "./icons";

const BRANCH = (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
    <circle cx="4.5" cy="3.5" r="1.6" />
    <circle cx="4.5" cy="12.5" r="1.6" />
    <circle cx="11.5" cy="5.5" r="1.6" />
    <path d="M4.5 5.1v5.8M11.5 7.1c0 2.4-2.2 3-7 3.6" />
  </svg>
);

const FOLDER = (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
    <path d="M1.8 4.2h4L7 5.8h7.2v6.4H1.8z" />
  </svg>
);

type Draft = Exclude<PublishDraft, { readonly error: string }>;

// What goes where, read before anything leaves the computer: the task's
// branch, the branch it goes into, the remote, and the words of the PR.
function PublishDialog({ locale, companyId, taskId, draft, onClose }: { readonly locale: Locale; readonly companyId: string; readonly taskId: string; readonly draft: Draft; readonly onClose: () => void }) {
  const t = getDictionary(locale);
  const w = t.projects.tk;
  const [base, setBase] = useState(draft.base ?? "");
  const [title, setTitle] = useState(draft.title);
  const [body, setBody] = useState(draft.body);
  const [error, setError] = useState<string | undefined>(undefined);
  const [pending, start] = useTransition();
  const first = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    first.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // what stops it before anything is sent, in the order one would fix it
  const stop = draft.remote === undefined ? t.errors.noRemote : !draft.github ? t.errors.notGitHub : !draft.branchExists ? w.prGoneWhy(draft.branch) : draft.bases.length === 0 ? t.errors.baseNotFound : undefined;

  const send = () =>
    start(async () => {
      const result = await publishTaskAction(companyId, taskId, { base, title, body });
      if (result.error !== undefined) return setError(t.errors[result.error as keyof typeof t.errors] ?? t.errors.unknown);
      onClose();
    });

  return (
    <div className="scrim" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={w.prTitle}>
        <div className="m-hd">
          <span style={{ flex: 1, minWidth: 0 }}>
            <span className="m-t">{w.prTitle}</span>
          </span>
        </div>
        <div className="m-sec">
          {stop !== undefined && (
            <div className="notice notice-bad" style={{ marginBottom: 14 }}>
              <span className="n-ic">{Icon.alert}</span>
              <span className="n-tx">
                <b>{draft.branchExists ? w.prCannot : w.prGone}</b>
                <span>{stop}</span>
              </span>
            </div>
          )}
          <div className="field" style={{ marginTop: 0 }}>
            <span className="label">{w.prHead}</span>
            <div className="folder">
              {BRANCH}
              <span className="path">{draft.branch}</span>
            </div>
            <span className="hint">{w.prHeadHint}</span>
          </div>
          <div className="field">
            <label className="label" htmlFor="pr-base">
              {w.prBase}
            </label>
            <span className="select-wrap">
              <select ref={first} className="select" id="pr-base" value={base} disabled={draft.bases.length === 0} onChange={(e) => setBase(e.target.value)}>
                {draft.bases.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
              {Icon.chevron}
            </span>
            {draft.base !== undefined && <span className="hint">{w.prBaseHint(draft.base)}</span>}
          </div>
          <div className="field">
            <span className="label">{w.prRemote}</span>
            <div className="folder">
              {FOLDER}
              <span className={draft.remote === undefined ? "path empty" : "path"}>{draft.remote === undefined ? w.prNoRemote : "origin · " + draft.remote}</span>
            </div>
          </div>
          <div className="field">
            <label className="label" htmlFor="pr-title">
              {w.prName}
            </label>
            <input className="input" id="pr-title" autoComplete="off" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="field">
            <label className="label" htmlFor="pr-body">
              {w.prBody}
            </label>
            <textarea className="textarea" id="pr-body" rows={8} value={body} onChange={(e) => setBody(e.target.value)} />
            <span className="hint">{w.prHow}</span>
          </div>
          {error !== undefined && (
            <p className="hint" role="alert">
              {error}
            </p>
          )}
        </div>
        <div className="m-foot">
          <button className="btn btn-secondary btn-md" type="button" onClick={onClose}>
            {t.projects.cancel}
          </button>
          <button className="btn btn-primary btn-md" type="button" disabled={pending || stop !== undefined || title.trim() === ""} onClick={send}>
            {pending ? w.prSending : w.prSend}
          </button>
        </div>
      </div>
    </div>
  );
}

// Opens the window with what the repository says now.
export function PublishButton({ locale, companyId, taskId }: { readonly locale: Locale; readonly companyId: string; readonly taskId: string }) {
  const t = getDictionary(locale);
  const [draft, setDraft] = useState<Draft | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const [pending, start] = useTransition();
  const open = () =>
    start(async () => {
      const result = await publishDraftAction(companyId, taskId);
      if ("error" in result) return setError(t.errors[result.error as keyof typeof t.errors] ?? t.errors.unknown);
      setError(undefined);
      setDraft(result);
    });
  return (
    <>
      <button className="btn btn-secondary btn-sm" type="button" disabled={pending} onClick={open}>
        {t.projects.tk.publish}
      </button>
      {error !== undefined && (
        <span className="hint" role="alert" style={{ margin: 0 }}>
          {error}
        </span>
      )}
      {draft !== undefined && <PublishDialog locale={locale} companyId={companyId} taskId={taskId} draft={draft} onClose={() => setDraft(undefined)} />}
    </>
  );
}
