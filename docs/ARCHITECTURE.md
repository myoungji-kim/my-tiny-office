# My Tiny Office — Architecture

## 1. Architectural Goal

My Tiny Office is a local-first work tool, shown as an office, whose employees are AI workers.

Every employee works through an agent runtime; nothing is simulated. The runtime is an execution system, not the source of truth: the company, its employees and their memory live in the app and survive any runtime failure.

## 2. Execution Environment

The MVP runs as a local web application.

```text
Browser
  ↓
Next.js
  ↓
Local application / server-side logic
  ↓
SQLite / local services
  ↓
Agent Runtime
```

Server-side logic, persistence, and agent runtimes run on the local Next.js process. The browser is a client, not a place where SQLite or runtime processes live.

### Server and client boundary

SQLite, Drizzle and the application context run only on the server. The browser
never opens the database.

```text
React component
  ↓ server action / server component
Application use case
  ↓
Repository
  ↓
SQLite
```

Pages read through a server-side view model that shapes domain entities into
display data, including a task's time taken derived from the current time. Mutations
go through server actions that call a use case and revalidate the page; they
carry no domain logic of their own, and treat every argument from the browser as
untrusted. Nothing under `src/infrastructure` may be imported from a client
component.

Each screen is a route — `/` the office, `/projects`, `/projects/<id>` and
`/projects/<id>/<task>`, `/people` and `/people/<id>`, `/company`, `/settings`
and `/new` for another company — and what a screen is showing (a room, a tab, a
filter) is in its query string. The company open is the one `settings.json`
names, so links never carry it. Two route handlers move files:
`GET /settings/export` and `POST /settings/import`.

Electron and Tauri are not used in the MVP.

Desktop packaging remains a natural long-term fit for local SQLite, local agent runtimes, process management, and workspace access, but it is a separate decision to be revisited when the product actually requires it. Until then, the UI and domain layers must stay usable as a plain web application.

## 3. Time

A task stores how long its runs have taken so far and when the current run
began; time taken is that plus the running span, never a share of an
estimate: an agent's work ends when it ends. A pause — held, blocked, handed
back — adds nothing. What the agent is doing is reported by the runtime.

Time keeps passing while the application is closed, so on the next launch the
app reconciles each running task with its session rather than assuming it
observed every moment.

## 4. High-Level Architecture

```text
┌────────────────────────────────────────────────────────────┐
│                     My Tiny Office                         │
│                                                            │
│  Office UI                                                 │
│  ├── Office Map                                            │
│  ├── Projects                                              │
│  ├── Employees                                             │
│  ├── Company                                               │
│  └── Settings                                              │
│                                                            │
│  Domain                                                    │
│  ├── Company                                               │
│  ├── Employee                                              │
│  ├── Task / Project                                        │
│  ├── PullRequest / Review                                  │
│  ├── Memory                                                │
│  └── Domain Events                                         │
│                                                            │
│  Agent Runtime                                             │
│  ├── Claude Code Adapter       ← MVP                      │
│  ├── Codex Adapter             ← later                    │
│  ├── Local Runtime             ← later                    │
│  └── API Runtime               ← later                    │
└────────────────────────────────────────────────────────────┘
```

## 5. Employee vs Agent

An Employee is a domain entity — the one the user teaches and develops.

An Agent is an execution capability attached to an Employee.

```text
Employee
├── identity
├── role
├── team
├── memories
├── workingStyle
├── availability
├── tasks
└── Agent
    ├── runtime
    └── runs, each in a session it keeps
```

Do not make the Employee itself a Claude Code session.

## 6. Company-Scoped Ownership

The central rule is:

> My Tiny Office displays only Agents explicitly registered to the active Company.

The application is not a general-purpose local agent monitor.

Example:

```text
Local machine
├── unrelated Claude session
├── personal Claude session
├── another project session
└── My Tiny Office
    └── Company: TinySoft
        ├── Min-su
        │   └── Claude Code session A
        ├── Ji-eun
        │   └── Claude Code session B
        └── Alex
            └── Claude Code session C
```

Only A/B/C are part of the TinySoft company.

### Why this matters

