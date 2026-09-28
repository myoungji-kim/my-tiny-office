# My Tiny Office — Security and Permissions

This document is the safety boundary: what an employee's agent may do on the
user's computer, how that is enforced, and what the app itself must never do.
The user-facing version of the same promise is 설정 › 안전 범위
(`docs/ui/settings.html#safety`); the two must say the same thing.

Every rule here was measured against `claude 2.1.283` in a scratch repository,
not inferred from documentation. Re-measure on a Claude Code upgrade (see the
end of this document) before trusting it again.

## 1. The boundary in one table

| An employee | |
| --- | --- |
| Reads and edits files | Only inside the task's own worktree, `<folder>/.worktrees/<task>` |
| Runs commands | Only the ones the project allows, plus read-only commands inside the worktree that Claude Code allows on its own (`git log`, `ls`, `echo`) |
| Reaches the network | Never |
| Pushes, merges, deploys | Never. Approval commits to `mto/<task>`; the rest is the user's |
| Uses outside tools (Jira, Slack, any MCP server) | Never, in the MVP |
| Carries the user's personal Claude Code setup (hooks, skills, plugins, auto-memory, `~/.claude/CLAUDE.md`) | Never |
| Reads Claude Code's credentials | Never; nor does the app |
| Needs something outside this | Stops, and the task is blocked with the reason |

## 2. How a task is launched

The app starts each run itself, as a child process with an argument array and
no shell:

```text
claude -p
  --output-format stream-json --verbose
  --permission-mode dontAsk
  --setting-sources project
  --settings '{"autoMemoryEnabled":false,"disableAllHooks":true}'
  --disable-slash-commands
  --strict-mcp-config
  --tools Read,Edit,Write,Glob,Grep,Bash,PowerShell
  --allowedTools "Read(./**) Edit(./**) Write(./**) <project commands>"
  --append-system-prompt-file <memory file>
  --max-budget-usd 2
  [--resume <session-id>]
cwd = <folder>/.worktrees/<task>
stdin = the task prompt
```

Each flag earns its place:

| Flag | Why | Measured |
| --- | --- | --- |
| `-p --output-format stream-json` | The only mode with structured events, permission-denial events and a spending cap. `--bg` logs are terminal output | ✓ |
| `--permission-mode dontAsk` | Anything not allowed is denied without a prompt nobody would answer, and a `permission_denied` event is emitted | ✓ |
| `--setting-sources project` | Drops the user's hooks, skills, plugins and MCP servers | ✓ 0 MCP tools, 0 skills, built-in plugins only |
| `--settings …` | Auto-memory and hooks off even if a project setting turns them on | ✓ hooks gone |
| `--strict-mcp-config` | No MCP server but those passed with `--mcp-config`, and none is. Without it the account's claude.ai connectors (Gmail, Drive, Calendar, Atlassian) join the session **after its first turn**, so the init event shows none | ✓ 0 connectors through a four-step run; without it 92 connector tools arrived after step 1, and the run cost $0.59 instead of $0.04 |
| `--tools …` | Only these built-in tools exist in the session; no WebFetch, WebSearch, Task, Cron | ✓ 7 tools |
| `Read(./**)` and friends | File tools confined to the worktree. The `Read` rule also governs Grep and Glob | ✓ outside read, write, grep and glob denied |
| `<project commands>` | Each allowed command as `Bash(<cmd>)` **and** `PowerShell(<cmd>)`: on Windows the agent runs commands through PowerShell | ✓ |
| stdin for the prompt | `--allowedTools` and `--tools` are variadic and swallow a trailing prompt argument; stdin also keeps task text out of the process list and past Windows' command-line limit | ✓ |
| `--max-budget-usd 2` | A runaway stop, not a budget: $2 per run, fixed and not a setting. It is checked after a turn, so a run can overshoot (a $0.10 cap stopped at $0.20) | ✓ `error_max_budget_usd` |

