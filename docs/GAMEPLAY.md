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
- assignee
- status
- priority
- progress
- blockers

Suggested statuses:
- backlog
- ready
- working
- review
- blocked
- done

## PR Collaboration

In the MVP a `PullRequest` is not a real GitHub or GitLab pull request. It is a
game-world domain entity that exists to simulate review, collaboration, and work
progress inside the company.

A PR is an activity card, not just a record.

It is a card because `review` is one of a task's statuses, not a place of
its own. Reviews surface on the office floor and in the activity feed; there
is no PR menu.

Example:

PR #4821 — Payment API error response change

Potential reviewers:
- Backend / Architecture
- Backend / Type Safety
- DBA
- Security
- Localization
- Planning
- QA

Review statuses:
- pending
- reviewing
- approved
- changes requested
- blocked

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

Examples:
- "Min-su started reviewing PR #4821."
- "Security requested changes."
- "Ji-eun referenced [index rules] while working."
- "The Backend team finished Payment API."
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
