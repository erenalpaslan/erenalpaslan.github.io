---
title: "Graphify, CodeGraph, ContextGraph: what actually differs"
description: "Three tools sell the same promise — parse your repository into a graph so your agent queries structure instead of grepping. What separates them is what they will even read, and what they refuse to guess. I wrote one of the three, so weigh the third section accordingly."
pubDate: 2026-08-26
tags: ["contextgraph", "codegraph", "graphify", "code-search"]
category: "Comparison"
heroImage: "/images/graphify-codegraph-contextgraph-what-differs/banner.png"
draft: false
---

![](/images/graphify-codegraph-contextgraph-what-differs/banner.png)

### All three parse your repo into a graph. What separates them is what they will even read, and what they refuse to guess.

Three tools now sell the same promise. Point them at a repository, they parse it
into a graph of symbols and edges, and your coding agent queries that graph
instead of grepping its way through files one at a time. Graphify, CodeGraph and
ContextGraph all describe themselves roughly that way, and all three READMEs are
written in the register of a launch.

**I wrote ContextGraph.** That is not a disclaimer I can put in a footnote and
move past, so here is what I've done about it: everything below is *read* — every
claim traces to a file in that project's own repository, and where I have a
measurement it lives in [a separate
post](/writing/your-agent-needs-the-edges-between-files/) rather than in a table
next to my competitors. A feature described in a README is not a benchmark
result, and I've tried hard not to let one become the other by adjacency.

Versions matter, because all three ship constantly. Everything below was read on
**26 August 2026**: Graphify at v0.9.50 on its `v8` branch, CodeGraph's latest
release v1.6.0, ContextGraph as it stood the same day.

By the end of this you will be able to:

- Rule out at least one of the three in under a minute, on the only axis that
  decides it — what's actually in your repository
- Tell which of the remaining two you can trust with a call graph, by what each
  one does when it isn't sure

### The three, in one paragraph each

**Graphify** (`Graphify-Labs/graphify`, Apache-2.0, PyPI `graphifyy`) is a Python
tool whose primary delivery is a *skill*, not a server: run `graphify install`,
then type `/graphify .` inside Claude Code, Cursor, Codex, Gemini CLI or any of
the twenty-plus assistants its installer targets. Code is parsed locally with
tree-sitter and no LLM; video and audio are transcribed locally with
faster-whisper; docs, PDFs and images go through your assistant's model for a
semantic pass. The output is a directory — `graph.json`, an interactive
`graph.html`, a `GRAPH_REPORT.md` — and the project's advice is to commit it so
the whole team starts with the same map.

**CodeGraph** (`colbymchenry/codegraph`, MIT, npm `@colbymchenry/codegraph`) is a
code-only indexer with a native Rust parsing kernel. `codegraph init` builds a
per-project SQLite graph and starts watching the tree. Its framing is that the
agent should stop crawling files entirely: one call returns the relevant symbols'
verbatim source, the call paths between them, and a blast-radius summary.

**ContextGraph** (mine) parses code with tree-sitter and puts Markdown, PDFs, SQL
schemas and config files into the *same* graph, so a design document and the code
implementing it are connected rather than merely co-located. Local SQLite with
FTS5, served over MCP. Its primary tool, `explore`, answers a natural-language
question in one call.

### What each one will even read

This is where the three separate first, and for most people it decides the choice
before any of the rest matters.

| | Code | Everything else |
|---|---|---|
| **CodeGraph** | 34 languages, 20 in a compiled Rust kernel — including COBOL, Erlang, Solidity, Terraform, Nix, VB.NET, ArkTS | Nothing. Code only. |
| **Graphify** | ~40 languages by its own README — Zig, Julia, Fortran, Elixir, Groovy, PowerShell, SystemVerilog among them | Markdown, reStructuredText, HTML, `.docx`, `.xlsx`, PDFs, images, MP4/MOV/MP3/WAV, YouTube URLs, MCP configs, package manifests |
| **ContextGraph** | 9 — Kotlin, Java, TypeScript, TSX, JavaScript, Python, Swift, Objective-C, Go | Markdown, PDF, SQL schemas, config files, in the same graph as the code |

