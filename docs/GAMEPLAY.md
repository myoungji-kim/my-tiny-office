# My Tiny Office — Gameplay

## Employee

Each employee has:

- identity
- avatar
- role
- department
- specialty
- memories
- personality
- availability
- current tasks
- optional Agent

## Agent

An Agent is an execution layer attached to an employee.

MVP runtime:
- Claude Code

Future:
- other CLI agents
- local models
- API-based runtimes

An employee does not require an Agent to exist.

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
- approval — finished on their machine, waiting for the player to apply it
- done — applied
- held — parked by the player, with the reason kept

A task is never started or completed by hand. Work is picked up by whoever is
free, and it stops at `approval` because applying it — pushing, writing,
deploying — is the one step the office does not take on its own.

**Time is what the work has taken, not a share of an estimate.** With a real
agent doing the work nobody knows when it ends, so a task carries how long it
has been running and, once finished, how long it took. The estimate the player
wrote down stays a note.

**Blocked is not a status.** A task is blocked *out of* whichever status it is
in — an agent that stopped, a dependency that never arrived — so it is a field
on the task rather than a place in the flow.

## Review

Review happens inside `working`, not after it: a task being reviewed is still
being worked on.

When a task's area calls for another pair of eyes, the office suggests a
colleague who has been taught that area — review seats come from memory, not
from a field — and the two of them settle it while the work is still open. If
nobody has been taught the area, there is nobody to suggest, and the player
sees that.

What the player decides is the last step, not the verdict: whether the finished
work may be applied. Sending it back takes a reason and returns it to `working`.
Holding it parks it with the reason attached.

## PR Collaboration

In the MVP a `PullRequest` is not a real GitHub or GitLab pull request. It is a
game-world domain entity that exists to simulate review, collaboration, and work
progress inside the company.

A PR is an activity card, not a place of its own. It belongs to a task that is
still `working`, and it is where a colleague's comments and the back-and-forth
live. PRs surface on the office floor and in the activity feed; there is no PR
menu.

Example:

PR #4821 — Payment API error response change

The office suggests a reviewer by the task's area, from the people who have
been taught it:

- Architecture, Type safety, Database, Security, Localization, Product, Quality

Where a review stands:
- suggested — the area asks for a second pair of eyes, nobody picked yet
- reviewing — a colleague is looking
- settled — they are done, and the work carries on or is corrected

None of these is a task status. The task is `working` throughout, and moves to
`approval` when the work itself is finished.

## Memory

Expertise is taught, not grown. An employee does not fill a skill bar; the
player tells them something worth keeping, and it stays with them.

A memory has an area, the text itself, and the work it came from:

- Database — "복합 인덱스는 컬럼 순서가 중요해요" — from the slow payment lookup
- Process — "PR은 리뷰 하나만 받아도 머지해요" — from the payment webhook task

The areas are the ones an employee can be given a review seat in: Architecture,
Type safety, Database, Security, Localization, Product, Quality — and Process,
which everyone can hold but no one reviews for.

A memory is used, not just stored: when an employee references one, the
activity feed says so. Without that, teaching is only a notes field.

Memory has no cap, but it does have a cost: everything live is carried into
the work. Memories that stop being referenced can be archived, which keeps
them readable without keeping them loaded.

## Activity Feed

The player writes the nicknames, so the feed uses whatever they chose.

Examples:
- "모카 picked up Paginate the payment history."
- "삐약 is looking at the security side of the webhook change."
- "삐약 asked for the retryable failures to be split out."
- "모카 referenced [index rules] while working."
- "Change the payment API error shape is waiting on you."
- "The Backend team finished Payments rework."
- "Someone scheduled a meeting."
- "Coffee is running low."

The feed should consume domain events.

## Runtime Failure Gameplay

If a Claude Code session disconnects:

Employee:
- remains a company employee
- remains assigned to the task
- can display "Agent disconnected"

The player can reconnect/retry.

A runtime failure should not delete the employee or task.

## Progression

Early game:
- one employee
- one workspace
- simple tasks

Mid game:
- multiple employees
- teams
- projects
- PR reviews
- teaching memory

Late game:
- multiple rooms
- larger company
- multiple projects/workspaces
- multiple agent runtimes
- deeper collaboration
