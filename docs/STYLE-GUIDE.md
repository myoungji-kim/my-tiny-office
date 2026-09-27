# My Tiny Office — Style Guide

What has to be written down. Everything that is easier to *look at* lives in
[`docs/ui/`](ui/index.html) — open those pages first.

- `ui/office.html` — the screen
- `ui/components.html` — buttons, menu rows, chips
- `ui/characters.html` — the twenty species

Direction and screen structure are in [`DESIGN.md`](DESIGN.md).

---

## 1. Colour carries information

The chrome is monochrome (DESIGN.md). A saturated colour in the interface must
be carrying information — progress, status, or the office scene itself. If it
is only decorating, it is wrong. That is why the primary button is near-black
rather than brand indigo: a button is chrome.

---

## 2. Colour tokens

Declared on `:root` in every page. **Never write a raw hex in a rule** — if a
value is missing, add a token.

### Surfaces

| Token | Value | Use |
| --- | --- | --- |
| `--page` | `#edecee` | Page behind the app panel |
| `--surface` | `#ffffff` | The app panel, cards, popovers |
| `--subtle` | `#f6f6f7` | Sidebar, inset areas, hover |
| `--sunk` | `#eeeef0` | Avatar wells, quiet fills |
| `--line` | `#ebebed` | Hairline borders, dividers |
| `--line-2` | `#e0e0e3` | Borders that need to be seen |

### Text

| Token | Value | Use |
| --- | --- | --- |
| `--ink` | `#1b1b1f` | Primary text |
| `--solid` | `#17171c` | Primary button fill only |
| `--solid-hover` | `#2a2a31` | Primary button, hovered |
| `--hairline-hover` | `#cfcfd4` | A hairline that has to answer a hover |
| `--muted` | `#86868d` | Secondary text, inactive nav |
| `--faint` | `#b2b2b9` | Labels, metadata, placeholders |

### Accent and status

| Token | Value | Use |
| --- | --- | --- |
| `--brand` | `#5b5bd6` | Focus rings. **Not** buttons |
| `--brand-soft` | `#ecebfb` | Area chips, quoted memory, selected rows |
| `--ok` / `--ok-soft` | `#2fae62` / `#e4f6ec` | `available`, completed |
| `--info` / `--info-soft` | `#3b82f6` / `#e8f0fe` | `reviewing`, a colleague's review |
| `--warn` / `--warn-soft` | `#eaa221` / `#fdf1dd` | `working` |
| `--bad` / `--bad-soft` | `#e5484d` / `#fdeaea` | Destructive, changes requested |

Each status needs three values, not one: the colour itself, a soft background,
and **text dark enough to sit on that background**.

| Token | Value | Use |
| --- | --- | --- |
| `--ok-ink` / `--ok-line` | `#1f7a48` / `#bfe6cf` | Text and border on `--ok-soft` |
| `--info-ink` | `#2557b5` | Text on `--info-soft` |
| `--warn-ink` / `--warn-line` | `#8a5c10` / `#f0d8a8` | Text and border on `--warn-soft` |
| `--bad-ink` / `--bad-line` | `#a8322f` / `#f4c2c3` | Text and border on `--bad-soft` |
| `--bad-wash` | `#fffafa` | A row that needs attention without alarm |
| `--brand-ink` | `#4342a6` | Text on `--brand-soft` |

### Office

The tile palette is a separate, shared map in the page script. One value is
load-bearing:

| Token | Value | Use |
| --- | --- | --- |
| Outline | `#2f2a3d` | Furniture **and** characters, so the scene reads as one |
| `--floor` | `#b0854f` | The office floor, when a screen shows a scrap of it |

### Terminal

A command the user has to run is shown on a dark surface, because it belongs
to their terminal rather than to the app.

| Token | Value | Use |
| --- | --- | --- |
| `--term` | `#17171c` | The block itself |
| `--term-fg` / `--term-dim` | `#e8e8ea` / `#6f6f78` | The command, and the `$` prompt |
| `--term-line` / `--term-hover` | `#3a3a42` / `#26262d` | Copy button border and hover |

