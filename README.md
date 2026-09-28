# My Tiny Office

**Everyone's working. Probably.**

A local-first work tool that looks like a cozy office: a tiny software company whose employees are AI workers you give work to, teach, and watch get better.

## Concept

Create a company, hire employees, give them work, watch it happen, approve what gets applied, and teach them what to remember.

Every employee works through a real AI coding agent. Nothing is simulated.

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
├── Domain
├── Persistence
└── Agent Runtime
    └── Claude Code Adapter  ← MVP
```

## Core Loop

Create company → Hire → Give work → Work → Review → Approve → Teach → Grow

## Localization

- Korean
- English

## Stack

- TypeScript
- React
- Next.js
- SQLite
- Drizzle ORM
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
│   ├── RULES.md
│   ├── ARCHITECTURE.md
│   ├── STYLE-GUIDE.md
│   ├── SECURITY.md          what an agent may do, and how it is enforced
│   └── ui/                  the UI standard: open index.html
├── drizzle/                 the migrations, generated from the schema
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
    ├── server/
    ├── ui/                  the cast and tiles, drawn from docs/ui/system.js
    └── proxy.ts             refuses requests not addressed to this machine
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
npm run check:ui   # when docs/ui or the app's screen styles changed
```

Keep the office honest: show only work that is really happening.

Keep agent runtimes behind an adapter boundary.

Never commit secrets or local databases.
