---
title: "Your agent doesn't need more files. It needs the edges between them."
description: "A coding agent burned 944,460 tokens and 40 tool calls on one ordinary question about Excalidraw, and still got half the answer. What it could not do was follow a single edge from a call site to a declaration — which is the part grep was never going to give it."
pubDate: 2026-08-26
tags: ["contextgraph", "coding-agents", "code-search", "developer-tools"]
category: "Agents"
---

A coding agent was asked a question about Excalidraw. Not a trick question — an
ordinary one, the kind you'd ask a colleague on their second week:

> Trace how an element in the scene actually gets drawn onto the canvas: which
> React component invokes the static-scene render function, and where does the
> rendering code obtain (or generate) the roughjs shape it draws?

The agent had a shell. It had the whole repository checked out at a pinned
commit. It ran forty tool calls, opened ten files, consumed 944,460 input tokens,
spent 269.6 seconds, hit its tool-call ceiling, and then wrote this into its own
answer:

> I could not confirm from the source directly the exact way the roughjs shape
> gets generated inside `renderElement`, but it is clear from the call chain and
> parameter passing that the RoughCanvas provided to `StaticCanvas` flows
> through […]

Six facts were needed for a complete answer. It got three. The three it missed
were not scattered — they were consecutive links in one chain: `renderElement`
calls `ShapeCache.generateElementShape`, which returns a cached shape from a
WeakMap, or calls `_generateElementShape` when the cache is empty. The agent
found the top of the render path and never reached the bottom of it.

That run is committed, with both arms' full answers, at
`modules/benchmark/results/run-1787085544741.json` in the ContextGraph
repository. I'll come back to what the other arm did.

## The thing grep can't tell you

Look at what actually went wrong. The agent didn't fail to find files. It found
`renderElement.ts` — it named the function, correctly, in its answer. What it
failed to do was follow one edge: from a call site at
`packages/excalidraw/renderer/renderElement.ts:811` to a declaration in
`packages/excalidraw/scene/ShapeCache.ts`.

That edge is the answer. And it is precisely the thing the tools it had cannot
give it.

`grep` returns files containing a string. `ripgrep` returns the same files
faster. Embedding search returns chunks whose vectors sit near the question's
vector — still locations, ranked by resemblance. All three answer *where does
this word appear*. None of them answers *what does this symbol call, and what
calls it*, because none of them ever resolved a reference to a declaration. They
work on text. A call graph is not a property of text; it's a property of text
after you've parsed it and worked out which of the several same-named
declarations in the repository this particular call site actually means.

So the agent does what you'd do with only grep: it greps, opens a file, reads it,
finds a call it doesn't recognise, greps for that, opens another file. Every hop
costs a tool call and a few thousand tokens of file content it mostly doesn't
need. Deep chains cost the most hops, which is why the agent above ran out of
budget exactly three links from the answer rather than one.

## What ContextGraph is

ContextGraph parses your repository into a graph of symbols and the resolved
edges between them, stores it in local SQLite, and serves it to an agent over the
Model Context Protocol.

Source files go through tree-sitter — grammars ship for Kotlin, Java, TypeScript,
TSX, JavaScript, Python, Swift, Objective-C and Go — and are walked for
declarations. References that can't be resolved inside a single file are held and
settled afterward against the whole repository. Markdown, PDFs, SQL schemas and
config files land in the same graph, so a design doc and the code implementing it
end up connected rather than merely adjacent.

Then one MCP tool, `contextgraph.explore`, takes a natural-language question and
returns, in a single call: the modules that matched, the relevant symbols **with
their verbatim source**, the resolved edges around each one, and the blast radius
— what breaks if you change them.

Not pointers. The source.

## The same question, with the graph

The run I opened with had a second arm. Same question, same model, same pinned
Excalidraw checkout, same tool-call ceiling of 40. The only difference: this
working copy had been indexed, and the agent had ContextGraph's MCP tools
alongside its shell.

It used four tool calls. It read zero files. It spent 193,178 input tokens and
19.7 seconds, and it got five of the six facts — including the entire
`ShapeCache` chain the other arm never reached:

> For generating roughjs shapes, `renderElement` calls
> `ShapeCache.generateElementShape` (from `packages/excalidraw/scene/ShapeCache.ts`).
> This function either fetches the cached shape or generates a new shape using
> `_generateElementShape`.

Zero file reads is the part worth sitting with. It named `ShapeCache.ts`, named
the function inside it, and described the caching behaviour without opening a
single file — the file-read count recorded for that arm is zero. The graph
already held the edge and the verbatim source of what sat on the other end of it.

Every figure above — 4 against 40 tool calls, 0 against 10 file reads, 193,178
against 944,460 input tokens, 19.7 against 269.6 seconds, 0.833 against 0.500
accuracy — is in that one committed JSON file, scored by a judge model against
six gold facts each pinned to a `file:line` in the source.

**Now the caveats, because that comparison is one question.** n = 1. One
question, one repeat, no variance. The efficiency gap is clean — four calls
against forty is not a rounding error. The accuracy gap is a weaker claim: the
control arm hit its ceiling, so 0.500 is a floor, not its true score. It might
have done better with more budget. And the project's own walkthrough of this run
(`modules/benchmark/ornek-kosu-excalidraw-q3.md`) records that an earlier version
of the measurement showed a gap roughly twice as large — 0.83 against 0.00 —
because hitting the ceiling used to end the run entirely instead of just the tool
phase, silencing the control arm. About half the original difference was the
measurement's fault. It was fixed; 0.500 is what the corrected instrument reads.

I'm telling you that because it's the sort of thing a benchmark author notices
and quietly doesn't mention.

## What comes back

Here is the shape of an `explore` response. The fields are exactly the ones
defined in `ExploreEngine.kt`; the values are illustrative rather than a captured
run — the symbol and the file it points at are real, the line numbers and the
token count are not:

```json
{
  "question": "how does an element get drawn onto the canvas?",
  "tokenBudget": 15000,
  "estimatedTokensUsed": 11840,
  "blastRadiusConfidenceFloor": 0.8,
  "modules": [ { "name": "...", "path": "...", "description": "...", "score": 9.0 } ],
  "symbols": [
    {
      "id": "packages/excalidraw/scene/ShapeCache.ts#ShapeCache.generateElementShape",
      "nodeType": "Method",
      "path": "packages/excalidraw/scene/ShapeCache.ts",
      "lineStart": 60, "lineEnd": 78,
      "elided": false,
      "source": "<the declaration's verbatim source, lineStart..lineEnd>",
      "edges": [
        { "type": "Calls", "direction": "incoming",
          "nodeId": "packages/excalidraw/renderer/renderElement.ts#renderElement",
          "confidence": 0.93, "rung": "file_imports" }
      ],
      "blastRadius": [
        { "label": "renderElement", "hops": 1,
          "viaEdgeType": "Calls", "confidence": 0.93 }
      ]
    }
  ],
  "truncated": false
}
```

The response is packed to a token budget — 15,000 by default, overridable per
call. Top-ranked symbols carry full source; once the budget is spent, the rest
carry signature and location and are marked `"elided": true` rather than being
silently dropped. A question that matches nothing returns `"empty": true`, not an
error. Each call ranks at most 40 candidate symbols and shows at most 20 edges
per symbol, so one hub symbol can't swallow the response.

Note the two fields on that edge: `confidence` and `rung`. They come back below,
because they are the most deliberate thing in this design.

## Four decisions that look arbitrary until they aren't

There are four choices in this design that a reader skims past as implementation
detail: how symbols are identified, what gets written onto an edge, why there's
one enormous tool instead of a tidy set of small ones, and why the whole thing is
a file rather than a service. Each is load-bearing, and each exists to prevent a
specific failure. Here they are with the failures.

## Symbol identity is per declaration site, not per name

A node's id is the repo-relative path plus the scope chain that reaches it:
`Auth/UserService.java#UserService.save`. That's `DeclarationSiteId` in
`modules/tree-sitter`.

