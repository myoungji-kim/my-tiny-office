"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";

import { checkFolderAction, editProjectAction, folderExtensionsAction, newProjectAction, pickFolderAction, type FolderOutcome, type OwnExtensionView } from "../app/project-actions";
import { isAllowableCommand, MAX_COMMANDS, type AtlassianWrite, type Priority } from "../domain/project";
import { getDictionary, type Locale } from "../i18n";
import type { ProjectView } from "../server/view-model";

import { Icon } from "./icons";
import { useLatest } from "./use-latest";

const PRIORITIES = ["low", "normal", "high"] as const;

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
  atlassianMissing,
  onClose,
}: {
  readonly locale: Locale;
  readonly companyId: string;
  readonly edit?: ProjectView;
  // the connector check ran here and found no Atlassian
  readonly atlassianMissing: boolean;
  readonly onClose: () => void;
}) {
  const t = getDictionary(locale);
  const w = t.projects;
  const router = useRouter();
  const [name, setName] = useState(edit?.name ?? "");
  const [about, setAbout] = useState(edit?.description ?? "");
  const [priority, setPriority] = useState<Priority>(edit?.priority ?? "normal");
  const [folder, setFolder] = useState<string | undefined>(edit?.folder);
  // a folder from another computer has to be chosen again before it is saved
  const [chosen, setChosen] = useState(edit === undefined || edit.folder === undefined || edit.folderConfirmed);
  const [repository, setRepository] = useState<boolean | undefined>(undefined);
  const [typing, setTyping] = useState(false);
  const [typed, setTyped] = useState("");
  const [runs, setRuns] = useState<readonly string[]>(edit?.commands ?? []);
  const [run, setRun] = useState("");
  const [atlassian, setAtlassian] = useState(edit?.atlassian ?? false);
  const [writes, setWrites] = useState<readonly AtlassianWrite[]>(edit?.writes ?? []);
  // a project's own skills are given unless unticked; its plugins only once ticked
  const [skillsOff, setSkillsOff] = useState<readonly string[]>(edit?.skillsOff ?? []);
  const [pluginsOn, setPluginsOn] = useState<readonly string[]>(edit?.pluginsOn ?? []);
  const [own, setOwn] = useState<{ readonly folder: string; readonly skills: readonly OwnExtensionView[]; readonly plugins: readonly OwnExtensionView[] } | undefined>(undefined);
  const [openFold, setOpenFold] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const [pending, start] = useTransition();
  // the folder dialog waits on the user, so it says so apart from saving
  const [picking, startPicking] = useTransition();
  const first = useRef<HTMLInputElement>(null);

  const latestClose = useLatest(onClose);
  useEffect(() => {
    first.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && latestClose.current();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [latestClose]);

  useEffect(() => {
    if (folder === undefined || !chosen) return;
    let current = true;
    void folderExtensionsAction(folder).then((found) => current && setOwn({ folder, ...found }));
    return () => {
      current = false;
    };
  }, [folder, chosen]);

  const say = (reason: string) => setError(t.errors[reason as keyof typeof t.errors] ?? t.errors.unknown);

  // What the server found at the path, whichever way it was given.
  const accept = (result: FolderOutcome) => {
    if ("error" in result) {
      if (result.error !== "pickCancelled") say(result.error);
      return;
    }
    setError(undefined);
    setFolder(result.folder);
    setChosen(true);
    setRepository(result.repository);
    setTyping(false);
    if (result.folder !== edit?.folder) {
      setRuns(result.scripts);
      setSkillsOff([]);
      setPluginsOn([]);
    }
  };

  const pick = () => startPicking(async () => accept(await pickFolderAction()));

  const check = () =>
    start(async () => {
      if (typed.trim() === "") return setTyping(false);
      accept(await checkFolderAction(typed));
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
      const input = { name, description: about, priority, folder, commands: folder === undefined ? [] : runs, atlassian: folder !== undefined && atlassian, writes: atlassian ? writes : [], skillsOff, pluginsOn };
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
  const found = own !== undefined && own.folder === folder ? own : undefined;
  const ownOn = {
    skills: found?.skills.filter((x) => !skillsOff.includes(x.id)).length ?? 0,
    plugins: found?.plugins.filter((x) => pluginsOn.includes(x.id)).length ?? 0,
  };
  const toolsWarned = atlassian && atlassianMissing;
  const toggle = (list: readonly string[], id: string, on: boolean) => (on ? [...list, id] : list.filter((x) => x !== id));

  // One open at a time; a warning inside keeps its fold open.
  const fold = (key: string, label: string, summary: string, body: ReactNode, force = false) => (
    <details
      className="fold pfold"
      name="pfold"
      open={force || openFold === key}
      onToggle={(e) => {
        const opened = e.currentTarget.open;
        setOpenFold((was) => (opened ? key : was === key ? undefined : was));
      }}
    >
      <summary>
        <span className="label">{label}</span>
        <span className="pfold-sum">{summary}</span>
        <span className="fold-ic">{Icon.chevron}</span>
      </summary>
      {body}
    </details>
  );
  const extRow = (x: OwnExtensionView, on: boolean, change: (on: boolean) => void) => (
    <label key={x.id} className="ext">
      <input type="checkbox" checked={on} onChange={(e) => change(e.target.checked)} />
      <span className="ext-tx">
        <b>{x.name}</b>
        {x.about !== undefined && <span title={x.about}>{x.about}</span>}
      </span>
    </label>
  );

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
            <span className="label">{w.workspace}</span>
            <div className="folder">
              {FOLDER}
              <span className={folder === undefined ? "path empty" : "path"} title={folder}>
                {folder ?? w.noFolder}
              </span>
              <button className="btn btn-secondary btn-sm" type="button" disabled={pending || picking} onClick={pick}>
                {picking ? w.choosing : folder === undefined || !chosen ? w.choose : w.change}
              </button>
            </div>
            {typing ? (
              <div className="run-add">
                <input
                  className="input"
                  aria-label={w.workspace}
                  placeholder={w.folderPlaceholder}
                  autoComplete="off"
                  spellCheck={false}
                  autoFocus
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
                    e.preventDefault();
                    check();
                  }}
                />
                <button className="btn btn-secondary btn-sm" type="button" disabled={pending} onClick={check}>
                  {w.check}
                </button>
              </div>
            ) : (
              <button className="btn btn-ghost btn-sm" type="button" style={{ marginTop: 6, paddingInline: 4 }} onClick={() => setTyping(true)}>
                {w.typeInstead}
              </button>
            )}
            {folder !== undefined && !chosen && (
              <div className="notice notice-warn" style={{ marginTop: 10 }}>
                <span className="n-ic">{Icon.alert}</span>
                <span className="n-tx">
                  <b>{w.folderToChoose}</b>
                  <span>{w.folderToChooseWhy}</span>
                </span>
              </div>
            )}
            {chosen && repository === false && (
              <div className="notice notice-warn" style={{ marginTop: 10 }}>
                <span className="n-ic">{Icon.alert}</span>
                <span className="n-tx">
                  <b>{w.notRepository}</b>
                  <span>{w.notRepositoryWhy}</span>
                </span>
              </div>
            )}
            {folder !== undefined && chosen && (
              <div className="scope">
                <div className="scope-row yes">
                  {Icon.yes}
                  <span>{w.scopeFiles}</span>
                </div>
                <div className="scope-row yes">
                  {Icon.yes}
                  <span>{w.scopeRuns}</span>
                </div>
                <div className="scope-row no">
                  {Icon.no}
                  <span>{atlassian ? w.scopeNotTools : w.scopeNot}</span>
                </div>
              </div>
            )}
            <span className="hint">
              {folder === undefined ? w.noFolderHint : w.folderHint}{" "}
              {folder !== undefined && <Link href="/settings?tab=safety">{w.scopeMore}</Link>}
            </span>
          </div>

          {folder !== undefined &&
            chosen &&
            fold(
              "runs",
              w.fRuns,
              runs.length > 0 ? w.sumRuns(runs[0], runs.length - 1) : w.sumNone,
              <div className="field">
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
                      if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
                      e.preventDefault();
                      addRun();
                    }}
                  />
                  <button className="btn btn-secondary btn-sm" type="button" onClick={addRun}>
                    {w.addRun}
                  </button>
                </div>
                <span className="hint">{w.runsHint}</span>
              </div>,
            )}

          {folder !== undefined &&
            chosen &&
            fold(
              "tools",
              w.fTools,
              atlassian ? w.toolsOn + (writes.length > 0 ? w.sumWrites(writes.length) : "") : w.toolsOff,
              <>
                <div className="field">
                  <div className="opts" role="radiogroup" aria-label={w.fTools}>
                    <button className="opt" type="button" role="radio" aria-checked={!atlassian} onClick={() => setAtlassian(false)}>
                      {w.toolsOff}
                    </button>
                    <button className="opt" type="button" role="radio" aria-checked={atlassian} onClick={() => setAtlassian(true)}>
                      {w.toolsOn}
                    </button>
                  </div>
                  <span className="hint">{w.toolsHint}</span>
                  {toolsWarned && (
                    <div className="notice notice-warn" style={{ marginTop: 10 }}>
                      <span className="n-ic">{Icon.alert}</span>
                      <span className="n-tx">
                        <b>{w.toolsMissing}</b>
                        <span>{w.toolsMissingWhy}</span>
                      </span>
                    </div>
                  )}
                </div>
                {atlassian && (
                  <div className="field">
                    <span className="label">{w.fWrites}</span>
                    {writes.length > 0 ? (
                      <div className="runs">
                        {writes.map((x) => (
                          <span key={x} className="run word">
                            {w.writes[x]}
                            <button type="button" aria-label={w.removeWrite(w.writes[x])} onClick={() => setWrites(writes.filter((y) => y !== x))}>
                              {Icon.x}
                            </button>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="hint" style={{ marginTop: 0 }}>
                        {w.writesNone}
                      </span>
                    )}
                  </div>
                )}
              </>,
              toolsWarned,
            )}

          {folder !== undefined &&
            chosen &&
            fold(
              "ext",
              w.fOwnExt,
              ownOn.skills + ownOn.plugins > 0 ? w.sumExt(ownOn.skills, ownOn.plugins) : w.sumNone,
              <div className="field">
                {found !== undefined && found.skills.length + found.plugins.length > 0 ? (
                  <>
                    {found.skills.length > 0 && (
                      <div className="ext-group">
                        <b>{w.ownSkills}</b>
                        {found.skills.map((x) => extRow(x, !skillsOff.includes(x.id), (on) => setSkillsOff(toggle(skillsOff, x.id, !on))))}
                      </div>
                    )}
                    {found.plugins.length > 0 && (
                      <div className="ext-group">
                        <b>{w.ownPlugins}</b>
                        {found.plugins.map((x) => extRow(x, pluginsOn.includes(x.id), (on) => setPluginsOn(toggle(pluginsOn, x.id, on))))}
                      </div>
                    )}
                  </>
                ) : (
                  <span className="hint" style={{ marginTop: 0 }}>
                    {w.ownNone}
                  </span>
                )}
                <span className="hint">
                  {w.ownHint} <Link href="/settings?tab=skills">{w.ownEveryProject}</Link>
                  {w.ownHintEnd}
                </span>
              </div>,
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
          <button className="btn btn-primary btn-md" type="button" disabled={pending || picking || name.trim() === "" || (folder !== undefined && !chosen)} onClick={save}>
            {edit === undefined ? w.createProject : w.save}
          </button>
        </div>
      </div>
    </div>
  );
}