- Prevents unrelated work from appearing in the office.
- Makes company state deterministic.
- Makes save/load possible.
- Gives each employee an explicit owner.
- Provides a clear privacy boundary.
- Prevents global session discovery from becoming the product's core behavior.

## 7. Domain Model

Suggested entities:

```text
Company
├── id
├── name
├── description
├── teams
├── employees
├── projects
├── tasks
├── pullRequests
├── memories
└── events

Employee
├── id
├── companyId
├── name
├── species        picks the sprite
├── roleId
├── teamId?
└── availability   available | onLeave, and since when

Agent              made the first time its employee is given work
├── id
├── companyId
├── employeeId     one agent per employee
├── runtime        claudeCode
└── createdAt

Project
├── id
├── companyId
├── name
├── description?
├── folder?
├── folderConfirmed chosen on this computer, not brought by an import
├── commands        the exact commands its employees may run
├── status          planned | active | held | done
├── priority        high | normal | low
├── heldReason?
├── startedAt?
└── finishedAt?

Run                one launch of an agent on a task
├── id
├── companyId
├── taskId
├── agentId
├── sessionId?     the runtime's, once it names it
├── state          starting | running | ended
├── end?           finished | denied (the command) | budgetReached | failed
│                  | stopped | disconnected
├── costUsd
├── startedAt
└── endedAt?

RunStep            what a run reported doing: read · edit · run · say

Area          the company's own list; seven to start, named by the dictionary
Memory        expertise (an area) · style · company (no employee)
Role · Team   the company's lists; a role is required, a team is not
Review        the in-app PullRequest: suggested · queued · reviewing · settled
Milestone     the history, only ever added to, names kept as they were
```

`src/domain` has these as plain values and pure transitions; the pick-up
(`pick-up.ts`) decides who starts what next, a waiting review first. Use cases
in `src/application` load, call the domain, save, and record the milestones the
events earn (`history.ts`).

The important relationship is:

```text
Company 1 ─── N Employee
Employee 1 ─── 1 Agent
Agent 1 ─── N Run           every launch, on any task
```

A session belongs to the agent that started it. A later run of the same agent
on the same task continues that session (`sessionToContinue` in
`src/domain/run.ts`); a task handed to someone else starts a new one, with
only the worktree carried over.

An employee outlives a failed agent: when the runtime is unavailable the
employee, their memory and their task remain, but nothing new starts.

### PullRequest

In the MVP a `PullRequest` is an in-app domain entity, not a real GitHub or GitLab pull request.

```text
Company
  ↓
Project
  ↓
Task
  ↓
PullRequest
  ↓
Review
```

The app owns its own pull requests, reviews, and review statuses. Nothing is read from or written to a hosting provider.

A GitHub or GitLab integration may be added later as a separate integration. It must not replace the in-app entity.

## 8. Runtime Adapter

The application sees a runtime through two small ports in
`src/application/agent-runtime.ts`:

```ts
interface AgentRuntime {
  launch(input: LaunchInput, onEvent: (event: AgentEvent) => void, onExit: () => void): RunningAgent;
}

interface Workspace {
  prepare(folder: string, taskId: string): Promise<{ ok: true; path: string } | { ok: false }>;
  commit(folder: string, taskId: string, message: string): Promise<boolean>;
  remove(folder: string, taskId: string): Promise<void>;
}
```

`LaunchInput` is the worktree, the prompt, what the employee was taught, the
project's commands and the session to resume. An `AgentEvent` is the app's
own vocabulary — a session named, a step, a command refused, a result — so
nothing Claude-specific reaches the domain. Attaching is launching with a
session to resume; changing a running task is ending the run and resuming it
with the change; detaching is `stop()`. Status is not asked for: the
supervisor (§9) holds every running agent and hears each exit.

The Claude Code implementations are `src/infrastructure/runtime/claude-code-run.ts`
and `src/infrastructure/workspace/git.ts`.

## 9. Claude Code Adapter — MVP

Claude Code is the first supported runtime.

The desired user experience is:

```text
First launch
  ↓
Detect Claude Code — installed, logged in with its own authentication
  ↓
Create company
  ↓
Hire employee — their agent runs on the company's Claude Code
  ↓
Give work
  ↓
Launch a session for the task in its own worktree of the project
  ↓
Store session association
  ↓
Show employee status in office
```

### Authentication principle

Do not ask the user to paste an Anthropic API key merely to use the Claude Code runtime.

Claude Code authentication remains the responsibility of Claude Code.

My Tiny Office should integrate through supported Claude Code mechanisms rather than reading private credential stores or extracting authentication tokens.

### What the CLI actually gives us

Measured against `claude 2.1.283`. Every mapping below is a supported command,
not a guess.

| What the app needs | Claude Code |
| --- | --- |
| availability | `claude --version` and `claude auth status --json` |
| a run | `claude -p --output-format stream-json …`, a child process of the app, prompt on stdin |
| a run that continues | the same, with `--resume <session-id>` |
| its events | the process's `stream-json` lines |
| its end | the process's exit, after its `result` line if it had one |
| stopping it | ending the process; the conversation is kept |
| its workspace gone | `git worktree remove` once the task is approved |

**A task runs as `-p`, not `--bg`.** Only `-p` gives structured events —
each tool call and result, a `permission_denied` event, and a final
`result` with `session_id`, `subtype`, `num_turns`, `permission_denials`,
`usage` and `total_cost_usd` — and only `-p` takes `--max-budget-usd`.
`--bg` is managed by `claude agents`/`logs`/`stop`, whose logs are terminal
output. The cost is that a run is the app's child: closing the app ends it
(the server stops every run as it exits), and the next start finds the task
disconnected; reconnecting resumes it.
The exact flags, and why each is there, are in SECURITY.md.

### How work runs

One supervisor (`createWorkSupervisor` in `src/application/work.ts`) keeps
the running agents in step with every company's tasks. It starts with the
server (`src/instrumentation.ts`), ticks every five seconds and after every
action, and treats the tasks as the truth. Each tick:

1. ends as disconnected any run the database thinks is going with no process
   behind it — what a restart leaves — and blocks its task;
2. stops the run of any task that no longer wants one: held, handed over,
   finished, or its company removed;
3. lets whoever is free pick up work, unless starting work is paused on this
   computer (`settings.json`) or Claude Code is not ready;
4. launches a run for every task being worked on, unblocked, without one:
   the worktree is prepared, the session to continue is found, and the prompt
   says why this run exists — the task, the change the user asked for, a
   command now allowed or not allowed, or simply to carry on.

A run's events are written as they come, one at a time: the session, each
step (one short line; the closing report whole, up to 4000 characters). The
first refused command stops the run. When the process exits, the run ends as
denied, stopped, finished, budgetReached, failed or disconnected, and the task
moves on: to approval when finished, blocked otherwise, untouched when it was
stopped on purpose.

What the agent is told before any task, as its appended system prompt: who it
is, that it works only in this folder and never commits, that it is already in
the folder and uses Read, Glob and Grep to look at files, which commands the
project allows and that each runs on its own as written, and everything it has
been taught, numbered.

Approving commits the worktree to the task's branch and removes the worktree
(`approveTask`); sending back queues the task for the same person, whose next
run resumes the session with the request.

### Changing a task that is already running

The user can correct a task while an agent is working on it. There is no way
to speak into a run in progress,
so the run is ended and resumed with the change:

```text
end the process             # the conversation is kept
claude -p --resume <session-id> …   # stdin: what changed
```

The agent keeps what it knows and what it has already written to the folder.
What is lost is the turn it was in the middle of, which is why the dialog's
button says it is sending the change rather than saving it.

**Handing the task to a different employee is not this.** A session belongs to
one employee's agent, so the work starts again in a new session, with only the
task's worktree carried over. The board says so before it happens.

**The project of a running task cannot change.** The session was launched in
that workspace, and a different project is a different folder. The task is
held first, which ends the run.

### Memory reaches the model through the system prompt

`--append-system-prompt` (and `--append-system-prompt-file`) is the mechanism.
Verified in an empty directory, so the repository's own `CLAUDE.md` could not
account for the answer:

