---
name: methodology-check
description: |
  For any artifact ID, report which of the EPIC-001 4-layer pipeline layers (S10 FPF design,
  S11 BMAD quality gate, S12 OpenSpec structure, S13 Forgeplan automation) are satisfied and
  which need work. Also checks C4 coverage for ≥3-module architectural decisions. Returns a
  per-layer score 0-2 + aggregate percentage + concrete action items per gap. Read-only — never
  auto-fixes, never writes to forgeplan. Use before activating any Standard+ artifact as a final
  sanity check.

  Triggers: "methodology check", "check methodology", "4-layer coverage", "layer report",
  "/methodology-check", "проверь методологии", "layer coverage", "pipeline check",
  "coverage report", "method check"
---

# /methodology-check — 4-Layer Pipeline Coverage Report

For any forgeplan artifact, this skill reports which of the EPIC-001 methodology layers are
satisfied and which need attention. The output is a structured markdown table with a per-layer
0-2 score plus concrete action items for every gap found.

**Read-only contract**: this skill never calls `forgeplan_update`, never writes files, and never
dispatches other agents. It reports; the user or orchestrator decides what to do.

Foundation: EPIC-001 «4-Layer Pipeline Enforcement (S10→S13)» — Sprints Z6-Z10.

---

## When to use

- Before calling `forgeplan_activate` on any Standard+ artifact — final sanity check.
- When a PR reviewer or guardian flags methodology gaps — get a diagnostic.
- Periodic audit: run against a set of active PRDs to find which need backfill work.
- User asks «is PRD-NNN fully covered?», «does this ADR meet all layers?», «methodology check».

## When NOT to use

- Tactical-depth artifacts — only S12 + S13 apply; `N/A` is already the correct answer for S10/S11.
- Auto-fixing: if a gap is found, dispatch the appropriate agent (see action items in the report).
- Checking test coverage, code coverage, or linting — that is `tester` / `code-reviewer` territory.

---

## Procedure

### Step 1 — Parse target

Accept the artifact ID from the skill invocation argument or from the user's message. Supported
kinds: `PRD-NNN`, `RFC-NNN`, `ADR-NNN`, `EPIC-NNN`, `SPEC-NNN`.

If no ID is provided, ask the user:
> «Which artifact would you like to check? (e.g. PRD-061, ADR-007, RFC-002)»

### Step 2 — Fetch artifact

```python
artifact = forgeplan_get(id=<target>)
```

Extract and record:
- `artifact.status` — draft / active / stale / superseded / deprecated
- `artifact.depth` — tactical / standard / deep / critical
- `artifact.body` — full body for inline parsing
- `artifact.links` — all linked artifact IDs (via the `links` field or by parsing `## Related Artifacts` in body)
- `artifact.kind` — prd / rfc / adr / epic / spec

If `forgeplan_get` fails (artifact not found) → stop and report:
```
ERROR: Artifact <target> not found in the forgeplan workspace.
```

### Step 3 — Identify applicable layers

Build the layer checklist based on `depth` and `kind`:

| Layer | When applicable |
|---|---|
| **S12 OpenSpec** (structure) | Always — every artifact |
| **S13 Forgeplan** (automation) | Always — every artifact |
| **S10 FPF** (design) | depth = standard / deep / critical |
| **S11 BMAD** (quality gate) | depth = standard / deep / critical |
| **C4** (architecture extension) | ADR or RFC kind, AND body contains ≥3 distinct module references |
| **RIPER** (production-bug discipline) | Bug-fix artifact (EVID/PRD whose body, title, or parent links indicate production bug / incident / regression / race condition / SEV-1/SEV-2/P0/P1) AND depth is non-tactical |

For tactical depth: mark S10, S11, and RIPER as `N/A` in the report (not required).

Record the applicable layer set. This drives Steps 5-10.

### Step 4 — Fetch linked EVIDs

From the artifact links (or by scanning the body for `EVID-NNN` patterns), collect all referenced
evidence IDs. Fetch each:

