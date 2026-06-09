---
name: forge-insight
description: |
  Methodology: insight layer over forgeplan anomaly detection (PRD-074 Layer 2 + don't-forget ledger; RFC-019 brick 1). Deterministic known-noise filter + on-demand semantic digest + idempotent NOTE-013 findings-section writer. Complements the silent SessionStart insight-watchdog hook (same filter, automatic) with a richer manual pass.
  EN: On-demand deep audit of the forgeplan artifact tree's health. Reads forgeplan_anomalies (+ health + blindspots), filters the two known-noise classes (weakest_link_unresolvable per forgeplan#325 + benign phase_mismatch), ranks survivors by severity, caps at 5, and explains "what each means" — collapsing a 133KB / 189-line raw dump into a few honest observations. For every medium+ finding it upserts a `Kind: finding` row into NOTE-013's dedicated `## Machine findings (auto-tracked)` section (idempotent by finding_id, auto-closes vanished findings, hard cap 20) so real issues are not forgotten. Read-only on the audited tree; the ONLY write is the NOTE-013 findings section (never the human deferral table).
  RU: Разбор здоровья дерева forgeplan по запросу. Читает аномалии (+ health + слепые зоны), фильтрует известный шум (нулевые баллы #325 + безобидные фазовые), ранжирует по важности, максимум 5, объясняет "что это значит" — сворачивает сырой дамп 133КБ/189 строк в несколько честных наблюдений. Каждую находку важности medium+ пишет строкой `Kind: finding` в секцию NOTE-013 `## Machine findings (auto-tracked)` (идемпотентно по finding_id, авто-закрывает исчезнувшие, потолок 20) — чтобы реальные проблемы не забывались. Только чтение аудируемого дерева; единственная запись — секция находок NOTE-013, человеческую таблицу не трогает.
  Triggers: "forge insight", "/forge-insight", "what does forgeplan say", "что говорит forgeplan", "разбор дерева", "tree health digest", "insight digest", "покажи находки", "deep audit forgeplan"
origin: forgeplan
disable-model-invocation: true
---

# /forge-insight — on-demand artifact-tree insight digest

The deep, on-demand half of PRD-074's self-aware-integrity loop (RFC-019 brick 1, Layers 2 + 4-write). Where the `insight-watchdog.sh` SessionStart hook is a silent, deterministic background signal, `/forge-insight` is the richer manual pass: it reads the detector surface, applies the **same** noise filter so the numbers can't disagree, adds a human-readable "what it means" per finding, and persists real findings into NOTE-013 so they aren't forgotten.

This skill is **read-only on the audited tree** (Profile C posture). The one and only write is the NOTE-013 `## Machine findings (auto-tracked)` section — and even that touches ONLY content between its own markers (the human deferral table is never altered).

---

## When to use / when NOT to use

**Use when:**
- You want "what does forgeplan say about the tree right now?" — a deep, explained audit on demand.
- The SessionStart watchdog surfaced something and you want the full digest + persistence.
- Before a release or after a big batch of artifact work — to confirm the tree is clean (or get the short list of what isn't).

**Do NOT use when:**
- You just want raw anomalies — call `forgeplan anomalies` (CLI) / `forgeplan_anomalies` (MCP) directly. This skill is the *filtered, explained* layer on top.
- You want to FIX findings — this skill only surfaces + records them. Acting on a finding (auto-fix / ADI / task) is Layer 4, a later RFC. This skill writes the queue Layer 4 will drain.
- For draft cleanup — that's `/forge-cleanup` (stuck-draft sweep). Orthogonal.

---

## The filter rule (insight-core — shared with the hook)

This is the single authoritative filter. The `insight-watchdog.sh` hook implements the identical rule in shell+python so its numbers and this skill's always agree (RFC-019 Risk R-2 — one rule, two call sites).

1. **Drop known-noise kinds** — `weakest_link_unresolvable` (all; structural noise per forgeplan#325 — leaf notes/EVIDs with no child evidence score 0) and `phase_mismatch` (all; benign "active but early-cycle phase" advisory).
2. **Keep severity ∈ {medium, high}.** Low-severity survivors are noise for this digest.
3. **Rank** high before medium, then most-recent (`observed_at`) first.
4. **Cap the digest at 5 observations.** (The NOTE-013 ledger has its own cap of 20.)
5. **Every number comes from the detector payload** — never invent or cache a count (PRD-074 NFR-002 accuracy, zero tolerance).

> Caveat (RFC-019 R-3 / PRD-074 Q4): `phase_mismatch` is dropped wholesale because every live instance is the benign advisory. If a non-benign phase combination is ever found, narrow the rule to the benign subset only — a one-line change here and in the hook.

---

## Process (5 steps)

### Step 1 — Read the detector surface

```
mcp__forgeplan__forgeplan_anomalies()        # primary — {anomalies[], by_severity, by_tier, total}
mcp__forgeplan__forgeplan_health()           # context — verdict + at_risk + phase_mismatches
mcp__forgeplan__forgeplan_blindspots()       # context — decisions without evidence + orphans
```

If `forgeplan_anomalies` overflows inline (it can be 100KB+), call the CLI form (`forgeplan anomalies --json`) and aggregate by `kind`/`severity` with `python3` (not `jq` — `jq` is not guaranteed present; the watchdog uses `python3` for the same reason) rather than reading the raw payload — you only need the survivors after filtering, not the full dump.

### Step 2 — Apply the filter (insight-core rule above)

Drop known-noise kinds, keep severity ≥ medium, rank, cap at 5. Record the noise count (`total − survivors`) for the digest footer.

### Step 3 — Enrich each survivor with "what it means"

For each surviving finding, add a one-line plain-language interpretation grounded **only** in that finding's own fields (`kind`, `affected`, `description`, `suggested_resolution`). Do NOT restate counts the filter didn't produce. Examples:
- `circular_dependency` on [PRD-9, RFC-9] → "PRD-9 and RFC-9 depend on each other — the graph has a loop that blocks clean ordering."
- `missing_must_section` on [PRD-12] → "PRD-12 is active but missing a required section — it was activated with a gap."
- `expired_evidence` on [ADR-3] → "ADR-3's supporting evidence is past its valid_until — its trust score is decaying."

### Step 4 — Persist real findings (don't-forget) into NOTE-013

For each **medium+** survivor, upsert a row into NOTE-013's `## Machine findings (auto-tracked)` section. This is the "не забывать" mechanism — one unified register (the maintainer's directive), with discipline so it never becomes a dump:

1. `mcp__forgeplan__forgeplan_claim("NOTE-013")` — claim for the read-modify-write (concurrency guard, RFC-019 R-7).
2. `mcp__forgeplan__forgeplan_get("NOTE-013")` — read the current body.
3. **Bootstrap the section if absent**: if there is no `<!-- MACHINE-FINDINGS:BEGIN -->` … `<!-- MACHINE-FINDINGS:END -->` fence, append one BELOW the human deferral table + detailed DEFER-NNN blocks:
   ```
   ## Machine findings (auto-tracked)

   <!-- MACHINE-FINDINGS:BEGIN -->
   <!-- Auto-tracked by /forge-insight + insight-watchdog. Distinct Kind: finding. Do not hand-edit. -->
   <!-- MACHINE-FINDINGS:END -->
   ```
4. **Upsert each finding** as ONE row, keyed by `finding_id` (see contract below):
   ```
   - [ ] **Kind**: finding — <finding_id> — <anomaly_kind> — <affected[]> — sev=<severity> tier=<suggested_tier> status=open — observed <ISO8601> — <what_it_means>
   ```
   - existing `finding_id` → update its row in place (no duplicate on re-detection).
   - new `finding_id` → append.
5. **Auto-close vanished findings**: any `Kind: finding` row currently `- [ ]` (open) whose `finding_id` is NOT in this run's survivor set → flip to `- [x]` `status=resolved`. (Resolved rows older than one cycle may be pruned.)
6. **Enforce the cap (N=20 open rows)**: if more than 20 would be open, keep highest-severity / most-recent, drop the rest, and note "(N capped)" in the digest.
7. Write the body back with `mcp__forgeplan__forgeplan_update("NOTE-013", body=<full edited body as a literal string>)` — **edit ONLY between the markers** (the human table above is byte-for-byte preserved; INV-5).
8. `mcp__forgeplan__forgeplan_release("NOTE-013")`.

> **Hooks never do this write** — the SessionStart watchdog only prints; persistence is exclusively this skill's MCP path (hooks cannot call MCP). On a clean tree (zero medium+ survivors) Step 4 is skipped entirely — NOTE-013 gains nothing.
>
> **NOTE-013 `body=` is a literal string, not `@file`** (forgeplan#350) — pass the loaded+edited body content directly.

### Step 5 — Report the digest

Print ≤5 observations + a known-noise footer (see Output format). If zero real findings: report the tree is clean and what the known noise is (so the user knows the 189-low items were considered, not missed).

---

## Finding contract (Layer-4 hand-off — frozen interface)

The `Finding` object is the single coupling point to the future Layer-4 heal-loop (which routes findings onto PRD-032's 3 tiers). This skill produces it; Layer 4 will consume it (by parsing the NOTE-013 section or from this skill's return). Shape:

```
Finding = {
  finding_id:     sha1(anomaly_kind + ":" + sorted(affected).join(",")) [:12]   # excludes observed_at → same problem maps to same row
  anomaly_kind:   string
  affected:       id[]
  severity:       "medium" | "high"
  suggested_tier: "auto" | "adi" | "user"     # from the detector's suggested_resolution.tier — the L4 routing key
  suggested_action: string
  suggested_target: id | null
  rationale:      string
  observed_at:    ISO8601
  what_it_means:  string                       # this skill's enrichment
  status:         "open" | "resolved"
}
```

This skill does NONE of the routing/fixing — no `forgeplan_phase_advance`, no `forgeplan_reason` as a resolution, no task dispatch. That is Layer 4 (INV-8).

---

## Output format

```
🔭 forgeplan insight — <N> issue(s) need attention (of <total> anomalies; <noise> known-noise filtered)

1. [high] circular_dependency — PRD-9, RFC-9
   → PRD-9 and RFC-9 depend on each other; the graph loop blocks clean ordering.
   tracked: NOTE-013 finding <id> (status=open)

2. [medium] missing_must_section — PRD-12
   → PRD-12 active but missing a required section.
   tracked: NOTE-013 finding <id> (status=open)

Known noise (filtered, not shown): 183 weakest-link (#325) + 6 phase advisories.
```

On a clean tree:

```
🔭 forgeplan insight — tree clean. 0 real issues.
   189 anomalies are all known low-severity noise (183 weakest-link #325 + 6 phase advisories). NOTE-013 unchanged.
```

---

## Anti-patterns

- **Don't dump raw anomalies.** The whole point is the filter — 133KB → ≤5 lines. If you're pasting the raw list, you've skipped Step 2.
- **Don't invent counts.** Every number is from the detector payload (NFR-002). The enrichment is prose only.
- **Don't write to the human deferral table.** Machine findings live ONLY between the `MACHINE-FINDINGS` markers, as `Kind: finding`. A human deferral (e.g. an upstream issue to file) goes in the human table as `Kind: issue` — never the reverse (INV-5).
- **Don't act on findings here.** Surfacing + recording only. Fixing is Layer 4.
- **Don't write on a clean tree.** Zero medium+ survivors → NOTE-013 untouched, one-line "tree clean" output.

---

## Related skills

- **`insight-watchdog.sh`** (hook, same plugin) — the silent SessionStart sibling. Same filter, automatic, no NOTE-013 write. This skill is the manual deep pass.
- **`/forge-cleanup`** — stuck-draft sweep (3-tier AUTO/ADI/USER per PRD-032). Orthogonal: cleanup acts on drafts; insight surfaces anomalies.
- **`/decay-watch`** — ADR Revisit Trigger + NOTE-013 human-deferral scanner. Will be taught to recognise the new `Kind: finding` rows and treat them on a separate track (RFC-019 R-8 follow-up).
- **`/methodology-check <ID>`** — per-artifact 4-layer coverage. Orthogonal: methodology-check audits one artifact's pipeline coverage; insight audits the whole tree's health.

---

## References

- **PRD-074** — parent vision (4-layer self-aware integrity); this skill is Layer 2 (insight) + the Layer-write half of don't-forget.
- **RFC-019** — brick-1 design (insight-core filter + watchdog hook + this skill + NOTE-013 findings-section writer + Finding contract).
- **PRD-032** — self-healing foundation (3-tier model) that Layer 4 will route onto.
- **NOTE-013** — the unified register; this skill writes the `## Machine findings (auto-tracked)` section, never the human deferral table.
- **forgeplan#289** — `forgeplan_anomalies` detector. **forgeplan#325** — the weakest-link noise this filters.