```text
--append-system-prompt "너의 기억: 복합 인덱스는 컬럼 순서가 중요하다. …"
-p "네 기억에 있는 인덱스 규칙을 한 문장으로만 말해줘."
→ "복합 인덱스는 컬럼 순서가 중요하며, (a,b)와 (b,a)는 다른 인덱스다."
```

This is what the employees screen assumes: **everything an employee has been
taught is carried into every task**, whatever its area. Company memory can take
the same route, or a `CLAUDE.md` in the workspace via `--add-dir`.

The prompt numbers each memory. Asking the agent to end by listing the
numbers it drew on, and reporting that list as what was referenced — the
agent's own account, not a trace — is the next step, not yet built.

### Every task works in its own worktree

Two tasks in one project would otherwise write into the same folder. Each task
runs in `git worktree add <folder>/.worktrees/<task> -b mto/<task>`, listed in
the repository's `.git/info/exclude` so the user's history never sees it.
What changed is that worktree's diff, untracked files included. Approving
commits it to `mto/<task>`; nothing is pushed. The session's file tools are
confined to the worktree (SECURITY.md §2).

### A session carries nothing of the user's own setup

`--setting-sources project` keeps the user's hooks, skills, plugins, MCP
servers and auto-memory out of every session, so an employee carries only
what they were taught. `--strict-mcp-config` keeps the account's claude.ai
connectors out too; they join a session after its first turn otherwise, and
multiply its cost. That is why outside tools are out of the MVP; SECURITY.md §8
has the measurement and the way back in.

### What may run is the project's

Commands are denied unless the project allows them (`--permission-mode
dontAsk` with an allow list). A denial arrives as a `permission_denied` event
and blocks the task with the command as its reason; allowing it adds it to the
project and resumes the run. SECURITY.md §3.

### One thing happens outside the app

**Login.** `claude auth login` opens a browser; `--claudeai`, `--console` and
`--sso` skip the interactive choice. The app may spawn this command — that is
invoking the vendor's own flow, not implementing authentication — but it must
never collect a token itself.

Workspace trust does not: `-p` skips Claude Code's trust dialog, so the app
asks for the folder itself, where the project's folder is chosen, and choosing
it is the consent.

### `--bare` is not available to us

It cuts the per-session overhead but states that auth is "strictly
ANTHROPIC_API_KEY or apiKeyHelper — OAuth and keychain are never read". The MVP
authenticates through a Claude subscription, so `--bare` is out.

### Sessions are global; ownership is ours

`claude agents --json` lists every background session on the machine — the test
run saw nine across three unrelated folders. This is exactly why a session is
owned through `Company → Employee → Agent`: the app stores the session ids it
launched and shows only those. `--cwd` is a recovery signal, never identity.

### Cost has a floor

A one-sentence Haiku answer cost **$0.029**, because the request carried ~13k
cache-creation and ~16k cache-read tokens of system prompt and tool definitions
before the 10-token question. Per-task cost is therefore dominated by a fixed
overhead, not by the prompt.

The same four-step edit cost $0.04 with the account's connectors kept out and
$0.59 with them in, because their tool definitions are written to the cache on
every run.

Two consequences: memory length matters less than the number of tasks, and
`--max-budget-usd` belongs on every launch. It is checked after a turn, so a
run can pass it; it is a stop for a runaway task, fixed and not a setting, and
reaching it blocks the task until the user carries on.

### API integration is separate

An eventual Anthropic API runtime is a different integration:

```text
Claude Code Runtime
  └── existing Claude Code authentication

Anthropic API Runtime
  └── API authentication / credentials
```

Do not merge these concepts.

## 10. Session Discovery

The default strategy is explicit registration, not global discovery.

Bad:

```text
scan every local Claude session
  ↓
show all discovered agents
```

Good:

```text
Company
  ↓
Registered Agent
  ↓
Known runtime/session
  ↓
Observe that session
```

If session discovery is required for recovery after restart, discovery must be scoped to:
- the company's registered workspace(s), and/or
- persisted runtime/session identifiers,
- and only sessions that can be safely matched to a registered Agent.

