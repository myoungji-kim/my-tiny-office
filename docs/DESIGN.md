# My Tiny Office — Design

## The standard lives in `docs/ui/`

Six pages define the current UI. Open [`docs/ui/index.html`](ui/index.html)
before building or changing a screen.

| Page | Authoritative for |
| --- | --- |
| `ui/first-run.html` | The three first-run steps, fields, species picker |
| `ui/office.html` | Layout, colour tokens, tile engine, status display, action popover |
| `ui/employees.html` | List and detail, org chart, memory, review areas |
| `ui/connect.html` | Attaching an agent, readiness checks, blocked states, the agent mark |
| `ui/components.html` | Buttons, menu rows, notices, empty states, dialogs, modals |
| `ui/characters.html` | The twenty animal sprites, silhouette families, naming |

Every page loads two shared files and keeps only what is its own:

| File | Holds |
| --- | --- |
| `ui/system.css` | The token block and every rule more than one page uses |
| `ui/system.js` | The palette, the sprites, the tile painter, the cast, the sample bar |

A page opens by double-clicking it; nothing here needs a server.

This document holds the direction and the screen structure. Written rules —
token values, typography, i18n, accessibility — are in
[`STYLE-GUIDE.md`](STYLE-GUIDE.md). Patterns that exist in neither are not
patterns yet: add them to `ui/` first.

Superseded directions sit in [`archive/`](archive/README.md) for comparison
only.

## Navigation

Five places, and the office is the first:

```text
사무실 · 프로젝트 · 직원 · 회사        설정
Office · Projects · People · Company   Settings
```

Navigation names where something lives, not what state it is in. Review is a
phase a task passes through, so it has no place of its own: it shows up on the
office floor, where the player can already see who is reviewing and what is
blocked, and in the activity feed. A menu called PR would also be the only word
in the sidebar that assumes the company writes software.

The company's own `PullRequest` entity and its review events are unaffected.
This is a decision about navigation, not about the domain.

If reviews turn out to be easy to miss, the answer is a "내 차례 / Needs you"
inbox that also holds blocked employees and lost agent connections — not a list
of PRs.

## Visual Direction

Cozy Scandinavian office + simple pixel-art illustration + developer dashboard
information density + subtle developer humor.

The governing split:

> **The chrome is monochrome. Colour belongs to the office and to the data.**

Greys, one near-black, hairline borders. The only saturated colour in the
interface is a progress bar, a status dot, or the office itself. A primary
button is near-black, not brand-coloured — a button is chrome.

Avoid:

- neon cyberpunk
- overly decorative dashboards
- CCTV-style camera presentation
- 3D realism
- texture or warmth applied to the chrome instead of to the office

## Main Screen

```text
┌─────────────┬──────────────────────────────────────────────┐
│ MY TINY     │ 사무실                      [ + 직원 고용 ]   │
│ OFFICE      │ 백엔드팀 · 책상 6석 중 5석 사용                │
│             ├──────────────────────────────────────────────┤
│ 홈          │ 전체 · 백엔드팀 · 프론트엔드팀 · 휴게실 · +    │
│ 사무실      ├──────────────────────────────────────────────┤
│ 프로젝트    │ ┌──────────────────────────────────────────┐ │
│ PR·코드리뷰 │ │        office tilemap (canvas)           │ │
│ 직원        │ │   desks · characters · status bubbles    │ │
│             │ └──────────────────────────────────────────┘ │
│ ─────────   │                                              │
│ workspace   │ 백엔드팀 3                                    │
│ · 모카      │ ┌────────┐ ┌────────┐ ┌────────┐ ┌ ─ ─ ─ ┐  │
│ · 두부      │ │ card   │ │ card   │ │ card   │   + 채용    │
│ · 단풍      │ └────────┘ └────────┘ └────────┘ └ ─ ─ ─ ┘  │
│ ─────────   │                                              │
│ 설정        │ 프론트엔드팀 2                                │
└─────────────┴──────────────────────────────────────────────┘
```

The app is one floating white panel on a grey page. The sidebar is fixed width
and carries navigation plus the active company's roster. The main column is
header → room tabs → office → team cards.

There is no permanent inspector panel. Selecting a desk, a roster row or an
employee card opens an **action popover anchored to what was clicked**, and
selection stays in sync across all three. The popover covers the neighbouring
card while open; that is accepted.

