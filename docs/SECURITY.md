# My Tiny Office — Security and Permissions

This document is the safety boundary: what an employee's agent may do on the
user's computer, how that is enforced, and what the app itself must never do.
The user-facing version of the same promise is 설정 › 안전 범위
(`docs/ui/settings.html#safety`); the two must say the same thing.

Every rule here was measured against `claude 2.1.283` in a scratch repository
(the connector rules of §8 against `2.1.284`), not inferred from documentation. Re-measure on a Claude Code upgrade (see the
end of this document) before trusting it again.

## 1. The boundary in one table

| An employee | |
| --- | --- |
| Reads and edits files | Only inside the task's own worktree, `<folder>/.worktrees/<task>` |
| Runs commands | Only the ones the project allows, plus read-only commands inside the worktree that Claude Code allows on its own (`git log`, `ls`, `echo`) |
| Reaches the network | Never through its own tools, but for a connector its project turned on (§8). A command the project allows runs whatever it runs, and the agent can edit the scripts it calls (§3) |
| Pushes, merges, deploys | Never. Approval commits to `mto/<task>`; pushing that branch and opening its pull request is the user's click on the task's page (§6); merging and deploying stay the user's |
| Uses outside tools | Only the Atlassian connector (Jira, Confluence), in a project that turns it on: its read tools, and each write tool once the user has allowed it (§8). No other connector, MCP server or plugin |
| Carries the user's personal Claude Code setup (hooks, settings, auto-memory, `~/.claude/CLAUDE.md`) | Never. Of the user's plugins and skills, only those ticked in 설정 › 스킬과 플러그인, with their hooks and MCP servers off (§8) |
| Reads Claude Code's credentials | Never; nor does the app |
| Needs something outside this | Stops, and the task is blocked with the reason |

## 2. How a task is launched

The app starts each run itself, as a child process with an argument array and
no shell:

```text
claude -p
  --output-format stream-json --verbose
  --permission-mode dontAsk
  --setting-sources project                   ("" in a project using a connector, §8)
  --settings '{"autoMemoryEnabled":false,"disableAllHooks":true}'
  --disable-slash-commands                     (not when plugins are chosen, §8)
  --strict-mcp-config                          (not in a project using a connector)
  --tools Read,Edit,Write,Glob,Grep,Bash,PowerShell[,ToolSearch][,Skill]
  --allowedTools "Read(./**) Edit(./**) Write(./**) <project commands> [<connector tools>] [Skill]"
  [--plugin-dir <each chosen plugin, and one carrying the chosen skills>]
  --append-system-prompt-file <memory file>
  --max-budget-usd 2
  [--resume <session-id>]
cwd = <folder>/.worktrees/<task>
stdin = the task prompt
```

A reviewer's run is the same launch with `--tools Read,Glob,Grep` and
`--allowedTools "Read(./**)"`: it reads the worktree and nothing else — no
edits, no commands, whatever the project allows. It is handed the diff in its
prompt, since it cannot run git.

Each flag earns its place:

| Flag | Why | Measured |
| --- | --- | --- |
| `-p --output-format stream-json` | The only mode with structured events, permission-denial events and a spending cap. `--bg` logs are terminal output | ✓ |
| `--permission-mode dontAsk` | Anything not allowed is denied without a prompt nobody would answer, and a `permission_denied` event is emitted | ✓ |
| `--setting-sources project` | Drops the user's hooks, skills, plugins and MCP servers | ✓ 0 MCP tools, 0 skills, built-in plugins only |
| `--settings …` | Auto-memory and hooks off even if a project setting turns them on | ✓ hooks gone |
| `--strict-mcp-config` | Left out only in a project using a connector (§8). No MCP server but those passed with `--mcp-config`, and none is. Without it the account's claude.ai connectors (Gmail, Drive, Calendar, Atlassian) join the session **after its first turn**, so the init event shows none | ✓ 0 connectors through a four-step run; without it 92 connector tools arrived after step 1, and the run cost $0.59 instead of $0.04 |
| `--tools …` | Only these built-in tools exist in the session; no WebFetch, WebSearch, Task, Cron. `ToolSearch` only with a connector: connector tools arrive deferred and nothing loads them without it | ✓ 7 tools; without `ToolSearch` a connector run saw no `mcp__` tool at all |
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
  own scripts, so the list is only as safe as the repository — **and the agent
  writes that repository**: the tests `npm test` runs, the configs it reads,
  the `test` script in `package.json` itself. An allowed command therefore
  runs code the agent wrote, with the user's rights and the network, which is
  a way out of the boundary for an agent turned against the user by the prompt
  injection of §5. Forbidding edits to `package.json` would not close it; the
  tests are code too. The dialog and the guide say so.
