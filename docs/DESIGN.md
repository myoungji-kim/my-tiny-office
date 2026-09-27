# My Tiny Office — Design

This document is where things are and how they look: the screens, what each one
holds, and how the player moves between them. The rest lives elsewhere:

| | |
| --- | --- |
| [`PRODUCT.md`](PRODUCT.md) | What the game is and why |
| [`GAMEPLAY.md`](GAMEPLAY.md) | The rules — tasks, review, memory, expertise, teams, hiring, history |
| [`STYLE-GUIDE.md`](STYLE-GUIDE.md) | Written visual rules — tokens, type, copy, i18n, accessibility |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | How it is built |

## The standard lives in `docs/ui/`

Eight pages define the current UI. Open [`docs/ui/index.html`](ui/index.html)
before building or changing a screen.

| Page | Authoritative for |
| --- | --- |
| `ui/first-run.html` | The three first-run steps, fields, species picker |
| `ui/office.html` | Layout, colour tokens, tile engine, status display, action popover |
| `ui/projects.html` | The task board, the review queue, and choosing who reviews |
| `ui/employees.html` | The list, a person's page, teaching, hiring, the org chart and teams |
| `ui/company.html` | Overview, history, the areas and roles lists, company memory |
| `ui/connect.html` | Attaching an agent, readiness checks, blocked states, the agent mark |
| `ui/components.html` | Buttons, menu rows, notices, empty states, dialogs, modals, forms |
| `ui/characters.html` | The twenty animal sprites, silhouette families, naming |

Every page loads two shared files and keeps only what is its own:

| File | Holds |
| --- | --- |
| `ui/system.css` | The token block and every rule more than one page uses |
| `ui/system.js` | The cast and painter, the shared words, the sample company, and the dialogs and menus more than one screen opens |

A page opens by double-clicking it; nothing here needs a server. A pattern that
is in neither `ui/` nor the style guide is not a pattern yet: add it to `ui/`
first. Superseded directions sit in [`archive/`](archive/README.md) for
comparison only.

## Visual direction

Cozy Scandinavian office + simple pixel-art illustration + developer dashboard
information density + subtle developer humor.

> **The chrome is monochrome. Colour belongs to the office and to the data.**

Avoid:

- neon cyberpunk
- overly decorative dashboards
- CCTV-style camera presentation
- 3D realism
- texture or warmth applied to the chrome instead of to the office

Density comes from status, progress and cards — not from decoration. What the
player should see first: who is working, their current task, review status,
blockers, recent activity, team workload.

## The app

```text
┌─────────────┬──────────────────────────────────────────────┐
│ ⌂ My Tiny   │ 사무실                  2026. 9. 26. (토) 10:24 │
│   Office    │ 책상 6석 중 5석 사용                            │
│             ├──────────────────────────────────────────────┤
│ 사무실      │ 전체 · 백엔드팀 · 프론트엔드팀 · 휴게실 · +    │
│ 프로젝트    ├──────────────────────────────────────────────┤
│ 직원        │ ┌──────────────────────────────────────────┐ │
│ 회사        │ │        office tilemap (canvas)           │ │
│ ─────────   │ │   desks · characters · status bubbles    │ │
│ · 모카      │ └──────────────────────────────────────────┘ │
│ · 두부      │ 백엔드팀 3                                    │
│ · 단풍      │ ┌────────┐ ┌────────┐ ┌────────┐ ┌ ─ ─ ─ ┐  │
│             │ │ card   │ │ card   │ │ card   │  빈 책상  │
│ ─────────   │ └────────┘ └────────┘ └────────┘ └ ─ ─ ─ ┘  │
│ 설정        │ 프론트엔드팀 2                                │
└─────────────┴──────────────────────────────────────────────┘
```

One floating white panel on a grey page. The sidebar is fixed width and carries
the company's name (which leads to the company screen), the menu, and the
active company's roster.

Five places, and the office is the first:

```text
사무실 · 프로젝트 · 직원 · 회사        설정
Office · Projects · People · Company   Settings
```

The menu names where something lives, not what state it is in. Review is a
phase a task passes through, so it has no place of its own: it shows on the
office floor and in the activity feed. A menu called PR would also be the only
word in the sidebar that assumes the company writes software. This is a
decision about navigation; the `PullRequest` entity is unaffected.

