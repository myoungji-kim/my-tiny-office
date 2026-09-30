# My Tiny Office

**Everyone's working. Probably.**

A local-first work tool that looks like a cozy office: a tiny software company whose employees are AI workers you give work to, teach, and watch get better.

## Concept

Create a company, hire employees, give them work, watch it happen, approve what gets applied, and teach them what to remember.

Every employee works through a real AI coding agent. Nothing is simulated.

## Install

My Tiny Office installs as a desktop app with its own window, icon and Start
menu or Dock entry. It is built on your computer from this repository, and the
installed app runs from the folder you cloned: keep that folder where it is.

You need a Claude account that can use Claude Code. The app never asks for an
API key; Claude Code handles its own login.

### Let Claude Code install it

If Claude Code is already installed and logged in, open it in the folder where
you keep your projects and paste this:

```text
Install My Tiny Office for me as a desktop app.

1. Check what it needs: Node.js 22 or later (node --version), git, and Claude
   Code logged in (claude auth status). Tell me what is missing and ask before
   installing anything. If I am not logged in to Claude Code, tell me to run
   claude auth login myself; do not log in for me.
2. Clone https://github.com/myoungji-kim/my-tiny-office.git into a folder that
   will stay (not a temporary one), since the installed app runs from it.
3. In that folder run npm install, then npm run app:install. On macOS, if
   better-sqlite3 fails to build, run xcode-select --install and try again.
4. Tell me where it was installed and how to open it.
```

<details>
<summary>The same prompt in Korean</summary>

```text
My Tiny Office를 데스크톱 앱으로 설치해 줘.

1. 필요한 것부터 확인해 줘: Node.js 22 이상(node --version), git, 그리고
   Claude Code 로그인 상태(claude auth status). 없는 게 있으면 알려 주고, 설치하기
   전에 먼저 물어봐 줘. Claude Code에 로그인이 안 돼 있으면 내가 직접
   claude auth login을 하라고 알려 줘. 대신 로그인하지는 마.
2. https://github.com/myoungji-kim/my-tiny-office.git 을 계속 둘 폴더(임시 폴더
   말고)에 clone해 줘. 설치된 앱이 그 폴더에서 실행돼.
3. 그 폴더에서 npm install, 그다음 npm run app:install을 실행해 줘. macOS에서
   better-sqlite3 빌드가 실패하면 xcode-select --install 후 다시 해 줘.
4. 어디에 설치됐고 어떻게 여는지 알려 줘.
```

</details>

### Windows

1. Install what it needs, in PowerShell:

   ```powershell
   winget install OpenJS.NodeJS.LTS
   winget install Git.Git
   irm https://claude.ai/install.ps1 | iex   # Claude Code
   ```

   Open a new terminal afterwards, then log in with `claude auth login`.
   Optional: `winget install GitHub.cli` and `gh auth login`, so approved work
   opens its pull request directly.
2. Install the app:

   ```powershell
   git clone https://github.com/myoungji-kim/my-tiny-office.git
   cd my-tiny-office
   npm install
   npm run app:install
   ```

3. Open **My Tiny Office** from the Start menu. Closing its window quits the
   app, and work in progress stops: the next time it opens, those tasks show
   as disconnected, and 다시 연결 picks each up from its session.

It is installed in `%LOCALAPPDATA%\Programs\My Tiny Office`, with a shortcut in
`%APPDATA%\Microsoft\Windows\Start Menu\Programs`.

### macOS

1. Install what it needs, in Terminal:

   ```bash
   xcode-select --install                        # git, and what better-sqlite3 builds with
   brew install node                             # or the LTS installer from nodejs.org
   curl -fsSL https://claude.ai/install.sh | bash   # Claude Code
   ```

   Then log in with `claude auth login`. Optional: `brew install gh` and
   `gh auth login`, so approved work opens its pull request directly.
2. Install the app:

   ```bash
   git clone https://github.com/myoungji-kim/my-tiny-office.git
   cd my-tiny-office
   npm install
   npm run app:install
   ```

3. Open **My Tiny Office** from `~/Applications`, Launchpad or Spotlight.
   Closing the window keeps the office working; quit it from the Dock.

### Linux

`npm run app:install` only builds the app, under `desktop/build/out`; run it
from there, or use `npm run app`.

### Updating

Quit the app, then in the cloned folder:

```bash
git pull
npm install
npm run app:install
```

The install refuses to run while the app is open. Your companies are kept.

### Uninstalling

Delete the app, then the cloned folder. Your companies are kept in their own
folder (see [Requirements](#requirements)) until you delete that too.

| | App | Companies |
| --- | --- | --- |
| Windows | `%LOCALAPPDATA%\Programs\My Tiny Office` and its Start menu shortcut | `%LOCALAPPDATA%\my-tiny-office` |
| macOS | `~/Applications/My Tiny Office.app` | `~/Library/Application Support/my-tiny-office` |

### Good to know

- `npm run app` opens the window straight from the clone, without installing.
- Only one server works a data directory at a time. If the desktop app is
  open, a `npm run dev` on the same data shows the office but leaves the work
  to the app.

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

## License

[MIT](LICENSE)
