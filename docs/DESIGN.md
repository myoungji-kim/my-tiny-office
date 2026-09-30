# My Tiny Office — Design

This document is where things are and how they look: the screens, what each one
holds, and how the user moves between them. The rest lives elsewhere:

| | |
| --- | --- |
| [`PRODUCT.md`](PRODUCT.md) | What the product is and why |
| [`RULES.md`](RULES.md) | The rules — tasks, review, memory, expertise, teams, hiring, history |
| [`STYLE-GUIDE.md`](STYLE-GUIDE.md) | Written visual rules — tokens, type, copy, i18n, accessibility |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | How it is built |
| [`SECURITY.md`](SECURITY.md) | What an agent may do, and how it is enforced |

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
| `ui/plaza.html` | The plaza outside the company: the scene, a candidate's résumé, the list, hiring from it |
| `ui/settings.html` | Settings in five tabs: Claude Code (its check and the connected tools), skills and plugins, general (starting work, screen width, language), the safety guide, and data (the open company's file, export, import, deleting it, the version) |
| `ui/connect.html` | The company's Claude Code, blocked states, a folder and what is safe in it, work that stops itself, a dropped session, what a move leaves behind |
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
it, the menu, and the active company's roster. At its foot, under 회사 밖, is
광장, apart from the company's own screens, then 설정. The switcher lists every
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
feed follows the room — a team's room, the meeting room and the lounge show
what happened to the people in them — and shows six before 더 보기. Only what
waits on the user carries an action, the way to it
(승인하러 가기, and 보러 가기 for work that stopped — a dropped agent, a command not allowed); the rest is there to
be read.

### Status

Status mirrors the domain rather than inventing its own vocabulary:

| Status | Meaning | Shown as |
| --- | --- | --- |
| `working` | A task is in progress | Amber dot with ring, time taken |
| `reviewing` | Looking at a colleague's task | Hollow blue ring, time taken |
| `available` | Not on a task or a review | Solid green dot |
| `onLeave` | Employee is away | Grey dash |

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
| `leave` | 업무 할당 *(disabled, with the reason)* · 복귀 처리 · 기억 가르치기 |

Each action goes where the work already is: 업무 상세 to the task's page, 담당 변경
to its assignee there, 업무 맡기기 to the person's page with its dialog open;
leave, return and reconnect happen in place. An action the domain forbids is
shown **disabled with a one-line reason**, not
hidden; the rule is the thing worth teaching. 기억 가르치기 is offered in every
state because it is not a transition: it changes what someone knows, not what
they are doing. Taught to someone on leave, the dialog says they carry it from
the first task after they are back.

## The plaza

Outside the company is **광장**, a screen of its own: Claude Code sessions held
on this computer, standing as candidates. They are real
sessions, not a decoration. None of them is part of the company until the
user hires one, and hiring brings in only what the user keeps.

The office is the company. The plaza is kept apart from it. The sidebar lists
it under its own caption, **회사 밖**, above 설정, and 설정 › 일반 › 광장 set
to 숨기기 removes it.

**1. Who comes.** The app lists Claude Code's own session files
(`~/.claude/projects/<folder>/<session>.jsonl`) across the whole computer.

- **Read:** for each file, its folder, first and last dates, message count,
  and first user message.
- **Never read:** Claude Code's credentials or settings.
- **Left out:**
  - the app's own runs: a session in a registered project's `.worktrees/`,
    or in the app's temporary folders;
  - sessions already hired; hidden ones are listed only under 숨김;
  - sessions with fewer than six messages;
  - sessions not written to for ninety days.
- **In use:** a session written to in the last five minutes is shown as
  작업 중.
- **Refreshing:** the list is read each time the plaza or 경력 가져오기 opens,
  and every 30 seconds while the plaza is open.
  A session's message count is kept until its file changes size or time.
- **Programs' runs:** a session Claude Code records as run by a program
  (`claude -p`, its entrypoint `sdk-…`) is never a candidate. That covers
  this app's own agents, wherever their folder is.
- **Hiding it:** 설정 › 일반 › 광장 hides the plaza. The hire dialog's 지난
  세션에서 가져오기 goes with it, and no session file is read at all.

**2. The screen.** The header reads **광장**, *회사 밖이에요. 이 컴퓨터의 Claude
Code 세션이 구직자로 모여요.*, and 구직자 N명 on the right. Under it, the
scene is the same width as the office's floor, six tiles high:

- the office's front wall, with windows and its door in the middle;
- four rows of paving, with a lamp at each end and a bench beside the door;
- grass along the bottom, with a tree at each end.

Under the scene is the list (4).

Candidates stand in two lines on the paving, one every three tiles, most
recently active first. A candidate's species follows from their session, so the same one
always looks the same. Their tag is the folder's name. One in use carries a
**작업 중** bubble. Tags sit on a dark chip so they read on the paving. Anyone
past the two lines is still in the list. With nobody waiting, the paving
is empty and a line says *광장이 조용해요. 이 컴퓨터에서 Claude Code로 일하면
구직자가 찾아와요.*

**3. The résumé.** Clicking a candidate opens the popover the desks use.

- **Head:** the folder's name, its path, and 쉬는 중 or 작업 중.
- **Body:** 첫 메시지 as a quote, then 기간, 메시지 N개 and 마지막 활동.
- Several candidates can share a folder, so each one's label and tooltip
  carry its first message and dates.
- A session that comes into use while its résumé is open updates in place,
  and 경력직으로 고용 then waits.
- **경력직으로 고용** is the key row. For a session in use it is disabled, with
  the reason: *지금 터미널에서 쓰고 있는 세션이에요. 끝나면 고용할 수 있어요.*
- **광장에서 숨기기** takes them off the paving (see Hiding, below).

**4. The list.** **구직자 명단**, a panel under the scene:

- a search over folders and first messages;
- 전체 · 쉬는 중 · 작업 중 with counts, and **숨김 N** once anyone is hidden;
- one row per candidate: first message, folder · dates · messages, hiding,
  and 경력직으로 고용. A row in use says why in its line: *작업 중 · 끝나면
  고용할 수 있어요*;
- with everyone hidden, *모두 숨겼어요. 숨김에서 다시 보이게 할 수 있어요.*; with a
  search that finds nothing, *찾는 구직자가 없어요.*

**Hiding.** Hiding never deletes anything, and the screen shows that rather
than says it.
- The control is a closed eye, **숨기기**. No arrow or bin, which would read
  as sending something away or deleting it.
- A row just hidden stays where it was, as a thin line: *숨겼어요 · <first
  message>* with **되돌리기**. It folds away once the filter or the search
  changes.
- **숨김** lists the hidden ones dimmed, each with **다시 보이기**. Showing the
  last one returns to 전체.
- The session file is never touched: hiding is only the app's note of the
  session's id (SECURITY.md §8b).

**5. Hiring.** 경력직으로 고용 opens the hire dialog:

- The candidate's species is picked, and the name is left to the user.
- 경력 already names the session: the folder, its dates, and *아직 정리하지
  않았어요.* with 경력 정리하기.
- Summing up is a Claude run, so it waits to be asked: 경력 정리하기 opens 경력
  가져오기 at **Read**, then **Keep** (Hiring with experience).
- Hiring without summing up still records the session, so the candidate
  leaves the plaza.
- 경력 정리하기 needs Claude Code. When it is not ready, the button waits with
  the reason, and hiring without experience still works.
- If the run fails, the step says *경력을 정리하지 못했어요* and offers 경력 없이
  고용 or 다시 시도.
- If nothing worth bringing was found, it says *가져올 만한 게 없었어요* and
  offers 다른 세션 고르기 or 신입으로 고용.
- Either way the hire itself goes on.

**6. After the hire.**

- The candidate leaves the plaza; that session never comes back to it. If the
  user chose a different session in 경력 가져오기 instead, that session is the
  one used up, and the candidate stays.
- The plaza stays open, with a notice: *보리가 입사했어요 · tinysoft 세션에서
  6개를 가져왔어요. 사무실에 책상이 생겼어요.* and 직원 페이지 보기.
- Hiding everyone leaves the paving empty with *구직자를 모두 숨겼어요. 명단의
  숨김에서 다시 보이게 할 수 있어요.*
- A desk is added on the floor.
- Once the office has its Today feed (office.html), it reads *보리가 경력직으로
  입사했어요 · tinysoft 세션에서 6개를 가져왔어요*.
- On their page, the Record panel has 경력, and each memory brought reads
  *tinysoft 세션에서*.
- The session itself is untouched and never attached: the employee's own
  agent starts sessions of its own.

The mockup is plaza.html. The toggle is in settings.html's
general tab. Its samples show every state:
- `~/Projects/tinysoft` (the webhook one) is in use.
- `~/Projects/design-system` fails its first reading, then succeeds on 다시
  시도.
- `~/dotfiles` has nothing worth bringing.
- The bar's Claude Code toggle shows summing up waiting for it.

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
board. It reads like an issue in a tracker with a chat in it: what to decide,
then the conversation, with the details to one side.

```text
header     title · status · area · priority · who · time          [actions]
지금 할 일  only when the user has something to decide
───────────────────────────────────────────────┬──────────────
[대화] [바뀐 것] [한 일]                [👁 <>] │ 세부 정보
                                              │ 업무 설명
the tab's content                             │ ▸ 들고 간 기억
                                              │ ▸ 세션 · ▸ 기록
```

**지금 할 일** leads, and only when there is something to decide: a stop with
its reason and the way on, or finished work — "모카가 작업을 마쳤어요" with 바뀐 것
보기 — or applied work not yet sent up — 반영했어요 with PR 올리기. That opens the
PR window: the task's branch, the branch it goes into (origin's branches, the
one origin points at chosen), the remote, and the title and body, written from
the task and its last report and editable. What stops it — no origin, not
GitHub, the branch gone — is said at its top, and 올리기 stays off. While it
sends, the window cannot be closed. When the last review asked for changes, the notice turns to a warning and
says so, since the fix reached approval without that reviewer agreeing. The
header keeps every action, as page buttons.