Do not import arbitrary sessions.

## 11. Workspace Model

Each project has one workspace, its folder, and every task in it a worktree of
that folder; a company has as many as it has projects.

```text
Company
├── Project A
│   └── Workspace A
│       └── .worktrees/<task>   one per task
├── Project B
│   └── Workspace B
└── Project C
    └── Workspace C
```

An Agent Session runs in one task's worktree.

Workspace is a useful scoping signal, but workspace alone is not sufficient identity because multiple sessions can exist in the same workspace.

The stable ownership relationship is:

```text
Company → Employee → Agent → Session
```

## 12. Domain Events

The domain owns events such as:

- the company: `CompanyCreated`
- people: `EmployeeHired`, `EmployeeMoved`, `EmployeeWentOnLeave`, `EmployeeReturned`
- projects: `ProjectCreated`, `ProjectStarted`, `ProjectHeld`, `ProjectResumed`,
  `ProjectFinished`, `ProjectReopened`, `ProjectCommandAllowed`
- tasks: `TaskCreated`, `TaskAssigned`, `TaskStarted`, `TaskFinished`, `TaskApplied`,
  `TaskSentBack`, `TaskHeld`, `TaskResumed`, `TaskBlocked`, `TaskUnblocked`, `TaskReturned`
- areas and memory: `AreaAdded`, `AreaRenamed`, `AreaRemoved`, `MemoryTaught`, `MemoryRemoved`
- review: `ReviewSuggested`, `ReviewQueued`, `ReviewStarted`, `ReviewSettled`,
  `ReviewWithdrawn`, `ReviewReleased`

The union is `src/domain/events.ts`. Today the events feed the company's
history (`src/application/history.ts`); the activity feed and the memory-used
report will read the same events.

Runtime events can be translated into domain events:

```text
Claude Code event
  ↓
ClaudeCodeAdapter
  ↓
AgentEvent
  ↓
Application service
  ↓
Domain Event
  ↓
Activity Feed / UI
```

UI components should not manually mutate the activity feed.

## 13. Failure Handling

The app must distinguish:

- employee unavailable
- runtime unavailable
- project without a folder, or its folder missing on this computer
- session disconnected
- command not allowed
- spending cap reached
- AI request failed

Each reaches the user as the thing it is. A run that stops mid-task blocks the
task with the reason — `disconnected` (the process went away, or the request
failed), `commandNotAllowed` with the command, `budgetReached`, or
`workspaceUnavailable` when the task's worktree could not be made — and the
task keeps its assignee, its session and its worktree. Reconnecting, carrying
on or trying again unblocks it, and the next tick resumes the session.

A runtime failure must not corrupt company state.

Example:

```text
Employee: 모카
Employee status: Working
Agent status: Disconnected
```

The UI can show a clear state and allow reconnect/retry.

## 14. Future Runtimes

The architecture should allow:

```text
AgentRuntime
├── ClaudeCodeRuntime       ← MVP
├── CodexRuntime            ← future
├── LocalRuntime             ← future
└── ApiRuntime               ← future
```

Adding a runtime should not require changing Company, Employee, Task, PR, or Office domain models.

## 15. Local Storage

Persistence is local SQLite through Drizzle.

```text
UI
 ↓
Application Services
 ↓
Domain
 ↓
Repositories          ← interfaces owned by the application layer
 ↓
SQLite adapters       ← Drizzle lives here and nowhere else
 ↓
SQLite
```

Runtime adapters remain outside the persistence/domain core.

Store identifiers and configuration references, not secret credentials.

### Database location

Each company is a database of its own, so companies never mix and one moves
by copying its file. They live in the operating system's per-user data
directory, not the project folder, so switching branches or deleting the
checkout never destroys a user's company.

```text
Windows   %LOCALAPPDATA%\my-tiny-office\
macOS     ~/Library/Application Support/my-tiny-office/
Linux     ${XDG_DATA_HOME:-~/.local/share}/my-tiny-office/

  settings.json        the company opened last, and the language chosen here
  companies/<id>.db    one per company
  exports/ imports/    a copy on its way out or in, removed once it has gone
```

