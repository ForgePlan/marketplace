---
name: smith-routing
description: |
  Educational routing skill. Walks the user through smith's methodology routing matrix without committing to a specific task. Use to learn "when do I apply BMAD vs SPARC?", "what methodology for brownfield?", "explain the bug fix workflow". Pulls from routing-map.md (12 contexts + 25 methodology cards) and sections/NN-*.md (detailed playbooks). Output: educational comparison + recommendation when user describes their situation. Does NOT produce a Plan artifact — for that, use /smith-plan.

  Triggers: "smith routing", "/smith-routing", "explain methodology", "какая методология", "when do I use", "compare methodologies", "routing walkthrough", "BMAD vs SPARC", "Strangler Fig or rewrite", "show me the routing matrix"
origin: forgeplan
---

# /smith-routing — educational walkthrough

This skill is the **teacher** companion to smith. Where `/smith-plan` produces a concrete Plan
artifact for a specific task, `/smith-routing` explains the routing matrix in the abstract: it
walks the user through smith's 12 contexts, compares methodologies side-by-side, and answers
"which methodology fits my situation?" without committing to action.

**Read-only contract**: this skill never writes artifacts (no PRD / RFC / ADR / EVID / NOTE),
never calls `forgeplan_new`, `forgeplan_update`, or any mutating tool. It reads the routing-map
and section playbooks and renders explanations.

Foundation: `plugins/fpl-skills/skills/smith/routing-map.md` (12 contexts × 25 methodology cards)
+ `plugins/fpl-skills/skills/smith/sections/NN-*.md` (per-context detailed playbooks).

---

## When to invoke

- The user wants to **learn**, not commit ("explain when BMAD vs SPARC", "что лучше — Strangler Fig или rewrite?").
- The user is **unsure which context applies** to their situation and wants the matrix surfaced.
- The user wants to **see all methodologies** in the routing matrix at once.
- A **comparison** is asked — "BMAD vs SPARC for my case", "Strangler Fig or full rewrite?", "OWASP or STRIDE?".
- **Before going to `/smith-plan`** — when the user hasn't yet formed a specific task and wants orientation first.
- The user types a methodology name they've heard but isn't sure when it applies — "what's RIPER-5?", "что такое A3 Problem Solving?".

## When NOT to invoke

- The user has a **concrete task** ready to plan — use `/smith-plan <task>` instead.
- The user wants to **bootstrap a new project** — use `/smith-bootstrap`.
- The user wants smith's **default orientation** ("what does smith do?") — use `/smith`.
- The user is in the middle of an **incident** — that needs `/smith-plan "incident"`, not education.

---

## Three modes

`/smith-routing` operates in one of three modes. Mode is inferred from the user's phrasing.

| Mode | Trigger phrases | Behaviour |
|---|---|---|
| **Comparison** | "X vs Y" / "compare A and B" / "BMAD or SPARC?" | Side-by-side pros/cons + when each shines + recommendation for user's context |
| **Walkthrough** | "walk me through routing" / "show all contexts" / "explain the matrix" | Iterate through 12 contexts with one-line summaries; ask user which to dig into |
| **Question-Answer** | "what for brownfield?" / "for bug fix?" / "какая методология для аудита?" | Quick answer with citation to routing-map row + load matching section file |

Modes are not mutually exclusive — a user may start in Walkthrough, then ask for a Comparison within it. The skill stays educational across the whole flow.

---

## Procedure

### Step 1 — Parse the user's question

Classify the user's input into one of the three modes:

- Contains `vs` / `or` / `versus` / `compare` / `какой лучше` → **Comparison**.
- Contains `walk me through` / `show all` / `explain the matrix` / `все контексты` → **Walkthrough**.
- Contains a single domain phrase ("for brownfield", "security audit", "tech debt") → **Question-Answer**.

If ambiguous, ask the user one clarifying question before proceeding:

> "Would you like a side-by-side comparison, a full walkthrough of all 12 contexts, or a quick answer for your specific situation?"

### Step 2 — Read the routing brain

Always read `plugins/fpl-skills/skills/smith/routing-map.md` first. It contains the 12-row routing
table (one row per context) and the 25 methodology cards. Treat it as the single source of truth —
never invent rows, never blend rows.

### Step 3 — Comparison mode

If Comparison mode:

1. Identify the 2 (or more) methodology names in the user's question.
2. Look them up in the **Methodology cards** section of `routing-map.md`.
3. Render a side-by-side table: name, year/author, style, best for, worst for, source link.
4. Conclude with a one-paragraph recommendation tailored to whatever context the user mentioned.
   If the user gave no context, ask one question to identify it before recommending.

