# My Tiny Office — Design

## The standard lives in `docs/ui/`

Eight pages define the current UI. Open [`docs/ui/index.html`](ui/index.html)
before building or changing a screen.

| Page | Authoritative for |
| --- | --- |
| `ui/first-run.html` | The three first-run steps, fields, species picker |
| `ui/office.html` | Layout, colour tokens, tile engine, status display, action popover |
| `ui/projects.html` | The task board, the review queue, and choosing who reviews |
| `ui/employees.html` | The list, a person's page, org chart, memory in use |
| `ui/company.html` | Overview, finished projects, milestones, areas, company memory |
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

## The board

```text
대기열  →  진행 중  →  승인 대기  →  완료
                          ↓ 보완 요청 (사유를 남기고)
                        진행 중
                          ↓ 보류
                        보류
```

A column is a status a task rests in. Whoever is free picks work out of the
backlog themselves, so the board carries no start button: the player says what
the work is and who should do it, and the office does the rest.

**Approval is the player's, and it is the only gate.** An employee's work
finishes on their own machine and touches nothing else. Applying it — pushing,
writing, deploying — is a step the office never takes by itself. The approval
column is that line, and the popover says so in as many words: nothing has been
applied anywhere yet, approving is what applies it. Sending it back asks for a
reason and returns it to progress; holding parks it with the reason attached.

**A colleague's review happens inside progress, not after it.** When a task's
area calls for another pair of eyes, the office suggests someone who has been
taught that area, and the two of them work it out while the work is still in
progress. Review is not a stage of its own, because a task under review is
still being worked on.

**Time is what the work has taken, never a share of an estimate.** With a real
agent doing the work, nobody knows when it ends, so a progress bar filling
towards a guess would be a lie. A card in progress says how long it has been
running; a finished one says how long it took. The estimate survives only as
something the player wrote down.

**Blocked is not a column.** A task is always blocked *out of* whichever status
it is in — an agent that stopped, a dependency that never arrived. It rides on
the card as a mark and a reason, so the board never has to guess which kind of
stuck it means.

Which statuses exist is the domain's call. `src/domain/task.ts` predates this
and needs to catch up: the board shows backlog, working, approval, done and
held, plus the blocked mark.

### The two dialogs

**A dialog answers what a choice means, while the choice is being made.** Both
dialogs on the board re-render on every selection so they can say it.

New task asks for the project, the title, the area, the priority and the
assignee. The area decides who may review the work later, so the dialog names
those people instead of leaving it to be discovered in the approval column. The
assignee defaults to whoever is free — that is how the backlog works — and
naming a person says what it costs: someone free starts right away, someone
busy queues behind their current work, and someone on leave cannot be chosen at
all.

New project asks for a name and the folder the office works in. A project
without a folder is allowed, because naming the work usually comes before
deciding where it lives, and the dialog says what that costs: the tasks can be
written down, but nobody can start them.

### Correcting and removing

The same dialogs correct what they made. A task's popover and a project's `⋯`
open them filled in, and the button says save instead of create.

**Finished work is not rewritten.** A task in the done column is the record of
what happened, and one waiting for approval is finished too — the answer there
is to approve it, send it back or hold it. Neither offers an edit.

**A task in progress is redirected, not re-specified.** Someone is working in
that project's folder right now, and telling them something different is an
ordinary thing to do: the run stops, the conversation resumes with the change,
and what is already written stays where it is. The button says it is sending
the change rather than saving it, because that is what happens. Moving the task
to another project is not ordinary — that is a different folder — so the field
is locked with the way around it, which is to hold the task first. Handing it
to someone else starts a new session, so the work begins again with only the
folder carried over, and the dialog says so before it happens.

`docs/ARCHITECTURE.md` has the two commands this maps to.

Where a task sits keeps following from who is on it: give a queued task to
someone free and it starts, take the assignee away from one in progress and it
goes back to the backlog.

**Removing says what is being thrown away, unless nothing has happened yet.** A
task in the backlog is gone on the spot — nobody has touched it. Past that,
work was done, so the dialog names what is lost: an agent stopped mid-task,
finished work that was never applied, a project taking its tasks with it.

**Whether the folder belongs to the project or to the employee is unsettled.**
`docs/ARCHITECTURE.md` §11 gives each project a workspace; *Agent connection*
below gives each employee one. The board assumes the project, because a task
names a project and an agent has to run somewhere. One of the two has to go.

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

The app is one floating white panel on a grey page. The sidebar is fixed width
and carries the company's name (which leads to the company screen), navigation
and the active company's roster. The main column is
header → room tabs → office → team cards.

There is no permanent inspector panel. Selecting a desk, a roster row or an
employee card opens an **action popover anchored to what was clicked**, and
selection stays in sync across all three. The popover covers the neighbouring
card while open; that is accepted.

Reading an employee in full is a page, not a panel. The people list is only a
list, and each row opens that person's page. The popover is for acting on
someone; the page is for knowing them.

