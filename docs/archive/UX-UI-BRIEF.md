# My Tiny Office — UX/UI Design Direction & Design Phase Brief

> **Purpose:** Hand this document to Claude Code before any further feature implementation.  
> **Status:** Design phase first. Do not continue gameplay/system implementation until the design direction is established.

---

## 0. Immediate instruction

The project already has a working playable vertical slice.

Current completed flow:

```text
first run
→ create company
→ enter company
→ hire employee
→ create task
→ assign task
→ start task
→ complete task
→ SQLite persistence
→ elapsed-time settlement on reload
```

The implementation is working.

**Stop adding gameplay features for now.**

Do not implement:

- Vacation
- PR
- Review
- Training
- Agent UI
- Claude Code runtime UI
- Office expansion
- additional gameplay systems

until the UX/UI direction has been reviewed and documented.

The current UI is functional but visually too close to a generic SaaS/admin dashboard.

The next task is **design correction, not feature expansion**.

---

# 1. Product vision

My Tiny Office is a small software-company management simulation.

The central fantasy is:

> **"I have my own tiny software office, and I can watch my people actually work."**

The player is the owner/CEO.

The core loop is:

```text
Create company
    ↓
Hire people
    ↓
Give them work
    ↓
Watch them work
    ↓
Observe collaboration
    ↓
Complete work
    ↓
Train people
    ↓
Grow the company
```

The important word is:

**watch**

The player should feel that there is a little living software office behind the data.

The UI must therefore communicate a **world**, not merely a database.

---

# 2. The most important design correction

The current playable UI has the following general structure:

```text
sidebar
+
large white cards
+
section headings
+
empty-state text
+
buttons
```

That is useful for validating functionality, but it is **not the final product direction**.

Do not simply polish the current cards.

Do not add more rounded cards.

Do not add more dashboard widgets.

Do not solve the problem by adding colors to the existing SaaS layout.

Instead, reconsider the visual composition around the office itself.

The final experience should be closer to:

```text
cozy miniature software office
+
live simulation
+
developer-oriented information density
```

and less like:

```text
project management SaaS
+
admin dashboard
```

---

# 3. Design keywords

The visual direction should consistently feel:

```text
cozy
tiny
warm
quiet
friendly
playful
developer-oriented
organized
human
slightly humorous
```

The emotional target is:

> **"A little software office that I enjoy checking on."**

Not:

> "A professional enterprise management console."

Not:

> "A futuristic AI command center."

---

# 4. Visual direction

## 4.1 Core visual language

Use:

**Cozy Scandinavian office + simple pixel-art-inspired illustration + modern developer dashboard information density**

This is a combination of two layers:

### World layer

- miniature office
- small employees
- desks
- monitors
- chairs
- plants
- coffee
- whiteboards
- shelves
- office objects
- subtle environmental humor

### Interface layer

- clean typography
- compact information blocks
- clear status indicators
- progress
- activity
- task information
- contextual panels

The interface should support the world rather than replacing it.

---

# 5. Pixel-art influence

"Pixel-art-inspired" does **not** mean:

- literal 8-bit UI
- everything made from tiny squares
- retro game menus
- pixel fonts everywhere

Use pixel influence mainly for:

- employee silhouettes
- office objects
- tiny icons
- compact status indicators
- environmental details
- small decorative labels

The UI itself should remain modern and readable.

Use pixel fonts selectively, if at all:

- logo
- tiny labels
- occasional decorative text

Do not use a pixel font for long paragraphs, forms, or dense data.

---

# 6. Color direction

Use a warm, muted palette.

Primary visual families:

```text
warm cream
soft lavender
muted blue
soft green
warm gray
muted brown
small yellow/orange accents
```

Avoid:

```text
neon purple
neon blue
cyberpunk gradients
pure black UI
high-saturation rainbow UI
large gradient backgrounds
```

The UI should feel like:

```text
paper
wood
paint
soft daylight
small computer screens
```

rather than:

```text
glowing software terminal
```

Color must communicate hierarchy and state, not decorate every component.

---

# 7. The office is the primary screen

The Office should become the visual identity of the product.

Conceptually:

```text
┌─────────────────────────────────────────────────────────────┐
│ MY TINY OFFICE                         ● SYSTEM OK           │
│ Everyone's working. Probably.                               │
├────────────┬───────────────────────────────┬────────────────┤
│ navigation │                               │                │
│            │         OFFICE SCENE          │   DETAILS      │
│ Office     │                               │                │
│ People     │   desks / employees / rooms   │   employee     │
│ Work       │   monitors / plants / coffee  │   or task      │
│ PRs        │                               │                │
│ Training   │                               │                │
│ Company    │                               │                │
├────────────┴───────────────────────────────┴────────────────┤
│ ACTIVE WORK / RECENT ACTIVITY                               │
└─────────────────────────────────────────────────────────────┘
```