```python
for evid_id in linked_evid_ids:
    evid = forgeplan_get(id=evid_id)
    # record body for S10 + S11 parsing
```

If no EVIDs are linked at all → S10=0 and S11=0 immediately (skip detailed checks for both).

### Step 5 — S10 FPF check (design layer)

**Skip if**: depth=tactical (mark N/A).

Look in each linked EVID body for ADI hypothesis markers:
- `## Hypotheses considered`
- `### H1` / `### H2` / `### H3` (or `### Hypothesis 1` etc.)
- `**H1:**` / `**H2:**` / `**H3:**` bold-pattern inline
- `forgeplan_reason` output block (heading `## ADI Cycle` or `## FPF Reasoning`)

Count **distinct** hypothesis mentions across ALL linked EVIDs. A hypothesis is distinct if it
describes a different option/approach, not just a repeated mention.

**Scoring**:
| Hypotheses found | Score | Status |
|---|---|---|
| ≥3 distinct hypotheses in any EVID | 2 | ✅ SATISFIED |
| 1-2 hypotheses found | 1 | ⚠️ PARTIAL |
| 0 hypotheses found | 0 | ❌ BLOCKER |

Record which EVID (if any) contains the hypotheses.

### Step 6 — S11 BMAD check (quality gate layer)

**Skip if**: depth=tactical (mark N/A).

Among all linked EVIDs, look for Profile B reviewer evidence. Identify a Profile B EVID by any
of these markers in the EVID body:
- Text «Profile B reviewer» or «Profile B»
- Title containing «BMAD review», «adversarial review», «quality review»
- Bold verdict pattern `**Verdict**: PASS` / `**Verdict**: CONCERNS` / `**Verdict**: BLOCKER`

For each candidate Profile B EVID, check:
1. Does the body contain a `## Findings` section?
2. Does it have ≥1 line item under `## Findings`?
3. Is a verdict (`PASS` / `CONCERNS` / `BLOCKER`) explicitly stated?

**Scoring**:
| Condition | Score | Status |
|---|---|---|
| ≥1 Profile B EVID + `## Findings` (≥1 item) + explicit verdict | 2 | ✅ SATISFIED |
| Profile B EVID exists but `## Findings` is empty or absent | 1 | ⚠️ PARTIAL |
| No Profile B EVID found at all | 0 | ❌ BLOCKER |

Record the EVID ID and verdict if found.

### Step 7 — S12 OpenSpec check (structure layer)

Count inbound + outbound links for the target artifact. Links can come from:
- The `links` field in the `forgeplan_get` response
- The `## Related Artifacts` table in the body
- Any `EPIC-NNN`, `PRD-NNN`, `RFC-NNN`, `ADR-NNN` reference with a relation word
  («refines», «informs», «based_on», «supersedes», «parent»)

**Delta-spec check** (for superseded artifacts or artifacts with a `supersedes` link):
Look for `## Delta-spec` in the body — or the four sub-sections:
- `### ADDED`
- `### MODIFIED`
- `### REMOVED`
- `### UNCHANGED`

**Scoring**:
| Condition | Score | Status |
|---|---|---|
| ≥1 link present AND (no supersede, OR supersede + `## Delta-spec` present) | 2 | ✅ SATISFIED |
| ≥1 link present BUT supersede detected without `## Delta-spec` | 1 | ⚠️ PARTIAL |
| Artifact is orphan (0 links) | 0 | ❌ BLOCKER |

Record the link count and whether delta-spec is present.

### Step 8 — S13 Forgeplan check (automation layer)

Run:
```python
validation = forgeplan_validate(id=<target>)
score = forgeplan_score(id=<target>)
```

Parse:
- `validation.status` — PASS / FAIL / WARNINGS
- `score.r_eff` — effective readiness score (float 0.0–1.0)

