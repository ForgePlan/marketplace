# Retrieval layers and memory — which question goes where

A developer asks two kinds of question all day. **"Where is it?"** is answered by search, and which
kind of search depends entirely on what you already know about the thing. **"Why is it like that?"**
is answered by decisions and memory. Using the wrong layer is the failure mode, and it almost never
looks like a failure — it looks like an answer.

This document is the reference. `/fpl-hsmem:memory-setup` is the actionable version (what a given
project should install); the agent `memory-curator` carries the memory half as operating rules.

**Provenance of every number below.** Timings and counts come from ONE repository — a TypeScript
monorepo, ~1,700 tracked files under git, ~95,000 files on disk including vendored dependencies,
measured 2026-09-10 in a clean `bash --noprofile --norc`, best of three, warm cache. They are
**observations, never thresholds.** On a small repository an unindexed searcher wins outright; on a
400,000-file one the published vendor benchmark claims 52×. Measure your own before you decide.

---

## The three layers of "why"

The neat version — "search answers where, memory answers why" — is wrong, and the error is
expensive. **ADRs, RFCs and PRDs are files in the repository.** They are found by the same search
tools, versioned alongside the code, and they outrank memory. Stating the boundary as two layers
sends an agent past a ratified written answer to go asking a layer with no clock and no provenance.

| Layer | Holds | Ask it |
|---|---|---|
| **Sources** | what won | never for "why" — the code cannot contain the reason |
| **Recorded decisions** — `.forgeplan/`, ADR / RFC / PRD, PR bodies, commit messages | reasons that got as far as "decided" | **first**, for any "why" |
| **Memory** — this plugin | the long tail: discussions that decided nothing, options rejected, lessons paid for | when no record exists; and for "what did we try that failed" |

**If memory answers a "why" and no artifact exists, that is a signal the decision should be written
down** — not that memory did the job.

---

## Size decides which layers are worth having

**The rule, before the numbers: the ordering below is general, the timings are not.** Every measured
figure in this document comes from **one repository on one machine on one day**. Read as thresholds
they will make a small project pay for machinery it does not need — an index to maintain, an
embedding model to run — for a saving that does not exist at its size. Read as what they are, they
tell you roughly where to look and what to measure yourself.

**Count what the tools count**, not what `find` counts. `git ls-files | wc -l` is the number that
matters: the fast searchers respect `.gitignore`, so vendored dependencies are invisible to them
and enormous to `grep`. On the repository measured here that is 1,674 tracked against 95,141 on
disk, and that gap — not the index — is where most of the speedup came from.

| Tracked files | Text search | Indexed search | Semantic search | Why |
|---|---|---|---|---|
| **under ~1,000** | plain `rg`, nothing else | **no** | **no** | a full scan is already instant; an index costs more to build and keep fresh than it can ever return |
| **~1,000 – 10,000** | plain `rg` | **probably not** — measure | only if questions are genuinely abstract | measured at 1,674 files: unindexed **29 ms**, indexed **36 ms**. The index lost. It may win higher in this band; we did not measure that |
| **~10,000 – 100,000** | `rg` for one-off scans | **measure before adopting** — this is where the crossover lives | worth considering | the honest answer is that we have no data point in this band. Anyone who tells you otherwise is quoting a vendor |
| **over ~100,000** | `rg` for a subdirectory | **likely yes** | likely yes | the vendor benchmark claims 52× at 388,000 files. UNVERIFIED by us — treat it as a reason to measure, not as a result |

**The measurement that decides it**, on your own repository, in a clean shell — three runs, take the
best, warm cache, a literal that actually occurs:

```bash
time rg -l -F '<a literal in your code>' .
time <indexer> -l -F '<the same literal>' .     # after building its index
```

If the difference is under 2×, the index is not paying for itself: it has to be built, kept fresh
after every large pull, and remembered. **A stale index is worse than no index** — it answers with
false negatives that look exactly like an honest "not found" (see the anti-patterns below).

**Semantic search is not chosen by size.** It is chosen by the shape of your questions. If you can
usually name the thing you are looking for, an embedding pipeline is theatre; if you routinely ask
"where is X enforced" and cannot name X, it earns its place at any size above trivial.

**Memory is not chosen by file count either — it is chosen by session count.** A bank fills from
conversations, so a project that will run for two or three sessions never accumulates enough for
recall to be worth reading. Past a dozen sessions the arithmetic reverses: the cost of re-deciding
something already decided exceeds the cost of storing it.

---

## Which layer answers which question

First move **narrows**. Verification **confirms**. No layer is its own verification.

| The question | First move | Verify with |
|---|---|---|
| An exact literal, filename, error string | plain text search (`rg -F`) | open the file. If an *indexed* searcher returned nothing, repeat unindexed before believing it |
| The same, asked dozens of times on a large tree | indexed search (`tgrep -F`, ideally with its watch server running) | one unindexed pass on the candidate subset |
| Where a symbol is defined | LSP / Serena `find_symbol` | `rg -F` on the name — catches re-exports the language server did not surface |
| Who references a symbol | LSP / Serena `find_referencing_symbols` | AST search on the call shape, plus `rg -F` as a net for dynamic use: string keys, registries, config, templates |
| Rename a symbol | LSP rename | `rg -F` on the OLD name must return **zero**. It did not → the rename is incomplete |
| Every site of one syntactic shape | `ast-grep run -p '<pattern>'` | `ast-grep scan -r rule.yml` without `-U`, read the diff |
| A codemod by shape | `ast-grep scan -r rule.yml` → diff → `-U` | build + tests, then `rg` for survivors of the old shape |
| "Where is X *enforced*" — you cannot name the thing | semantic search, queried as a **noun phrase**, not a question | LSP references + `rg -F` on the candidates BEFORE reading whole files |
| "Why is it built this way" | recorded decisions (`rg` over `.forgeplan/`, `forgeplan_get`) | if the answer names code, re-check the code |
| "What did we try and reject" | memory only | nothing to verify against — the code does not contain it by definition |
| "What did we decide last Tuesday" | memory | if the decision has matured, it should have become an artifact |