**Acting and knowing are different surfaces.** Selecting a desk, a roster row
or an employee card opens an **action popover anchored to what was clicked**,
with selection kept in sync across all three; the popover may cover the
neighbouring card. Reading someone in full is their page, never a permanent
inspector panel.

## The office

A pixel tile engine, not an SVG scene and not a sprite library. The room renders
at 3× (48px tiles), with one outline colour for furniture and characters so it
reads as one scene. Names and status labels are DOM elements over the canvas;
the sprite rules are in the style guide.

A tab is a room: the whole floor, each team's room, the lounge. The whole floor
groups cards by team, with anyone without a team first under 팀 없음. A team's
cards end in 빈 책상에 직원 채우기, which hires into the free desk and reads
빈 책상이 없어요 when none is left.

### Status

Status mirrors the domain rather than inventing its own vocabulary:

| Status | Meaning | Shown as |
| --- | --- | --- |
| `working` | A task is in progress | Amber dot with ring, live progress |
| `ready` | A task is assigned, not started | Hollow blue dot |
| `available` | No task assigned | Solid green dot |
| `vacation` | Employee is away | Grey dash |

Colour never carries status alone — **the dot shape differs too**. Further
runtime states (`blocked`, `disconnected`, `failed`, `reviewing`) get the same
treatment when their systems exist.

### The action popover

The actions offered follow the domain's own transitions. The UI presents them;
it does not re-implement them.

| State | Actions |
| --- | --- |
| `working` | 완료 처리 · 업무 상세 · 담당 변경 · 기억 가르치기 |
| `ready` | 업무 시작 · 다른 업무로 교체 · 기억 가르치기 · 할당 취소 |
| `available` | 업무 할당 · 기억 가르치기 · 휴가 보내기 |
| `vacation` | 업무 할당 *(disabled, with the reason)* · 복귀 처리 · 기억 가르치기 |

An action the domain forbids is shown **disabled with a one-line reason**, not
hidden; the rule is the thing worth teaching. 기억 가르치기 is offered in every
state because it is not a transition: it changes what someone knows, not what
they are doing.

## The board

```text
대기열  →  진행 중  →  승인 대기  →  완료
                          ↓ 보완 요청 (사유를 남기고)
                        진행 중
                          ↓ 보류
                        보류
```

A column is a status a task rests in; the statuses and their rules are in
GAMEPLAY.md. Whoever is free picks work out of the backlog, so the board has no
start button: the player says what the work is and who should do it.

- **The approval column is the player's gate**, and its popover says so in as
  many words: nothing has been applied anywhere yet; approving is what applies
  it. Sending back asks for a reason; holding keeps it.
- **A card shows time taken, never a share of an estimate.** In progress it says
  how long it has been running; finished, how long it took.
- **Blocked rides on the card** as a mark and a reason, never as a column.
- **A colleague's review shows on the card** while the task is in progress.

### The two dialogs

**A dialog answers what a choice means, while the choice is being made.** Both
dialogs on the board re-render on every selection so they can say it.

New task asks for the project, the title, the area, the priority and the
assignee. The area decides who may review the work later, so the dialog names
those people instead of leaving it to be discovered in the approval column. The
assignee defaults to whoever is free, and naming a person says what it costs:
someone free starts right away, someone busy queues behind their current work,
and someone on leave cannot be chosen at all.

New project asks for a name, a line about what it changes, and the folder the
office works in. A project without a folder is allowed, because naming the work
usually comes before deciding where it lives, and the dialog says what that
costs: the tasks can be written down, but nobody can start them.

### An action sits with what it acts on

```text
프로젝트                                   [+ 새 프로젝트]   ← the page, and its action
[전체][결제 개편][주문 v2]                                  ← which project
───────────────────────────────────────────────────────
결제 개편                              [⋯] [+ 새 업무]      ← this project, and its actions
결제 흐름을 정리하고 웹훅을 믿을 수 있게 만들어요. · ~/Projects/tinysoft
───────────────────────────────────────────────────────
[the board]
```

The project has a line of its own between the tabs and the board, carrying its
name, what it is for, where it lives, and the two actions that are its own. A
project with no folder says so there. **The rarer action can be the page's, and
the frequent one still gets the only solid button**, because primary is about
what the screen is for, not which row it sits in.