- **Closing it is the OS sandbox's job, and native Windows has none.** Claude
  Code's sandbox confines every Bash, PowerShell and Monitor command and its
  children — writes to the working directory, no network — on macOS, Linux and
  WSL2; the documentation states native Windows is not supported. Where it
  exists the launch would add, once measured:
  `{"sandbox":{"enabled":true,"failIfUnavailable":true,"allowUnsandboxedCommands":false,"network":{"allowedDomains":[],"strictAllowlist":true}}}`
  — `failIfUnavailable` so a missing sandbox fails the run rather than
  silently running without one, and `allowUnsandboxedCommands: false` so the
  model cannot retry a blocked command outside it. It also reads the whole
  machine by default, so credentials need `sandbox.credentials` or
  `filesystem.denyRead`. Until it is measured on one of those platforms, and
  on native Windows for good, this is the boundary's known gap: allow only the
  commands a task needs, in repositories you trust.
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

- It cannot reach the network, so there is nowhere to send what it finds —
  unless its project turned on a connector, which is a way out (§8).
- It cannot read outside the worktree, so there is little worth sending.
- It cannot write outside the worktree, and nothing it writes leaves the
  worktree until the user approves, which is a local commit.
- Jira issues and Confluence pages are text anyone in the organisation wrote,
  so a connector brings more of it in. A connector's writes stop for the user
  until allowed, and the stop shows what would be written; a read carries
  whatever the agent puts in its query to Atlassian, which is the user's own
  organisation.

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
- **Git.** Every `git` the app runs carries `-c core.hooksPath=<an empty
  folder>` and `-c core.fsmonitor=false`, and diffs add `--no-ext-diff
  --no-textconv --no-renames`: an agent can edit the files a repository's
  hooks, monitor or diff drivers point at, and those would run with the user's
  rights, outside the session's boundary. Commits add `--no-verify`. In a
  task's worktree git is given `--git-dir` — the directory the repository
  keeps for that worktree — and `--work-tree` explicitly, never left to find
  them through the worktree's `.git` file, which the agent can rewrite to
  point at a git directory, and a config, of its own. Looking at what changed
  only reads: new files are listed with `ls-files --others` and read by the
  app, so opening a task's page stages nothing.
  A worktree and its branch are named only from the task's own UUID
  (`.worktrees/<task>`, `mto/<task>`), never from text anyone wrote.
- **Removing files.** An agent's tools cannot delete, and no command is
  allowed for it; it ends its report with `Remove: <path>` instead, and the app
  deletes the file only if the path stays inside the worktree, is not absolute
  and is not under `.git`. A link is removed, never what it points at, and
  folders are left alone.
- **Publishing.** Only on the user's click, for applied work: `git push
  --no-verify origin refs/heads/mto/<task>:refs/heads/mto/<task>`, with the
  same hook and monitor settings as every git the app runs, and the user's own
  git credentials — the app never sees them. `origin` must read as a GitHub
  repository (`github.com` or a `github.` host, a plain owner and name), the
  task's branch must exist, and the branch it goes into must be one of
  origin's, as this repository last fetched them (read locally), checked
  again when it is sent: what the browser sends is only a choice among them. The
  pull request is opened with `gh` only when it is on `PATH` and `gh auth
  status --hostname <host>` exits 0 — its output is not read — as `gh pr create
  --head <branch> --base <base> --title <title> --body-file -`; otherwise the task keeps a link
  to GitHub's own page for it. Only an `https://` address is kept and linked.
- **Sessions.** A session id is checked to be a UUID before it becomes
  `--resume <id>`, so nothing stored can turn into a flag.
- **Output.** Agent output, file names, diffs and anything else from a run is
  rendered as text. Never through `dangerouslySetInnerHTML`. The agent's
  closing report is drawn as markdown by the app's own renderer
  (`src/components/markdown.tsx`), which builds elements only: no HTML in it
  becomes markup, and a link keeps its words but not its target.
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

A project may turn on the **Atlassian connector** (Jira, Confluence) — the one
the user's Claude account already connected on claude.ai. The app never signs
in to Atlassian, holds no token for it, and reads nothing of the account's
setup: Claude Code brings the connector, as it does in the user's own sessions.

Measured on `2.1.284`, a run without `--strict-mcp-config` and with
`ToolSearch`:

- The init event lists no MCP tool. The account's connectors arrive deferred —
  92 tools (Atlassian 41, Gmail 23, Drive 11, Calendar 9, Claude Docs 8) — and
  `ToolSearch` loads them. Without `ToolSearch` the agent saw none.