**The tabs keep their place whatever the status**, so nothing moves around:

| Tab | Holds | From |
| --- | --- | --- |
| 대화 | Everything said on the task, oldest first, one message each: a colleague's review, the reply, the user's request for changes, and last what the employee said — their report, what they are saying while they work, or what they said before they stopped. Each message is formatted markdown or its plain text (👁 · `<>` for all of them), copied from the icon that appears over it. What the agent thought worth remembering sits under its report, each with 넘기기 and 기억시키기. While they work, the step they are on closes the conversation. | Runs' reports, reviews, requests |
| 바뀐 것 | Every file with lines added and removed, a file opening to its diff, and what approving does — it commits to the task's branch, nothing is pushed | The task's worktree |
| 한 일 | Every step — read, edited, ran — with its time | The runtime's event stream |

**A long conversation stays readable.** Reports run to forty lines and there
are several of them, so:

- it reads oldest first, as the exchange it was — a review, the request it led
  to, the report that answered it — and opening the page scrolls to the latest
  message only when it is below the fold, so 지금 할 일 stays in view otherwise;
- the latest two messages are open; older ones fold to one line — who, what,
  when and their first sentence, never a heading — and open when clicked;
- an open message taller than about a screen is cut off under a fade, with
  전체 보기 · 줄여 보기;
