# Changelog

All notable changes to the ForgePlan Marketplace will be documented in this file.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.18.1] - 2026-05-08

Documentation sync for v1.18.0 — brings README/METHODOLOGIES/USAGE-GUIDE/ARCHITECTURE/AUTORESEARCH-INTEGRATION docs in line with the new mappings shipped in v1.18.0. No code or mapping changes.

### Changed
- `forgeplan-brownfield-pack` v1.3.0 → **1.3.1** (patch — docs only):
  - `README.md` and `README-RU.md`: section "2 mappings" → "5 mappings"; lists all five (c4, ddd, madr, obsidian, autoresearch) with one-line descriptions each.
- `docs/METHODOLOGIES.md` and `-RU.md`: added per-methodology sections for **MADR** and **Obsidian** (alongside existing DDD and C4 entries). Quick lookup table extended with rows for MADR, Obsidian, plus an updated Autoresearch row mentioning the new ingest mapping.
- `docs/USAGE-GUIDE.md` and `-RU.md`: brownfield-pack section description now lists all five mappings by name instead of generic "Obsidian, MADR, ad-hoc markdown".
- `docs/ARCHITECTURE.md` and `-RU.md`: brownfield-pack capability row updated from "Mappings + playbooks for migrating legacy docs (Obsidian, MADR)" to "5 mappings (c4, ddd, madr, obsidian, autoresearch) + 12 extraction skills + 2 playbooks".
- `docs/AUTORESEARCH-INTEGRATION.md` and `-RU.md`: "See also" section now distinguishes the two directions — `autoresearch-hooks.md` (outbound: skill → autoresearch command) and `autoresearch-to-forge.yaml` (inbound: autoresearch outputs → forge artifacts).
- `marketplace.json`: catalog 1.18.0 → **1.18.1**; brownfield-pack entry 1.3.0 → 1.3.1.

### Notes
This patch closes the documentation gap from v1.18.0 — the mappings YAMLs were shipped, but the user-facing docs that point at them weren't updated in the same PR. No new files; only edits to existing docs.

## [1.18.0] - 2026-05-08

Three new brownfield ingestion mappings: MADR, Obsidian vaults, and autoresearch outputs. The `forgeplan-brownfield-pack` plugin now covers five upstream formats end-to-end (c4, ddd, madr, obsidian, autoresearch).

