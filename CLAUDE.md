# My Tiny Office — Claude Code Instructions

## Project

My Tiny Office is a local-first work tool whose interface is a cozy office. Its employees are AI workers the user gives work to, teaches, and watches improve.

The office comes first: it is how the user sees who is doing what. The product should not become an AI monitoring dashboard; the office carries the information.

The core fantasy is:

> "I have my own tiny software office, and I can watch my people actually work."

Read the relevant project documentation before making significant implementation decisions.

Important documents:

- `README.md` — project overview
- `docs/PRODUCT.md` — product requirements
- `docs/DESIGN.md` — visual and UX direction
- `docs/RULES.md` — how work, review, memory, teams and hiring behave
- `docs/ARCHITECTURE.md` — technical architecture
- `docs/SECURITY.md` — what an agent may do on the user's computer, and how that is enforced
- `CONTRIBUTING.md` — contribution and development rules

Follow those documents unless the user explicitly changes a requirement.

---

## Core Principles

### 1. The Office Is the Interface

Build a work tool that reads as an office, not an AI monitoring dashboard.

The office, employees, work, progression, teaching, collaboration, and company growth are the primary product experience.

Every element on screen stands for real work. Nothing is simulated for show: without an agent, nobody makes decisions, so nothing works without one.

### 2. Employee != Agent

An Employee is a domain entity — the one the user teaches and develops.

An Agent is an execution capability attached to an Employee.

Keep this distinction throughout the architecture:

```text
Company
  ↓
Employee
  ↓
Agent
  ↓
Agent Runtime
  ↓
Claude Code
  ↓
Session
```

Do not collapse Employee and Agent into a single concept.

### 3. Company-Scoped Agents

Only agents explicitly assigned to the active company may appear in the company.

Do not automatically import any Claude Code session or agent running on the user's machine.

The plaza (docs/DESIGN.md) lists the machine's Claude Code sessions as candidates, outside the company. Listing one imports nothing, and a candidate never acts. Hiring one creates a new Employee with only the memories the user kept from it. The session is never attached as the Employee's agent.

Do not make global session discovery the product's source of truth.

Ownership should remain explicit:

```text
Company → Employee → Agent → Session
```

A workspace may be used as a scoping or recovery signal, but it is not sufficient as the identity of an employee's agent.

### 4. Claude Code Is the MVP Runtime

The MVP uses Claude Code as the primary agent runtime.

Claude Code authentication is managed by Claude Code itself. It must be installed and logged in from the first run.

Do not ask the user to provide an Anthropic API key for the Claude Code runtime.

Do not implement credential extraction, token scraping, or unsupported authentication mechanisms.

Keep Claude Code-specific implementation details behind the runtime abstraction.

Future runtimes may be added later, but do not build them prematurely.

### 5. Runtime Abstraction

Runtime-specific details must not leak into the domain model or UI.

Prefer a small runtime interface such as:

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

The exact interface may evolve as implementation details become clearer.

Do not create abstractions merely for hypothetical future runtimes.

### 6. Local-First

Prefer local storage and local execution for the MVP.

SQLite is the default persistence layer.

Avoid introducing unnecessary backend infrastructure, hosted services, or remote databases unless the product requirements clearly require them.

### 7. Localization

The product must support Korean and English from the beginning.

All user-facing text must go through the i18n system.

Do not hard-code user-facing strings directly into components.

Do not bake text into SVGs or other visual assets.

Do not assume English and Korean have the same text length.

Technical terms such as PR, API, TypeScript, PostgreSQL, and Architecture may remain in English where appropriate.

---

## Code Quality and Comments

Keep the codebase clean, simple, and structurally organized.

### Comments

Comments should be concise and intentional.

- Do not add comments that merely restate what the code does.
- Do not write long comments explaining the entire reasoning process behind an implementation.
- Do not leave detailed implementation history or personal decision-making in code comments.
- Do not use comments as a substitute for clear naming or clean structure.
- Prefer self-explanatory names and small, well-structured functions over explanatory comments.
- Add a comment only when it explains something genuinely non-obvious from the code itself.
- When a comment is necessary, explain the important constraint or invariant rather than narrating the implementation.
- Keep comments short and focused.

Bad:

```ts
// We first check whether the employee is available because
// originally we had a bug where employees could receive tasks
// while they were on leave, which caused several state
// synchronization issues...
if (employee.availability === "available") {
  assignTask(employee, task);
}
```

Good:

```ts
// Tasks cannot be assigned while an employee is unavailable.
if (employee.availability === "available") {
  assignTask(employee, task);
}
```

If reasoning is important enough to preserve as architectural knowledge, document it in the appropriate architecture or design document instead of embedding a long explanation in source code.

### Development Reasoning

Do not leave conversational reasoning, temporary thought processes, or implementation deliberations in source code.

The repository should contain the final design, not the history of how the design was discussed.

Avoid comments such as:

- "I chose this because..."
- "We discussed..."
- "The user wanted..."
- "This used to work differently..."
- "For now we..."
- "In the future we might..."

unless the information describes a real, persistent technical constraint that future maintainers genuinely need to understand.

Keep reasoning in the development conversation or appropriate documentation, not in production source code.

