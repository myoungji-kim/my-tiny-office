# My Tiny Office — Design

This document is where things are and how they look: the screens, what each one
holds, and how the user moves between them. The rest lives elsewhere:

| | |
| --- | --- |
| [`PRODUCT.md`](PRODUCT.md) | What the product is and why |
| [`RULES.md`](RULES.md) | The rules — tasks, review, memory, expertise, teams, hiring, history |
| [`STYLE-GUIDE.md`](STYLE-GUIDE.md) | Written visual rules — tokens, type, copy, i18n, accessibility |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | How it is built |

## The standard lives in `docs/ui/`

Nine pages define the current UI. Open [`docs/ui/index.html`](ui/index.html)
before building or changing a screen.

| Page | Authoritative for |
| --- | --- |
| `ui/first-run.html` | First run: the Claude Code check, the company, the first hire, species picker |
| `ui/office.html` | Layout, colour tokens, tile engine, status display, action popover, the rooms, today's feed |
| `ui/projects.html` | The project list, a project's board, a task's page, and choosing who reviews |
| `ui/employees.html` | The list, a person's page, teaching, hiring, the org chart and teams |
| `ui/company.html` | Overview, history, the areas and roles lists, company memory |
| `ui/settings.html` | The company's Claude Code, language, the open company's file, export, import and deleting it |
| `ui/connect.html` | The company's Claude Code, blocked states, folder trust, a dropped session, what a move leaves behind |
| `ui/components.html` | Buttons, menu rows, notices, empty states, dialogs, modals, forms |
| `ui/characters.html` | The twenty animal sprites, silhouette families, naming |

Every page loads two shared files and keeps only what is its own:

| File | Holds |
| --- | --- |
| `ui/system.css` | The token block and every rule more than one page uses |
| `ui/system.js` | The cast and painter, the shared words, the sample company, and the dialogs and menus more than one screen opens |

A page opens by double-clicking it; nothing here needs a server. A pattern that
is in neither `ui/` nor the style guide is not a pattern yet: add it to `ui/`
first.

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

Density comes from status, time taken and cards — not from decoration. What the
user should see first: who is working, their current task, review status,
blockers, recent activity, team workload.

## The app

```text
┌─────────────┬──────────────────────────────────────────────┐
│ ⌂ My Tiny ⌄ │ 사무실                  2026. 9. 26. (토) 10:24 │
│   Office    │ 직원 5명                                        │
│             ├──────────────────────────────────────────────┤
│ 사무실      │ 전체 · 백엔드팀 · 프론트엔드팀 · 회의실 · 휴게실 │
│ 프로젝트    ├──────────────────────────────────────────────┤
│ 직원        │ ┌──────────────────────────────────────────┐ │
│ 회사        │ │        office tilemap (canvas)           │ │
│ ─────────   │ │   desks · characters · status bubbles    │ │
│ · 모카      │ └──────────────────────────────────────────┘ │
│ · 두부      │ 오늘  10:18 모카의 에이전트 연결이 끊겼어요 … │
│             │ 백엔드팀 3                                    │
│ · 단풍      │ ┌────────┐ ┌────────┐ ┌────────┐ ┌ ─ ─ ─ ┐  │
│             │ │ card   │ │ card   │ │ card   │  + 고용   │
│ ─────────   │ └────────┘ └────────┘ └────────┘ └ ─ ─ ─ ┘  │
│ 설정        │ 프론트엔드팀 2                                │
└─────────────┴──────────────────────────────────────────────┘
```

One floating white panel on a grey page. The sidebar is fixed width and carries
the company's name (which leads to the company screen) with a switcher beside
it, the menu, and the active company's roster. The switcher lists every
company on this computer — each is a file of its own and nothing crosses
between them — then 새 회사 만들기 and 기존 회사 가져오기. From there a new
company starts first run at its name and an import at arrival: this computer's
Claude Code is already checked.

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

A tab is a room, and every room follows from the company — none is built by
hand: the whole floor, a room for each team that has people, the meeting room,
the lounge. Whoever has no task is in the lounge. **Whoever is reviewing sits
in the meeting room**, at a table of their own — one per review under way, so
there are as many as there are reviews and none when nobody reviews — and
goes back when it is done; the floor shows their desk empty with 회의실 above
it, as it shows 휴게실 for the lounge. The whole floor
groups cards by team, with anyone without a team first under 팀 없음. A team's
cards end in 이 팀에 직원 고용, which hires into that team. There is no desk
count to run out of: every hire brings a desk, and the floor grows with the
people, three to a row.

### Today

Under the floor, above the cards, **오늘** lists what happened in the office,
newest first: who started what, a colleague starting a review, a memory drawn
on, work finished and waiting on the user, work applied, someone going on
leave. Each row is a domain event worded by the dictionary, with its time. The
feed follows the room — a team's room the meeting room and the lounge show the people in
them —
and shows six before 더 보기. Only what waits on the user carries an action, the way to it
(승인하러 가기, and 보러 가기 for an agent that stopped); the rest is there to
be read.

