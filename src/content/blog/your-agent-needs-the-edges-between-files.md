---
title: "Your agent doesn't need more files. It needs the edges between them."
description: "One ordinary question about Excalidraw cost a coding agent 944,460 tokens, forty tool calls and ten open files — and it still got half the answer. The three facts it missed were three consecutive links in one call chain. Here is why grep could never have closed them, and what happens when the agent gets the edges instead."
pubDate: 2026-08-26
tags: ["contextgraph", "coding-agents", "code-search", "developer-tools"]
category: "Agents"
heroImage: "/images/your-agent-needs-the-edges-between-files/banner.png"
draft: false
---

![](/images/your-agent-needs-the-edges-between-files/banner.png)

### grep tells your agent where a word appears. It can never tell it what this call site actually calls — and that missing edge is where the token budget goes.

A coding agent was asked a question about Excalidraw. Not a trick question — an
ordinary one, the kind you'd ask a colleague in their second week:

> Trace how an element in the scene actually gets drawn onto the canvas: which
> React component invokes the static-scene render function, and where does the
> rendering code obtain (or generate) the roughjs shape it draws?

It had a shell. It had the whole repository checked out at a pinned commit. It
ran forty tool calls, opened ten files, consumed 944,460 input tokens, spent
269.6 seconds, hit its tool-call ceiling, and then wrote this about its own
answer:

> I could not confirm from the source directly the exact way the roughjs shape
> gets generated inside `renderElement`, but it is clear from the call chain and
> parameter passing that the RoughCanvas provided to `StaticCanvas` flows
> through […]

Six facts make a complete answer. It got three. The three it missed were not
scattered around the repository — they were three consecutive links in one
chain, and the agent ran out of budget one hop before the first of them.

That is the failure worth looking at, because it is not the failure it looks
like. The agent didn't fail to find files. It found `renderElement.ts` and named
the right function in its answer. What it could not do was follow **one edge**:
from a call site at `packages/excalidraw/renderer/renderElement.ts:811` to a
declaration in `packages/excalidraw/scene/ShapeCache.ts`.

By the end of this you will be able to:

- Recognise the class of question your agent cannot answer with text search, no
  matter how big its context window gets
- Index your own repository into a resolved call graph and put it in front of
  your agent in three commands, then check the difference on a chain in your own
  code

### The edge grep can't follow

Here is the chain the question was really asking about, and where the agent
stopped.

![](/images/your-agent-needs-the-edges-between-files/diagrams/render-chain.png)

The top half is ordinary navigation: a component, a render function, a loop that
calls `renderElement` per element. Text search gets you there because the names
are distinctive and they appear near each other. The bottom half is where it
falls apart. `renderElement` calls `ShapeCache.generateElementShape`, which
returns a cached shape out of a WeakMap, or calls the module-level
`_generateElementShape` when the cache is empty.

Three hops, in a different directory, behind a name — `generateElementShape` —
that tells you nothing about where its declaration lives.

`grep` returns files containing a string. `ripgrep` returns the same files
faster. Embedding search returns chunks whose vectors sit near the question's
vector — still locations, ranked by resemblance. All three answer *where does
this word appear*. None of them answers *what does this symbol call, and what
calls it*, because none of them ever resolved a reference to a declaration.

That isn't a gap in the implementations. It's what the input allows. These tools
work on text, and a call graph is not a property of text — it's a property of
text after you've parsed it and worked out which of the several same-named
declarations in the repository this particular call site actually means.

So the agent does what you'd do with only grep: greps, opens a file, reads it,
finds a call it doesn't recognise, greps for that, opens another file. Every hop
is a tool call and a few thousand tokens of file content it mostly doesn't need.
Deep chains cost the most hops — which is why this agent ran out three links from
the answer rather than one.

### The same question, with the graph

