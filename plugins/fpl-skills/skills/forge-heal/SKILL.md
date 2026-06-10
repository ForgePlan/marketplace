---
name: forge-heal
description: |
  Methodology: Layer 4 heal-or-task loop (PRD-074 brick 2 / RFC-020) — propose-not-silent 3-tier dispatch (AUTO / ADI / USER per PRD-032) of the Finding[] that /forge-insight + the insight-watchdog already surfaced. Consumes the frozen RFC-019 Finding contract; never re-detects or re-classifies.
  EN: Acts on the machine findings recorded by /forge-insight (the NOTE-013 `## Machine findings (auto-tracked)` ledger). Routes each finding onto PRD-032's 3 tiers: AUTO (a hard 2-kind reversible allowlist — phase_mismatch→phase_advance, complete stuck_draft→activate — applied only after a batch confirm + logged + rolled-backable), ADI (ambiguous: an FPF reasoning pass that auto-applies ONLY if high-confidence AND reversible, else escalates), USER (content/irreversible/cross-team: writes a tracked task row + suggests the right marketplace agent, never auto-applies). Default is PROPOSE-and-wait — it NEVER silently mutates the tree (the "AI auto-fixed and broke it" failure PRD-074 exists to prevent); silent-AUTO exists only behind an explicit per-kind opt-in. Every heal action is journaled and one-call reversible.
  RU: Действует на находки, записанные /forge-insight (секция NOTE-013 `## Machine findings`). Маршрутизирует по 3 уровням PRD-032: АВТО (жёсткий список из 2 обратимых типов — продвинуть фазу / активировать готовый черновик — только после подтверждения, с журналом и откатом), РАЗБОР (неоднозначное: FPF-разбор, авто-применяет ТОЛЬКО если уверен И обратимо, иначе эскалирует), ЧЕЛОВЕК (смысловое/необратимое/межкомандное: заводит задачу + предлагает агента, сам не применяет). По умолчанию — ПРЕДЛОЖИТЬ и ждать, НИКОГДА не менять дерево молча. Каждое действие в журнал, откат одной командой.
  Triggers: "forge heal", "/forge-heal", "fix the findings", "почини находки", "разрули проблемы дерева", "heal the tree", "auto-fix anomalies", "что чинить"
origin: forgeplan
disable-model-invocation: true
---

# /forge-heal — Layer 4 heal-or-task loop

The acting half of PRD-074's self-aware-integrity loop (RFC-020, brick 2). Brick 1 (insight digest + watchdog + NOTE-013 ledger, RFC-019) SEES and RECORDS findings; `/forge-heal` ACTS on them — auto-fixing the safe few, reasoning over the ambiguous, and turning the rest into tracked tasks for the right agent.

**Load-bearing safety rule: propose-not-silent.** This is the first layer that mutates the tree. By default it PROPOSES a batch and waits for one confirm — it never silently changes anything, with one narrow exception (an explicit per-kind opt-in for the named reversible AUTO kinds). Every action is journaled and one-call reversible.

---

## When to use / when NOT to use

**Use when:**
- `/forge-insight` (or the SessionStart watchdog) surfaced real findings and you want to act on them.
- You want a guided pass: "here's what I can safely auto-fix, here's what needs reasoning, here's what needs you."

**Do NOT use when:**
- You only want to SEE findings — that's `/forge-insight` (read-only). This skill acts.
- For stuck-draft sweep — that's `/forge-cleanup` (3-tier on DRAFTS). `/forge-heal` is 3-tier on ANOMALY findings. Orthogonal; same tier model.
- To re-detect or re-classify — the detector (`forgeplan_anomalies`) already set each finding's `suggested_tier`. This skill ROUTES by it; it does not re-classify.

---

## The 3-tier routing model

Each `Finding` carries `suggested_tier` from the detector. `/forge-heal` routes by it — but with a safety gate on AUTO (a detector mis-tier is demoted, never silently applied).

### Tier AUTO — auto-fix, reversible, machine-certain (hard 2-kind allowlist)

A finding is AUTO **only if BOTH** its detector `suggested_tier == "auto"` **AND** its kind is on this allowlist. Anything `auto`-tiered but off-allowlist is **demoted to USER** (surfaced, not applied).

| Kind | AUTO action | Precondition (re-checked at apply) | Rollback (one call) |
|---|---|---|---|
| `phase_mismatch` | `forgeplan_phase_advance --to <next>` (record the CURRENT phase into the journal first) | active ∧ early-cycle phase ∧ R_eff>0 | `forgeplan_phase_advance --to <recorded prior phase>` — NOT `undo_last` (it reverses only destructive ops delete/supersede/deprecate; `phase_advance` is additive and writes no undo receipt) |
| `stuck_draft` (complete EVID) | `forgeplan_activate` | verdict ∧ congruence_level>0 ∧ links present ∧ R_eff>0 | `forgeplan_deprecate` → `forgeplan_restore` |