- a message with sections lists them as chips above it, and a chip jumps to
  its section.

**The widths are the user's.** The split between the conversation and the
details drags, 220 to 560 px for the details, and a double click puts it back;
arrow keys move it too. The whole app is 보통, 넓게 or 전체 — 1400 px, 1760 px or
the window — set in Settings' 화면 폭 and kept for every screen; a task's page
has the same choice beside its tabs, as a shortcut to the same setting. Both are kept in
this browser only.

**세부 정보** is fixed: status, who, reviewer, area, priority, time — and, once
the work has gone up, PR: PR 열기, or GitHub에서 PR 만들기 when this computer has
no signed-in GitHub CLI and GitHub's own page finishes it. 업무 설명
follows. What is looked at now and then is folded: 들고 간 기억 (✓ on what they
report drawing on), 세션 (the worktree, its branch, and `claude --resume`), 기록 —
every run's start and how it ended (finished with its minutes, or stopped: at a
command or a write it may not make, at the spending cap, failed, disconnected,
or stopped), reviews, changes asked for and applying; `projects.html#order/t6`
shows each kind.

A card names a stop by its reason only — 허용되지 않은 명령, with the command in
its tooltip — and the page gives the command in full. A stop leads the page with
its reason and the way on: 다시 연결 for a lost agent, 이어서 하기 at the spending
cap, 다시 시도 when the worktree could not be made, and for a command 허용하고
이어서 and 허용하지 않고 이어서 — only the second when the command could never be
allowed, such as one chained with `&&`. A Jira or Confluence write the project
has not allowed stops the same way — "Jira에 코멘트 달기 전에 멈췄어요" — and
shows where and what it would write, as it would be posted, above 쓰지 않고
이어서 and 허용하고 이어서 (`projects.html?stop=write#order/t3`).

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
open them filled in, and the button says save instead of create. A working
task's popover offers 업무 수정 too, off with the reason while Claude Code is
not ready, as the task page's is. The popover never deletes.

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
바뀐 내용 전달 stays off until something differs, and only a changed title or
description stops the run (`Task.revisedAt`); a new priority, area or reviewer
is taken without interrupting it. Someone else, or nobody, starts over with
the folder as it is.

