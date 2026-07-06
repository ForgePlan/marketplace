# Smith — master orchestrator

> Strategic entry-point for the ForgePlan ecosystem: reads project state, classifies the situation against a 14-context routing matrix, and returns a structured Plan naming which specialist agents to dispatch in which order.

Smith is the ForgePlan analogue of the **BMAD Master** pattern — adapted to the ForgePlan artefact vocabulary (PRD / RFC / ADR / EVID) and dispatch surface (named subagents instead of personas). The smith family lives in `plugins/fpl-skills/skills/smith*/` and is backed by the `smith` agent (`plugins/agents-pro/agents/smith.md`), the **routing-map.md** brain (14 contexts × 29 methodologies), and five templates in `plugins/fpl-skills/templates/`.

**Foundation**: EPIC-002 «Smith master-orchestrator + routing matrix» — Wave 1 (agent + routing map + sections + templates), Wave 2 (the four entry-point skills below).

---

## The 4 skills

| Skill | One-line | Spec |
|---|---|---|
| **`/smith`** | Default conversational entry — reads state, classifies context, returns Plan (or auto-routes to a sibling) | [SKILL.md](./SKILL.md) |
| **`/smith-bootstrap`** | Greenfield onboarding — `forgeplan init` + CLAUDE.md/AGENTS.md scaffold + first Brief + first PRD | [smith-bootstrap/SKILL.md](../smith-bootstrap/SKILL.md) |
| **`/smith-plan`** | Per-task structured Plan from the routing matrix — given a concrete task, returns the dispatch sequence | [smith-plan/SKILL.md](../smith-plan/SKILL.md) |
| **`/smith-routing`** | Educational walkthrough of the routing matrix — explains methodologies, never commits to action | [smith-routing/SKILL.md](../smith-routing/SKILL.md) |

---

## When to use which

| Situation | Skill |
|---|---|
| Fresh repo, no `CLAUDE.md` or `.forgeplan/` | `/smith-bootstrap` (or just `/smith` — it auto-routes) |
| "Что дальше?" / vague session-start | `/smith` (default mode) |
| Have a specific task, want the playbook | `/smith-plan <task>` |
| Want to learn methodologies without commitment | `/smith-routing` |
| Want a snapshot of state, no recommendation | `/smith status` |
| Session-close summary | `/smith handoff` |
| Trivial fix (one-liner, typo) | none — bypass smith, dispatch `coder` + `code-reviewer` directly |

---

## The 14 contexts smith routes

| # | Context | Trigger phrases |
|---|---|---|
| 1 | Greenfield bootstrap | "new project", "from scratch", "новый проект" |
| 2 | Brownfield modernisation | "legacy", "rewrite the monolith", "легаси" |
| 3 | New feature in existing service | "add a feature", "new endpoint", "новая фича" |
| 4 | Bug fix — production, non-trivial | "production bug", "race condition", "баг в проде" |
| 5 | Bug fix — trivial / hotfix | "typo", "off-by-one", "хотфикс" |
| 6 | Refactoring | "refactor", "clean up", "рефакторинг" |
| 7 | Architecture decision | "we need to decide", "choose between X and Y" |
| 8 | Security audit | "OWASP", "secure this", "аудит безопасности" |
| 9 | Performance audit | "slow", "latency spike", "оптимизация" |
| 10 | Product discovery (PDLC) | "what should we build", "user research" |
| 11 | Tech debt cleanup | "tech debt", "cleanup sprint", "техдолг" |
| 12 | Live incident response | "production down", "outage", "лежит прод" |
| 13 | TDD-first feature (tests frozen before code) | "TDD", "test-first", "тесты сначала" |
| 14 | Design-system → code (CANVAS) | "design system to code", "Pencil to Storybook", "дизайн-система в код" |

Full row recipes (primary + secondary methodology + dispatch sequence + evidence requirements) live in [`routing-map.md`](./routing-map.md). Rows 13-14 do not yet have a dedicated `sections/NN-*.md` playbook — read the full row directly.

---

## The 29 methodologies smith knows

Grouped by phase of the SDLC they cover. Every methodology has a one-page card in [`routing-map.md`](./routing-map.md) with definition, when-it-shines, when-NOT, and source link.

**Spec / framing**: BMAD-METHOD, SPARC, GitHub Spec Kit, RIPER-5, Spec-Driven Development (light path)

**Design / decision**: FPF ADI, ADR/MADR, Domain-Driven Design, Event Storming, C4 Model, Hexagonal Architecture, Clean Architecture

