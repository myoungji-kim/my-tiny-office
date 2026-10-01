"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, useTransition, type ReactNode } from "react";

import { bringBackAction, sendOnLeaveAction } from "../app/people-actions";
import { carryOnAction } from "../app/project-actions";
import { getDictionary, type Dictionary, type Locale } from "../i18n";
import type { AreaView, EmployeeView, MemoryView, TeamView } from "../server/view-model";
import { castMember, paint, PALETTE, skin, TILES, tokenResolver, type ColorResolver, type Rows } from "../ui/paint";

import { AgentMark } from "./agent-mark";
import { sinceText } from "./dates";
import { HireDialog, type Choice } from "./hire-dialog";
import { Icon } from "./icons";
import { teamName } from "./names";
import { peopleIn, type Room } from "./office-rooms";
import { statusClass, statusColor } from "./presence";
import { Sprite } from "./sprite";
import { TeachDialog } from "./teach-dialog";
import { useDismiss } from "./use-dismiss";

const S = 3;
const T = 16 * S;

type Deco = readonly [tile: string, x: number, y: number];

interface Mark {
  readonly person: EmployeeView;
  readonly x: number;
  readonly y: number;
  readonly state: "lounge" | "meeting" | EmployeeView["status"];
}

interface Plan {
  readonly w: number;
  readonly h: number;
  readonly deco: readonly Deco[];
  readonly draw: (put: (rows: Rows, x: number, y: number, extra?: Record<string, string>) => void) => void;
  readonly marks: readonly Mark[];
}

const sprite = (p: EmployeeView) => castMember(p.species);

// Everyone has a desk and there are no empty ones: a hire adds one, three to a row.
function desks(people: readonly EmployeeView[]): Plan {
  const seats = people.map((p, i) => ({ p, col: 3 + (i % 3) * 5, row: 3 + Math.floor(i / 3) * 3 }));
  const w = Math.max(3, ...seats.map((s) => s.col)) + 5;
  const h = Math.max(3, ...seats.map((s) => s.row)) + 2;
  const deco = ([["window", 2, 0], ["window", 3, 0], ["board", 8, 0], ["board", 9, 0], ["shelf", 14, 0], ["plant", 0, h - 1], ["plant", w - 1, h - 1]] as const).filter(
    ([, x, y]) => x < w && y < h,
  );
  return {
    w,
    h,
    deco,
    draw: (put) => {
      for (const { p, col, row } of seats) {
        const dx = col * T;
        const dy = row * T;
        const member = sprite(p);
        put(TILES.chair, dx, dy - T);
        if (p.status === "working" && member !== undefined) put(member.sprite, dx, dy - T, skin(member));
        put(TILES.deskL, dx, dy);
        put(TILES.deskR, dx + T, dy);
        put(TILES.monitor, dx + T / 2, dy - 2 * S, { M: (p.status === "working" ? PALETTE.M : PALETTE.o) ?? "" });
      }
    },
    // An empty chair still belongs to someone, and the tag says where they went.
    marks: seats.map(({ p, col, row }) => ({
      person: p,
      x: col,
      y: row,
      state: p.status === "available" ? "lounge" : p.status === "reviewing" ? "meeting" : p.status,
    })),
  };
}

function lounge(people: readonly EmployeeView[]): Plan {
  return {
    w: 13,
    h: 6,
    deco: [["window", 2, 0], ["coffee", 8, 0], ["shelf", 11, 0], ["plant", 0, 5], ["plant", 12, 5], ["table", 7, 3]],
    draw: (put) => {
      put(TILES.sofaBackL, 4 * T, 2 * T);
      put(TILES.sofaBackR, 5 * T, 2 * T);
      // Between the back and the seat, which is what sitting in it looks like.
      people.forEach((p, i) => {
        const member = sprite(p);
        if (member !== undefined) put(member.sprite, (4 + (i % 2)) * T, 2 * T + 4 * S, skin(member));
      });
      put(TILES.sofaL, 4 * T, 3 * T);
      put(TILES.sofaR, 5 * T, 3 * T);
    },
    marks: people.map((p, i) => ({ person: p, x: 4 + (i % 2) - 0.5, y: 3, state: p.status })),
  };
}

