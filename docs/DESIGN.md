# My Tiny Office — Design

## Visual Direction

Cozy Scandinavian office + simple pixel-art-inspired illustration + developer dashboard information density + subtle developer humor.

Avoid:
- neon cyberpunk
- overly decorative dashboards
- CCTV-style camera presentation
- 3D realism

## Main Screen

```text
┌────────────────────────────────────────────────────────────┐
│ MY TINY OFFICE                         ● SYSTEM OK          │
├──────────┬───────────────────────────────┬─────────────────┤
│ NAV      │          OFFICE MAP           │ LIVE            │
│ Office   │ rooms + characters            │ selected        │
│ People   │ team/status                   │ employee/PR     │
│ Work     │                               │ status/activity │
│ PRs      │                               │                 │
│ Training │                               │                 │
│ Company  │                               │                 │
├──────────┴───────────────────────────────┴─────────────────┤
│ ACTIVE WORK / PROJECTS / RECENT ACTIVITY                    │
└────────────────────────────────────────────────────────────┘
```

## Agent Status

Employee characters should communicate:
- available
- working
- reviewing
- blocked
- idle
- training
- vacation
- disconnected

Use small status bubbles and readable status labels.

## Agent Connection UI

The player should see the runtime as an employee configuration:

```text
Employee
Min-su — Backend Engineer

Agent Runtime
[ Claude Code ]

Connection
● Ready

Workspace
~/Projects/tinysoft

Session
Connected

[ Start Work ]
```

Do not expose technical credential details unless necessary.

## First-Run AI Choice

The first-run screen should avoid an API-key-first experience.

Example:

```text
How should your employees work?

[ Simulation Only ]
[ Claude Code ]
[ Local AI ]
```

Claude Code should feel like connecting an existing tool, not purchasing or configuring an API service.

## Information Density

Prioritize:
- employee progress
- current task
- review status
- blockers
- recent activity
- team workload

Decorative art should support comprehension rather than consume the main information area.

## Localization

Never bake text into SVGs.

Avoid fixed widths and hard-coded line breaks.

Korean and English must be able to expand/contract naturally.
