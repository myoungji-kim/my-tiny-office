# My Tiny Office — Architecture

## 1. Architectural Goal

My Tiny Office is a local-first software company simulation with optional real AI workers.

The simulation must be able to run independently of AI providers.

The AI layer is an execution system for selected in-game Employees. It is not the source of truth for the company simulation.

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
display data, including task progress derived from the current time. Mutations
go through server actions that call a use case and revalidate the page; they
carry no domain logic of their own. Nothing under `src/infrastructure` may be
imported from a client component.

Electron and Tauri are not used in the MVP.

Desktop packaging remains a natural long-term fit for local SQLite, local agent runtimes, process management, and workspace access, but it is a separate decision to be revisited when the product actually requires it. Until then, the UI and domain layers must stay usable as a plain web application.

## 3. Simulation Time

The MVP uses a real-time simulation. Progress on Tasks, Training, and other timed
activities is derived from elapsed wall-clock time. There is no game tick loop.

A timed activity stores:

- `startedAt`
- `estimatedDuration`

Progress is computed from those values and the current time.

```text
startedAt         = 10:00
estimatedDuration = 30 minutes
current time      = 10:15

→ progress ≈ 50%
```

Progress is a derived value, not stored mutable state. Persist timestamps and
durations, and compute progress when it is read.

Because elapsed time is measured against the real clock, time continues to pass
while the application is closed. An activity started before shutdown may already
be finished on the next launch, and the simulation must settle such activities on
startup rather than assume it observed every moment of their progress.

## 4. High-Level Architecture

```text
┌────────────────────────────────────────────────────────────┐
│                     My Tiny Office                         │
│                                                            │
│  Office UI                                                 │
│  ├── Office Map                                            │
│  ├── Employees                                             │
│  ├── Work                                                  │
│  ├── PRs                                                   │
│  ├── Training                                              │
│  └── Company                                               │
│                                                            │
│  Simulation / Domain                                       │
│  ├── Company                                               │
│  ├── Employee                                              │
│  ├── Task / Project                                        │
│  ├── PullRequest / Review                                  │
│  ├── Training                                              │
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

An Employee is a game entity.

An Agent is an execution capability attached to an Employee.

```text
Employee
├── identity
├── role
├── department
├── skills
├── personality
├── availability
├── tasks
└── Agent
    ├── runtime
    ├── registration
    └── session
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

Only A/B/C are part of the TinySoft simulation.

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
├── workspace(s)
├── departments
├── teams
├── employees
├── projects
├── tasks
├── pullRequests
├── training
└── events

Employee
├── id
├── companyId
├── name
├── role
├── departmentId
├── skills
├── personality
├── availability
└── agentId?

Agent
├── id
├── companyId
├── employeeId
├── runtimeType
├── registration
└── session?

AgentSession
├── id
├── agentId
├── runtimeSessionId
├── workspace
├── status
├── startedAt
└── lastActivityAt
```

The important relationship is:

```text
Company 1 ─── N Employee
Employee 1 ─── 0..1 Agent
Agent 1 ─── N Session
```

A company can exist without any AI agents.

An employee can exist without an Agent.

### PullRequest

In the MVP a `PullRequest` is a game-world domain entity, not a real GitHub or GitLab pull request.

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

The simulation owns its own pull requests, reviews, and review statuses. Nothing is read from or written to a hosting provider.

A GitHub or GitLab integration may be added later as a separate integration. It must not replace the in-game entity.

## 8. Runtime Adapter

Use a provider-neutral interface.

```ts
interface AgentRuntime {
  launch(input: LaunchInput): Promise<AgentSession>;
  attach(input: AttachInput): Promise<AgentSession>;
  sendTask(sessionId: string, task: AgentTask): Promise<void>;
  getStatus(sessionId: string): Promise<AgentStatus>;
  subscribeToEvents(
    sessionId: string,
    handler: (event: AgentEvent) => void
  ): Unsubscribe;
  detach(sessionId: string): Promise<void>;
  dispose(sessionId: string): Promise<void>;
}
```

The exact API may evolve. Keep the domain layer unaware of Claude-specific details.

## 9. Claude Code Adapter — MVP

Claude Code is the first supported runtime.

The desired user experience is:

```text
First launch
  ↓
Detect Claude Code
  ↓
User chooses "Claude Code"
  ↓
Use existing Claude Code authentication
  ↓
Create company
  ↓
Create/hire employee
  ↓
Assign Claude Code runtime
  ↓
Start work
  ↓
Create/attach the employee's Claude Code session
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

| `AgentRuntime` | Claude Code |
| --- | --- |
| availability | `claude auth status --json` |
| `launch` | `claude --bg <prompt>` → prints a short id |
| `attach` | `claude attach <id>` |
| `getStatus` | `claude agents --json` (also `--cwd <path>`) |
| events / output | `claude logs <id>`, or `--print --output-format stream-json` |
| `detach` | `claude stop <id>` — conversation is kept |
| `dispose` | `claude rm <id>` |
| resume | `claude --resume <session-id>` |

A `--print` run returns JSON carrying `session_id`, `result`, `is_error`,
`subtype`, `num_turns`, `permission_denials` and full `usage` with
`total_cost_usd`. That is the whole `AgentStatus` surface without parsing
terminal output.

### Memory reaches the model through the system prompt

