---
name: map-emitter
description: "Document-assembly, pre-write invariant-guard, and atomic-write algorithm for forgeplan-map-pack's EMIT stage (RFC-023 Proposed Direction SS1 roster row 7 + Invariant #1; PRD-075 FR-5; SPEC-003 SS C0 the one-sentence contract, SS C3 gate G4). Covers: assembling meta/canvas/composition/zones/nodes/edges from the extraction+edges+composition inputs, the pre-write self-check trio RFC-023's own function signature assigns to this stage (no zone-cell overlap, every edge endpoint in nodes, every node.zone in zones -- independently re-derived afterward by the guardian's GC-2, NOT to be confused with SPEC-003's differently-numbered C1 INV-1/2/3 trio which this stage satisfies by disciplined passthrough construction instead), the reject-own-output-before-write rule, the exact tmp-rename atomic-write recipe mirroring map-guardian.mjs's own write, and the status:proposed + NEEDS_CONFIRM sentinel contract. Invoked by the map-emitter agent only. Triggers: \"assemble map.json\", \"invariant guard before write\", \"atomic tmp-rename write\", \"NEEDS_CONFIRM sentinel\", \"status proposed\"."
disable-model-invocation: true
---

# Skill: map-emitter — the EMIT-stage assembly, guard, and atomic-write algorithm

