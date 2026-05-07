[English](README.md) | [Русский](README-RU.md)

# forgeplan-brownfield-pack

> Turn a legacy codebase plus its accumulated documentation into a structured forgeplan graph — with explicit confidence labels for every business claim.

A Claude Code marketplace pack for **brownfield extraction**: take inherited code, Obsidian vaults, MADR ADRs, Confluence dumps, etc., and produce a forgeplan artifact graph with PRDs, RFCs, ADRs, and Evidence — all backed by traceable sources and confidence tags.

> [!WARNING]
> Requires `forgeplan` CLI v0.25+ and the playbook runtime (EPIC-007 / PRD-065 in forgeplan upstream). The skill content ships now; some playbook orchestration depends on forgeplan CLI features still rolling out.

## Quick Start

```bash
/plugin install forgeplan-brownfield-pack@ForgePlan-marketplace
/reload-plugins
```

## What's inside

### 12 extraction skills (`skills/`)

| Skill | C# | Purpose |
|---|---|---|
| `ubiquitous-language` | C1 | Build the domain glossary from code + comments + DB columns + queue names |
| `use-case-miner` | C2 | Find user-facing scenarios in the code |
| `intent-inferrer` | C3 | Generate 3+ hypotheses for *why* code is shaped a certain way (ADI abduction) |
| `invariant-detector` | C4 | Detect rules that always hold (validation logic, branch guards) |
| `causal-linker` | C5 | Connect scenarios → invariants → use-cases — the *why-chain* |
| `hypothesis-triangulator` | C6 | Triangulate competing hypotheses with evidence (ADI deduction → induction) |
| `interview-packager` | C7 | Package open questions for a domain owner — minimum-cost interview |
| `scenario-writer` | C8 | Write Given/When/Then scenarios from extracted use-cases |
| `kg-curator` | C9 | Curate the knowledge graph — add cross-links, deduplicate, retire stale items |
| `canonical-reproducer` | C10 | Reproduce a key flow in a clean environment to validate extraction |
| `reproducibility-validator` | C11 | Verify the canonical reproduction matches reality |
| `rag-packager` | C12 | Package the result as a RAG-ready dataset |

### 2 orchestration playbooks (`playbooks/`)

- `extract-business-logic.md` — full extraction sequence: discovery → Factum extraction → Intent inference → triangulation → reproduction → packaging
- `phase-transitions.md` — when to advance from one phase to the next; quality gates between phases

### 3 integration recipes (`integration/`)

- `autoresearch-hooks.md` — wire the external `autoresearch@anthropic-marketplace` plugin into the brownfield flow
- `forgeplan-mcp-additions.md` — additions to forgeplan MCP for brownfield-specific operations
- `rag-export-format.md` — output format for the RAG packager

### 2 mappings (`mappings/`)

- `c4-to-forge.yaml` — C4 Context/Container/Component → forgeplan Epic + PRDs + Notes (validated CL3 on Forgeplan repo, 2026-04-20)
- `ddd-to-forge.yaml` — DDD bounded-context map → Epic + PRDs + Spec

### Templates and examples

- `templates/` — frontmatter and structure for each artifact kind (glossary, use-case, hypothesis, scenario, invariant, domain-model)
- `examples/` — real samples from the TripSales project (glossary, use-case, scenario, canonical orders extraction)
- `artifact-kinds/` — definitions for each brownfield-specific artifact kind

### Methodology docs (root)

- `METHODOLOGY.md` — two-tier Factum vs Intent extraction with confidence taxonomy
- `ARCHITECTURE.md` — how the extraction skills compose
- `SKILLS-INVENTORY.md` — quick map of skill numbers (C1-C12) to skill names
- `GLOSSARY.md` — terms used by the pack

## Two-tier extraction at a glance

The methodology distinguishes:

- **Tier 1 — Factum**: what the code actually does, provable by reading. Confidence 100%, verifiable via re-grep. Examples: ENUM values, conditional branches, return shapes.
- **Tier 2 — Intent**: why the business chose this implementation. Variable confidence — every claim tagged: `verified` ✅ / `strong-inferred` 🟢 / `inferred` 🟡 / `speculation` 🟠 / `unknown` ⬜.

This separation prevents the most common failure: presenting hypotheses as facts.

## Workflow

```
forgeplan init                                  # if not already done
# Run a brownfield discovery pass (Discover Agent in agents/discover/)

# Then chain extraction skills (typical order):
ubiquitous-language     → docs/glossary.md
use-case-miner          → docs/use-cases/*.md
intent-inferrer         → docs/hypotheses/*.md
invariant-detector      → docs/invariants/*.md
causal-linker           → cross-references in the knowledge graph
hypothesis-triangulator → resolves which hypotheses survive evidence checks
interview-packager      → packs open questions for a domain owner
scenario-writer         → docs/scenarios/*.md (Given/When/Then)
kg-curator              → cleans up the graph
canonical-reproducer    → reproduces a key flow
reproducibility-validator → confirms reproduction matches reality
rag-packager            → packages everything for RAG retrieval

# Output: forgeplan graph populated with PRDs, RFCs, ADRs, Evidence
```

## When to use this pack

- Inherited a legacy codebase with no internal documentation.
- Have a pile of legacy docs (Obsidian, MADR, Confluence) and want them in a structured forgeplan graph.
- Need to extract business logic before a major rewrite.
- Need a RAG dataset of business knowledge derived from existing code.

## When NOT to use this pack

- Greenfield project — use [`fpl-skills`](../fpl-skills/README.md) `/fpl-init` and `/forge-cycle` instead.
- Code is already well-documented — extraction is overhead, just curate what you have.
- You only need static documentation (Obsidian, Confluence) — this pack produces a forgeplan graph specifically.

## Companion plugins

| Plugin | Why pair it |
|---|---|
| [`fpl-skills`](../fpl-skills/README.md) | Required — provides `/fpl-init`, `/refine`, `/audit`, the lifecycle skills you'll use after extraction |
| [`forgeplan-workflow`](../forgeplan-workflow/README.md) | Required for `/forge-cycle` — used during canonical reproduction phase |
| [`agents-pro`](../agents-pro/README.md) | `ddd-domain-expert` agent helps with bounded-context modelling |
| External: [`autoresearch@anthropic-marketplace`](https://github.com/anthropic) | If you have access — automates parts of the discovery phase |

## See also

- [`docs/PLAYBOOK.md`](../../docs/PLAYBOOK.md) — Use-case 4 (Brownfield migration)
- [`docs/METHODOLOGIES.md`](../../docs/METHODOLOGIES.md) — Two-tier extraction methodology entry
- [`METHODOLOGY.md`](METHODOLOGY.md) — full Factum vs Intent specification (in this pack)
- [`SKILLS-INVENTORY.md`](SKILLS-INVENTORY.md) — quick C1-C12 reference

## License

MIT
