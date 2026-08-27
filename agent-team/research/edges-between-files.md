# Research — re-write of "Your agent needs the edges between files"

Rewrite target: `src/content/blog/your-agent-needs-the-edges-between-files.md`
(published 2026-08-26, currently **4,378 words** — 2.0× the 2,200 budget).

## Archive check — does this topic already exist here?

Yes, twice over, and that is the central finding.

| Post | Words | Overlap with the current draft |
|---|---|---|
| `graphify-codegraph-contextgraph-what-differs.md` | 6,952 | **Heavy.** Its sections already cover: symbol identity, resolution + confidence recording, how results reach an agent, where the index lives, indexing cost, the four-way measurement, and what it doesn't settle. |
| `your-agent-needs-the-edges-between-files.md` | 4,378 | The post being rewritten. |

Sections of the current draft that the comparison post already owns:
`Symbol identity…`, `Every edge records which rung…`, `Local SQLite, not a service`,
`What the retrieval measurement actually says`, `What it costs to build`, `The limits`.
That is ~2,400 words duplicating a neighbouring post — the reason for the overbudget.

**Consequence for the rewrite:** the one idea this post owns and the comparison
post does not is the **two-arm agent run**. Everything structural links out.

## Verified claims (source beside each)

All paths below are in `~/Projects/context-graph` at `3dd085f`. Every file the
current draft cites still exists (checked file by file after the commit
"Take the developer's machine and the run records out of the public repo").

### The two-arm run — `modules/benchmark/results/run-1787085544741.json`

| | WITH_TOOLS | WITHOUT_TOOLS |
|---|---|---|
| tool calls | 4 | 40 (`hitCeiling: true`) |
| file reads | 0 | 10 |
| input tokens | 193,178 | 944,460 |
| wall clock | 19,734 ms (19.7 s) | 269,558 ms (269.6 s) |
| judge accuracy | 0.8333 | 0.5000 |

- `config.toolCallCeiling = 40`, `config.repeatsPerArm = 1`, `profile: SMOKE`.
- **Agent model `gpt-4.1-mini`; judge model `gpt-4.1`** (`config.models`). The
  current draft says "same model" and never names it. A small agent model is a
  real limitation and belongs in the limits list.
- Corpus: Excalidraw pinned at tag `v0.18.1`, sha `a2ec2889babf…`.
- Question text (`questions[0].text`) verified verbatim against the draft's quote.
- Six gold facts, each with `file:line` evidence. f4/f5/f6 are the consecutive
  `ShapeCache` links: `renderElement` → `ShapeCache.generateElementShape` →
  WeakMap cache hit, else `_generateElementShape`.
- `judgeScores[*].factScores[*].score` is `null` in the document — only the
  rolled-up `accuracyScore` carries a number. **Do not claim per-fact scoring
  detail beyond "three of six" without recomputing it.** "Six facts needed, it
  got three" is consistent with 0.500 over 6 and is how the draft states it.

### Ceiling correction — `modules/benchmark/ornek-kosu-excalidraw-q3.md`
Records that an earlier version of the measurement read 0.83 vs 0.00, because
hitting the ceiling ended the whole run rather than the tool phase. Fixed;
0.500 is the corrected instrument. Written in Turkish.

### `explore` response shape — `modules/mcp-server/.../ExploreEngine.kt`
- `DEFAULT_EXPLORE_TOKEN_BUDGET = 15_000` (line 29), overridable per call (line 148).
- `MAX_CANDIDATE_SYMBOLS = 40` (line 41), `MAX_EDGES_PER_SYMBOL = 20` (line 44),
  `MAX_MODULES = 5` (line 389).
- Elision, not silent dropping, once the budget is spent (line 174).

### Resolution ladder — `modules/core/.../ConfidenceDefaults.kt`
Four rungs, eight confidences, strictly decreasing:
0.97 / 0.93 / 0.87 / 0.80 unambiguous, 0.75 / 0.65 / 0.55 / 0.45 ambiguous
(lines 24–31). `CALL_RESOLUTION_CANDIDATE_CAP = 3` (line 39) — a rung yielding
more than three candidates emits no edge.
**Covered by the comparison post; cite only in passing here.**

### Install + languages — `README.md`
- `brew tap erenalpaslan/contextgraph` / `brew trust …` / `brew install contextgraph`
  (lines 27–29); `contextgraph init`, `contextgraph index .` (39–40);
  `contextgraph mcp bind > .mcp.json` (66).
- Tree-sitter grammars for Kotlin, Java, TypeScript, TSX, JavaScript, Python,
  Swift, Objective-C, Go (lines 14–16).
- Eleven MCP tools, `explore` the fat one (lines 108–126).

### Four-way retrieval run — `modules/benchmark/results/four-way/BENCHMARKS.md`
Verified but **out of scope for this rewrite** (it is the comparison post's
subject). Spot-checked because the draft quotes it: headline MRR 0.502 /
0.326 / 0.218 / 0.218 (line 189); recall@10 46.0 / 28.0 / 35.1 / 35.1 (188);
precision@5 20.0 / 12.4 / 11.0 / 11.0 (185). gin MRR 0.719 vs CodeGraph 0.813
(277); keycloak recall@10 17.3 vs bash 39.6 (288).

