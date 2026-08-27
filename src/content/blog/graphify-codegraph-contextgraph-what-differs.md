---
title: "Graphify, CodeGraph, ContextGraph: what actually differs"
description: "Three tools sell the same promise: parse your repository into a graph so the agent queries structure instead of grepping. Half of this is what I read in their own source; half is one measured retrieval run. They never share a table, and I wrote one of the three."
pubDate: 2026-08-26
tags: ["contextgraph", "codegraph", "graphify", "benchmarks"]
category: "Comparison"
---

Three tools now sell the same promise. Point them at a repository, they parse it into a graph of symbols and edges, and your coding agent queries that graph instead of grepping its way through files one at a time. Graphify, CodeGraph and ContextGraph all describe themselves roughly that way, and all three READMEs are written in the register of a launch.

This piece is an attempt to say what actually differs between them, on axes you can act on.

**I should say up front that I wrote ContextGraph.** That is not a disclaimer I can put in a footnote and move past, because one of the two things in this article is a benchmark I built, on a question set I wrote, scored against gold facts I also wrote. That is the single largest thing to discount for. It is not the only thing: that benchmark has four sides in it and Graphify is not one of them, which I will come back to at length before I print a single number from it.

So the piece is in two halves, and they never share a table.

The first half is **what I read** — a comparison of all three tools, where every claim traces to a file in that project's own repository. The second half is **what was measured** — one retrieval run over a pinned corpus, covering ContextGraph, CodeGraph, base-system `grep` and ripgrep. A feature described in a README is not a benchmark result, and I have tried very hard not to let one become the other by adjacency.

Versions matter here, because all three ship constantly. Everything below was read on **26 August 2026**. Graphify was at v0.9.50 on its `v8` branch; CodeGraph's latest release was v1.6.0, and the benchmark in the second half measured **v1.5.0** — I will flag that again where it bites. ContextGraph is the repository as it stands on the same date.

---

## The three, in one paragraph each

**Graphify** (`Graphify-Labs/graphify`, Apache-2.0, PyPI package `graphifyy`) is a Python tool whose primary delivery is a *skill*, not a server: you run `graphify install` and then type `/graphify .` inside Claude Code, Cursor, Codex, Gemini CLI or any of the twenty-plus assistants its installer targets. It processes a corpus in three passes. Code is parsed locally with tree-sitter and no LLM. Video and audio are transcribed locally with faster-whisper. Docs, PDFs and images go through your assistant's model — or a configured API key — for a semantic pass. The output is a directory, `graphify-out/`, containing `graph.json`, an interactive `graph.html` and a `GRAPH_REPORT.md`, and the project's advice is to commit that directory so the whole team starts with the same map.

**CodeGraph** (`colbymchenry/codegraph`, MIT, npm `@colbymchenry/codegraph`) is a code-only indexer with a native Rust parsing kernel. `codegraph install` wires it into your agents; `codegraph init` builds the per-project graph into a local SQLite database and starts watching the tree. Its README's framing is that the agent should stop crawling files entirely: one call returns the relevant symbols' verbatim source, the call paths between them, and a blast-radius summary.

**ContextGraph** (mine) parses code with tree-sitter, and also ingests Markdown, PDFs, SQL schemas and config files into the same graph, so a design document and the code implementing it are connected rather than merely co-located. It stores everything in local SQLite with FTS5 and serves it over MCP. Its primary tool, `explore`, answers a natural-language question in one call: matched modules, relevant symbols with verbatim source, the resolved edges between them, and blast radius.

---

## What each one extracts

This is where the three separate first, and it is probably the axis that decides the choice for most people.

**CodeGraph is code, and only code.** Its supported-languages table runs to roughly thirty-four entries and includes things the other two do not attempt at all: COBOL with PERFORM and GO TO call edges, Erlang with multi-clause function grouping, Solidity, Terraform/OpenTofu with per-directory scoping, Nix module-system option wiring, VB.NET, CFML, ArkTS for HarmonyOS. Twenty of those languages parse in the compiled Rust kernel; the rest run the same extraction logic on a portable engine. On top of the language table it does two things neither other tool documents. It recognises web-framework routing files across seventeen frameworks and emits `route` nodes linked to their handlers, so asking who calls a controller surfaces the URL that binds it. And it bridges cross-language boundaries that static parsing normally stops at — Swift to Objective-C through `@objc` auto-bridging rules, JavaScript to native through the React Native legacy bridge, TurboModules, Expo Modules and Fabric view components — with each synthesized edge tagged `provenance: 'heuristic'` and a `metadata.synthesizedBy` naming the channel that produced it.