## The Office

A pixel tile engine, not an SVG scene and not a sprite library.

- Tiles and characters are 16×16 strings over a shared palette
- Drawn to `<canvas>` at **integer scale only**, `imageSmoothingEnabled = false`
- The room renders at 3× (48px tiles)
- One outline colour for furniture and characters alike, so it reads as one scene
- **No text inside the canvas.** Names and status labels are DOM elements
  positioned over it, and the canvas stays `aria-hidden` with `<button>`s in the
  overlay carrying accessibility

## Employees

Employees are animals, not people. At 16×16 a silhouette carries identity
further than a face does, and the cast is the game's character.

- **Nickname** — the player names each employee. Player input never goes
  through i18n.
- **Species** — picks a sprite. Cosmetic only; it never affects stats.
- **Role** — a domain value. Technical titles stay in English.

The species is shown by the sprite, never spelled out next to the name.

See `ui/characters.html` for the twenty species and the silhouette-family rule.

### Expertise is taught, not grown

An employee's expertise is not a number that fills up over time. It is **what
the player has told them**, and under the Claude Code runtime that is not a
metaphor: an employee's memory is what their agent actually carries into the
work.

```text
업무나 PR에서 문제가 나옴
  → 그 자리에서 "이거 기억해둬"
  → 그 직원의 기억에 추가 (출처 = 그 업무)
  → 다음 업무에서 참조됨
  → "모카가 [인덱스 규칙]을 참고했어요"   ← 루프가 닫히는 지점
```

The last step is the one that makes the system legible. Without visible
evidence that a memory was used, teaching is just a notes field.

An employee therefore carries:

| | | |
| --- | --- | --- |
| 역할 | assigned by the player | "너는 DBA 담당" |
| 기억 | told by the player | what they know |
| 일하는 방식 | told by the player | how they work |
| 실적 | counted | what they actually did |

**Every number on this screen is a count of something real** — memories,
references, tasks, reviews. There are no invented 0–100 bars, because a number
nobody can explain teaches the player nothing.

A memory belongs to one employee, or to the company when everyone should know
it. Company-scoped, never global: this follows the same ownership chain as an
agent session.

### Areas

An area is the vocabulary that memory, tasks and PR review all share. **The
company owns the list**, not the engine — a studio that cares about 게임 서버
should be able to say so.

The list lives on the memory tab as a coverage table rather than in settings,
because the useful question is never "what areas exist" but "who knows this
one". An area that is a *review seat* can be asked for by a PR; 프로세스 is
worth knowing and nobody reviews for it.

Review eligibility falls out of memory: an employee who holds memory in an area
can take that seat. Two things are worth saying out loud, and the memory tab
leads with both:

- an area **no employee knows**, so that PR cannot be reviewed
- a memory that has **never been referenced**, which is either wrong or was
  given to the wrong person

### When memory gets long

Memory is carried into the work, so a long list is not only hard to read — it
is context the agent pays for on every task. The screen treats length as a
thing to manage:

| | |
| --- | --- |
| 분야별 묶기 | Two per area, **most-referenced first**, the rest behind 더 보기 |
| 크기 | The detail panel shows how many characters go with every task |
| 보관 | Kept, not carried. Excluded from counts, coverage and size |
| 정리 | A memory referenced zero times is flagged where it sits and on the memory tab |

Reference count is what makes this safe to automate later: the memory that
earns its place is the one that keeps getting used.

### Assigning work

The assign modal exists to show **what this person brings to this task** before
the work starts — the memories in the task's area, most-referenced first. It is
the same loop seen from the other end.

When they have none, the modal says so and offers to teach them right there.
That is the moment the player actually has the context to teach.

## Status

The office must be readable at a glance. Status mirrors the domain rather than
inventing its own vocabulary:

| Status | Meaning | Shown as |
| --- | --- | --- |
| `working` | A task is in progress | Amber dot with ring, live progress |
| `ready` | A task is assigned, not started | Hollow blue dot |
| `available` | No task assigned | Solid green dot |
| `vacation` | Employee is away | Grey dash |

Colour never carries status alone — **the dot shape differs too**.