The list of companies is the `companies` folder; each file names its own
company. `MY_TINY_OFFICE_DATA_DIR` overrides the directory.

### Moving and deleting a company

Export writes a consistent copy of the open company's database while the app
runs (`VACUUM INTO`) and hands it over as a download. Import always adds a
company; it never replaces or merges. The file is checked as a copy
(SECURITY.md §7), migrated up to this version, and given a company id of this
computer's before it is moved into `companies/`. The file carries the company
and nothing of the machine: Claude Code stays signed in or out on its own, and
a project keeps its folder's path but not the consent to work in it
(`folder_confirmed` is cleared), so nothing starts there until the folder is
chosen again on this computer. A runtime session id from another computer is
kept and reconciled on launch — a missing session becomes a state the user
resolves, never a deletion.

Deleting a company asks for its name typed out and removes its file. Once
there is a runtime it stops the company's running sessions first. The app then
opens another company, or first run when none is left.

### Initialization

Opening the database creates the file and its directory if they are missing,
sets `journal_mode = WAL`, `foreign_keys = ON`, `busy_timeout` and
`trusted_schema = OFF`, then applies
pending migrations. SQLite disables foreign key enforcement per connection by
default, so that pragma is required rather than optional.

Existing data is never dropped or recreated. A second launch applies nothing.

Each company's connection is opened when first needed and cached on
`globalThis`, so development hot reloads do not accumulate connections. A
company's file is only ever opened if it already exists; creating a company is
the one thing that makes one. A company id names its file, so only a UUID is
accepted as one.

### Migrations

Schema changes are generated with `npm run db:generate` and the resulting SQL
is committed under `drizzle/`. It is the only reproducible record of the
schema, so a fresh clone can build the same database. `drizzle-kit push` is not
used. Until the first release every change was folded into one migration,
`0000_initial`, because no company file existed outside development; from the
first release on, migrations only add.

Migrations run with foreign keys off, because one that rebuilds a table other
tables point at would otherwise fail, and SQLite ignores that pragma inside the
migrator's transaction. `PRAGMA foreign_key_check` must come back empty before
they are switched on again. That check can only run once the migrator has
committed, so a file with a company in it is copied first (`VACUUM INTO`) and
put back if the check fails; the file is then left as it was and not opened.
One company file that cannot be opened is counted and skipped, never keeping
the others from opening. A migration that changes
what a row means rewrites the rows it changes, so nothing made before it is
dropped.

### Mapping

Repository adapters translate between rows and domain entities:

- Branded identifiers are plain `TEXT`; they are re-branded when read.
- `NULL` in a column is `undefined` in the domain.
- Timestamps are `INTEGER` epoch milliseconds, matching the domain `Timestamp`
  directly. No `Date` object crosses the boundary.
- `save` is an upsert, because the repository contract does not distinguish
  creating from updating.

Database CHECK constraints mirror the domain unions and the status/timestamp
invariants, so a mapping bug fails at write time instead of producing an
invalid entity later.

### Transaction boundaries

A use case is the transaction boundary. `AppContext` carries a
`withTransaction` runner: a no-op for in-memory repositories, and explicit
`BEGIN`/`COMMIT`/`ROLLBACK` for SQLite. Every use case that writes more than
once runs in it, reads included — making a company with its areas and roles,
hiring, the pick-up, leave, holding or resuming a project, and the removals that
move what they held — so a failed write leaves nothing half-done. A
transaction is never opened inside another: the runner would wait on itself.

The runner issues the statements itself rather than using the driver's
synchronous transaction helper, which would commit without awaiting async work.
A single connection holds one transaction at a time, so concurrent callers are
queued.

## 16. Security

SECURITY.md is the boundary: what an agent may do, the flags that enforce it,
how the local server, processes, output and company files are protected, and
how to re-measure it on a new Claude Code version.

Never:
- commit API keys
- log authentication tokens
- expose private credentials to the browser
- scan unrelated personal workspaces by default
- silently import unrelated agent sessions

Use OS-secure credential storage when the product eventually supports credentials that it must manage itself.

For Claude Code, prefer Claude Code's own supported authentication flow.