**Graphify is the widest corpus by a distance, and the only one that will read something that is not text.** Its file table covers thirty-seven tree-sitter grammars for code — which is more grammars than CodeGraph's table has rows, and includes several CodeGraph's does not list at all, among them Zig, Julia, Fortran, Elixir, Groovy, PowerShell and SystemVerilog, so neither language table contains the other — plus Markdown and reStructuredText and HTML, plus `.docx` and `.xlsx`, plus PDFs, plus PNG/JPG/WebP/GIF images, plus MP4/MOV/MP3/WAV and YouTube URLs, plus MCP config files and package manifests. It also does something the other two do not: `# NOTE:` and `# WHY:` comments, docstrings and ADR/RFC citations become first-class nodes linked to the code they explain. On top of the raw graph it runs Leiden community detection and reports "god nodes" — the most-connected concepts — which is a genuinely different product idea from the other two. Neither ContextGraph nor CodeGraph will tell you what your codebase's subsystems are; Graphify tries to.

**ContextGraph sits between them.** Nine tree-sitter grammars — Kotlin, Java, TypeScript, TSX, JavaScript, Python, Swift, Objective-C, Go — which is by some distance the narrowest of the three. Against that it puts Markdown, PDF, SQL schemas and config files into the *same* graph as the code, which matters more than it sounds: on the cal.com index built for the benchmark, the census records 14,660 declaration nodes alongside 593 `DatabaseSchema`, 533 `Column`, 126 `DatabaseTable`, 571 `Document` and 130 `Requirement` nodes. A Prisma migration and the TypeScript that reads it end up in one graph.

If your repository is written in a language only one of the three parses, this axis has already decided for you, and ContextGraph's list of nine is the one most likely to be missing yours.

---

## How symbol identity is established

Two `getName` methods in two different classes are two different things. How a tool encodes that determines what it can never get right afterwards, so it is worth more attention than it usually gets.

**ContextGraph** gives every declaration an identity built from its repo-relative path plus its tree-sitter scope chain: `Auth/UserService.java#UserService.save`. Nothing merges declarations by name, deliberately. Two files declaring a class of the same name always produce two different identities because the path differs, and the identity is stable across reindexes of unchanged source because it derives only from the path and the declaration's position in the syntax tree.

**CodeGraph's** `nodes` table carries an `id` primary key alongside separate `name`, `qualified_name` and `file_path` columns, and its resolution machinery is name-matching at the core — `src/resolution/name-matcher.ts`. What makes this worth reading rather than guessing at is that the project has documented, in its own design notes, exactly where that approach failed it: before its chained-call work, every statically-typed language dropped the receiver from `Foo.getInstance().bar()` and name-matched the bare `bar`, and in seven of nine languages it silently attached the edge to a same-named method on an unrelated type. Their words: "a correctness bug, not just missing coverage." The fix now captures the factory's declared return type, keeps the receiver through extraction, and validates that the method actually exists on the inferred type or a supertype it conforms to. That fix has shipped for thirteen languages; TypeScript and Luau were evaluated and deliberately skipped because both are gradually typed and the mechanism measured as neutral-to-negative on real code. Publishing a per-language A/B table that includes the languages where the answer was "don't ship it" is not what a marketing document does.

**Graphify's** node record, per its own `ARCHITECTURE.md`, is `{id, label, source_file, source_location}` — a unique string, a human name, a path, a line. Its documented query surface addresses nodes by name: `graphify explain "APIRouter"`, `graphify path "FastAPI" "ModelField"`. Its architecture doc also carries a warning I have not seen the equivalent of elsewhere and which is worth quoting the shape of: node ids are derived relative to a `root`, and if you call `extract()` without passing one, `root` is inferred from the paths you handed it, so "ids can end up carrying path segments from the machine they were extracted on." For a graph designed to be committed to git and shared, that is exactly the right thing to warn about. There is an entity-dedup step at build time — ghost duplicates from the AST and semantic passes are merged automatically — with `--dedup-llm` to bring a model in as a tiebreaker for ambiguous pairs, and `--no-dedup` to skip it.

The short version: ContextGraph's identity is structural and never merges; Graphify's is a string plus an explicit dedup pass you can tune or disable; CodeGraph's is name-matching that has been progressively hardened, language by language, with the regressions measured.

---

## Whether unresolved references get resolved afterwards, and whether the confidence is recorded

All three resolve references in a pass after extraction. What they record about that pass is where they genuinely diverge.

**ContextGraph** runs a four-rung ladder, and each rung has a fixed confidence attached to it:

| Rung | What it means | Confidence | If more than one candidate matched |
|---|---|---|---|
| Local scope | The candidate is the referring declaration itself, is nested inside it, or shares its immediate enclosing type | 0.97 | 0.75 |
| File imports | The candidate's declaring file appears in what the referring file imports | 0.93 | 0.65 |
| Same directory | The candidate's file sits in the same directory as the referring file | 0.87 | 0.55 |
| Repo-wide unique name | Everything left — every same-name declaration in the repository | 0.80 | 0.45 |

Resolution stops at the most precise rung that matches anything, and every edge records both the rung and the number. The eight values are a single strictly decreasing sequence, so a `minConfidence` of 0.8 cleanly separates unambiguously-resolved call edges from ambiguous ones. There is no per-language special-casing anywhere in it, on purpose — a language whose import syntax does not line up with file paths simply resolves worse at rung two, and that is treated as the honest signal rather than a defect to patch around.

**Graphify** tags every edge with one of three labels: `EXTRACTED` (explicit in the source), `INFERRED` (derived by resolution), or `AMBIGUOUS` (uncertain, and flagged in `GRAPH_REPORT.md` for human review). `EXTRACTED` edges carry confidence 1.0; `INFERRED` edges carry a float from a discrete rubric — 0.95 near-certain, 0.85 strong evidence, 0.75 reasonable, 0.65 weak, 0.55 speculative. The `AMBIGUOUS` label has no counterpart in either of the other two tools, and it is the interesting one: it is the only mechanism among the three that routes uncertainty to a *human* rather than resolving it or dropping it. Worth knowing that the meaning of the `INFERRED` score depends on which pass produced the edge — for code it comes from a deterministic call-graph second pass; for docs, papers and images it is a judgement a language model made.

**CodeGraph** records provenance but not a graded confidence. Its `edges` table, in `src/db/schema.sql`, carries `source`, `target`, `kind`, a JSON `metadata` blob, `line`, `col`, and a nullable `provenance` — there is no confidence column, and its documentation does not describe one. What that table does have, and what neither of the others documents, is a persisted `unresolved_refs` table with a status lifecycle: rows are inserted `pending` by extraction, and a resolution pass either deletes the row because it resolved or marks it `failed` — kept deliberately, with the reference's `name_tail` written alongside it, so that a later incremental sync can retry it when a changed file introduces a symbol that would satisfy it. That is a better answer than either of the other two has to the "the symbol didn't exist yet when I looked" problem, and it falls straight out of a design where the index is expected to stay live rather than be rebuilt.

So: Graphify tells you how much to trust an edge and flags the ones it cannot decide; ContextGraph tells you which rule produced the edge and how much that rule is worth; CodeGraph tells you how an edge got in and keeps the failures around so it can try again.

---

## How results reach an agent

All three speak MCP. They have made three visibly different bets about what an agent should be handed.

**CodeGraph exposes exactly one tool.** `codegraph_explore`, and nothing else, by default. Seven further tools — `codegraph_node`, `_search`, `_callers`, `_callees`, `_impact`, `_files`, `_status` — remain fully functional but unlisted, and you re-enable any of them with a `CODEGRAPH_MCP_TOOLS` environment variable. The stated reason is measured behaviour: one strong tool steers agents better than a menu of narrower ones, with fewer mis-picks, and it saves context every session. The response has a hard byte envelope, capped at 25K characters and tiered by index size — on a 469-file project the documented tier is 18,000 characters of output, 3,800 per file, five files. The server ships its own usage guidance to the agent in the MCP `initialize` response, and a `projectPath` argument lets one session query any indexed project, which makes a partially-indexed monorepo work.

I want to be specific about something here, because it is the clearest example in any of these three repositories of a project publishing a measurement that makes it look bad. CodeGraph's own `docs/design/explore-budget-allocation.md` records that at its baseline the envelope was over-subscribed — 23,193 characters allocated against an 18,000 budget, absorbed only because the 25K ceiling sat above it — and that allocation was being driven by file size rather than relevance, so that "a weakly-relevant 130-line script gets 100% of itself; the strongly-relevant 5,000-line file gets 3,800 chars." The three files that did not answer the query took 61% of the envelope; the file that did took 16%. That document exists to record the gap the subsequent work closes. Its README does something similar about context: it states that CodeGraph's responses leave roughly 80% more retrieval context resident at the end of a multi-turn session than a file-reading agent's do — 67k tokens against 18k on VS Code — and tells you to budget for it if you run long sessions in a small window. Both of those are costs of its own design, published by the people who chose the design.