**What cannot be undone asks once more in place.** The row in the `⋯` turns
into a short line of what happens and two buttons, the action and a keep
button; no dialog. The `⋯` is off while it is being done.

- **Deleting a task.** A task that is not finished goes from its page's `⋯`,
  and takes its conversation, steps, reviews, worktree and branch with it. It
  asks with what is lost, unless it is only written down: a backlog task an
  agent already worked on asks too.
- **Deleting a project.** From its `⋯`, with all its tasks, finished ones
  included, and says so; when work is in progress it adds that it stops. An
  applied task's branch stays, since it holds what approving committed. The
  history keeps its lines.
- **Letting someone go.** 떠나보내기 in their page's `⋯`, kept with 계속 두기:
  their task goes back to the backlog, a review they held is given back, a
  task naming them as reviewer names nobody, and what they were taught leaves
  with them. They stay only as a name (`availability: left`), on what they
  did and in the history, and in no list.

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
| 떠나보내기 | Asked once more in place, in the menu, with what happens; the keep button is 계속 두기 |

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

#### Hiring with experience

A hire can bring experience from a past Claude Code session. The session is
not attached to them. What they learned there arrives as memories the user
can read and correct, like anything taught; the employee is the one who knows
it, not the session.

The dialog's last field, **경력**, reads *신입으로 들어와요.* with **지난 세션에서
가져오기**. That opens **경력 가져오기** over it, in three steps:

1. **Pick.** A folder on this computer, then one of the past sessions held in
   it. Each shows its first message, its dates and how many messages it has.
   - These are the same sessions the plaza shows (see The plaza).
   - A session in use right now is listed, disabled, and cannot be picked.
   - From the plaza this step is skipped: the session is already chosen, and
     경력 정리하기 in the hire dialog starts at Read.
   - The hint says Claude reads the conversation once, and that a long one is
     read from its most recent part.
2. **Read.** One Claude run reads the conversation, read-only, and sums up
   what they know, by area, and how they work.
3. **Keep.** The session being read is named at the top of Read and Keep.
   - Lines to keep:
     - Every line starts ticked and can be unticked or reworded. Each
       checkbox's label is the line itself.
     - A line the company or the hire already knows is marked *이미 아는 내용*
       and starts unticked.
     - An area can be changed. The run is given the company's own areas and
       answers only with those.
   - A warning appears only when there is something to say: how many lines
     that looked like passwords or tokens were left out, and that the
     beginning of a long conversation was skipped.
   - **N개 가져오기** returns to the hire dialog. It then shows the project,
     the dates and what they bring, with 바꾸기 and 빼기. With every line
     unticked, the button reads **신입으로 고용**.
   - 뒤로 goes to Pick. What a session summed up to is kept, so choosing it
     again does not read it again.
   - Focus moves into the window at each step, and back to the hire dialog
     when it closes.

What they bring is theirs from the first day:
- Each memory, and each way of working, it brings reads *tinysoft 세션에서*:
  the session's folder.
- The Record panel's 경력 row reads the folder, the dates and how many lines
  came: *tinysoft · 9월 12일 – 9월 24일 · 6개 가져옴*.
- The Record panel has an **경력** row with the project and the dates.

The mockup is employees.html → 직원 고용 → 지난 세션에서 가져오기.

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
Claude Code everyone works through, the connectors its account has and the
plugins and skills employees are given, the language, and the file the
company is stored in. It is one column of panels under five tabs, one
shown at a time and named in the address (`?tab=`; `settings.html` uses a
`#` hash for the same thing, since a static page has no server): **Claude Code** first —
its check and the connectors its account has — then **스킬과 플러그인**, whose
list grows with what the user installs, **일반** (업무 시작, 화면 폭, 언어),
**안전 범위** (the boundary in three lines, then the guide in full, which used
to be a page of its own) and **데이터** (the file, deleting the company, the
version).

