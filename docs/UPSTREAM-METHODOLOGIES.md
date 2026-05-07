[English](UPSTREAM-METHODOLOGIES.md) | [Русский](UPSTREAM-METHODOLOGIES-RU.md)

# Upstream methodologies — sources we integrate

Pointers to the upstream projects whose methodologies forgeplan and the marketplace integrate. Use this when you want to read the **original spec** of something we already enforce, or when you need to cite a source for an audit.

> **Companion to** [METHODOLOGIES.md](METHODOLOGIES.md). That doc explains *what's built into our ecosystem and how to use it*. This doc is the **bibliography** — where the methodology comes from and what we adopted vs adapted.

---

## Quint-code

**Source**: internal ForgePlan reference — see `sources/Quint-code/` in the [forgeplan repo](https://github.com/ForgePlan/forgeplan).

**What forgeplan inherits**:
- Decision engine architecture (artifact lifecycle, validation, scoring)
- **DDR** (Detailed Decision Record) — extended ADR template: Problem Frame → Decision → Rationale → Consequences, plus invariants, rollback plan, valid_until
- **Verification Gate** — the 5-point check before closing a decision (deductive consequences / counter-argument / self-evidence / tail failures / WLNK)
- **Stepping Stone** flag in SolutionPortfolio

**What's unique to forgeplan**: integration with R_eff scoring + Evidence Decay + LanceDB-backed semantic search.

**Read it when**: writing a high-stakes ADR and you want the full DDR template, or designing a new decision-tracking workflow.

---

## BMAD-METHOD

**Source**: see `sources/BMAD-METHOD/` in the forgeplan repo. Originally an external project documenting business / maintenance / architecture / design recursive task decomposition.

**What forgeplan inherits**:
- 13-step PRD workflow validation (used by `forgeplan validate`)
- Adversarial review pattern: **a reviewer MUST find at least one problem; zero findings means the review wasn't thorough enough**
- Quick Flow vs Full Path — depth-adaptive validation rules
- Agent specialisation — different reviewer roles per artifact kind

**What's unique to forgeplan**: tied into the artifact graph + R_eff. BMAD validation runs as a quality gate before activation.

**Read it when**: you're authoring a new artifact kind and need the validation contract; or designing a custom validate rule.

---

## OpenSpec

**Source**: see `sources/OpenSpec/` (originally a TypeScript project for artifact pipelines).

**What forgeplan inherits**:
- **Artifact DAG** — directed acyclic graph of artifacts (Proposal → Specs → Design → Tasks); each artifact knows its parents and children
- **Delta-specs** — describe ONLY changes (ADDED/MODIFIED/REMOVED) instead of full rewrites for each iteration; intended for brownfield where a full spec is excessive
- Custom schemas per artifact kind
- Lifecycle commands (`supersede`, `deprecate`) operate on the DAG

**What's unique to forgeplan**: combined with R_eff scoring + LanceDB semantic search across the DAG.

**Read it when**: working with delta-specs (brownfield) or designing a new artifact kind whose schema differs from existing kinds.

---

## FPF — First Principles Framework

**Source**: [github.com/ailev/FPF](https://github.com/ailev/FPF) by Anatoly Levenchuk. 224 specification sections covering decomposition, evaluation, reasoning.

**What forgeplan inherits**:
- **F-G-R Trust Calculus** — three axes for evaluating knowledge quality (Formality / Granularity / Reliability)
- **ADI cycle** — Abduction → Deduction → Induction. Used by `forgeplan reason` for hypothesis generation (Deep+ depth requires it before activation)
- **Pareto Front** + **Stepping Stone** in SolutionPortfolio
- **CL** (Congruence Level) — 4 levels for how well evidence transfers between contexts (CL3 same → CL0 opposing); penalties applied to R_eff

**What's separate** (in our marketplace): the [`fpf` plugin](../plugins/fpf/) gives interactive `/fpf-decompose`, `/fpf-evaluate`, `/fpf-reason`, `/fpf-lookup` commands — independent of the lifecycle.

**Read it when**: you're new to the framework and want the original spec; or doing structural decomposition where the methodology terms matter (bounded contexts, F-G-R, ADI).

---

## Karpathy's autoresearch

**Source**: [github.com/karpathy/autoresearch](https://github.com/karpathy/autoresearch) — original concept from Andrej Karpathy.

**What we use**:
- Goal-directed loop pattern: Modify → Verify → Keep/Discard → Repeat
- Mechanical metric as the loop's signal (no metric → no loop)
- Compounding gains via constraint + automation

**Implementation**: NOT in our marketplace directly. The implementation lives in [`uditgoenka/autoresearch`](https://github.com/uditgoenka/autoresearch) — a Claude Code (and OpenCode/Codex) skill plugin in a separate marketplace. We document the integration in [AUTORESEARCH-INTEGRATION.md](AUTORESEARCH-INTEGRATION.md).

**Read it when**: you want to understand the loop discipline before installing the implementation; or designing a custom verify command.

---

## git-adr

**Source**: [git-adr](https://github.com/manuel-uberti/git-adr) — Rust CLI for ADR management.

**What forgeplan inherits**:
- Rust CLI architecture as the reference for `forgeplan` CLI
- Markdown-as-source-of-truth (not database-as-source)
- Git history as ADR history (each ADR is a git-tracked file)

**What's unique to forgeplan**: extends the model from ADR-only to a full artifact graph (PRD/RFC/ADR/Spec/Evidence/Note/etc.) with semantic search and R_eff scoring.

**Read it when**: you want a minimal ADR-only tool reference, or comparing forgeplan's CLI design choices.

---

## ccpm — Claude Code Project Management

**Source**: see `sources/ccpm/` in the forgeplan repo. Originally a markdown-based project management methodology for Claude Code.

**What forgeplan inherits**:
- Patterns for organising long-running Claude Code work
- CLAUDE.md as project memory
- Skill organisation conventions

**What's unique to forgeplan**: extended into a full lifecycle (CLAUDE.md becomes one input among many; skills delegate to forgeplan CLI for artifact lifecycle).

**Read it when**: you're authoring CLAUDE.md best-practices or designing a new skill plugin.

---

## adr-tools

**Source**: [npryce/adr-tools](https://github.com/npryce/adr-tools) — Bash CLI, the original ADR tool by Nat Pryce.

**What forgeplan inherits**:
- ADR file naming convention (`NNN-kebab-title.md`)
- ADR template (Status / Context / Decision / Consequences)
- The ADR concept itself

**What's unique to forgeplan**: Rust + LanceDB instead of Bash + filesystem; lifecycle states beyond Status (`draft → active → superseded/deprecated/stale`); typed link relationships.

**Read it when**: you want the canonical ADR concept reference, or designing a Bash-friendly fallback workflow.

---

## How forgeplan composes them

```
Forgeplan formula (from VISION.md):

  Quint-code  (decision engine + DDR + Verification Gate)
+ BMAD        (PRD workflow + adversarial review)
+ OpenSpec    (artifact DAG + delta-specs)
+ FPF         (F-G-R + ADI + CL + Pareto Front + Stepping Stone)
+ git-adr     (Rust CLI + markdown source)
+ adr-tools   (ADR concept + naming)
+ ccpm        (Claude Code patterns)
+ LanceDB     (vector search)
+ Tauri       (planned desktop)
```

Forgeplan doesn't reimplement any one of these — it composes their best ideas into a single CLI + artifact graph + scoring system.

---

## Reading order recommendation

If you want to deeply understand the foundation:

1. **adr-tools** — the simplest: just ADRs, just markdown. 30 minutes.
2. **git-adr** — same idea, Rust implementation. 30 minutes.
3. **BMAD** — adds workflow validation on top of artifacts. 2 hours.
4. **OpenSpec** — artifact DAG + delta-specs. 2 hours.
5. **FPF** — the reasoning framework underneath everything. 4-6 hours (it's 224 sections).
6. **Quint-code** — the decision engine that pulls it together. 2 hours.
7. **Karpathy's autoresearch** — the loop discipline added on top. 1 hour.

If you only want what forgeplan adopts (without reading upstream): see [METHODOLOGIES.md](METHODOLOGIES.md) — that's the synthesis.

---

## See also

- [METHODOLOGIES.md](METHODOLOGIES.md) — what's built into forgeplan vs external (synthesis view)
- [AI-SDLC-MAPPING.md](AI-SDLC-MAPPING.md) — phase mapping for AI-SDLC vocabulary
- [AUTORESEARCH-INTEGRATION.md](AUTORESEARCH-INTEGRATION.md) — combining Karpathy-style loops with forgeplan
- ForgePlan repo: [`docs/methodology/GLOSSARY.md`](https://github.com/ForgePlan/forgeplan/blob/dev/docs/methodology/GLOSSARY.md) — full glossary
- ForgePlan repo: `VISION.md` — the formula above with rationale
