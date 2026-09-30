"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { hideCandidateAction } from "../app/plaza-actions";
import { getDictionary, type Locale } from "../i18n";
import type { CandidateView } from "../server/plaza";
import type { AreaView } from "../server/view-model";
import { castMember, paint, skin, TILES, tokenResolver, type Rows } from "../ui/paint";

import type { Brought } from "./career-dialog";
import { agoText, spanOf } from "./dates";
import { HireDialog, type Choice } from "./hire-dialog";
import { Icon } from "./icons";
import { Sprite } from "./sprite";
import { useDismiss } from "./use-dismiss";

const S = 3;
const T = 16 * S;
// The office's front wall with its door, four rows of paving and the grass
// beyond; candidates stand in two lines, one every three tiles.
const W = 18;
const H = 6;
const SLOTS = [2, 4].flatMap((row) => Array.from({ length: 6 }, (_, i) => ({ x: 1 + i * 3, row })));
const GAP = 8;
const EDGE = 12;

const CHECK = (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3.4 8.4l3 3 6.2-6.6" />
  </svg>
);

const HIDE = (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 8s2.2-4 6-4c1.2 0 2.2.4 3.1.9M14 8s-2.2 4-6 4c-1.2 0-2.2-.4-3.1-.9" />
    <path d="M6.6 9.4a2 2 0 0 1 2.8-2.8" />
    <path d="M2.5 13.5l11-11" />
  </svg>
);

type Filter = "all" | "free" | "busy" | "hidden";

function place(pop: HTMLElement, anchor: HTMLElement) {
  const r = anchor.getBoundingClientRect();
  const w = pop.offsetWidth;
  const h = pop.offsetHeight;
  let left = r.right + GAP;
  if (left + w > innerWidth - EDGE) left = r.left - w - GAP;
  if (left < EDGE) left = Math.min(Math.max(EDGE, r.left), innerWidth - w - EDGE);
  pop.style.left = Math.round(left) + "px";
  pop.style.top = Math.round(Math.max(EDGE, Math.min(r.top, innerHeight - h - EDGE))) + "px";
}