**Never** pass `--dangerously-skip-permissions`, `--allow-dangerously-skip-permissions`,
`--permission-mode bypassPermissions`, an unscoped `Read`, `Edit`, `Write`,
`Grep` or `Glob`, or a bare `Bash`/`PowerShell`. Each of these was shown, or is
documented, to open the whole machine: an unscoped `Write` wrote outside the
worktree and an unscoped `Grep` searched outside it in the measurement.

`-p` skips Claude Code's workspace-trust dialog. That is why the app asks for
the folder itself (§4): choosing a folder is the consent.

## 3. Commands a project allows

A project carries its list of allowed commands. When a folder is chosen the
list starts from the scripts in its `package.json` (test, lint, build and the
like); the user adds and removes entries in the project dialog.

- An entry is one plain command: no `*` (a wildcard in a rule), no
  parentheses (which end one), nothing that chains or redirects another
  command (`; & | \` $ < >`), and no control, invisible or reordering
  characters, so what the user approves is what runs. Twenty at most per
  project. A stored list is checked again when read, so a hand-edited or
  imported file cannot widen it.
- Allowing a command allows everything it does. `npm test` runs the project's
  own scripts, so the list is only as safe as the repository. The dialog and
  the guide say so.
- A task that needs a command not on the list is denied, and the run's
  `permission_denied` event becomes the task's blocked reason. The user can
  allow it from the task's page; it is added to the project, not to the one
  task, and the run resumes. Or the run resumes without it, told it was not
  allowed; that is the only way on for a command no entry could be, such as
  one chained with `&&`.
- Every session is told it is already in its folder, to run each allowed
  command on its own as written, and which commands those are, so it does not
  reach for `cd … && …` in the first place.

## 4. Folders

- A project's folder is chosen in the project dialog, which shows the boundary
  in §1 and the command list beside it. Creating or saving the project is the
  consent.
- The browser cannot hand over a path, so 고르기 asks the server to open the
  operating system's own folder dialog on this computer (the Explorer dialog,
  `IFileOpenDialog` in folder mode, through PowerShell on Windows; `osascript` on macOS, `zenity` or `kdialog`
  on Linux) — a fixed script run without a shell, one dialog at a time — and a
  path can be typed instead. Either way the server checks it: an absolute path
  (a leading `~` is the home folder) to a folder, not a file, that the app can
  read and write. It keeps only the canonical path it resolves to
  (`realpath`), checks it again when the project is saved, and says when the
  folder is not a git repository, which a task's worktree needs. The allowed
  commands start from that folder's `package.json` scripts, each one passing
  §3 before it is offered.
- Paths are resolved to an absolute, canonical path before use; a task's
  worktree and branch are named from the app's own task id only, never from
  user text.
- `.worktrees/` is added to the repository's `.git/info/exclude`.
- A folder is a property of this computer. An imported company keeps the
  path, but its `folder_confirmed` is cleared: the project cannot start and
  nothing is picked up in it until the user chooses the folder again on this
  computer, which asks again.

## 5. Prompt injection

An agent reads code and documents that anyone may have written. The design
assumes something it reads will try to redirect it:

- It cannot reach the network, so there is nowhere to send what it finds.
- It cannot read outside the worktree, so there is little worth sending.
- It cannot write outside the worktree, and nothing it writes leaves the
  worktree until the user approves, which is a local commit.
- Outside tools are not available at all in the MVP; a future integration must
  keep writes behind approval (§8).

Approval is the last line, so the approval screen shows every changed file and
its diff, and the guide asks the user to look before approving.

## 6. The app itself

The app is a local web server holding every company's data and able to start
agents, so it is a target in its own right.

- **Binding.** It listens on `127.0.0.1` only.
- **DNS rebinding.** Every request's `Host`, and `X-Forwarded-Host` when
  present, must name this machine (`127.0.0.1`, `localhost`, `[::1]`); anything
  else is refused with 421 before routing, static files included
  (`src/proxy.ts`). That holds for `next start`. Under `next dev` the
  development server answers `/_next/*` and its own endpoints before the proxy
  runs, so a rebinding page can read development bundles; run the app with
  `next start` for real use.
