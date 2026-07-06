---
name: edge-verifier
description: "Edge trust-classification and grep-verification algorithm for forgeplan-map-pack's VERIFY stage (RFC-023 Proposed Direction SS1 roster row 6; PRD-075 FR-4; SPEC-003 SS D2 the 11 VALID_RELATIONS, SS D3 the typed-link/code-dep namespace default rule). Covers: the namespace classification rule, the exact 11-relation allowlist for typed-link edges, the mandatory Bash grep-verification pass for code-dep edges with the verified_by=\"grep:<pattern>\" format map-guardian.mjs's XC-2 re-runs verbatim, the unconditional drop-if-unverified rule (never emit a code-dep edge as noise), and argv-safe grep discipline (no shell interpolation of untrusted pattern content). Invoked by the edge-verifier agent only. Triggers: \"classify edge namespace\", \"verify code-dep edge\", \"grep verification pass\", \"11 valid relations\", \"drop unverified edge\", \"verified_by format\"."
disable-model-invocation: true
---

# Skill: edge-verifier — the VERIFY-stage trust-classification algorithm

Reusable algorithm knowledge for the `edge-verifier` agent's VERIFY stage (forgeplan-map-pack pipeline). Grounded in RFC-023 Proposed Direction SS1/SS4, ADR-016 (roster decision — this is agent #6), and SPEC-003 SS D2 (the 11 VALID_RELATIONS), SS D3 (the namespace default rule), SS E3 (dropped edges are never emitted as noise).

## Inputs

- `.forgeplan/map/.work/.extract.json` — `zone-extractor`'s output. This is the **only** source of truth for what a valid edge endpoint looks like: every `from`/`to` this stage emits MUST resolve to an `id` present in `extraction.nodes`.
- `.forgeplan/map/.work/.scan.fpl.json` — `forgeplan-scanner`'s output, `{ artifacts[], edges[] }`. The `edges[]` here are the **typed-link candidates**, already sourced from `forgeplan_graph` by an upstream, isolated agent — this stage does not re-query MCP itself (no forgeplan MCP tool is in this agent's grant).
- Code-relationship signal carried in the extraction (whatever structural hints `code-scanner`/`zone-extractor` surfaced, e.g. a manifest entry naming a copy/spawn target) — the **code-dep candidates** this stage must independently confirm before trusting them.
- `repoRoot` (via `Bash`) — for the grep-verification pass.

## Algorithm 1 — namespace classification (SPEC-003 SS D3 default rule)

`namespace` is additive/optional on a candidate edge. When absent, classify by relation:

```
relation ∈ VALID_RELATIONS  ⇒  namespace = "typed-link"
otherwise                   ⇒  namespace = "code-dep"
```

This default rule lives only in the map/edge layer — it never reaches back into `forgeplan_graph`'s own edge semantics. Apply it once per candidate, then branch into Algorithm 2 or Algorithm 3 below.

## Algorithm 2 — typed-link edges (graph-sourced, high trust)

The exact 11 VALID_RELATIONS (SPEC-003 SS D2 — copy this list verbatim, do not approximate it):

```
informs, based_on, supersedes, contradicts, refines,
supports, demonstrates, covers, triangulates, references, belongs_to
```

For each typed-link candidate (sourced from `.scan.fpl.json`'s `edges[]`):

1. Validate `relation` is one of the 11 above. If not, the candidate is malformed — drop it (it would be a guaranteed GC-4 BLOCKER downstream; catch it here instead).
2. Remap `from`/`to` from their raw forgeplan-graph form (artifact IDs) to the content-hash node ids `zone-extractor` actually minted for the corresponding entities in `extraction.nodes` (same `(kind, path_or_slug)` key the id formula uses). If either endpoint cannot be resolved to a node in this extraction — e.g. the graph edge references an artifact that wasn't scanned into this particular map — **drop the edge**. A dangling endpoint is a G3/GC-2b failure waiting to happen; don't pass the problem downstream.
3. Set `trust: "high"` and keep `namespace: "typed-link"`. No grep verification is performed or needed — the graph is already the source of truth for this edge's existence (cross-checked again, independently, by the guardian's XC-1 against `.scan.fpl.json`).

## Algorithm 3 — code-dep edges (grep-gated, medium trust)