**ContextGraph exposes eleven tools**, six resources and four prompts, and is explicit that this is a compromise: `explore` is the primary one and the other ten "mostly return pointers you then have to follow." `explore` takes a `tokenBudget`, default 15,000, and fills it by rank — the highest-ranked symbols carry full verbatim source, the rest carry signature and location and are marked `elided: true`. Every edge it returns carries its confidence and the rung that resolved it. A question that matches nothing returns `"empty": true` rather than an error. On the specific question of tool-surface design, CodeGraph's bet looks better than mine, and their stated reason for making it is the same reason my own README gives for pushing everyone toward `explore`: agents choose badly among many similar tools. They acted on it further than I did.

**Graphify's MCP server is an optional extra** — `graphifyy[mcp]`, started with `python -m graphify.serve graphify-out/graph.json` — offering `query_graph`, `get_node`, `get_neighbors`, `shortest_path`, and three PR-oriented tools. It is the only one of the three that documents a **shared HTTP transport**: `--transport http` with `--host`, `--port` and `--api-key` serves the same tools over MCP Streamable HTTP, so one process can serve a whole team from a URL and nobody else needs the tool installed at all. There is a `--stateless` mode for load-balanced or CI deployment and a Dockerfile for it. Neither of the other two documents anything like this.

But MCP is not really Graphify's main channel. Its main channel is the skill and the hooks around it. `graphify claude install` writes a `CLAUDE.md` section and a `PreToolUse` hook that fires before search-style tool calls and nudges the agent toward the graph; on instruction-file platforms the same guidance lands in `AGENTS.md` or `.cursor/rules/`. And there is a `--strict` mode which is more aggressive than anything the other two attempt: it *blocks* the first raw source read of a session and redirects it to the graph, then reverts to the soft nudge so it fires at most once per session. Whether you want a tool reaching into your agent's tool calls is a genuine question, which is presumably why it is opt-in — but it is an honest answer to a real problem all three share, which is that an agent with a graph available will often ignore it and grep anyway.

---

## Where the index lives

| | Location | Format | Shared how |
|---|---|---|---|
| ContextGraph | `.contextgraph/graph.db` | SQLite + FTS5 | Rebuilt per machine, or produced in CI — a composite action and a reusable workflow reindex and upload the graph as a build artifact |
| CodeGraph | `.codegraph/codegraph.db` | SQLite + FTS5, WAL | Rebuilt per machine; `CODEGRAPH_DIR` renames it so Windows and WSL can share a checkout without sharing an index |
| Graphify | `graphify-out/` | `graph.json` in NetworkX node-link format, plus `graph.html` and `GRAPH_REPORT.md` | Committed to git — `manifest.json` stores relative paths and re-anchors on load, and `graphify hook install` sets up a merge driver that union-merges `graph.json` so two developers committing in parallel never see conflict markers |

Graphify's answer here is the distinctive one and it follows from the format. A JSON file can be committed, diffed and merged; a SQLite database realistically cannot. The trade is a documented 512 MiB cap on `graph.json` (raisable via `GRAPHIFY_MAX_GRAPH_BYTES`), against SQLite indexes with no size limit. ContextGraph reaches the same goal — everyone starts with a current map — from the other direction, by making CI rebuild it.

All three are local by construction for code. CodeGraph states no data leaves your machine and no API keys are needed. Graphify parses code locally with no API calls and offers `--code-only` to skip the docs and images that would otherwise need a model, though the semantic pass over docs and PDFs does call one. ContextGraph's LLM features are off by default (`litellm.enabled: false`) and everything else works without them.

One difference that is easy to miss: **CodeGraph collects anonymous usage telemetry, and it is on unless you turn it off.** Its README and `TELEMETRY.md` document what is collected — which tools and commands get used, which languages get indexed — state that code, paths, file and symbol names, queries and IP addresses are never sent, aggregate locally into daily totals first, and the ingest endpoint is public code in the same repository. The installer asks up front, and `codegraph telemetry off`, `CODEGRAPH_TELEMETRY=0` or `DO_NOT_TRACK=1` all disable it. Graphify's README states no telemetry, no usage tracking, no analytics. ContextGraph's states SQLite on your disk, no service, no upload. If you work somewhere that this question has a policy about, it is worth knowing before you install rather than after.

---

## What indexing costs, as each project describes it

Measured seconds for two of the three come later. What each project *documents* about the cost of building and keeping an index is a separate thing, and it is the only form of this axis on which all three can be compared.

**ContextGraph** builds with `index`, and `refresh` re-parses only files whose checksum changed. Its file watcher is opt-in — `watcher.enabled` defaults to false, with a 500 ms debounce and a 30-second full rescan to cover dropped watch events — and a `ci-reindex` command exists to rebuild from scratch in CI.

