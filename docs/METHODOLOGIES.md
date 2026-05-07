[English](METHODOLOGIES.md) | [Русский](METHODOLOGIES-RU.md)

# Methodologies — what's built in vs external

Reference for users who ask: "Does ForgePlan support BMAD? What about OpenSpec? RIPER?". Short answer: **most of what you've heard about is already built into the forgeplan CLI** — you don't need separate plugins for them. This doc maps each methodology to where it lives.

---

## Built into `forgeplan` CLI (already working)

These methodologies are part of the forgeplan core. You don't install them separately — they activate when you run `forgeplan validate`, `forgeplan reason`, `forgeplan score`, etc.

### BMAD — PRD workflow validation

**What it is**: a 13-step workflow for writing PRDs with built-in validation rules and adversarial review (a reviewer MUST find at least one problem; zero findings means the review wasn't thorough enough).

**Where in forgeplan**:
- `forgeplan validate <id>` — checks BMAD completeness rules per artifact kind
- Quick Flow vs Full Path — depth-adaptive validation
- Agent specialisation — different reviewer roles (security, architecture, etc.)

**You see it when**: you run `/forge-cycle` (Step 4 — Shape includes BMAD validation), or call `forgeplan validate PRD-NNN` directly.

### OpenSpec — artifact pipeline

**What it is**: a way to organise artifacts as a directed acyclic graph (Proposal → Specs → Design → Tasks) with **delta-specs** (changes only: ADDED / MODIFIED / REMOVED) instead of full rewrites for every iteration. Comes from the upstream OpenSpec project.

**Where in forgeplan**:
- Artifact DAG — every artifact knows its parents and children
- Delta-specs — `forgeplan supersede` / `forgeplan deprecate` use this model
- Custom schemas per artifact kind

**You see it when**: you run `forgeplan graph` (mermaid DAG output), or when you supersede an old artifact with a new one.

### FPF — First Principles Framework

**What it is**: a structured reasoning framework by Anatoly Levenchuk. 224 spec sections covering decomposition, evaluation, reasoning. Includes **F-G-R Trust Calculus** (Formality / Granularity / Reliability) and the **ADI cycle** (Abduction → Deduction → Induction).

**Where in forgeplan**:
- `forgeplan reason <id>` — wraps ADI for any artifact (Deep+ depth requires it before activation)
- `fpf` plugin in this marketplace — interactive `/fpf-decompose`, `/fpf-evaluate`, `/fpf-reason`, `/fpf-lookup`

**You see it when**: route detects Deep depth → `/forge-cycle` calls `forgeplan reason` → 3+ hypotheses generated, each with predictions, then evidence checked.

### ADI — Abduction → Deduction → Induction

**What it is**: a hypothesis-generation cycle from FPF. Given an observation, generate ≥3 candidate explanations (abduction), derive testable predictions (deduction), check evidence (induction). Avoids tunnel vision.

**Where in forgeplan**:
- Built into `forgeplan reason` (mandatory for Deep+ activation)
- `/fpf-reason` for ad-hoc invocation
- Used by `/diagnose` to generate root-cause hypotheses

### DDR — Detailed Decision Record

**What it is**: an extended ADR with invariants, rollback plan, valid_until, pre/post-conditions. From the Quint-code methodology. Four-component structure: Problem Frame → Decision → Rationale → Consequences.

**Where in forgeplan**:
- ADRs created with `forgeplan new adr` follow the DDR template for Deep+ depth
- Verification Gate (5-point check) is part of DDR closure

**You see it when**: an ADR has Invariants and Rollback Plan sections — that's DDR-style.

### R_eff — Effective Reliability scoring

**What it is**: trust-of-decision = **min(evidence_scores)** with CL penalties. Weakest-link, never average. The least-trustworthy piece of evidence determines the artifact's reliability.

**Formula**: `R_eff = min(evidence_score - CL_penalty)` where CL is congruence level (CL3 = 0.0, CL2 = 0.1, CL1 = 0.4, CL0 = 0.9).

**Where in forgeplan**:
- `forgeplan score <id>` calculates R_eff
- Activation gate: requires R_eff > 0 (else stops)
- Visible in `forgeplan health` reports

### Evidence Decay

**What it is**: every Evidence has a `valid_until` TTL. Expired Evidence gets a score of 0.1 (weak but not zero) — graduated epistemic debt. The longer it's expired, the less you should trust it.

**Where in forgeplan**:
- Set per-evidence at creation
- `forgeplan health` flags artifacts with stale evidence
- `forgeplan renew <id> --until <date>` extends TTL with reason

### Verification Gate

**What it is**: a 5-point check before closing a decision:

1. **Deductive consequences** — what follows from this decision?
2. **Counter-argument** — what's the strongest objection?
3. **Self-evidence** — is this a tautology?
4. **Tail failures** — what unlikely-but-catastrophic scenarios?
5. **WLNK challenge** — what's the weakest link?

**Where in forgeplan**:
- Required before activating Deep+ ADRs
- `forgeplan reason <id>` includes the WLNK question

### Pareto Front + Stepping Stone

**What they are** (from FPF):
- **Pareto Front**: a set of non-dominated options — none is strictly worse across **all** dimensions simultaneously. Used in SolutionPortfolio (`forgeplan new solution`).
- **Stepping Stone**: a flag for an option that opens future possibilities even if not optimal now. Considered alongside R_eff when picking from a portfolio.

**Where in forgeplan**:
- `solution` artifact kind has Pareto Front + Stepping Stone fields in its frontmatter
- `forgeplan score <solution-id>` factors them in

### Two-tier extraction (Factum vs Intent) — for brownfield

**What it is** (from `docs/brownfield-extraction-package/02-METHODOLOGY.md`):
- **Tier 1 — Factum**: what code does, provable by reading. 100% confidence, verifiable via re-grep. Examples: ENUM values, conditional branches, return shapes.
- **Tier 2 — Intent**: why the business chose this implementation. Variable confidence — every claim tagged: `verified` ✅ / `strong-inferred` 🟢 / `inferred` 🟡 / `speculation` 🟠 / `unknown` ⬜.

**Where in forgeplan**:
- Built into `forgeplan-brownfield-pack` (when fully ported — see roadmap)
- Confidence tags enforced by extraction skills (`03-intent-inferrer.md`)

---

## Available as separate plugins (install on demand)

These are extensions to the core. They're packaged as marketplace plugins.

### SPARC — Specification → Pseudocode → Architecture → Refinement → Completion

**Plugin**: `agents-sparc` (5 agents — orchestrator + 4 phase specialists).

**When it activates**: `/sprint` detects a Deep depth task AND `agents-sparc` is installed → SPARC orchestrator coordinates the 4 phases. Each phase has a quality gate; the next phase receives the previous phase's full output.

**Use case**: complex feature implementation where you want enforced phasing rather than ad-hoc coding.

### FPF interactive commands

**Plugin**: `fpf` (1 agent + 224-section knowledge base).

Provides `/fpf`, `/fpf-decompose`, `/fpf-evaluate`, `/fpf-reason`, `/fpf-lookup` for interactive structured thinking. Independent of the lifecycle — useful any time you need explicit reasoning.

### Laws of UX

**Plugin**: `laws-of-ux` (UX reviewer agent + auto-hint hook + 30-law knowledge base).

Activates `ux-reviewer` automatically inside `/audit` when the changeset includes frontend files. Independent of forgeplan; ships its own knowledge base.

---

## Recommended companion (separate marketplace, plays well with us)

### Autoresearch — metric-driven iterative loop

**What it is**: a Claude Code (and OpenCode / Codex) skill plugin by Udit Goenka, based on [Karpathy's autoresearch](https://github.com/karpathy/autoresearch). Turns any task with a measurable metric into a goal-directed loop: **Modify → Verify → Keep/Discard → Repeat**. Five commands in v2.0.03: `plan`, `debug`, `security`, `predict`, `reason`.

**Source**: [github.com/uditgoenka/autoresearch](https://github.com/uditgoenka/autoresearch) — separate marketplace, MIT licence.

**How it composes with us**:
- `/forge-cycle` Build phase can delegate to `/autoresearch:plan` when the task has a clear mechanical metric (perf, test rate, bundle size, security findings)
- Autoresearch results captured as `forgeplan new evidence` with `congruence_level: 3` + `evidence_type: measurement` — high-quality CL3 input to R_eff
- Brownfield extraction skills (intent-inferrer, hypothesis-triangulator, canonical-reproducer) can use autoresearch primitives as their loop engine

**Integration guide**: [`docs/AUTORESEARCH-INTEGRATION.md`](AUTORESEARCH-INTEGRATION.md) — three integration patterns, decision matrix, anti-patterns, setup.

**Install**:
```
/plugin marketplace add uditgoenka/autoresearch
/plugin install autoresearch@uditgoenka-autoresearch
```

---

## External (referenced but not implemented in this ecosystem)

### DDD (Domain-Driven Design)

**What it is**: a software-design methodology for complex domains. Bounded contexts, aggregates, ubiquitous language.

**Status**: not implemented as a methodology engine. We have:
- `ddd-domain-expert` agent in `agents-pro` — for advisory work
- `ddd-to-forge.yaml` mapping in `forgeplan-brownfield-pack` — converts DDD bounded-context maps into forgeplan Epic + PRDs + Spec
- DDD references in the brownfield extraction skills

If you want full DDD modelling — combine the agent + brownfield pack + your own discipline.

### C4 (Context / Container / Component / Code)

**What it is**: an architecture-diagram methodology by Simon Brown.

**Status**: similar to DDD — we ship `c4-to-forge.yaml` mapping in `forgeplan-brownfield-pack` (translates C4 docs into forgeplan artifacts) but no C4-specific agent or modelling skill.

---

## Not in this ecosystem (mentioned but not part of forgeplan or marketplace)

### RIPER — Research / Innovate / Plan / Execute / Review

**Status**: not part of forgeplan core, not in our marketplace.

**Closest equivalent**: forgeplan's own lifecycle is **Route → Shape → Build → Evidence → Activate**. The phases differ in framing — RIPER emphasises iterative ideation; forgeplan emphasises traceable artifacts and weakest-link evidence.

If you specifically want RIPER terminology — you can layer it manually:
- Research → `/research`
- Innovate → `/refine` or `/fpf-decompose`
- Plan → `/rfc create`
- Execute → `/sprint` or `/forge-cycle`
- Review → `/audit`

But there's no `/riper` orchestrator command.

### AI-SDLC

**Status**: not named as such in our ecosystem. The closest thing we have is `/autorun` (autopilot orchestrator) which approximates an end-to-end AI-driven dev cycle, but isn't branded as AI-SDLC.

### BMAD-METHOD external repo

**What it is**: the upstream BMAD repository with full method documentation. Forgeplan integrates the validation rules and 13-step workflow (see "Built into forgeplan CLI" above), but the upstream repo has additional context and templates not exposed through `forgeplan`.

If you want to read the original BMAD spec → see `sources/BMAD-METHOD/` in the forgeplan repo.

---

## Quick lookup table

| Methodology | Where it lives | How to use |
|---|---|---|
| BMAD | forgeplan CLI | `forgeplan validate <id>` |
| OpenSpec | forgeplan CLI | `forgeplan graph`, `forgeplan supersede`, delta-specs |
| FPF (full) | `fpf` plugin | `/fpf-decompose`, `/fpf-evaluate`, `/fpf-reason`, `/fpf-lookup` |
| ADI cycle | forgeplan CLI + fpf plugin | `forgeplan reason <id>` (mandatory for Deep+); `/fpf-reason` (interactive) |
| DDR | forgeplan CLI | `forgeplan new adr` (Deep+ uses DDR template) |
| R_eff | forgeplan CLI | `forgeplan score <id>` |
| Evidence Decay | forgeplan CLI | `forgeplan health` flags expired evidence; `forgeplan renew <id>` |
| Verification Gate | forgeplan CLI + manual | Required for Deep+ ADR closure |
| Pareto Front + Stepping Stone | forgeplan CLI | Within `solution` artifact kind |
| SPARC | `agents-sparc` plugin | `/sprint` Deep tasks auto-activate |
| Two-tier (Factum/Intent) | `forgeplan-brownfield-pack` (when ported) | `/extract intent --confidence-tagged` |
| Laws of UX | `laws-of-ux` plugin | `/ux-review`, `/ux-law <name>` |
| DDD | `agents-pro` + brownfield pack | Advisory only — no engine |
| C4 | brownfield pack mapping | YAML conversion only |
| Autoresearch | external companion (`uditgoenka/autoresearch`) | Install separately; see [AUTORESEARCH-INTEGRATION.md](AUTORESEARCH-INTEGRATION.md) for integration patterns |
| RIPER | NOT in ecosystem | Manual — chain `/research` → `/refine` → `/rfc` → `/sprint` → `/audit` |
| AI-SDLC | NOT named, approximated by `/autorun` | `/autorun "<task>"` |

---

## See also

- [DEVELOPER-JOURNEY.md](DEVELOPER-JOURNEY.md) — narrative onboarding with 4 personas
- [PLAYBOOK.md](PLAYBOOK.md) — use-case matrix (which command for which scenario)
- [USAGE-GUIDE.md](USAGE-GUIDE.md) — reference manual for the marketplace
- [ARCHITECTURE.md](ARCHITECTURE.md) — 4-layer mental model
- [`fpf` plugin](../plugins/fpf/README.md) — FPF interactive commands
- [`agents-sparc` plugin](../plugins/agents-sparc/README.md) — SPARC phase agents
- [`forgeplan-brownfield-pack`](../plugins/forgeplan-brownfield-pack/README.md) — brownfield extraction
- ForgePlan repo: [`docs/methodology/GLOSSARY.md`](https://github.com/ForgePlan/forgeplan/blob/dev/docs/methodology/GLOSSARY.md) for the full term reference
