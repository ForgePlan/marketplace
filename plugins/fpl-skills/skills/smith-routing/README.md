# /smith-routing — educational walkthrough

> Teacher companion to smith. Explains the 14-context routing matrix, compares methodologies side-by-side, and answers "which methodology fits my situation?" — without committing to any action.

## When to use

- User wants to **learn**, not commit ("explain BMAD vs SPARC", "что лучше — Strangler Fig или rewrite?").
- User is **unsure which context applies** and wants the routing matrix surfaced.
- A **comparison** is asked ("OWASP or STRIDE?", "Strangler Fig or full rewrite?").
- **Before going to `/smith-plan`** — when the user hasn't yet formed a specific task and wants orientation first.
- User types a methodology name they've heard but isn't sure when it applies ("what's RIPER-5?", "что такое A3 Problem Solving?").

**Do NOT use** when:

- User has a concrete task ready to plan — use `/smith-plan <task>` instead.
- User wants to bootstrap a new project — use `/smith-bootstrap`.
- User is in the middle of a live incident — that needs `/smith-plan "incident"`, not education.

## Quick start

```bash
# Comparison mode — side-by-side methodologies
/smith-routing BMAD vs SPARC

# Walkthrough mode — all 14 contexts at once
/smith-routing show me the routing matrix

# Question-Answer mode — quick answer for a domain
/smith-routing what methodology for security audit?
```

## How it works

The skill operates in one of three modes, inferred from the user's phrasing:

| Mode | Triggers | Behaviour |
|---|---|---|
| **Comparison** | "X vs Y" / "or" / "compare" / "какой лучше" | Side-by-side table (year/style/best-for/worst-for/source) + one-paragraph recommendation tailored to user's context |
| **Walkthrough** | "walk me through" / "show all contexts" / "explain the matrix" | Iterate through 14 contexts with one-line summaries; ask user to pick one to dig into; on pick, render the matching `sections/NN-*.md` playbook |
| **Question-Answer** | Single domain phrase ("for brownfield", "security audit") | Quick classification + routing-map row citation + dispatch sequence + evidence required + section playbook |

Every interaction ends with an explicit hand-off offer: `/smith-plan` (commit to action), `/smith` (general orientation), `/smith-bootstrap` (greenfield scaffold), or another `/smith-routing` (compare more).

**Read-only contract**: this skill produces explanations only. It never creates NOTE/PRD/RFC/ADR/EVID, never calls `forgeplan_new` or any mutating tool.

See [SKILL.md](./SKILL.md) for the full mode-detection procedure, three example output shapes, hard rules, and integration map.

## Examples

### Example A — Comparison

```
User: /smith-routing BMAD vs SPARC?

→ Comparison mode → table (year / style / best for / worst for / source link)
→ "Recommendation: if greenfield repo with no legacy gravity → BMAD;
   if adding a feature to existing service with tests → SPARC.
   Tell me your situation and I'll narrow further."
→ Hand-off: "Ready to commit? Run /smith-plan <task>."
```

### Example B — Walkthrough

```
User: /smith-routing show me all 14 contexts

→ Walkthrough mode → 14-row table with one-line summaries.
→ "Which row matches your situation? Tell me a row number or describe your task."
User: row 2
→ Load sections/02-brownfield.md → render Strangler Fig + DDD + ACL playbook.
→ Hand-off: "Want to commit? /smith-plan modernise <module-name>."
```

### Example C — Question-Answer (brownfield)

```
User: /smith-routing we have a legacy Rails monolith — what methodology?

→ Question-Answer mode → row 2 (brownfield).
→ Primary: Strangler Fig + DDD + ACL. Secondary: Event Storming + Branch-by-Abstraction.
→ Dispatch sequence (9 agents): discover → research-analyst → ddd-domain-expert
  → adr-architect → goal-planner → coder → tester → architect-reviewer → guardian.
→ Evidence: 9-finding discovery EVID + ADR (boundary decisions, supersede chain) + PRD + ADI + BMAD.
→ Section playbook loaded for deeper walkthrough.
→ Hand-off: "Run /smith-plan modernise rails-monolith when ready."
```

## Related

- **`/smith`** — parent default-mode skill; the umbrella entry for any smith interaction.
- **`/smith-plan`** — committed-action counterpart; `/smith-routing` explains, `/smith-plan` directs.
- **`/smith-bootstrap`** — greenfield onboarding; redirect here if the user mentions a fresh project.
- **`/methodology-check <ID>`** — check 4-layer coverage on an existing artifact (different scope from this educational walkthrough).
- **`/fpf-reason`** — generate ADI hypotheses for a hard decision (Row 7 architecture decision uses this).
- **`/decision`** + **`/supersede`** — produce ADRs / supersede decisions (cited by row 7 + row 11).

## References

- [SKILL.md](./SKILL.md) — full procedure, three-mode detection, example output shapes for each mode.
- [`skills/smith/routing-map.md`](../smith/routing-map.md) — primary source: 14-row table + 29 methodology cards + agent index.
- [`skills/smith/sections/`](../smith/sections/) — 12 per-context playbooks loaded on demand (one at a time).
- [`agents-pro/agents/smith.md`](../../../agents-pro/agents/smith.md) — the smith agent (not invoked by this skill; this is read-only education).
- **Methodology primary sources**: [BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD), [SPARC](https://github.com/ruvnet/sparc), [RIPER-5](https://github.com/johnpeterman72/CursorRIPER), [DDD](https://www.domainlanguage.com/ddd/), [Strangler Fig](https://martinfowler.com/bliki/StranglerFigApplication.html), [C4 Model](https://c4model.com), [OWASP Top 10 2025](https://owasp.org/Top10/), [STRIDE/ASTRIDE](https://arxiv.org/abs/2403.13309), [DORA](https://dora.dev), [JTBD](https://hbr.org/2016/09/know-your-customers-jobs-to-be-done), [A3](https://www.lean.org/lexicon-terms/a3-thinking/), [5 Whys](https://en.wikipedia.org/wiki/Five_whys).
- CLAUDE.md `4-Layer Pipeline (S10→S13)` — pipeline foundation that the methodologies feed into.

---

*This skill is the teacher; `/smith-plan` is the doer. Use this one to understand; use that one to commit.*