Further runtime states the agent layer can report (`blocked`, `disconnected`,
`failed`, `training`, `reviewing`) get the same treatment when their systems
exist: a distinct dot shape, a label, and no reliance on hue.

## Actions

The actions offered for an employee follow the domain's own transitions. The UI
presents them; it does not re-implement them.

| State | Actions |
| --- | --- |
| `working` | 완료 처리 · 업무 상세 · 담당 변경 |
| `ready` | 업무 시작 · 다른 업무로 교체 · 할당 취소 |
| `available` | 업무 할당 · 교육 보내기 · 휴가 보내기 |
| `vacation` | 업무 할당 *(disabled, with the reason)* · 복귀 처리 |

An action the domain forbids is shown **disabled with a one-line reason**, not
hidden. The rule is the thing worth teaching.

## Information Density

Prioritize:

- employee progress
- current task
- review status
- blockers
- recent activity
- team workload

Density comes from status, progress and cards — not from decoration. Decorative
art supports comprehension rather than consuming the information area.

## First run

```text
앱 실행
  │
  ├─ 회사 없음 → 회사 만들기 → 첫 직원 고용 → 사무실 도착 → 업무 맡기기
  │                                                    ▲
  │                          여기까지 Claude Code 없이 됩니다
  │
  └─ (언제든, 선택) 직원에게 에이전트 연결 → 그 직원만 실제로 일합니다
```

**The runtime is an upgrade, not a gate.** An employee does not require an
agent to exist, so first run must never stop at a login. A game that cannot be
started without an AI tool is an AI tool.

First run mentions Claude Code once, as a notice, and moves on. It does not ask
the player to choose a runtime before they have an employee to judge the choice
with — that question belongs to the moment of connecting.

It ends at the **first employee**, not at the company. A player dropped into an
empty office has nothing to look at, and the office is the product. Every field
says it can be changed later, because a first decision should not feel heavy.

## Simulated and connected employees

Both are employees and both do work. The difference is whether the work is real.

| | Work | Progress |
| --- | --- | --- |
| Simulated | Nothing happens outside the game | Derived from elapsed time |
| Connected | An agent actually works in a folder | Reported by the runtime |

**The office must show which is which.** Hiding it would make the game claim
more than it does. It is a second axis, not a fifth status, so it takes its own
corner: **status is the dot at bottom-right, the agent is the mark at
top-left.** A connected employee whose session dropped reads as a red mark with
an unchanged status — still working, no longer for real.

Never fold connection into the status colour. "일하는 중" and "진짜로 일하는
중" would stop being distinguishable.

## Agent connection

The player sees the runtime as an employee configuration, never as an account
setup:

```text
모카 — Backend Engineer

Agent Runtime
[ Claude Code ]

Workspace
~/Projects/tinysoft

Connection
● Ready

[ 연결하기 ]
```

**The workspace belongs to the employee**, not the company. Two employees can
work in different repositories, which is the normal case once a company has a
frontend and a backend. A company-level default may be offered, but ownership
stays with the employee — the same chain as the agent itself.

### We do not handle authentication

Claude Code owns its own login. The game detects and explains; it never
authenticates.

| State | Detected by | What the screen says | Fixed |
| --- | --- | --- | --- |
| Not installed | `claude` is not on PATH | The office runs without it; installing it makes employees work for real | Install |
| **Not logged in** | Running the CLI returns an auth error | Run `claude` once in a terminal to log in, then **[다시 확인]** | **Outside this app** |
| Ready | The CLI runs | Connection available | — |

The second row is the one that matters. The fix happens somewhere the game
cannot reach, so the screen has to say so plainly. **Never add a token field.**
Never read a credential store. This is where that temptation appears.

`claude auth status --json` answers this for free and follows account changes
live. See ARCHITECTURE.md for the rest of the measured runtime surface.

Connecting also needs the workspace to be trusted, and **that has no
non-interactive path** — one `claude` run in the folder, accepted by the
player. The connection screen has to ask for it as plainly as it asks for
login.

## Localization

Never bake text into canvas, SVG or any other visual asset.

Avoid fixed widths and hard-coded line breaks. Korean and English must be able
to expand and contract naturally — the popover was widened once because an
English role outgrew it.

Player-supplied text — nicknames, company names — never goes through i18n.