**Two defects in the current draft found here, worth not repeating:**
1. It mixes pools. The gin and keycloak rows it quotes are the *per-repo*
   tables (all 8 questions); the leaderboard for the headline pool reads
   0.857 vs 0.786 on gin (line 201) and 38.1% vs 19.8% on keycloak (line 200).
   Two different denominators, quoted as though one.
2. The doc reports build-order nondeterminism the draft never mentions:
   two content-identical builds of `gin` returned different answers, moving its
   MRR between 0.656 and 0.719, because the search cut and ranking broke ties in
   SQLite row order (line 7). Since fixed and pinned by tests.

### Marked UNVERIFIED — do not assert
- The claim that embedding search cannot return resolved edges. It is a
  structural argument, not a measured one; no embedding side was benchmarked.
  The current draft already flags this and the rewrite must keep the flag.
- Any per-gold-fact breakdown of *which* three facts the control arm got.
  `factScores[*].score` is null in the result document.

## Angle

### Title candidates

1. **"Your agent burned 944,460 tokens on one edge it couldn't follow"**
   — the promise is a diagnosis the reader can check on their own agent today.
2. **"Four tool calls, zero file reads: giving a coding agent the call graph"**
   — the promise is the outcome, with the method named.
3. **"The one question your coding agent can't grep its way to"**
   — the promise is recognition: you have watched this happen.
4. **"Why your coding agent opens ten files and still gets it wrong"**
   — the promise is the cause of a failure the reader already knows.

### Punchline

> grep tells an agent *where a word appears*; it can never tell it *what this
> call site actually calls* — and that one missing edge is where the agent's
> whole token budget goes.

### The reader

A developer who already uses a coding agent daily — Claude Code, Cursor,
Copilot — has watched it grep, open a file, grep again, and come back with a
confident half-answer, and wants to know what is structurally missing rather
than which model to switch to. Knows what a call graph is. Does not need MCP,
tree-sitter or SQLite explained.

### Section plan

| # | Section | Words | Visual |
|---|---|---|---|
| 1 | Hook — the run, the ordinary question, the hedge the agent wrote about itself | 320 | — |
| 2 | *By the end of this you will be able to* — two outcomes | 60 | — |
| 3 | **The edge grep can't follow** — where the failure actually is: a call site at `renderElement.ts:811` and a declaration in `ShapeCache.ts`. Why text search structurally cannot cross it | 380 | **diagram** — the six-link chain, with the three links the control arm reached shaded and the three it missed not |
| 4 | **The same question with the graph** — 4 calls, 0 reads, 5 of 6 facts. What one `explore` call returns and why zero file reads is the interesting number | 420 | trimmed `explore` JSON |
| 5 | **What the number isn't** — n = 1, `gpt-4.1-mini`, ceiling floor at 0.500, the earlier measurement bug that flattered it 2×, embedding search unmeasured | 380 | — |
| 6 | **Try it on a chain in your own repo** — install, index, `mcp bind`, and the shape of question worth asking | 300 | bash |
| 7 | Wrapping up + sources | 200 | — |
| | **Total** | **2,060** | under 2,200 |

Cut wholesale, to the comparison post as an internal link: symbol identity,
the resolution ladder in detail, one-fat-tool, local-SQLite, the four-way
retrieval tables, ingest cost, the ranking ablation. ~2,300 words of the
current draft.

### Slug

Decided at approval, from the chosen title. **If title 1 or 4 wins, the slug
changes** and the existing published URL
`/writing/your-agent-needs-the-edges-between-files/` breaks — the post file,
`public/images/<slug>/` and the branch all rename. Keeping the current slug
(and therefore roughly the current title) is the no-redirect option and is
worth an explicit choice.

## Approved angle (human, in conversation — the run carries no workflow, so no gate record exists)

- **Title kept:** "Your agent doesn't need more files. It needs the edges between them."
- **Slug kept:** `your-agent-needs-the-edges-between-files`. The published URL survives; no redirect needed.
- **Scope:** the ~2,060-word plan **plus** the retrieval-benchmark section restored
  (~700 words), with the pool-mixing defect fixed — quote one denominator and say
  which. The four design decisions, ingest cost and the ranking ablation stay cut,
  linked to `graphify-codegraph-contextgraph-what-differs`.
- **Diagram:** yes — the six-link render chain in section 3.

### Revised section plan

| # | Section | Words | Visual |
|---|---|---|---|
| 1 | Hook — the run, the question, the agent's own hedge | 320 | — |
| 2 | By the end of this you will be able to | 60 | — |
| 3 | The edge grep can't follow | 380 | **diagram** |
| 4 | The same question, with the graph | 420 | `explore` JSON |
| 5 | What the number isn't | 380 | — |
| 6 | And the retrieval side, including the rows it loses | 700 | table |
| 7 | Try it on a chain in your own repo | 300 | bash |
| 8 | Wrapping up + sources | 200 | — |
| | **Total** | **2,760** | |

**Stated out loud: 2,760 against 2,200 — 560 over, 25%.** The overrun is the
restored benchmark section, kept on the human's call because the agent-run
figure is n = 1 and a post that reports only n = 1 is weaker than one that puts
a 33-question deterministic run beside it, losses included.