| Panel | Holds |
| --- | --- |
| Claude Code | The same check as first run — installed, logged in — with 다시 확인 |
| 연결된 도구 | The connectors this computer's Claude account has, as the last check found them: Atlassian — used where a project turns it on — and the rest named, not used. 확인하기 / 다시 확인 runs the check, which says what it costs; before one, a single row says so. While Claude Code is not ready the check is off and the hint says it can be checked once it is. A project dialog turning Atlassian on warns when the check found none (`settings.html?connectors=unchecked`, `?connectors=noatlassian`; `projects.html?connectors=noatlassian`) |
| 스킬과 플러그인 | What this computer's Claude Code has in user scope — plugins, then skills — each with its own words and a tick, none ticked to start. What is ticked goes into every task's work; the hint says hooks and MCP servers stay off and that Claude Code's built-in skills come along (`settings.html?exts=none` for a computer with none) |
| 업무 시작 | 자동으로 · 멈춤. Paused, nobody free takes new work; what is running carries on |
| 화면 폭 | 보통 · 넓게 · 전체, for every screen, kept in this browser; a task's page changes the same setting |
| 언어 | 한국어 · English. What the user wrote is shown as written in both |
| 직원이 할 수 있는 일 | On 안전 범위: the boundary in three lines, then the guide in full below it. The commands are not here: they are per project |
| 이 회사의 데이터 | The open company's file, with 복사; 내보내기 and 가져오기 |
| 이 회사 삭제 | Set apart in red, last before the version |
| 버전 | The app's version |

What the company decides — its name, areas, roles, memory — is on the company
screen, not here.

**Paused is said everywhere.** While starting work is paused, every screen
opens with one amber line saying so, with 다시 켜기, so an idle office is never
a mystery.

**A company moves as its file.** 내보내기 saves the open company's; 가져오기
adds the file's company as one more, chosen in the system's file dialog — it
never replaces or merges, so it asks nothing. What belongs to the computer
does not travel: the Claude Code sign-in, project folders and what was
allowed in them, and running sessions. Each is asked for where it is used — a project whose folder
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

Reached with no company, its first step names the folder companies were
looked for in, so a company kept elsewhere (`MY_TINY_OFFICE_DATA_DIR`) is not
mistaken for a lost one. A company file there that could not be opened is
counted in a warning above the buttons; the file is left as it is. The mockup
shows the warning at `first-run.html#unreadable`.

It ends at the **first employee**, not at the company. A user dropped into an
empty office has nothing to look at, and the office is the product. Every field
says it can be changed later, because a first decision should not feel heavy.

## When the agent is unavailable

Every employee works through Claude Code, so there is no fake work to fall
back on. When the runtime stops — logged out, uninstalled, a session dropped —
the office says so and keeps everything: the employee, their memory, their
task. A runtime that stops for the company is one line at the top of every
screen, with 다시 확인, and nothing new starts until it is back: 업무 맡기기 and
다시 연결 are disabled with that reason wherever they are, and settings shows
the sign-in as needed. A dropped session stops only
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

A folder belongs to a project, and **choosing it is the consent.** The project
dialog shows, the moment a folder is chosen, what employees do there and what
they never do, and the commands they may run — from its `package.json`,
edited in place. Creating or saving the project allows exactly that; a project
without a folder asks nothing, because there is nothing to allow. Below the
commands, Jira · Confluence is 쓰지 않음 or Atlassian 커넥터로; turned on, the
boundary's last line names Atlassian as the one way out, and 허용한 쓰기 lists
the kinds of write the project's tasks make without asking, each removable. 안전 범위 in
settings is the same promise in full, and the dialog links to it.

When work needs more than it was allowed it stops and asks, on the task's page
and in today's feed: a command the project does not allow (허용하고 이어서), a
write to Jira or Confluence it does not allow, or the spending cap (이어서 하기). SECURITY.md has the boundary and the
measured flags behind it.

## Open questions

- **Asking for a review.** 동료 검토 받기 sits with the approval actions and opens a pick of colleagues who know the area, a busy one marked as looking after what they are on; the task dialog's 검토자 names one ahead. The mockup's in-progress 검토 붙이기 moved there, because real work finishes before anyone could catch it in progress.
- **What is not built yet.** Every screen is built from its page in
  `docs/ui`. Left out until what they show exists: today's feed in the office
  and the people screen's 기억 tab (the activity feed and the memory-used
  report), how often a memory was used (the person's page lists the memories taught
  lately instead of the most used).
- **Choosing a folder.** A browser cannot hand over a folder's path, so
  고르기 opens the operating system's folder dialog from the app's own server,
  with 경로 직접 입력 beside it; either is checked before anything is shown
  (SECURITY.md §4), and a folder that is not a git repository says so.
- **Outside tools beyond Atlassian.** Gmail, Drive and the rest of the
  account's connectors are denied. Gmail waits on work that has no code
  folder, which a project cannot be yet.
- **A 내 차례 / Needs you inbox.** Today's feed already carries what waits on
  the user — approvals, agents that stopped — with the way to each. A separate
  inbox earns its place only if those rows turn out easy to miss.
