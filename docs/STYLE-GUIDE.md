# My Tiny Office — Style Guide

What has to be written down. Everything that is easier to *look at* lives in
[`docs/ui/`](ui/index.html) — open those pages first.

- `ui/office.html` — the screen
- `ui/components.html` — buttons, menu rows, chips
- `ui/characters.html` — the twenty species

Direction and screen structure are in [`DESIGN.md`](DESIGN.md).

---

## 1. Visual thesis

> The chrome is monochrome. Colour belongs to the office and to the data.

A saturated colour in the interface must be carrying information — progress,
status, or the office scene itself. If it is only decorating, it is wrong.

This is why the primary button is near-black rather than brand indigo: a button
is chrome.

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
| `--sunk` | `#eeeef0` | Progress tracks, avatar wells |
| `--line` | `#ebebed` | Hairline borders, dividers |
| `--line-2` | `#e0e0e3` | Borders that need to be seen |

### Text

| Token | Value | Use |
| --- | --- | --- |
| `--ink` | `#1b1b1f` | Primary text |
| `--solid` | `#17171c` | Primary button fill only |
| `--muted` | `#86868d` | Secondary text, inactive nav |
| `--faint` | `#b2b2b9` | Labels, metadata, placeholders |

### Accent and status

| Token | Value | Use |
| --- | --- | --- |
| `--brand` | `#5b5bd6` | Focus rings, skill bars. **Not** buttons |
| `--ok` / `--ok-soft` | `#2fae62` / `#e4f6ec` | `available`, completed |
| `--info` / `--info-soft` | `#3b82f6` / `#e8f0fe` | `ready` |
| `--warn` / `--warn-soft` | `#eaa221` / `#fdf1dd` | `working` |
| `--bad` / `--bad-soft` | `#e5484d` / `#fdeaea` | Destructive, changes requested |

### Office

The tile palette is a separate, shared map in the page script. One value is
load-bearing:

| | Value | Use |
| --- | --- | --- |
| Outline | `#2f2a3d` | Furniture **and** characters, so the scene reads as one |

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
| Screen title | 23px | 600 |
| Section heading | 15–16px | 600 |
| Card name | 16px | 600 |
| Body | 14px | 400 |
| Card / popover detail | 13–13.5px | 400–500 |
| Label, metadata | 11–12px | 600 |

Numbers that change in place use `font-variant-numeric: tabular-nums` so the
layout does not twitch.

### Korean rules

- **Never `letter-spacing` or `text-transform: uppercase` on Korean.** Both
  break Hangul. Casing belongs in the dictionary, not in CSS.
- A Latin wordmark may be tracked. Nothing else.
- Do not assume Korean and English are the same length. Test both.

---

## 5. Borders, shadows, focus

- Borders are hairlines. Weight comes from `--line` vs `--line-2`, not from 2px.
- Shadows are soft and low-contrast. The app panel and the popover are the only
  things that float.
- Focus is `2px solid var(--brand)` with `outline-offset: 2px`, via
  `:focus-visible`. **Never removed anywhere.**
- Focus moves into a popover only when it was opened from the keyboard
  (`event.detail === 0`); a mouse user should never see a ring appear.

---

## 6. Status indicators

Status is carried by **shape as well as colour**, so it survives colour-blindness
and greyscale.

| Status | Colour | Dot |
| --- | --- | --- |
| `working` | `--warn` | Filled, with a ring |
| `ready` | `--info` | Hollow |
| `available` | `--ok` | Filled |
| `vacation` | `--faint` | Short dash |

A status is always accompanied by a text label somewhere in the same view.

---

## 7. Pixel characters

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

## 8. Naming

| Field | Rule |
| --- | --- |
| `name` | The player's nickname. **Never goes through i18n.** |
| `species` | Picks a sprite. Display names are translated. |
| `role` | Domain value; the display string is translated. |

- Nicknames stay short — 2–3 Hangul characters, ≤6 Latin — so cards do not shift.
- No emoji and no species description in a name. The sprite already says it.
- Technical titles stay English: `Backend Engineer`, `PR`, `API`, `DBA`.

---

## 9. Localization

- All game text goes through i18n. Player input does not.
- **Never bake text into canvas, SVG or any other asset.** Names and labels are
  DOM elements positioned over the canvas.
- No fixed widths, no hard-coded line breaks.
- Test both languages. The action popover had to be widened once because an
  English role outgrew a width that fit the Korean.

---

## 10. Accessibility

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

## 11. Do and don't

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