---

## 3. Radius

| Token | Value | Use |
| --- | --- | --- |
| `--r-ctl` | `10px` | Nav rows, small controls |
| `--r-card` | `12px` | Cards, panels, the office stage |
| `--r-app` | `18px` | The app panel |
| — | `999px` | Buttons and chips. Always. |
| — | `9px` | Menu rows inside a popover |

Buttons are never 8px or 12px. Menu rows are never pills. The distinction is
what separates a standalone action from a list of actions.

---

## 4. Typography

Noto Sans KR, weights 400 / 500 / 600 / 700. **All four must load** — a missing
600 makes the browser synthesise faux bold, which smears every Korean glyph.

| Role | Size | Weight |
| --- | --- | --- |
| Screen title | 24px | 600 |
| Section heading, card name, dialog title | 17px | 600 |
| Body, row name, task title | 15px | 400–600 |
| Detail, role, secondary text | 14px | 400–500 |
| Label, metadata, chip | 13px | 400–600 |
| Smallest label | 12px | 600 |

These six sizes are the whole scale; a size between two steps is drift, not a
choice. Nothing is smaller than 12px: below that, a Korean syllable stops being
legible.

Numbers that change in place use `font-variant-numeric: tabular-nums` so the
layout does not twitch.

### Korean rules

- **Never positive `letter-spacing`, and never `text-transform: uppercase`, on
  Korean.** Tracking pulls the jamo of a syllable apart. Negative tracking on a
  large heading (`-.01em`) only tightens it optically and is fine. Casing
  belongs in the dictionary, not in CSS.
- **Never concatenate a Korean particle.** 을/를 and 이/가 depend on whether the
  preceding syllable carries a final consonant, so `name + "가"` produces 단풍가
  and `area + "를"` produces 품질를. Compute it:
  `(code - 0xac00) % 28 !== 0` means the syllable has one.
- A Latin wordmark may be tracked. Nothing else.
- Do not assume Korean and English are the same length. Test both.

---

## 5. Borders, shadows, focus

- Borders are hairlines. Weight comes from `--line` vs `--line-2`, not from 2px.
- Shadows are soft and low-contrast. The app panel and the popover are the only
  things that float.
- Focus is `2px solid var(--brand)` with `outline-offset: 2px`, via
  `:focus-visible`. **Never removed anywhere.**
- **Every inline `<svg>` needs an explicit width and height.** Without one it
  stretches to fill its grid or flex cell. Size it on the container rule, not per
  icon.
- **`[hidden]` always hides.** `system.css` makes it win over any component's
  own `display`, so a component never needs its own `[hidden]` rule.
- Focus moves into a popover only when it was opened from the keyboard
  (`event.detail === 0`); a mouse user should never see a ring appear.

---

## 6. Status indicators

Status is carried by **shape as well as colour**, so it survives colour-blindness
and greyscale.

| Status | Colour | Dot |
| --- | --- | --- |
| `working` | `--warn` | Filled, with a ring |
| `reviewing` | `--info` | Hollow ring |
| `available` | `--ok` | Filled |
| `vacation` | `--faint` | Short dash |

A status is always accompanied by a text label somewhere in the same view.

### Numbers

**Every number shown to the user is a count of something that happened** —
memories, references, tasks, reviews, minutes. A 0–100 bar whose value nobody
can explain is worse than no number: it looks like information and is not.

If a figure cannot be traced to events, it does not go on the screen.

---

## 7. Notices, empty states and dialogs

Shapes are in `ui/components.html`. The rules:

### Notice

`아이콘 · 제목 한 줄 · 설명 한 줄 · 오른쪽 행동`, in that order.