Nothing else is ever AUTO. No AUTO delete, no AUTO content-write, no AUTO link-break a human set.

### Tier ADI — ambiguous, reason first

`mistyped_based_on`, `circular_dependency`. Run an FPF reasoning pass (`forgeplan_reason` on the affected artifact, or dispatch `agents-pro:research-analyst`). Auto-apply the reasoned fix **only if** the reasoning is high-confidence AND the action is reversible; otherwise escalate the finding to USER. ADI is the safety net — when in doubt, it becomes a USER task.

### Tier USER — content / irreversible / cross-team, never auto-applied

`missing_must_section`, `orphan_link`, `expired_evidence`, `duplicate_artifact` (and any escalated ADI case). `/forge-heal` does NOT fix these. It writes a tracked task row + suggests the right agent, and waits for your approval to dispatch.

### Per-kind USER-tier dispatch table

| Finding kind | Suggested agent / action (on your approval) |
|---|---|
| `missing_must_section` | `agents-sparc:specification` or `agents-pro:artifact-maintainer` — author the missing section |
| `circular_dependency` | `agents-pro:architect-reviewer` → `agents-pro:adr-architect` — decide which edge to cut |
| `mistyped_based_on` | `agents-pro:artifact-maintainer` (after ADI confirms the correct relation) |
| `duplicate_artifact` | `/supersede` skill — keep one, supersede the other with a delta-spec |
| `orphan_link` | pure-USER decision — you pick: link it, deprecate it, or accept (no auto-dispatch; intent is yours) |
| `expired_evidence` | pure-USER decision — refresh the evidence or deprecate the claim (no auto-dispatch) |

---

## Process

### Step 1 — Load findings from TWO sources (by tier)

Layer 4 reads two sources, because RFC-019's digest filter intentionally HIDES the two AUTO housekeeping kinds from the ledger (they are low-severity noise for the user, but still safe-auto-fixable):

- **AUTO backlog — re-query the detector directly.** Call `forgeplan_anomalies` filtered to the 2 AUTO-allowlist kinds (`phase_mismatch`, complete `stuck_draft`). These never reach NOTE-013 — RFC-019 drops `phase_mismatch` by kind and low-severity `stuck_draft` by the severity floor — so the AUTO path MUST source them from the detector. Re-reading the detector for these two reversible kinds is fetching the housekeeping backlog the digest hides; it is NOT re-detecting findings.
- **ADI + USER findings — drain the NOTE-013 ledger.** Read the open `Kind: finding` rows from NOTE-013's `## Machine findings (auto-tracked)` section (the medium+ findings `/forge-insight` recorded), OR take `Finding[]` from a just-run `/forge-insight`.

Either way each finding carries the same frozen RFC-019 shape (`finding_id`, `anomaly_kind`, `affected`, `severity`, `suggested_tier`, `suggested_action`, `suggested_target`, `status`) — the AUTO-source findings are constructed from the detector payload using that SAME shape (not a redefinition; INV-7).

### Step 2 — Route each finding to a tier

- `suggested_tier == "auto"` AND kind ∈ AUTO allowlist → **AUTO bucket**.
- `suggested_tier == "auto"` but kind ∉ allowlist → **demote to USER** (a detector mis-tier must never silent-apply).
- `suggested_tier == "adi"` → **ADI bucket**.
- `suggested_tier == "user"` → **USER bucket**.
- `weakest_link_unresolvable` never reaches Layer 4 — RFC-019's filter drops it as structural noise (forgeplan#325); it is neither in the NOTE-013 ledger nor fetched by the AUTO re-query. Not Layer 4's concern (handled upstream / by the deprecated-exclusion fix tracked for forgeplan core).

### Step 3 — AUTO: propose batch, confirm, apply, journal, auto-close

1. Present the AUTO batch: "N reversible fixes ready — apply? [each: kind, target, action, rollback]". (Unless the user has an explicit per-kind silent-AUTO opt-in for a named kind, in which case those apply without the prompt — still journaled.)
2. On confirm: for each, **re-check the precondition live** (R_eff>0 etc.). If a precondition no longer holds at apply-time (R_eff dropped to 0, the EVID lost a link, the phase already advanced) → **skip that fix, demote the finding to USER, and log the skip** — never force-apply a fix whose precondition failed.
3. For `phase_mismatch`: **read + record the artifact's CURRENT phase first** (`forgeplan_get` / `forgeplan_phase`) — that recorded value IS the rollback target. Then apply the reversible op (`forgeplan_phase_advance --to <next>` / `forgeplan_activate`).
4. **Journal** the action: what changed, which finding_id, the rollback command. Append to the finding's NOTE-013 row (`status=healed action=<op> rollback=<cmd>`).
5. The finding auto-closes on the next `/forge-insight` pass (RFC-019 auto-close) when the anomaly is gone.

