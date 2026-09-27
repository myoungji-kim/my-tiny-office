# My Tiny Office — Rules

## Employee

Each employee has:

- a nickname the user wrote, and a species that only decides their sprite
- a role, from the company's list
- a team, or none
- memories, and the expertise that follows from them
- a way of working (일하는 방식)
- a status: working, available or on leave
- a current task
- an Agent — Claude Code — that does the work; without a working one they cannot take a task

## People and teams

**Hiring needs a free desk.** A new hire starts with no memory and no way of
working, and works through the company's Claude Code from the start. The first
hire is made in first run, the rest from the office, the org chart or the
people screen.

**A role is a job title from the company's list.** Everyone has one, so the last
role cannot be removed, and removing one that people hold changes them to
another first. No rule hangs on a role: expertise and review come from memory.

**A team is optional, and there is nothing above it.** A company of one has no
reason to have a team, so the first hire starts without one; teams appear when
the work splits. Removing a team moves its people to another team or to none.
A team is organisation, not space — making one does not build its room.

**Leave and letting go.** Sending someone on leave returns their task to the
backlog, and nobody on leave can be given work. Letting someone go returns
their task too and takes what they were taught with them; the company's
history keeps their hire.

## Agent

An Agent is an execution layer attached to an employee.

The runtime is Claude Code. Another one fits behind the same runtime interface
without changing the employee (ARCHITECTURE.md §14).

An employee outlives a failed agent: when the runtime is unavailable or their
session drops they stay, with their memory and their task, and nothing new
starts until the user brings it back.

One employee works on one task at a time.

## Company Ownership

An Agent belongs to a Company through an Employee.

```text
Company
  ↓
Employee
  ↓
Agent
  ↓
Session
```

This prevents unrelated local AI sessions from appearing in the office.

## Tasks

Tasks have:
- title
- description
- project
- area
- assignee
- status
- priority
- time spent
- blocker

Statuses:
- backlog — nobody has picked it up; whoever is free takes it
- working — an employee is on it, and a colleague may be reviewing alongside
- approval — finished on their machine, waiting for the user to apply it
- done — applied
- held — parked by the user, with the reason kept

A task is never started or completed by hand. Work is picked up by whoever is
free, and it stops at `approval` because applying it — pushing, writing,
deploying — is the one step the office does not take on its own.

**Time is what the work has taken, not a share of an estimate.** With a real
agent doing the work nobody knows when it ends, so a task carries how long it
has been running and, once finished, how long it took.

**Blocked is not a status.** A task is blocked *out of* whichever status it is
in — an agent that stopped, a dependency that never arrived — so it is a field
on the task rather than a place in the flow.

## Review

Review happens inside `working`, not after it: a task being reviewed is still
being worked on.

When a task's area calls for another pair of eyes, the office suggests a
colleague who has been taught that area — expertise comes from memory, not
from a field — and the two of them settle it while the work is still open. If
nobody has been taught the area, there is nobody to suggest, and the user
sees that.

What the user decides is the last step, not the verdict: whether the finished
work may be applied. Sending it back takes a reason and returns it to `working`.
Holding it parks it with the reason attached.

## PR Collaboration

In the MVP a `PullRequest` is not a real GitHub or GitLab pull request. It is a
domain entity that records review, collaboration, and progress inside the
company.

A PR is an activity card, not a place of its own. It belongs to a task that is
still `working`, and it is where a colleague's comments and the back-and-forth
live. PRs surface on the office floor and in the activity feed; there is no PR
menu.

Example:

PR #4821 — Payment API error response change

The office suggests a reviewer by the task's area, from the people who have
been taught it. Where a review stands:
- suggested — the area asks for a second pair of eyes, nobody picked yet
- reviewing — a colleague is looking
- settled — they are done, and the work carries on or is corrected

None of these is a task status. The task is `working` throughout, and moves to
`approval` when the work itself is finished.

## Memory

Under the Claude Code runtime a memory is not a metaphor: it is what the
employee's agent actually carries into the work.

```text
업무나 PR에서 문제가 나옴
  → 그 자리에서 "이거 기억해둬"
  → 그 직원의 기억에 추가 (출처 = 그 업무)
  → 다음 업무에서 참조됨
  → "모카가 [인덱스 규칙]을 참고했어요"   ← 루프가 닫히는 지점
```

Expertise is taught, not grown. An employee does not fill a skill bar; the
user tells them something worth keeping, and it stays with them.

A memory has an area of expertise, the text itself, and the work it came from:

- Database — "복합 인덱스는 컬럼 순서가 중요해요" — from the slow payment lookup
- Security — "쿼리에 사용자 입력을 문자열로 이어 붙이지 않아요" — told directly

The source is never asked for: teaching opened from a task takes that task as
its source, and anywhere else it was told directly.

What someone is told goes to one of three places, and only one has an area:

| | What | Area |
| --- | --- | --- |
| 기억 | Expert knowledge — "복합 인덱스는 컬럼 순서가 중요해요" | Always |
| 일하는 방식 | How this person works — "테스트를 먼저 써" | None |
| 회사 기억 | What everyone follows — "커밋은 conventional prefix로" | None |

### Expertise

**Expertise is taught, never assigned.** An area becomes someone's expertise
when they are taught something in it, and that is also what lets them review a
PR in it. A role or a team never implies it: DBA does not mean "already knows
databases", or there would be nothing to teach.

**The company owns the list of areas.** It starts with seven — Architecture,
Type safety, Database, Security, Localization, Product, Quality — and adds,
renames or removes its own; a studio that cares about 게임 서버 says so.
Memory and tasks point at an area by id, so a rename changes nothing else, and
removing an area that holds memory moves that memory elsewhere first. There is
no 프로세스 area: a rule about how work is done is a way of working.

An area nobody knows is a gap: its work starts with nothing to draw on and
nobody can review it.

A memory is used, not just stored: when an employee references one, the
activity feed says so. Without that, teaching is only a notes field.

Memory has no cap, but it does have a cost: everything taught is carried into
every task, whatever its area, as a person brings everything they know. A
memory that stops being referenced is corrected or deleted; there is no
archive.

## Activity Feed

The user writes the nicknames, so the feed uses whatever they chose.

Examples:
- "모카 picked up Paginate the payment history."
- "삐약 is looking at the security side of the webhook change."
- "삐약 asked for the retryable failures to be split out."
- "모카 referenced [index rules] while working."
- "Change the payment API error shape is waiting on you."
- "The Backend team finished Payments rework."

The feed should consume domain events.

## Progression

The company's history records milestones as they happen, not reconstructed
later, so a hire stays in it after the person leaves:

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
