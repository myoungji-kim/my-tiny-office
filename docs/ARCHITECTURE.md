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

Start with SQLite.

Suggested layers:

```text
UI
 ↓
Application Services
 ↓
Domain
 ↓
Repositories
 ↓
SQLite
```

Runtime adapters remain outside the persistence/domain core.

Store identifiers and configuration references, not secret credentials.

## 16. Security

Never:
- commit API keys
- log authentication tokens
- expose private credentials to the browser
- scan unrelated personal workspaces by default
- silently import unrelated agent sessions

Use OS-secure credential storage when the product eventually supports credentials that it must manage itself.

For Claude Code, prefer Claude Code's own supported authentication flow.