Reusable algorithm knowledge for the `map-emitter` agent's EMIT stage (forgeplan-map-pack pipeline) — the **sole writer of `.forgeplan/map/map.json`'s content** (RFC-023 Invariant #1). Grounded in RFC-023 Proposed Direction SS1/SS4/Invariants, ADR-016 (roster decision), ADR-017 (the guardian, not this agent, owns the `proposed→confirmed` flip), and SPEC-003 SS C0/C1/C3/C4/D1/D6/E3.

## A note on two differently-scoped "3 invariants" — read this before the rest

SPEC-003 itself warns: *"GC-2 (3 assembly guards re-derived independently — a DIFFERENT trio from the C1 INV-1/2/3 set despite the numeric collision; do not conflate the two 'three invariants' phrasings)."* This skill takes that warning seriously, because RFC-023's own function-signature line for `map-emitter.emit(...)` names the **assembly-guard trio** (no cell-overlap; every edge endpoint ∈ nodes; every node.zone ∈ zones) — the same trio SPEC-003 calls **GC-2** — as what this stage actively self-checks before writing. The **C1 trio** (INV-1 edge-superset, INV-2 content-hash ids, INV-3 no-x/y) is "the core bet" the whole system depends on, but this stage satisfies it by **disciplined construction**, not by an active re-derivation:

- **INV-1** (edge superset) holds because this stage only ever copies through the edges `edge-verifier` already produced, never inventing extra keys beyond the sanctioned set.
- **INV-2** (content-hash ids) holds because this stage never re-mints or renames an id — it uses `zone-extractor`'s ids verbatim. (Active re-derivation, comparing across *runs*, is `map-guardian.mjs` GC-6's job — it needs a prior `source_fingerprint` to compare against, which this stage doesn't have reason to compute itself.)
- **INV-3** (no x/y) holds trivially because none of this stage's inputs (extraction, edges, composition, canvas) carry geometry — never add an `x`/`y` field, full stop.

So: **two guard mechanisms, applied at the same moment, for different reasons.** Get both right; don't let one substitute for the other.

## Inputs

- `.forgeplan/map/.work/.extract.json` — `zone-extractor`'s output (`zones[]`, `nodes[]`, empty `layers[]` in P1).
- `.forgeplan/map/.work/.edges.json` — `edge-verifier`'s output (`typedLink[]` + `codeDep[]`, already trust-classified and endpoint-resolved).
- The composition + canvas objects — the same `compositions/<template>.yaml`-sourced data `zone-extractor` bucketed against (loaded fresh by this stage, or threaded through by the orchestrator — either way it MUST be bit-for-bit the same composition_id the extraction used, or `node.zone`/`composition.placements` will silently disagree).

## Algorithm 1 — assemble the document

Build the full `forgeplan.map/v1` document:

```jsonc
{
  "schema": "forgeplan.map/v1",
  "meta": {
    "map_id": "<uuid>",
    "status": "proposed",                 // ALWAYS — see Algorithm 4
    "project_type": "<from composition/typer>",
    "composition_id": "<template id>",
    "source_fingerprint": "<carried through from the SCAN stage, not recomputed here>",
    "version": 1                          // or prior + 1 if a previous map.json exists; the fuller
  },                                       // added_node_ids/stale_node_ids differ (`increments[]`) is
                                            // Phase 2 — do not attempt it here (SPEC-003 D6)
  "canvas": { /* pass through from the composition, unchanged */ },
  "composition": { /* pass through from the composition, unchanged */ },
  "zones": [ /* from extraction.zones, cols/accent/treatment/rule_edge/layout_rule pinned */ ],
  "nodes": [ /* from extraction.nodes, id/zone/provenance intact, mega-nodes included */ ],
  "edges": [ /* typedLink + codeDep concatenated, in whatever order is stable */ ],
  "flows": [ /* derived from the composition's flow_hints — see below */ ]
  // "layers" and "increments" are Phase-2-only (SPEC-003 D6) — omit both in P1, do not populate
}
```

## Algorithm 1b — derive `flows[]` from the composition's `flow_hints`

Flow chips are the composed-map's **headline feature** (click a chip → dim everything, light the end-to-end path with animated edges + a numbered step caption). The first rendered real map emitted `flows: []`, so the view showed **no chips at all** — the whole flow-navigation experience was dark (O-2). When the selected composition supplies `flow_hints[]`, resolve EACH hint into one `flows[]` entry:

- **`id`** ← the hint's `id`; **`name`** ← the hint's `name` **verbatim** — it is the chip label, kept short (2–3 words) by the composition author; never expand it into a sentence.
- **`node_ids`** ← walk the hint's `path` (a list of zone ids, in order) and collect a handful of representative nodes whose `zone` is in the path, **in path order** (e.g. the entry/most-connected node per zone, a few per zone — not every node). Every id MUST be a real node in the assembled `nodes[]`.
- **`edge_ids`** ← the ids of emitted `edges` that connect two consecutive `node_ids` in the flow, when such an edge exists (optional; omit if none).
- **`steps`** ← the hint's `steps_ru` (RU narration, per SPEC-003 D5) — copy them; do not invent extra steps.

**Skip a hint entirely if its `path` zones contain NO extracted nodes** — never emit an empty flow (a chip that lights nothing). If the composition has no `flow_hints` (e.g. `generic`), write `flows: []` — that is honest, not a defect. A flow whose `node_ids` don't all resolve to real nodes is a self-reject before write (same discipline as the assembly-guard trio).

## Algorithm 2 — schema validation (E5: one schema, three call sites)

Before writing, validate the assembled document against `schemas/map.schema.json` — the **same** schema file `map-guardian.mjs` (GC-1) and forgeplan-web's `entities/map/lib/validate.ts` load. This catches required-field gaps, the pinned-literal enums (`treatment: "neutral-dashed"`, `rule_edge: "off"`, `layout_rule: "grid"`, `composition.arrangement: "stack-ttb"`), and the `--map-accent-*` token pattern on `zone.accent` — structural checks that are a different, broader net than Algorithm 3's assembly-guard trio below.

## Algorithm 3 — the pre-write assembly-guard trio (RFC-023's "3 invariant guards"; = SPEC-003 GC-2)

Re-derive these three, from the assembled document itself, before writing anything to disk:

1. **No zone-cell overlap.** For every `composition.placements[i]`, compute the cells it occupies (`row..row+row_span-1` × `col..col+col_span-1`) and confirm (a) they fit within `canvas.grid.rows`/`canvas.grid.cols`, and (b) no two placements' cells overlap. (This mirrors `map-guardian.mjs`'s `checkGC2AssemblyGuards` exactly — occupied-cell map, span-aware.)
2. **Every edge endpoint ∈ nodes.** For every edge in the assembled `edges[]`, both `from` and `to` must equal some `nodes[].id`.
3. **Every `node.zone` ∈ zones.** For every node, `zone` must equal some `zones[].id`.