For each code-dep candidate:

1. Derive a grep pattern that would prove the relationship in source — e.g. a literal string the `from` entity's file/manifest would contain if it really references the `to` entity's path or slug (a copy target, an import specifier, a spawn command).
2. Run the grep via `Bash`, **argv-safe AND source-scoped**: `grep -rlF --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=vendor --exclude-dir=dist --exclude-dir=build --exclude-dir=target --exclude-dir=.svelte-kit --exclude-dir=.next --exclude-dir=coverage --exclude-dir=.forgeplan -- '<pattern>' <repoRoot>` (or an equivalent invocation that never builds a shell command string by concatenating untrusted content).
   - **`--exclude-dir` is not optional.** A bare `grep -rlF -- pattern .` walks the ENTIRE repo — `node_modules/`, `.git/`, `.svelte-kit/`, build output — which on any real repo with dependencies installed is hundreds of MB per edge; the guardian's XC-2 running the same unbounded grep 10× is what hung the first forgeplan-web dogfood run (killed after 2 min, F6). This exclusion set **MUST stay byte-identical to the guardian's `GREP_EXCLUDE_DIRS`** in `scripts/map-guardian.mjs` and to code-scanner's own module-scan exclusions — XC-2 re-runs YOUR search and must land on the **same file**, so if your exclusions differ from the guardian's, a genuinely-valid edge you verified here will be spuriously flagged stale there (or vice-versa).
   - **argv-safe:** the pattern originates from scanned repository content, not a trusted operator — never interpolate it into a shell string that gets `eval`'d or re-parsed; treat it exactly the way `scripts/map-guardian.mjs`'s own `XC-2` check does (`execFileSync('grep', ['-rlF', ...excludeDirFlags, '--', pattern, '.'], ...)` — argv array, `-F` fixed-string, `--` end-of-options guard, no shell involved). This is the same injection-class defense the guardian itself relies on.
3. **Match found** → keep the edge, set `namespace: "code-dep"`, `trust: "medium"`, and `verified_by: "grep:<pattern>"` — record the **exact literal pattern you searched for**, not a paraphrase or summary. `map-guardian.mjs` XC-2 re-runs this exact string later; if what you record doesn't match what you actually grepped, the guardian's re-check and your verification silently diverge. **Also set `relation`** to a short free-form label describing the dependency (e.g. `"copies"`, `"spawns"`, `"imports"` — see the vendored `fixtures/checkpoint-map.json` for real examples). `schemas/map.schema.json` requires `relation` on **every** edge, typed-link or code-dep; unlike typed-link, a code-dep `relation` is NOT restricted to the 11 VALID_RELATIONS (SPEC-003 SS D2/D3), but it must be present and non-empty or `map-emitter`'s schema validation will reject the whole assembled document at EMIT time, forcing an avoidable G4 loop.
4. **No match found** → **drop the candidate.** Do not emit it with an empty `verified_by` "for visibility" or "in case it's useful downstream." SPEC-003 E3 is explicit: an unverified code-dep is dropped before emit, never emitted as noise. There is no partial-credit state for a code-dep edge.

## Algorithm 4 — mint a stable edge `id` (CM-05)

Give **every** surviving edge — typed-link and code-dep alike — a stable id,
minted AFTER the endpoints are remapped to content-hash node ids:

```
edge.id = sha1("edge:" + from + "|" + to + "|" + relation)[:12]
```

- `from`/`to` are the **remapped content-hash node ids** (Algorithm 2 step 2 /
  Algorithm 3 — never the raw artifact id or file path), so the edge id is
  byte-stable run to run the same way node ids are (append-stability).
- This id is what `map-emitter` resolves each flow's consecutive node pair into,
  filling `flow.edge_ids` (SPEC-003 flow-completeness). Without it, every flow
  ships `edge_ids:[]` and lights no arrow — the v0.7.1 dogfood defect CM-05 that
  `map-guardian.mjs` GC-8 now WARNs on. `schemas/map.schema.json` allows `edge.id`
  (`additionalProperties:true` on edge items); it is additive, never required.