That run had a second arm. Same question, same model, same pinned Excalidraw
checkout, same ceiling of forty tool calls. One difference: this working copy had
been indexed by [ContextGraph](https://github.com/erenalpaslan/context-graph),
and the agent had its MCP tools alongside the shell.

Four tool calls. Zero file reads. 193,178 input tokens, 19.7 seconds, and five of
the six facts — including the entire `ShapeCache` chain the other arm never
reached:

> For generating roughjs shapes, `renderElement` calls
> `ShapeCache.generateElementShape` (from `packages/excalidraw/scene/ShapeCache.ts`).
> This function either fetches the cached shape or generates a new shape using
> `_generateElementShape`.

Zero file reads is the number to sit with. It named the file, named the function
inside it, and described the caching behaviour without opening anything. The
graph already held the edge — and the verbatim source of what sat on the other
end of it.

That's the whole design. ContextGraph parses your repository with tree-sitter
(Kotlin, Java, TypeScript, TSX, JavaScript, Python, Swift, Objective-C, Go),
resolves references that cross file boundaries against the whole repository,
stores the result in a local SQLite file, and serves it over MCP. One tool,
`explore`, takes a natural-language question and returns in a single call: the
modules that matched, the relevant symbols **with their source**, the resolved
edges around each one, and the blast radius.

Not pointers. The source.

```json
{
  "question": "how does an element get drawn onto the canvas?",
  "tokenBudget": 15000,
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
      ]
    }
  ]
}
```

The field names are the ones in `ExploreEngine.kt`; the values are illustrative —
the symbol and its file are real, the line numbers aren't. The response is packed
to a token budget, 15,000 by default. Top-ranked symbols carry full source; once
the budget is spent the rest carry signature and location and are marked
`"elided": true` rather than being silently dropped.

Note `confidence` and `rung` on that edge. Cross-file resolution without a
compiler is guessing, and those two fields are the guess's provenance written
onto the edge — an agent reading `"rung": "local_scope", "confidence": 0.97` is
being told something different from one reading `"rung": "repo_unique_name",
"confidence": 0.45`. How the four rungs work, and how the identity format keeps
72,147 Keycloak methods called `save` from collapsing into one node, is the
subject of [the piece comparing this to Graphify and
CodeGraph](/writing/graphify-codegraph-contextgraph-what-differs/).

### What that number isn't

Every figure above sits in one committed file,
`modules/benchmark/results/run-1787085544741.json`, with both arms' full answers
and the six gold facts each pinned to a `file:line`. And it is one question.

**n = 1.** One question, one repeat, no variance. The efficiency gap is clean —
four tool calls against forty is not a rounding error, and neither is zero file
reads against ten. The accuracy gap is the weaker claim: the control arm hit its
ceiling, so 0.500 is a floor rather than its true score. More budget might have
got it there.

**The agent was `gpt-4.1-mini`**, judged by `gpt-4.1`. A small model has less
room to be clever about navigating with a shell, which is exactly the pressure
the graph relieves — so this is the comparison's most favourable model choice,
not its most neutral one.

**An earlier version of this measurement flattered it by roughly 2×.** The
project's own walkthrough of the run records a gap of 0.83 against 0.00, because
hitting the ceiling used to end the run entirely rather than just the tool phase,
silencing the control arm. About half the original difference was the
instrument's fault. It was fixed; 0.500 is what the corrected instrument reads.

**Embedding search was never measured.** The argument two sections up about why
vector similarity over text can't return resolved edges is structural, not
empirical — I'd rather say so than let the numbers around it imply otherwise.

I'm listing these because they're the sort of thing a benchmark's author notices
and quietly doesn't mention.

### The retrieval side, and the rows it loses

One question is not evidence, so there is a second axis with no LLM anywhere in
it: 33 questions across cal.com, Excalidraw, gin and Keycloak, asked of
ContextGraph, CodeGraph 1.5.0, plain `grep` from the base system, and `ripgrep`.
Same corpus, same raw question text, same expected files derived from each
question's gold facts, each side scored in its own emission order. Deterministic
— same inputs, same numbers, every time.

Pooled over the 29 headline questions (negative controls excluded):

![Pooled over 29 headline questions: precision@5 20.0% for ContextGraph against 12.4% for CodeGraph and 11.0% for both grep and ripgrep; recall@10 46.0% against 28.0% and 35.1%; MRR 0.502 against 0.326 and 0.218](/images/your-agent-needs-the-edges-between-files/tables/retrieval-headline.png)

A pooled mean is not a verdict, so here are the rows it loses — on that same
pool, sliced by repository, which is the only comparison where the denominators
match:

- On **gin**, CodeGraph leads MRR, 0.857 against 0.786, and precision@5, 34.3%
  against 31.4%.
- On **Keycloak**, plain `grep` leads recall@10 — 38.1% against 19.8%. That one
  deserves no cushioning: on the largest repository in the corpus, and the only
  Java one, a stock shell with nothing installed retrieved more of the right
  files than the index did, and the index cost 4m 14s and 1.58 GB to build first.
- ContextGraph is **slower to index on every repository** where both indexes were
  built — 1.15× on cal.com, 1.29× on Excalidraw, 2.40× on gin, 2.24× on Keycloak
  — and on Keycloak takes 1.95× the disk. Both text-search sides have no ingest
  step at all.

Two findings from that run undercut the framing more quietly, and both are worth
more than the wins.

**`grep` and `ripgrep` produce identical figures on all 45 aggregate numbers the
report computes.** They are genuinely two independent measurements — 12 of the 33
questions produce different ranked lists — but every difference sits deep in the
tail, past every *k* measured. Ripgrep's ignore-awareness and tuned matcher
bought nothing on this corpus a base-system shell didn't already reach. The
margin over `ripgrep` is a margin over `grep`. Read the baseline as a plain one,
not a strong one.

**The index used to disagree with itself between builds.** Two builds of `gin`
proven identical in content returned different answers, moving that repository's
MRR between 0.656 and 0.719, because the search cut and the ranking both broke
score ties in SQLite row order — which is insertion order, which differs because
ingest extracts concurrently. Fixed, and pinned by tests that feed identical
content in different orders and require identical output. But it was true of
every number this project published before that run.

One figure that caps all the others: an index cannot retrieve a file it never
indexed. ContextGraph's indexes hold every gold-cited file on all four
repositories — 19/19, 21/21, 10/10, 26/26. CodeGraph's hold 9/19 on cal.com,
17/21 on Excalidraw, 10/10 on gin, 22/26 on Keycloak. Both text-search sides
reach every file by construction, since they read the working tree. That coverage
gap is part of why CodeGraph's scores are what they are, and it's published
beside the scores rather than after them.

The neat part is where the two axes meet. The Excalidraw render-chain question
from the top of this piece is `excalidraw-q3` on the retrieval axis too — and
there, ContextGraph puts a gold-cited file at rank 1, CodeGraph at rank 2, and
`grep` and `ripgrep` never return one at all. The agent arm that struggled was
struggling with a question its tools genuinely could not reach.

### Try it on a chain in your own repo

```bash
brew tap erenalpaslan/contextgraph
brew trust erenalpaslan/contextgraph
brew install contextgraph
```

macOS arm64 and Linux x64. The formula brings its own JDK 17, so no system Java
is needed. The middle line isn't optional — Homebrew 5.1.15 and later refuse to
load a third-party tap's formula until the tap is trusted. Every release is also
on Maven Central as a single self-contained jar.

```bash
cd /path/to/your/project
contextgraph init
contextgraph index .
contextgraph mcp bind > .mcp.json
```

That last file is worth committing. It names `contextgraph` on `PATH` rather than
one machine's absolute path, and resolves the project root at launch, so it works
for everyone on the team from whatever directory they start their agent in. The
graph itself is a SQLite file under `.contextgraph/` — no service, no account,
nothing uploaded, and it's on the branch you're on because it's on the branch
you're on.

Then ask your agent something with a chain in it. Not "where is the login code" —
grep is fine at that, and if that's most of what you ask, none of this is for
you. Ask what happens between the button and the database. Then watch whether it
has to open ten files to find out.

### Wrapping up

The interesting number in that two-arm run isn't 4 against 40. It's 0 against 10.
An agent that can follow an edge doesn't need to open the file at the other end
of it, and an agent that can't will keep opening files until it runs out of room
— which, on a deep enough chain, is always before the answer.

If you want the next layer down — how symbol identity is established, what the
four resolution rungs are and why the confidence is written onto every edge,
and how ContextGraph compares to Graphify and CodeGraph on axes you can act on —
that's [the next post](/writing/graphify-codegraph-contextgraph-what-differs/).

---

*Every figure here is in the [ContextGraph
repository](https://github.com/erenalpaslan/context-graph) (MIT):
`modules/benchmark/results/run-1787085544741.json` for the two-arm run, both
answers in full and the six gold facts with their `file:line` evidence;
`modules/benchmark/ornek-kosu-excalidraw-q3.md` for that run walked through
including the ceiling correction (in Turkish);
`modules/benchmark/results/four-way/BENCHMARKS.md` for the retrieval benchmark —
methodology, per-repository and per-question breakdowns, gold-file coverage,
ingest costs, and every row the project loses; `docs/benchmarks/index.html` for
the same run as a sortable page; and
`modules/mcp-server/src/main/kotlin/io/contextgraph/mcp/ExploreEngine.kt` for the
response shape, the token budget and the elision rule.*
