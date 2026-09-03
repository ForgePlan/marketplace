---
name: wrap
description: |
  Closes a forgeplan cycle at the `wrap` stage. At Deep and Critical depth it runs the real
  reconciliation — forgeplan drift, forgeplan stale, forge-heal and a link audit — and records their
  actual output in a REFRESH artifact with a ready verdict, per ADR-020. At Standard and Tactical it
  runs the same reconciliation and reports it without creating an artifact. Refuses to write a
  REFRESH whose body would be a self-reported "all good" instead of pasted tool output.

  Triggers: "wrap up", "/wrap", "close the cycle", "cycle close", "finish the cycle",
  "ready for the next cycle", "закрой цикл", "заверши цикл", "подведи итог цикла",
  "wrap stage", "refresh artifact"
---

# wrap — the `wrap` stage

The last stage. Answers *is this cycle actually closed, or does it only look closed*.

ADR-020 decided the shape of this in full — REFRESH as a depth-gated cycle-close node — and the
decision reached the authoring guide and the routing map but **never reached `/forge-cycle`**: the
stage sat at `primary: "inline"` and the word `refresh` appeared nowhere in the executor
(marketplace#233). A decision the runner does not implement is a document.

---

## Depth decides whether an artifact is created

| Depth | What happens |
|---|---|
| Deep, Critical | run the reconciliation, **create a REFRESH artifact** `based_on` the cycle's EVID |
| Standard, Tactical | run the same reconciliation, report it, **create nothing** |

Per ADR-020: at Standard and Tactical the reconciliation is already covered by `/decay-watch`,
`/forge-heal` and the journal, so a REFRESH there would duplicate rather than add. Depth comes from
the artifact — `/forge-cycle` Step 4.65 records it; if it is the untouched `standard` default, say so
and treat it as Standard.

**Через `/forge-cycle` эта стадия — только Deep+.** `wrap.depth_filter` в матрице стоит `deep+`, а
отфильтрованная стадия пропускается молча, поэтому строка Standard/Tactical выше относится к прямому
вызову `/wrap`, а не к прогону цикла. Через цикл на Standard сверку делают `/decay-watch` и
`/forge-heal`.

---

## Process

### Step 1 — Run the reconciliation, all four

```bash
forgeplan drift --json              # decisions whose affected files changed after they were made
forgeplan stale --json              # artifacts whose valid_until has expired
forgeplan health --json             # verdict, drafts, anomalies
```

plus `/forge-heal` for the findings ledger, and a link audit: for each artifact touched this cycle,
does every link still resolve and point the right way.

**`drift` and `stale` take no artifact ID** — both are workspace-wide (verified against the CLI and
the MCP schema; neither accepts a parameter). Run them whole and **filter to this cycle's artifacts
yourself**; report the rest as context, not as this cycle's findings. Writing `forgeplan drift
<ID>` gets you the whole workspace with an argument the tool ignored.

**A clean `drift` is weak evidence, not proof.** Its parser misses `affected_files` stored as a
markdown table — measured on ADR-005, which returned `changed_files: []` while `git log` showed
three of its ten files had changed (Anomaly #18, forgeplan#293). When the cycle touched code, say
what `git log --since=<artifact created>` shows alongside what `drift` returned.

**Keep the output.** Step 3 needs the text, not your summary of it.

### Step 1b — Coverage, when the cycle touched code (marketplace#263)

```bash
forgeplan coverage        # decision coverage per code module; no --json form
```

Workspace-wide and honest about it: measured 2026-09-04 it reported "1% (2/185 modules)" because it
scans **everything under the workspace root**, including directories no artifact governs. Filter to
the modules this cycle touched and report whether they gained a governing decision; the workspace
total is context for the `## Gaps closed` section, never a finding against this cycle. A cycle that
shipped code into a module with no decision coverage is worth one sentence in the REFRESH — it is
tomorrow's drift.

### Step 1c — Optional: capture the cycle's loose decisions

`forgeplan_capture(decision="...")` (MCP; needs a configured LLM provider) turns a decision made in
conversation into a NOTE or ADR — use it for calls made during the cycle that never rose to an
artifact. One capture per real decision; do not capture the cycle's summary, that is what the
REFRESH is for. If the provider is absent the tool fails loudly — record that as "capture
unavailable", not as "no loose decisions".

### Step 2 — Below Deep, stop here

Report what the four returned and finish. No artifact. Say which depth was applied and why there is
no REFRESH, so the absence reads as a decision rather than an omission.

### Step 3 — At Deep and Critical, write the REFRESH

```python
r = mcp__forgeplan__forgeplan_new(kind="refresh", title="Cycle close: <what the cycle did>")
mcp__forgeplan__forgeplan_update(id=r["id"], body=...)
mcp__forgeplan__forgeplan_link(source=r["id"], target="<EVID of this cycle>", relation="based_on")
```

Four sections, all required. `guardian` returns **CONCERNS** on a REFRESH missing any of them, or on
a readiness assertion with no reconciliation output behind it (guardian Step 5, ADR-020 / CLAUDE.md
G9) — not BLOCKER, so a rubber-stamp is caught by the reviewer chain rather than by the gate:

```markdown
## Synced
<pasted output of forgeplan drift and forgeplan stale>

## Gaps closed
<pasted output of /forge-heal — what was found, what was fixed, what was left and why>

## Links updated
<the link audit: what was checked, what moved, what is still broken>

## Ready verdict
YES | NO — <one sentence>. On NO, name the blocker and who owns it.
```

**`YES` or `NO`, those words.** ADR-020 writes the verdict as "yes/no + blocker"; the requirement
that the literal uppercase tokens appear is `guardian`'s, at `plugins/agents-pro/agents/guardian.md`
(the REFRESH structural-completeness row). A verdict written any other way (`READY`, `✅`, "looks
good") reads to that gate as a missing verdict, and the REFRESH comes back CONCERNS for a wording
choice rather than a real gap.

**Created via generic `artifact-author`. There is no kind-specialist for REFRESH and that is
deliberate** (ADR-020) — the reconciliation is done by the existing skills; this records their real
output and the verdict.

### Step 4 — The anti-false-green rule

**Paste the actual tool output. Never a self-reported "all good."**

ADR-020 calls this load-bearing, and it is the whole value of the node: a REFRESH that rubber-stamps
manufactures a "cycle closed" signal that nothing else in the graph will contradict. The same
discipline as `completed` meaning *you re-ran the verification yourself*, not *an agent said it
passed*.

If a reconciliation step could not run — tool missing, command failed — write **that**, with the
error. An unrun check recorded as clean is the failure this section exists to prevent.

CLAUDE.md records the limit honestly (G9): guardian can check that the four sections exist and that
a verdict is present. It cannot tell pasted output from convincing prose. That half is on the author,
whose identity is on the artifact.

---

## Report

```
wrap PRD-081 — depth deep → REFRESH-004 created

  drift        2 of 9 affected files changed since creation — src/gate.ts, src/thresholds.ts
  stale        none
  health       healthy · 0 drafts · 2 medium anomalies (unrelated to this cycle)
  forge-heal   1 finding, AUTO-resolved (phase_mismatch on PRD-081)
  links        6 checked, 6 resolve, 1 direction corrected (EVID-233 informs → based_on)

  verdict      YES — the two drifted files are this cycle's own changes
```

At Standard the same block, ending `no REFRESH — Standard depth, per ADR-020`.

---

## What this does not do

- **It does not activate anything.** The cycle's artifacts are activated at `activate`; this records
  that the dust settled.
- **It does not fix what it finds.** `/forge-heal` fixes; this runs it and records the result. A
  finding left open belongs in the REFRESH body with a reason, not silently repaired here.
- **It cannot verify its own honesty.** See Step 4.

## Neighbours

| Skill | Question |
|---|---|
| `/wrap` | is this cycle closed? |
| `/decay-watch` | what has aged out across the whole graph? |
| `/forge-heal` | what can be repaired, and at which tier? |
| `/forge-cleanup` | which drafts are stuck? |

`/wrap` runs the others for one cycle and records the result. It does not replace them: they sweep
the workspace, this closes a cycle.

Reference: ADR-020 (REFRESH as depth-gated cycle-close), PRD-024 (`wrap` stage), CLAUDE.md G9,
marketplace#233.