- The key is exactly `(from, to, relation)` — the same triple CM-24's dedup keys
  on — so two identical candidates collapse to ONE id by construction (dedup by id
  == dedup by `(from,to,relation)`; the explicit dedup pass is CM-24's job, but the
  id already makes duplicates share an id). `map-emitter` carries `edge.id` through
  **verbatim** — it never re-mints it.

## Algorithm 5 — dedupe by `(from, to, relation)` (CM-24)

After minting ids (Algorithm 4), **collapse any edges that share an `id`** — i.e.
the same `(from, to, relation)` triple — to exactly ONE edge. The v0.7.1 dogfood
emitted the same relationship two or three times (a typed-link the graph reported
AND a code-dep grep confirmed for the same pair; or two graph edges parsed from
duplicated mermaid lines), inflating the edge count and double-lighting flows.

- Dedup **globally**, across BOTH arrays — an edge can surface as a typed-link
  (from `.scan.fpl.json`) and independently as a code-dep (from a grep) for the
  same `(from,to,relation)`. Keep ONE.
- **Tie-break when two share an id:** prefer the **higher-trust** survivor —
  typed-link (`trust:"high"`, graph-sourced) over code-dep (`trust:"medium"`); if
  both are code-dep, keep the one carrying a non-empty `verified_by`. Never merge
  their fields into a franken-edge — pick one whole record.
- Direction matters for the id (`from`→`to` is ordered in the hash), so `A→B` and
  `B→A` are DISTINCT edges and both survive — dedup only collapses exact-triple
  repeats, not a genuine bidirectional pair.

This makes the emitted `edges[]` a clean set: one edge per real relationship, each
with a unique `id` — which is also what keeps `map-emitter`'s `edgeByPair` flow
resolution unambiguous.

## Output shape

Write exactly one file, `.forgeplan/map/.work/.edges.json`:

```jsonc
{
  "typedLink": [ /* id, namespace:"typed-link", trust:"high", relation ∈ 11 VALID_RELATIONS, endpoints remapped to content-hash ids */ ],
  "codeDep":   [ /* id, namespace:"code-dep", trust:"medium", relation:"<free-form, e.g. copies/spawns>", verified_by:"grep:<pattern>", endpoints remapped */ ]
}
```

## Self-check before returning control (this IS gate G3's condition — catch it here)

1. Every `codeDep` edge has a non-empty `verified_by` string in the `grep:<pattern>` form.
2. Every `typedLink` edge's `relation` is one of the 11 VALID_RELATIONS.
3. Every edge's `from`/`to` (in both arrays) resolves to a real `id` in `.extract.json`'s `nodes`.
4. Every edge (both arrays) carries a non-empty `id` minted as `sha1("edge:"+from+"|"+to+"|"+relation)[:12]` from the REMAPPED endpoints (Algorithm 4).

If any candidate fails one of these, it should already have been dropped during Algorithms 2/3 above — this self-check is a final sweep, not the primary enforcement point.

## Common pitfalls

| Pitfall | Correct behavior |
|---|---|
| Keeping a code-dep edge with empty `verified_by` "to show it was considered" | Drop it, silently — SPEC-003 E3 forbids emitting it as noise |
| Accepting a relation not in the 11-item list | Validate against the exact list before classifying as typed-link; otherwise drop |
| Building the grep command via string interpolation | Argv-safe invocation only (`-F --`) — pattern content is untrusted scan data |
| Recording `verified_by` as a summary ("found in build.mjs") instead of the pattern | Record the literal `grep:<pattern>` string — the guardian re-runs it verbatim |
| Leaving an edge endpoint as a raw artifact id or file path | Remap to the content-hash node id `zone-extractor` minted, or drop the edge |
| Writing verified edges into `map.json` | Output is scratch-only (`.work/.edges.json`); only `map-emitter` writes `map.json` content |
| Emitting an edge with no `id` (so flows can never light it) | Mint `sha1("edge:"+from+"|"+to+"|"+relation)[:12]` from the remapped endpoints on every edge — `flow.edge_ids` reference it (Algorithm 4, CM-05) |
| Emitting the same `(from,to,relation)` twice (graph + grep, or dup mermaid line) | Dedupe globally by id; keep the higher-trust survivor, never a franken-merge (Algorithm 5, CM-24). `A→B` and `B→A` are distinct and both stay |