// A table for every review under way, two to a row; none when nobody reviews.
function meeting(people: readonly EmployeeView[]): Plan {
  const h = 3 + Math.max(1, Math.ceil(people.length / 2)) * 3;
  const seats = people.map((p, i) => ({ p, col: 2 + (i % 2) * 6, row: 3 + Math.floor(i / 2) * 3 }));
  return {
    w: 13,
    h,
    deco: [["window", 2, 0], ["board", 6, 0], ["board", 7, 0], ["plant", 0, h - 1], ["plant", 12, h - 1]],
    draw: (put) => {
      for (const { p, col, row } of seats) {
        const member = sprite(p);
        put(TILES.chair, (col + 1) * T, (row - 1) * T);
        if (member !== undefined) put(member.sprite, (col + 1) * T, (row - 1) * T, skin(member));
        put(TILES.deskL, col * T, row * T);
        put(TILES.deskM, (col + 1) * T, row * T);
        put(TILES.deskR, (col + 2) * T, row * T);
      }
    },
    marks: seats.map(({ p, col, row }) => ({ person: p, x: col + 0.5, y: row, state: p.status })),
  };
}

const planFor = (room: Room, people: readonly EmployeeView[]): Plan =>
  room.kind === "lounge" ? lounge(people) : room.kind === "meeting" ? meeting(people) : desks(people);