**CodeGraph is the only one of the three whose freshness is on by default**, and its documentation is the most detailed of the three about what that costs. A native OS-event watcher (FSEvents, inotify, ReadDirectoryChangesW) fires on every source change and re-indexes after a debounce window, 2000 ms by default and tunable. Two things around that watcher are worth the read regardless of which tool you pick, because they are the failure modes every incremental indexer has. During the debounce window, an MCP response that would reference a still-pending file prepends a banner naming it and telling the agent to read the file directly — so the agent is told the answer is stale rather than silently given a stale one. And when the MCP server reconnects, it runs a size/mtime plus content-hash reconciliation before answering the first query, which absorbs the edits made while no server was running — a `git pull` from a terminal, a previous session that exited. The project's own figures for build cost: the Swift compiler repository, 27,000 files, around 100 seconds fresh and about 4 seconds to re-sync a one-file edit; the Linux kernel, 70,000 files and 6.4M relationships, under 12 minutes on a 2-core, 6 GB VPS.

**Graphify** fingerprints every extracted file by content hash into `graphify-out/cache/`, so `--update` re-extracts only what changed, and `graphify hook install` puts the rebuild on a post-commit hook — AST only, which it notes costs no API credits. It also has a `--watch` mode. Its own figure for parallelism: on 84 code files, parallel AST extraction ran about 1.66× faster than sequential.

The structural difference is what the incremental cost is *proportional to*. CodeGraph's claim is that its cost grows with the size of the change rather than with the repository. Graphify's rebuild fires at a commit boundary. ContextGraph's `refresh` is proportional to the changed files too, but you have to run it, or turn the watcher on.

---

## What each one refuses to do

The refusals tell you more about a tool's judgement than the feature list does.

**ContextGraph** will not emit a `Calls` edge when a resolution rung yields more than three candidates. It is described in the code as a precision guard rather than an optimisation: the alternative is a hairball of guesses on exactly the names enterprise codebases collide on most — `save`, `execute`, `handle`, `process`. It will not merge two same-named declarations into one node. It skips files that look like secrets and files over 10 MB. Its file watcher is off unless you enable it, and `ci-reindex` refuses to run with a TTY attached.

**CodeGraph** will not emit a chained-call edge whose inferred receiver type does not actually carry the method, walking supertypes to check. The design note is unambiguous about the intent: "a wrong inference yields no edge, never a wrong one." It skips `node_modules`, `vendor`, `dist`, `build`, `target`, `.venv`, `Pods`, `.next` and the like even when there is no `.gitignore` at all, and skips files over 1 MB. Pulling a default-excluded directory back in requires an explicit `.gitignore` negation. It also has a nice third option between "indexed" and "excluded": paths listed under `deprioritize` in `codegraph.json` stay indexed and findable but stop outranking first-party code, for the `scripts/` tree full of helpers named `run` and `status` that would otherwise win every exact-name match.

**Graphify** refuses to overwrite a good graph with a bad one, twice over. If an extraction pass crashes or a walk cannot fully read the corpus, it will not overwrite a larger existing `graph.json` with the partial result — `--allow-partial` if you mean it. And if a rebuild simply produces fewer nodes than the graph already on disk, it refuses that too, on the grounds that this is usually a mistake rather than a refactor — `--force` if it isn't. A `.graphifyignore` merges with `.gitignore` and is evaluated last, but with a deliberate asymmetry: adding one can only ever exclude more, never re-include something `.gitignore` already dropped.

---

## Before the numbers: what was measured, and what was not

Everything above this line was **read**. Nothing above this line is a measurement, and none of it should be read as one.

What follows is a single retrieval measurement, and it covers **four sides**:

- **ContextGraph**, queried in-process through the same method its MCP `build_context` tool calls;
- **CodeGraph**, driven as `codegraph explore` against a working copy indexed by CodeGraph and nothing else;
- **bash** — the base system's `grep` over a clean, never-indexed checkout, with no third-party tool installed, invoked or assumed anywhere;
- **ripgrep** — plain `rg` over the same clean checkout.

**Graphify is not among them. It was not measured, at all, on anything.** Everything in this article about Graphify comes from its repository and its documentation, and nothing in the tables below applies to it. It has no row because it has no result, not because it scored badly.