| Variant | When | The description must say |
| --- | --- | --- |
| default | Something happened worth knowing | What happened |
| `notice-ok` | Something finished | **What** finished, not that it finished |
| `notice-warn` | Not broken, but worth a look | What to check |
| `notice-bad` | Failed or disconnected | **Whether the data survived**, first |
| `.locked` | An area is not usable yet | Why, and what *can* be done now |

A failure notice that does not say what happened to the user's work is not
finished. "에이전트 연결이 끊어졌어요" is half of it; "진행 중이던 업무는
그대로 있어요" is the half that matters.

### Empty state

`아이콘 · 무엇이 없는지 · 채우면 무슨 일이 생기는지 · 채우는 버튼`.

An empty state is not an error and does not apologise. Offer the action that
fills it, and — where the feature is optional — an honest way to skip it.

### Modals and confirm dialogs

Covering the screen is for a choice that has to be answered now. Anything
reversible belongs in a popover.

- A modal is for picking or writing something; a confirm dialog is yes/no, and
  only for work that is hard to undo. It replaces `confirm()`.
- Focus starts on **cancel** — except in a dialog whose point is writing
  (teaching, hiring), which starts on its first field. Closing returns focus to
  the trigger.
- `Escape` and a click outside both close, and closing saves nothing.
- The confirm button says **what will happen** — `이 업무 맡기기`, `내보내기` —
  never `확인`.
- **Show the consequence of the choice in the same window**, before it is made.
- A destructive confirm uses the danger icon and a danger button.
- Removing one row asks once more **inside its menu** rather than in a dialog;
  a dialog is for when removing needs a choice, such as where its contents go.

---

## 8. Writing

The interface talks about the user's office, not about itself.

| Do | Don't |
| --- | --- |
| 모카를 내보낼까요? | 정말 삭제하시겠습니까? |
| 진행 중이던 업무는 대기 상태로 돌아가요. | 이 작업은 되돌릴 수 없습니다. |
| 두부가 로그인 폼 구현을 끝냈어요 | 작업 완료 |
| 내보내기 | 확인 |
| 직원을 고용하면 업무를 맡길 수 있어요 | 권한이 없습니다 |

- Name the thing. `업무` and `직원` beat `항목` and `대상`.
- Say the consequence before asking for the confirmation.
- Never make a status name do the work of a sentence. `완료됨` tells the
  user nothing they could not see.
- Keep it plain. Cozy, not a console.

---

## 9. Pixel characters

Full cast and the silhouette test: `ui/characters.html`.

- 16×16 strings over a shared palette, drawn at **integer scale only** with
  `imageSmoothingEnabled = false`
- Scales in use: 3× in the office, 2× on card avatars, 1× in the sidebar
- One body is shared by every species. **Adding a species changes seven head
  rows and a palette, nothing else.**
- One outline colour for the whole cast

### Silhouette families

Seven head rows cannot produce twenty distinct silhouettes. The cast is grouped
into eight families instead:

> **Families are told apart by silhouette. Species within a family are told
> apart by colour and marking.**

Rules for a new species:

- Decide its family first. A new family is better than a crowded one.
- Within a family, its colour and marking must be unique.
- **Never add a species that differs only by colour.** Ear size or a marking has
  to differ too.
- A species that leans on a single colour must own that colour outright — two
  pale faces and neither reads.
- No text inside a sprite. No status baked into a sprite.
- Species is cosmetic. It never affects stats.

---

## 10. Naming

| Field | Rule |
| --- | --- |
| `name` | The user's nickname. **Never goes through i18n.** |
| `species` | Picks a sprite. Display names are translated. |
| `role` | A job title from the company's list. Written the same in both languages. |

- Nicknames stay short — 2–3 Hangul characters, ≤6 Latin — so cards do not shift.
- No emoji and no species description in a name. The sprite already says it.
- Technical titles stay English: `Backend Engineer`, `PR`, `API`, `DBA`.

---

## 11. Localization

- All interface text goes through i18n. What the user types does not.
- **The sample pages carry both languages**, switched with `?lang=en`. A layout
  proved in one language is not proved. Employee nicknames stay untranslated in
  both, which is the rule made visible.