This is a conceptual composition, **not a fixed pixel specification**.

The important rule is:

> **The office scene should be the largest and most visually important region.**

---

# 8. Office scene principles

The office should feel like a small miniature diorama.

Think:

```text
tiny cozy office
```

not:

```text
CCTV camera
```

and not:

```text
3D architectural visualization
```

The first office can be very simple.

One convincing room is better than many empty rooms.

Possible first room:

```text
ENGINEERING
```

It can contain:

- desks
- chairs
- computers
- employees
- plants
- coffee machine
- whiteboard
- shelves
- window
- lamp
- small developer-office objects

Do not introduce:

- 3D engines
- WebGL
- physics
- canvas game engines
- complicated animation frameworks
- hundreds of manually drawn assets

Prefer:

- SVG
- CSS
- React components
- data-driven positioning
- simple illustration primitives

---

# 9. Employees are characters, not rows

Employees are the most important interactive objects in the office.

An employee should visually communicate:

```text
person
+
desk
+
computer
+
activity
+
status
```

Characters can be small.

They do not need detailed portraits.

They do need:

- recognizable silhouettes
- individual identity
- clickable area
- current activity
- status
- location in the office

The player should be able to look at the office and understand:

> "Those are my people."

---

# 10. Employee states

Do not add domain states solely for presentation.

Current domain model:

```text
available
onVacation
```

Working is derived from the existence of a working task.

Therefore the UI may present:

```text
Available
Working
On Vacation
```

without introducing a new domain status.

Future states such as:

```text
Reviewing
Blocked
Meeting
Training
```

must only be added when gameplay/domain support exists.

---

# 11. Status presentation

Never rely on color alone.

Combine:

- status dot
- small icon
- speech/status bubble
- character posture
- monitor state
- activity indicator

Initial visual direction:

```text
Available
→ soft green

Working
→ warm yellow/orange

On Vacation
→ muted neutral
```

Exact colors should be defined as tokens in the final style guide.

---

# 12. Employee interaction

Clicking an employee should select them **without leaving the office**.

Use a contextual side panel/drawer.

Example:

```text
MIN-SU
Backend Developer

● Working

Current task
Payment API

Progress
██████████░░ 72%

Estimated completion
~ 8 min
```

The selected employee should remain visible in the office.

The panel should feel like an inspection/control panel attached to the world.

Avoid sending the player to a completely separate "employee details page" for basic inspection.

---

# 13. Task interaction

Tasks should also be inspectable from the office.

A selected task may show:

```text
PAYMENT API

Status
Working

Assigned to
Min-su

Progress
72%

Estimated completion
~ 8 min
```

The task list remains useful, but it should not be the primary expression of the game.

---

# 14. Work must be visible in the world

The player should not need to open "Work" to understand that work is happening.

Examples:

```text
employee sitting at computer
monitor active
small status bubble
progress indicator
activity text
```

Then a compact Active Work section can provide precise information.

Example:

```text
ACTIVE WORK

● Min-su     Payment API       Working      72%
● Ji-eun     Login form        Working      48%
○ Noe        Documentation     Ready          —
```

The exact layout can change.

The principle does not:

> **The office shows what is happening. The information UI explains it precisely.**

---

# 15. Header

Keep the header compact.

Possible direction:

```text
MY TINY OFFICE
Everyone's working. Probably.

My Tiny Office                         ● System OK
```

If showing counts, make them understandable:

```text
3 employees
8 active tasks
```

Do not display unexplained numbers.

A bare:

```text
123
```

should never appear in the final UI without context.

---

# 16. Navigation

Navigation is secondary to the office.

Possible structure:

```text
Office
People
Work
PRs
Training
Company
```

The exact sections can evolve.

The important rule:

> Navigation must never visually overpower the office.

Avoid:

- huge dark selected buttons
- oversized sidebar
- dashboard-like navigation tiles
- excessive navigation decoration

The selected navigation item should be clear but restrained.

---

# 17. Empty state

An empty company should still look like an office.

Do **not** turn the whole page into:

```text
┌───────────────────────────────┐
│                               │
│ 아직 아무도 없습니다.         │
│                               │
│ [첫 직원 채용하기]            │
│                               │
└───────────────────────────────┘
```

Instead:

```text
empty desks
empty chairs
whiteboard
coffee machine
office objects
```