Why it matters: the benchmark corpus includes Keycloak, whose index holds 72,147
method declarations. `ConfidenceDefaults.kt` names the collisions it expects in a
codebase that size — `save`, `execute`, `handle`, `process`. If identity is the
bare name, every method called `save` collapses into one node, and every call to
any of them becomes an edge to that node. You don't get a call graph. You get a
hairball that is confidently, uniformly wrong, and an agent reading it can't tell
— the wrong edges look exactly like the right ones.

The format has a second property that's easy to miss: it derives only from the
file path and the declaration's position in the syntax tree. Nothing generated —
no timestamps, no database row ids — so re-indexing unchanged source produces the
identical id. Graphs stay comparable across rebuilds.

## Every edge records which rung resolved it, and how confident that was

A call site names something. Which declaration does it mean? `ResolutionLadder`
descends four rungs, stopping at the first that matches anything:

1. **Local scope** — the candidate is the referring declaration itself
   (self-recursion), is nested inside it, or shares its immediate enclosing type.
2. **File imports** — the candidate's file basename appears in something the
   referring file imports.
3. **Same directory** — the candidate's file sits beside the referring one.
4. **Repo-wide unique name** — everything left over.

Each rung carries a confidence: 0.97, 0.93, 0.87, 0.80 when the rung matched
exactly one candidate; 0.75, 0.65, 0.55, 0.45 when it matched more than one. The
eight values in `ConfidenceDefaults.kt` are one strictly decreasing sequence, so
a threshold of 0.8 cleanly separates unambiguously-resolved call edges from
ambiguous ones, and a higher rung always beats a lower one regardless of
ambiguity.

Here is why this is the decision I'd defend hardest. Every code graph guesses.
Cross-file resolution without a compiler is guessing — the only question is
whether the tool admits it. ContextGraph writes the guess's provenance onto the
edge, so an agent reading `"rung": "local_scope", "confidence": 0.97` and an
agent reading `"rung": "repo_unique_name", "confidence": 0.45` are being told two
different things. A tool that returned both as "a call edge" would be handing
over a certainty and a hunch with the same face on.

Resolution also declines to guess when guessing is hopeless. A rung yielding more
than three candidates emits **no edge at all** — a named constant,
`CALL_RESOLUTION_CANDIDATE_CAP`, precisely so it isn't a buried literal. Rather
than a hairball of plausible-looking `save` edges, you get an absence, which is
at least honest.

And it's deliberately one uniform string-based algorithm across every language,
with no per-language special-casing. A language whose import syntax doesn't line
up with file paths — Python relative imports, Swift protocol witnesses — resolves
worse at rung 2, and the ladder's answer is that this is the honest signal, not a
defect to paper over. You can see it in the confidence.

## One fat tool instead of eleven thin ones

The MCP server exposes eleven tools. Ten of them do one thing each: search nodes,
get a node, expand a neighbourhood, find a path, fetch evidence, run impact
analysis, list related files, build a context bundle, index a project, generate a
report. `explore` does all of it in one call, and the documentation says outright
to prefer it for almost every question.

That's an odd thing to build. You've written ten tools and then told people not
to use them.

The reasoning is stated in the repository as: agents choose badly among many
similar tools, and chaining thin calls costs more than one fat call. The chaining
half is the one the failing arm above shows directly — forty tool calls, each a
round trip, each carrying a chunk of file content that mostly wasn't needed. The
choosing half is an argument rather than a measurement here, and it goes like
this: `search_nodes`, `build_context`, `related_files` and `expand_node` all
plausibly answer "find me the code about X", the differences between them only
become obvious once you've used all four, and an agent picking one under
uncertainty in a single shot gets a partial answer that looks complete enough to
act on.

Ten thin tools is a nicer API. It's a worse tool for a caller that has to pick
one under uncertainty, in one shot, without being able to ask what the
differences are.

The ten remain for when you know exactly what you want — `impact_analysis` when
the only question is what calls X, and nothing else.

## Local SQLite, not a service

The graph is a SQLite file under `.contextgraph/` in your project. No service to
run, no account, no upload. LLM calls happen only if you enable them — semantic
extraction is off by default, and CI enforces that the rest of the system works
without it.

The obvious reason is the one you already thought of: your proprietary source
doesn't leave the machine, and there's no vendor between you and your own code.