**Discovery → verification → reading.** In that order. Skipping to reading is the read-read-read
cascade: ten files opened because the first search was the wrong kind.

---

## Anti-patterns, by symptom

Every one of these produces a **plausible answer**, not an error. That is what makes them expensive.

| Wrong pairing | How you recognise it |
|---|---|
| AST tool for a plain literal | **a confident small number.** Measured: `rg -F` 192 files, `ast-grep` 4 — a 48× undercount, no warning. Slowness is NOT the symptom (167 ms vs 53 ms). Cause is broader than "misses strings": an AST tool parses only the language you named, so Markdown, JSON, YAML and config are invisible to it |
| Invalid AST pattern | **exit 0 and no matches** — indistinguishable from a correct search that found nothing. The pattern must be a parseable fragment of real code |
| AST tool for "is this variable shadowed" / "what type is this" | a confident match on the wrong binding. The tool documents that it has no scope analysis, no type information, no data-flow |
| Text search for "who uses this symbol" | hits in comments, strings, and on a same-named different thing; the rename that follows breaks sites you never saw |
| Semantic search for an exact identifier | top score around 0.65, plausible neighbours above the definition, or the definition absent |
| A verbose question given to semantic search | it honours every word and loses the intent; lifecycle files rank above the thing you meant. Query as a noun phrase |
| **Believing an empty result from a stale index** | the most expensive one. Trigram indexes give false NEGATIVES — a symbol added after the last build is not found, and the exit code is identical to an honest "no such thing". Reproduced live |
| Verifying with the same layer you searched with | the same snapshot, twice. A "confirmation" taken before the change |
| `grep -r` on a tree with vendored dependencies | 43 seconds, and matches from code you do not own |
| Memory for "where is it" | a confident path. Easy failure: it no longer exists. Expensive failure: it still exists and the claim about it is stale — the coordinate checks out and confirms nothing |
| Code search for "why is it like this" | a rationale reverse-engineered from an implementation, which nobody actually reasoned from. Reopens a settled argument |
| Retain then immediately recall | the old statement comes back — extraction has not run. Pass `wait: true` |
| Correcting memory by editing a record's text | irreversible upstream, and the derived observations are dropped. Retire it and write the correction instead |

**When layers disagree, the code wins.**

---

## What the tools say about their own limits

A pattern worth knowing: **the closer a tool sits to semantics, the worse it documents its limits** —
while the cost of a wrong answer moves the other way. A text searcher's miss is obvious; an AST
tool's miss is a small number; a semantic searcher's miss is a plausible paragraph.

- **AST search** is the best-documented. It states plainly that it has no scope analysis, no type
  information, no control-flow or data-flow or taint analysis, and it points elsewhere for those.
  It also lists the three reasons a pattern silently fails to match.
- **Indexed text search** documents its shape but not its failure mode: built for repeated queries
  over large trees, little gained on one-off searches of small ones. Files above 64 MiB and binaries
  are skipped. The staleness behaviour above is not written down anywhere — it was measured.
- **Semantic code search** declares **no limits at all**. There is no "this is not a replacement for
  grep or a language server" anywhere in its material. That rule has to come from us.

---

## Two corrections to a widely-copied policy

A measured six-layer search policy exists in another project here and was the starting point for
this document. Two of its conclusions did not survive re-measurement, and both are the kind of error
that propagates because the document looks rigorous:

1. **The performance verdict is inverted at that repository's size.** It reports the indexed searcher
   at 0.05 s against 0.10 s for the unindexed one and recommends the index for repo-wide queries.
   Re-measured on the same repository with the same query: **29 ms unindexed, 36 ms indexed** — the
   unindexed one wins or ties across every query shape tried.
2. **The speedup is attributed to the wrong cause.** "200× faster than `grep` because of the index"
   — in fact `grep` walks 95,000 files while both fast searchers walk ~1,700, because they respect
   `.gitignore`. The win is *not scanning vendored code*, which the unindexed searcher gets for free,
   with no index to keep fresh. A wrong cause produces a wrong policy: a team told to maintain an
   index for a benefit that is not there at their size.

The lesson generalises: **a timing without its repository, its query shape and its date is not a
measurement, it is folklore.** Every number in this document carries its provenance for that reason.

---

## Prior art — mostly absent, so write carefully

The problem statement is common ground: several vendors describe exactly the gap — that the reasons
for decisions live in PR descriptions, design documents and chat threads rather than in code, and
that an agent without that layer reads the code but not the intent. The staleness check is published
practice too: verify that a remembered path still exists before building on it.

What could **not** be found, in a deliberate search: a published routing discipline — which question
goes to which layer, and which layer verifies which. The academic work on agent memory is about the
memory's internals. The product answer is to merge code, discussion and decisions into one graph,
which dissolves the routing question rather than answering it.

So this table is ours. Not proof that nobody has written one, but nobody's turned up — which is a
reason to be careful with the wording rather than confident about it.
