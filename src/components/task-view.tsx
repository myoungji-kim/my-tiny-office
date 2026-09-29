"use client";

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from "react";

import { getDictionary, type Locale } from "../i18n";

import { Icon } from "./icons";
import { useLocalChoice } from "./local-choice";
import { Markdown } from "./markdown";
import { Sprite } from "./sprite";
import { WidthPicker } from "./width-picker";

// One message of the conversation, as the page has already worded it.
export interface TalkView {
  readonly id: string;
  readonly name: string;
  // undefined: the user
  readonly species: string | undefined;
  readonly label: string;
  readonly tone: "approve" | "changes" | undefined;
  readonly at: string;
  readonly text: string;
  readonly suggestions: ReactNode;
}

type Tab = "talk" | "changes" | "did";

const COPY = (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
    <rect x="5.5" y="5.5" width="8" height="8" rx="1.6" />
    <path d="M10.5 3.2V3a1.5 1.5 0 0 0-1.5-1.5H3A1.5 1.5 0 0 0 1.5 3v6A1.5 1.5 0 0 0 3 10.5h.2" />
  </svg>
);
const PREVIEW = (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
    <path d="M1.6 8s2.4-4 6.4-4 6.4 4 6.4 4-2.4 4-6.4 4-6.4-4-6.4-4z" />
    <circle cx="8" cy="8" r="1.7" />
  </svg>
);
const SOURCE = (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5.5 4.5L2 8l3.5 3.5M10.5 4.5L14 8l-3.5 3.5" />
  </svg>
);
const YOU = (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
    <circle cx="8" cy="5.5" r="2.7" />
    <path d="M2.8 14c.6-2.8 2.7-4.3 5.2-4.3s4.6 1.5 5.2 4.3" />
  </svg>
);

const COPIED_MS = 1_500;
// a message taller than this is cut short until asked for
const CLIP_PX = 560;
const OPEN_LATEST = 2;
const SIDE = { min: 220, max: 560, start: 300, step: 24, key: "mto.taskSide" };

const sideOf = (saved: string | null) => {
  const n = Number(saved);
  return saved !== null && n >= SIDE.min && n <= SIDE.max ? n : undefined;
};
const clampSide = (n: number) => Math.round(Math.min(SIDE.max, Math.max(SIDE.min, n)));

