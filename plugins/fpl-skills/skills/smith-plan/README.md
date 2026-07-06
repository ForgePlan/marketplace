# /smith-plan — per-task structured plan

> Take a specific task ("refactor auth", "audit API gateway", "ship payment service"), classify it into 1 of 14 routing-map contexts, and return an 8-section Plan markdown naming the dispatch sequence, evidence requirements, and rollback path.

## When to use

- **User has a specific task in mind** — verb + object + qualifier ("refactor auth module to OAuth2", "audit gateway for OWASP issues").
- **Task is non-trivial (Standard+ depth)** — `/smith-plan`'s overhead only pays off when ≥3 dispatches are likely.
- **Multiple methodologies plausibly apply** — user wants the routing reasoning recorded ("is this RIPER-5 or just `/forge-cycle`?").
- **Before invoking `/forge-cycle`** — `/smith-plan` picks the methodology; `/forge-cycle` enforces it.
- **Before launching `/autorun`** — autonomous loops should call `/smith-plan` to lock in the dispatch sequence before burning sub-agent budget.

**Do NOT use** when:

- Task is Tactical (routing-map row 5, e.g. typo) — skip to `coder` + `code-reviewer` directly.
- User wants a session-start "where are we" report — that is `/smith` default or `/smith-bootstrap`.
- User wants methodology education without a concrete task — that is `/smith-routing`.

## Quick start

```bash
# concrete task — produces an 8-section Plan
/smith-plan refactor the auth module to use OAuth2

# security audit — routes to row 8 (OWASP + STRIDE)
/smith-plan audit our API gateway for OWASP issues

# greenfield ship — routes to row 1 (BMAD + Spec Kit)
/smith-plan ship a fresh payment microservice from scratch
```

## How it works

The skill runs 8 steps:

1. **Parse the task** — extract verb / object / qualifier.
2. **Read project state** — `forgeplan_health`, recent artifacts, hindsight recall, `git status`.
3. **Classify into 1 of 14 contexts** — apply the verb + state signals against [`routing-map.md`](../smith/routing-map.md). Pick exactly one row (no blending).
4. **Read the methodology playbook** — load `sections/NN-<context>.md` for the detailed recipe.
5. **Dispatch the `smith` agent** — pass task + state snapshot + section file reference.
6. **Receive smith's Plan** — filled [`smith-plan.md` template](../../templates/smith-plan.md) (8 sections, ≤500 lines).
7. **Render to user** — verbatim Plan + one-paragraph preamble ("Classified as row N, primary methodology Y, first dispatch Z").
8. **Offer hand-off** — explicit `Task(subagent_type=...)` line + optional "persist as NOTE artifact?" prompt.

**Read-mostly contract**: the skill recommends; the orchestrator dispatches. `/smith-plan` never calls `forgeplan_new`, `forgeplan_update`, `forgeplan_link`, or `Task(...)` itself.

See [SKILL.md](./SKILL.md) for the full classification heuristics table, tie-breaker rules, output contract, hard rules, and failure modes.

## Examples

### Example A — Refactor

```
User: /smith-plan refactor the auth module to use OAuth2

→ Verb=refactor, Object=auth module, Qualifier=no behaviour change at API surface.
→ Context: row 6 (refactor) — primary Branch-by-Abstraction + Mikado Method.
→ Dispatch sequence (9 steps): research-analyst → code-analyzer → architect-reviewer (pre)
  → adr-architect → goal-planner → coder → architect-reviewer (post) → tester → guardian.
→ Evidence: ADR (target architecture) + PRD + ADI EVID (≥3 hyp) + pre/post architect-reviewer EVID + BMAD EVID.
→ Hand-off: "Smith plan complete. Recommended first dispatch: agents-pro:research-analyst (A)."
```

### Example B — Security audit

```
User: /smith-plan audit our API gateway for security before Q3 release

→ Verb=audit, Object=API gateway, Qualifier=pre-release deadline.
→ Context: row 8 (security-audit) — primary OWASP Top 10 2025 + STRIDE.
→ Dispatch sequence (6 steps): research-analyst → security-expert → injection-analyst
  → pii-detector → adr-architect (if mitigations) → guardian.
→ Evidence: 3× Profile B EVID with PASS/CONCERNS/BLOCKER verdict + ADR (if architectural mitigation) + BMAD EVID.
→ Hand-off: "Recommended first dispatch: agents-pro:research-analyst (A) — produce gateway surface inventory NOTE."
```

## Related

- **`/smith`** — parent default-mode skill. If user has not yet articulated a task, `/smith` may itself dispatch `/smith-plan` after one clarifying question.
- **`/smith-bootstrap`** — session-start onboarding; can recommend `/smith-plan` for the first concrete task post-bootstrap.
- **`/smith-routing`** — methodology education without producing a Plan; use when the user is still orienting.
- **`/forge-cycle`** — executes the Plan's dispatch sequence under full pipeline enforcement.
- **`/autorun`** — autonomous loop; reads the Plan's evidence checklist as its gate.
- **`agents-pro:smith`** — the agent dispatched in Step 5 to produce the Plan markdown.

## References

- [SKILL.md](./SKILL.md) — full per-step procedure, classification heuristics, tie-breaker rules, output contract.
- [`templates/smith-plan.md`](../../templates/smith-plan.md) — the 8-section, ≤500-line output template smith fills.
- [`templates/routing-decision.md`](../../templates/routing-decision.md) — escalation artifact when 2+ contexts genuinely tie.
- [`skills/smith/routing-map.md`](../smith/routing-map.md) — the 14-row routing matrix (single source of truth).
- [`skills/smith/sections/`](../smith/sections/) — per-context playbooks (loaded one at a time in Step 4).
- [`agents-pro/agents/smith.md`](../../../agents-pro/agents/smith.md) — the agent dispatched for routing decisions.
- CLAUDE.md `4-Layer Pipeline (S10→S13)` — methodology foundation that the Plan's evidence requirements enforce.
- **ML-12** (mental model) — ADI before action; `/smith-plan` is the per-task embodiment of this rule.
- **Inspiration**: [BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD), [SPARC](https://github.com/ruvnet/sparc), [RIPER-5](https://github.com/johnpeterman72/CursorRIPER).
