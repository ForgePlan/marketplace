# Section 04 — Pipeline health and anomaly detection

**11 tools** for diagnosing project state. The "is anything wrong" surface. Read-only — any profile may call. Use these at session start, before activate gates, and as the canonical answer to "is the project healthy".

## 04.1 forgeplan_health — full health dashboard

The single canonical "where is this project" tool. Returns aggregate verdict + breakdown.

```python
forgeplan_health()
# → {"verdict": "healthy" | "needs_attention" | "unhealthy",
#    "verdict_summary": "1-line render", "next_actions": [...], ...}
```

**Branching pattern** for orchestrators:

```python
h = forgeplan_health()
if h["verdict"] == "unhealthy":
    halt_with_report(h)
elif h["verdict"] == "needs_attention":
    print_warning(h); continue
else:
    proceed
```

CLI: `forgeplan health` (or `forgeplan health --json` for parseable output).

## 04.2 forgeplan_status — counts by kind + status

Light-weight version of `_health`. Just the artifact counts.

```python
forgeplan_status()
# → {"by_kind": [{"kind": "prd", "count": 71}, ...],
#    "by_status": [{"status": "active", "count": 196}, ...], "total": 220}
```

Use when you only need volumetric stats, not gap analysis.

## 04.3 forgeplan_anomalies — pipeline anomaly detection (issue #289)

Detects 9 kinds of pipeline irregularities + classifies them by severity (low/medium/high) and tier (auto/adi/user).

```python
forgeplan_anomalies()
forgeplan_anomalies(severity="high")
forgeplan_anomalies(kind="stuck_draft")
forgeplan_anomalies(since="2026-05-20T00:00:00Z")    # diff-style polling
```

**Tier semantics** (from PRD-032):

- `auto` — orchestrator can fix without user input (e.g., stuck draft → re-validate)
- `adi` — needs FPF reasoning (re-route through `forgeplan_reason`)
- `user` — needs human decision (orchestrator surfaces, doesn't decide)

**Use case**: `/forge-cleanup` skill consumes this output to drive auto-fixes.

## 04.4 forgeplan_blindspots — decisions without evidence

Lists active PRD / RFC / ADR / Epic artifacts whose R_eff is below confidence threshold (no EVID, weak EVID, expired EVID).

```python
forgeplan_blindspots()
# → {"unbacked": ["PRD-049", "ADR-006"], "weak_evidence": [...],
#    "orphan_artifacts": [...]}
```

**Use case**: pre-release audit. "Which active decisions would surprise a reviewer because they have no backing?"

## 04.5 forgeplan_blocked — blocked artifacts + unmet dependencies

Shows draft artifacts that cannot progress because their structural parents are themselves draft/deprecated/superseded.

```python
forgeplan_blocked()                # all blocked artifacts
forgeplan_blocked(id="PRD-001")    # specific check
```

**Convention**: only `draft` blocks. `deprecated` / `superseded` artifacts are considered resolved.

## 04.6 forgeplan_orphans — brownfield orphans (issue #287 Phase C)

Surfaces brownfield-specific gaps:

- Uncovered use cases (UC without scenario links)
- Unverified invariants (INV without scenario links)
- Orphan glossary terms (GLOS not referenced in UC/INV bodies)
- Un-triangulated hypotheses (HYP with <2 evidence refs)

```python
forgeplan_orphans()
```

**Use case**: brownfield discovery sessions ([`08-brownfield-discovery`](08-brownfield-discovery.md)) to surface what the discover protocol missed.

## 04.7 forgeplan_contradictions — cross-artifact contradictions (issue #287 Phase C)

Detects contradiction patterns. v1 covers `hypothesis_duplicate` (Jaccard ≥ 0.6 on titles). Three more classes deferred to LLM-judged path.

```python
forgeplan_contradictions()
# → {"hypothesis_duplicate": [{...}], "invariant_conflict": [],
#    "glossary_divergence": [], "scenario_vs_invariant": [],
#    "limitations": ["..."]}
```

## 04.8 forgeplan_coverage — code module decision coverage

Maps source files / modules to the architectural decisions that govern them. Surfaces modules without any decisions.

```python
forgeplan_coverage()
# → {"covered": [...], "blind": [...]}
```

**Pre-requisite**: artifacts must declare `affected_files:` in frontmatter (PRD-024).

## 04.9 forgeplan_coverage_business — domain model coverage (issue #287 Phase C)

Domain-model-specific coverage. Reads a `DM-NNN` artifact's `## Composition` section to derive expected counts of UC / GLOS / INV / SCEN / HYP and compares to actual counts.

```python
forgeplan_coverage_business(domain_model_id="DM-001")
# → {"extract_score": 0.7, "expected": {...}, "actual": {...}}
```

## 04.10 forgeplan_decay — evidence decay impact on R_eff

Lists artifacts where expired EVID has degraded R_eff. Shows current vs fresh score comparison.

```python
forgeplan_decay()
# → {"affected": [{"id": "PRD-008", "current_reff": 0.3, "fresh_reff": 0.7}, ...]}
```

**Use case**: scheduled audit ("which decisions need re-evidence after their EVID's `valid_until` expired").

## 04.11 forgeplan_drift — code drift after decision

Detects when files declared in an ADR / RFC's `affected_files:` have been modified after the artifact was created — drift signal.

```python
forgeplan_drift()
# → {"drifted": [{"id": "ADR-005", "changed_files": [...], "decision_date": "..."}]}
```

**Known limitation**: false-negatives on markdown-table `affected_files` (forgeplan#293, filed pre-Sprint A-E). Use `git log --since=<artifact_created>` as a manual sanity check.

## 04.12 forgeplan_stale — expired valid_until

Lists artifacts whose `valid_until` date has passed.

```python
forgeplan_stale()
# → {"expired": [{"id": "...", "days_since_expiry": 12}, ...]}
```

Use to drive `forgeplan_renew` (CLI-only — see [`09-activity-and-audit`](09-activity-and-audit.md)) when artifacts need their validity extended.

## Composition pattern — full pre-release audit

```python
# Profile B-orchestrator (smith) calling the full health surface
session = forgeplan_session()
health = forgeplan_health()
anomalies = forgeplan_anomalies(severity="high")
blindspots = forgeplan_blindspots()
blocked = forgeplan_blocked()
stale = forgeplan_stale()

# Compose verdict
if health["verdict"] == "healthy" and not anomalies["anomalies"]:
    return "Ready to ship"
else:
    return "Issues: " + render(anomalies, blindspots, blocked)
```

Used by `/autorun` and `/forge-cycle` at session-start to know whether to proceed or halt.