Neither language table contains the other, so "widest" depends on your stack. But
the shape of the difference is clear: ContextGraph's nine is by some distance the
narrowest, and it is the list most likely to be missing yours.

CodeGraph does two things on top of its table that neither other tool documents.
It recognises web-framework routing files across **17 frameworks** and emits
`route` nodes linked to their handlers, so asking who calls a controller surfaces
the URL that binds it. And it bridges cross-language boundaries static parsing
normally stops at — Swift to Objective-C through `@objc` rules, JavaScript to
native through the React Native bridge, TurboModules, Expo Modules and Fabric —
tagging each synthesized edge `provenance: 'heuristic'`.

Graphify does something else nobody else does: `# NOTE:` and `# WHY:` comments,
docstrings and ADR/RFC citations become first-class nodes linked to the code they
explain. It also runs Leiden community detection and reports "god nodes" — the
most-connected concepts. Neither of the other two will tell you what your
codebase's subsystems *are*; Graphify tries to.

If your corpus includes a recorded meeting or a PDF spec, this axis has already
decided for you, and the answer is Graphify.

### How each decides two `getName`s are different things

Two `getName` methods in two different classes are two different things. How a
tool encodes that determines what it can never get right afterwards, so it is
worth more attention than it usually gets.

**ContextGraph** builds every declaration's identity from its repo-relative path
plus its tree-sitter scope chain: `Auth/UserService.java#UserService.save`.
Nothing merges by name, deliberately. Two files declaring the same class name
always produce two identities because the path differs. On the Keycloak index
built for the benchmark that matters concretely — 72,147 method declarations,
with `save`, `execute`, `handle` and `process` colliding exactly as you'd expect.
Merge by name there and you don't get a call graph, you get a hairball that is
uniformly, confidently wrong, and an agent reading it can't tell.

The identity also derives *only* from the path and the declaration's position in
the syntax tree — nothing generated, no timestamps, no row ids — so re-indexing
unchanged source produces the identical id and graphs stay comparable across
rebuilds.

Then, because a call site names something rather than pointing at it, resolution
descends a four-rung ladder and stops at the first rung that matches: local
scope, then the referring file's imports, then the same directory, then a
repo-wide unique name. Each rung carries a confidence — 0.97, 0.93, 0.87, 0.80
when it matched exactly one candidate, and 0.75, 0.65, 0.55, 0.45 when it matched
more than one. One strictly decreasing sequence of eight, so a threshold of 0.8
cleanly separates unambiguously-resolved edges from ambiguous ones. Both the rung
and the confidence are written onto the edge, which is the point: an agent
reading `"rung": "local_scope", "confidence": 0.97` is being told something
different from one reading `"rung": "repo_unique_name", "confidence": 0.45`.

**CodeGraph's** `nodes` table carries an `id` alongside separate `name`,
`qualified_name` and `file_path` columns, and its resolution is name-matching at
the core. What makes this worth reading rather than guessing at is that the
project has documented exactly where that approach failed it: before its
chained-call work, every statically-typed language dropped the receiver from
`Foo.getInstance().bar()` and name-matched the bare `bar` — and in seven of nine
languages it silently attached the edge to a same-named method on an unrelated
type. Their words: "a correctness bug, not just missing coverage." The fix
captures the factory's declared return type and validates that the method
actually exists on the inferred type or a supertype. It shipped for thirteen
languages; TypeScript and Luau were evaluated and deliberately skipped, because
both are gradually typed and the mechanism measured neutral-to-negative on real
code. Publishing a per-language table that includes the languages where the
answer was "don't ship it" is not what a marketing document does.

