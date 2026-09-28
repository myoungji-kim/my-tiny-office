"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { checkFolderAction, editProjectAction, newProjectAction } from "../app/project-actions";
import { isAllowableCommand, MAX_COMMANDS, type Priority } from "../domain/project";
import { getDictionary, type Locale } from "../i18n";
import type { ProjectView } from "../server/view-model";

import { Icon } from "./icons";

const PRIORITIES = ["low", "normal", "high"] as const;

const SCOPE = {
  yes: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.4 8.4l3 3 6.2-6.6" />
    </svg>
  ),
  no: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="8" cy="8" r="5.6" />
      <path d="M4 12L12 4" />
    </svg>
  ),
};

const FOLDER = (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
    <path d="M1.8 4.2h4L7 5.8h7.2v6.4H1.8z" />
  </svg>
);

// A project is a folder as much as it is a name: the office works in it, so
// the dialog asks for it here. Saving with a folder is the consent to work in
// it within exactly the boundary shown.
export function ProjectDialog({
  locale,
  companyId,
  edit,
  onClose,
}: {
  readonly locale: Locale;
  readonly companyId: string;
  readonly edit?: ProjectView;
  readonly onClose: () => void;
}) {
  const t = getDictionary(locale);
  const w = t.projects;
  const router = useRouter();
  const [name, setName] = useState(edit?.name ?? "");
  const [about, setAbout] = useState(edit?.description ?? "");
  const [priority, setPriority] = useState<Priority>(edit?.priority ?? "normal");
  const [folder, setFolder] = useState<string | undefined>(edit?.folder);
  const [typing, setTyping] = useState(edit?.folder === undefined);
  const [typed, setTyped] = useState(edit?.folder ?? "");
  const [runs, setRuns] = useState<readonly string[]>(edit?.commands ?? []);
  const [run, setRun] = useState("");
  const [error, setError] = useState<string | undefined>(undefined);
  const [pending, start] = useTransition();
  const first = useRef<HTMLInputElement>(null);

  useEffect(() => {
    first.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const say = (reason: string) => setError(t.errors[reason as keyof typeof t.errors] ?? t.errors.unknown);

  const check = () =>
    start(async () => {
      if (typed.trim() === "") {
        setFolder(undefined);
        setRuns([]);
        return;
      }
      const result = await checkFolderAction(typed);
      if ("error" in result) return say(result.error);
      setError(undefined);
      setFolder(result.folder);
      setTyped(result.folder);
      setTyping(false);
      if (result.folder !== edit?.folder) setRuns(result.scripts);
    });

  const addRun = () => {
    const value = run.trim();
    if (value === "" || runs.includes(value)) return;
    if (!isAllowableCommand(value)) return say("commandNotAllowable");
    if (runs.length >= MAX_COMMANDS) return say("tooManyCommands");
    setError(undefined);
    setRuns([...runs, value]);
    setRun("");
  };

  const save = () =>
    start(async () => {
      const input = { name, description: about, priority, folder, commands: folder === undefined ? [] : runs };
      if (edit !== undefined) {
        const result = await editProjectAction(companyId, edit.id, input);
        if (result.error !== undefined) return say(result.error);
        return onClose();
      }
      const result = await newProjectAction(companyId, input);
      if (result.error !== undefined) return say(result.error);
      onClose();
      if (result.projectId !== undefined) router.push(`/projects/${result.projectId}`);
    });

  const heading = edit === undefined ? w.newProjectTitle : w.editProjectTitle;

  return (
    <div className="scrim" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={heading}>
        <div className="m-hd">
          <span style={{ flex: 1, minWidth: 0 }}>
            <span className="m-t">{heading}</span>
          </span>
        </div>

        <div className="m-sec">
          <div className="field" style={{ marginTop: 0 }}>
            <label className="label" htmlFor="np-name">
              {w.fName} <span className="req">*</span>
            </label>
            <input ref={first} className="input" id="np-name" placeholder={w.fNamePlaceholder} autoComplete="off" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="field">
            <label className="label" htmlFor="np-desc">
              {w.fAbout}
            </label>
            <input className="input" id="np-desc" placeholder={w.fAboutPlaceholder} autoComplete="off" value={about} onChange={(e) => setAbout(e.target.value)} />
          </div>

          <div className="field">
            <label className="label" htmlFor="np-prio">
              {w.fPriority}
            </label>
            <span className="select-wrap">
              <select className="select" id="np-prio" value={priority} onChange={(e) => setPriority(PRIORITIES.find((p) => p === e.target.value) ?? "normal")}>
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {t.priority[p]}
                  </option>
                ))}
              </select>
              {Icon.chevron}
            </span>
            <span className="hint">{w.projectPrioHint}</span>
          </div>

          <div className="field">
            <label className="label" htmlFor="np-folder">
              {w.workspace}
            </label>
            {typing ? (
              <div className="run-add" style={{ marginTop: 0 }}>
                <input
                  className="input"
                  id="np-folder"
                  placeholder={w.folderPlaceholder}
                  autoComplete="off"
                  spellCheck={false}
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter") return;
                    e.preventDefault();
                    check();
                  }}
                />
                <button className="btn btn-secondary btn-sm" type="button" disabled={pending} onClick={check}>
                  {w.check}
                </button>
              </div>
            ) : (
              <div className="folder">
                {FOLDER}
                <span className="path">{folder}</span>
                <button className="btn btn-secondary btn-sm" type="button" onClick={() => setTyping(true)}>
                  {w.change}
                </button>
              </div>
            )}
            {folder !== undefined && !typing && (
              <div className="scope">
                <div className="scope-row yes">
                  {SCOPE.yes}
                  <span>{w.scopeFiles}</span>
                </div>
                <div className="scope-row yes">
                  {SCOPE.yes}
                  <span>{w.scopeRuns}</span>
                </div>
                <div className="scope-row no">
                  {SCOPE.no}
                  <span>{w.scopeNot}</span>
                </div>
              </div>
            )}
            <span className="hint">{typing ? w.typedFolderHint + " " + w.noFolderHint : folder === undefined ? w.noFolderHint : w.folderHint}</span>
          </div>

          {folder !== undefined && !typing && (
            <div className="field">
              <span className="label">{w.fRuns}</span>
              {runs.length > 0 ? (
                <div className="runs">
                  {runs.map((r) => (
                    <span key={r} className="run">
                      {r}
                      <button type="button" aria-label={w.removeRun(r)} onClick={() => setRuns(runs.filter((x) => x !== r))}>
                        {Icon.x}
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <span className="hint" style={{ marginTop: 0 }}>
                  {w.runsNone}
                </span>
              )}
              <div className="run-add">
                <input
                  className="input"
                  placeholder={w.runPlaceholder}
                  autoComplete="off"
                  spellCheck={false}
                  aria-label={w.fRuns}
                  value={run}
                  onChange={(e) => setRun(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter") return;
                    e.preventDefault();
                    addRun();
                  }}
                />
                <button className="btn btn-secondary btn-sm" type="button" onClick={addRun}>
                  {w.addRun}
                </button>
              </div>
              <span className="hint">{w.runsHint}</span>
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
          <button className="btn btn-primary btn-md" type="button" disabled={pending || name.trim() === "" || (typing && typed.trim() !== "" && typed !== folder)} onClick={save}>
            {edit === undefined ? w.createProject : w.save}
          </button>
        </div>
      </div>
    </div>
  );
}