### Added
- `forgeplan-brownfield-pack` v1.2.0 → **1.3.0** (minor — three new mappings):
  - **`mappings/madr-to-forge.yaml`** (~110 lines) — MADR (Markdown Architectural Decision Records, https://adr.github.io/madr/) → forge `adr` kind. Supports MADR 3.x and 4.x. Status normalization (proposed → draft, accepted → active, rejected → deprecated, superseded → superseded). Supersession-link extraction (`superseded by ADR-NNNN` / `supersedes ADR-NNNN`). Heading synonyms for the variants between MADR 3 and 4 templates. Path patterns: `docs/adr/`, `docs/decisions/`, `doc/architecture/decisions/`, `adr/` plus opt-in via frontmatter `kind: adr`.
  - **`mappings/obsidian-to-forge.yaml`** (~190 lines) — Obsidian vault → forge artifacts. Detects vault by `.obsidian/` marker; excludes templates/, daily/, journal/. Four-tier signal priority: frontmatter `kind:` → tag (`#prd`, `#epic`, `#adr`, `#hypothesis`) → folder pattern (PARA / Johnny.Decimal) → default to Note. MOC files → Epic; Project notes → PRD; tagged decision notes → ADR (with delegation to `madr-to-forge` if MADR-shaped). Resolves `[[wikilinks]]` to `relates_to` edges (lazy — broken links warn rather than fail).
  - **`mappings/autoresearch-to-forge.yaml`** (~210 lines) — autoresearch (uditgoenka/autoresearch v2.x) outputs → forge artifacts. Companion to existing `integration/autoresearch-hooks.md` (which describes the inverse direction). Maps each of the 7 autoresearch modes to the right forge kind: `--mode=glossary` → glossary, `--mode=use-case` → use-case, `--mode=invariant` → invariant, `--mode=intent` → note, `--mode=triangulate` → hypothesis, `--template=gherkin` → scenario, `--mode=canonical` → spec. Journal dispatcher routes per-artifact entries from `.autoresearch/journal-*.json`. Preserves anti-herd flag, mirrors decay policy, and surfaces `extract_score` composite metric as a Note for trend tracking.

### Changed
- `forgeplan-brownfield-pack/.claude-plugin/plugin.json`: version 1.2.0 → 1.3.0; description "2 mappings (c4-to-forge, ddd-to-forge)" → "5 mappings (c4-to-forge, ddd-to-forge, madr-to-forge, obsidian-to-forge, autoresearch-to-forge)".
- `marketplace.json`: catalog 1.17.0 → **1.18.0**; brownfield-pack entry 1.2.0 → 1.3.0; description updated to mention all 5 mappings.

### Notes
All three mappings follow the established schema-v1.0 convention (same as `c4-to-forge.yaml` and `ddd-to-forge.yaml`): `schema_version`, `mapping_name`, `source_plugin`, `sources` (path/frontmatter/tag patterns), per-mapping `extract` rules with `body_sections`, `synthesized` stubs, `extract_links` for cross-artifact edges, `source_ref` for traceability, `universal_rules`, `compat_notes` for pre-EPIC-008 fallbacks, and realistic `example_counts`. Pre-EPIC-008 fallback chain unified: glossary→note, use-case→prd, invariant→spec, hypothesis→problem, scenario→note.

The brownfield-pack now has reasonable coverage of the formats teams actually keep their decisions and notes in: Architecture-as-Code (c4, ddd), Decision Records (madr), Knowledge Management (obsidian), and Research Pipelines (autoresearch). The remaining gaps are intentional — domain-specific formats (Confluence exports, Notion, Jira tickets) belong in separate add-on mappings rather than bloating the core pack.

## [1.17.0] - 2026-05-08

Final piece of the methodology coverage trio: `/riper` orchestrator + AI-SDLC mapping doc + upstream methodologies bibliography.

### Added
- `fpl-skills` v1.4.0 → **1.5.0** (minor — one new skill):
  - **`/riper`** (~250 lines) — RIPER methodology orchestrator (Research → Innovate → Plan → Execute → Review). Thin wrapper that walks a task through 5 phases by delegating to existing fpl-skills (`/research` → `/refine` or `/fpf-decompose` → `/rfc create` → `/sprint` or `/forge-cycle` → `/audit`). Tracks current phase visibly. Honest about being a vocabulary overlay on top of `/forge-cycle` — the two converge on the same forgeplan artifact graph; choose by team vocabulary preference.
- `docs/AI-SDLC-MAPPING.md` and `-RU.md` (~200 lines each) — phase-by-phase reference table mapping common AI-SDLC phases (Concept → Research → Design → Specification → Build → Test → Release → Operate → Maintain) onto our marketplace commands. Worked example for "add magic-link auth" through all 9 phases. Honest about what we don't cover (production deployment, observability dashboards, compliance audits — typically the CI/CD and APM layers above us).
- `docs/UPSTREAM-METHODOLOGIES.md` and `-RU.md` (~250 lines each) — bibliography of the upstream projects forgeplan integrates: Quint-code (DDR + Verification Gate), BMAD-METHOD (PRD validation + adversarial review), OpenSpec (artifact DAG + delta-specs), FPF (F-G-R + ADI + CL), Karpathy autoresearch (loop discipline), git-adr (Rust CLI reference), adr-tools (canonical ADR), ccpm (Claude Code patterns). For each: where the upstream lives, what forgeplan adopted, what forgeplan adapted, when to read it.

### Changed
- `plugin.json` (fpl-skills): skills array `20 → 21` entries (+riper, alphabetically inserted). Description updated to mention RIPER orchestrator. Version 1.4.0 → 1.5.0.
- `marketplace.json`: catalog 1.16.0 → **1.17.0**; fpl-skills entry 1.4.0 → 1.5.0; description updated.
- `docs/USAGE-GUIDE.md` and `-RU.md`: Quick Reference adds `/riper` row right after `/c4-diagram`.
- Root `README.md` and `README-RU.md`: Documentation block extended to 8 entries — added "AI-SDLC mapping" and "Upstream methodologies" rows.

### Notes
With this release, the methodology coverage story is complete:
- **Built into forgeplan CLI** — BMAD validate, OpenSpec DAG, FPF/ADI reason, DDR template, R_eff, Evidence Decay (documented in METHODOLOGIES)
- **Marketplace skills** — `/shape`, `/refine`, `/ddd-decompose`, `/c4-diagram`, `/forge-cycle`, `/sprint`, `/audit`, `/research`, `/diagnose` etc.
- **Vocabulary overlays** — `/riper` (RIPER terminology), AI-SDLC-MAPPING.md (AI-SDLC vocabulary)
- **External companions** — autoresearch integration documented (AUTORESEARCH-INTEGRATION)
- **Reference** — UPSTREAM-METHODOLOGIES bibliography

The user picking "RIPER" or "AI-SDLC" terminology no longer hits a "not in our ecosystem" wall — they get either a wrapper command (`/riper`) or a mapping table (AI-SDLC) that translates to our canonical workflow.

## [1.16.0] - 2026-05-08

Two new interactive design skills — top-down complement to the existing brownfield-pack extraction skills (which work bottom-up from code).

### Added
- `fpl-skills` v1.3.0 → **1.4.0** (minor — two new interactive skills):
  - **`/ddd-decompose`** (~280 lines) — interview-driven Domain-Driven Design decomposition. Walks through identifying bounded contexts, ubiquitous language per context, aggregates, domain events, integration map. Outputs context map (Markdown + Mermaid) plus, when forgeplan CLI is available, Epic + per-context PRDs + Spec for cross-context contracts. Pairs with `/fpf-decompose` (general decomposition without DDD framing) and the `ddd-domain-expert` agent in `agents-pro` (advisory).
  - **`/c4-diagram`** (~280 lines) — interactive C4 architecture diagram generator. Walks through L1 Context (system + actors), L2 Container (runtime units inside system), L3 Component (per-container detail, optional), L4 Code (rare). Outputs Mermaid diagrams plus written context per level. Maps cleanly to forgeplan via `c4-to-forge.yaml` from `forgeplan-brownfield-pack` — top-down design vs the brownfield bottom-up ingestion path.

### Changed
- `plugin.json` (fpl-skills): skills array `18 → 20` entries (+ddd-decompose, +c4-diagram). Description updated. Version 1.3.0 → 1.4.0.
- `marketplace.json`: catalog version 1.15.0 → **1.16.0**; fpl-skills entry version 1.3.0 → 1.4.0.
- `docs/USAGE-GUIDE.md` and `-RU.md`: Quick Reference adds `/ddd-decompose` and `/c4-diagram` rows in the fpl-skills section.

### Notes
The two new skills close a real gap. We had:
- Bottom-up (brownfield): `forgeplan-brownfield-pack` extraction skills work from existing code → produce DDD/C4-style artifacts
- Mappings only (forgeplan integration): `c4-to-forge.yaml` and `ddd-to-forge.yaml` ingest existing diagrams/contexts
- Advisory agent: `ddd-domain-expert` and `architect-reviewer` in `agents-pro`

What was missing — **top-down interactive design**. A new system needs DDD/C4 decomposition through structured questions, not by analysing code that doesn't exist yet. `/ddd-decompose` and `/c4-diagram` fill this. The interview pattern is consistent with `/shape` and `/refine` (one focused question per turn, surface contradictions immediately, cap output to a draft).

## [1.15.0] - 2026-05-08

Reframed `autoresearch` (the metric-driven loop plugin by Udit Goenka) from "external mention" to **recommended companion** with a proper integration guide. Earlier docs treated it as a distant reference; in reality it composes naturally with `/forge-cycle` and the brownfield extraction skills.

### Added
- `docs/AUTORESEARCH-INTEGRATION.md` and `-RU.md` (~280 lines each) — full integration guide covering the autoresearch v2.0.03 command set (`plan`, `debug`, `security`, `predict`, `reason`), three integration patterns (autoresearch as Build phase of `/forge-cycle`; autoresearch standalone → Note + Evidence; security audit → Evidence), brownfield mapping (which extraction skills delegate to which autoresearch command), setup instructions, decision matrix, anti-patterns. RU version in plain Russian.

### Changed
- `docs/METHODOLOGIES.md` and `-RU.md`: Autoresearch promoted from "External" section to a new "Recommended companion" section. Quick lookup table updated with link to the integration guide.
- `docs/PLAYBOOK.md` and `-RU.md`: new use-case "Metric-driven iteration (autoresearch + ForgePlan)" with three patterns showing how PRD success criteria become autoresearch metrics, results captured as CL3 Evidence with `evidence_type: measurement`.
- Root `README.md` and `README-RU.md`: Documentation block extended to 6 entries (added "Autoresearch integration" row).
- `forgeplan-brownfield-pack` v1.1.0 → **1.2.0** (patch — description refreshed to mention autoresearch integration; no skill changes).
- Marketplace catalog metadata.version 1.14.0 → **1.15.0**.

### Notes
The earlier framing in METHODOLOGIES called autoresearch "an external tool we don't implement". Technically true, but strategically misleading — the brownfield-pack `integration/autoresearch-hooks.md` already maps each of our 12 extraction skills to autoresearch commands, and autoresearch's loop pattern is exactly what `/forge-cycle` Build phase needs when a mechanical metric exists. This release surfaces that.

Reframing matters because users who read METHODOLOGIES decide what to install. "External, not in our ecosystem" → likely skip. "Recommended companion, here's how it composes" → likely try.

## [1.14.0] - 2026-05-08

Brownfield extraction pack ported from upstream forgeplan repo. The 12-skill methodology that's been ready in `/docs/brownfield-extraction-package/` is now installable.

### Added
- `forgeplan-brownfield-pack` v1.0.0 → **1.1.0** — full content port from `/Users/explosovebit/Work/ForgePlan/docs/brownfield-extraction-package/`:
  - **12 extraction skills** in `skills/`, each with Claude Code frontmatter + the original methodology body:
    `ubiquitous-language` (C1), `use-case-miner` (C2), `intent-inferrer` (C3), `invariant-detector` (C4), `causal-linker` (C5), `hypothesis-triangulator` (C6), `interview-packager` (C7), `scenario-writer` (C8), `kg-curator` (C9), `canonical-reproducer` (C10), `reproducibility-validator` (C11), `rag-packager` (C12).
  - **2 orchestration playbooks** in `playbooks/`: `extract-business-logic.md` (full sequence), `phase-transitions.md` (quality gates between phases).
  - **3 integration recipes** in `integration/`: `autoresearch-hooks.md`, `forgeplan-mcp-additions.md`, `rag-export-format.md`.
  - **6 templates** in `templates/`: glossary, use-case, hypothesis, scenario, invariant, domain-model.
  - **6 artifact-kind definitions** in `artifact-kinds/`.
  - **5 examples** in `examples/` from the TripSales reference project.
  - **4 methodology docs** in pack root: `METHODOLOGY.md`, `ARCHITECTURE.md`, `SKILLS-INVENTORY.md`, `GLOSSARY.md`.

### Changed
- `plugins/forgeplan-brownfield-pack/.claude-plugin/plugin.json`: skills array now lists all 12 (was empty); description rewritten to enumerate what's shipped; version 1.0.0 → 1.1.0; keywords updated (`extraction`, `factum-intent`, `domain-modeling`).
- `plugins/forgeplan-brownfield-pack/README.md` and `-RU.md`: full rewrite to reflect actual contents — sections for each skill category, two-tier methodology summary, typical workflow chain, when-to-use / when-not-to-use, companion plugins. RU version written in plain Russian (less anglicism, terms like "разведка", "уверенно выведено", "ограниченный контекст").
- Marketplace catalog: brownfield-pack description updated; metadata.version 1.13.0 → **1.14.0**.

### Notes
The pack alpha-status from v1.0.0 is now lifted to **production-ready for content**, but **playbook orchestration** still depends on forgeplan CLI v0.25+ runtime features (EPIC-007 / PRD-065 in upstream). Skills can be invoked individually now; full automated pipeline awaits the upstream playbook engine.

The two-tier extraction methodology (Factum vs Intent) is the conceptual core. Every intent claim must carry a confidence tag (verified ✅ / strong-inferred 🟢 / inferred 🟡 / speculation 🟠 / unknown ⬜). This separation is enforced by skill `03-intent-inferrer` and validated downstream by `06-hypothesis-triangulator`.

## [1.13.0] - 2026-05-08

Closes the lifecycle front-end gap (`/shape` skill) and adds two strategic docs (`PLAYBOOK`, `METHODOLOGIES`).

### Added
- `fpl-skills` v1.2.0 → **1.3.0** (minor — new skill + plugin description rework):
  - **New skill `/shape <idea>`** — interview-from-scratch that turns a fuzzy idea into a draft PRD via 8-12 focused questions. Pairs with `/refine` (which polishes existing plans). Forgeplan-aware: writes the draft as a real PRD via `forgeplan new prd` if the CLI is available; falls back to plain markdown otherwise.
- `docs/PLAYBOOK.md` and `-RU.md` — use-case matrix mapping situations ("empty project + idea", "brownfield migration", "night-run with full methodology", "interview-driven feature shaping", multi-session team work) to setup commands and workflows. RU version written in plain Russian, not English-translated.
- `docs/METHODOLOGIES.md` and `-RU.md` — clarifies what's built into the forgeplan CLI (BMAD via `forgeplan validate`, OpenSpec as artifact DAG, ADI in `forgeplan reason`, DDR template for ADRs, R_eff scoring, Evidence Decay, Verification Gate, Pareto Front, Two-tier Factum/Intent extraction for brownfield) vs what's available as separate plugins (SPARC, FPF interactive, Laws of UX) vs what's external or not implemented (Autoresearch, DDD modelling engine, C4 modelling engine, RIPER, AI-SDLC). Includes a quick lookup table.

### Changed
- Root `README.md` and `README-RU.md`: documentation block now includes 5 entries (Developer Journey, Playbook, Usage Guide, Architecture, Methodologies) — added Playbook and Methodologies. Skill count stat updated to 18.
- `docs/USAGE-GUIDE.md` and `-RU.md`: Quick Reference adds `/shape` row right before `/refine` (pairs them as front-end + polishing). See-also section adds Playbook and Methodologies.
- Marketplace catalog metadata.version 1.12.0 → **1.13.0**.

### Notes
The `/shape` skill closes a real onboarding gap: previously, users with raw ideas had to either write a PRD draft themselves first (then call `/refine`) or commit to `/forge-cycle` automation immediately. Now the front-end interview is explicit and bounded (8-12 questions, capped to avoid drift into refinement territory).

The METHODOLOGIES doc is corrective — earlier guides implied BMAD, OpenSpec, ADI etc. were "missing from the marketplace" but they're built into the forgeplan CLI itself. This doc surfaces them properly.

## [1.12.0] - 2026-05-07

Closes a real architectural gap — until now, `fpl-skills` skills (`/sprint`, `/audit`, `/research`, `/refine`, `/rfc`, `/diagnose`, `/build`, `/do`, `/restore`, `/briefing`) didn't mention `forgeplan` at all. Documentation promised they "delegate artifact lifecycle to forgeplan" but the skill bodies didn't. After this release, every workflow skill is **forgeplan-aware**: it recommends the right CLI calls (route, new prd/evidence/note/adr, link, score, activate) at the right times and points the user at `/forge-cycle` for full orchestration.

### Added
- `fpl-skills` v1.1.1 → **1.2.0** (minor — feature: cross-skill forgeplan integration):
  - **10 workflow skills now include a "Forgeplan integration" section**: `/sprint`, `/audit`, `/research`, `/refine`, `/rfc`, `/diagnose`, `/build`, `/do`, `/restore`, `/briefing`. Each section is tailored to what the skill produces — `/sprint` recommends `forgeplan route → new prd → new evidence → activate`; `/audit` writes Evidence; `/research` proposes Note vs PRD vs ADR depending on output; `/refine` adds ADR for surfaced decisions; `/rfc` prefers `forgeplan new rfc/adr` over plain markdown; `/diagnose` writes Evidence on verified fix; `/build` activates PRD on completion; `/do` mirrors `/autorun`'s probe-and-delegate pattern; `/restore` and `/briefing` add `forgeplan health`/`blocked`/`stale` to the recall block.
  - Each section ends with a **"Want this orchestrated for you?"** callout pointing at `/forge-cycle` (in `forgeplan-workflow`) — the one-command alternative that does all the recommended CLI calls automatically.
- `/autorun` integration block clarified: explicit table of "what happens with/without forgeplan-workflow installed".

### Changed
- `docs/DEVELOPER-JOURNEY.md` and `-RU.md`: new section **"`/forge-cycle` — first time"** (50+ lines each) — short walkthrough showing the 8-step cycle, decision matrix `/forge-cycle` vs `/sprint` vs `/autorun` vs `/do`, setup checklist, and integration with `@forgeplan/web` for visual exploration. Closes the onboarding gap for users who want the orchestrated path rather than manual coordination.
- Marketplace catalog metadata.version 1.11.1 → **1.12.0**.

### Notes
**This is a documentation-and-design change, not a behaviour change for the CLI side**. Skills now *recommend* the right `forgeplan` calls inline; they don't *invoke* them. This keeps `fpl-skills` simple (executors) and `forgeplan-workflow` differentiated (orchestrator). Users who want automation install `forgeplan-workflow` and get `/forge-cycle`; users who prefer manual control install just `fpl-skills` and follow the inline recommendations.

The architectural decision: **don't dilute `fpl-skills` skills with `forgeplan-workflow`'s logic**. Two plugins with overlapping orchestration would create dual-pathways and divergence. Instead, every skill points to the orchestrator as the canonical "automate this" answer.

## [1.11.1] - 2026-05-07

Automated migration helper.

### Added
- `fpl-skills` v1.1.0 → **1.1.1** (patch — new utility skill):
  - **New skill: `migrate-from-dev-toolkit`** (`plugins/fpl-skills/skills/migrate-from-dev-toolkit/SKILL.md`) — automates the dev-toolkit → fpl-skills migration. Probes installed plugins + forgeplan CLI, scans CLAUDE.md and project docs for `/dev-toolkit:*` references, offers Mode A (side-by-side, zero-risk default) or Mode B (clean cut), runs file-level sed-replacements with `.bak.fpl-migrate` backups, tells the user which `/plugin install`/`uninstall` commands to type, verifies post-state.
- Marketplace catalog metadata.version 1.11.0 → **1.11.1**.

### Changed
- `docs/MIGRATION-DEV-TOOLKIT-TO-FPL-SKILLS.md` and `-RU.md`: added `[!TIP]` block at the top recommending the new skill as the preferred automated path; the manual guide remains canonical for users who want to understand each step.
- `docs/USAGE-GUIDE.md` and `-RU.md`: Quick Reference table now includes `/migrate-from-dev-toolkit` in the fpl-skills section.
- `plugins/fpl-skills/README.md` and `-RU.md`: skill table extended with `/migrate-from-dev-toolkit` row (16 → 17 skills).

### Notes
The skill never invokes `/plugin install` or `/plugin uninstall` itself — those are host-level operations. It orchestrates the file-level work (CLAUDE.md updates, smoke-test prompts) and tells the user which `/plugin` commands to run. This keeps the migration auditable and reversible at every step.

`/dev-toolkit:report` references are deliberately NOT auto-substituted — there's no `/report` command in fpl-skills (the underlying `forge-report` skill is invoked by name). The skill annotates these references with a migration note for human review.

## [1.11.0] - 2026-05-07

Full feature parity with the legacy `dev-toolkit`. Migration guide can now claim "everything is ported".

### Added
- `fpl-skills` v1.0.3 → **1.1.0** (minor — feature additions):
  - **Ported `forge-report` skill** from dev-toolkit. Card-based structured report templates (build/audit/decision/incident/migration), section anchors, required sections, anti-patterns. 23 markdown files in `skills/forge-report/sections/`.
  - **Ported `dev-advisor` agent** from dev-toolkit. Background advisor that suggests `/audit` after multi-file changes, flags missing tests on new public functions, warns on security-sensitive edits.
  - **Ported safety hook** (`PreToolUse:Bash`) — blocks `git push --force`, `git reset --hard`, `rm -rf /`, `DROP TABLE`.
  - **Ported test-reminder hook** (`PostToolUse:Write|Edit|MultiEdit`) — suggests tests when new public functions are added.
  - **Ported `forge-report` auto-trigger hooks** — `forge-report-session-start.sh` (resets counter) and `forge-report-counter.sh` (PostToolUse:.* counter that triggers the skill when criteria met).
- Marketplace catalog metadata.version 1.10.3 → **1.11.0**.

### Changed
- Root README.md and README-RU.md: added a prominent **📚 Documentation** block as a table with all 8 user-facing docs (Developer Journey · Usage Guide · Architecture · Migration · Tracker Integration · Forgeplan Web · Changelog · Contributing). Stats line updated to "16 skills".
- `plugins/dev-toolkit/README.md` and `-RU.md`: deprecation callout updated — now states all dev-toolkit components are ported as of fpl-skills v1.1.0. Restored the missing RU deprecation block (was lost in PR #36 squash merge).
- `docs/MIGRATION-DEV-TOOLKIT-TO-FPL-SKILLS.md` and `-RU.md`: "What stays the same" table updated — `forge-report`, `dev-advisor`, hooks all marked "✅ ported in v1.1.0". Removed the "/dev-toolkit:report stays" caveat.
- `docs/USAGE-GUIDE.md` and `-RU.md`: legacy `/report` row reframed — the underlying `forge-report` skill is now in fpl-skills.
- `plugins/fpl-skills/README.md` and `-RU.md`: added rows for `forge-report` skill, `dev-advisor` agent, and the hook bundle.

### Notes
The migration-from-dev-toolkit story is now clean: install `fpl-skills`, get everything dev-toolkit had plus 13 more skills. No "feature gap" reasons to keep dev-toolkit installed.

When both plugins are installed, hooks fire twice (e.g. safety hook from both plugins). The hook scripts are independent — no collision but doubled output. Migration guide flags this and recommends Mode A (side-by-side) → uninstall dev-toolkit once verified, or Mode B (clean cut) for users comfortable with one transition.

A `migrate-from-dev-toolkit` skill that automates the migration steps is planned for v1.1.1 (next PR).

## [1.10.3] - 2026-05-07

Operational docs overhaul — migration guide, tracker recipes, forgeplan-web walkthrough, plus a corrected `.forgeplan/` setup contract.

### Added
- `docs/MIGRATION-DEV-TOOLKIT-TO-FPL-SKILLS.md` and `-RU.md` — migration guide for users moving from `dev-toolkit` to `fpl-skills`. Covers the side-by-side mode (zero-risk default), clean-cut mode, slash command namespacing (`/dev-toolkit:audit` vs `/fpl-skills:audit`), `CLAUDE.md` reference updates, rollback plan, and explicit "what this migration does NOT change".
- `docs/TRACKER-INTEGRATION.md` and `-RU.md` — per-tracker recipes for Orchestra, GitHub Issues, Linear, Jira, and local `TODO.md`. Each section provides `docs/agents/issue-tracker.md` template, MCP/CLI commands, `/briefing` integration notes, and triage label conventions.
- `docs/FORGEPLAN-WEB.md` and `-RU.md` — guide to `@forgeplan/web` (the browser viewer at [github.com/ForgePlan/forgeplan-web](https://github.com/ForgePlan/forgeplan-web)). When to install, time-travel slider, graph viewer, integration with marketplace plugins, setup checklist (which pieces of `.gitignore` contract are mandatory for full functionality).

### Changed
- `plugins/fpl-skills/skills/bootstrap/resources/guides/FORGEPLAN-SETUP.md` — rewritten with the authoritative `.gitignore` contract: detailed effects-of-mistakes tables (config.yaml leak, notes/ ignore, session.yaml tracked, state/ ignore, memory/ ignore, literal API key in config.yaml), single-config-file model (`secrets.yaml` does not exist; only `config.yaml`), default fallback chain for `api_key_env`, agent-session anti-patterns (4 grouping mistakes), the two "memory" concepts disambiguation (forgeplan `memory/` vs Hindsight MCP).
- `fpl-skills` v1.0.2 → 1.0.3 (patch — documentation accuracy + new resource references in plugin tree).

### Notes
The setup contract update reflects authoritative info: `memory/` is a first-class Forgeplan artifact kind (categories: fact / convention / constraint / observation / procedure) and **must be tracked**, not gitignored. There is no separate `secrets.yaml` — `config.yaml` uses `api_key_env: VAR_NAME` and the actual key lives in process env (12-factor pattern).

## [Unreleased]

### Added
- `docs/DEVELOPER-JOURNEY.md` and `DEVELOPER-JOURNEY-RU.md` — narrative onboarding ("From Zero to Shipping") with 4 persona Day 0 walkthroughs (Solo / Frontend / Architect / Team with Orchestra), worked example "add user authentication" threading through commands, and a Mermaid diagram of ecosystem composition.

### Changed
- `docs/USAGE-GUIDE.md` and `USAGE-GUIDE-RU.md` rewritten as a reference manual (vs the old "first guide" framing). New structure: Installation → Recommended stacks (by persona) → Quick reference (15 commands) → Daily workflow → Agent activation rules → Hook behavior → Plugin reference → Troubleshooting. fpl-skills positioned as flagship; /fpl-init featured throughout; dev-toolkit demoted to legacy.
- `docs/ARCHITECTURE.md` and `ARCHITECTURE-RU.md` Plugin Map updated: fpl-skills added as the "glue layer" flagship; dev-toolkit reframed as legacy (soft-deprecated). Recommended Stacks rewritten persona-first.

## [1.10.2] - 2026-05-07

### Added
- New plugin resource: `plugins/fpl-skills/skills/bootstrap/resources/guides/FORGEPLAN-SETUP.md` — canonical `.forgeplan/` setup contract (gitignore, secrets layout via 12-factor `api_key_env`, env var overrides, anti-patterns, pre-commit verification).
- `plugins/fpl-skills/README-RU.md` — Russian mirror of the plugin README, aligned with marketplace bilingual convention.

### Changed
- `fpl-skills` v1.0.1 → 1.0.2: corrected `.forgeplan/` storage layout in `CLAUDE.md.template` (config.yaml is tracked but uses `api_key_env`; canonical .gitignore includes logs/, .lock, session.yaml, trash/, discovery/, .env; memory/ and state/*.yaml clarified as tracked artifact dirs).
- `plugins/fpl-skills/README.md` (67 → 139 lines) — aligned with canonical marketplace plugin README structure (tagline → Quick Start → Usage Examples → What's Included → Lifecycle integration → Companion plugins → Resource guides → Credits → License).
- Root `README.md` and `README-RU.md`: stats updated to 12 plugins / 15 commands / 5 KBs; "Where to Start?" matrix recommends fpl-skills as the flagship for forgeplan users; dev-toolkit moved down with `[!CAUTION]` deprecation callout; fpl-skills entry added FIRST in Available Plugins.

### Notes
This release addresses real-world feedback from smoke-testing `/fpl-init` on a fresh project. The earlier v1.0.1 template was inaccurate about secrets layout (claimed config.yaml was untracked); v1.0.2 corrects this and ships the full setup contract as a reference doc.

## [1.10.1] - 2026-05-07

### Added
- `plugins/fpl-skills/skills/fpl-init/SKILL.md` step 7 mandates literal template rendering (Read the file, abort-if-missing, no improvising, no reordering of sections).
- `plugins/fpl-skills/skills/bootstrap/resources/templates/CLAUDE.md.template` enriched 170 → 447 lines following the U-curve attention layout from `CLAUDE-MD-GUIDE.ru.md`.

### Changed
- `fpl-skills` v1.0.0 → 1.0.1: fix for `/fpl-init` agent that was improvising thin (~60-line) CLAUDE.md instead of rendering the full template. New sections added: Routing depth table, Artifact ID rules (slug/predicted/assigned), EvidencePack structured fields, Lifecycle commands, Standard flow example, Multi-agent dispatch/claim/release, Validator section aliases, Permission zones (🟢/🟡/🔴), Agent teams listing the 5 packs, Unified workflow (Forgeplan × Tracker × Memory).

### Notes
The verbosity of the template is load-bearing — primacy/reference/recency zones need population for U-curve attention. Earlier "thin" template silently stripped guard rails.

## [1.10.0] - 2026-05-07

### Added
- New plugin: `fpl-skills` v1.0.0 — flagship workflow plugin bundling 15 engineering skills (research, refine, sprint, audit, diagnose, autorun + bootstrap, /fpl-init, restore, briefing, build, do, rfc, setup, team) on top of forgeplan's artifact lifecycle.
- `/fpl-init` skill — one-command project bootstrap that probes forgeplan CLI, runs forgeplan init, merges .mcp.json and .claude/settings.json, then chains /bootstrap (universal CLAUDE.md template with stack detection) and /setup (docs/agents wizard).
- `plugins/fpl-skills/GETTING-STARTED.md` — human-readable bootstrap walkthrough.
- SessionStart hook in fpl-skills surfacing context-aware next-step hints (e.g. "Run /fpl-init" for fresh repos).

### Changed
- `dev-toolkit` v1.6.1 → 1.6.2: marked `deprecated: true`, `supersededBy: fpl-skills`. README opens with `[!CAUTION]` deprecation callout pointing to fpl-skills. Soft-sunset; existing installs continue to work. Hard removal deferred to catalog v2.0 (ADR-003 in `.forgeplan/adrs/`).
- Marketplace catalog metadata updated to mirror dev-toolkit deprecation flags on the catalog entry.

### Notes
First major catalog reshape since v1.6.0 (Agent Army). fpl-skills enters as the canonical entry point for forgeplan users. dev-toolkit kept in catalog for backward compatibility — no forced migration.

## [1.8.0] - 2026-04-26

### Added
- New plugin: `forgeplan-brownfield-pack` v1.0.0 — orchestrator pack for brownfield migrations. Composes existing marketplace plugins (`c4-architecture`, `autoresearch`, `ddd-expert`, `feature-dev`) with forgeplan's ingest engine via mapping YAMLs and playbook recipes (per ADR-009).

### Notes
Implements the orchestrator model: forgeplan does not re-implement extraction. Mapping layer (c4-to-forge) validated at CL3 on Forgeplan repo (2026-04-20).

## [1.7.0] - 2026-04-28

Aligned `forgeplan-workflow` with Forgeplan v0.25.0 (PRD-071 unified hint contract). All plugins bumped to v1.5.0, marketplace catalog to v1.7.0.

### Added

- `forgeplan-workflow`: new skill section `06-output-hints/agent-protocol.md` — full agent reading protocol for the 5-rule hint contract (Next/Or/Wait/Done/Fix markers)
- `forgeplan-workflow`: new prelude step "Reading Forgeplan Output" in `/forge-cycle` command — instructs the agent to read contract markers after every command
- `forgeplan-workflow`: new behavior #5 "Hint Contract Awareness" in `forge-advisor` agent — gently reminds when user/agent ignores `Next:`/`Fix:` markers (existing SPARC behavior renumbered to #6)

### Changed

- `forgeplan-workflow`: bumped to v1.5.0
- Marketplace catalog: bumped to v1.7.0
- `forgeplan-methodology` SKILL: Section router updated with new "hint protocol" topic; new top-level section "Hint Protocol" added
- README.md + README-RU.md: feature mention of v1.5.0 hint contract awareness

### Notes

Without v1.5.0, users installing `forgeplan-workflow` get an agent that does NOT read the new hint markers — wastes Forgeplan v0.25.0's contract work. v1.5.0 closes the distribution gap.

Compatibility:
- Requires Forgeplan binary >= v0.25.0 for full benefit (older versions still work but agent will not see contract markers)
- Backward compat: existing `/forge-cycle`, `/forge-audit`, advisor behaviors unchanged

## [1.6.0] - 2026-04-04

### Added
- Agent Army: 55 agents across 5 packs (agents-core, agents-domain, agents-pro, agents-github, agents-sparc)
- SPARC development methodology integration with /sprint Deep tasks
- ARCHITECTURE.md and ARCHITECTURE-RU.md documentation (4 Systems, 4 Layers)
- Bilingual architecture docs with cross-links

### Fixed
- Duplicate sections in USAGE-GUIDE.md (Advisor Agents, Agent Packs, How Agents Work appeared twice)
- README.md Quick Start updated with step-by-step flow
- Added "Where to Start?" role-based guide to README.md
- Architecture link added to README header stats

## [1.4.0] - 2026-04-04

### Added
- plugin.json v2 schema support
- Collision detection for overlapping plugin commands

### Changed
- Marketplace catalog updated with v2 schema fields

## [1.3.1] - 2026-04-04

### Changed
- USAGE-GUIDE.md expanded with Advisor Agents, Agent Packs, How Agents Work, SPARC Methodology sections
- USAGE-GUIDE-RU.md expanded with matching Russian translations

### Fixed
- Small formatting fixes in usage guides

## [1.3.0] - 2026-04-04

### Added
- CHANGELOG.md for tracking marketplace changes
- hooks.json schema documentation in CONTRIBUTING.md
- Mandatory PR workflow rules in CLAUDE.md
- Version bumping policy in CLAUDE.md

### Changed
- CONTRIBUTING.md: added hooks.json schema reference and examples

## [1.2.0] - 2026-04-04

### Fixed
- Python injection vulnerability in validate-all-plugins.sh and CI workflow (use sys.argv)
- Safety hooks fail-open when jq absent (added python3 fallback, fail-closed)
- Incomplete rm -rf patterns in safety hooks (broadened regex)
- set -euo pipefail crash in forge-safety-hook.sh (removed -e)
- WARN on missing required fields changed to FAIL with error counting
- Unbound variable $1 in validate script
- Install commands in 6 README files (3 plugins x EN+RU)
- GitHub org URL casing in forgeplan-workflow READMEs

### Changed
- Pinned GitHub Actions to SHA (actions/checkout@11bd719...)
- Added version field assertion in CI
- Orchestra unified-workflow sections moved to sections/ subdirectory
- pre-code-check.sh: matcher narrowed to Write-only, added 5-minute cache
- FPF update-fpf.sh: added submodule SHA integrity verification
- All plugins bumped to v1.2.0, marketplace catalog to v1.3.0
- laws-of-ux plugin.json: added Svelte to description

## [1.1.2] - 2026-04-03

### Changed
- forgeplan-orchestra bumped to v1.1.2 (milestone approach + sync)

## [1.1.1] - 2026-04-03

### Fixed
- Hook scripts: sanitize inputs, scope DROP rule, add explicit exit 0
- All prompt hooks replaced with command hooks (silent when not matching)

### Changed
- All plugins bumped to v1.1.0-1.1.1

## [1.0.0] - 2026-04-03

### Added
- Initial marketplace release with 5 plugins
- laws-of-ux: 30 UX laws, 9 code patterns, 2 commands, 1 agent, 1 hook
- dev-toolkit: 3 commands (audit, sprint, recall), 1 agent, 2 hooks
- forgeplan-workflow: 2 commands (forge-cycle, forge-audit), 1 agent, 2 hooks
- fpf: 4 commands, 1 agent, 224 FPF spec sections + 4 applied patterns
- forgeplan-orchestra: 2 commands (sync, session), 1 agent, 1 hook
- Validation script and CI workflow
- CONTRIBUTING.md with plugin submission guidelines
- Usage Guide (EN + RU)
