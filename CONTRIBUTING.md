# Contributing to My Tiny Office

## Development Principles

- Keep changes small and focused.
- Prefer incremental changes over large rewrites.
- Don't mix refactoring with feature work unless necessary.
- Keep domain logic independent from UI.
- Keep AI/Agent runtime integrations behind abstraction.
- Preserve company-scoped agent ownership.
- Add Korean/English strings for all user-facing text.
- Reuse existing components.

## Branch Naming

```text
feature/<short-description>
fix/<short-description>
refactor/<short-description>
chore/<short-description>
docs/<short-description>
```

Examples:

```text
feature/company-creation
feature/employee-management
feature/claude-code-runtime
fix/pr-review-status
refactor/agent-runtime
docs/architecture
```

## Commit Messages

Use Conventional Commits:

```text
<type>(<scope>): <description>
```

Examples:

```text
feat(office): add office map
feat(employee): add employee hiring
feat(agent): add Claude Code runtime
feat(agent): scope sessions to company
fix(employee): prevent assigning work to someone on leave
refactor(agent): separate runtime adapter
docs(architecture): document company agent ownership
```

Allowed types:

```text
feat
fix
refactor
docs
test
chore
perf
build
ci
```

Keep the subject concise, imperative, and preferably under 72 characters.

## Pull Requests

Explain:
- what changed
- why
- screenshots for meaningful UI changes
- tests
- known limitations

Do not combine unrelated features.

## Before Opening a PR

Contributions come as pull requests, and every one of these has to pass first:

- typecheck
- lint
- tests
- build
- `npm run check:ui` when anything under `docs/ui/` changed
- verify no secrets were committed
- verify no unrelated Claude/agent sessions are imported
- verify Korean/English strings for user-facing changes

## Working as the Maintainer

The maintainer commits to `main` directly and runs the same checks before
pushing, because a pull request with no second reader buys nothing but delay.

A branch is still worth it when the change is one of these:

- a database migration, or anything else awkward to undo
- an experiment that might be abandoned
- something worth reading as one diff later

The checks are not optional either way. A commit message carries what a pull
request description would have said: what changed, why, and what was measured.

## AI-Assisted Development

AI-generated code is allowed.

The contributor is responsible for:
- correctness
- security
- tests
- architecture
- reviewing generated code

Do not blindly accept large AI-generated rewrites.

## Agent Runtime Changes

When changing a runtime integration:
- keep runtime-specific code in the adapter
- do not leak Claude-specific types into domain models
- preserve explicit Company → Employee → Agent → Session ownership
- do not add global session scanning unless explicitly designed and reviewed
