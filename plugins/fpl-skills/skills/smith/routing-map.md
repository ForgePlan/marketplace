# Smith Routing Map

> The single-page brain of `/smith`. Every context that smith handles maps to a primary methodology + secondary methodologies + dispatch sequence + evidence requirements.
> Last updated: 2026-05-25 (Sprint EPIC-002 Wave 1B).

## How to read this map

Smith is a master-orchestrator agent: when invoked, it inspects the user's
intent and the current repository state, picks **exactly one** row from the
table below, and follows that row's recipe. The row tells smith four things:
(1) which **primary methodology** governs the work (the heaviest body of
practice that shapes outputs — e.g. BMAD-METHOD for greenfield, Strangler
Fig for brownfield modernisation), (2) which **secondary methodologies**
support that primary (architecture lens, decision-recording style, audit
template), (3) which **dispatch sequence** of agents to fire in order, and
(4) what **evidence artefacts** must exist before activation (per the
4-layer S10–S13 pipeline in this repo's CLAUDE.md).

Smith never blends rows — it picks one and commits. The single-row rule
prevents methodology cocktails — when practitioners mix BMAD and SPARC and
Spec Kit "to cover all bases", what emerges is none of them: the artefacts
no longer fit any community pattern and the team has to re-invent review
checklists from scratch.

If the user's situation truly sits between two rows (e.g. a greenfield
service that ships inside a legacy monolith), smith MUST emit the
`<<NEED_USER_INPUT>>` sentinel with ≥3 hypotheses on which row to pick
(FPF ADI discipline per Sprint Z7/PRD-059 — Step 6 of the smith.md
Procedure). **Never guess silently.** The only exception: if the
orchestrator session explicitly invokes smith in autonomous mode AND the
ambiguity blocks a live incident, smith picks the row whose **risk
profile** is higher (brownfield over greenfield, audit over feature) and
records the deviation in its Plan output for human review. In every other
context, the sentinel-emit rule from smith.md HARD RULE 10 is binding.

Every dispatch sequence respects the canonical 5 agent profiles documented
in `plugins/fpl-skills/AGENT-AUTHORING-GUIDE.md`: **Profile A** (Creator,
denies file-write + `forgeplan_activate`), **Profile B** (Reviewer, denies
file-write + activate + claims + memory_retain), **Profile C** (Read-only,
denies all mutations), **Profile C-coder** (source files, denies forgeplan
mutations only), **Profile D** (Maintainer, denies `forgeplan_new` + file
writes + activate). When a row lists "specification (Profile A)", smith
dispatches the actual agent from `plugins/agents-sparc/agents/` or
`plugins/agents-pro/agents/` — see the **Agent index** at the bottom of
this file for the canonical names and source plugins.

---

## The 12 contexts