- **Cross-site requests.** Anything but `GET`, `HEAD` and `OPTIONS` needs an
  `Origin` equal to the host, and a `Sec-Fetch-Site` that is not `cross-site`;
  otherwise 403. Next.js checks the origin of a server action too, but lets one
  without an `Origin` through, which this does not. No state changes on `GET`.
- **Processes.** `claude` and `git` are started only through
  `src/infrastructure/process/run.ts`: `spawn(file, args)` with `shell: false`,
  found on `PATH` by the app rather than by a shell.
  - Relative `PATH` entries are skipped, since they would resolve inside a
    task's worktree.
  - On Windows only a `.exe` or `.com` counts. A `claude` installed as a
    `.cmd` shim (the npm install) is refused rather than run through a shell,
    and the app will ask for the native install. A native program anywhere on
    `PATH` wins over a shim that comes earlier.
  - `ANTHROPIC_API_KEY` and `ANTHROPIC_AUTH_TOKEN` are removed from a child's
    environment, so a key in the server's shell never bills silently.
  - A timeout stops the whole process tree (`taskkill /T` on Windows, the
    process group elsewhere) and returns even if a grandchild holds the pipes.
    Output is capped at 8 MB.
- **Output.** Agent output, file names, diffs and anything else from a run is
  rendered as text. Never through `dangerouslySetInnerHTML`.
- **Claude Code's sign-in.** Read from `claude auth status --json`, and only
  `loggedIn`, `authMethod` and `subscriptionType`. The email and organisation
  it also returns are not read, stored or logged.
- **Secrets.** No token field, no API key, no credential store is read. Nothing
  from a run's environment is logged.

## 7. Company files

- A company file holds the history of its work: task text, the agent's steps,
  file names and diffs. It may contain pieces of code. Export says where it
  was saved; the guide says to move it only somewhere trusted.
- **Every company file is opened with `PRAGMA trusted_schema = OFF`**, so its
  schema never runs a function with the app's rights, and a file that will not
  open is left as it was.
- **Import treats the file as untrusted.** It arrives as the body of a
  same-origin `POST` of at most 64 MB and is written to a copy in `imports/`.
  The copy must pass `PRAGMA integrity_check`, hold only the tables this
  version knows and their indexes — no triggers, no views — carry no more
  migrations than this version has, and hold exactly one company. Only then are
  migrations run, every `company_id` rewritten to a fresh id, and the file moved
  into `companies/`. A file that fails any of these is refused whole and the
  copy removed.
- Nothing in an imported file starts anything: its folders need choosing again
  (§4) and its sessions belong to another computer.
- Export is a `GET` that only this machine can reach (§6); it reads the one
  company named, by an id that must be one of the app's own.

## 8. Outside tools

Out of the MVP. `--strict-mcp-config` keeps the account's claude.ai connectors
out, which `--setting-sources project` alone does not: they arrive after the
first turn. Not isolating the user's setup brings every
personal plugin and 350–400 tool definitions into each task, inconsistently
(the Jira read tool appeared in one run and not the next) and at roughly $0.16
per trivial call.

When it returns, it is per company and explicit: a list of MCP servers in the
company's settings passed with `--strict-mcp-config --mcp-config`, read tools
allowed by name, write tools listed in `--disallowedTools` (measured: they
leave the tool list) and made only on approval.

## 9. Re-measuring

On a new Claude Code version, before release, run a scratch repository with a
worktree and a file outside it, launch §2 with a prompt that attempts each of:

1. write inside the worktree — allowed
2. read, write, grep and glob outside it — denied
3. an allowed command, and one not allowed — allowed, denied with an event
4. a network command — denied
5. `cat` of an outside path — denied

and check that the init event lists no MCP servers, no skills, no hooks and
only the listed tools, and that after several turns the agent is still told of
no connector: they arrive late, so the init event alone does not show them. Record the version at the top of this document.