**Graphify's** node record, per its `ARCHITECTURE.md`, is `{id, label,
source_file, source_location}`, and its query surface addresses nodes by name:
`graphify explain "APIRouter"`. That same document carries a warning I haven't
seen the equivalent of elsewhere: node ids are derived relative to a `root`, and
if you call `extract()` without passing one, `root` is inferred from the paths
you handed it — so ids "can end up carrying path segments from the machine they
were extracted on." For a graph designed to be committed to git and shared, that
is exactly the right thing to warn about. A build-time dedup step merges ghost
duplicates from the AST and semantic passes, with `--dedup-llm` to bring a model
in as a tiebreaker and `--no-dedup` to skip it.

Short version: ContextGraph's identity is structural and never merges; Graphify's
is a string plus a dedup pass you can tune or disable; CodeGraph's is
name-matching that has been progressively hardened, language by language, with
the regressions measured.

### What each one refuses to do

The refusals tell you more about a tool's judgement than the feature list does.

**ContextGraph** will not emit a `Calls` edge when a resolution rung yields more
than three candidates — a named constant, described in the code as a precision
guard rather than an optimisation. The alternative is a hairball of guesses on
exactly the names enterprise codebases collide on most. You get an absence
instead, which is at least honest. It will not merge two same-named declarations.
It skips files that look like secrets and files over 10 MB, and its watcher is
off unless you turn it on.

**CodeGraph** will not emit a chained-call edge whose inferred receiver type does
not actually carry the method, walking supertypes to check. Its design note is
unambiguous about the intent: "a wrong inference yields no edge, never a wrong
one." It skips `node_modules`, `vendor`, `dist`, `build`, `target`, `.venv`,
`Pods` and `.next` even with no `.gitignore` at all, and files over 1 MB. It also
has a third option between indexed and excluded that I wish the others had:
paths under `deprioritize` in `codegraph.json` stay indexed and findable but stop
outranking first-party code — for the `scripts/` tree full of helpers named `run`
and `status` that would otherwise win every exact-name match.

**Graphify** refuses to overwrite a good graph with a bad one, twice over. If an
extraction pass crashes or a walk can't fully read the corpus, it won't overwrite
a larger existing `graph.json` with the partial result — `--allow-partial` if you
mean it. And if a rebuild simply produces *fewer nodes* than the graph already on
disk, it refuses that too, on the grounds that this is usually a mistake rather
than a refactor — `--force` if it isn't.

One refusal that isn't there, and is worth knowing before you install rather than
after: **CodeGraph collects anonymous usage telemetry, and it is on unless you
turn it off.** Its README and `TELEMETRY.md` document the fields — which tools
and commands get used, which languages get indexed — state that code, paths, file
and symbol names, queries and IP addresses are never sent, aggregate locally into
daily totals first, and publish the ingest endpoint as code in the same
repository. The installer asks up front, and `codegraph telemetry off`,
`CODEGRAPH_TELEMETRY=0` or `DO_NOT_TRACK=1` all disable it. Graphify's README
states no telemetry. ContextGraph's states SQLite on your disk, no upload.

### How the answer reaches your agent

**CodeGraph is the only one whose freshness is on by default.** A native
OS-event watcher re-indexes after a debounce window, and two things around it are
worth the read whichever tool you pick, because they're the failure modes every
incremental indexer has. During the debounce window, an MCP response that would
reference a still-pending file prepends a banner naming it — so the agent is told
the answer is stale rather than silently given a stale one. And on reconnect it
runs a size/mtime plus content-hash reconciliation before answering, which
absorbs the edits made while no server was running.

**Graphify's** answer is the distinctive one, and it follows from the format:
`graph.json` gets committed to git, and `graphify hook install` sets up a merge
driver that union-merges it so two developers committing in parallel never see
conflict markers. A JSON file can be committed, diffed and merged; a SQLite
database realistically cannot. ContextGraph reaches the same goal from the other
direction, by making CI rebuild the index and publish it as a build artifact.

**ContextGraph** serves over MCP, where `explore` returns matched modules, symbols
with verbatim source, the resolved edges with their rung and confidence, and
blast radius — packed to a token budget, with lower-ranked symbols marked
`elided` rather than silently dropped.

### What was measured, and what wasn't

Everything above this line was **read**, not measured, and none of it should be
taken as a benchmark result.

There is a measurement, and it lives in [the companion
post](/writing/your-agent-needs-the-edges-between-files/): 33 questions over four
pinned repositories, no LLM in the loop, covering ContextGraph, CodeGraph 1.5.0,
base-system `grep` and ripgrep — including the repositories where my tool loses,
and the fact that it costs more to build than everything it's compared against.

**Graphify is not in it. It was not measured, at all, on anything.** Not for lack
of time: that instrument scores a ranked list of files, and Graphify's surface is
a different shape — `graphify query` returns a scoped subgraph. Turning that into
a ranked file list means writing a projection, and the projection would be mine,
written by the author of a competing tool, deciding on Graphify's behalf which of
its nodes count as "the files it put in front of you." Every fairness property
the instrument has would rest on a judgement call I'm the wrong person to make.
Graphify has no row because it has no result, not because it scored badly.

Both comparators publish their own numbers, on their own instruments. CodeGraph
publishes a seven-repository agent A/B — 88% fewer tool calls, file reads to zero
— measured carefully enough to block its own CLI in *both* arms, because on an
unblocked harness the control agent found the CLI and reached CodeGraph through
Bash in 26 of 28 runs. Graphify publishes LOCOMO and LongMemEval-S results —
0.497 recall@10 against mem0's 0.048 — which are conversational-memory
benchmarks, not code retrieval, and it doesn't present them as such. Three
projects, three instruments, three different questions, and one of the three
instruments is mine.

### How I would actually choose

![](/images/graphify-codegraph-contextgraph-what-differs/diagrams/how-to-choose.png)

**If your repository is code and you want the graph fresh with no ceremony, take
CodeGraph.** Its language table is the most detailed of the three about what each
entry actually yields, it's the only one extracting framework routes or bridging
Swift/Objective-C/React Native, it's zero-config, and its watcher is on by
default with a documented staleness banner. The measurement says its index is
cheaper to build than mine on every repository. It also says it indexed 9 of 19
gold-cited files on cal.com — which is what "code-only" costs on a repository
whose answers live partly in migrations and docs.

**If your corpus is not only code, take Graphify.** It's the only one of the three
that will read a PDF, a `.docx`, an image or a recorded meeting; the only one
turning `# WHY:` comments and ADR citations into first-class nodes; the only one
that detects communities and names your subsystems. Committing `graph.json` with
a union merge driver is a better answer to "everyone should have the same map"
than either SQLite-based tool has. It wasn't measured here — weigh it on its
documentation and your own trial, not on anything I've written.

