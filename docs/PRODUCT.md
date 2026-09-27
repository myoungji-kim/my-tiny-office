# My Tiny Office — Product Definition

## Product

**My Tiny Office**

> Everyone's working. Probably.

A cozy local-first management simulation where the player builds, manages, and grows a tiny software company.

## Fantasy

"I have my own tiny software office, and I can watch my people actually work."

The game is primarily a game. Real AI agents are an optional, high-value layer.

## Core Loop

Create company
→ Hire people
→ Assign roles
→ Give work
→ People work
→ Collaboration / PR / reviews
→ Complete work
→ Teach what they should remember
→ Expertise deepens
→ Grow company
→ Expand office
→ Repeat

## AI Runtime Philosophy

The first real agent runtime is Claude Code.

The player does not need to purchase an Anthropic API key just to use the Claude Code runtime. The product should leverage the user's existing Claude Code setup through supported mechanisms.

The game remains usable without AI.

## Company-Scoped Agents

The player controls which employees belong to a company.

Only registered employee agents are represented in that company's office.

The app is not intended to visualize every agent running on the local machine.

## First Run

Create the company, hire the first employee, arrive at the office. No AI runtime
is chosen here: an employee does not need one, and connecting one is an upgrade
the player makes later, per employee. The screens are in DESIGN.md.

## Player Actions

- hire
- fire
- vacation
- assign tasks
- create project
- create/review PR
- teach a memory
- expand office
- configure agent runtime

## Office Progression

The direction, not yet a design:

1. One room / one desk / one employee
2. Team rooms
3. Meeting room
4. Server area
5. Lounge
6. More desks
7. Specialized spaces
8. Full software company

## AI and Simulation

AI should enhance the simulation, not replace it.

For example:
- A task can exist before an Agent is connected.
- A player can complete early gameplay without AI.
- An employee can have memories and a way of working independent of model choice.
- Runtime status can influence employee status without becoming the only source of truth.

## Localization

First-class locales:
- Korean (`ko`)
- English (`en`)

Example:

EN: "Everyone's working. Probably."
KO: "다들 일하고 있습니다. 아마도요."

Technical terms such as PR, API, TypeScript, PostgreSQL, and Architecture may remain English where natural.