The reason it was not measured is worth stating rather than eliding, because it is not "I ran out of time." This instrument scores a *ranked list of files*: it asks each side a question, takes whatever ordered file list that side emits in its own emission order, and scores it against the files the question's own gold facts cite. CodeGraph fits that shape — `codegraph explore` renders source for a set of files, in order, and its own output tells an agent to treat those as already read. Graphify's surface is a different shape: `graphify query` returns a scoped subgraph and `graphify path` returns a route between two nodes. Turning either into a ranked file list means writing a projection, and the projection would be mine, written by the author of a competing tool, deciding on Graphify's behalf which of its nodes count as "the files it put in front of you." Every fairness property this instrument has would rest on a judgement call I am the wrong person to make. Adding a fourth side to the benchmark is real work with real decisions in it, and it is not work I have done.

Also: **CodeGraph was measured at v1.5.0.** Everything I described in the first half is the currently documented build, which is v1.6.0 as of the day I read it. Where those two disagree, the numbers are the older build's.

A few more things about the instrument, briefly, because they change how much the numbers are worth. There is no LLM anywhere in the loop, so the same corpus and the same questions produce the same numbers. All four sides get the same raw question text — nothing pre-filtered, nothing lifted from the gold facts. The two text-search sides get identical derived tokens, so the only difference between them is the binary. No side's output is re-ranked, filtered or truncated before scoring. And a question a side could not be *asked* — a failed index, a timed-out call — is excluded from that side's average rather than folded in as a zero, with every such absence enumerated. In this run there were none: every side measured every question it was given.

The corpus is four repositories at pinned commits: Excalidraw v0.18.1, gin v1.12.0, cal.com v6.2.0, Keycloak 26.7.1. Thirty-three questions, of which twenty-nine form the headline pool and four are negative controls — questions where `grep` is *expected* to win, scored separately.

---

## The measurement

Pooled over the twenty-nine headline questions:

| Metric | ContextGraph | CodeGraph (third-party) | bash (base-system shell only) | ripgrep (third-party) |
|---|---|---|---|---|
| precision@5 | 20.0% | 12.4% | 11.0% | 11.0% |
| precision@10 | 12.4% | 6.2% | 8.3% | 8.3% |
| recall@5 | 38.7% | 28.0% | 27.0% | 27.0% |
| recall@10 | 46.0% | 28.0% | 35.1% | 35.1% |
| MRR | 0.502 | 0.326 | 0.218 | 0.218 |

Before anyone reads that as a verdict: it is a pooled mean over four repositories that contribute unequal shares, and it is not a per-repository result. Here is the same run sliced by repository, each repository's own questions including its negative control:

| Repo | Metric | ContextGraph | CodeGraph (third-party) | bash (base-system shell only) | ripgrep (third-party) |
|---|---|---|---|---|---|
| `calcom` (8) | MRR | 0.369 | 0.125 | 0.152 | 0.152 |
| `calcom` (8) | recall@10 | 33.8% | 3.1% | 7.5% | 7.5% |
| `excalidraw` (9) | MRR | 0.556 | 0.244 | 0.140 | 0.140 |
| `excalidraw` (9) | recall@10 | 42.6% | 22.2% | 14.8% | 14.8% |
| `gin` (8) | MRR | 0.719 | **0.813** | 0.352 | 0.352 |
| `gin` (8) | recall@10 | 92.7% | 83.3% | 82.3% | 82.3% |
| `keycloak` (8) | MRR | 0.264 | 0.056 | 0.223 | 0.223 |
| `keycloak` (8) | recall@10 | 17.3% | 8.8% | **39.6%** | **39.6%** |

**On `gin`, CodeGraph beats ContextGraph on mean reciprocal rank — 0.813 against 0.719.** That is not a rounding artefact and it is not confined to one metric: on the headline pool sliced to `gin`, CodeGraph also leads on precision@5 (34.3% against 31.4%) and recall@5 (81.0% against 72.6%). `gin` is the small pure-Go repository in the corpus, and it is the one where CodeGraph's answers land first most often.

**On `keycloak`, both text-search sides beat ContextGraph on recall@10 — 39.6% against 17.3%.** Plain `grep`, with no index, no install and no setup cost of any kind, retrieves more than my index does on the largest repository in the corpus. On the headline pool the gap is 38.1% against 19.8%. That row is the most useful one in this article for anyone deciding whether to build an index at all.

There is also one question — `excalidraw-q8` — where no side found a gold-cited file anywhere in its ranked list. Not below `k`, not anywhere. A row like that says something about the question or the gold set it was given rather than about any of the four tools, and it is in the run's report by name.

### Two things that change how those rows should be read