// Outside the company: this computer's Claude Code sessions, standing as
// candidates. Nothing of a session is brought in until the user hires it.
export function PlazaView({
  locale,
  companyId,
  candidates,
  roles,
  teams,
  areas,
  ready,
  now,
}: {
  readonly locale: Locale;
  readonly companyId: string;
  readonly candidates: readonly CandidateView[];
  readonly roles: readonly Choice[];
  readonly teams: readonly Choice[];
  readonly areas: readonly AreaView[];
  readonly ready: boolean;
  readonly now: number;
}) {
  const t = getDictionary(locale);
  const w = t.plaza;
  // hiding is kept here as well, so the screen answers before the server does
  const [hidden, setHidden] = useState(() => new Set(candidates.filter((c) => c.hidden).map((c) => c.id)));
  const [justHidden, setJustHidden] = useState<ReadonlySet<string>>(new Set());
  const [hired, setHired] = useState<ReadonlySet<string>>(new Set());
  const [filter, setFilter] = useState<Filter>("all");
  const [find, setFind] = useState("");
  const [openId, setOpenId] = useState<string | undefined>(undefined);
  const [hiring, setHiring] = useState<CandidateView | undefined>(undefined);
  const [arrived, setArrived] = useState<{ readonly id: string; readonly name: string; readonly brought: Brought | undefined } | undefined>(undefined);
  const canvas = useRef<HTMLCanvasElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const anchor = useRef<HTMLElement | null>(null);

  const everyone = useMemo(() => candidates.filter((c) => !hired.has(c.id)), [candidates, hired]);
  const waiting = useMemo(() => everyone.filter((c) => !hidden.has(c.id)), [everyone, hidden]);
  // redrawn only when who stands there changes, not on every keystroke in the list
  const standing = useMemo(() => waiting.slice(0, SLOTS.length), [waiting]);
  const open = waiting.find((c) => c.id === openId);

  useEffect(() => {
    const el = canvas.current;
    const ctx = el?.getContext("2d");
    if (el === null || ctx === null || ctx === undefined) return;
    ctx.imageSmoothingEnabled = false;
    const resolve = tokenResolver(el);
    const put = (rows: Rows, x: number, y: number, extra?: Record<string, string>) => paint(ctx, rows, S, x * T, y * T, extra, resolve);
    const door = Math.floor(W / 2);
    for (let x = 0; x < W; x++) {
      put(TILES[x === door ? "door" : x % 4 === 1 ? "facadeWindow" : "facade"], x, 0);
      for (let y = 1; y < H - 1; y++) put(TILES.pave, x, y);
      put(TILES[x === 0 || x === W - 1 ? "tree" : "grass"], x, H - 1);
    }
    put(TILES.lamp, 0, 1);
    put(TILES.lamp, W - 1, 1);
    put(TILES.bench, door + 2, 1);
    standing.forEach((c, i) => {
      const member = castMember(c.species);
      if (member !== undefined) put(member.sprite, SLOTS[i].x, SLOTS[i].row, skin(member));
    });
  }, [standing]);

  const close = useCallback(() => {
    setOpenId(undefined);
    anchor.current = null;
  }, []);
  useDismiss(open !== undefined, pop, anchor, close);
  // opened from the keyboard, focus goes into the résumé, as in the office
  const focusFirst = useRef(false);
  useLayoutEffect(() => {
    if (open === undefined || pop.current === null || anchor.current === null) return;
    place(pop.current, anchor.current);
    if (focusFirst.current) pop.current.querySelector<HTMLElement>("button:not(:disabled), a[href]")?.focus({ preventScroll: true });
  }, [open]);

  const hide = (id: string) => {
    close();
    setHidden((h) => new Set(h).add(id));
    setJustHidden((j) => new Set(j).add(id));
    void hideCandidateAction(id, true);
  };
  const show = (id: string) => {
    const next = new Set(hidden);
    next.delete(id);
    setHidden(next);
    setJustHidden((j) => new Set([...j].filter((x) => x !== id)));
    if (filter === "hidden" && next.size === 0) setFilter("all");
    void hideCandidateAction(id, false);
  };
  const settle = () => setJustHidden(new Set());

  const q = find.trim().toLowerCase();
  const counts: Record<Filter, number> = {
    all: waiting.length,
    free: waiting.filter((c) => !c.inUse).length,
    busy: waiting.filter((c) => c.inUse).length,
    hidden: everyone.length - waiting.length,
  };
  const inFilter = (c: CandidateView) =>
    filter === "hidden" ? hidden.has(c.id) : (!hidden.has(c.id) || justHidden.has(c.id)) && (filter === "all" || (filter === "busy") === c.inUse);
  const shown = everyone.filter(inFilter).filter((c) => q === "" || c.folder.toLowerCase().includes(q) || c.firstMessage.toLowerCase().includes(q));
  const empty = filter === "hidden" ? w.noneHidden : counts.all === 0 && counts.hidden > 0 ? w.allHiddenList : w.none;
  const meta = (c: CandidateView) => (c.inUse ? w.busyLine + " · " : "") + w.meta(c.folder, spanOf(locale, c), c.messages);

  return (
    <>
      {arrived !== undefined && (
        <div className="notice notice-ok">
          <span className="n-ic">{CHECK}</span>
          <span className="n-tx">
            <b>{w.arrived(arrived.name)}</b>
            <span>{arrived.brought !== undefined ? w.arrivedWith(arrived.brought.session.name, arrived.brought.knows.length + arrived.brought.style.length) : w.arrivedNew}</span>
          </span>
          <span className="n-acts">
            <Link className="btn btn-secondary btn-sm" href={`/people/${arrived.id}`}>
              {w.arrivedGo}
            </Link>
          </span>
        </div>
      )}

      <div className="stage">
        <div className="room-wrap plaza-scene">
          <canvas ref={canvas} className="room" aria-hidden="true" width={W * T} height={H * T} />
          <div className="overlay">
            {standing.map((c, i) => {
              const { x, row } = SLOTS[i];
              return (
                <span key={c.id}>
                  <button
                    className="desk"
                    type="button"
                    data-cand={c.id}
                    aria-label={w.of(c.name, c.firstMessage)}
                    aria-haspopup="dialog"
                    aria-expanded={openId === c.id}
                    title={c.firstMessage + " · " + spanOf(locale, c)}
                    style={{ left: x * T - 4, top: row * T - 4, width: T + 8, height: T + 8 }}
                    onClick={(e) => {
                      if (openId === c.id) return close();
                      anchor.current = e.currentTarget;
                      focusFirst.current = e.detail === 0;
                      setOpenId(c.id);
                    }}
                  />
                  <span className="tag" style={{ left: x * T + T / 2, top: (row + 1) * T + 4 }}>
                    {c.name}
                  </span>
                  {c.inUse && (
                    <span className="bub" style={{ left: x * T + T / 2, top: row * T - 30 }}>
                      <span className="dot working" />
                      {w.busy}
                    </span>
                  )}
                </span>
              );
            })}
          </div>
          {waiting.length === 0 && <p className="plaza-quiet">{counts.hidden > 0 ? w.allHidden : w.quiet}</p>}
        </div>
      </div>

      <div className="panel">
        <div className="panel-hd">
          <h2>{w.listTitle}</h2>
          <p>{w.listSub}</p>
        </div>
        <div className="panel-bd">
          <div className="board-tools">
            <input className="input" type="search" autoComplete="off" placeholder={w.search} aria-label={w.search} value={find} onChange={(e) => (settle(), setFind(e.target.value))} />
            <div className="opts" role="radiogroup" aria-label={w.all}>
              {(["all", "free", "busy", "hidden"] as const)
                .filter((k) => k !== "hidden" || counts.hidden > 0 || filter === "hidden")
                .map((k) => (
                  <button key={k} className="opt" type="button" role="radio" aria-checked={filter === k} onClick={() => (settle(), setFilter(k))}>
                    {(k === "all" ? w.all : k === "hidden" ? w.hidden : w[k]) + " " + counts[k]}
                  </button>
                ))}
            </div>
          </div>
          <div>
            {shown.length === 0 && <p className="hint">{empty}</p>}
            {shown.map((c) =>
              filter !== "hidden" && justHidden.has(c.id) ? (
                <div key={c.id} className="board-gone">
                  {HIDE}
                  <span>
                    {w.justHidden} · {c.firstMessage}
                  </span>
                  <button className="btn btn-ghost btn-sm" type="button" onClick={() => show(c.id)}>
                    {w.undo}
                  </button>
                </div>
              ) : (
                <div key={c.id} className="board-row" data-hidden={hidden.has(c.id) ? "" : undefined}>
                  <Sprite species={c.species} size={36} />
                  <span className="board-tx">
                    <b>{c.firstMessage}</b>
                    <span>{meta(c)}</span>
                  </span>
                  <span className="board-acts">
                    {hidden.has(c.id) ? (
                      <button className="btn btn-secondary btn-sm" type="button" onClick={() => show(c.id)}>
                        {w.show}
                      </button>
                    ) : (
                      <>
                        <button className="ibtn ibtn-sm" type="button" aria-label={w.hide} title={w.hide} onClick={() => hide(c.id)}>
                          {HIDE}
                        </button>
                        <button className="btn btn-secondary btn-sm" type="button" disabled={c.inUse} onClick={() => setHiring(c)}>
                          {w.hire}
                        </button>
                      </>
                    )}
                  </span>
                </div>
              ),
            )}
          </div>
        </div>
      </div>

      <div ref={pop} className="pop" role="dialog" aria-label={open === undefined ? undefined : w.of(open.name, open.firstMessage)} data-open={open === undefined ? undefined : ""}>
        {open !== undefined && (
          <>
            <div className="p-hd">
              <span className="p-av">
                <Sprite species={open.species} size={32} />
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span className="p-name">{open.name}</span>
                <span className="p-role" title={open.folder}>
                  {open.folder}
                </span>
              </span>
              <span className={`chip ${open.inUse ? "working" : "available"}`}>
                <span className={`dot ${open.inUse ? "working" : "available"}`} />
                {open.inUse ? w.busy : w.free}
              </span>
            </div>
            <div className="p-rule" />
            <div className="p-state">
              <span className="c-k">{w.first}</span>
              <span className="p-quote">“{open.firstMessage}”</span>
              <span className="p-kv">
                <span>{w.span}</span>
                <b>{spanOf(locale, open)}</b>
              </span>
              <span className="p-kv">
                <span>{w.turns}</span>
                <b>{w.turnsN(open.messages)}</b>
              </span>
              <span className="p-kv">
                <span>{w.last}</span>
                <b>{agoText(locale, open.to, now)}</b>
              </span>
            </div>
            <div className="p-rule" />
            <div className="p-acts">
              <button className="mrow mrow-key" type="button" disabled={open.inUse} onClick={() => (close(), setHiring(open))}>
                {Icon.plus}
                {w.hire}
              </button>
              {open.inUse && <p className="p-why">{w.busyWhy}</p>}
              <button className="mrow" type="button" onClick={() => hide(open.id)}>
                {HIDE}
                {w.hideHere}
              </button>
            </div>
          </>
        )}
      </div>

      {hiring !== undefined && (
        <HireDialog
          locale={locale}
          companyId={companyId}
          roles={roles}
          teams={teams}
          career={{ areas, ready }}
          from={hiring}
          onHired={(id, name, brought) => {
            // the candidate walked in unless another session came instead
            setHired((h) => new Set([...h, ...(brought === undefined || brought.session.id === hiring.id ? [hiring.id] : []), ...(brought ? [brought.session.id] : [])]));
            setArrived({ id, name, brought });
          }}
          onClose={() => setHiring(undefined)}
        />
      )}
    </>
  );
}