### Status

Status mirrors the domain rather than inventing its own vocabulary:

| Status | Meaning | Shown as |
| --- | --- | --- |
| `working` | A task is in progress | Amber dot with ring, time taken |
| `reviewing` | Looking at a colleague's task | Hollow blue ring, time taken |
| `available` | No task assigned | Solid green dot |
| `vacation` | Employee is away | Grey dash |

Colour never carries status alone — **the dot shape differs too**. An agent
that stops is not a status but a mark beside it (see When the agent is
unavailable).

### The action popover

The actions offered follow the domain's own transitions. The UI presents them;
it does not re-implement them.

| State | Actions |
| --- | --- |
| `working` | 업무 상세 · 담당 변경 · 기억 가르치기 |
| `reviewing` | 업무 상세 · 기억 가르치기 |
| `available` | 업무 할당 · 기억 가르치기 · 휴가 보내기 |
| `vacation` | 업무 할당 *(disabled, with the reason)* · 복귀 처리 · 기억 가르치기 |

Each action goes where the work already is: 업무 상세 to the task's page, 담당 변경
to its assignee there, 업무 맡기기 to the person's page with its dialog open;
leave, return and reconnect happen in place. An action the domain forbids is
shown **disabled with a one-line reason**, not
hidden; the rule is the thing worth teaching. 기억 가르치기 is offered in every
state because it is not a transition: it changes what someone knows, not what
they are doing.

## Projects

The projects screen is a list, like people: 대기 · 진행 중 · 보류 · 완료 tabs, and
every row opens that project's board at its own address (`#pay`). Each status
has one mark, by shape as well as colour, used on its tab and beside the
project's name: 대기 a hollow ring, 진행 중 the working dot, 보류 a pause, 완료 a
check.

A row carries its folder, how many tasks sit in each column, with 승인 대기
lifted when it is not zero, and when it started — 시작 전 until it has; a done
one carries its record, tasks done and days taken, and when it finished. Every
tab is ranked: rows sort by the project's priority and lead with the task
cards' flag, and the project's header carries it too. There is no board across
all projects: the office shows who is on what, and the list shows where work
waits on the user.

A project's page is its board under a header with its name, its status, where
it lives, a `⋯` and 새 업무. The `⋯` follows the project's status:

| Status | Actions |
| --- | --- |
| 대기 | 시작하기 *(disabled without a folder, with the reason)* · 프로젝트 수정 · 프로젝트 삭제 |
| 진행 중 | 프로젝트 수정 · 보류 · 완료 처리 *(disabled while work is in progress or waiting, with the count)* · 프로젝트 삭제 |
| 보류 | 다시 진행 · 프로젝트 수정 · 프로젝트 삭제 |
| 완료 | 다시 열기 · 프로젝트 삭제 |

A planned, held or done project says so above its board, with what it is
waiting for, the reason or the date, and the one action that moves it on. A
planned project takes 새 업무 — writing work down ahead is what it is for —
and the new-task dialog says the assignee takes it when the project starts;
held and done ones do not. Holding asks for the reason in the dialog and says
how many tasks in progress go with it; finishing says how many unstarted ones
close. A done project's cards open with nothing to do: it is a record. The
rules are in RULES.md.

## The board

```text
대기열  →  진행 중  →  승인 대기  →  완료
                          ↓ 보완 요청 (사유를 남기고)
                        진행 중
                          ↓ 보류
                        보류
```

A column is a status a task rests in; the statuses and their rules are in
RULES.md. Whoever is free picks work out of the backlog, so the board has no
start button: the user says what the work is and who should do it.

- **The approval column is the user's gate**, and its popover says so in as
  many words: nothing has been applied anywhere yet; approving is what applies
  it. Sending back asks for a reason and says whether they fix it now or after
  what they are on; the card then carries the reason. Holding keeps one too.
- **A card shows time taken, never a share of an estimate.** In progress it says
  how long it has been running; finished, how long it took.
- **Blocked rides on the card** as a mark and a reason, never as a column.
- **A colleague's review shows on the card** while the task is in progress.
  Asking for one lists the people taught the task's area, never its assignee,
  each with when they would look — now, after what they are on, or not while
  on leave — and the one they are on underneath.

### A task's page

Every task has a page under its project's board (`#pay/t1`), reached from the
task's popover, the office popover's 업무 상세, and back through the crumb to the
board. Its header carries the task's status, area, priority, who and time, and
the same actions its popover offers, as page buttons; an agent that stopped says
so above everything.

