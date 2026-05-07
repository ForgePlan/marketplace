[English](AI-SDLC-MAPPING.md) | [Русский](AI-SDLC-MAPPING-RU.md)

# AI-SDLC mapping — typical phases ↔ ForgePlan commands

A reference table for users coming from AI-SDLC (AI Software Development Lifecycle) terminology. AI-SDLC isn't a single canonical methodology — different sources organise the phases differently. This doc maps the **most common** phase set onto our marketplace commands so you know what to invoke at each phase.

> **Bottom line**: ForgePlan and the fpl-skills marketplace cover the full AI-SDLC cycle. The phase names differ; the work is the same. Use this table when AI-SDLC vocabulary is required (team conventions, contracts, compliance).

---

## Phase-by-phase mapping

| AI-SDLC phase | What happens | ForgePlan command(s) | Forgeplan artifacts produced |
|---|---|---|---|
| **Concept / Idea** | Identify the need, gather rough requirements | [`/shape <idea>`](../plugins/fpl-skills/skills/shape/SKILL.md) | Draft PRD |
| **Research / Discovery** | Prior art, alternatives, gap analysis | [`/research <topic>`](../plugins/fpl-skills/skills/research/SKILL.md) | `research/reports/<topic>/REPORT.md`, optional Note |
| **Design / Architecture** | Domain modelling, system architecture, decisions | [`/refine <plan>`](../plugins/fpl-skills/skills/refine/SKILL.md), [`/ddd-decompose`](../plugins/fpl-skills/skills/ddd-decompose/SKILL.md), [`/c4-diagram`](../plugins/fpl-skills/skills/c4-diagram/SKILL.md), [`/fpf-decompose`](../plugins/fpf/) | PRD, RFC, ADR, Spec, Mermaid diagrams |
| **Specification** | Formal API contracts, schemas, behaviour specs | [`/rfc create`](../plugins/fpl-skills/skills/rfc/SKILL.md), `forgeplan new spec` | RFC, Spec |
| **Build / Implementation** | Code, tests, working software | [`/sprint`](../plugins/fpl-skills/skills/sprint/SKILL.md), [`/forge-cycle`](../plugins/forgeplan-workflow/), [`/autorun`](../plugins/fpl-skills/skills/autorun/SKILL.md), [`/do`](../plugins/fpl-skills/skills/do/SKILL.md), [`/build`](../plugins/fpl-skills/skills/build/SKILL.md) | Code + tests; Evidence on completion |
| **Test / Verification** | Multi-expert review, debug, quality gates | [`/audit`](../plugins/fpl-skills/skills/audit/SKILL.md), [`/diagnose <bug>`](../plugins/fpl-skills/skills/diagnose/SKILL.md), [autoresearch](AUTORESEARCH-INTEGRATION.md) | Evidence (verdict + congruence_level + evidence_type) |
| **Release / Deploy** | Activate the artifact, prepare commit, ship | `forgeplan activate <id>`, `gh pr create` | Activated PRD, conventional commit with `Refs:` |
| **Operate / Monitor** | Production health, blind spots, stale decisions | [`/restore`](../plugins/fpl-skills/skills/restore/SKILL.md), [`/briefing`](../plugins/fpl-skills/skills/briefing/SKILL.md), `forgeplan health`, `forgeplan stale` | Daily signals, blind-spot alerts, `valid_until` triggers |
| **Maintain / Evolve** | Update existing decisions, supersede artifacts | `forgeplan supersede <id> --by <new>`, `forgeplan deprecate <id>`, [`/refine`](../plugins/fpl-skills/skills/refine/SKILL.md) on existing PRD/RFC | Lifecycle transitions, refresh notes |

---

## Coverage map

| AI-SDLC phase | Coverage |
|---|---|
| Concept / Idea | ✅ `/shape` (interview from scratch) |
| Research / Discovery | ✅ `/research` (5-agent parallel) |
| Design / Architecture | ✅ `/refine` + `/ddd-decompose` + `/c4-diagram` + `/fpf-decompose` (four interactive design skills) |
| Specification | ✅ `/rfc create` + `forgeplan new spec` |
| Build / Implementation | ✅ `/sprint` (interactive), `/forge-cycle` (orchestrated), `/autorun` (unattended), `/do` (with checkpoints), `/build` (from existing plan) |
| Test / Verification | ✅ `/audit` (4-6 reviewers), `/diagnose` (6-phase debug), [autoresearch](AUTORESEARCH-INTEGRATION.md) (metric-driven loop) |
| Release / Deploy | ✅ `forgeplan activate` (artifact lifecycle); 🟡 `gh pr create` (we don't deploy to prod — that's CI/CD) |
| Operate / Monitor | ✅ `/restore`, `/briefing`, `forgeplan health` for forgeplan-side; 🟡 production observability is outside our scope |
| Maintain / Evolve | ✅ Lifecycle commands (`supersede`, `deprecate`, `renew`); refinement of existing artifacts |