| # | Context | Trigger phrases (EN / RU) | Primary methodology | Secondary | Dispatch sequence (agents) | Evidence required | Why this combo |
|---|---|---|---|---|---|---|---|
| 1 | Fresh project (greenfield) | "new project", "from scratch", "bootstrap", "новый проект", "с нуля" | BMAD-METHOD (trimmed) + GitHub Spec Kit | AGENTS.md scaffold + ADR/MADR + C4 L1+L2 | brief-intake (A) → specification (A) → adr-architect (A) → architecture (A) → goal-planner (A) → coder (C-coder) → tester (B) → guardian (B-gate) | PRD + RFC + ≥1 ADR + ≥3-hyp ADI EVID + BMAD adversarial EVID with ≥1 finding + C4 L1+L2 diagrams | Spec-driven shines when there is no legacy gravity; BMAD's analyst-PM-architect-dev split maps cleanly onto our Profile A creator chain; AGENTS.md gives cross-CLI portability from day one |
| 2 | Brownfield modernisation | "legacy", "modernize", "rewrite the monolith", "легаси", "переписать монолит" | Strangler Fig + Domain-Driven Design + Anti-Corruption Layer | Event Storming + Branch-by-Abstraction + ADR-supersede with delta-spec | discover (A) → research-analyst (A) → ddd-domain-expert (A) → adr-architect (A) → goal-planner (A) → coder (C-coder) → tester (B) → architect-reviewer (B) → guardian (B-gate) | EVID (discovery + 9 brownfield MCP findings) + ADR (boundary decisions, supersede chain) + PRD (modernisation plan) + ADI EVID + BMAD EVID | Risk-averse incremental replacement preserves the cashflow of running legacy while bounded contexts surface the seams; ACL keeps the new code semantically clean against legacy noise |
| 3 | New feature in existing service | "add a feature", "build a new endpoint", "новая фича", "добавить функционал" | SPARC (Specification → Pseudocode → Architecture → Refinement → Completion) | Hexagonal Architecture + JTBD framing | brief-intake (A) → specification (A) → architecture (A) → goal-planner (A) → coder (C-coder) → code-reviewer (B) → tester (B) → guardian (B-gate) | PRD + ADI EVID + BMAD EVID with ≥1 finding + tester EVID | SPARC's iterative refinement is right-sized for a feature scope (no full ADR-bath needed unless ≥3 modules); Hexagonal keeps the feature port-shaped so it composes cleanly into the existing service |
| 4 | Bug fix — production, non-trivial | "production bug", "incident postmortem fix", "race condition fix", "баг в проде", "продовый инцидент" | RIPER-5 (Research-Innovate-Plan-Execute-Review) + 5 Whys root-cause | Blameless post-mortem + ADR if architectural cause | **Step 0: invoke `/riper` skill (Research mode first — read, don't write).** → debugger (C) → error-detective (C) → research-analyst (A) → adr-architect (A, only if architectural) → coder (C-coder) → code-reviewer (B) → tester (B) → guardian (B-gate) | EVID (root-cause analysis, with `## Research` section per RIPER discipline) + PRD or ADR (only if architectural) + tester EVID with regression test + BMAD EVID with ≥1 finding | Production bugs need disciplined RCA before code touches — 5 Whys forces the root, not the symptom; RIPER-5's Research phase prevents the common pattern of "patch the symptom and move on". Dispatch sequence opens with `/riper` Research mode (PRD-066 G1) — every agent below executes under RIPER discipline, and `/methodology-check` Step 10 verifies bug-fix EVIDs carry a `## Research` section. |
| 5 | Bug fix — trivial / hotfix | "typo", "off-by-one", "broken link", "хотфикс", "опечатка" | Tactical fast-path (no formal methodology) | None — depth=Tactical | coder (C-coder) → code-reviewer (B) | code-reviewer EVID with PASS verdict (no PRD/ADR — tactical is scoped to S12+S13 only per /methodology-check) | Process overhead must scale with risk; for a one-line fix, the full S10-S13 pipeline is more expensive than the fix and erodes team trust in the methodology |
| 6 | Refactoring | "refactor", "clean up the code", "рефакторинг", "почистить код" | Branch-by-Abstraction + Mikado Method | DDD bounded-context check + Clean Architecture layering | research-analyst (A) → code-analyzer (C) → architect-reviewer (B, pre-refactor) → adr-architect (A) → goal-planner (A) → coder (C-coder) → architect-reviewer (B, post-refactor) → tester (B) → guardian (B-gate) | ADR (target architecture) + PRD (refactor plan) + ADI EVID (≥3 hyp: refactor-now / strangler / leave-alone) + pre/post architect-reviewer EVID + BMAD EVID | Refactoring without an end-state ADR drifts into yak-shaving; Mikado walks dependencies safely; pre/post architect-reviewer prevents "I made it different, not better" |
| 7 | Architecture decision | "we need to decide", "choose between X and Y", "architectural choice", "выбрать между", "архитектурное решение" | FPF ADI (Abduction → Deduction → Induction) + ADR/MADR | C4 L1+L2 (if ≥3 modules) + OpenSpec delta-spec (if supersedes) | research-analyst (A) → adr-architect (A) → c4-diagram skill (in Dispatch mode, if ≥3 modules) → architect-reviewer (B) → guardian (B-gate) | ADR (full template, ≥3 modules → mandatory C4) + ADI EVID with ≥3 hypotheses (including "do nothing") + BMAD EVID with ≥1 finding | ADI is the canonical thinking primitive for irreversible decisions per CLAUDE.md S10; the 3rd hypothesis ("do nothing / scope reduction") is the most often skipped and the most often correct |
| 8 | Security audit | "security review", "OWASP", "secure this", "проверь безопасность", "аудит безопасности" | OWASP Top 10 2025 + STRIDE threat modelling | ASTRIDE for AI-specific threats + ADR for mitigation decisions | research-analyst (A) → security-expert (B) → injection-analyst (B) → pii-detector (B) → adr-architect (A, for mitigations) → guardian (B-gate) | EVID (security-expert + injection-analyst + pii-detector, all Profile B with PASS/CONCERNS/BLOCKER) + ADR (for any mitigation that changes architecture) + BMAD EVID | OWASP gives the checklist coverage; STRIDE forces threat-model reasoning; AI-specific apps need ASTRIDE (Prompt-injection, Model-theft, etc.) which STRIDE alone misses |
| 9 | Performance audit | "slow", "latency spike", "perf review", "тормозит", "оптимизация" | DORA metrics + SRE error-budget framing + Performance budget per page/endpoint | Profiling-first ADR + 5 Whys for regressions | performance-engineer (B) → research-analyst (A) → code-analyzer (C) → adr-architect (A, for arch changes) → coder (C-coder) → tester (B, regression) → guardian (B-gate) | EVID (perf baseline + post-change measurement) + ADR (only if architectural change) + tester EVID (regression bench) + BMAD EVID | Perf without baseline is theatre; DORA + perf-budget gives a falsifiable target; SRE's error-budget framing prevents "optimise everything" sprawl |
| 10 | Product discovery (PDLC) | "what should we build", "discovery", "user research", "что строить", "исследование пользователей" | Jobs-To-Be-Done (JTBD) + Lean Startup (Build-Measure-Learn) | Double Diamond (Discover-Define-Develop-Deliver) + Event Storming for domain | brief-intake (A) → research-analyst (A) → goal-planner (A) → specification (A) → architect-reviewer (B) → guardian (B-gate) | NOTE (discovery findings) + PRD (with explicit Non-Goals + JTBD framing) + ADI EVID + BMAD EVID | JTBD reframes features as outcomes (the customer hires a milkshake for the morning commute); Lean's MVP loop matches our smallest-shippable-EVID rhythm; Double Diamond gives a vocabulary the design team already speaks |
| 11 | Tech debt cleanup | "tech debt", "cleanup sprint", "technical debt backlog", "техдолг", "уборка кода" | A3 Problem Solving (Toyota) + Fishbone (Ishikawa) root-cause | Branch-by-Abstraction + ADR-supersede for old decisions | code-analyzer (C) → research-analyst (A) → architect-reviewer (B) → adr-architect (A) → goal-planner (A) → coder (C-coder) → tester (B) → guardian (B-gate) | NOTE (A3 sheet: problem / current / target / actions) + ADR (any superseded decisions, with delta-spec) + PRD (cleanup plan with measurable end-state) + BMAD EVID | A3 forces a single-page articulation of WHY this debt is now worth paying — most tech-debt sprints fail because the team can't justify the trade-off out loud; Fishbone catches the systemic vs local distinction |
| 12 | Live incident response | "production down", "incident now", "outage", "лежит прод", "инцидент" | Incident Command System + 5 Whys (post-incident) + Blameless post-mortem | SRE runbook + error-budget recharge decision | **Phase 1 (during fire):** error-detective (C) → debugger (C) → platform-engineer (C, infra read-only) → coder (C-coder, hotfix) → tester (B, smoke). **Phase 2 (post-fire):** research-analyst (A, RCA + 5 Whys) → adr-architect (A, only if systemic) → guardian (B-gate, on the post-incident PRD only) | Phase 1: NOTE (incident timeline) + tactical hotfix (no PRD during fire). Phase 2: PRD (lessons + actions) + ADR (if systemic cause) + BMAD EVID on the post-incident PRD + post-mortem `## Revisit Triggers` section parseable for /decay-watch | During the fire, methodology is "stop the bleeding"; after the fire, blameless post-mortem + 5 Whys produce the artefacts; the gate runs on the **post-incident PRD**, not the hotfix itself |

---

## Methodology cards

Each methodology referenced in the table above. Five lines per card: one-sentence definition, when it shines, when NOT to use, and source link.

### BMAD-METHOD

- One sentence: Multi-role spec-driven framework that splits greenfield work across **Analyst → PM → Architect → Dev → QA** personas, with each persona producing one canonical artefact.
- When it shines: Clean greenfield projects where role specialisation pays off and there is no legacy gravity to fight.
- When NOT to use: Brownfield modernisation (the Analyst persona has nothing to discover); tactical bug fixes (overhead exceeds value).
- Source: https://github.com/bmad-code-org/BMAD-METHOD

### SPARC

- One sentence: Five-phase iterative methodology — **Specification → Pseudocode → Architecture → Refinement → Completion** — designed for AI-assisted feature development.
- When it shines: Adding a new feature inside an existing service where iteration on the spec is cheap and tests anchor the refinement loop.
- When NOT to use: Architectural decisions (no SPARC phase for irreversible choices); incident response (no time for Pseudocode).
- Source: https://github.com/ruvnet/sparc

### RIPER-5

- One sentence: Five-mode operating discipline — **Research → Innovate → Plan → Execute → Review** — with strict mode-gating to prevent premature implementation.
- When it shines: Production bug investigations where the team must resist the urge to patch before understanding.
- When NOT to use: Trivial typo fixes (the Research mode produces zero signal); greenfield work (no extant code to research).
- Source: https://github.com/johnpeterman72/CursorRIPER

### GitHub Spec Kit

- One sentence: Spec-first project scaffolding that emits `spec/`, `plan/`, `tasks/` folders backed by `.specify/` config and AGENTS.md cross-CLI shim.
- When it shines: Greenfield projects that will be consumed by multiple CLIs (Claude Code, Cursor, Codex) — AGENTS.md is its native artefact.
- When NOT to use: Tactical fixes; legacy codebases (Spec Kit assumes you author the spec before any code exists).
- Source: https://github.com/github/spec-kit

### FPF ADI (Abduction → Deduction → Induction)

- One sentence: Three-step reasoning cycle that requires **≥3 hypotheses** (including a "do nothing" alternative) before committing to an architectural choice.
- When it shines: Any Standard+ PRD/RFC/ADR per S10 of the 4-layer pipeline — irreversible decisions where false dichotomy is the dominant failure mode.
- When NOT to use: Decisions with two genuinely binary options and zero ambiguity (rare in practice; if you find one, double-check it's not a false binary).
- Source: `plugins/fpf/skills/fpf-knowledge/SKILL.md` (this repo) + https://github.com/ForgePlan/marketplace

### Domain-Driven Design (DDD)

- One sentence: Strategic design methodology that surfaces **bounded contexts** and a **ubiquitous language** before tactical patterns (Aggregates, Repositories, Events) are picked.
- When it shines: Brownfield modernisation (contexts surface the legacy seams); new services with non-trivial domain complexity.
- When NOT to use: CRUD apps where the domain is "rows in a table"; algorithmic work where the domain is "this one function".
- Source: Eric Evans, *Domain-Driven Design* (2003); https://www.domainlanguage.com/ddd/

### C4 Model

- One sentence: Four-level architecture diagram methodology — **Context (L1) → Container (L2) → Component (L3) → Code (L4)** — that pairs naturally with full ADRs.
- When it shines: Any ADR touching ≥3 modules (per CLAUDE.md Sprint Z9 rule); cross-team architecture reviews where shared vocabulary matters.
- When NOT to use: Single-service decisions (L1 is overkill); class-level design (L4 belongs in code comments).
- Source: Simon Brown, https://c4model.com

### Event Storming

- One sentence: Collaborative domain-discovery workshop that uses sticky notes to surface **domain events**, **commands**, **aggregates**, and **bounded contexts** in a single session.
- When it shines: Brownfield discovery where the domain experts know things the code can't tell you; product discovery before any code is written.
- When NOT to use: Solo work (it needs ≥3 participants to function); incident response (it needs hours, not minutes).
- Source: Alberto Brandolini, https://www.eventstorming.com

### Strangler Fig

- One sentence: Brownfield replacement pattern that grows the new system **around** the legacy until the legacy can be safely retired branch-by-branch.
- When it shines: Risk-averse modernisation where a big-bang rewrite would burn cashflow.
- When NOT to use: Greenfield (nothing to strangle); legacy systems where the legacy is already on fire (use incident response first).
- Source: Martin Fowler, https://martinfowler.com/bliki/StranglerFigApplication.html

### Branch-by-Abstraction

- One sentence: Refactoring technique that introduces an **abstraction layer** between callers and the implementation, swaps the implementation behind it, then deletes the abstraction.
- When it shines: Refactoring where the old and new must coexist on `main` for weeks; modernisation steps inside a Strangler Fig.
- When NOT to use: Trivial refactors (overkill); short-lived feature branches (just use a feature branch).
- Source: Paul Hammant, https://martinfowler.com/bliki/BranchByAbstraction.html

### Anti-Corruption Layer (ACL)

- One sentence: DDD tactical pattern that wraps an external/legacy bounded context in a **translation layer** so domain terms don't leak into the new system.
- When it shines: Brownfield modernisation where the legacy data model is semantically incompatible with the new domain.
- When NOT to use: Internal-only refactors (no external context to corrupt); short-lived integrations (the layer becomes legacy itself).
- Source: Eric Evans, *Domain-Driven Design* Ch. 14; https://learn.microsoft.com/en-us/azure/architecture/patterns/anti-corruption-layer

### ADR / MADR

- One sentence: **Architecture Decision Record** format (and its **Markdown Any Decision Record** evolution) — a one-page document capturing context, decision, consequences for any irreversible choice.
- When it shines: Any decision that future-you will need to re-read in 6 months; supersede operations (with OpenSpec delta-spec per S12).
- When NOT to use: Easily-reversible decisions (don't ADR the colour of a button); decisions already captured in a PRD's Non-Goals section.
- Source: Michael Nygard 2011, https://github.com/joelparkerhenderson/architecture-decision-record; MADR: https://adr.github.io/madr/

### OWASP Top 10 2025

- One sentence: Industry-standard checklist of the ten most common web application security risks, refreshed annually.
- When it shines: Any security audit of a web-facing service; pre-launch security review.
- When NOT to use: Non-web threats (use STRIDE); AI-specific threats (use ASTRIDE).
- Source: https://owasp.org/Top10/

### STRIDE / ASTRIDE

- One sentence: Threat-modelling taxonomy — **Spoofing, Tampering, Repudiation, Information disclosure, Denial of service, Elevation of privilege** — with ASTRIDE adding AI-specific threats (Adversarial inputs, Model-theft, Training-data poisoning).
- When it shines: System-design security reviews where you need to reason about threats per data-flow boundary.
- When NOT to use: Code-level audits (use OWASP/CWE); compliance-driven work (use the actual framework).
- Source: Microsoft STRIDE https://learn.microsoft.com/en-us/azure/security/develop/threat-modeling-tool-threats; ASTRIDE https://arxiv.org/abs/2403.13309

### DORA Metrics

- One sentence: Four research-grounded delivery metrics — **deployment frequency, lead time, change failure rate, MTTR** — that correlate with high-performing engineering organisations.
- When it shines: Performance/process audits where you need a falsifiable baseline.
- When NOT to use: Single-feature work (DORA is org-level); pre-product teams (no deployments yet to measure).
- Source: Forsgren et al., *Accelerate* (2018); https://dora.dev

### SRE (Site Reliability Engineering)

- One sentence: Google-originated discipline that frames reliability as an **error budget** — a quantified amount of unreliability the team can spend on feature work.
- When it shines: Performance audits; incident-response prioritisation; arguing with PMs about "stability vs features".
- When NOT to use: Pre-product teams (no SLO to defend); throwaway internal tools.
- Source: Beyer, Jones, Petoff, Murphy, *Site Reliability Engineering* (2016); https://sre.google/books/

### 5 Whys

- One sentence: Toyota-originated root-cause technique — keep asking "why?" five times to walk from symptom to systemic cause.
- When it shines: Production bug RCA; incident post-mortems; any "why did this slip past review?" investigation.
- When NOT to use: Open-ended discovery (use Event Storming); design decisions (use FPF ADI).
- Source: Taiichi Ohno (Toyota Production System); https://en.wikipedia.org/wiki/Five_whys

### Fishbone (Ishikawa)

- One sentence: Cause-and-effect diagram that branches root causes into six standard categories — **Method, Machine, Material, Measurement, Mother-nature, Manpower**.
- When it shines: Tech-debt cleanup where you need to separate systemic from local causes; quality investigations.
- When NOT to use: Linear causal chains (5 Whys is faster); decisions (it's a diagnostic, not an evaluator).
- Source: Kaoru Ishikawa (1968); https://asq.org/quality-resources/fishbone

### A3 Problem Solving

- One sentence: Toyota one-page problem-statement template — **Background / Current state / Target state / Analysis / Countermeasures / Plan / Follow-up** — fits literally on A3 paper.
- When it shines: Tech-debt cleanup sprints; multi-team coordination where everyone needs to fit the problem in their head.
- When NOT to use: Trivial problems (overkill); discoveries (no target state yet).
- Source: John Shook, *Managing to Learn* (2008); https://www.lean.org/lexicon-terms/a3-thinking/

### Blameless post-mortem

- One sentence: Incident-review practice that separates **what happened** (a system fact) from **who did it** (a person), so the team learns instead of hides.
- When it shines: Every production incident, full stop.
- When NOT to use: Greenfield work; non-incident reviews (use BMAD adversarial review).
- Source: John Allspaw, https://www.etsy.com/codeascraft/blameless-postmortems/

### Mikado Method

- One sentence: Refactoring technique — start with the goal, hit the first compile/test failure, file it as a prerequisite, walk backward through prerequisites until you find a leaf-change that's safe to make, then unwind the tree.
- When it shines: Brownfield refactoring with deep coupling; "I want to change X but Y, Z, W also need to change first" situations.
- When NOT to use: Greenfield (no prerequisites yet); trivial single-file refactors (Mikado overhead exceeds change).
- Source: Daniel Brolund & Ola Ellnestam, *The Mikado Method* (2014); https://pragprog.com/titles/dlmikado/the-mikado-method/

### Jobs-To-Be-Done (JTBD)

- One sentence: Product discovery framing — users don't buy products, they **hire** them for **jobs** they need done in a specific context.
- When it shines: PDLC discovery; feature prioritisation; arguing with stakeholders about "what should we build".
- When NOT to use: Engineering-only decisions (no user context); incident response.
- Source: Clayton Christensen, https://hbr.org/2016/09/know-your-customers-jobs-to-be-done

### Lean Startup

- One sentence: Hypothesis-driven product methodology centred on the **Build-Measure-Learn** loop and the **Minimum Viable Product** concept.
- When it shines: Pre-product discovery; feature experiments where the cost of building the full feature exceeds the cost of learning.
- When NOT to use: Mature products with known users; safety-critical systems (you can't ship a "minimum viable" cardiac pacemaker).
- Source: Eric Ries, *The Lean Startup* (2011); http://theleanstartup.com

### Double Diamond

- One sentence: Design Council framing — two diamonds (**Discover → Define**, then **Develop → Deliver**) marking divergence-then-convergence at problem and solution levels.
- When it shines: Product discovery with a design team; cross-functional kickoffs where the team needs a shared vocabulary.
- When NOT to use: Engineering-internal decisions; tactical work.
- Source: UK Design Council, https://www.designcouncil.org.uk/our-resources/the-double-diamond/

### Hexagonal Architecture (Ports & Adapters)

- One sentence: Application-architecture style that isolates the **domain core** behind **ports** (interfaces) implemented by **adapters** (driving and driven).
- When it shines: New features inside an existing service where you want to keep the feature testable in isolation; ACL implementations.
- When NOT to use: CRUD apps where the domain is trivial; algorithmic libraries (no ports to define).
- Source: Alistair Cockburn (2005), https://alistair.cockburn.us/hexagonal-architecture/

### Clean Architecture

- One sentence: Robert Martin's layering rule — **dependencies point inward** toward the domain core, with frameworks at the outermost ring.
- When it shines: Refactoring where the team needs an unambiguous layering convention to fight knee-jerk dependencies.
- When NOT to use: Functional codebases (the layering doesn't map); small services (overkill).
- Source: Robert C. Martin, *Clean Architecture* (2017); https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html

### Incident Command System

- One sentence: Emergency-response framework — **Incident Commander, Operations Lead, Communications Lead, Scribe** — adapted from FEMA for technical outages.
- When it shines: Multi-team production incidents where uncoordinated swarming makes things worse.
- When NOT to use: Single-engineer hotfixes (the structure is overhead for one person).
- Source: FEMA ICS adapted by PagerDuty, https://response.pagerduty.com

---

## Agent index

Quick alphabetical lookup of every agent named in the 12 rows above. Each entry: **name** (source plugin) — Profile — one-line description.

| Agent | Plugin | Profile | One-liner |
|---|---|---|---|
| **adr-architect** | `agents-pro` | A | Creates full or light ADRs; auto-dispatches `c4-diagram` skill for ≥3-module decisions (Sprint Z9). |
| **architect-reviewer** | `agents-pro` | B | Audits architectural fitness of a draft against parent PRD/RFC; pre/post for refactors. |
| **artifact-author** | `agents-pro` | A | Generic Profile A creator for any artifact kind when no kind-specialist fits. |
| **artifact-maintainer** | `agents-pro` | D | Maintains existing artifacts in-place (typo fixes, link updates) without creating new ones. |
| **artifact-reviewer** | `agents-pro` | B | Generic Profile B adversarial reviewer; produces EVID with ≥1 finding per S11 BMAD. |
| **brief-intake** | `agents-pro` | A | Interviews user, produces structured Brief NOTE; canonical first step for greenfield + features. |
| **code-analyzer** | `agents-pro` | C | Read-only static analysis (complexity, coupling, dead code); precedes refactor decisions. |
| **code-reviewer** | `agents-core` | B | Line-level adversarial code review; mandatory Profile B EVID for any code-touching artifact. |
| **coder** | `agents-core` | C-coder | The only agent allowed to write source files; `isolation: worktree` for parallel safety. |
| **c4-diagram skill** | `fpl-skills` | N/A (skill, not agent) | Produces C4 L1+L2 Mermaid diagrams; auto-dispatched by `adr-architect` for ≥3-module ADRs. |
| **ddd-domain-expert** | `agents-pro` | A | Surfaces bounded contexts + ubiquitous language; primary for brownfield + complex-domain greenfield. |
| **debugger** | `agents-core` | C | Read-only debugger; pairs with `error-detective` on production bugs. |
| **platform-engineer** | `agents-pro` | C | Read-only infra investigator for live incidents; reads logs/metrics/deploy events, never mutates. (No `devops-troubleshooter` agent exists in marketplace — that role lives in `cicd-automation` / `incident-response` skill packs, not as a subagent.) |
| **discover** | `forgeplan-brownfield-pack` | A | 7-phase MCP brownfield discovery; canonical entry for any "legacy" trigger. |
| **error-detective** | `agents-core` | C | Read-only stack-trace + log analyser; first responder for production bugs. |
| **goal-planner** | `agents-pro` | A | Produces task DAG from PRD/RFC; precedes coder dispatch. |
| **guardian** | `agents-pro` | B-gate | Last reviewer before activation; renders binary PASS/CONCERNS/BLOCKER verdict. |
| **injection-analyst** | `agents-pro` | B | Profile B reviewer specialised in injection vulnerabilities (SQL, prompt, command). |
| **performance-engineer** | `agents-core` | B | Profile B perf reviewer; produces baseline + post-change benchmarks. |
| **pii-detector** | `agents-pro` | B | Profile B reviewer for PII exposure surfaces. |
| **research-analyst** | `agents-pro` | A | Produces NOTE artifacts synthesising external research, prior art, or codebase reconnaissance. |
| **security-expert** | `agents-pro` | B | Profile B adversarial security reviewer; STRIDE/OWASP/ASTRIDE coverage. |
| **specification** | `agents-sparc` | A | SPARC phase-1 specification authoring; produces PRD-shaped artifacts. |
| **architecture** | `agents-sparc` | A | SPARC phase-3 architecture authoring; produces RFC-shaped artifacts. |
| **system-dev** | `agents-pro` | B | Staff-level cross-Epic / long-horizon reviewer; pairs with guardian for system-wide go/no-go. |
| **tester** | `agents-core` | B | Profile B test-coverage reviewer; produces tester EVID with coverage % vs `min_test_coverage` gate. |

Notes:

- All Profile A/B/D agents enforce LR-8 lint (Sprint W): they must deny `Write`, `Edit`, `NotebookEdit` plus `forgeplan_activate` (and Profile B additionally denies `forgeplan_reason`, `forgeplan_claims`, `memory_retain`).
- `coder` is the only `C-coder` profile — `isolation: worktree` lets multiple coders run in parallel without stepping on each other.
- Skills (e.g. `c4-diagram`, `methodology-check`, `decision`, `supersede`) are invoked by agents but are not themselves agents — they don't appear in the canonical 19-agent forgeplan-aware list.

---

## Evidence quality bar

Per CLAUDE.md (Sprint Z6 + EPIC-001 S11 BMAD layer), every Profile B EVID must satisfy three rules. Smith verifies these before letting `guardian` render its gate verdict.

1. **A `## Findings` section MUST exist with ≥1 line item.** Zero findings is not acceptable — it reads identically to "the reviewer didn't look". If after an adversarial pass the reviewer genuinely sees no gap, the section must contain one line stating so **plus ≥2 sentences** explaining what was specifically checked and why no gap was found. Default expectation is ≥1 finding.

2. **Verdict must be one of `PASS`, `CONCERNS`, `BLOCKER`** (no soft "looks good", no qualified "PASS with caveats" — those are CONCERNS). The verdict tag governs the orchestrator's next move: `PASS` → activate, `CONCERNS` → dispatch fixer + re-review, `BLOCKER` → halt pipeline, artifact stays draft.

3. **Cited methodology link MUST be present in the EVID body** — either the methodology name + source URL (from the cards above), or the canonical short-form `EPIC-001 4-layer pipeline S11` for adversarial reviews. Methodology-less EVIDs are CONCERNS.

For Standard+ artifacts, smith additionally checks the S10 FPF ADI EVID (≥3 hypotheses, including "do nothing") and — for any ADR touching ≥3 modules — the C4 L1+L2 diagram file exists at `docs/c4/<ADR-NNN>.md` per Sprint Z9 PRD-060.

Tactical artifacts (row 5: trivial hotfix) are scoped to S12+S13 only; S10/S11 are marked N/A by `/methodology-check` and smith does not gate on them. The cost-of-process must scale with the risk-of-change — smith is explicit about which row is tactical so the team doesn't pay S10/S11 overhead twice.

---

## Routing map version

| Field | Value |
|---|---|
| Sprint | EPIC-002 Wave 1B |
| Catalog version at write | v1.71.0 |
| Forgeplan-aware agent count at write | 19 |
| Rows | 12 |
| Methodology cards | 27 |
| Agent index entries | 26 (25 agents + 1 skill cross-reference) |
| Last sync with CLAUDE.md | 2026-05-25 (Sprints Z6–Z10 + EPIC-001 4-layer pipeline) |