### Step 4 — Walkthrough mode

If Walkthrough mode:

1. Render the 12-context table with one-line summaries (use the `sections/_index.md` one-liners).
2. Ask the user to pick a row to dig into.
3. On pick, load the matching section file (`sections/NN-*.md`) and render its playbook.
4. After the playbook, offer two follow-ups: "compare with another context?" or "ready to plan? → `/smith-plan <task>`".

### Step 5 — Question-Answer mode

If Question-Answer mode:

1. Classify the user's described situation into one of the 12 contexts.
2. Cite the routing-map row number + primary methodology + secondary methodologies.
3. List the dispatch sequence (agent chain).
4. Name the evidence artifacts required.
5. Load the corresponding `sections/NN-*.md` file for the detailed playbook and render the salient parts.
6. Always include a hand-off line: "Want to make this concrete? Run `/smith-plan <task>`."

### Step 6 — Hand-off

At the end of every interaction, always offer the next step:

- If the user has a specific task in mind → `/smith-plan <task>` (commits to action, produces Plan artifact).
- If the user still wants general orientation → `/smith` (default smith mode).
- If the user wants to compare more methodologies → re-invoke `/smith-routing` with a new question.

Never assume the user is ready to commit — wait for them to ask.

---

## Mode 1: Comparison — example output

User asks: **"BMAD vs SPARC — which one for my project?"**

Skill response shape:

```markdown
## BMAD-METHOD vs SPARC

|  | BMAD-METHOD | SPARC |
|---|---|---|
| Year / author | 2024 / Brian Madison (bmad-code-org) | 2024 / Reuven Cohen (ruvnet) |
| Style | Multi-role persona split (Analyst → PM → Architect → Dev → QA) | Five-phase iterative loop (Specification → Pseudocode → Architecture → Refinement → Completion) |
| Best for | Clean greenfield where role specialisation pays off; AGENTS.md-friendly | New feature inside existing service where spec iteration is cheap and tests anchor refinement |
| Worst for | Brownfield modernisation (Analyst persona has nothing to discover); tactical bug fixes | Architectural decisions (no SPARC phase for irreversible choices); incident response (no time for Pseudocode) |
| Source | https://github.com/bmad-code-org/BMAD-METHOD | https://github.com/ruvnet/sparc |

**Recommendation**: If you're starting a brand-new repository with no legacy gravity, BMAD's
persona-based artifacts (one Analyst NOTE, one PM PRD, one Architect RFC) map cleanly onto our
Profile A creator chain — pick BMAD. If you're adding a feature to an existing service where
tests already exist, SPARC's Refinement loop will give you faster iteration — pick SPARC.

Tell me your situation (greenfield repo? existing service?) and I'll narrow further.

If you're ready to commit, run `/smith-plan <task>` and smith will route to the right
methodology automatically.
```

The Comparison mode never picks for the user without context — it surfaces the trade-off and asks.

---

## Mode 2: Walkthrough — example output

User asks: **"walk me through the routing matrix"** / **"show me all 12 contexts"**

Skill response shape:

```markdown
## Smith handles 12 contexts

1. **Greenfield bootstrap** — fresh project with no legacy. Methodology: BMAD + GitHub Spec Kit. Pick if no `.git` history yet.
2. **Brownfield modernisation** — legacy monolith that needs replacement. Methodology: Strangler Fig + DDD + Anti-Corruption Layer. Pick if existing codebase with running cashflow.
3. **New feature** — adding capability to existing service. Methodology: SPARC + Hexagonal + JTBD. Pick if the service runs and you're extending it.
4. **Production bug (non-trivial)** — race condition, data corruption, anything needing RCA. Methodology: RIPER-5 + 5 Whys. Pick if the bug is in prod and the cause is unclear.
5. **Trivial bug / hotfix** — typo, off-by-one, broken link. Methodology: tactical fast-path (no formal methodology). Pick if scope is genuinely one-line.
6. **Refactor** — restructuring code without changing behaviour. Methodology: Branch-by-Abstraction + Mikado + DDD. Pick if you need to clean up without breaking callers.
7. **Architecture decision** — "we need to choose between X and Y". Methodology: FPF ADI + ADR/MADR + C4 (if ≥3 modules). Pick when the choice is irreversible.
8. **Security audit** — pre-launch review, OWASP coverage, threat modelling. Methodology: OWASP Top 10 2025 + STRIDE/ASTRIDE. Pick before any production exposure.
9. **Performance audit** — slow endpoint, latency spike, perf review. Methodology: DORA + SRE error-budget + perf-budget. Pick when you have a measurable regression or target.
10. **Product discovery (PDLC)** — "what should we build?". Methodology: JTBD + Lean MVP + Double Diamond. Pick pre-product or pre-feature.
11. **Tech debt cleanup** — cleanup sprint, debt backlog. Methodology: A3 Problem Solving + Fishbone. Pick when you need to justify the trade-off out loud.
12. **Live incident** — production down right now. Methodology: Incident Command System + blameless post-mortem + 5 Whys (after). Pick during the fire.

Which one matches your situation? Tell me a row number or describe what you're doing and I'll dig in.
```