| Panel | Holds | From |
| --- | --- | --- |
| 지금 하는 일 | The agent's latest steps — reading, editing, running — and its last words | The runtime's event stream |
| 바뀐 것 | Every file with lines added and removed, a file opening to its diff; then 승인하면 바깥에 쓸 것 — each draft write to an outside tool, by tool and target | The task's worktree, and the agent's drafts |
| 검토 | Where the review stands and what was said | The task's PullRequest |
| 업무 설명 | What the task is for | The task |
| 들고 간 기억 | Everything the person carries, ✓ on what they report drawing on | The person's memory |
| 기록 | Created, started, sent back, held, disconnected, finished, applied | Domain events |
| 세션 | The worktree, its branch, and `claude attach` to watch it in a terminal | The session |

The page follows the status: a queued task shows only what it is and who will
take it; one waiting for approval leads with what changed and says what
approving does — it commits to the task's branch and makes the drafted writes
outside, nothing is pushed; a done
one is its record, with the commit.

### The two dialogs

**A dialog answers what a choice means, while the choice is being made.** Both
dialogs on the board re-render on every selection so they can say it.

New task asks for the project, the title, the area, the priority and the
assignee. The area decides who may review the work later, so the dialog names
those people instead of leaving it to be discovered in the approval column. The
assignee defaults to whoever is free, and naming a person says what it costs:
someone free starts right away, someone busy queues behind their current work,
and someone on leave cannot be chosen at all.

New project asks for a name, a line about what it changes, a priority, and
the folder the office works in. The priority says what it decides: which
project's work is picked up first. It starts planned. A project without a folder is allowed,
because naming the work usually comes before deciding where it lives, and the
dialog says what that costs: the tasks can be written down, but the project
cannot start.

### An action sits with what it acts on

```text
프로젝트                                   [+ 새 프로젝트]   ← the list, and its action
[대기][진행 중][보류][완료]
───────────────────────────────────────────────────────
‹ 프로젝트 목록
결제 개편 진행 중                          [⋯] [+ 새 업무]   ← this project, and its actions
결제 흐름을 정리하고 웹훅을 믿을 수 있게 만들어요. · ~/Projects/tinysoft
───────────────────────────────────────────────────────
[the board]
```

The list's header holds what makes a project; a project's header holds what
it is for, where it lives, and the actions that are its own. A project with no
folder says so there. **The rarer action can be the page's, and
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
further than a face does, and the cast is the product's character. The species is
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
user actually has the context to teach. Teaching there comes back to the same
task, which now lists what was just taught.

새 업무 만들기 opens the board's new-task fields in place — project, title,
description, area, priority — without the assignee, who is already chosen.
Changing the area redraws what they bring, so the user sees before creating
it whether this person has anything to draw on. A task made here goes straight
to them; one picked from the backlog leaves it.

### Teaching

Every "teach" opens one dialog. Where it was opened from decides
only what is already filled in:

| Opened from | Already filled in |
| --- | --- |
| A person's page, or the office popover | Who |
| 지금 알려주기 in the assign modal | Who, the task's area, and the task as source |
| 알려줄 직원 고르기 on the 분야·역할 tab | The area; the user picks who |
| 회사 전체에 알려주기 | The whole company; company memory has no area |

The dialog asks for an **area** and the **text**, a sentence or two. A source
the entry point knows shows as one line (출처: 결제 내역 페이지네이션) the user
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

A default team speaks both languages; one the user names is shown as
written. A team gets its room in the office when it has its first person.

### Hiring

First-run hires the first person in its own steps. Every hire after that opens
one dialog: species, name, role and team. The button waits for a species and a
name the user wrote, and says who it hires (*호두 고용하기*).

| Opened from | Already filled in |
| --- | --- |
| 직원 고용 on the people screen | Nothing — the team offers 팀 없음 first |
| An empty team on the org chart | The team |
| 이 팀에 직원 고용 in the office | The team; a desk is added for them |

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

Each tab is named for what it holds, so a user looking for roles finds them
without opening a tab to see. The tabs have addresses (`#lists`, `#memory`) so
teaching elsewhere can point straight at 분야·역할.

**Totals, not a dashboard.** Four numbers and a weekly gain, no charts. A
finished project is kept as its name, its span, its task count and the people
who worked on it. Which milestones exist is in RULES.md; each is stored as
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
anything the user named, is shown as written.

## Settings

Settings holds what belongs to this computer rather than to the company: the
Claude Code everyone works through, the language, and the file the company is
stored in. It is one column of panels, no tabs — there is too little for tabs
to earn their place.

| Panel | Holds |
| --- | --- |
| Claude Code | The same check as first run — installed, logged in — with 다시 확인, and the outside tools it is connected to. Folder trust is not here: it is per project |
| 언어 | 한국어 · English. What the user wrote is shown as written in both |
| 이 회사의 데이터 | The open company's file, with 복사; 내보내기 and 가져오기 |
| 이 회사 삭제 | Set apart in red, last before the version |
| 버전 | The app's version |

