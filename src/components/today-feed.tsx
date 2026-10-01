"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";

import { getDictionary, type Locale } from "../i18n";
import type { TodayItem, TodayKind } from "../server/today";
import type { AreaView } from "../server/view-model";

import { Icon } from "./icons";
import { costText } from "./money";
import { areaName } from "./names";

const SHOWN = 6;

const ICON: Readonly<Record<TodayKind, ReactNode>> = {
  started: (
    <svg viewBox="0 0 16 16" fill="currentColor">
      <path d="M5 3.4l7.6 4.6L5 12.6z" />
    </svg>
  ),
  reviewStarted: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M1.6 8s2.4-4 6.4-4 6.4 4 6.4 4-2.4 4-6.4 4-6.4-4-6.4-4z" />
      <circle cx="8" cy="8" r="1.7" />
    </svg>
  ),
  memoryUsed: Icon.book,
  waiting: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.4 9.4h3.2l1 1.8h2.8l1-1.8h3.2" />
      <path d="M3.6 3.4h8.8l1.2 6v3.2H2.4V9.4z" />
    </svg>
  ),
  applied: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.4 8.4l3 3 6.2-6.6" />
    </svg>
  ),
  leave: Icon.sun,
  lost: Icon.plug,
  failed: Icon.plug,
  stopped: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 4.5l3.5 3.5L3 11.5M8.5 12h4.5" />
    </svg>
  ),
  stoppedAtWrite: Icon.pen,
  budget: Icon.alert,
  hired: Icon.plus,
};

// what stopped, as opposed to what only happened
const STOPS: ReadonlySet<TodayKind> = new Set(["lost", "failed", "stopped", "stoppedAtWrite", "budget"]);

type Part = string | { readonly b: string };

export function TodayFeed({
  locale,
  items,
  names,
  areas,
  cost,
}: {
  readonly locale: Locale;
  readonly items: readonly TodayItem[];
  // everyone the lines may name, those who left included
  readonly names: Readonly<Record<string, string>>;
  readonly areas: readonly AreaView[];
  // what today's runs cost, shown only where the feed is the whole office's
  readonly cost?: number;
}) {
  const t = getDictionary(locale);
  const w = t.office.today;
  const [open, setOpen] = useState(false);
  const time = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

  const line = (i: TodayItem): readonly Part[] => {
    const who = i.who === undefined ? "" : (names[i.who] ?? "");
    const task = i.task?.title ?? "";
    const area = areas.find((a) => a.id === i.areaId);
    switch (i.kind) {
      case "started":
        return w.line.started(who, task);
      case "reviewStarted":
        return w.line.reviewStarted(who, task, area === undefined ? "" : areaName(area, t.areas));
      case "memoryUsed":
        return w.line.memoryUsed(who, i.memory ?? "");
      case "waiting":
        return w.line.waiting(who, task, i.took ?? 0);
      case "applied":
        return w.line.applied(task);
      case "leave":
        return w.line.leave(who);
      case "hired":
        return i.brought === undefined ? w.line.hired(who) : w.line.hiredWith(who, i.brought.folder, i.brought.lines);
      default:
        return w.line[i.kind](who, task);
    }
  };
  const text = (parts: readonly Part[]) => parts.map((p) => (typeof p === "string" ? p : p.b)).join("");

  const shown = open ? items : items.slice(0, SHOWN);
  return (
    <div className="panel">
      <div className="panel-hd">
        <h2>
          {w.title}
          {cost !== undefined && cost > 0 && (
            <span className="kn" title={w.costWhy}>
              {costText(cost)}
            </span>
          )}
        </h2>
        <p>{w.sub}</p>
      </div>
      <div className="panel-bd">
        {items.length === 0 && (
          <p className="col-empty" style={{ margin: 0 }}>
            {w.nothing}
          </p>
        )}
        {shown.map((i) => {
          const parts = line(i);
          const stop = STOPS.has(i.kind);
          return (
            <div key={[i.kind, i.at, i.who, i.task?.id, i.memory].join("|")} className={"today-row" + (i.kind === "waiting" ? " you" : stop ? " bad" : "")}>
              <span className="today-at">{time.format(i.at)}</span>
              <span className="today-ic">{ICON[i.kind]}</span>
              <span className="today-tx" title={text(parts)}>
                {parts.map((p, k) => (typeof p === "string" ? <span key={k}>{p}</span> : <b key={k}>{p.b}</b>))}
              </span>
              {i.open && i.task !== undefined ? (
                <Link className="btn btn-secondary btn-sm" href={`/projects/${i.task.projectId}/${i.task.id}`}>
                  {stop ? w.look : w.approve}
                </Link>
              ) : (
                <span />
              )}
            </div>
          );
        })}
        {items.length > SHOWN && (
          <button className="btn btn-ghost btn-sm today-more" type="button" onClick={() => setOpen(!open)}>
            {open ? w.less : w.more(items.length - SHOWN)}
          </button>
        )}
      </div>
    </div>
  );
}