On user pick (e.g. "row 2"), the skill loads `sections/02-brownfield.md` and renders the detailed
playbook from it — phases, dispatch sequence, evidence requirements, failure modes.

---

## Mode 3: Question-Answer — example output

User asks: **"What methodology for security audit?"**

Skill response shape:

```markdown
## Security audit — routing-map row #8

**Primary methodology**: OWASP Top 10 2025 + STRIDE threat modelling.
**Secondary methodologies**: ASTRIDE (for AI-agent specific threats — Adversarial inputs,
Model-theft, Training-data poisoning), ADR for mitigation decisions that change architecture.

**Dispatch sequence**:
1. `research-analyst` (Profile A) — synthesises threat landscape and prior incidents.
2. `security-expert` (Profile B) — STRIDE/OWASP coverage adversarial review.
3. `injection-analyst` (Profile B) — SQL, prompt, command injection specialisation.
4. `pii-detector` (Profile B) — PII exposure surface review.
5. `adr-architect` (Profile A) — only for mitigations that change architecture.
6. `guardian` (Profile B-gate) — final PASS/CONCERNS/BLOCKER verdict.

**Evidence required**:
- EVID from security-expert + injection-analyst + pii-detector (all Profile B, with `## Findings` section).
- ADR for any mitigation that crosses module boundaries.
- BMAD adversarial EVID with ≥1 finding (EPIC-001 S11).

**Why this combo**: OWASP gives the checklist coverage; STRIDE forces threat-model reasoning per
data-flow boundary; AI-specific apps need ASTRIDE which STRIDE alone misses.

**Detailed playbook**: see `plugins/fpl-skills/skills/smith/sections/08-security-audit.md`.

**Methodology sources**:
- OWASP Top 10 2025: https://owasp.org/Top10/
- STRIDE: https://learn.microsoft.com/en-us/azure/security/develop/threat-modeling-tool-threats
- ASTRIDE: https://arxiv.org/abs/2403.13309

---

