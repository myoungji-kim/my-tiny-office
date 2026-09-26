# My Tiny Office — Design

## The standard lives in `docs/ui/`

Three pages define the current UI. Open [`docs/ui/index.html`](ui/index.html)
before building or changing a screen.

| Page | Authoritative for |
| --- | --- |
| `ui/office.html` | Layout, colour tokens, tile engine, status display, action popover |
| `ui/employees.html` | List and detail, org chart, skill bars, specialties, training |
| `ui/components.html` | Buttons, menu rows, notices, empty states, confirm dialogs |
| `ui/characters.html` | The twenty animal sprites, silhouette families, naming |

This document holds the direction and the screen structure. Written rules —
token values, typography, i18n, accessibility — are in
[`STYLE-GUIDE.md`](STYLE-GUIDE.md). Patterns that exist in neither are not
patterns yet: add them to `ui/` first.

Superseded directions sit in [`archive/`](archive/README.md) for comparison
only.

## Visual Direction

Cozy Scandinavian office + simple pixel-art illustration + developer dashboard
information density + subtle developer humor.

The governing split:

> **The chrome is monochrome. Colour belongs to the office and to the data.**

Greys, one near-black, hairline borders. The only saturated colour in the
interface is a progress bar, a status dot, or the office itself. A primary
button is near-black, not brand-coloured — a button is chrome.

Avoid:

- neon cyberpunk
- overly decorative dashboards
- CCTV-style camera presentation
- 3D realism
- texture or warmth applied to the chrome instead of to the office

## Main Screen

```text
┌─────────────┬──────────────────────────────────────────────┐
│ MY TINY     │ 사무실                      [ + 직원 고용 ]   │
│ OFFICE      │ 백엔드팀 · 책상 6석 중 5석 사용                │
│             ├──────────────────────────────────────────────┤
│ 홈          │ 전체 · 백엔드팀 · 프론트엔드팀 · 휴게실 · +    │
│ 사무실      ├──────────────────────────────────────────────┤
│ 프로젝트    │ ┌──────────────────────────────────────────┐ │
│ PR·코드리뷰 │ │        office tilemap (canvas)           │ │
│ 직원        │ │   desks · characters · status bubbles    │ │
│             │ └──────────────────────────────────────────┘ │
│ ─────────   │                                              │
│ workspace   │ 백엔드팀 3                                    │
│ · 모카      │ ┌────────┐ ┌────────┐ ┌────────┐ ┌ ─ ─ ─ ┐  │
│ · 두부      │ │ card   │ │ card   │ │ card   │   + 채용    │
│ · 단풍      │ └────────┘ └────────┘ └────────┘ └ ─ ─ ─ ┘  │
│ ─────────   │                                              │
│ 설정        │ 프론트엔드팀 2                                │
└─────────────┴──────────────────────────────────────────────┘
```

The app is one floating white panel on a grey page. The sidebar is fixed width
and carries navigation plus the active company's roster. The main column is
header → room tabs → office → team cards.

There is no permanent inspector panel. Selecting a desk, a roster row or an
employee card opens an **action popover anchored to what was clicked**, and
selection stays in sync across all three. The popover covers the neighbouring
card while open; that is accepted.

## The Office

A pixel tile engine, not an SVG scene and not a sprite library.

- Tiles and characters are 16×16 strings over a shared palette
- Drawn to `<canvas>` at **integer scale only**, `imageSmoothingEnabled = false`
- The room renders at 3× (48px tiles)
- One outline colour for furniture and characters alike, so it reads as one scene
- **No text inside the canvas.** Names and status labels are DOM elements
  positioned over it, and the canvas stays `aria-hidden` with `<button>`s in the
  overlay carrying accessibility

## Employees

Employees are animals, not people. At 16×16 a silhouette carries identity
further than a face does, and the cast is the game's character.

- **Nickname** — the player names each employee. Player input never goes
  through i18n.
- **Species** — picks a sprite. Cosmetic only; it never affects stats.
- **Role** — a domain value. Technical titles stay in English.

The species is shown by the sprite, never spelled out next to the name.

See `ui/characters.html` for the twenty species and the silhouette-family rule.

### Skills, specialty and training

`GAMEPLAY.md` gives an employee *skills*, a *specialty*, and training that
"consumes time and improves skills". It also lists the reviewer seats a PR can
ask for. `ui/employees.html` draws them as one loop:

```text
업무 → 학습(시간 소모) → 스킬 상승 → 임계치 돌파 → 전문성 → PR 리뷰 자격
```

The seven skills are the seven reviewer seats. A skill above the threshold
becomes a specialty, and a specialty is what makes an employee eligible to
review that kind of work. The employees screen shows the threshold as a tick on
every skill bar, so the player can see how far a teammate is from a review seat.

A seat no employee can fill is worth saying out loud — the training tab leads
with it.

## Status

The office must be readable at a glance. Status mirrors the domain rather than
inventing its own vocabulary:

| Status | Meaning | Shown as |
| --- | --- | --- |
| `working` | A task is in progress | Amber dot with ring, live progress |
| `ready` | A task is assigned, not started | Hollow blue dot |
| `available` | No task assigned | Solid green dot |
| `training` | Employee is learning | Indigo square, progress to completion |
| `vacation` | Employee is away | Grey dash |

Colour never carries status alone — **the dot shape differs too**.

`training` is the one status that borrows `--brand`, because indigo is already
the colour of a skill bar — a learning employee and a rising skill are the same
event.

Further runtime states the agent layer can report (`blocked`, `disconnected`,
`failed`, `reviewing`) get the same treatment when their systems exist: a
distinct dot shape, a label, and no reliance on hue.

## Actions

The actions offered for an employee follow the domain's own transitions. The UI
presents them; it does not re-implement them.

| State | Actions |
| --- | --- |
| `working` | 완료 처리 · 업무 상세 · 담당 변경 |
| `ready` | 업무 시작 · 다른 업무로 교체 · 할당 취소 |
| `available` | 업무 할당 · 교육 보내기 · 휴가 보내기 |
| `vacation` | 업무 할당 *(disabled, with the reason)* · 복귀 처리 |

An action the domain forbids is shown **disabled with a one-line reason**, not
hidden. The rule is the thing worth teaching.

## Information Density

Prioritize:

- employee progress
- current task
- review status
- blockers
- recent activity
- team workload

Density comes from status, progress and cards — not from decoration. Decorative
art supports comprehension rather than consuming the information area.

## Agent Connection UI

The player should see the runtime as an employee configuration:

```text
모카 — Backend Engineer

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

```text
How should your employees work?

[ Simulation Only ]
[ Claude Code ]
[ Local AI ]
```

Claude Code should feel like connecting an existing tool, not purchasing or
configuring an API service.

## Localization

Never bake text into canvas, SVG or any other visual asset.

Avoid fixed widths and hard-coded line breaks. Korean and English must be able
to expand and contract naturally — the popover was widened once because an
English role outgrew it.

Player-supplied text — nicknames, company names — never goes through i18n.