### Correcting and removing

The same dialogs correct what they made. A task's popover and a project's `⋯`
open them filled in, and the button says save instead of create.

**Finished work is not rewritten.** A task in the done column is the record of
what happened, and one waiting for approval is finished too — the answer there
is to approve it, send it back or hold it.

**A task in progress is redirected, not re-specified.** Telling someone
something different is ordinary: the run stops, the conversation resumes with
the change, and what is already written stays. The button says it sends the
change rather than saving it. Moving the task to another project is locked —
that is a different folder — with the way around it, which is to hold the task
first. Handing it to someone else starts a new session, and the dialog says so
before it happens. ARCHITECTURE.md has the two commands this maps to.

Where a task sits keeps following from who is on it: give a queued task to
someone free and it starts; take the assignee away from one in progress and it
goes back to the backlog.

**Removing says what is being thrown away, unless nothing has happened yet.** A
task in the backlog is gone on the spot. Past that, the dialog names what is
lost: an agent stopped mid-task, finished work never applied, a project taking
its tasks with it.

## People

Employees are animals, not people. At 16×16 a silhouette carries identity
further than a face does, and the cast is the game's character. The species is
shown by the sprite, never spelled out next to the name.

The people screen has three tabs — 목록, 조직도, 기억 — and the list is only a
list: every row opens that person's page. Columns are fixed shares, so a
person's team starts at the same place on every row.

### A person's page

The header keeps who they are, their status, 기억 가르치기, 업무 맡기기 and a
`⋯`; the rest is in tabs, each with its own address (`#p1`, `#p1/memory`,
`#p1/style`), so no tab grows long enough to bury another.

| Tab | Holds |
| --- | --- |
| 개요 | What they are on now, their record, the three memories they use most, their expertise. It fits on one screen |
| 기억 | Their areas down the left, with 전체; the memories of whichever is picked on the right. Each has a `⋯` to correct or delete it |
| 일하는 방식 | The rules they carry into every task. Each is corrected or deleted in place |

While someone is on leave, 업무 맡기기 stays in the header, disabled, with the
reason beside it. Until they have done anything, 지금 says 방금 입사했어요; after
leave, 휴가에서 막 돌아왔어요 — never an invented last task.

The header's `⋯`:

| | |
| --- | --- |
| 정보 바꾸기 | The hire dialog again, filled in: species, name, role, team |
| 휴가 보내기 / 복귀 처리 | If they are on a task, it says first that the task goes back to the backlog |
| 내보내기 | A confirm dialog, because it cannot be undone |

### Memory on screen

Memory is carried into every task, so a long list is not only hard to read — it
is context the agent pays for. The screen treats length as something to manage:

| | |
| --- | --- |
| 분야별로 보기 | The memory tab lists a person's areas in the company's order; one area at a time, or 전체 grouped by area, **most-referenced first** |
| 크기 | A person's page shows how many characters go with every task |
| 정리 | A memory referenced zero times is flagged where it sits and on the people screen's memory tab. One just taught is not: nobody has had the chance to use it |

### Assigning work

The assign modal shows **what this person brings to this task** before the work
starts: the memories in the task's area, most-referenced first. It is a preview,
not a choice — everything is carried anyway — so it reads *이 업무에 쓸 만한
기억*, with a line saying so.

When they have none, the modal says so and offers 지금 알려주기, the moment the
player actually has the context to teach. Teaching there comes back to the same
task, which now lists what was just taught.

새 업무 만들기 opens the board's new-task fields in place — project, title,
description, area, priority — without the assignee, who is already chosen.
Changing the area redraws what they bring, so the player sees before creating
it whether this person has anything to draw on. A task made here goes straight
to them; one picked from the backlog leaves it.

### Teaching

Every "teach" in the game opens one dialog. Where it was opened from decides
only what is already filled in:

| Opened from | Already filled in |
| --- | --- |
| A person's page, or the office popover | Who |
| 지금 알려주기 in the assign modal | Who, the task's area, and the task as source |
| 알려줄 직원 고르기 on the 분야·역할 tab | The area; the player picks who |
| 회사 전체에 알려주기 | The whole company; company memory has no area |