---

## End-to-end example through AI-SDLC phases

A worked example for "**add magic-link authentication to our SaaS**":

```
Phase 1 — Concept
  /shape "magic-link auth for our SaaS"
  → PRD-NNN draft (problem, target users, MVP scope, risks)

Phase 2 — Research
  /research "magic-link auth React + Express patterns"
  → research/reports/auth/REPORT.md (5-agent investigation)

Phase 3 — Design
  /refine PRD-NNN
  → polished PRD; ADR for "why magic-link over OAuth"
  /ddd-decompose
  → bounded contexts: Identity, Session, Notification
  /c4-diagram
  → L1 Context + L2 Container diagrams (Mermaid)

Phase 4 — Specification
  /rfc create
  → RFC-NNN with implementation phases, API contracts
  forgeplan new spec "magic-link token format + endpoints"

Phase 5 — Build
  /forge-cycle "implement magic-link auth from RFC-NNN"
  → wave-based execution; SPARC if Deep; tests added
  → /sprint produces 18 files changed, 47 tests added

Phase 6 — Test
  /audit
  → 4 reviewers; 2 HIGH findings → resolved
  → forgeplan new evidence with verdict: supports, congruence_level: 3

Phase 7 — Release
  forgeplan score PRD-NNN  → R_eff = 0.85
  forgeplan activate PRD-NNN
  gh pr create --base main

Phase 8 — Operate
  Daily: /briefing (any blind spots?) + /restore (current branch state)

Phase 9 — Maintain
  In 6 months, when ADR's valid_until expires:
  forgeplan renew ADR-NNN --reason "<re-evaluation>" --until <date>
  OR
  forgeplan supersede ADR-NNN --by ADR-MMM (new approach decided)
```

The whole cycle uses **one shared artifact graph**. Each phase's output is wired into the artifact graph; nothing is throw-away.

---

## How to brand your run as "AI-SDLC compliant"

If your team or compliance framework requires explicit AI-SDLC phase labelling:

1. Use `/forge-cycle` (or `/autorun`) for execution — it produces forgeplan artifacts at each phase
2. In commits and PR titles, prefix with the AI-SDLC phase: `[Phase 5: Build] feat(auth): add magic-link flow`
3. Add a frontmatter field `ai_sdlc_phase: build` to PRDs/RFCs if your team conventions need it (forgeplan accepts custom frontmatter fields without rejecting validation)
4. In Evidence, set `evidence_type` to map cleanly: `code_review` for Phase 6, `measurement` for autoresearch loops, `manual_verification` for human acceptance

The artifact graph stays canonical (in forgeplan's native vocabulary); the AI-SDLC labels are an overlay.

---

## What we don't claim to cover

- **Production deployment to specific platforms** (AWS, GCP, Kubernetes) — that's the CI/CD layer, outside our marketplace
- **Live observability dashboards** (Grafana, Datadog, Sentry) — we surface forgeplan-side blind spots; production health is for your APM
- **Compliance audits** (SOC2, ISO 27001) — we produce traceable artifacts which **support** compliance audits but don't perform them

These are typically what the AI-SDLC framework adds on top of dev-side work; the marketplace covers the dev-side.

---

## See also

- [DEVELOPER-JOURNEY.md](DEVELOPER-JOURNEY.md) — narrative onboarding (4 personas, including "Architect / tech lead" persona that approximates AI-SDLC roles)
- [PLAYBOOK.md](PLAYBOOK.md) — use-case matrix; AI-SDLC scenarios map to "full automation" and "night-run" use-cases
- [METHODOLOGIES.md](METHODOLOGIES.md) — what's built into forgeplan vs external (AI-SDLC sits as a **vocabulary overlay**, not a separate engine)
- [UPSTREAM-METHODOLOGIES.md](UPSTREAM-METHODOLOGIES.md) — pointers to upstream methodologies forgeplan integrates (BMAD, OpenSpec, FPF, Quint-code)