**Scoring**:
| Condition | Score | Status |
|---|---|---|
| validate PASS + r_eff > 0 | 2 | ✅ SATISFIED |
| validate PASS + r_eff = 0 | 1 | ⚠️ PARTIAL (likely forgeplan#325 leaf-EVID gap) |
| validate FAIL | 0 | ❌ BLOCKER |

Note: r_eff=0 on a leaf EVID is a known cosmetic issue (forgeplan#325). Flag as PARTIAL, not BLOCKER,
unless the artifact is a PRD/RFC/ADR (not EVID itself) and r_eff=0 — that indicates missing child
evidence and is a genuine gap.

### Step 9 — C4 check (conditional — architectural decisions only)

**Apply when**: `kind` is `adr` or `rfc` AND the body contains ≥3 distinct module references.

**Module detection heuristic** — scan body for patterns:
- `### Module ` (heading prefix)
- `**Module <name>**` bold pattern
- `module X` / `service X` / `component X` (case-insensitive, where X is a proper noun)
- Named items in a `## Components` or `## Modules` or `## Services` section

If ≥3 distinct module/service/component names are found → C4 check applies.

**C4 file detection**:
1. Look for a relative link to `docs/c4/` in the body (e.g. `docs/c4/ADR-NNN.md`)
2. Check body for C4 diagram markers: ` ```mermaid` block containing `flowchart` or `C4Context`
3. Look for `## C4 Diagrams` section or reference to `/c4-diagram` skill

**Scoring**:
| Condition | Score | Status |
|---|---|---|
| C4 file referenced OR mermaid C4 block present in body | 2 | ✅ SATISFIED |
| C4 mentioned in prose but no file/diagram found | 1 | ⚠️ PARTIAL |
| ≥3 modules detected but no C4 mention at all | 0 | ❌ MISSING |
| <3 modules detected | N/A | — |

### Step 10 — RIPER check (production-bug discipline)

**Apply when**: the target artifact (or its parent PRD/EVID) is a **bug-fix artifact for a non-trivial production bug**, AND depth is non-tactical. Detect via any of these signals in the artifact title, body, or parent PRD body:

- Title or body mentions: `production bug`, `prod bug`, `incident`, `postmortem`, `post-mortem`, `outage`, `regression`, `race condition`, `SEV-1`, `SEV-2`, `P0`, `P1`, `продакшн баг`, `прод баг`, `гонка`, `регрессия`, `инцидент`.
- Parent PRD links to an incident / outage / postmortem context.
- Artifact `kind=evidence` whose linked parent matches the row 4 of smith routing-map (`Bug fix — production, non-trivial`).

**Skip if**: artifact is a trivial hotfix (matches `typo`, `off-by-one`, `broken link`, `hotfix`, `опечатка`, `хотфикс`, single-line fix) — RIPER overhead exceeds value. Mark RIPER as N/A in the report.

**Scoring**: per linked EVID (or the artifact body itself if `kind=evidence`), inspect for RIPER Research-mode discipline.

| Condition | Score | Status |
|---|---|---:|
| Dedicated Research-EVID linked OR substantive `## Research` section in EVID body (≥10 lines with concrete findings: stack trace, repro steps, suspect commits, hypotheses) | 2 | ✅ SATISFIED |
| `## Research` section present in body but stub-quality (≤5 lines, no concrete findings) OR mentioned in prose without dedicated section | 1 | ⚠️ PARTIAL |
| Bug-fix EVID with no `## Research` section AND no linked Research-EVID — code change without documented investigation | 0 | ❌ BLOCKER |

**Action item if score <2**:
> Run `/riper` (Research mode) before any more code changes on this bug fix. RIPER discipline forbids implementation without a Research artifact — see `plugins/fpl-skills/skills/riper/SKILL.md` and smith routing-map row 4 (Production bug, non-trivial). Tag the EVID with the methodology label `RIPER (production-bug discipline)` once the Research section lands.

Record which EVID (if any) carries the Research artifact, and whether the bug was classified trivial (skip) or non-trivial (apply).

### Step 11 — Aggregate report

Compute:
- **Total score**: sum of all applicable layer scores
- **Max possible score**: 2 × (number of applicable layers, excluding N/A)
- **Percentage**: (total / max) × 100, rounded to nearest integer

Determine overall verdict:
| Percentage | Verdict |
|---|---|
| 100% | ✅ COMPLETE |
| 75-99% | STRONG |
| 50-74% | ⚠️ NEEDS WORK |
| 25-49% | ❌ WEAK |
| <25% | ❌ FAIL |

If ANY layer scores 0 (BLOCKER) → append `— BLOCKED` to the verdict regardless of percentage.

---

## Output report format

```markdown
## /methodology-check report for <ARTIFACT-ID>

**Title**: <artifact title>
**Status**: <status> | **Depth**: <depth> | **Kind**: <kind>

| Layer | Status | Score | Detail |
|---|---|---:|---|
| S10 FPF (design) | ✅ | 2/2 | EVID-NNN: 3 hypotheses (H1/H2/H3) |
| S11 BMAD (quality gate) | ⚠️ | 1/2 | EVID-MMM exists but ## Findings is empty |
| S12 OpenSpec (structure) | ✅ | 2/2 | 3 links (refines EPIC-001, informs PRD-XXX, based_on ADR-YYY) |
| S13 Forgeplan (automation) | ✅ | 2/2 | validate PASS + r_eff=0.95 |
| C4 (arch extension) | N/A | — | <3 modules detected |
| RIPER (production-bug discipline) | N/A | — | not a bug-fix artifact |

### Overall: 7/8 (87%) — STRONG

### Action items
- ⚠️ **S11**: EVID-MMM `## Findings` is empty — dispatch `agents-pro:artifact-reviewer` with adversarial mandate. See [BMAD discipline](../../../CLAUDE.md#bmad-adversarial-review-discipline).
- ℹ️  **S10**: 3 hypotheses present — satisfactory. Consider a 4th edge-case hypothesis if relevant.

### Activation readiness
- ✅ Ready to activate once S11 gap is resolved.
- Blockers preventing activation: 0 hard blockers (S11 is CONCERNS, not BLOCKER).
```

**Zero-EVID case** (no evidence linked at all):

```markdown
## /methodology-check report for PRD-NNN

**Title**: ...
**Status**: draft | **Depth**: standard | **Kind**: prd

| Layer | Status | Score | Detail |
|---|---|---:|---|
| S10 FPF (design) | ❌ | 0/2 | No EVIDs linked — ADI cycle required |
| S11 BMAD (quality gate) | ❌ | 0/2 | No EVIDs linked — Profile B review required |
| S12 OpenSpec (structure) | ❌ | 0/2 | Orphan — no links to any artifact |
| S13 Forgeplan (automation) | ❌ | 0/2 | validate FAIL — no evidence |
| C4 (arch extension) | N/A | — | Not an architectural decision |
| RIPER (production-bug discipline) | N/A | — | Not a bug-fix artifact |

### Overall: 0/8 (0%) — ❌ FAIL — BLOCKED

### Action items
- ❌ **S10**: Run `forgeplan_reason PRD-NNN` (MCP) or `/fpf-reason` skill (interactive). Create EVID with ≥3 hypotheses + ADI cycle. See [FPF ADI discipline](../../../CLAUDE.md#fpf-adi-discipline).
- ❌ **S11**: After S10, dispatch `agents-pro:artifact-reviewer` for adversarial review. EVID body MUST contain `## Findings` with ≥1 item. See [BMAD discipline](../../../CLAUDE.md#bmad-adversarial-review-discipline).
- ❌ **S12**: Link this artifact to its parent Epic or context PRD via `forgeplan_link`. Use relation `refines`, `informs`, or `based_on`.
- ❌ **S13**: After evidence linked, run `forgeplan_validate PRD-NNN` — must return PASS before activating.

### Activation readiness
- ❌ NOT ready to activate — 4 blockers found.
```

---

## Hard rules

1. **Never auto-fix layer violations** — this skill reports only. The user or orchestrator decides what dispatch to make based on action items.
2. **Read-only on the target artifact** — do NOT call `forgeplan_update`, `forgeplan_link`, `forgeplan_new`, or any mutation tool.
3. **Tactical artifacts get reduced layer check** — depth=tactical only checks S12+S13. S10, S11, and RIPER are marked `N/A` (not a gap, not scored).
4. **C4 check is heuristic** — false positives (detecting "service" in a non-architectural context) are possible. If the C4 heuristic fires unexpectedly, note it in the report and let the user confirm.
5. **RIPER check is heuristic** — the bug-fix signal is keyword-based (production / incident / SEV-1/2 / race condition / regression). If the heuristic fires unexpectedly (e.g. the word "regression" appearing in a statistical context, not a bug context), note the suspect signal in the report and let the user override to N/A.
6. **r_eff=0 on leaf EVID is cosmetic** — do not flag it as a hard BLOCKER for the parent PRD. Note the forgeplan#325 upstream issue.
7. **One invocation per artifact** — do not recursively check linked artifacts (e.g. do not run methodology-check on the linked EVIDs). This is a flat one-artifact report.

---

## Error handling

| Error | Response |
|---|---|
| `forgeplan_get` not found | Stop. Report `ERROR: <ID> not found`. |
| `forgeplan_validate` unavailable | Mark S13 as ⚠️ PARTIAL with note «forgeplan_validate unavailable». |
| `forgeplan_score` unavailable | Mark r_eff as unknown; degrade S13 score to 1 if validate PASS. |
| No `links` field in artifact | Fall back to scanning body for `EVID-NNN`, `PRD-NNN` patterns. |
| EVID body fetch fails | Mark that EVID as «body unavailable»; use what remains. |

---

## Companion skills and references

- [`/supersede`](../supersede/SKILL.md) — use after S12 gap: creates delta-spec-compliant successor.
- [`/decay-watch`](../decay-watch/SKILL.md) — scan all active ADRs for fired revisit triggers.
- [`/decision`](../decision/SKILL.md) — record a new decision; run `/methodology-check` after.
- `agents-pro:artifact-reviewer` — dispatch for S11 BMAD adversarial review.
- `forgeplan_reason <ID>` — generate ADI hypothesis cycle (S10 FPF).
- [`/riper`](../riper/SKILL.md) — RIPER orchestrator (Research → Innovate → Plan → Execute → Review); dispatch after a RIPER score <2 on a production-bug artifact.
- EPIC-001 — canonical 4-layer pipeline definition.
- PRD-066 — RIPER auto-routing for production bugs (Step 10 of this skill).
- CLAUDE.md `## FPF ADI discipline`, `## BMAD adversarial review discipline`, `## OpenSpec delta-spec discipline`, `## C4 diagrams for ≥3-module architectural decisions` — detailed rules per layer.

---

## Anti-patterns

- ❌ **Running `/methodology-check` then auto-dispatching fixes** — the skill surfaces gaps; a human or orchestrator with ADI gate decides what to do. Blind auto-dispatch wastes agent turns on gaps that may be intentionally deferred.
- ❌ **Using score as a merge gate** — methodology-check is advisory. Guardian does the formal gate (guardian reads EVID directly; it doesn't call this skill).
- ❌ **Reporting score=0 for tactical artifacts on S10/S11** — tactical artifacts don't require ADI or adversarial review. Correct behaviour: N/A, not BLOCKER.
- ❌ **Calling forgeplan_validate without handling WARNINGS gracefully** — WARNINGS from validate are not FAIL. Map them to S13=1 (PARTIAL), not S13=0 (BLOCKER).
- ❌ **Counting the same hypothesis twice** — H1 mentioned in EVID-001 and re-quoted in EVID-002 counts as 1, not 2. De-duplicate by content, not by occurrence.