function RoomView({
  plan,
  words,
  openId,
  onPick,
}: {
  readonly plan: Plan;
  readonly openId: string | undefined;
  readonly words: Dictionary;
  readonly onPick: (id: string, el: HTMLElement, viaKey: boolean) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = canvas.current;
    const ctx = el?.getContext("2d");
    if (el === null || ctx === null || ctx === undefined) return;
    ctx.imageSmoothingEnabled = false;
    const resolve: ColorResolver = tokenResolver(el);
    const put = (rows: Rows, x: number, y: number, extra?: Record<string, string>) => paint(ctx, rows, S, x, y, extra, resolve);
    for (let y = 0; y < plan.h; y++) for (let x = 0; x < plan.w; x++) put(TILES.floor, x * T, y * T);
    for (let x = 0; x < plan.w; x++) put(TILES.wall, x * T, 0);
    for (const [tile, x, y] of plan.deco) put(TILES[tile], x * T, y * T);
    plan.draw(put);
  }, [plan]);

  const where = (state: Mark["state"]): [string, string] =>
    state === "lounge"
      ? ["available", words.office.atLounge]
      : state === "meeting"
        ? ["reviewing", words.office.atMeeting]
        : [statusClass(state), words.employeeStatus[state]];

  return (
    <div className="stage">
      <div className="room-wrap">
        <canvas ref={canvas} className="room" aria-hidden="true" width={plan.w * T} height={plan.h * T} />
        <div className="overlay">
          {plan.marks.map(({ person, x, y, state }) => {
            const [dot, label] = where(state);
            return (
              <span key={person.id}>
                <button
                  className="desk"
                  type="button"
                  data-id={person.id}
                  aria-label={person.name}
                  aria-expanded={openId === person.id}
                  style={{ left: x * T - 4, top: y * T - T - 6, width: 2 * T + 8, height: 2 * T + 10 }}
                  onClick={(e) => onPick(person.id, e.currentTarget, e.detail === 0)}
                />
                <span className="tag" title={person.name} style={{ left: x * T + T, top: y * T + T + 4, opacity: person.status === "working" ? undefined : 0.7 }}>
                  {person.name}
                </span>
                <span className="bub" style={{ left: x * T + T, top: y * T - T - 24 }}>
                  <span className={`dot ${dot}`} />
                  {label}
                  {person.agentLost && <AgentMark label={words.projects.agentLost} inline />}
                </span>
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}


function Card({
  p,
  open,
  locale,
  words,
  now,
  onPick,
}: {
  readonly p: EmployeeView;
  readonly open: boolean;
  readonly locale: Locale;
  readonly words: Dictionary;
  readonly now: number;
  readonly onPick: (id: string, el: HTMLElement, viaKey: boolean) => void;
}) {
  const o = words.office;
  const [line, nums, key]: [string, ReactNode, string] =
    p.status === "working" && p.task !== undefined
      ? [p.task.title, <><span>{o.spent(p.task.minutes)}</span><b>{p.task.blocked ? words.projects.blocked : words.employeeStatus.working}</b></>, o.work]
      : p.status === "reviewing" && p.review !== undefined
        ? [p.review.title, <><span>{o.spent(p.review.minutes)}</span><b>{words.employeeStatus.reviewing}</b></>, o.reviewKey]
        : p.status === "onLeave"
          ? [o.away, <><span>{sinceText(locale, words, p.leaveSince ?? now, now)}</span><b>{o.onLeave}</b></>, o.work]
          : [o.noTask, <><span>{p.lastFinished ?? o.justHired}</span><b>{o.waiting}</b></>, o.work];

  return (
    <div className="card" style={p.status === "onLeave" ? { opacity: 0.72 } : undefined} onClick={(e) => onPick(p.id, e.currentTarget, e.detail === 0)}>
      <button className="c-menu" type="button" data-id={p.id} aria-haspopup="dialog" aria-expanded={open} aria-label={o.actionOf(p.name)}>
        <svg viewBox="0 0 16 16" fill="currentColor">
          <circle cx="8" cy="3.2" r="1.35" />
          <circle cx="8" cy="8" r="1.35" />
          <circle cx="8" cy="12.8" r="1.35" />
        </svg>
      </button>
      <span className="c-av">
        <Sprite species={p.species} size={34} />
        <span className="c-live" style={{ background: statusColor[p.status] }} />
        {p.agentLost && <AgentMark label={words.projects.agentLost} />}
      </span>
      <span className="c-name">{p.name}</span>
      <span className="c-role">{p.role}</span>
      <span className="c-rule" />
      <span className="c-k">{key}</span>
      <span className="c-task">{line}</span>
      <span className="c-nums">{nums}</span>
    </div>
  );
}

interface Act {
  readonly icon: ReactNode;
  readonly label: string;
  readonly key?: boolean;
  // starts work, so it waits while Claude Code is stopped
  readonly starts?: boolean;
  readonly off?: string;
  readonly href?: string;
  readonly run?: () => Promise<{ readonly error?: string }>;
  readonly teach?: boolean;
}

// Only transitions the domain allows from this state. The first row is the one
// the user came here for.
function actsFor(p: EmployeeView, companyId: string, ready: boolean, words: Dictionary): Act[] {
  const a = words.office.actions;
  const taskId = (p.task ?? p.review)?.taskId ?? "";
  // Teaching is not a transition, so it is offered in every state.
  const teach: Act = { icon: Icon.book, label: words.people.teach, teach: true };
  const acts: Act[] =
    p.status === "working"
      ? [
          { icon: Icon.info, label: a.detail, key: true, href: `/projects?task=${taskId}` },
          { icon: Icon.swap, label: a.reassign, href: `/projects?task=${taskId}&do=assign` },
          teach,
        ]
      : p.status === "reviewing"
        ? [{ icon: Icon.info, label: a.detail, key: true, href: `/projects?task=${taskId}` }, teach]
        : p.status === "available"
          ? [
              { icon: Icon.plus, label: a.assign, key: true, starts: true, href: `/people/${p.id}?do=assign` },
              teach,
              { icon: Icon.sun, label: a.leave, run: () => sendOnLeaveAction(companyId, p.id) },
            ]
          : [
              { icon: Icon.plus, label: a.assign, key: true, off: words.office.cannotAssign },
              { icon: Icon.undo, label: a.comeBack, run: () => bringBackAction(companyId, p.id) },
              teach,
            ];
  // Work that stopped by itself is the thing to deal with first; everything else steps back.
  const reconnect: Act = { icon: Icon.plug, label: p.agentLost ? words.projects.reconnect : words.projects.retry, key: true, starts: true, run: () => carryOnAction(companyId, taskId) };
  const offered = p.agentLost || p.runFailed ? [reconnect, ...acts.map((act) => ({ ...act, key: false }))] : acts;
  return offered.map((act) => (!ready && act.starts === true && act.off === undefined ? { ...act, off: words.claude.cannotStart } : act));
}

function StateBlock({ p, locale, words, now }: { readonly p: EmployeeView; readonly locale: Locale; readonly words: Dictionary; readonly now: number }) {
  const o = words.office;
  if (p.status === "working" && p.task !== undefined)
    return (
      <>
        <span className="c-k">{o.inProgress}</span>
        <span className="c-task">{p.task.title}</span>
        <span className="p-nums"><span>{o.spent(p.task.minutes)}</span><b>{p.task.blocked ? words.projects.blocked : words.employeeStatus.working}</b></span>
        {(p.agentLost || p.runFailed) && (
          <span className="p-lost">
            <b>{p.agentLost ? words.projects.agentLost : words.projects.runFailed}</b> · {p.agentLost ? words.projects.lostWhy : words.projects.runFailedWhy}
          </span>
        )}
      </>
    );
  if (p.status === "reviewing" && p.review !== undefined)
    return (
      <>
        <span className="c-k">{o.reviewingNow}</span>
        <span className="c-task">{p.review.title}</span>
        <span className="p-nums"><span>{o.spent(p.review.minutes)}</span><b>{words.employeeStatus.reviewing}</b></span>
      </>
    );
  if (p.status === "onLeave")
    return (
      <>
        <span className="c-k">{o.leaveLabel}</span>
        <span className="c-task">{sinceText(locale, words, p.leaveSince ?? now, now)}</span>
      </>
    );
  // just hired is not finished work, so it is not headed as such
  return (
    <>
      <span className="c-k">{p.lastFinished === undefined ? o.noTask : o.lastDone}</span>
      <span className="c-task">{p.lastFinished ?? o.justHired}</span>
      <span className="p-nums"><span>{o.deskFree}</span><b>{o.waiting}</b></span>
    </>
  );
}

const GAP = 8;
const EDGE = 12;

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

export function OfficeFloor({
  locale,
  companyId,
  room,
  employees,
  teams,
  roles,
  areas,
  memories,
  ready,
  plaza,
  today,
  now,
}: {
  readonly locale: Locale;
  readonly companyId: string;
  readonly room: Room;
  readonly employees: readonly EmployeeView[];
  readonly teams: readonly TeamView[];
  readonly roles: readonly Choice[];
  readonly areas: readonly AreaView[];
  readonly memories: readonly MemoryView[];
  readonly ready: boolean;
  readonly plaza: boolean;
  // 오늘, under the floor and above the cards
  readonly today: ReactNode;
  readonly now: number;
}) {
  const words = getDictionary(locale);
  const [openId, setOpenId] = useState<string | undefined>(undefined);
  const [hireTeam, setHireTeam] = useState<string | undefined>(undefined);
  const [teaching, setTeaching] = useState<EmployeeView | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const [pending, start] = useTransition();
  const pop = useRef<HTMLDivElement>(null);
  const anchor = useRef<HTMLElement | null>(null);
  const focusFirst = useRef(false);

  const close = useCallback(() => {
    setOpenId(undefined);
    anchor.current = null;
  }, []);
  const closeHire = useCallback(() => setHireTeam(undefined), []);
  const closeTeach = useCallback(() => setTeaching(undefined), []);
  useDismiss(openId !== undefined, pop, anchor, close);

  const pick = (id: string, el: HTMLElement, viaKey: boolean) => {
    if (openId === id && anchor.current === el) return close();
    anchor.current = el;
    focusFirst.current = viaKey;
    setError(undefined);
    setOpenId(id);
  };

  useLayoutEffect(() => {
    const p = pop.current;
    if (openId === undefined || p === null || anchor.current === null) return;
    place(p, anchor.current);
    if (focusFirst.current) p.querySelector<HTMLElement>(".mrow:not(:disabled)")?.focus({ preventScroll: true });
    const follow = () => anchor.current !== null && place(p, anchor.current);
    addEventListener("resize", follow);
    addEventListener("scroll", follow, true);
    return () => {
      removeEventListener("resize", follow);
      removeEventListener("scroll", follow, true);
    };
  }, [openId]);

  const here = peopleIn(room, employees);
  const plan = planFor(room, here);
  const nameOf = (team: TeamView) => teamName(team, words.teams);
  const staffed = teams.filter((team) => employees.some((e) => e.teamId === team.id));

  const groups: { key: string; heading: string; people: EmployeeView[]; team?: string }[] =
    room.kind === "all"
      ? [
          { key: "noTeam", heading: words.office.noTeam, people: employees.filter((e) => e.teamId === undefined) },
          ...staffed.map((team) => ({ key: team.id, heading: nameOf(team), people: employees.filter((e) => e.teamId === team.id), team: team.id })),
        ].filter((g) => g.key !== "noTeam" || g.people.length > 0)
      : room.kind === "team"
        ? [{ key: room.key, heading: nameOf(room.team), people: here, team: room.team.id }]
        : [{ key: room.kind, heading: words.office.rooms[room.kind], people: here }];

  const person = employees.find((e) => e.id === openId);
  const acts = person === undefined ? [] : actsFor(person, companyId, ready, words);

  const run = (act: Act) => {
    if (act.teach === true) {
      setTeaching(person);
      return close();
    }
    if (act.run === undefined) return close();
    const go = act.run;
    start(async () => {
      const result = await go();
      if (result.error !== undefined) setError(words.errors[result.error as keyof Dictionary["errors"]] ?? words.errors.unknown);
      else close();
    });
  };

  return (
    <>
      <RoomView plan={plan} words={words} openId={openId} onPick={pick} />
      {today}

      <div>
        {groups.map((g) => (
          <div key={g.key} style={{ marginBottom: 18 }}>
            <div className="grp">
              <h2>{g.heading}</h2>
              <span className="cnt">{g.people.length}</span>
            </div>
            <div className="cards">
              {g.people.map((p) => (
                <Card key={p.id} p={p} open={openId === p.id} locale={locale} words={words} now={now} onPick={pick} />
              ))}
              {g.people.length === 0 && <p className="col-empty">{words.office.nobodyHere}</p>}
              {/* people outside any team can be joined too, so a new company's office has a way to hire */}
              {(g.team !== undefined || g.key === "noTeam") && g.people.length > 0 && (
                <button className="addcard" type="button" onClick={() => setHireTeam(g.team ?? "")}>
                  <span className="plus">{Icon.plus}</span>
                  {g.team === undefined ? words.office.hireNoTeam : words.office.hireDesk}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div ref={pop} className="pop" role="dialog" aria-label={person === undefined ? undefined : words.office.actionOf(person.name)} data-open={person === undefined ? undefined : ""}>
        {person !== undefined && (
          <>
            <div className="p-hd">
              <span className="p-av">
                <Sprite species={person.species} size={32} />
                <span className="c-live" style={{ background: statusColor[person.status] }} />
                {person.agentLost && <AgentMark label={words.projects.agentLost} />}
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span className="p-name">{person.name}</span>
                <span className="p-role">{person.role}</span>
              </span>
              <span className={`chip ${statusClass(person.status)}`}>
                <span className={`dot ${statusClass(person.status)}`} />
                {words.employeeStatus[person.status]}
              </span>
            </div>
            <div className="p-rule" />
            <div className="p-state">
              <StateBlock p={person} locale={locale} words={words} now={now} />
            </div>
            <div className="p-rule" />
            <div className="p-acts">
              {acts.map((act) => {
                const cls = act.key === true ? "mrow mrow-key" : "mrow";
                const body = (
                  <>
                    {act.icon}
                    {act.label}
                  </>
                );
                return (
                  <span key={act.label} style={{ display: "contents" }}>
                    {act.href !== undefined && act.off === undefined ? (
                      <Link className={cls} href={act.href} onClick={close}>
                        {body}
                      </Link>
                    ) : (
                      <button className={cls} type="button" disabled={pending || act.off !== undefined} onClick={() => run(act)}>
                        {body}
                      </button>
                    )}
                    {act.off !== undefined && <p className="p-why">{act.off}</p>}
                  </span>
                );
              })}
              {error !== undefined && <p className="p-why" role="alert">{error}</p>}
            </div>
          </>
        )}
      </div>

      {teaching !== undefined && (
        <TeachDialog
          locale={locale}
          companyId={companyId}
          target={{ kind: "person", person: teaching }}
          memories={memories.filter((m) => m.employeeId === teaching.id)}
          areas={areas}
          onClose={closeTeach}
        />
      )}

      {hireTeam !== undefined && (
        <HireDialog
          locale={locale}
          companyId={companyId}
          roles={roles}
          teams={teams.map((team) => ({ id: team.id, label: nameOf(team) }))}
          team={hireTeam}
          career={plaza ? { areas, ready } : undefined}
          onClose={closeHire}
        />
      )}
    </>
  );
}
