# Post-#325 Action Plan

> **What this is**: a ready-to-run checklist for the moment when upstream [ForgePlan/forgeplan#325](https://github.com/ForgePlan/forgeplan/issues/325) closes. It operationalises the revisit trigger documented in ADR-006 Compliance section.
>
> **Why it exists**: when #325 closes, the next session should not have to re-derive the migration logic under context load. Pre-staged here, the entire post-fix work becomes a ~30-minute checklist run instead of a 2-hour rediscovery.
>
> **Authored**: 2026-05-23 (Sprint W readiness pack, PRD-051 / EVID-078).

---

## Trigger conditions (must ALL be true to start this checklist)

Per ADR-006 Compliance section:

1. forgeplan core has closed issue #325 AND shipped the fix in a new release.
2. A verification EVID demonstrates `forgeplan_score(EVID-X)` returns `r_eff > 0` for a freshly-created canonical leaf EVID (no child evidence, strict bold-pattern body).
3. A migration smoke test demonstrates `forgeplan_link(source=EVID, target=PRD, auto_activate_source_if_complete=True)` actually activates the source EVID (response includes `auto_activated: True`).

Use `scripts/check-issue-325-status.sh` to get the closure date in one call.

If conditions 1-3 are met, proceed with the steps below. If only condition 1 is met (issue closed but fix not verified locally), start with Verification phase only.

---

## Phase 1 — Verification (single session, ~10 min)

### 1.1. Update forgeplan binary

```bash
# Whatever the user's update mechanism is — homebrew / cargo install / etc.
# Confirm the new version contains the #325 fix:
forgeplan --version  # should be > 0.32.1
forgeplan release-notes --since v0.32.1 | grep -i "325\|leaf\|self_score"
```

### 1.2. Re-run the 3-EVID test case from EVID-074

The original test (Sprint U PRD-047 / EVID-074) used three EVIDs spanning the body-format spectrum:

```bash
# Re-score the same three artifacts — they should now report r_eff > 0
# if the fix is correct.
forgeplan score EVID-001  # raw YAML body — may still r_eff=0 (no canonical fields)
forgeplan score EVID-063  # mixed bold-pattern — partial fix expected
forgeplan score EVID-073  # strict canonical — should now be r_eff > 0
```

**Success criterion**: EVID-073 returns `r_eff >= 0.5` and `self_score > 0`. If yes, the fix works for leaf EVIDs.

### 1.3. Refresh the marketplace anomaly count

```bash
forgeplan health  # expect 82+ anomalies to drop sharply
forgeplan anomalies  # weakest_link_unresolvable count should fall toward zero
```

Record the before/after delta — that is the upstream impact and should be cited in EVID-079.

---

## Phase 2 — Decision revisit on ADR-006 (~10 min)

ADR-006 explicitly kept the 4-layer NEEDS_ACTIVATION sentinel because the native `auto_activate_source_if_complete` parameter required `r_eff > 0` (structurally unsatisfiable pre-#325). Once #325 is fixed:

### 2.1. Run a live native-primitive smoke test

```python
# In a Profile B agent body or inline orchestrator call:
forgeplan_link(
    source="EVID-079",         # the new readiness verification EVID
    target="PRD-051",
    relation="informs",
    auto_activate_source_if_complete=True,
)
# Inspect response — does it contain `"auto_activated": true`?
```

If the response confirms auto-activation, the native primitive is now functional in our usage pattern.

### 2.2. Author ADR-007 — either confirm KEEP CURRENT or supersede

Two valid outcomes:

- **Confirm**: even with native working, defence-in-depth still favours the 4-layer sentinel. ADR-007 records "tested, still prefer 4-layer". No code changes.
- **Supersede**: native is good enough; ADR-007 documents migration plan (replace sentinel parser in `/forge-cycle` Step 7.5, remove `NEEDS_ACTIVATION` emissions from 5 Profile B agents). Multi-sprint effort.

Default recommendation: **confirm KEEP CURRENT** unless the native primitive offers a concrete advantage (e.g., a third-party orchestrator that doesn't speak our sentinel). 12+ sprints of zero failures on the 4-layer system is hard to beat.

---

## Phase 3 — Cleanup of cosmetic noise (~5 min)

Once Phase 1 verifies the fix:

### 3.1. Re-test marketplace anomaly count

The 82 historical EVIDs should self-resolve once the formula reads bold-pattern body fields directly. Expect:

```
before fix:  weakest_link_unresolvable = 82
after fix:   weakest_link_unresolvable = <small number, likely 0-3>
```

The remaining few (if any) are likely NOTEs/PRDs that legitimately have no incoming evidence (e.g., NOTE-001 forgeplan route limitation has no need for child evidence). They are different from the leaf-EVID class.

### 3.2. Update mm-evid-body-convention mental model

Remove the "necessary but not sufficient" qualifier added in Sprint U:

```bash
mental_model_update id="mm-evid-body-convention" source_query="<remove caveat>"
```

The qualifier was correct for forgeplan v0.32.1 but obsolete once #325 lands.

### 3.3. Update mm-pipeline-anomalies

Mark Anomaly #25 as RESOLVED (was: "filed upstream, accept as noise"). Update the source_query to reflect upstream closure.

---

## Phase 4 — Create EVID-079 + activate (~5 min)

Following standard pattern from Sprint U-W:

```bash
# Create via parent_id auto-link (Nth consecutive #295 demo)
forgeplan_new(kind="evidence", title="Post-#325 verification — leaf-EVID self_score formula confirmed working", parent_id="PRD-051")

# Fill body using canonical bold-pattern per mm-evid-body-convention:
# - **Verdict**: PASS — Phase 1 verification successful, EVID-073 scored r_eff=X
# - **Congruence level**: 3 (live MCP invocations + before/after anomaly delta + native primitive smoke)
# - **Evidence type**: live_verification + upstream_closure

forgeplan_activate(id="EVID-079")
# PRD-051 should already be active from Sprint W; no need to re-activate.
```

---

## Phase 5 — Commit + PR + merge

Standard workflow:

```bash
git checkout -b chore/post-325-verification
git add docs/POST-325-VERIFICATION.md  # new file with the actual delta numbers
git add plugins/fpl-skills/AGENT-AUTHORING-GUIDE.md  # if Step 9b.1 caveat removed
git commit -m "chore: verify #325 fix, drop 'necessary but not sufficient' caveat"
git push -u origin chore/post-325-verification
gh pr create --base main --title "chore: post-#325 verification + caveat removal"
gh pr checks <N>  # wait for green
gh pr merge --squash --admin --delete-branch
```

---

## Rollback (if Phase 1 fails)

If `forgeplan_score(EVID-073)` still returns `r_eff=0` after the upstream binary update:

1. The fix was incomplete or hit a different code path. Document the new finding.
2. Add a comment to upstream issue #325 with the test data.
3. Do NOT proceed to Phase 2 — ADR-006 stays in force.
4. Update this document with the new status and what failed.
5. Skip Phase 3 cleanup (anomalies stay; that is current state anyway).

---

## Cross-references

- **ADR-006** — Original decision to keep 4-layer sentinel; defines the revisit trigger
- **PRD-047 / EVID-074** — Sprint U pivot that filed #325
- **PRD-051 / EVID-078** — This readiness pack (Sprint W follow-up)
- **mm-evid-body-convention** — Mental model carrying current body convention
- **mm-pipeline-anomalies** — Catalog of anomaly kinds (Anomaly #25 = structural noise pending #325)
- **AGENT-AUTHORING-GUIDE.md Step 9b.1** — Bold-pattern documentation
- **CLAUDE.md "Sprint U/V/adopt-#288 session"** — historical context

---

## Open questions for the moment of revisit

1. Did forgeplan core also expose `forgeplan_score(EVID, include_self_only=True)` for leaf-only scoring? Useful for orchestrator dashboards.
2. Did the fix change the `factors` array format? Our orchestrator may parse it elsewhere.
3. Are there migration tooling commands (e.g., `forgeplan rescore --all-evidence`)? Could batch-update r_eff_score in DB.

These are speculative — verify against actual release notes when the fix ships.
