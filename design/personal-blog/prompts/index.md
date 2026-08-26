# Prompt — blog index

Artefact: `design/personal-blog/Blog Index.dc.html`
System: `design/personal-blog/nocturne/` (Nocturne — read `readme.md` first)

Design the index page of a personal engineering blog for Eren Alpaslan
(erenalpaslan.github.io). Three posts exist today, all Android/Kotlin, all
originally published on Medium in November 2023. The page must still look
deliberate with three entries and not collapse when there are thirty.

## Build it in Nocturne, and take nothing from outside it

Every colour, font, space, radius and shadow resolves through Nocturne's
variables — `var(--color-*)`, `var(--font-*)`, `var(--space-*)`,
`var(--radius-*)`, `var(--shadow-*)`. Introduce no new colour, no second font,
no raw pixel value the tokens already carry. Use the system's own classes
(`.nav`, `.card`, `.tag`, `.btn`) rather than parallel ones.

Nocturne's direction holds here: left-aligned and asymmetric, flush-left
headings, content hugging the left edge with whitespace on the right,
outlined buttons rather than filled, rules that fade to transparent at their
ends, chroma kept low outside the single blurple accent, and the accent used
as a line or a mark and never as a flood.

## The one place this departs, and why

Nocturne is an interface system, dense on purpose at 0.70x, and its own
readme says the accent-to-ground pair is not rated for body copy. A blog is a
reading surface before it is an interface. So:

- Body text sits at a comfortable reading measure — roughly 68 to 72
  characters — not the full page width.
- Vertical rhythm between paragraphs is generous, looser than the cockpit's
  density would give.
- Accent-coloured text at paragraph size uses a deep ramp step
  (`--color-accent-300`), never `--color-accent` itself.

This is a decision about the blog, not a change to Nocturne. Do not edit the
system's tokens to accommodate it.

## What is on the page

- A header carrying the name as brand, and links: Writing, About, GitHub,
  Medium.
- A short opening statement — who this is and what gets written about. Two
  lines at most, set larger than body copy.
- The post list. Each entry shows title, date, reading time, the topic tags,
  and one or two lines of description. Entries are separated by whitespace
  and a fading rule rather than boxed in heavy cards — the reader is scanning
  titles, so the title carries the weight.
- Each entry marks that it also exists on Medium: a small, quiet
  affordance, not a badge competing with the title.
- A footer with the same links and nothing else.

## What must not happen

- No accent flood, no saturated panel, no gradient hero.
- No stock photography and no illustration — this page is type, rule and
  space.
- No card shadow stacking; on this ground elevation is an edge plus ambient
  darkness.
- Headings do not go past weight 500. Hierarchy is size and space.
