# Research — re-write of "Graphify, CodeGraph, ContextGraph: what actually differs"

Rewrite target: `src/content/blog/graphify-codegraph-contextgraph-what-differs.md`
(published 2026-08-26, currently **6,884 words / 31 min** — 3.1× the 2,200 budget).

## Archive check

| Post | Words | Relationship |
|---|---|---|
| `your-agent-needs-the-edges-between-files.md` | 2,324 | **Rewritten 2026-08-28.** Now carries the four-way headline table, the gin/Keycloak losses, the grep-vs-ripgrep finding, gold-file coverage, ingest multipliers and the build-order nondeterminism. |
| `graphify-codegraph-contextgraph-what-differs.md` | 6,884 | The post being rewritten. |

**Two constraints fall out of that, and they pull in opposite directions.**

1. The measurement is now the edges post's. This post's `Before the numbers`
   (558 w) + `The measurement` (1,126 w) + most of `What this does not settle`
   (286 w) duplicate it — ~1,900 words that should become one paragraph and a link.
2. **The edges post explicitly delegates *here* for symbol identity and the
   resolution ladder** ("…is the subject of the piece comparing this to Graphify
   and CodeGraph"). Those sections are load-bearing for the pair and must stay,
   or the link lands on nothing.

## Version drift — checked today, 2026-08-28

The article states everything was read on **26 August 2026**. Two days on, nothing
has moved:

| | Article says | Today | Source |
|---|---|---|---|
| Graphify | v0.9.50, `v8` branch, Apache-2.0, PyPI `graphifyy` | **0.9.50**, uploaded 2026-08-25; default branch `v8`; Apache-2.0 | PyPI JSON API; GitHub repos API |
| CodeGraph | latest v1.6.0; benchmark measured v1.5.0 | **1.6.0**, `time.modified` 2026-08-26T17:11Z; MIT | `npm view @colbymchenry/codegraph` |
| Neither repo | — | Graphify `pushed_at` 2026-08-25T17:43Z; CodeGraph 2026-08-26T17:09Z — both **before** the reading date | GitHub repos API |

So the "read on 26 August 2026" caveat still holds exactly and no figure needs
re-reading. The v1.5.0-vs-v1.6.0 split still applies and must survive the cut.

## Claims re-verified against the sources

Spot-checked the load-bearing ones the rewrite will keep, from each project's own
README at the branch above.

**CodeGraph** (`colbymchenry/codegraph`, README on `main`):
- 34 language entries — counted 34 `assets/languages/` icons. Article says
  "roughly thirty-four". ✓
- "Recognizes web-framework routing files and links URL patterns to their
  handlers across **17 frameworks**" (line 282); `route` nodes joined by
  `references` edges (line 317). ✓
- Swift ↔ ObjC `@objc` bridging, React Native legacy bridge + TurboModules +
  Fabric view components, Expo Modules (lines 283, 347–348). ✓
- "Auto-sync is enabled by default… **The index is never stale, and there is
  nothing to re-run.**" (line 127). ✓
- Telemetry: anonymous usage stats, on by default, installer asks up front;
  never code, paths, file or symbol names, queries or IPs; aggregated locally
  into daily totals; ingest endpoint public in-repo; off via
  `codegraph telemetry off`, `CODEGRAPH_TELEMETRY=0` or `DO_NOT_TRACK=1`
  (lines 717–732). ✓ — verbatim match to the article's claim.

**Graphify** (`Graphify-Labs/graphify`, README on `v8`):
- LOCOMO n=300 recall@10 **0.497** against mem0 0.048 and supermemory 0.149;
  LongMemEval-S n=50 QA accuracy **76%** (lines 122–124). ✓
- `# NOTE:` / `# WHY:` comments and ADR/RFC citations as first-class nodes
  (line 112). ✓  Leiden communities and "god nodes" (lines 108–109). ✓
- Code parsed locally with tree-sitter, no LLM; only the semantic pass over
  docs/media calls a backend (lines 32, 114). ✓
- faster-whisper + yt-dlp behind the `video` extra (line 253). ✓

**DISCREPANCY — must be fixed in the rewrite.** The article says Graphify has
"**thirty-seven** tree-sitter grammars for code". The README's own feature table
says cross-file links resolve "across **~40 languages**" (line 110). These are
not the same number and the README's is approximate. The rewrite says
"~40 by its own README" rather than asserting a precise count the source does
not support.

**Unverified in this pass — do not restate as freshly checked.** The 512 MiB
`graph.json` cap and `GRAPHIFY_MAX_GRAPH_BYTES`, the union merge driver, the
`--allow-partial` / `--force` refusals, the `{id, label, source_file,
source_location}` node record and the root-inference warning all come from
Graphify's `ARCHITECTURE.md`, not its README, and were not re-fetched today.
They were read on 26 August. The rewrite keeps only the refusals and the
root-inference warning, and attributes both to that document by name.

**ContextGraph** figures (identity format, the four rungs, the eight
confidences, `CALL_RESOLUTION_CANDIDATE_CAP = 3`) were verified line-by-line
during the edges-post rewrite against `~/Projects/context-graph@3dd085f` — see
`agent-team/research/edges-between-files.md`.

## Angle

### Title candidates

1. **"Graphify, CodeGraph, ContextGraph: what actually differs"** — the current
   title. Slug unchanged, the published URL and the edges post's inbound link
   both survive.
2. **"I built one of these three. Here's when to pick the other two."** — the
   strongest promise, because the conflict of interest becomes the hook instead
   of a disclaimer. New slug.
3. **"What a code-graph tool refuses to do tells you more than its feature list"**
   — promises the axis, not the roundup. New slug.
4. **"Three code-graph tools, and the axis that decides between them"** — the
   decision, foregrounded. New slug.

### Punchline

> All three parse your repo into a graph; what separates them is what they will
> even read, and what they refuse to guess — and I wrote one of them, so weigh
> the third section accordingly.

### The reader

A developer choosing one of these to install this week. Already convinced a code
graph beats grep for chain questions (that argument is the edges post's job).
Wants to know which one fits their repository and whose judgement to trust. Knows
what tree-sitter and MCP are. Does not need the benchmark re-explained.

### Section plan

| # | Section | Words | Visual |
|---|---|---|---|
| 1 | Hook — three READMEs, one promise, and I wrote one of them | 300 | — |
| 2 | By the end of this you will be able to | 60 | — |
| 3 | The three, in one paragraph each | 240 | — |
| 4 | **What each one will even read** — the axis that decides first | 330 | table |
| 5 | **How each decides two `getName`s are different things** — identity + the resolution ladder. The section the edges post links here for | 420 | — |
| 6 | **What each refuses to do** — the axis that decides trust | 360 | — |
| 7 | How the answer reaches your agent | 230 | — |
| 8 | What was measured — one paragraph, and a link out | 200 | — |
| 9 | **How I would actually choose** | 400 | **diagram** — decision tree keyed on what is in your repo |
| 10 | Sources | 120 | — |
| | **Total** | **2,660** | |

**Stated out loud: 2,660 against 2,200 — 460 over, 21%.** The overrun is
sections 5 and 6, which are the two the edges post delegates here and the two a
reader cannot act on without detail.

Cut wholesale: `Where the index lives` (folded to one row of the section-4
table), `What indexing costs` (the edges post carries the multipliers),
`The measurement` tables, `What the other two projects have measured themselves`
(compressed to two sentences in section 8), `What this does not settle` (the
edges post's caveats section covers it).

### Slug

Decided at approval. Keeping `graphify-codegraph-contextgraph-what-differs`
preserves the published URL **and** the inbound link from the edges post, which
was merged two days ago; any other title means editing that post too.

## Approved angle (human, in conversation)

- **Title and slug kept** — `graphify-codegraph-contextgraph-what-differs`. The
  published URL survives and so does the edges post's inbound link, so no second
  file has to change.
- **Budget: 2,660 stands.** Sections 5 and 6 stay at full length — they are the
  two the edges post delegates here, and the two a reader cannot act on without
  detail. ~12 min read against the 10-minute target.
- **Diagram:** the decision tree in section 9 was drawn, then dropped on the
  author's call. The section carries its three recommendations as prose, which
  is where the caveats live anyway — a diagram flattens "not measured here" and
  "costs more to index" into a box nobody reads twice. Banner only.