- A tool named in `--allowedTools` ran: it listed the user's Jira issues.
- A tool not named was denied in `dontAsk` before anything reached Jira, with
  the same `permission_denied` event a command gets; the call itself shows
  its input (the issue, the comment's text).
- Five tool calls cost $0.26, against $0.05 for a run that used none.

**Without `--strict-mcp-config`, a folder's `.mcp.json` starts.** Measured: a
worktree `.mcp.json` naming a server started its process — the command ran,
with the user's rights, before the session did anything — even with no
settings file approving it, and even with `enableAllProjectMcpServers: false`
in `--settings`. A repository can carry that file and an agent can write it.
`--setting-sources ""` — no settings source at all — keeps it from starting,
keeps the user's own MCP servers out too, and still brings the account's
connectors (measured: no process, Atlassian tools answered). It also stops
the folder's `CLAUDE.md` loading, so such a session is told to read it. A
chosen plugin's MCP server starts the same way without the flag, so a
connector project is given the chosen skills but no plugin.

So a project using the connector launches without `--strict-mcp-config` and
with `--setting-sources ""`, adds `ToolSearch` to `--tools`, and adds to
`--allowedTools`:

- **Atlassian's read tools**, by name, from the list the app keeps
  (`src/infrastructure/runtime/connectors.ts`), measured against the tools
  the connector offers. A tool not on that list is neither read nor write, and
  is never allowed.
- **The write tools the project allows.** None to start. A write the project
  has not allowed stops the task, like a command (§3), and the stop names the
  tool and shows what it would write; the user allows it — for the project,
  and the run resumes — or carries on without it. Only Atlassian's write tools
  can be allowed.

Every other connector the account has is seen by the agent, by name, and
denied. Gmail, Drive and the rest cannot be allowed from any project.

**Which server is Atlassian differs by account.** A connector's tools are
`mcp__<server>__<tool>`, and the server is the account's own name for it.
설정 › 연결된 도구 › 확인하기 finds it with a session that can only look:
`--tools ToolSearch --allowedTools ToolSearch`, `dontAsk`, `--max-budget-usd
0.5`, in an empty temporary folder, with the same isolation as §2 but for
`--strict-mcp-config`. It loads one tool of each connector with `select:`,
and the app keeps the servers that ToolSearch's own `tool_reference` results
name — never the model's words — in this computer's `settings.json`. Atlassian
is the server whose name says so; until a check has run, the measured one
(`claude_ai_Atlassian_Rovo`). Measured: five servers confirmed, 7 turns,
$0.09. A denied write is read as Atlassian's under any server named so.

**Skills and plugins.** The user's Claude Code keeps plugins in
`~/.claude/plugins` (`installed_plugins.json`, user scope) and skills in
`~/.claude/skills/<name>/SKILL.md`. The app reads only those two to list them,
and gives a task's run the ones ticked in settings — each chosen plugin with
`--plugin-dir`, and the chosen skills copied into one plugin of the app's own
in the run's temporary folder — with `Skill` added to `--tools` and
`--allowedTools` and `--disable-slash-commands` dropped, since it removes the
Skill tool too. A reviewer is given none. Measured on `2.1.284`:

- A chosen plugin's `SessionStart` hook did not run (`disableAllHooks`), and a
  chosen plugin's MCP server did not join (`--strict-mcp-config`): the tools
  were exactly the listed ones.
- A skill carried in the app's plugin loaded and was invoked.
- **Claude Code's built-in skills come along** once skills are on, and a
  `Skill(<name>)` allow rule does not narrow them: an unlisted built-in one
  loaded. They work only through the session's tools, so the boundary holds;
  the settings panel says they come.
- `--disable-slash-commands` with a plugin leaves no Skill tool at all.

Prompt injection (§5) is the risk this adds: an issue or a page can carry
instructions, and the connector is a way out of the folder. Reads go to the
user's own Atlassian organisation; writes stop for the user until allowed, so
allowing a write tool is trusting every later use of it in that project.

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
no connector: they arrive late, so the init event alone does not show them.

For a connector launch, check that a worktree `.mcp.json` whose server writes
a file does not start (`--setting-sources ""`), and that the connector still
answers.

Also check that a `.claude/settings.json` in the worktree allowing bare
`Bash`, with `defaultMode: bypassPermissions`, changes nothing: a command
not on the project's list is still denied (measured on `2.1.284`: the app's
own flags decide). With a plugin chosen, check that its hook does not run and
its MCP server does not join.

Then launch a connector project's run and check that it lists the connector's
tools through `ToolSearch`, that an allowed read tool runs, that a write tool
not allowed is denied with a `permission_denied` event before it reaches
Atlassian (on an issue that does not exist), and that the read list still
matches the tools the connector offers. Record the version at the top of this
document.