A person's page keeps its header — who they are, their status, 기억 가르치기
and 업무 맡기기 — and splits the rest into tabs, each with its own address
(`#p1`, `#p1/memory`, `#p1/style`), so no tab grows long enough to bury
another:

| Tab | Holds |
| --- | --- |
| 개요 | What they are on now, their record, the three memories they use most, the areas they can review. It fits on one screen |
| 기억 | Their areas down the left, with 전체; the memories of whichever is picked on the right |
| 일하는 방식 | The rules they carry into every task, whatever the area. Each is corrected or deleted in place |

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

### Expertise (전문 분야)

An area of expertise is the vocabulary that memory, tasks and PR review share.
**The company owns the list**, not the engine — a studio that cares about
게임 서버 should be able to say so. From a person's side it reads as what they
are expert in: 모카의 전문 분야 — 데이터베이스, 아키텍처.

Expertise is taught, never assigned. A role (DBA) and a team (백엔드팀) are
what the player decides someone is; an area becomes theirs only when they are
taught something in it. Tying the two together would make DBA mean "already
knows databases" and take away the reason to teach.

What someone is told falls into one of three places, and only one has an area:

| | What | Area |
| --- | --- | --- |
| 기억 | Expert knowledge — "복합 인덱스는 컬럼 순서가 중요해요" | Always |
| 일하는 방식 | How this person works — "테스트를 먼저 써" | None |
| 회사 기억 | What everyone follows — "커밋은 conventional prefix로" | None |

There is no 프로세스 area: a rule about how work is done is a way of working,
not expertise.

Review follows from expertise without being explained on screen: whoever has
been taught an area can review a PR in it. Every area counts; there are no
seats to turn on or off.

The list lives on the company's 규칙 tab as a coverage table rather than in
settings, because the useful question is never "what areas exist" but "who
knows this one". Two things are worth saying out loud:

- an area **no employee knows** — its work starts with nothing to draw on and
  nobody can review it. The 규칙 tab leads with it, and its button opens
  teaching with the area already chosen
- a memory that has **never been referenced**, which is either wrong or was
  given to the wrong person — the people screen's memory tab leads with it

The list is changed where it is shown. 분야 추가하기 opens a row at the foot of
the table for a name; each row's `⋯` renames it or deletes it.

- The seven default areas speak both languages. One the player adds or renames
  is their text, shown as written in either, like a nickname.
- An area with memory in it is not deleted outright: a dialog asks where that
  memory goes. An empty one asks once more in place.
- Memory and tasks point at an area by id, so a rename changes nothing else.

Areas are made only here. The teaching dialog offers the list as it stands and
a line pointing back — 찾는 분야가 없나요? 회사 › 규칙에서 추가하기 — rather than a
second place to create them.

### When memory gets long

Memory is carried into the work, so a long list is not only hard to read — it
is context the agent pays for on every task. The screen treats length as a
thing to manage:

| | |
| --- | --- |
| 분야별로 보기 | The memory tab lists a person's areas in the company's order; one area at a time, or 전체 grouped by area, **most-referenced first** |
| 크기 | A person's page shows how many characters go with every task |
| 정리 | A memory referenced zero times is flagged where it sits and on the memory tab. One just taught is not: nobody has had the chance to use it |

Reference count is what makes this safe to automate later: the memory that
earns its place is the one that keeps getting used.

### Assigning work

The assign modal exists to show **what this person brings to this task** before
the work starts — the memories in the task's area, most-referenced first. It is
the same loop seen from the other end.

It is a preview, not a choice. Everything live is carried into every task, as
a person brings everything they know; the modal only points at the part that
bears on this one. The one way to stop carrying a memory is to delete it, and
that is a decision about the person, not about a task.

When they have none, the modal says so and offers to teach them right there.
That is the moment the player actually has the context to teach. Teaching from
there comes back to the same task, which now lists what was just taught.

### Teaching

Every "teach" in the game opens one dialog. Where it was opened from decides
only what is already filled in:

| Opened from | Already filled in |
| --- | --- |
| A person's page, or the office popover | Who |
| 지금 알려주기 in the assign modal | Who, and the task's area |
| 알려줄 직원 고르기 on the 규칙 tab | The area; the player picks who |
| 회사 전체에 알려주기 | The whole company; company memory has no area |

The dialog asks for an **area**, because a memory is always expertise in
something; the **text**, a sentence or two; and optionally **where it came
from** — told directly, or the task they are on. Before anything is saved it
says what the teaching does: when this is their first memory in an area,
*품질이 모카의 전문 분야가 돼요*, and always how much more they will carry into
every task (195자 → 215자). The payoff and the cost are both part of the
decision.

A memory's `⋯` corrects it (고치기, the same dialog) or deletes it. There is
no archive: what is not worth carrying is not worth keeping. Deleting asks
once more in place, because it cannot be undone.

### Teams