with a compact contextual message:

```text
No one works here yet.

[ Hire your first employee ]
```

Core principle:

> **empty state = empty office**

not:

> **empty state = empty dashboard**

---

# 18. Information density

The product should contain useful information.

It should not become a minimalist landing page.

The target is:

```text
visual world
+
dense useful status information
```

Information can appear through:

- small status labels
- compact task rows
- progress
- activity feed
- employee panels
- counters
- badges
- contextual controls

But information should be spatially organized.

Avoid filling the screen with independent cards.

---

# 19. Cards

Cards are allowed, but they should not define the entire product.

Use cards for:

- contextual details
- compact information groups
- activity entries
- task summaries
- secondary information

Do not use:

```text
card
card
card
card
card
```

as the primary visual structure.

The office scene should break up the dashboard/card language.

---

# 20. Typography

Typography should feel:

- calm
- readable
- slightly distinctive
- technical without looking corporate

Use one primary UI font family.

A pixel/display font can be used selectively.

Do not use decorative fonts for body text.

Hierarchy should be obvious:

```text
page title
section title
entity name
metadata
status
body
caption
```

Avoid excessive letter spacing.

The current prototype's wide letter spacing should be reviewed carefully; it should not make normal Korean UI feel artificial.

Korean text must remain comfortable to read.

---

# 21. Korean + English

Localization is already implemented.

Do not break it.

All user-facing strings must continue to come through the existing i18n layer.

Support:

```text
ko
en
```

Avoid:

- text baked into SVG
- fixed-width labels
- hardcoded line breaks
- English-only assumptions
- UI that collapses when Korean text is longer/shorter

When designing components, test both Korean and English.

Technical terms may remain English where natural:

```text
PR
API
TypeScript
PostgreSQL
Backend
Architecture
```

---

# 22. Responsive behavior

Desktop is the primary target.

The office needs enough space to feel like a real scene.

However:

- do not assume a single screen size
- avoid fixed widths that break on smaller desktop windows
- allow details panels to collapse
- preserve the office as the primary content
- do not blindly stack every section into a long mobile dashboard

Mobile support can be secondary.

Do not overbuild responsive behavior before the desktop composition is correct.

---

# 23. Motion

Motion should be subtle.

Useful motion:

- employee sitting/working indication
- tiny monitor activity
- status transition
- panel opening
- progress change
- coffee/ambient animation
- task completion feedback

Avoid:

- constant bouncing
- excessive particle effects
- flashy transitions
- game-like reward explosions
- animation everywhere

The office should feel alive, not noisy.

---

# 24. Developer humor

Humor should be small and contextual.

Examples:

```text
Everyone's working. Probably.

One more PR.

Coffee is running low.

Looks like someone broke the build.

Deploying on Friday was a mistake.
```

Do not force jokes into every component.

Humor should reward attention to the office.

Decorative humor must not pretend to be actual game state.

If something is represented as real gameplay information, it must come from real state.

---

# 25. Existing architecture constraints

The design work must preserve the existing architecture.

Current important boundaries:

```text
domain
application
infrastructure
server
components
i18n
```

Do not move domain logic into components.

Do not import:

- drizzle
- better-sqlite3
- infrastructure code

into client components.

Existing progress rule must remain:

```text
taskProgress(task, now)
```

Do not add:

```text
Date.now()
```

inside components.

Do not duplicate:

```text
startedAt + estimatedDuration
```

inside UI components.

---

# 26. Existing playable slice is not to be thrown away

The current implementation is valuable.

Do not rewrite the architecture just because the visual direction changes.

Keep the working:

- company flow
- employee flow
- task flow
- persistence
- elapsed-time simulation
- server actions
- view model
- i18n
- tests

The goal is:

```text
existing working foundation
+
new visual/UX direction
```

not:

```text
throw everything away
+
rewrite application
```

---

# 27. Design phase deliverables

Before implementing the next UI iteration, perform the following.

## Step 1 — Audit the current UI

Inspect:

- existing pages
- components
- globals.css
- layout
- i18n
- view model
- current screenshots/browser output
- existing `docs/DESIGN.md`

Identify:

1. what should be kept,
2. what should be visually changed,
3. what is missing,
4. what is actively conflicting with the product fantasy.

Do not make a large code change yet.

---

## Step 2 — Establish the canonical style guide

Create or update:

```text
docs/STYLE-GUIDE.md
```

This becomes the canonical implementation reference for future UI work.

It should contain:

### Brand

- product personality
- tone
- visual keywords

### Color

Define semantic tokens, for example:

```text
background
surface
surface-muted
border
text-primary
text-secondary
accent
success
warning
danger
```

Use actual values only after reviewing the current implementation and choosing a coherent palette.

### Typography

Document:

- primary font
- optional display/pixel font
- heading hierarchy
- body
- metadata
- labels
- numeric/data presentation

### Spacing

Define a small spacing scale.

Do not create dozens of values.

### Radius

Use restrained corner radii.

Avoid the modern SaaS look of extremely rounded cards everywhere.

### Borders/shadows

Prefer subtle separation.

Avoid heavy shadows.

### Components

Document visual rules for:

- buttons
- inputs
- navigation
- status indicators
- badges
- panels
- cards
- task rows
- employee display
- activity feed
- drawers
- empty states

### Office

Document:

- room composition
- employee visual treatment
- furniture
- objects
- interaction states
- visual density

### Motion

Document the small set of allowed animations.

### Localization

Document Korean/English constraints.

### Accessibility

Document:

- contrast
- focus
- keyboard interaction
- color-independent status
- minimum clickable targets

---

# 28. Design exploration is allowed

Do not freeze the exact design before seeing it in the browser.

The correct process is:

```text
design direction
    ↓
small implementation
    ↓
browser inspection
    ↓
visual feedback
    ↓
style guide refinement
    ↓
implementation
```

The style guide should establish principles and tokens.

It should not prescribe every pixel before the UI exists.

---

# 29. First redesign target

Do not redesign every page at once.

First redesign the **Office page**.

The Office page should demonstrate the final visual language.

It should include:

```text
header
+
navigation
+
office scene
+
real employees
+
real tasks
+
selected/inspection panel
+
compact active-work information
```

The data should come from the existing application/view-model layer.

Do not invent fake data just to make the scene look populated.

If there are no employees, the empty-office state should still be visually compelling.

---

# 30. Prototype data and design review

For visual inspection, it is acceptable to use existing development data or a temporary seed/test company.

Do not add fake persistent gameplay state to production behavior.

When reviewing the Office page, verify:

### At a glance

Can the player understand:

- what company this is?
- how many people work here?
- who is working?
- what are they working on?
- who is available?
- what needs attention?

### Emotional

Does it feel like:

> "my tiny software office"?

rather than:

> "a task management website"?

### Visual

Is the office scene visually dominant?

Are employees recognizable?

Is the UI information-dense without becoming a dashboard wall?

---

# 31. Important anti-patterns

Do not respond to the design problem by:

### Adding more cards

Bad:

```text
Employee Card
Task Card
Company Card
Activity Card
Statistics Card
```

### Making everything pastel

Pastel colors alone do not create the intended style.

### Making everything pixel art

The product is modern + pixel-inspired, not a retro emulator.

### Adding decorative characters with no state

Every employee shown in the office should correspond to actual game state.

### Adding a fake "live" dashboard

Do not create artificial activity just to make the UI appear alive.

### Introducing unnecessary animation

The office should feel alive through state and subtle motion.

### Rebuilding the architecture

Visual redesign does not justify changing the domain/application/persistence architecture.

---

# 32. Source-of-truth hierarchy

When documents disagree, use this priority:

```text
1. Current domain/application behavior
2. This design brief
3. Existing docs/DESIGN.md
4. Existing visual implementation
```

The current code is authoritative for behavior.

This document is authoritative for the **new visual direction**.

Do not silently change gameplay behavior to satisfy visual presentation.

---

# 33. Required response from Claude Code before implementation

After reading this document:

**Do not immediately start coding.**

First report:

1. Current UI audit
2. What specifically conflicts with this design direction
3. Proposed Office page composition
4. Proposed visual tokens
5. Proposed component structure
6. Proposed `docs/STYLE-GUIDE.md` contents
7. Which existing components can be reused
8. Which components need redesign
9. Any architectural concerns

Then wait for approval before doing the large visual redesign.

---

# 34. Implementation rule after approval

Once implementation begins:

- keep changes focused on UX/UI
- preserve existing domain/application behavior
- preserve SQLite persistence
- preserve i18n
- preserve server/client boundaries
- preserve progress calculation
- preserve tests
- do not introduce unrelated gameplay systems

After the first Office redesign:

```text
typecheck
lint
test
build
browser visual inspection
```

must all pass.

---

# 35. Final design principle

The most important rule in this document is:

> **My Tiny Office should feel like a tiny office that happens to have excellent information design, not an information dashboard that happens to contain an office.**

When choosing between two UI directions, prefer the one that makes the player feel more like the owner of a small living software company.