`--append-system-prompt` (and `--append-system-prompt-file`) is the mechanism.
Verified in an empty directory, so the repository's own `CLAUDE.md` could not
account for the answer:

```text
--append-system-prompt "너의 기억: 복합 인덱스는 컬럼 순서가 중요하다. …"
-p "네 기억에 있는 인덱스 규칙을 한 문장으로만 말해줘."
→ "복합 인덱스는 컬럼 순서가 중요하며, (a,b)와 (b,a)는 다른 인덱스다."
```

This is what the employees screen assumes: **the memories in the task's area are
selected and carried into that task**, not dumped wholesale. Company memory can
take the same route, or a `CLAUDE.md` in the workspace via `--add-dir`.

### Two things happen outside the app

Neither can be done for the player, and both need a screen that says so.

1. **Login.** `claude auth login` opens a browser; `--claudeai`, `--console`
   and `--sso` skip the interactive choice. The game may spawn this command —
   that is invoking the vendor's own flow, not implementing authentication —
   but it must never collect a token itself.
2. **Workspace trust.** A background session in an untrusted folder refuses:
   *"Workspace not trusted. Run `claude` in <dir> once and accept the trust
   prompt."* **There is no non-interactive flag for this.** `-p` skips the
   dialog instead of satisfying it, which is why a print run succeeds where
   `--bg` does not.

So connecting an employee needs one interactive `claude` run in their
workspace, whatever we do about login. One honest instruction beats two partial
automations.

### `--bare` is not available to us

It cuts the per-session overhead but states that auth is "strictly
ANTHROPIC_API_KEY or apiKeyHelper — OAuth and keychain are never read". The MVP
authenticates through a Claude subscription, so `--bare` is out.

### Sessions are global; ownership is ours

`claude agents --json` lists every background session on the machine — the test
run saw nine across three unrelated folders. This is exactly why a session is
owned through `Company → Employee → Agent`: the game stores the session ids it
launched and shows only those. `--cwd` is a recovery signal, never identity.

### Cost has a floor

A one-sentence Haiku answer cost **$0.029**, because the request carried ~13k
cache-creation and ~16k cache-read tokens of system prompt and tool definitions
before the 10-token question. Per-task cost is therefore dominated by a fixed
overhead, not by the prompt.

Two consequences: memory length matters less than the number of tasks, and
`--max-budget-usd` belongs on every launch.

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

A Company may have one or more workspaces.

```text
Company
├── Project A
│   └── Workspace A
├── Project B
│   └── Workspace B
└── Project C
    └── Workspace C
```

An Agent Session may be associated with one workspace.

Workspace is a useful scoping signal, but workspace alone is not sufficient identity because multiple sessions can exist in the same workspace.

The stable ownership relationship is:

```text
Company → Employee → Agent → Session
```

## 12. Domain Events

The simulation owns events such as:

- EmployeeHired
- TaskAssigned
- TaskStarted
- TaskCompleted
- TrainingStarted
- TrainingCompleted
- PRCreated
- ReviewStarted
- ReviewApproved
- ChangesRequested
- EmployeeWentOnVacation
- OfficeExpanded

Runtime events can be translated into domain events:

```text
Claude Code event
  ↓
ClaudeCodeAdapter
  ↓
AgentEvent
  ↓
Simulation/Application service
  ↓
Domain Event
  ↓
Activity Feed / UI
```

UI components should not manually mutate the activity feed.

## 13. Failure Handling

The game must distinguish:

- employee unavailable
- agent not configured
- runtime unavailable
- session disconnected
- task blocked
- AI request failed

A runtime failure must not corrupt company state.

Example:

```text
Employee: Min-su
Game status: Working
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

Each user has their own database. The default location is the operating
system's per-user data directory, not the project folder, so switching
branches or deleting the checkout never destroys a player's company.

```text
Windows   %LOCALAPPDATA%\my-tiny-office\my-tiny-office.db
macOS     ~/Library/Application Support/my-tiny-office/my-tiny-office.db
Linux     ${XDG_DATA_HOME:-~/.local/share}/my-tiny-office/my-tiny-office.db
```

`MY_TINY_OFFICE_DB_PATH` overrides the location.

### Initialization

Opening the database creates the file and its directory if they are missing,
sets `journal_mode = WAL`, `foreign_keys = ON`, and `busy_timeout`, then applies
pending migrations. SQLite disables foreign key enforcement per connection by
default, so that pragma is required rather than optional.

Existing data is never dropped or recreated. A second launch applies nothing.

The connection is a lazy singleton cached on `globalThis` so that development
hot reloads do not accumulate connections.

### Migrations

Schema changes are generated with `npm run db:generate` and the resulting SQL
is committed under `drizzle/`. It is the only reproducible record of the
schema, so a fresh clone can build the same database. `drizzle-kit push` is not
used.

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
`BEGIN`/`COMMIT`/`ROLLBACK` for SQLite. `settleDueTasks` wraps its settlement
and writes in it, so a failed write leaves no task completed.

The runner issues the statements itself rather than using the driver's
synchronous transaction helper, which would commit without awaiting async work.
A single connection holds one transaction at a time, so concurrent callers are
queued.

## 16. Security

Never:
- commit API keys
- log authentication tokens
- expose private credentials to the browser
- scan unrelated personal workspaces by default
- silently import unrelated agent sessions

Use OS-secure credential storage when the product eventually supports credentials that it must manage itself.

For Claude Code, prefer Claude Code's own supported authentication flow.