**The two text-search columns come out identical, and that is a finding rather than a bug.** All forty-five aggregate figures this run computes for `bash` and `ripgrep` are equal at printed precision. They are genuinely two measurements — separate runners, separate binaries at separate paths, separate parsers, separate result fields — and their ranked lists differ on twelve of thirty-three questions, mostly because `rg` honours `.gitignore` and skips hidden files where the `grep` side is told only to skip `.git` and binaries. But none of that difference reaches a scored position. So at k=5 and k=10 on this corpus, everything inside ripgrep — the ignore-file awareness, the parallel walk, the tuned matcher — buys nothing a stock shell does not already reach. Which means the margins the two index-building sides show over the baseline are margins over a baseline that was not weakened to produce them.

**The four sides do not return lists of remotely similar length**, and precision@10 divides by 10 regardless:

| Side | Median files returned | Longest | Returned 5 files or fewer |
|---|---|---|---|
| ContextGraph | 12 | 35 | 2 of 29 |
| CodeGraph (third-party) | 4 | 8 | 20 of 29 |
| bash (base-system shell only) | 72 | 992 | 6 of 29 |
| ripgrep (third-party) | 64 | 988 | 6 of 29 |

CodeGraph returns the shortest lists by far, and a list of four files caps precision@10 at 40% before retrieval quality enters into it. That is a real asymmetry and it deserves to be named. It also does not explain the result, which is checkable: score each side against the best precision@10 its own lists left available to it, and ContextGraph reached 41.9% of its ceiling, the text-search sides 32.4%, and CodeGraph 23.4% — the same order. The ceilings span 4.2 percentage points; the measured figures span 6.2.

There is a related quirk in CodeGraph's column worth flagging so nobody misreads it: its recall@5 and recall@10 are both 28.0%, and that is *not* the list running out. Not one question in the headline pool places a gold-cited file at ranks six through ten for that side, so raising `k` finds nothing new.

### What each index cost to build

| Repo | ContextGraph | CodeGraph (third-party) |
|---|---|---|
| `calcom` | 1m 38s, 268.6 MB | 1m 25s, 306.7 MB |
| `excalidraw` | 22.9s, 32.7 MB | 17.8s, 36.5 MB |
| `gin` | 2.2s, 8.1 MB | 899ms, 7.9 MB |
| `keycloak` | 4m 14s, 1.58 GB | 1m 53s, 811.6 MB |

**Building the index costs ContextGraph more than it costs CodeGraph on every repository where both were built** — 1.15× on `calcom`, 1.29× on `excalidraw`, 2.40× on `gin`, 2.24× on `keycloak` — and on Keycloak it occupies 1.95× the disk, 1.58 GB against 811.6 MB. Both text-search sides have no ingest step at all and pay nothing before the first query, which is the number every row in this section is being compared against.

### Coverage, which caps everything above

An index cannot retrieve a file it never indexed, so coverage of the gold-cited files is published beside the scores rather than after them. ContextGraph held 19/19 on `calcom`, 21/21 on `excalidraw`, 10/10 on `gin` and 26/26 on `keycloak`. CodeGraph held 9/19 on `calcom` (47.4%), 17/21 on `excalidraw` (81.0%), 10/10 on `gin` and 22/26 on `keycloak` (84.6%). Both text-search sides reach every file by construction, since they read the working tree directly.

That `calcom` figure is the one to sit with. CodeGraph's index held 9 of cal.com's 19 gold-cited files; the rest were never there to retrieve. Those gold files include Prisma migrations, a `schema.prisma`, an OpenAPI JSON document and several `.mdx` docs. CodeGraph is a code indexer and does not claim to index those; its recall@10 of 3.1% on that repository is substantially a statement about what it chose not to ingest rather than about how well it ranks what it did.

---

## What the other two projects have measured themselves

Both comparators publish their own numbers. Neither belongs in the tables above, because neither measures the same thing, but leaving them out would give a false picture of the evidence.

**CodeGraph publishes a seven-repository agent A/B**, re-measured on 5 August 2026 against Claude Opus 4.8 running headlessly, four runs per arm, median reported: the same question asked with its MCP server enabled and with an empty MCP config. Its headline is 88% fewer tool calls, 53% faster, 62% fewer tokens, 44% cheaper, and file reads cut to zero on all seven repos. That measures agent throughput — how much work an agent does to reach one answer — not retrieval precision, and it is their harness measuring their tool. It is also visibly careful: the `codegraph` CLI is blocked in *both* arms via a sanitised `PATH` and a hook, because on an unblocked harness they measured the control agent finding the CLI and reaching CodeGraph through Bash in 26 of 28 runs, which would have quietly contaminated the comparison. They say plainly that earlier published figures were produced without that block. They also publish a per-language cross-file coverage table — the share of symbol-bearing files with at least one resolved cross-file dependent — running from 100% on several repositories down to 73.8% on Shopify's Liquid theme, with the residual described as a genuine static-analysis frontier rather than hidden by trimming the denominator.