**Reject your own output before writing if any of the three fails.** This is not advisory — write **nothing** (not a partial file, not a best-effort document) when a check fails. A missing `map.json` is an honest, clean signal gate **G4** reads as FAIL ("map.json exists..." — it doesn't) and loops back to EMIT; a written-but-broken `map.json` is a silent-pass risk (PROB-035/039 class) this pipeline exists to avoid. The guardian re-derives this exact trio independently afterward as **GC-2** — that is generator≠verifier applied to a single check: you self-check once before committing, the guardian re-checks again without trusting your claim.

## Algorithm 4 — status and the sentinel (never write "confirmed")

Always write `meta.status: "proposed"`. **Never** write `"confirmed"` — only `scripts/map-guardian.mjs` exit 0 may perform that flip, and it does so via its own separate `fs` write, not through this agent's `Write` tool call at all (ADR-017; RFC-023 Invariant #1's one sanctioned exception). On a successful write, print to stdout, verbatim:

```
<<NEEDS_CONFIRM: N zones, M nodes, K edges (J grep-verified)>>
```

where `N = zones.length`, `M = nodes.length` (including mega-nodes), `K = edges.length` (typed-link + code-dep combined), `J = ` the count of edges with `namespace === "code-dep"` (the ones that went through `edge-verifier`'s grep pass). Gate **G4** checks for this sentinel's literal presence — a write without it is an incomplete EMIT even if the JSON itself is well-formed.

## Algorithm 5 — atomic write (mirrors `map-guardian.mjs`'s own write exactly)

Never write `map.json` in place. Write the full serialized document to a sibling tmp path, then rename over the real path — the identical two-step discipline `scripts/map-guardian.mjs` uses for its own later `meta.status` flip (`writeFileSync(tmpPath, ...)`; `renameSync(tmpPath, mapPath)`):

```
write  .forgeplan/map/map.json.tmp   (full document, pretty-printed)
rename .forgeplan/map/map.json.tmp -> .forgeplan/map/map.json
```

A direct in-place write risks a reader (the guardian, forgeplan-web's `GET /api/map`) observing a torn/partial file mid-write. Note that this `Write` (or the rename) is a real tool call and passes through `hooks/scripts/map-emitter-gate.sh` — the hook allows it because the target is exactly `map/map.json` and (per its best-effort identity probe) the calling identity is `map-emitter`.

## Common pitfalls

| Pitfall | Correct behavior |
|---|---|
| Writing `status: "confirmed"` | Never — only the guardian script's own `fs` write may do that (ADR-017) |
| Writing `map.json` despite a failed assembly-guard check | Write nothing; let G4 read "file missing" as the honest FAIL |
| Treating INV-1/2/3 (C1) as something to actively re-derive here | They hold by passthrough discipline (never add edge keys, never re-mint ids, never add x/y) — the active re-check trio here is the assembly-guard one (cell-overlap / edge-endpoint / node-zone), per RFC-023's own function signature |
| In-place write to `map.json` | tmp-write then rename, every time |
| Omitting or rewording the sentinel | Emit the exact `<<NEEDS_CONFIRM: N zones, M nodes, K edges (J grep-verified)>>` string |
| Populating `layers[]` or `increments[]` "for completeness" | Both are Phase-2-only (SPEC-003 D6) — leave them out of the P1 document |
| Recomputing `source_fingerprint` from scratch here | It is a SCAN-stage fact (repo mtimes) carried through, not re-derived at EMIT |