The less obvious reason is operational. A graph that lives in a service has to be
reachable, authenticated, versioned against your checkout, and correct about
which branch you're on. A graph that's a file next to your code is on the branch
you're on because it's on the branch you're on. It gets stale the way a build
directory gets stale — visibly, locally, fixed by re-running one command.

And SQLite is genuinely enough. FTS5 does the full-text search. Re-indexing skips
unchanged files by checksum. `mcp bind` prints a `.mcp.json` block that names
`contextgraph` on `PATH` and resolves the project root at launch, so committing
it works for everyone on the team regardless of where they cloned to.

The costs are real too, and I'd rather name them than let you find them: a
1.58 GB index for Keycloak is a large file to have sitting in a working tree, and
SQLite serialises writers at the file level, so ingest is single-writer by
construction.

## What the retrieval measurement actually says

Everything in this section comes from
`modules/benchmark/results/four-way/BENCHMARKS.md`, which is generated from the
run's own result document rather than hand-written. It is a four-way retrieval
benchmark: 33 questions across four repositories — cal.com, Excalidraw, gin and
Keycloak — asked of ContextGraph, CodeGraph 1.5.0, plain `grep` from the base
system, and `ripgrep`. There is no LLM anywhere in the loop, so the same corpus
and questions produce the same numbers every time. Every side gets the same raw
question text, is scored against the same expected files (derived from each
question's own gold facts), and has its output scored in its own emission order
with no re-ranking.

Pooled over the 29 headline questions, ContextGraph leads every metric: MRR 0.502
against CodeGraph's 0.326 and 0.218 for both text-search sides; recall@10 46.0%
against 28.0% and 35.1%; precision@5 20.0% against 12.4% and 11.0%.

**And now the rows it loses**, because a pooled mean is not a verdict.

On **gin**, CodeGraph leads MRR — 0.813 against ContextGraph's 0.719. The
per-question breakdown is blunter than the mean: across gin's eight questions,
CodeGraph ranks a gold-cited file higher on four, ContextGraph on one, and they
tie on three. ContextGraph does lead that repository's recall@10, 92.7% against
83.3%, and I'd rather say so than leave you with half the row.

On **Keycloak**, plain `grep` leads recall@10 — 39.6% against ContextGraph's
17.3%. That one deserves to be stated without cushioning: on the largest
repository in the corpus, and the only Java one, a stock shell with nothing
installed retrieved more of the right files than the index did, and the index
cost 4m 14s and 1.58 GB to build first.

On **excalidraw-q8**, no side found a gold-cited file at all — not ContextGraph,
not CodeGraph, not grep, not ripgrep. A row like that says something about the
question, not about any of the tools.

There's a second finding that undercuts the framing more quietly. `grep` and
`ripgrep` produce **identical figures on every one of the 45 aggregate numbers**
the report computes. They're genuinely two independent measurements — 12 of 33
questions produce different ranked lists — but the differences all sit deep in
the tail, past every `k` measured. Which means ripgrep's engineering, its ignore
awareness and tuned matcher, bought nothing on this corpus that a base-system
shell didn't already reach. The margin over ripgrep is a margin over `grep`. The
baseline should be read as a plain one, not a strong one.

One number that isn't a scoring metric but caps all of them: an index can't
retrieve a file it never indexed. ContextGraph's indexes hold every gold-cited
file on all four repositories — 19/19, 21/21, 10/10, 26/26. CodeGraph's hold
9/19 on cal.com, 17/21 on Excalidraw, 10/10 on gin, 22/26 on Keycloak. Both
text-search sides reach every file by construction, since they read the working
tree. That coverage gap is part of why CodeGraph's scores are what they are, and
it's published alongside the scores rather than after them.

## What it costs to build

From the same run. On cal.com, ContextGraph's index took 1m 38s and 268.6 MB
against CodeGraph's 1m 25s and 306.7 MB. Excalidraw: 22.9s and 32.7 MB against
17.8s and 36.5 MB. gin: 2.2s and 8.1 MB against 899ms and 7.9 MB. Keycloak:
4m 14s and 1.58 GB against 1m 53s and 811.6 MB.

**ContextGraph is slower to index on every repository where both indexes were
built** — 1.15× on cal.com, 1.29× on Excalidraw, 2.40× on gin, 2.24× on Keycloak
— and on Keycloak it takes 1.95× the disk. Both text-search sides have no ingest
step at all and pay nothing before the first query. That's the number every score
above is really being compared against.

It used to be far worse, and the repair is instructive. Keycloak's ingest once
took 142 minutes 55.6 seconds. The cause, found with a flight recording rather
than guessed at, was that the storage layer opened, prepared, executed and closed
a separate SQLite connection for **every individual row** — and Keycloak's index
is 234,090 nodes, 622,541 edges, 234,523 provenance rows and 508,017 unresolved
references, about 1.5 million rows. 87.4% of the profile was inside SQLite's
native calls, and 31.0% was opening, closing and preparing: setup and teardown
doing no work at all.

Batching the writes — that, and two smaller fixes on the same path — took that
run to 8 minutes 16.4 seconds. The document
reporting it (`docs/ingest-cost.md`) does not claim 17.3× flatly; it reports a
range of **9.6× to 17.3×**, because the host's one-minute load average moved
between 6 and 140 during the session and the low end compares against the
after-run that ran under constant heavy load. It also verifies that the resulting
graph is byte-identical to the old one, table for table, so nothing was traded
away for the speed.

Two things stop that from being a victory lap. The 4m 14s quoted a few paragraphs
up is the four-way run's own measurement on its own corpus and machine — not a
further speed-up stacked on the 8m 16.4s. And the same document's closing section
lists
what it measured and chose not to fix: edge storage is 56% of the Keycloak index,
where a mean edge id runs 279 characters because it's the literal concatenation
of the source and target declaration-site ids, which are also stored in their own
columns and again in two indexes over them.

## Where the ranking came from, and what's still wrong with it

Worth knowing, if you're weighing whether the retrieval numbers are a fluke.

ContextGraph used to place **last on every retrieval metric**, behind both
ripgrep and CodeGraph. The defect was that ranking wasn't a function of the
query: candidates were sorted by graph centrality times confidence, which
produces the same order no matter what you asked. A published ablation
(`docs/retrieval-ranking-ablation.md`) moved MRR from 0.1328 to 0.4815 on nine
Excalidraw questions, past ripgrep's 0.1400 and CodeGraph's 0.2444 — and three
quarters of that improvement came from one change: letting the search layer's own
ordering reach the final sort.

Six signals were tried. Three shipped. Three didn't, and were removed rather than
left in as dead weight — including one, a "kind ladder", that measured neutral
when it was added and turned out to be actively harmful once another signal
landed: removing it took MRR from 0.4259 to 0.4815.

A later change closed the remaining distance to the 0.556 the four-way run
reports for Excalidraw: a dedicated lookup from an identifier's sub-words back to
the names containing them, materialised at index time. Sub-word matching is what
lets a search for "auth" reach `refreshAuthToken`, and the table moved MRR from
0.4815 to 0.5556. It is priced, not free: on Excalidraw it cost about 17% more
index and roughly 37% more ingest time; on Keycloak, 26.7% more ingest time for
1.9% more disk. Whether that's a good trade is a judgement, and the document that
measured it (`docs/identifier-segment-vocabulary.md`) prints the cost in the same
paragraph as the gain so you can make it yourself.

The finding I'd most want you to see is the one the ablation reports against
itself. Its section 5 identifies a defect it did not fix and says the next change
to make is not another ranking signal: an intent classifier picks which node
types to seed the search with, and on four of those nine questions it routes to a
filter whose candidate set **structurally cannot contain the answer**. One
question is restricted to Concept, Claim and Methodology nodes — types that in a
code repository live almost exclusively inside markdown — so all ten of its slots
are prose, and its reciprocal rank is 0.000 before and after everything that run
did.

That defect is, as far as this article's sources say, still open.

## The limits, in one place

- **Four repositories, 33 questions.** The report's own words: four repositories
  are not "code in general."
- **The questions and the gold facts were written by the project being
  measured.** The report names this as the single largest thing a reader should
  discount for, and it's right to.
- **One run per figure.** No repeats, no variance bars, on either axis. Ingest
  was timed once per repository per tool, on one machine, under moving load.
- **The retrieval axis measures which files a tool puts in front of you** — not
  what an agent then does with them. The agent-level axis is measured separately
  and never mixed with it.
- **The agent-level comparison in this article is a single question.** One
  question, one repeat, an accuracy figure that is a floor because the losing arm
  hit its ceiling.
- **Embedding search was not measured.** The four sides are ContextGraph,
  CodeGraph, `grep` and `ripgrep`. The argument earlier in this piece about why
  embedding search can't return resolved edges is a structural one about what
  vector similarity over text can compute — not a measured result, and I'd rather
  say so than let the surrounding numbers imply otherwise.
- **The comparison is against one other graph tool, at one version** —
  `@colbymchenry/codegraph` 1.5.0, driven through its own `explore` command.
- **The tool loses rows.** gin's MRR to CodeGraph. Keycloak's recall@10 to plain
  `grep`. Those are results, not exceptions to results.
- **It costs more to build than what it's compared against**, on every repository
  where both were built.

## Trying it

```bash
brew tap erenalpaslan/contextgraph
brew trust erenalpaslan/contextgraph
brew install contextgraph
```

macOS arm64 and Linux x64. The formula brings its own JDK 17, so no system Java
is needed. The middle line isn't optional — Homebrew 5.1.15 and later refuse to
load a formula from a third-party tap until that tap is trusted. Every release is
also on Maven Central as a single self-contained jar if you'd rather run it
directly.

```bash
cd /path/to/your/project
contextgraph init
contextgraph index .
contextgraph mcp bind > .mcp.json
```

That last file is worth committing: it names `contextgraph` on `PATH` rather than
one machine's absolute path, and resolves the project root at launch, so it works
for every developer on the team and from whichever directory they start their
agent in.

Then ask your agent something with a chain in it. Not "where is the login code" —
grep is fine at that. Ask it what happens between the button and the database,
and watch whether it has to open ten files to find out.

## Where the numbers came from

Every figure in this article is in one of these, in the ContextGraph repository:

- `modules/benchmark/results/run-1787085544741.json` — the two-arm agent run:
  both answers in full, the six gold facts with their `file:line` evidence, and
  every token, tool-call, file-read, duration and accuracy figure quoted here.
- `modules/benchmark/ornek-kosu-excalidraw-q3.md` — that run walked through,
  including the ceiling correction. Written in Turkish.
- `modules/benchmark/results/four-way/BENCHMARKS.md` — the retrieval benchmark:
  methodology, every side's flags, per-repository and per-question breakdowns,
  gold-file coverage, ingest costs, and every place the project loses.
- `docs/benchmarks/index.html` — the same run as a page you can sort and filter.
  Generated from the same result document, needs no server.
- `docs/ingest-cost.md` — the 142m 55.6s → 8m 16.4s repair, the flight-recording
  profile behind it, the honest range, and what it deliberately did not fix.
- `docs/retrieval-ranking-ablation.md` — the ranking ablation, every signal that
  shipped and every one that didn't, and the seed-filter defect it names as more
  important than anything it fixed.
- `docs/identifier-segment-vocabulary.md` — the sub-word lookup table, what it
  bought, what it cost, and two mechanisms inside it that were measured, found to
  earn nothing, and removed.
- `modules/mcp-server/src/main/kotlin/io/contextgraph/mcp/ExploreEngine.kt` — the
  response shape, the token budget, the elision rule, the candidate and edge caps.
- `modules/ingest/src/main/kotlin/io/contextgraph/ingest/ResolutionLadder.kt` and
  `modules/core/.../ConfidenceDefaults.kt` — the four rungs, the eight
  confidences, and the candidate cap.
- `modules/tree-sitter/src/main/kotlin/io/contextgraph/treesitter/DeclarationSiteId.kt`
  — the identity format.

The project is at
[github.com/erenalpaslan/context-graph](https://github.com/erenalpaslan/context-graph),
MIT licensed.