A company is organised in teams and nothing above them. There are no
departments: a tiny office does not need a second level, and a person's line
reads *Backend Engineer · 백엔드팀*.

A team is optional. A company of one has no reason to have one, so first-run
never asks, and the first hire starts with 팀 없음. Teams appear when the
company grows enough to split its work — which is also when 연혁 records
팀 생김. Someone without a team reads as just their role.

Teams are managed on the org chart, where they are shown. 팀 추가 at the foot
names a new one; a team's `⋯` renames it or deletes it; a person's `⋯` moves
them to another team.

- A default team speaks both languages. One the player names or renames is
  shown as written, like a nickname.
- A team with people in it is not deleted outright: a dialog asks which team
  they move to, 팀 없음 included. An empty one asks once more in place.
- People without a team are listed first on the org chart and on the office's
  whole floor, under 팀 없음; that group cannot be renamed or deleted. A
  person's `⋯` can also take them off their team.
- The hire dialog offers 팀 없음 first, unless it was opened from a team.
- A team is organisation, a room is space. Making a team does not build its
  room; the office's 방 추가 offers the teams that do not have one yet.

### Hiring

First-run hires the first person in its own steps. Every hire after that opens
one dialog: who they are (species), their name, their role and their team. The
button waits for a species and a name the player wrote, and says who it hires
(*호두 고용하기*), because an employee the player did not name is not theirs.

| Opened from | Already filled in |
| --- | --- |
| 직원 고용 on the people screen | Nothing |
| An empty team on the org chart | The team |
| 빈 책상에 직원 채우기 in the office | The team; the new person sits at the free desk |

**Hiring needs a free desk.** When every desk is taken, the office's card says
빈 책상이 없어요 and cannot be pressed.

A new hire starts simulated, with no memory and no way of working, and the
dialog says so before it happens. Their page opens next, where the first thing
to do is teach them. Until they have done anything, 지금 says 방금 입사했어요
rather than inventing a last task.

**A role is written, not picked.** The common titles are offered as
suggestions (Backend Engineer, Product Manager, DBA…), but a company that needs
a Game Server Engineer writes one. No rule hangs on the role — expertise and
review come from memory — so there is no list for the company to manage.

### Managing a person

A person's page has a `⋯` beside its buttons:

| | |
| --- | --- |
| 정보 바꾸기 | The hire dialog again, filled in: species, name, role, team |
| 휴가 보내기 / 복귀 처리 | If they are on a task, it says first that the task goes back to the backlog |
| 내보내기 | A confirm dialog, because it cannot be undone |

Letting someone go returns their task to the backlog and takes what they were
taught with them; the company's history keeps their hire. After leave, 지금 says
휴가에서 막 돌아왔어요 rather than calling the return a finished task.

## Company

The office shows what is happening now; the company shows what has happened
so far. It is opened now and then to look back, so it sits last in the menu,
and the company's name at the top of the sidebar leads there too.

| Tab | Holds |
| --- | --- |
| 개요 | The company's name (editable here), four running totals with this week's gain, the people and how long each has been here, finished projects, the latest milestones |
| 연혁 | Milestones by month, newest first |
| 규칙 | The areas list and company memory — the two things the company owns rather than any one person |

**Totals, not a dashboard.** Four numbers and a weekly gain, no charts. A
finished project is kept as its name, its span, its task count and the
people who worked on it.

**Milestones are recorded, not reconstructed.** A hire stays in the history
after the person leaves, so milestones are written when their event happens.
Each stores its kind and its facts, never a sentence; the words come from the
dictionary when shown, and a nickname is whatever it is now.

| Milestone | When |
| --- | --- |
| 창업 | The company is created |
| 합류 | Every hire; the first is called out |
| 팀 생김 | A team gets its first member |
| 첫 업무 완료 | Once, company-wide |
| 업무 N건 | 10 · 50 · 100 · 500 |
| 첫 리뷰 | The first peer review settles |
| 기억 N개 | 10 · 50 · 100 |
| 프로젝트 완료 | A project's last task is done |

There are no growth stages yet; the history is what shows the company growing.

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
`failed`, `reviewing`) get the same treatment when their systems
exist: a distinct dot shape, a label, and no reliance on hue.

## Actions

The actions offered for an employee follow the domain's own transitions. The UI
presents them; it does not re-implement them.

| State | Actions |
| --- | --- |
| `working` | 완료 처리 · 업무 상세 · 담당 변경 · 기억 가르치기 |
| `ready` | 업무 시작 · 다른 업무로 교체 · 기억 가르치기 · 할당 취소 |
| `available` | 업무 할당 · 기억 가르치기 · 휴가 보내기 |
| `vacation` | 업무 할당 *(disabled, with the reason)* · 복귀 처리 · 기억 가르치기 |

An action the domain forbids is shown **disabled with a one-line reason**, not
hidden. The rule is the thing worth teaching.

기억 가르치기 is offered in every state because it is not a transition: it
changes what someone knows, not what they are doing.

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