**Refactor / modernisation**: Strangler Fig, Branch-by-Abstraction, Anti-Corruption Layer, Mikado Method

**Quality / audit**: OWASP Top 10 2025, STRIDE/ASTRIDE, DORA Metrics, SRE

**Diagnostics / RCA**: 5 Whys, Fishbone (Ishikawa), A3 Problem Solving, Blameless post-mortem

**Discovery / product**: Jobs-To-Be-Done, Lean Startup, Double Diamond

**Incident**: Incident Command System (FEMA-adapted)

**Verification**: Ground-truth verification (generator ≠ verifier)

---

## Quick start

```bash
# vague "what next" — default mode runs Steps 1-8, returns Plan
/smith

# fresh repo — full bootstrap walkthrough
/smith bootstrap

# concrete task — produces an 8-section Plan via templates/smith-plan.md
/smith plan refactor the auth module to OAuth2

# learn methodologies — educational, no action committed
/smith routing BMAD vs SPARC

# state snapshot only — no recommendation
/smith status

# end-of-session summary
/smith handoff
```

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│ User / orchestrator                                                  │
│   /smith  /smith-bootstrap  /smith-plan  /smith-routing              │
└─────────────────────────────┬────────────────────────────────────────┘
                              │ (skill dispatches)
                              ▼
                ┌───────────────────────────────┐
                │   smith agent (Profile B-orch) │ ◄── plugins/agents-pro/agents/smith.md
                │   reads + classifies + writes  │
                │   the Plan markdown only       │
                └────────────┬──────────────────┘
                             │ (reads)
       ┌─────────────────────┼────────────────────────┐
       ▼                     ▼                        ▼
 routing-map.md       sections/NN-*.md          templates/smith-*.md
 (14 × 29)            (12 playbooks)            (5 output templates)
       │                     │                        │
       └─────────────────────┴────────────────────────┘
                             │
                             ▼
                     Plan markdown returned
                             │
                             ▼
              Orchestrator (NOT smith) dispatches
              the first named agent. Smith is read-mostly.
```

**Smith never writes source files, never mutates forgeplan artifacts, and never dispatches more than one agent without explicit user confirmation.** The `disallowedTools` denylist on the smith agent enforces this (Profile B-orchestrator: denies `Write`, `Edit`, `NotebookEdit`, `forgeplan_activate`).

---

## Related

- **`/forge-cycle`** (in `forgeplan-workflow`) — reactive enforcer. Runs ONE task through the 9-phase pipeline. Smith picks WHICH task; `/forge-cycle` executes it.
- **`/autorun`** (in `fpl-skills`) — autonomous long-running loop. On cold start, should dispatch `/smith` first to get a Plan, then walk the Plan task-by-task.
- **`/forge-progress`** — real-time visibility into in-flight forgeplan work. Orthogonal to smith.
- **`/methodology-check <ID>`** — pre-activation 4-layer coverage report (S10 FPF, S11 BMAD, S12 OpenSpec, S13 Forgeplan). Orthogonal to smith (smith routes; methodology-check audits one artifact).
- **`/decay-watch`** — scans NOTE-013 deferred items + parseable triggers in templates (e.g., `routing-decision.md` revisit trigger, `post-mortem.md` action items).

---

## References

- **Agent**: [`plugins/agents-pro/agents/smith.md`](../../../agents-pro/agents/smith.md) — Profile B-orchestrator (Wave 1A).
- **Routing brain**: [`routing-map.md`](./routing-map.md) — 14 contexts × 29 methodologies (Wave 1B).
- **Section playbooks**: [`sections/`](./sections/) — `01-greenfield.md` through `12-incident.md` (Wave 1B agentic RAG).
- **Templates**: [`plugins/fpl-skills/templates/SMITH-TEMPLATES.md`](../../templates/SMITH-TEMPLATES.md) — guide to the 5 smith-related output templates.
- **Agent authoring**: [`plugins/fpl-skills/AGENT-AUTHORING-GUIDE.md`](../../AGENT-AUTHORING-GUIDE.md) — canonical Profile A/B/C/D patterns.
- **Pipeline foundation**: `CLAUDE.md` 4-Layer Pipeline (S10 FPF → S11 BMAD → S12 OpenSpec → S13 Forgeplan).
- **External inspiration**: [BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD) — smith is the ForgePlan analogue of the BMAD Master persona.
- **Epic**: EPIC-002 (this skill cluster).