**Graphify publishes results on LOCOMO and LongMemEval-S** — 0.497 recall@10 on LOCOMO against mem0's 0.048 and supermemory's 0.149, 76% QA accuracy on LongMemEval-S, and zero LLM credits to build the graph — scored by a judge blind-validated against a second judge at 90.6% agreement and Cohen's kappa 0.81. Those are conversational-memory benchmarks. They are not code-retrieval benchmarks, and Graphify does not present them as such. Its README also reports a 71.5× token reduction per query on a 52-file mixed corpus, alongside the honest note that on a six-file corpus the reduction is about 1× because six files already fit in a context window.

Three projects, three instruments, three different questions, and one of the three instruments is mine.

---

## What this does not settle

Thirty-three questions over four repositories is a bigger claim than a single repository, and it is still not a proof. Four repositories are not "code in general." The questions and the gold facts they are scored against were written by ContextGraph, which remains the largest single thing to discount for. Each figure is one run rather than a distribution, and ingest was timed once per repository per tool on one machine with no repeats and no variance.

Nothing here measures answer quality. The metric is which files a tool puts in front of you, not what an agent then does with them.

And the instrument has already been wrong once, in a way worth admitting because it is the reason to keep the thing at all. The first time this axis ran, ContextGraph scored **0.0%** on every metric across all twenty-two measurable questions. The cause was that `buildContext` passed the entire question sentence to SQLite FTS5 as one literal `MATCH` expression, and FTS5 gives bareword queries implicit-AND semantics, so every token had to co-occur in one indexed row. Measured on Excalidraw's index at the time: the full sentence matched 0 rows, the fallback matched 0 rows, and the same words OR'd together matched 28. That defect sat on the exact code path the MCP `build_context` tool uses. It was found by pointing an instrument at the tool rather than by reading the tool, and the numbers in this article are from after the repair. On Excalidraw's nine questions specifically, the same measurement across three published runs reads 0.133, then 0.482, then 0.556 — the progression of a thing being fixed, not the discovery of a thing that was always good.

---

## How I would actually choose

**If your repository is code and you want the graph to stay fresh with no ceremony, take CodeGraph.** Its language table is the most detailed of the three about what each entry actually yields, it is the only one that extracts framework routes or bridges Swift/Objective-C/React Native boundaries, it is zero-config, its watcher is on by default with a documented staleness banner so an agent knows when it is reading a stale answer, and its single-tool MCP surface is the best-reasoned of the three. The measurement here says its index is cheaper to build than mine on every repository, and that it leads on `gin`. It also says it indexed 9 of 19 gold-cited files on cal.com, which is what "code-only" costs on a repository whose answers live partly in migrations and docs.

**If your corpus is not only code, take Graphify.** It is the only one of the three that will read a PDF, a `.docx`, an image or a recorded meeting, the only one that turns `# WHY:` comments and ADR citations into first-class nodes, the only one that detects communities and names your subsystems, and the only one that documents a shared HTTP MCP server so one process can serve a team. Committing `graph.json` with a union merge driver is a better answer to "everyone should have the same map" than either SQLite-based tool has. It was not measured here, and you should weigh it on its documentation and your own trial rather than on anything in this article's tables.

**Take ContextGraph if you need to know why an edge exists and how much to trust it.** Every resolved call edge carries the rung that produced it and a confidence derived from that rung; identity is per-declaration-site and never merged by name; over-ambiguous edges are refused rather than guessed. Pooled over this corpus's twenty-nine headline questions, at k=5 and k=10, it put more gold-cited files in front of an agent than the other three sides — though not on every repository, as the `keycloak` and `gin` rows above say. It also has the narrowest language support of the three, costs more to index on every repository measured, and loses to plain `grep` on Keycloak's recall.

And the option nobody sells: **if your repository is small and your questions name real symbols, `grep` is not embarrassing.** On this corpus it did everything ripgrep did at every scored position, and on Keycloak it beat my index on recall while paying nothing to build one. An index has to earn its cost against that, and it does not earn it everywhere.

---

*Every number in this article comes from a committed result file in the ContextGraph repository — the four-way retrieval report and its result document — and nothing has been derived, averaged or recomputed from them. Every claim about Graphify and CodeGraph comes from that project's own repository or documentation, read on 26 August 2026. Where a project's documentation does not address one of these axes, I have said so rather than filled the gap.*
