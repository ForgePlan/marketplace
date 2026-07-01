[English](SMITH.md) | [Русский](SMITH-RU.md)

# Smith — master orchestrator

> The "BMAD Master" of the ForgePlan ecosystem — a Profile B-orchestrator agent that reads project state, picks the right methodology per task, and recommends a dispatch sequence of specialist agents.

Smith is the canonical first point of contact when you (or another agent) don't yet know which methodology, dispatch chain, or pipeline depth applies to the work in front of you. It inspects the repository, classifies the situation against a **14-context routing matrix**, and returns a structured Plan naming agents, methodologies, and evidence requirements per the 4-layer S10–S13 pipeline. Smith **never writes code or activates artifacts** — it routes and recommends.


> **Wider context**: For the complete idea-to-delivery process reference (covering all 5 agent profiles, 10 artifact kinds, 4-layer pipeline, and how smith integrates with the build cycle), see [Process Reference (EN)](process-from-idea-to-delivery-EN.md) / [(RU)](process-from-idea-to-delivery-RU.md).

---

## Quick Start

```bash
/plugin install fpl-skills@ForgePlan-marketplace   # smith family lives in fpl-skills
/plugin install agents-pro@ForgePlan-marketplace   # smith agent body lives in agents-pro

/smith                                              # default — status + recommended next step
/smith-bootstrap                                    # greenfield repo onboarding
/smith-plan "refactor session-start.sh for portability"   # per-task plan
/smith-routing "BMAD vs SPARC for fresh service"    # educational walkthrough
```

> [!TIP]
> Use smith when you don't know which methodology applies — it picks one for you. If you already know which agent to dispatch (`coder`, `adr-architect`, `specification`), call that agent directly. Smith picks **which**; it doesn't replace any.

> [!WARNING]
> Smith requires both `fpl-skills` (skill family + routing-map + templates) and `agents-pro` (the smith agent body) to be installed. Installing only one half results in smith dispatching to a missing target or to a routing brain that nothing reads from. The marketplace catalog pins compatible versions — install both from the same catalog version.

---

## When to invoke smith

- At **session start** when unsure what to do next — smith reads `forgeplan_health` + recent journal and proposes the next action.
- On a **fresh repo** with no artifacts — `/smith-bootstrap` seeds Brief / PRD / first ADR via the greenfield row.
- For a **specific task** of any depth — `/smith-plan <task>` picks the matching row, names the methodology, lists the dispatch sequence.
- For **learning the methodology surface** — `/smith-routing` inspects the 14 routing rows + 29 methodology cards without committing to a task.
- When existing entry points (`/forge-cycle`, `/autorun`) don't fit — cross-context work, ambiguous depth, methodology mismatch.
- **Trigger phrases** (EN / RU): `smith`, `кузнец`, `что дальше`, `what's next`, `scrum master`, `master orchestrator`, `which methodology`, `какую методологию`.

> [!NOTE]
> Smith **picks exactly one row** per task — methodology cocktails are forbidden. If two rows genuinely tie, smith emits the `<<NEED_USER_INPUT>>` sentinel with ≥3 hypotheses (FPF ADI discipline per **PRD-059**). Blending BMAD + SPARC + Spec Kit "to cover all bases" produces artifacts that match no community pattern.

---

## The 14 contexts smith routes

Full table with dispatch sequences + evidence requirements lives in [`../plugins/fpl-skills/skills/smith/routing-map.md`](../plugins/fpl-skills/skills/smith/routing-map.md). Compact summary:

| # | Context | Primary methodology |
|---|---|---|
| 1 | Greenfield | BMAD-METHOD (trimmed) + GitHub Spec Kit |
| 2 | Brownfield modernisation | Strangler Fig + DDD + Anti-Corruption Layer |
| 3 | New feature in existing service | SPARC + Hexagonal Architecture |
| 4 | Production bug (non-trivial) | RIPER-5 + 5 Whys root-cause |
| 5 | Trivial hotfix | Tactical fast-path (no formal methodology) |
| 6 | Refactoring | Branch-by-Abstraction + Mikado Method |
| 7 | Architecture decision | FPF ADI + ADR/MADR |
| 8 | Security audit | OWASP Top 10 2025 + STRIDE / ASTRIDE |
| 9 | Performance audit | DORA + SRE error-budget + perf budget |
| 10 | Product discovery (PDLC) | Jobs-To-Be-Done + Lean Startup + Double Diamond |
| 11 | Tech debt cleanup | A3 Problem Solving + Fishbone + ADR-supersede |
| 12 | Live incident response | Incident Command System + Blameless post-mortem |
| 13 | TDD-first feature (tests frozen before code) | Enforced-TDD (RFC-012, ADR-010 #1, hook-gate=Yes) |
| 14 | Design-system → code (Pencil/Figma → Storybook → native framework code) | CANVAS (RFC-021, ADR-010 #5, hook-gate=Yes) |

Each row binds a primary methodology + 1–2 secondaries + a named dispatch sequence + the evidence artifacts that must exist before activation. Rows 1–4, 6–11, 13–14 produce Standard+ artifacts gated by the full S10–S13 pipeline. Row 5 (trivial hotfix) is explicitly scoped to S12+S13 only. Row 12 (live incident) splits into a fire-fighting phase (no PRD during the outage) and a post-mortem phase (BMAD-gated PRD afterward). Rows 13 (TDD) and 14 (CANVAS) are AD/AID-PDLC sub-cycle instances (ADR-010) — both `hook-gate=Yes`, each dispatched through its own master (`tdd-orchestrator`, `canvas-coordinator`).

Why one row per task: blending BMAD + SPARC + Spec Kit "to cover all bases" produces artifacts that none of the three communities recognise as their canonical shape. The team then has to re-invent review checklists, agent prompts, and quality gates from scratch — and the methodology benefits evaporate.

---

## Methodologies smith knows

Twenty-nine methodologies catalogued in [`routing-map.md`](../plugins/fpl-skills/skills/smith/routing-map.md). Each card states the one-sentence definition, when it shines, when NOT to use, and a primary source link. Grouped:

- **AI-coding workflows** — BMAD-METHOD (analyst-PM-architect-dev split), SPARC (Spec → Pseudo → Arch → Refine → Complete), RIPER-5 (Research-Innovate-Plan-Execute-Review), GitHub Spec Kit (spec-driven greenfield), FPF ADI (Abduction → Deduction → Induction), CANVAS (design-system to code: Capture-Audit-Norm-check-Vectorize-Assemble; stack-agnostic, hook-gate=Yes).
- **Architecture lenses** — C4 Model (L1+L2 default, L3 only when needed), Domain-Driven Design, Event Storming, Clean Architecture, Hexagonal Architecture (Ports & Adapters), ADR / MADR.
- **Brownfield patterns** — Strangler Fig (incremental replacement), Branch-by-Abstraction (safe refactor), Anti-Corruption Layer (legacy semantic isolation), Mikado Method (dependency-safe restructure).
- **Root-cause / bug-fix** — 5 Whys, Fishbone (Ishikawa), A3 Problem Solving (Toyota single-page), Blameless post-mortem (Google SRE style).
- **Security** — OWASP Top 10 2025 (checklist coverage), STRIDE (threat modelling), ASTRIDE (AI-specific threats — prompt injection, model theft).
- **Lifecycle / ops** — DORA metrics, SRE error-budgets, Incident Command System (incident roles + handoff).
- **PDLC / product** — Jobs-To-Be-Done (JTBD reframes features as outcomes), Lean Startup (Build-Measure-Learn), Double Diamond (Discover-Define-Develop-Deliver).

Every row of the routing map cites a primary methodology + 1–2 secondaries — smith never invents combinations not present in the table.

---

## How smith works internally

Smith follows a 4-step procedure on every invocation:

1. **Intake** — read user intent (free-form text from `/smith-plan` or session start), call `forgeplan_health` + `forgeplan_session` for current state, scan `git status` + `git log --oneline -10`, and infer context tags (greenfield vs brownfield, depth, urgency).
2. **Classify** — match intake against the 14 rows in [`routing-map.md`](../plugins/fpl-skills/skills/smith/routing-map.md); on ambiguity, dispatch FPF ADI (`forgeplan_reason`) to surface ≥3 candidate rows and recommend one. Risk-asymmetric tie-break: brownfield over greenfield, audit over feature, incident over everything.
3. **Recommend** — emit a structured Plan: chosen row, primary + secondary methodology, dispatch sequence (named agents, in order), evidence requirements per the S10–S13 pipeline (FPF design / BMAD quality gate / OpenSpec structure / Forgeplan automation).
4. **Hand off** — the orchestrator (Claude Code session, `/forge-cycle`, `/autorun`, or a human) executes the Plan; smith does **not** dispatch agents itself unless explicitly asked. Plan output is consumed by the orchestrator one agent at a time, with gates after each step.

> [!IMPORTANT]
> Smith is a **Profile B-orchestrator** agent: it denies `Write`, `Edit`, `NotebookEdit`, `forgeplan_new` (outright — including NOTE kinds), `forgeplan_update`, `forgeplan_link`, `forgeplan_validate`, `forgeplan_activate`, `forgeplan_reason`, and any agent-dispatch primitive. Smith performs **no mutations at all** — it only reads state (`forgeplan_health`, `memory_recall`, git) and emits a routing Plan as its final message. If that Plan should be persisted as a Plan-NOTE, the orchestrator dispatches `agents-pro:artifact-author` to create it; smith never calls `forgeplan_new` itself. See [`../plugins/fpl-skills/AGENT-AUTHORING-GUIDE.md`](../plugins/fpl-skills/AGENT-AUTHORING-GUIDE.md) for the canonical profile definitions.

Example output shape (abbreviated):

```text
Row chosen: 3 — New feature in existing service
Primary methodology: SPARC (Specification → Pseudocode → Architecture → Refinement → Completion)
Secondary: Hexagonal Architecture + JTBD framing
Dispatch sequence:
  1. brief-intake (Profile A) → Brief NOTE
  2. specification (Profile A) → PRD
  3. architecture (Profile A) → RFC
  4. goal-planner (Profile A) → task DAG
  5. coder (Profile C-coder) → source files
  6. code-reviewer (Profile B) → EVID with >= 1 finding
  7. tester (Profile B) → tester EVID
  8. guardian (Profile B-gate) → activation verdict
Evidence required: PRD + ADI EVID (>= 3 hypotheses) + BMAD EVID with >= 1 finding + tester EVID
```

---

## The 4 user-facing skills

| Skill | What it does | When to use |
|---|---|---|
| `/smith` | Default mode — status report + recommended next step | You don't know what to do |
| `/smith-bootstrap` | Greenfield project onboarding (forgeplan init → CLAUDE.md → first PRD) | Fresh repo, no CLAUDE.md or `.forgeplan/` |
| `/smith-plan <task>` | Per-task Plan with methodology routing + dispatch sequence | You have a specific task in mind |
| `/smith-routing` | Educational walkthrough — no Plan produced | Comparing methodologies, learning the matrix |

Plus `/smith handoff` — end-of-session summary template for clean session boundaries. All four skills procedurally drive output templates documented in [`../plugins/fpl-skills/templates/SMITH-TEMPLATES.md`](../plugins/fpl-skills/templates/SMITH-TEMPLATES.md):

| Template | Used by | Hard limit |
|---|---|---|
| `smith-plan.md` | `/smith` (default), `/smith-plan` | ≤500 lines |
| `smith-bootstrap.md` | `/smith-bootstrap` | ≤300 lines |
| `smith-handoff.md` | `/smith handoff` | ≤200 lines |
| `post-mortem.md` | Bug-fix / incident contexts (rows 4 + 12) | ≤500 lines |
| `routing-decision.md` | Ambiguity tie-break (mini-ADR) | ≤250 lines |

Templates contain machine-parseable triggers scanned by `/decay-watch` and the `decay-reminder.sh` SessionStart hook — so deferred decisions and revisit conditions don't get lost.

---

## Cross-CLI portability

Smith's manifest is declared in [`../AGENTS.md`](../AGENTS.md) so non-Claude-Code CLIs can discover it via the [agents.md](https://agents.md) standard (Linux Foundation, Dec 2025). Each CLI invokes smith through its own dispatch primitive:

- **Claude Code** — `Task(subagent_type="agents-pro:smith", ...)` via the Agent tool.
- **Codex CLI** — dispatch via Codex's agent invocation; AGENTS.md is read natively by `codex-rs/core/src/agents_md.rs`.
- **Gemini CLI** — equivalent dispatch via the Gemini agent SDK; the routing-map skill loads via the `.agents/skills/smith/` interop directory.
- **Goose / Cursor** — dispatch via their respective agent layers; the routing-map skill is portable Markdown.

The 14-context routing table is **CLI-agnostic** — it names methodologies and Profile A/B/C/D agent roles, not Claude-specific primitives. Each CLI maps Profile names to its own dispatch model.

---

## Related documentation

- [`METHODOLOGIES.md`](METHODOLOGIES.md) — full background on the 29 methodologies smith routes
- [`ARCHITECTURE.md`](ARCHITECTURE.md) — 4-layer S10→S13 pipeline mental model
- [`PLAYBOOK.md`](PLAYBOOK.md) — use-case matrix mapping situations to commands
- [`DEVELOPER-JOURNEY.md`](DEVELOPER-JOURNEY.md) — 30-minute onboarding walkthrough
- [`USAGE-GUIDE.md`](USAGE-GUIDE.md) — full command catalog across the marketplace
- [`../AGENTS.md`](../AGENTS.md) — cross-CLI manifest with the canonical smith section
- [`../plugins/agents-pro/agents/smith.md`](../plugins/agents-pro/agents/smith.md) — the smith agent body (370 lines, Profile B-orchestrator master agent)
- [`../plugins/fpl-skills/skills/smith/SKILL.md`](../plugins/fpl-skills/skills/smith/SKILL.md) — main `/smith` entry-point skill
- [`../plugins/fpl-skills/skills/smith/routing-map.md`](../plugins/fpl-skills/skills/smith/routing-map.md) — 14-context table + 29 methodology cards + agent index
- [`../plugins/fpl-skills/skills/smith-bootstrap/SKILL.md`](../plugins/fpl-skills/skills/smith-bootstrap/SKILL.md) — greenfield bootstrap dispatch path
- [`../plugins/fpl-skills/skills/smith-plan/SKILL.md`](../plugins/fpl-skills/skills/smith-plan/SKILL.md) — per-task planning skill
- [`../plugins/fpl-skills/skills/smith-routing/SKILL.md`](../plugins/fpl-skills/skills/smith-routing/SKILL.md) — routing-table inspection skill
- [`../plugins/fpl-skills/templates/SMITH-TEMPLATES.md`](../plugins/fpl-skills/templates/SMITH-TEMPLATES.md) — 5-template overview
- [`../plugins/fpl-skills/AGENT-AUTHORING-GUIDE.md`](../plugins/fpl-skills/AGENT-AUTHORING-GUIDE.md) — Profile A / B / B-orchestrator / C / C-coder / D canonical definitions

---

## Credits

- **BMAD-METHOD** (Brian Madison) — [github.com/bmad-code-org/BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD) — the "Master persona" concept smith adapts to the ForgePlan artifact vocabulary.
- **AGENTS.md** standard — [agents.md](https://agents.md) — Linux Foundation cross-CLI manifest (Dec 2025).
- **EPIC-002** — Smith master-orchestrator + routing matrix (this marketplace).

## License

MIT