// What a folded message shows: its first sentence, not a heading or a label.
const lead = (text: string) =>
  text
    .split("\n")
    .filter((l) => !/^\s*(#{1,6}\s|\*\*[^*]+\*\*\s*$|```|\|)/.test(l))
    .map((l) => l.replace(/^[>*\-\d.\s]+/, "").replace(/[*`]/g, "").trim())
    .find((l) => l !== "") ?? "";

// The sections a message has, as the markdown draws them (h3), outside code.
function sections(text: string): string[] {
  const found: string[] = [];
  let code = false;
  for (const line of text.split("\n")) {
    if (/^\s*```/.test(line)) code = !code;
    else if (!code && /^#{1,2}\s+\S/.test(line)) found.push(line.replace(/^#+\s*/, "").replace(/[*`]/g, "").trim());
  }
  return found;
}

function TalkItem({ locale, message, folded: foldedAtFirst, plain, latestRef }: { readonly locale: Locale; readonly message: TalkView; readonly folded: boolean; readonly plain: boolean; readonly latestRef: ((el: HTMLDivElement | null) => void) | undefined }) {
  const t = getDictionary(locale);
  const w = t.projects.tk;
  const [folded, setFolded] = useState(foldedAtFirst);
  const [long, setLong] = useState(false);
  const [whole, setWhole] = useState(false);
  const [copied, setCopied] = useState(false);
  const body = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), COPIED_MS);
    return () => clearTimeout(timer);
  }, [copied]);
  const measure = (el: HTMLDivElement | null) => {
    body.current = el;
    if (el !== null && el.scrollHeight > CLIP_PX) setLong(true);
  };
  const heads = plain ? [] : sections(message.text);
  const jump = (i: number) => {
    setWhole(true);
    requestAnimationFrame(() => body.current?.querySelectorAll(".md h3")[i]?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };
  const copyLabel = copied ? t.claude.copied : t.claude.copy;

  return (
    <div ref={latestRef} className={folded ? "talk folded" : "talk"}>
      <span className="talk-av">{message.species === undefined ? YOU : <Sprite species={message.species} size={32} />}</span>
      <div style={{ minWidth: 0 }}>
        <div className="talk-hd">
          <b>{message.name}</b>
          <span className={message.tone === undefined ? "talk-k" : `talk-k ${message.tone}`}>{message.label}</span>
          <span className="talk-at">{message.at}</span>
        </div>
        {folded ? (
          <button className="talk-sum" type="button" onClick={() => setFolded(false)}>
            <span>{lead(message.text)}</span>
            <span className="talk-toggle">{w.talkOpen}</span>
          </button>
        ) : (
          <>
            {heads.length > 1 && (
              <div className="talk-toc">
                {heads.map((h, i) => (
                  <button key={i} type="button" onClick={() => jump(i)}>
                    {h}
                  </button>
                ))}
              </div>
            )}
            <div ref={measure} className={long && !whole ? "talk-bd clip" : "talk-bd"}>
              {plain ? <pre className="said-raw">{message.text}</pre> : <Markdown text={message.text} />}
            </div>
            {long && (
              <button className="talk-toggle talk-more" type="button" onClick={() => setWhole(!whole)}>
                {whole ? w.talkLess : w.talkAll}
              </button>
            )}
            {message.suggestions}
          </>
        )}
      </div>
      {!folded && (
        <button className={copied ? "copy-ic done" : "copy-ic"} type="button" aria-label={copyLabel} title={copyLabel} onClick={() => void navigator.clipboard.writeText(message.text).then(() => setCopied(true))}>
          {copied ? Icon.yes : COPY}
        </button>
      )}
    </div>
  );
}