Want to make this concrete? Run `/smith-plan audit <module-name>` and smith will produce a
Plan artifact with the exact dispatch sequence and evidence requirements for your module.
```

---

## Hand-off

Every interaction with `/smith-routing` ends with one or more of these offers:

- **Ready to plan a specific task?** → `/smith-plan <task>` — converts education into a concrete Plan artifact.
- **Want default smith orientation?** → `/smith` — general routing decision for whatever you're working on.
- **Want to bootstrap a fresh project?** → `/smith-bootstrap <project-name>` — produces the BMAD + Spec Kit greenfield scaffold.
- **Want to compare more methodologies?** → re-invoke `/smith-routing` with a new comparison question.

The skill never pushes the user toward action. The user picks the next step.

---

## Hard rules

1. **Read-only** — `/smith-routing` produces explanations only. It never creates NOTE, PRD, RFC, ADR, EVID, or any other artifact. It never calls `forgeplan_new`, `forgeplan_update`, `forgeplan_link`, `forgeplan_activate`, or any mutating tool.
2. **Always cite the routing-map row and methodology source link** in every response. The user must be able to trace every claim back to `routing-map.md` and the upstream methodology source.
3. **When the user's question doesn't match any of the 12 contexts** — explain why (e.g. "this sounds like both brownfield and a security audit — which is the primary risk?") and suggest the closest match. Never invent a 13th row. The 12 contexts are the canonical surface; if a situation truly doesn't fit, escalate to the user, don't paper over it.
4. **Educational tone, not directive** — `/smith-routing` explains and asks. `/smith-plan` directs and commits. Keep the line clear. The user should leave `/smith-routing` more knowledgeable; `/smith-plan` should leave them with a Plan.
5. **Never blend methodologies in an explanation** — if the user asks "BMAD + SPARC together?" explain that smith picks one row, never blends, and the same applies to methodologies. Show why blending is an anti-pattern (see `routing-map.md` paragraph 3).

---

## Examples

### Example 1 — Comparison mode

> **User**: "BMAD vs SPARC?"

→ Comparison mode → side-by-side table (Year / author / Style / Best for / Worst for / Source) → one-paragraph recommendation framed around user's context (and if no context given, ask one clarifying question) → hand-off line "ready to commit? `/smith-plan <task>`".

### Example 2 — Walkthrough mode

> **User**: "show me all 12 contexts"

→ Walkthrough mode → render 12-row table with one-line summaries (per `sections/_index.md`) → "which row matches your situation?" → on pick, load corresponding `sections/NN-*.md` and render the detailed playbook → end with "/smith-plan to commit, /smith-routing to compare another".

### Example 3 — Question-Answer mode (brownfield)

> **User**: "we have a legacy Rails monolith that we want to modernise — what methodology?"

→ Question-Answer mode → classify situation: context #2 brownfield modernisation → cite routing-map row #2: primary Strangler Fig + DDD + ACL; secondary Event Storming + Branch-by-Abstraction + ADR-supersede → dispatch sequence (discover → research-analyst → ddd-domain-expert → adr-architect → goal-planner → coder → tester → architect-reviewer → guardian) → evidence (EVID with 9 brownfield findings + ADR + PRD + ADI EVID + BMAD EVID) → load `sections/02-brownfield.md` and render the phased walkthrough → hand-off "run `/smith-plan modernise rails-monolith` when you're ready to commit".

---

## Integration

This skill reads from but never writes to:

- **`plugins/fpl-skills/skills/smith/routing-map.md`** — primary source: 12-row routing table + 25 methodology cards + agent index + evidence quality bar.
- **`plugins/fpl-skills/skills/smith/sections/_index.md`** — one-line summaries for the Walkthrough mode.
- **`plugins/fpl-skills/skills/smith/sections/NN-*.md`** — 12 detailed per-context playbooks (loaded one at a time, never bundled).

### Sibling skills (when to redirect)

| If the user wants to... | Redirect to |
|---|---|
| Plan a specific task right now | `/smith-plan <task>` |
| Bootstrap a fresh greenfield project | `/smith-bootstrap <project-name>` |
| Get default smith orientation | `/smith` |
| Check methodology coverage on an existing artifact | `/methodology-check <ARTIFACT-ID>` |
| Generate ADI hypotheses for a hard decision | `/fpf-reason` |
| Produce a full ADR with C4 diagrams | invoke `adr-architect` agent via the appropriate skill |

### Cross-CLI portability

The educational outputs of this skill (markdown tables, methodology comparisons) are plain
Markdown and portable across CLIs. If used outside Claude Code (Gemini, Codex), the skill body
reads the same; only the slash-command surface differs.

---

## References

### Methodology primary sources (sample — full list in `routing-map.md`)

- **BMAD-METHOD**: https://github.com/bmad-code-org/BMAD-METHOD
- **SPARC**: https://github.com/ruvnet/sparc
- **RIPER-5**: https://github.com/johnpeterman72/CursorRIPER
- **GitHub Spec Kit**: https://github.com/github/spec-kit
- **DDD**: Eric Evans, *Domain-Driven Design* (2003); https://www.domainlanguage.com/ddd/
- **Strangler Fig**: Martin Fowler, https://martinfowler.com/bliki/StranglerFigApplication.html
- **C4 Model**: Simon Brown, https://c4model.com
- **OWASP Top 10 2025**: https://owasp.org/Top10/
- **STRIDE / ASTRIDE**: Microsoft / ASTRIDE paper https://arxiv.org/abs/2403.13309
- **DORA / Accelerate**: Forsgren et al. (2018); https://dora.dev
- **JTBD**: Clayton Christensen; https://hbr.org/2016/09/know-your-customers-jobs-to-be-done
- **A3 Problem Solving**: John Shook, *Managing to Learn* (2008); https://www.lean.org/lexicon-terms/a3-thinking/
- **5 Whys**: Taiichi Ohno (Toyota); https://en.wikipedia.org/wiki/Five_whys
- **FPF ADI**: `plugins/fpf/skills/fpf-knowledge/SKILL.md`

### Forgeplan repo references

- **EPIC-002** — smith master-orchestrator epic (this skill is Wave 2-B4).
- **`plugins/fpl-skills/AGENT-AUTHORING-GUIDE.md`** — canonical Profile A/B/C/D agent patterns referenced in dispatch sequences.
- **CLAUDE.md `4-Layer Pipeline (S10→S13)`** — pipeline foundation that smith's evidence requirements enforce.
- **`plugins/fpl-skills/skills/methodology-check/SKILL.md`** — companion skill for checking coverage on an existing artifact (different scope from this educational walkthrough).

---

*This skill is the teacher; `/smith-plan` is the doer. Use this one to understand; use that one to commit.*