**Take ContextGraph if you need to know why an edge exists and how much to trust
it.** Every resolved call edge carries its rung and confidence; identity is
per-declaration-site and never merged; over-ambiguous edges are refused rather
than guessed. It also has the narrowest language support of the three and costs
more to index on every repository measured.

And the option nobody sells: **if your repository is small and your questions name
real symbols, `grep` is not embarrassing.** On the corpus I measured it did
everything ripgrep did at every scored position, and on Keycloak it beat my index
on recall while paying nothing to build one. An index has to earn its cost
against that, and it doesn't earn it everywhere.

### Wrapping up

The three don't really compete on quality — they compete on what they'll read and
what they'll admit they don't know. Answer those two questions about your own
repository and the choice mostly makes itself.

If you want the argument for why any of this beats grep in the first place, with
numbers attached, that's [the companion
post](/writing/your-agent-needs-the-edges-between-files/).

---

*Every claim about Graphify and CodeGraph comes from that project's own repository
or documentation, read on 26 August 2026 —
[Graphify-Labs/graphify](https://github.com/Graphify-Labs/graphify) at v0.9.50 on
`v8`, and [colbymchenry/codegraph](https://github.com/colbymchenry/codegraph) at
v1.6.0. Where a project's documentation doesn't address one of these axes, I've
said so rather than filled the gap. ContextGraph is at
[erenalpaslan/context-graph](https://github.com/erenalpaslan/context-graph), and
the retrieval numbers referenced here are in
`modules/benchmark/results/four-way/BENCHMARKS.md` there.*