// A task's page: the conversation and what was done and changed as tabs,
// the details beside them at a width the user sets.
export function TaskView({
  locale,
  talk,
  live,
  now,
  decide,
  changes,
  did,
  side,
  counts,
}: {
  readonly locale: Locale;
  readonly talk: readonly TalkView[];
  readonly live: ReactNode;
  // what stops the work, when something does
  readonly now: ReactNode;
  // who finished, when the work waits for the user, and who last asked for changes to it
  readonly decide: { readonly by: string; readonly changesAskedBy: string | undefined } | undefined;
  readonly changes: ReactNode;
  readonly did: ReactNode;
  readonly side: ReactNode;
  readonly counts: Readonly<Record<"changes" | "did", number>>;
}) {
  const t = getDictionary(locale);
  const w = t.projects.tk;
  const [tab, setTab] = useState<Tab>("talk");
  const [plain, setPlain] = useState(false);
  const [sideWidth, setSideWidth] = useLocalChoice(SIDE.key, sideOf, SIDE.start);
  const [dragging, setDragging] = useState(false);
  const grid = useRef<HTMLDivElement>(null);
  const scrolled = useRef(false);

  // Oldest first reads as the exchange it was; opening the page brings the
  // latest message into view only when it is below the fold.
  const scrollToLatest = (el: HTMLDivElement | null) => {
    if (el === null || scrolled.current) return;
    scrolled.current = true;
    if (el.getBoundingClientRect().top > innerHeight * 0.75) el.scrollIntoView({ block: "start" });
  };

  const drag = (e: PointerEvent<HTMLDivElement>) => {
    const split = e.currentTarget;
    const right = grid.current?.getBoundingClientRect().right ?? 0;
    split.setPointerCapture(e.pointerId);
    setDragging(true);
    const move = (ev: globalThis.PointerEvent) => setSideWidth(clampSide(right - ev.clientX - 8));
    const up = () => {
      setDragging(false);
      split.removeEventListener("pointermove", move);
      split.removeEventListener("pointerup", up);
    };
    split.addEventListener("pointermove", move);
    split.addEventListener("pointerup", up);
  };
  const step = (key: string) =>
    key === "ArrowLeft" ? sideWidth + SIDE.step : key === "ArrowRight" ? sideWidth - SIDE.step : key === "Home" ? SIDE.max : key === "End" ? SIDE.min : undefined;

  const tabs: readonly [Tab, string, number][] = [
    ["talk", w.tabTalk, talk.length],
    ["changes", w.changed, counts.changes],
    ["did", w.did, counts.did],
  ];

  return (
    <>
      {now}
      {decide !== undefined && (
        <div className={decide.changesAskedBy === undefined ? "notice tk-now" : "notice notice-warn tk-now"}>
          <span className="n-ic">{decide.changesAskedBy === undefined ? Icon.yes : Icon.alert}</span>
          <span className="n-tx">
            <b>{w.decideTitle(decide.by)}</b>
            <span>{decide.changesAskedBy === undefined ? w.decideWhy : w.decideAfterChanges(decide.changesAskedBy)}</span>
          </span>
          <span className="n-acts">
            <button className="btn btn-secondary btn-sm" type="button" onClick={() => setTab("changes")}>
              {w.seeChanges}
            </button>
          </span>
        </div>
      )}
      <div ref={grid} className={dragging ? "tk2 resizing" : "tk2"} style={{ "--tk-side": sideWidth + "px" } as CSSProperties}>
        <div className="tk-main">
          <div className="tk-tabs">
            <div className="tabs" role="tablist">
              {tabs.map(([id, label, n]) => (
                <button key={id} className="tab" type="button" role="tab" aria-selected={id === tab} onClick={() => setTab(id)}>
                  <span>{label}</span>
                  <span className="n">{n}</span>
                </button>
              ))}
            </div>
            <div className="tk-tools">
              {tab === "talk" && (
                <div className="view-sw" role="radiogroup" aria-label={w.saidAs}>
                  <button type="button" role="radio" aria-checked={!plain} aria-label={w.formatted} title={w.formatted} onClick={() => setPlain(false)}>
                    {PREVIEW}
                  </button>
                  <button type="button" role="radio" aria-checked={plain} aria-label={w.plain} title={w.plain} onClick={() => setPlain(true)}>
                    {SOURCE}
                  </button>
                </div>
              )}
              <WidthPicker label={t.settings.widthTitle} names={t.settings.widths} look="switch" />
            </div>
          </div>
          <div className="tk-pane" hidden={tab !== "talk"}>
            {talk.map((m, i) => (
              <TalkItem key={m.id} locale={locale} message={m} folded={i < talk.length - OPEN_LATEST} plain={plain} latestRef={i === talk.length - 1 ? scrollToLatest : undefined} />
            ))}
            {live}
            {talk.length === 0 && live === undefined && <p className="col-empty talk-empty">{w.talkEmpty}</p>}
          </div>
          <div className="tk-pane" hidden={tab !== "changes"}>
            {changes}
          </div>
          <div className="tk-pane" hidden={tab !== "did"}>
            {did}
          </div>
        </div>
        <div
          className={dragging ? "tk-split dragging" : "tk-split"}
          role="separator"
          aria-orientation="vertical"
          aria-label={w.splitLabel}
          tabIndex={0}
          aria-valuemin={SIDE.min}
          aria-valuemax={SIDE.max}
          aria-valuenow={sideWidth}
          onPointerDown={drag}
          onDoubleClick={() => setSideWidth(SIDE.start)}
          onKeyDown={(e) => {
            const next = step(e.key);
            if (next === undefined) return;
            e.preventDefault();
            setSideWidth(clampSide(next));
          }}
        />
        <div className="tk-side">{side}</div>
      </div>
    </>
  );
}
