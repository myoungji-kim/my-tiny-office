"use client";

import { useEffect, useRef, useState } from "react";

import { candidatesAction, readCareerAction, type CareerRead } from "../app/plaza-actions";
import { getDictionary, type Locale } from "../i18n";
import type { CandidateView } from "../server/plaza";
import type { AreaView } from "../server/view-model";

import { spanOf } from "./dates";
import { Icon } from "./icons";
import { areaName } from "./names";

export interface Brought {
  readonly session: CandidateView;
  readonly knows: readonly { readonly areaId: string; readonly text: string }[];
  readonly style: readonly string[];
}

type Line = { areaId?: string; text: string; on: boolean; known: boolean };
type Summed = { readonly knows: Line[]; readonly style: Line[]; readonly dropped: number; readonly cut: boolean };
type Step = "pick" | "reading" | "keep" | "failed" | "empty";

const Chevron = () => (
  <svg viewBox="0 0 11 8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 1.5l4.5 4.5L10 1.5" />
  </svg>
);

// Pick a session, one read-only Claude run sums it up, and the user keeps
// what the hire brings. Given a session, it starts at reading.
export function CareerDialog({
  locale,
  companyId,
  areas,
  ready,
  session,
  onDone,
  onClose,
}: {
  readonly locale: Locale;
  readonly companyId: string;
  readonly areas: readonly AreaView[];
  readonly ready: boolean;
  readonly session?: CandidateView;
  // null: hire without it
  readonly onDone: (brought: Brought | null) => void;
  readonly onClose: () => void;
}) {
  const t = getDictionary(locale);
  const w = t.career;
  const [pool, setPool] = useState<readonly CandidateView[] | undefined>(session === undefined ? undefined : [session]);
  const [folder, setFolder] = useState(session?.folder);
  const [chosen, setChosen] = useState<CandidateView | undefined>(session);
  const [step, setStep] = useState<Step>(session !== undefined && ready ? "reading" : "pick");
  const [summed, setSummed] = useState<Summed | undefined>(undefined);
  // what a session summed up to, so going back and forth does not read it again
  const cache = useRef(new Map<string, Summed>());
  const modal = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const returnTo = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && modal.current?.parentElement === [...document.querySelectorAll(".scrim")].at(-1)) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      returnTo?.focus({ preventScroll: true });
    };
  }, [onClose]);

  useEffect(() => {
    modal.current?.querySelector<HTMLElement>("select, button.sess:not(:disabled), textarea, [data-forward], [data-close]")?.focus({ preventScroll: true });
  }, [step, pool]);

  useEffect(() => {
    if (pool !== undefined) return;
    void candidatesAction(companyId).then((found) => {
      const usable = found.filter((c) => !c.hidden);
      setPool(usable);
      setFolder((f) => f ?? usable[0]?.folder);
    });
  }, [companyId, pool]);

  const read = (s: CandidateView) => {
    const known = cache.current.get(s.id);
    if (known !== undefined) {
      setSummed(known);
      return setStep(known.knows.length + known.style.length === 0 ? "empty" : "keep");
    }
    setStep("reading");
    void readCareerAction(companyId, s.id).then((result: CareerRead) => {
      if ("error" in result) return setStep("failed");
      const next: Summed = {
        knows: result.knows.map((k) => ({ areaId: k.areaId, text: k.text, on: !k.known, known: k.known })),
        style: result.style.map((x) => ({ text: x.text, on: !x.known, known: x.known })),
        dropped: result.dropped,
        cut: result.cut,
      };
      cache.current.set(s.id, next);
      setSummed(next);
      setStep(next.knows.length + next.style.length === 0 ? "empty" : "keep");
    });
  };

  // a session handed in is read as soon as the window opens
  const started = useRef(false);
  useEffect(() => {
    if (started.current || session === undefined || !ready) return;
    started.current = true;
    read(session);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const head = (sub: string) => (
    <div className="m-hd">
      <span style={{ flex: 1, minWidth: 0 }}>
        <span className="m-t">{w.title}</span>
        <span className="m-s">{sub}</span>
      </span>
      <button className="ibtn" type="button" data-close aria-label={w.cancel} onClick={onClose}>
        {Icon.x}
      </button>
    </div>
  );
  const which = chosen !== undefined && (
    <div className="sess" aria-disabled="true" style={{ cursor: "default" }}>
      <span className="sess-tx">
        <b>{chosen.firstMessage}</b>
        <span>
          {chosen.folder} · {w.turns(chosen.messages, spanOf(locale, chosen))}
        </span>
      </span>
    </div>
  );
  const kept = summed === undefined ? 0 : [...summed.knows, ...summed.style].filter((l) => l.on && l.text.trim() !== "").length;
  const change = (kind: "knows" | "style", i: number, patch: Partial<Line>) =>
    setSummed((s) => (s === undefined ? s : { ...s, [kind]: s[kind].map((l, j) => (j === i ? { ...l, ...patch } : l)) }));

  const take = () => {
    if (summed === undefined || chosen === undefined) return;
    if (kept === 0) return onDone(null);
    const on = (l: Line) => l.on && l.text.trim() !== "";
    onDone({
      session: chosen,
      knows: summed.knows.filter(on).map((l) => ({ areaId: l.areaId ?? "", text: l.text.trim() })),
      style: summed.style.filter(on).map((l) => l.text.trim()),
    });
  };

  const folders = [...new Set((pool ?? []).map((c) => c.folder))];
  const inFolder = (pool ?? []).filter((c) => c.folder === folder);

  const body = () => {
    if (step === "pick") {
      if (pool === undefined) return <div className="m-sec"><div className="reading" role="status"><b>{w.loading}</b></div></div>;
      if (folders.length === 0) return <div className="m-sec"><p className="hint" style={{ margin: 0 }}>{w.noFolders}</p></div>;
      return (
        <div className="m-sec">
          <div className="field" style={{ marginTop: 0 }}>
            <label className="label" htmlFor="career-folder">
              {w.folder}
            </label>
            <span className="select-wrap">
              <select className="select" id="career-folder" value={folder} onChange={(e) => (setFolder(e.target.value), setChosen(undefined))}>
                {folders.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
              <Chevron />
            </span>
          </div>
          <div className="field">
            <span className="label">{w.sessions}</span>
            {inFolder.length === 0 ? (
              <p className="hint">{w.none}</p>
            ) : (
              <div className="sessions" role="radiogroup" aria-label={w.sessions}>
                {inFolder.map((c) => (
                  <button key={c.id} className="sess" type="button" role="radio" aria-checked={chosen?.id === c.id} disabled={c.inUse} onClick={() => setChosen(c)}>
                    <span className="sess-tx">
                      <b>{c.firstMessage}</b>
                      <span>{c.inUse ? w.live : w.turns(c.messages, spanOf(locale, c))}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
            <span className="hint">{ready ? w.cost : w.needClaude}</span>
          </div>
        </div>
      );
    }
    if (step === "reading")
      return (
        <div className="m-sec">
          {which}
          <div className="reading" role="status">
            <b>{w.reading}</b>
            <span>{w.readingWhy}</span>
          </div>
          <p className="hint" style={{ margin: 0 }}>
            {w.cost}
          </p>
        </div>
      );
    if (step === "failed" || step === "empty")
      return (
        <div className="m-sec">
          {which}
          <div className={`notice ${step === "failed" ? "notice-bad" : "notice-warn"}`} style={{ marginTop: 10 }}>
            <span className="n-ic">{Icon.alert}</span>
            <span className="n-tx">
              <b>{step === "failed" ? w.failTitle : w.emptyTitle}</b>
              <span>{step === "failed" ? w.failWhy : w.emptyWhy}</span>
            </span>
          </div>
        </div>
      );
    if (summed === undefined) return null;
    const warned = [summed.dropped > 0 ? w.dropped(summed.dropped) : "", summed.cut ? w.skipped : ""].filter(Boolean);
    const row = (kind: "knows" | "style", l: Line, i: number) => (
      <div key={kind + i} className="cand" data-off={l.on ? undefined : ""}>
        <input type="checkbox" checked={l.on} aria-label={`${w.keep}: ${l.text}`} onChange={(e) => change(kind, i, { on: e.target.checked })} />
        <span className="cand-body">
          {kind === "knows" && (
            <span className="select-wrap">
              <select className="select" aria-label={w.area} value={l.areaId} onChange={(e) => change(kind, i, { areaId: e.target.value })}>
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {areaName(a, t.areas)}
                  </option>
                ))}
              </select>
              <Chevron />
            </span>
          )}
          {l.known && (
            <span className="hint" style={{ margin: 0 }}>
              {w.known}
            </span>
          )}
          <textarea
            className="textarea"
            rows={2}
            maxLength={200}
            aria-label={kind === "knows" ? w.knows : w.style}
            value={l.text}
            onChange={(e) => change(kind, i, { text: e.target.value })}
          />
        </span>
      </div>
    );
    return (
      <div className="m-sec">
        {which}
        {warned.length > 0 && (
          <div className="notice notice-warn" style={{ margin: "10px 0 14px" }}>
            <span className="n-ic">{Icon.alert}</span>
            <span className="n-tx">
              <b>{warned[0]}</b>
              {warned[1] !== undefined && <span>{warned[1]}</span>}
            </span>
          </div>
        )}
        <p className="hint" style={{ margin: "0 0 4px" }}>
          {w.pick}
        </p>
        {summed.knows.length > 0 && (
          <div className="cand-group">
            <span className="label">{w.knows}</span>
            {summed.knows.map((l, i) => row("knows", l, i))}
          </div>
        )}
        {summed.style.length > 0 && (
          <div className="cand-group">
            <span className="label">{w.style}</span>
            {summed.style.map((l, i) => row("style", l, i))}
          </div>
        )}
      </div>
    );
  };

  const foot = () => {
    const cancel = (
      <button className="btn btn-secondary btn-md" type="button" data-close onClick={onClose}>
        {w.cancel}
      </button>
    );
    if (step === "pick")
      return (
        <>
          {cancel}
          <button className="btn btn-primary btn-md" type="button" disabled={chosen === undefined || !ready} onClick={() => chosen !== undefined && read(chosen)}>
            {w.read}
          </button>
        </>
      );
    if (step === "reading") return cancel;
    if (step === "failed")
      return (
        <>
          <button className="btn btn-secondary btn-md" type="button" onClick={() => onDone(null)}>
            {w.without}
          </button>
          <button className="btn btn-primary btn-md" type="button" data-forward onClick={() => chosen !== undefined && read(chosen)}>
            {w.retry}
          </button>
        </>
      );
    if (step === "empty")
      return (
        <>
          <button className="btn btn-secondary btn-md" type="button" onClick={() => (setChosen(undefined), setPool(undefined), setStep("pick"))}>
            {w.other}
          </button>
          <button className="btn btn-primary btn-md" type="button" data-forward onClick={() => onDone(null)}>
            {w.asNew}
          </button>
        </>
      );
    return (
      <>
        <button className="btn btn-secondary btn-md" type="button" onClick={() => (setPool(pool && pool.length > 1 ? pool : undefined), setStep("pick"))}>
          {w.back}
        </button>
        <button className="btn btn-primary btn-md" type="button" data-forward onClick={take}>
          {kept > 0 ? w.take(kept) : w.asNew}
        </button>
      </>
    );
  };

  return (
    <div className="scrim" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={modal} className="modal" role="dialog" aria-modal="true" aria-label={w.title}>
        {head(step === "pick" ? w.sub : w.readSub)}
        {body()}
        <div className="m-foot">{foot()}</div>
      </div>
    </div>
  );
}