What the company decides — its name, areas, roles, memory — is on the company
screen, not here.

**A company moves as its file.** 내보내기 saves the open company's; 가져오기
adds the file's company as one more, chosen in the system's file dialog — it
never replaces or merges, so it asks nothing. What belongs to the computer
does not travel: the Claude Code sign-in, project folders, folder trust and
running sessions. Each is asked for where it is used — a project whose folder
is not here says so and asks for it, a task whose session stayed behind starts
again — and nothing is deleted. connect.html shows both.

**Deleting a company is the one thing here that cannot be undone,** so its
panel is red and its dialog asks for the company's name typed out. It says
what goes — people and memories by count, projects, work, history — that work
in progress stops, that the code in project folders stays, and that exporting
first keeps a way back. The company opened next is the one opened last; with
none left, the app is at first run again.

## First run

```text
앱 실행 → Claude Code 확인 (설치 · 로그인) → 회사 만들기 → 첫 직원 고용 → 사무실 도착 → 업무 맡기기
                                      └→ 기존 회사 가져오기 → 사무실 도착 (다시 할 것)
```

**Claude Code comes first.** Nothing in the office works without an agent to
make the decisions, so first run checks it before anything else — installed,
logged in — and does not go on until it is ready. It never logs in for the
user: it detects, explains and waits (see Agent connection). Every employee
hired afterwards works through it; there is no per-employee login.

It does not ask for a team.

**A company can arrive in a file.** After the Claude Code check, 기존 회사
가져오기 imports one instead and skips the company and the first hire; arrival
then lists what this computer still has to do — folders to choose again,
tasks whose sessions stayed on the old one.

First run is what the app shows when this computer has no company; with one,
the app opens the company opened last, and first run is only reached through
the switcher's 새 회사 만들기 and 기존 회사 가져오기.

It ends at the **first employee**, not at the company. A user dropped into an
empty office has nothing to look at, and the office is the product. Every field
says it can be changed later, because a first decision should not feel heavy.

## When the agent is unavailable

Every employee works through Claude Code, so there is no fake work to fall
back on. When the runtime stops — logged out, uninstalled, a session dropped —
the office says so and keeps everything: the employee, their memory, their
task. A runtime that stops for the company is one line at the top of the
office, and nothing new starts until it is back. A dropped session stops only
its employee: **status is the dot at bottom-right; a dropped agent is a red mark
at top-left**, with no mark while it works, and the task card carries the
blocked mark. The mark is the same wherever the person is — office card,
floor bubble, popover, sidebar, the people list, org chart and a person's page —
and the popover and the person's 지금 lead with 다시 연결. Never fold the agent's state into the status colour.

## Agent connection

The user sees the runtime as part of the office, never as an account setup. It is
checked once, for the whole company, at first run, in Settings, and whenever
it stops:

```text
Claude Code
✓ 설치됨      2.1.283
✓ 로그인됨    pro

[ 다시 확인 ]
```

### We do not handle authentication

Claude Code owns its own login. The app detects and explains; it never
authenticates.

| State | Detected by | What the screen says | Fixed |
| --- | --- | --- | --- |
| Not installed | `claude` is not on PATH | Nothing can work without it; install it, then **[다시 확인]** | Install |
| **Not logged in** | Running the CLI returns an auth error | Run `claude auth login` in a terminal, then **[다시 확인]** | **Outside this app** |
| Ready | The CLI runs | Work can start | — |

The second row is the one that matters. The fix happens somewhere the app
cannot reach, so the screen has to say so plainly. **Never add a token field.**
Never read a credential store.

A folder belongs to a project, and each needs trust once. **That has no
non-interactive path** — one `claude` run in the folder, accepted by the
user — so it is checked where the project's folder is chosen, as plainly as
login, and a task in an untrusted folder does not start. ARCHITECTURE.md has
the measured runtime surface.

## Open questions

- **The domain predates the board.** `src/domain/task.ts` needs backlog,
  working, approval, done and held, plus the blocked mark, and time taken rather
  than progress derived from `estimatedDuration`. Projects need their status
  and priority, employees the `reviewing` status, and a task its worktree,
  branch and drafted outside writes.
- **The code opens one database.** `src/infrastructure/persistence/database.ts`
  opens a single `my-tiny-office.db`; a file per company, the list of them, and
  the language and last company in `settings.json` are not built yet.
- **Which outside tools a company may use.** Every company's agents reach the
  same tools Claude Code is connected to. Choosing them per company would need
  a list in the company's settings and a matching `--allowedTools` per session.
- **A 내 차례 / Needs you inbox.** Today's feed already carries what waits on
  the user — approvals, agents that stopped — with the way to each. A separate
  inbox earns its place only if those rows turn out easy to miss.
