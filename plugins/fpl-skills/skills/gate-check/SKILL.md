---
name: gate-check
description: |
  Runs the quality gate between pipeline stages for a named artifact: reads the depth, loads
  thresholds from .forgeplan/quality-gates.yaml (falling back to the shipped template), executes
  validate + score + fgr per-artifact, runs gaps + blindspots as workspace advisories, and returns
  PASS or FAIL with the failed checks named and a concrete fix for each. Two modes: pre-build
  (between the design and build stages) and post-build (inside the evidence stage, Deep+ only).
  Read-only on the artifact — never edits it, never activates. Supports --force with a mandatory
  reason, recorded as a NOTE.

  Triggers: "gate check", "/gate-check", "can we build", "ready to build", "quality gate",
  "pre-build gate", "post-build gate", "is the spec good enough", "прогони гейт", "гейт качества",
  "можно ли кодить", "готово ли к сборке", "проверь пороги"
---

# gate-check — the quality gate between stages

RFC-002 INV-1: *"the `gate` stage is the only mechanism to move from `design` to `build`."*

Until this skill shipped, that mechanism was the order of steps inside a prompt (marketplace#237).
An invariant enforced by the sequence of paragraphs in a document is not enforced.

**Read-only.** Reads the artifact and the workspace, writes nothing except a NOTE when `--force` is
used. It returns a verdict; the caller decides what to do with it.

---

## What this gate can decide on, and what it cannot

Measured on forgeplan 0.34.0, not assumed. This is the first thing to read, because it is the
difference between a gate and a paragraph.

| Tool | Scope | Machine-readable | Role here |
|---|---|---|---|
| `validate` | per-artifact | `--json` | **gating** |
| `score` | per-artifact | `--json` (carries `fgr` inline) | **gating** |
| `fgr` | per-artifact | `--json` | **gating** (or read from `score`) |
| `gaps` | **workspace only** | no | advisory |
| `blindspots` | **workspace only** | no | advisory |

`gaps` and `blindspots` take no artifact argument. They answer "what is wrong in this workspace",
not "is this artifact ready". On the live tree `gaps` reports 64 MUST items across the whole graph;
gating on that count would block every artifact for reasons unrelated to it.

PRD-024 FR-006 names all five tools in one breath. They are all invoked and all reported — but only
the three that can be attributed to the artifact are allowed to fail the gate. The split is
recorded in PRD-024's FR-006 row rather than applied silently.

---

## Process

### Step 1 — Resolve the artifact and its depth

```bash
forgeplan get <ARTIFACT-ID> --json
```

**Read via the CLI, not MCP.** Measured 2026-09-02 on one artifact at one instant: the CLI returned
`updated_at 23:50:57` with the current body, MCP returned `21:53:26` with a two-hour-old one. The
gate reads the depth and the body from here; a stale read decides with the wrong thresholds against
the wrong text. Same class as PROB-002 / ADR-009, except the false report comes from our own tool
rather than a worker.

Depth comes from the artifact (`tactical` / `standard` / `deep` / `critical`).

**Check whether it was ever set.** `depth` defaults to `standard` from `.forgeplan/config.yaml` and
is reflected back for every artifact of every kind, so `standard` means "nobody decided" as often as
it means "someone chose Standard". Run `forgeplan calibrate <ID>`: if it suggests a different depth,
say so in the report header and name the thresholds you are actually applying. Do not silently
apply the calibrated depth — recording it is `/forge-cycle`'s job at the `estimate` stage, and a
gate that picks its own tier picks its own verdict.

### Step 2 — Load thresholds

Look for `.forgeplan/quality-gates.yaml` in the project. If absent, read the shipped defaults at
`${CLAUDE_PLUGIN_ROOT}/templates/quality-gates.yaml` — the interpolated plugin root, which resolves
wherever the plugin is installed. The repository path
`plugins/fpl-skills/templates/quality-gates.yaml` is a reference for readers of this repo, not a
path to open: in a user's project it does not exist, and falling back to it yields no thresholds at
all, which is a gate running with nothing to compare against.

A project file **overrides per key**, it does not replace the file. Merge over the defaults so a
project that sets only `standard.must.r_eff_min` keeps every other threshold.

Say which source you used in the report. A threshold nobody can locate is a threshold nobody can
argue with.

### Step 3 — Pick the mode

| Mode | When | Section |
|---|---|---|
| pre-build (default) | after the `design` stage, before `build` | `pre_build.<depth>` |
| `--post-build` | inside the `evidence` stage, Deep and Critical only | `post_build.<depth>` |

If `--post-build` is asked for at Tactical or Standard depth, say the section does not exist and
return PASS with that stated. Inventing thresholds for a depth the config deliberately omits is
worse than skipping.

### Step 4 — Run the checks

**Gating (per-artifact):**

```bash
forgeplan validate <ID> --json     # → results[0].errors, results[0].findings[]
forgeplan score <ID> --json        # → r_eff, fgr{formality,granularity,reliability}, r_eff_ci{evidence_count}
```

One `score` call covers `r_eff`, all three F-G-R components and the evidence count. Call `fgr`
separately only when `score` fails to return an `fgr` block.

**Advisory (workspace-wide, prose):**

```bash
forgeplan gaps
forgeplan blindspots
```

Read them, and report only what names the artifact under review or its direct links. A workspace
total belongs in the report as context, never in the verdict.

**`adi_evidence_required`** (Deep, Critical) — take the EVID ids from `score --json` → `evidence[]`
(neither `get --json` nor `forgeplan_get` returns a links field; the projection frontmatter lists
outgoing edges only, so informing EVIDs are invisible there). Read each body and count
`### Hypothesis` sections: ≥3 in at least one linked EVID (CLAUDE.md Sprint Z7). Fewer, or no linked
EVID at all, fails.

**`adr_linked_required`** (Critical) — an ADR linked `informs`, status `active`. Incoming edges are
not in `get --json` either; `forgeplan_graph` is the only source. That is a whole-workspace read for
one edge — the one check here that costs more than it looks like. If it is being skipped in
practice, drop it rather than leave a MUST nobody runs.

**`evidence_grew`** (post-build) — compare the evidence count to the pre-build run. If no pre-build
figure is available, say so and treat the check as unproven rather than passed: a build that
produced no new evidence has been asserted, not verified.

### Step 5 — Decide

**PASS if and only if every `must` check passes.** `should` failures are reported and do not block.

That distinction carries the whole design. A gate where everything blocks gets bypassed with
`--force` on its first false positive, and a bypassed gate protects nothing.

Every `must` in the shipped thresholds is **structural** — a MUST section present or absent, a
linked EVID carrying three hypotheses or not, an active ADR informing this artifact or none. No
`must` is a threshold on a score, because each score was tried and each failed measurement: `r_eff`
falls when an artifact is honestly audited, `granularity` tracks artifact kind rather than quality,
and `formality` flags a structurally complete MADR. Report all of them; block on none.

If you are tempted to promote a score to `must`, measure the block rate on artifacts the project has
already accepted first. The draft that promoted three of them blocked 56% of them.

### Step 6 — Report

Name the failed check, the measured value, the threshold, and what to do about it. FR-008 asks for
concrete improvements, and "R_eff too low" is not one.

```
gate-check PRD-081 — pre-build, depth=standard (config default; calibrate suggests Deep)
                     thresholds=.forgeplan/quality-gates.yaml

  FAIL  formality        0.42 < 0.60   PRD has no `## Acceptance Criteria`; add one AC per FR
  pass  validate errors  0
  warn  r_eff            0.30 < 0.50   (should) weakest link is ADR-010, not this artifact —
                                        fix there, or --force citing the inherited cascade
  warn  granularity      0.38 < 0.50   (should) FR-002 covers four behaviours — split it

  advisory: gaps 64 MUST workspace-wide, 1 naming this artifact — PRD-081 has no linked RFC
  advisory: blindspots — none

  VERDICT: FAIL — 1 must-check failed
  Override: /gate-check PRD-081 --force --reason "<why>"
```

**Always print `weakest_link` beside `r_eff`.** It comes from the same `score --json` call, and
without it the line reads as the artifact's own failure when it usually is not. `r_eff` is a
transitive graph minimum: an artifact with eight flawless EVIDs can score 0 because a neighbour
does. Naming the culprit is the difference between a finding and the sentence this step forbids.

**Say in the header when depth was never chosen** — `depth=standard (config default; calibrate
suggests Deep)`. A reader who does not know the tier was a default cannot judge whether the
thresholds applied were the right ones.

State the threshold source in the header on every run, passing or failing.

### Step 7 — `--force` (FR-014)

`--force` without `--reason` is **refused**. Report the refusal; do not prompt in a loop.

With a reason, create a NOTE and link it:

```python
note = mcp__forgeplan__forgeplan_new(
    kind="note",
    title=f"Gate override: {artifact_id} — {n} must-check(s) bypassed")
mcp__forgeplan__forgeplan_update(id=note["id"], body=...)   # failed checks, values, thresholds, reason
mcp__forgeplan__forgeplan_link(source=note["id"], target=artifact_id, relation="informs")
```

The NOTE body records **which** checks were bypassed with their measured values — not just that an
override happened. An override that does not say what it let through is a log line, not a record.

Then return PASS with `overridden: true`. The caller must be able to tell an earned pass from a
bought one.

---

## What this gate does not do

Stated, because a gate that hides its blind spots is worse than one that has none.

- **It does not read the code.** `validate`, `score` and `fgr` measure the artifact. A PRD can clear
  every threshold and describe the wrong system.
- **It does not replace `guardian`.** Guardian is the activation gate and reads the full evidence
  chain; this one runs *between stages* and reads thresholds. Where they overlap, guardian is the
  stricter and the later. Do not use this to skip it.
- **It cannot attribute `gaps` or `blindspots` to an artifact *machine-readably*.** They emit
  per-artifact lines (`PRD-069 Standard depth but no linked RFC`), so Step 4 does read them for
  mentions of the artifact — but with no `--json` that is prose parsing, which is why they advise
  and never block.
- **It does not judge whether the depth is right.** It applies the thresholds for the depth already
  recorded on the artifact.

## Relationship to the neighbours

| Skill | Question | When |
|---|---|---|
| `/gate-check` | may this artifact move to the next stage? | between stages |
| `guardian` (agent) | may this artifact be activated? | before activation |
| `/methodology-check` | which of the 4 pipeline layers are covered? | any time, read-only |
| `/forge-cleanup` | which drafts are stuck and why? | end of a cycle |

Reference: PRD-024 FR-006 / FR-007 / FR-008 / FR-014, RFC-002 INV-1, marketplace#237.
