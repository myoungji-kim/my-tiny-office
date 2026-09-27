# My Tiny Office

**Everyone's working. Probably.**

A cozy local-first simulation game where you build, manage, and grow your own tiny software company.

## Concept

Create a company, hire employees, assign work, watch projects progress, review pull requests, train your team, and expand your office.

The game can optionally connect employees to real AI coding agents.

## Agent Runtime

The MVP integrates with **Claude Code**.

The important distinction is:

- My Tiny Office manages the company and employees.
- Claude Code provides the first real agent runtime.
- The user keeps their existing Claude Code authentication.
- My Tiny Office only shows agents explicitly registered to the active company.
- Unrelated Claude sessions on the computer are not automatically imported.

The architecture is runtime-agnostic so additional runtimes can be added later.

## Architecture

```text
My Tiny Office
│
├── Office UI
├── Simulation / Domain
├── Persistence
└── Agent Runtime
    └── Claude Code Adapter  ← MVP
```

## Core Loop

Create company → Hire → Assign work → Work → Collaborate → Complete → Teach → Grow → Expand

## Localization

- Korean
- English

## Stack

- TypeScript
- React
- Next.js
- Tailwind CSS
- SQLite
- Drizzle ORM
- Zod
- npm

The MVP runs as a local web application. Desktop packaging is not in scope yet.

## Repository Structure

```text
my-tiny-office/
├── README.md
├── CLAUDE.md
├── CONTRIBUTING.md
├── docs/
│   ├── PRODUCT.md
│   ├── DESIGN.md
│   ├── GAMEPLAY.md
│   ├── ARCHITECTURE.md
│   ├── STYLE-GUIDE.md
│   ├── ui/                  the UI standard: open index.html
│   └── archive/             superseded directions, kept for comparison
├── .github/
│   ├── pull_request_template.md
│   ├── ISSUE_TEMPLATE/
│   └── workflows/
├── scripts/
│   └── ui/                  the checks that keep docs/ui honest
└── src/
    ├── app/
    ├── application/
    ├── components/
    ├── domain/
    ├── i18n/
    ├── infrastructure/
    └── server/
```

## Development

```bash
npm install
npm run dev
```

Checks:

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run check:ui   # when docs/ui changed
```

Keep the game playable without AI.

Keep agent runtimes behind an adapter boundary.

Never commit secrets or local databases.
