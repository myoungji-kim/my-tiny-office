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
├── desktop/                 the desktop window and its installer
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
    ├── instrumentation.ts   starts the work supervisor with the server
    └── proxy.ts             refuses requests not addressed to this machine
```

## Requirements

Runs on macOS, Windows and Linux.

- Node.js 22 or later (`better-sqlite3` needs it)
- git
- Claude Code, installed and logged in (`claude auth login`); the app never asks for an API key
- GitHub CLI (`gh`), optional: with it signed in, applied work opens its pull request directly

`npm install` builds `better-sqlite3`. When no prebuilt binary fits, it compiles
from source; on macOS that needs the Xcode Command Line Tools
(`xcode-select --install`).

Companies live outside the repository:

| | |
| --- | --- |
| macOS | `~/Library/Application Support/my-tiny-office` |
| Windows | `%LOCALAPPDATA%\my-tiny-office` |
| Linux | `$XDG_DATA_HOME/my-tiny-office`, or `~/.local/share/my-tiny-office` |

`MY_TINY_OFFICE_DATA_DIR` overrides it. Choosing a project folder opens the
system picker: `osascript` on macOS, PowerShell on Windows, `zenity` or
`kdialog` on Linux. Agents run commands through Bash on macOS and Linux, and
through Bash and PowerShell on Windows (docs/SECURITY.md §2).

## Desktop app

The app runs as a desktop app with its own window and icon. The window
starts the server with this computer's Node and stops it on quit. On macOS,
closing the window keeps the office working until you quit from the Dock.

```bash
npm install
npm run app:install
```

This builds the app and installs **My Tiny Office**: in `~/Applications` on
macOS, and in the Start menu on Windows (`%LOCALAPPDATA%Programs`). The
installed app runs this checkout, so to update it you `git pull`, then run
`npm install` and `npm run app:install` again. `npm run app` opens the
window straight from the checkout, without installing it.

Only one server works a data directory at a time. If the desktop app is open,
a `npm run dev` on the same data shows the office but leaves the work to the
app.

### Installing with Claude Code

Ask Claude Code to install it. It follows these steps:

1. Check the requirements above: `node --version` is 22 or later, and `git`
   works. Check Claude Code with `claude auth status`. If you are not logged
   in, you run `claude auth login` yourself; the app never handles the login.
2. Clone the repository, or use this checkout, and run `npm install`. On
   macOS, if `better-sqlite3` fails to build, install the Xcode Command Line
   Tools with `xcode-select --install`, then run it again.
3. Run `npm run app:install`.
4. Open **My Tiny Office** from Applications or the Start menu.

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