The dialog asks for an **area** and the **text**, a sentence or two. A source
the entry point knows shows as one line (출처: 결제 내역 페이지네이션) the player
can uncheck; otherwise nothing is shown. Before anything is saved it says what
the teaching does — *품질이 모카의 전문 분야가 돼요* when it is their first
memory in an area, and always how much more they will carry (195자 → 215자).
The payoff and the cost are both part of the decision.

Areas are not made here. Below the area chips, a line points back: 찾는 분야가
없나요? 회사 › 분야·역할에서 추가하기.

### Teams

Teams are managed on the org chart, where they are shown. 팀 추가 at the foot
names a new one; a team's `⋯` renames or deletes it, asking which team its
people move to (팀 없음 included) when it has any; a person's `⋯` moves them to
another team or takes them off theirs. People without a team come first under
팀 없음, which cannot be renamed or deleted.

A default team speaks both languages; one the player names is shown as
written. The office's 방 추가 offers the teams that have no room yet.

### Hiring

First-run hires the first person in its own steps. Every hire after that opens
one dialog: species, name, role and team. The button waits for a species and a
name the player wrote, and says who it hires (*호두 고용하기*). The dialog says
before it happens that they start simulated.

| Opened from | Already filled in |
| --- | --- |
| 직원 고용 on the people screen | Nothing — the team offers 팀 없음 first |
| An empty team on the org chart | The team |
| 빈 책상에 직원 채우기 in the office | The team; the new person sits at the free desk |

Their page opens next, where the first thing to do is teach them.

## Company

The office shows what is happening now; the company shows what has happened
so far. It is opened now and then to look back, so it sits last in the menu,
and the company's name at the top of the sidebar leads there too.

| Tab | Holds |
| --- | --- |
| 개요 | The company's name (editable here), four running totals with this week's gain, the people and how long each has been here, finished projects, the latest milestones |
| 연혁 | Milestones by month, newest first |
| 분야·역할 | The two lists the company keeps — expertise and roles |
| 회사 기억 | What everyone knows, taught to the whole company |

Each tab is named for what it holds, so a player looking for roles finds them
without opening a tab to see. The tabs have addresses (`#lists`, `#memory`) so
teaching elsewhere can point straight at 분야·역할.

**Totals, not a dashboard.** Four numbers and a weekly gain, no charts. A
finished project is kept as its name, its span, its task count and the people
who worked on it. Which milestones exist is in GAMEPLAY.md; each is stored as
its kind and facts and worded by the dictionary when shown.

### The two lists

Expertise and roles are edited the same way, in the table that shows them: add
at the foot, and a row's `⋯` renames or deletes it. A row whose contents would
be lost asks where they go first; an empty one asks once more in place. An
empty row reads 아직 아무도 없어요 in both lists; an area adds 알려주기, which
opens teaching for it.

The areas table answers "who knows this one", and the tab leads with a notice
for any area nobody knows. The roles table shows who holds each title; the last
role cannot be deleted. A default area speaks both languages; a role, or
anything the player named, is shown as written.

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
with — that question belongs to the moment of connecting. It does not ask for a
team either.

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
an unchanged status — still working, no longer for real. Never fold connection
into the status colour.

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
Never read a credential store.

Connecting also needs the workspace to be trusted, and **that has no
non-interactive path** — one `claude` run in the folder, accepted by the
player. The connection screen has to ask for it as plainly as it asks for
login. ARCHITECTURE.md has the measured runtime surface.

## Open questions

- **Whose is the folder, the project's or the employee's?** The board and
  ARCHITECTURE.md §11 give each project a workspace; the connection screen above
  gives each employee one. A task names a project and an agent has to run
  somewhere; one of the two has to go.
- **Estimate or elapsed time in the office?** The board shows time taken and
  never a share of an estimate, but office cards still show a progress bar, and
  ARCHITECTURE.md §3 derives progress from `estimatedDuration`. A simulated
  employee can have an estimate; a connected one cannot.
- **The domain's task statuses predate the board.** `src/domain/task.ts` needs
  backlog, working, approval, done and held, plus the blocked mark.
- **Growth.** PRODUCT.md lists office progression, but no stage is designed. Desks
  are the likeliest lever: hiring already needs a free one.
- **A 내 차례 / Needs you inbox**, holding reviews waiting on the player, blocked
  employees and lost connections, if reviews on the floor turn out easy to miss.