### Step 4 — ADI: reason, then apply-if-safe or escalate

For each ADI finding, run `forgeplan_reason` on the affected artifact (or dispatch `research-analyst`). If the reasoning yields a high-confidence AND reversible fix → propose it (back through Step 3's confirm + journal). Otherwise → escalate to USER (Step 5). Never auto-apply an ADI fix that is irreversible or low-confidence.

### Step 5 — USER: write a task + suggest an agent

For each USER finding (incl. escalated ADI + demoted AUTO):
1. Update its NOTE-013 row to a tracked task: keep `Kind: finding`, set `status=open tier=user`, append `→ dispatch: <agent from the table>` so it's actionable. (Claim-guarded, section-scoped write per RFC-019 — never touch the human deferral table.)
2. Surface it to the user with the suggested agent: "PRD-12 missing a required section — dispatch `specification` to author it? [yes/skip]".
3. On approval, the orchestrator dispatches the named agent. `/forge-heal` itself does NOT apply the content fix — it routes the work.

### Step 6 — Report

Summarise: N auto-fixed (with rollbacks), N reasoned (applied/escalated), N tasks created (with suggested agents). Nothing was changed that you didn't confirm.

---

## Safety invariants (never violated)

- **INV-1 (propose-not-silent):** Layer 4 PROPOSES and waits for confirm; it never silently mutates the tree, except the explicit per-kind silent-AUTO opt-in for a named reversible kind.
- **INV-2 (AUTO only reversible):** every AUTO action has a one-call rollback. No AUTO delete, no AUTO content-write, no AUTO break of a human-set link.
- **INV-3 (double gate on AUTO):** AUTO requires BOTH the detector's `auto` tier AND allowlist membership; a mis-tier is demoted to USER, never applied.
- **INV-4 (every action journaled):** what changed, which finding, how to roll back — appended to the finding row, auditable + undoable.
- **INV-5 (USER never auto-applies):** content / irreversible / cross-team fixes are proposed as tasks + an agent suggestion; the human approves the dispatch.
- **INV-6 (ADI escalates when unsure):** ambiguous cases auto-apply ONLY if reasoned high-confidence AND reversible; otherwise they become USER tasks.
- **INV-7 (consume, don't redefine):** the `Finding` contract (RFC-019) is consumed as-is; this skill never re-detects, re-classifies, or redefines the shape.
- **INV-8 (human ledger sacrosanct):** writes only `Kind: finding` rows in the NOTE-013 machine-findings section; the human deferral table is never touched.

---

## Journal / audit row shape

A healed finding's NOTE-013 row carries its audit trail inline:

```
- [x] **Kind**: finding — <finding_id> — phase_mismatch — EVID-135 — sev=low tier=auto status=healed — observed <ts> — action=forgeplan_phase_advance(to=evidence) prior_phase=validate rollback=`forgeplan_phase_advance --to validate` healed <ts>
```

A USER task row:

```
- [ ] **Kind**: finding — <finding_id> — missing_must_section — PRD-12 — sev=medium tier=user status=open — observed <ts> — → dispatch: specification (author the missing section)
```

---

## Anti-patterns

- **Don't silent-auto-fix every session.** Default is propose. Silent-AUTO is opt-in, per-kind, reversible-only.
- **Don't AUTO anything off the 2-kind allowlist.** A detector saying `auto` is necessary but NOT sufficient — the allowlist is the second gate.
- **Don't apply a USER/content fix yourself.** Route it to the agent; the human approves. Writing a MUST section or cutting a dependency edge is not a heal action.
- **Don't skip the journal.** An un-journaled auto-fix is an un-undoable one — forbidden.
- **Don't re-detect.** Consume the findings `/forge-insight` produced; this skill acts, it doesn't scan.

---

## Related skills

- **`/forge-insight`** (same plugin) — produces the findings this skill drains. Run insight first; heal second.
- **`insight-watchdog.sh`** (hook) — the silent SessionStart sibling that surfaces findings; pairs with the propose-at-session-start trigger.
- **`/forge-cleanup`** — the same 3-tier model applied to stuck DRAFTS (PRD-032). `/forge-heal` is its sibling for anomaly findings.
- **`/decay-watch`** — scans NOTE-013; recognises `Kind: finding` rows (RFC-019 R-8) so healed/tasked findings are tracked apart from human deferrals.

---

## References

- **PRD-074** — parent vision; this skill is Layer 4 (FR-003 heal-or-task).
- **RFC-020** — this brick's design (3-tier router, AUTO 2-kind allowlist, propose-not-silent, per-kind dispatch, 8 safety invariants).
- **RFC-019** — brick 1; the frozen `Finding` contract + NOTE-013 ledger + auto-close this skill consumes.
- **PRD-032** — the 3-tier AUTO/ADI/USER model + `/forge-cleanup` precedent this skill reuses.
