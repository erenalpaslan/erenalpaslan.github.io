# Prompt — blog post

Artefact: `design/personal-blog/Blog Post.dc.html`
System: `design/personal-blog/nocturne/` (Nocturne — read `readme.md` first)

Design the reading view of a single post on the same blog. Use the real
content of "Kotlin Coroutine: Exception Handling" (6 Nov 2023) so the design
is judged against the article it will actually carry: prose paragraphs, H2 and
H3 headings, a pull quote, fenced Kotlin code blocks, inline code, figures
with captions, and links.

The system, the departures and the prohibitions are exactly those in
`index.md` — read it first and do not restate a different answer.

## What this page has to get right

Code is the majority of this blog's content and it is the thing a dense
interface system handles worst. Code blocks need their own treatment: a
surface a step off the page ground taken from the neutral ramp, a border that
reads as an edge rather than a box, comfortable padding, and horizontal
scrolling that never widens the page. Inline code is tinted from the ramps,
not boxed.

Figures sit full-measure or wider than the text column, wrapped in Nocturne's
`.lighten` class, with the caption small and muted directly beneath.

The pull quote is the one place the accent may appear as a line — a left rule
in the accent against unfilled ground, never a tinted panel.

## What is on the page

- The same header as the index.
- Title, date, reading time, tags.
- A line stating this was first published on Medium, linking there, phrased so
  a reader understands the blog is the canonical home and Medium the mirror.
- The article body at the reading measure.
- At the end: previous and next post, and a quiet link back to the index.
- The same footer.