### Structure

Prefer simple, explicit, and predictable structure.

- Keep responsibilities separated.
- Avoid unnecessary abstractions.
- Avoid premature generalization.
- Avoid deeply nested logic.
- Prefer small, composable modules.
- Keep domain logic independent from UI and runtime-specific code.
- Do not introduce a new layer, pattern, or abstraction unless it solves a concrete problem.
- Remove dead code and unused abstractions instead of keeping them "for later".
- When a file or module becomes difficult to understand, improve its structure rather than adding explanatory comments.

Do not optimize for theoretical extensibility at the cost of present-day clarity.

---

## Language

The developer may communicate with Claude Code primarily in Korean.

Understand and respond to development requests in Korean when appropriate.

Repository conventions should remain:

- Source code identifiers: English
- Variable, function, type, and file naming: English
- Code comments: English
- Technical documentation: English
- Git commit messages: English
- User-facing text: Korean and English through i18n

Do not translate source-code identifiers into Korean.

---

## Architecture Boundaries

Keep these concerns separated:

```text
Domain
  ├── Company
  ├── Employee
  ├── Team
  ├── Project
  ├── Task
  ├── PullRequest
  ├── Review
  ├── Memory
  ├── Event
  └── Agent

Infrastructure
  ├── SQLite
  ├── Drizzle
  └── Claude Code Runtime

Application
  ├── Commands / Use Cases
  └── Domain Event Handling

UI
  ├── Office
  ├── Projects
  ├── Employees
  ├── Company
  └── Settings
```

Do not allow UI components to become the source of truth for domain state.

Prefer domain events for activity-feed and cross-system reactions.

Examples:

- `EmployeeHired`
- `TaskAssigned`
- `TaskStarted`
- `TaskFinished`
- `TaskApplied`
- `TaskSentBack`
- `MemoryTaught`
- `ReviewStarted`
- `ReviewSettled`
- `EmployeeWentOnLeave`

The full list is the `DomainEvent` union in `src/domain/events.ts`.

Do not create a full event-sourcing architecture unless explicitly required.

---

## Implementation Discipline

Before making a significant change:

1. Read the relevant documentation.
2. Inspect the existing implementation.
3. Identify the smallest coherent change.
4. Implement it without unrelated refactoring.
5. Run the relevant checks.
6. Report what changed and any important follow-up.

Do not rewrite large parts of the project merely because you prefer a different architecture.

Do not add unrelated features while implementing a task.

Prefer incremental, reviewable changes.

When requirements are ambiguous and the ambiguity materially affects architecture or data, ask before making a large irreversible decision.

For small, obvious implementation details, use reasonable judgment instead of blocking progress.

---

## Dependencies

Prefer the smallest reasonable dependency set.

Before adding a dependency, consider whether the functionality can be implemented clearly with the existing stack.

Do not add libraries solely because they are popular.

Avoid dependency-heavy abstractions for simple problems.

---

## Error Handling

Failures in external runtimes must not corrupt company or employee state.

Possible runtime states include:

- unavailable
- not configured
- starting
- working
- reviewing
- disconnected
- blocked
- failed
- stopped

Handle runtime failures explicitly.

Do not silently delete or reset company data when an agent session fails.

---

## Security

Never commit secrets, tokens, credentials, or private authentication data.

Do not read or extract private Claude Code credentials.

Do not add API-key configuration to the Claude Code runtime unless the product requirements explicitly introduce a separate API-based runtime.

Use environment variables only for integrations that actually require them.

Keep `.env` files out of version control.

---

## UI and Visual Direction

The office is the primary visual identity of the product.

Target:

- cozy Scandinavian office
- simple pixel-art-inspired illustration
- developer-dashboard information density
- warm and approachable visual language
- subtle developer humor

Avoid:

- neon cyberpunk aesthetics
- unnecessary 3D/CCTV presentation
- decorative complexity that reduces readability

The user should be able to glance at the office and understand:

- who is working
- who is idle
- who is reviewing
- what is blocked
- what is happening today
- how the company is growing

Information density should come from meaningful UI elements such as status, activity, progress, and cards rather than decorative elements.

---

## Git

Use conventional commit prefixes:

- `feat`
- `fix`
- `refactor`
- `docs`
- `test`
- `chore`
- `perf`
- `build`
- `ci`

Examples:

```text
feat(company): add company creation flow
feat(employee): add employee management
feat(agent): add Claude Code runtime
fix(agent): prevent unrelated sessions from being imported
docs(architecture): document company agent ownership
```

Do not include secrets or sensitive local information in commits.

Keep commits focused and logically scoped.

---

## Before You Code

When starting a new task, first determine:

1. What existing code and documentation are relevant?
2. What is the smallest correct change?
3. Which domain boundaries are affected?
4. Does the change affect persistence?
5. Does it affect localization?
6. Does it affect the Employee/Agent boundary?
7. Does it affect company-scoped agent ownership?
8. Does it introduce unnecessary abstraction or complexity?

For larger tasks, briefly explain the implementation plan before making broad changes.

For small, straightforward tasks, proceed directly.

Always preserve the project's core principles while implementing the requested change.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
