# My Tiny Office — Product Definition

## Product

**My Tiny Office**

> Everyone's working. Probably.

A local-first work tool that looks like a cozy office. The user runs a tiny
software company whose employees are AI workers: they give them work, teach
them what to remember, and watch them get better at it.

## Fantasy

"I have my own tiny software office, and I can watch my people actually work."

It is a tool, not a game. The office is how the user sees who is doing what;
every desk, card and status on screen stands for real work. Nothing is
simulated for show.

## What develops

The user develops **employees**, not agents. An employee keeps what they have
been taught — memory, expertise, a way of working — and a record of what they
did. The agent is the engine each task runs on; if the engine improves or
changes, the employee keeps everything they were taught.

## Core Loop

Create company
→ Hire people
→ Give work
→ People work
→ Colleagues review
→ The user approves what is applied
→ Teach what they should remember
→ Expertise deepens
→ Grow company
→ Repeat

## AI Runtime

Nothing works without AI: an employee's decisions are the agent's. The runtime
is Claude Code, and it has to be installed and logged in from the first run.

The user keeps their existing Claude Code login. The product never asks for an
Anthropic API key for the Claude Code runtime and never handles authentication
itself.

## Company-Scoped Agents

The user controls which employees belong to a company.

Only that company's employees' agents are represented in its office.

The app is not intended to visualize every agent running on the local machine.

## First Run

Check Claude Code, create the company, hire the first employee, arrive at the
office. The screens are in DESIGN.md.

## User Actions

- hire, and let go
- send on leave, and bring back
- give work
- create, hold, finish and reopen projects
- review and approve
- teach a memory
- manage teams, roles and areas of expertise
- keep several companies, switch between them, move one to another
  computer (export, import), and delete one

## Office Progression

The office grows with its people: every hire brings a desk, and there is no
count to run out of. Rooms are not built: a team's room, the meeting room and
the lounge follow from who is doing what.

## Localization

First-class locales:
- Korean (`ko`)
- English (`en`)

Example:

EN: "Everyone's working. Probably."
KO: "다들 일하고 있습니다. 아마도요."

Technical terms such as PR, API, TypeScript, PostgreSQL, and Architecture may remain English where natural.