- On the spec pages the **examples** switch and the surrounding prose does not,
  and each of those pages says so in a line at the top. The examples are the
  standard for copy; the prose is commentary for whoever is building it, has
  one reader, and would cost a second copy of every rule forever. Revisit this
  the moment someone who does not read Korean needs the design system.
- **Never bake text into canvas, SVG or any other asset.** Names and labels are
  DOM elements positioned over the canvas.
- No fixed widths, no hard-coded line breaks.
- Test both languages; English usually runs longer than Korean.
- A label the user wrote — a nickname, a company name, an area, team or role
  they named — is shown as written in either language.

---

## 12. Accessibility

- The office canvas is `aria-hidden`. The `<button>`s in the overlay carry the
  names and the interaction.
- A popover trigger uses `aria-expanded`, and the attribute is written as the
  string `"true"` — `toggleAttribute(name, true)` writes an empty value and
  silently breaks `[aria-expanded="true"]` selectors.
- `aria-selected` is for tabs and options. A disclosure uses `aria-expanded`.
- No nested interactive elements. A card is a container; the kebab button inside
  it is the keyboard trigger.
- `Escape` closes a popover and returns focus to a focusable trigger.
- Information is never carried by colour alone.

---

## 13. Keeping the pages honest

The shared half of the pages lives in two files that every page loads:

- `docs/ui/system.css` — the token block and every rule more than one page uses
- `docs/ui/system.js` — the palette, the twenty sprites, the tile painter, the
  cast, and the sample-page bar, which builds itself

A page keeps only what is its own. Both are plain, relative `<link>` and
`<script>`, never modules, so a page still opens by double-clicking it.
Anything two pages need — a dialog, a menu, a helper — lives in these files,
never as a copy.

`npm run check:ui` runs four checks over what is left:

- **parse** — every inline script and `system.js` must still parse
- **parity** — `.notice` is the last component the pages still define themselves,
  and audit waves spacing through on purpose, so this compares it across all five
- **audit** — no raw colour outside `:root`, button heights 42/36/30, radii from
  the documented set, `:focus-visible` wherever there are controls, no tracked
  Korean, no class without a rule, the same sidebar and header frame on the
  product screens, every `id` a script reaches for, every class `system.js` writes styled
  in `system.css` rather than one page, a title that matches the
  name the bar gives the page, and — the point of the two shared files — no page
  redefining a selector, redeclaring a name, or declaring a token of its own
- **verify-docs** — the token table here must match `system.css`, and the cast
  claims must match `system.js`

A check reports drift; it does not prevent it. When something is shared, move it
into `system.css` or `system.js` rather than adding a check that the copies
still agree.

## 14. Do and don't

| Do | Don't |
| --- | --- |
| One primary action per screen | Two near-black buttons competing |
| Near-black primary | Brand indigo primary |
| `sm` + secondary/ghost inside cards | Near-black inside a card |
| Menu rows inside a popover | Pill buttons inside a popover |
| Disable a forbidden action and give the reason | Hide it |
| Colour plus shape for status | Colour alone |
| Add the pattern to `ui/` first | Invent a pattern in a feature branch |
| Let the sprite say the species | Write the species next to the name |
| Show counts of real events | Invent a 0–100 bar |
| Name the area nobody knows | Show only what exists |
| Show that a memory was used | Let teaching disappear into a notes field |
| Split a long page into tabs, a long list by area | Scroll forever |
| Let the company own its area list | Hard-code the vocabulary |
| Preview the consequence in the modal | Ask to confirm a choice blind |
| Compute the Korean particle | Concatenate 를 and hope |
| One class name, one component | Reuse `.card` for three different things |
| Give a variant its own name | Redeclare the base class further down |
| Let the container own the spacing | Ship a component with an outer margin |
| Say what happened | Say only the status name |
| Label a confirm button with its effect | Label it `확인` |
| Focus cancel first in a destructive dialog | Focus the destructive action |
