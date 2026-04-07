# Discover Agent

**Brownfield codebase onboarding for ForgePlan** — structured analysis of existing projects with multi-pass discovery, team-based deepening, and tiered source priority.

## Problem

When ForgePlan is installed on an existing (brownfield) project, AI agents tend to:
- Start with `docs/` and build knowledge from documentation instead of code
- Build narratives around a single README or architecture document
- Miss actual code structure, patterns, and architectural decisions
- Produce artifacts that reflect documentation (potentially outdated) rather than reality
- Fail to scale for large projects (500K+ LOC) — try to read everything in one pass

**Discover solves this** by enforcing a strict protocol: code first, docs last, multi-pass for depth.

## How It Works

### Three Modes

```
/discover           → Quick scan (~15-30 min, single agent)
/discover --deep    → Deep analysis (~1-2 hours, team of agents)
/discover --full    → Complete knowledge base (~2-4 hours, synthesis + gaps)
```

| Mode | Best For | What Happens |
|------|----------|-------------|
| **default** | Projects <100K LOC | Single agent, 4 layers sequentially |
| **--deep** | Projects 100K-2M LOC | Orchestrator + team: Layer 1 self, Layers 2-3 parallel agents, then deepen each artifact |
| **--full** | 2M+ LOC or critical systems | Deep + cross-reference synthesis, gap analysis, impact mapping |

### Multi-Pass Strategy

```
┌─────────────────────────────────────────────────────────────────────┐
│ PASS 1: DISCOVERY (all modes)                                       │
│                                                                     │
│  Layer 1: BIRD'S EYE (10 min)                                      │
│    Manifests → File tree → Data stores → Infra → Git               │
│    Output: PRD "Project Overview" with module list                  │
│                                                                     │
│  Layer 2: MODULE DEEP DIVE (5-10 min per module)                    │
│    API surface → Types → Dependencies → DB usage → Tests → Git     │
│    Output: RFC + Spec per module                                    │
│                                                                     │
│  Layer 3: CROSS-CUTTING (15 min)                                    │
│    DB schema → Auth → Errors → Config → Integrations → Security    │
│    Output: RFC (DB, Auth) + Problem (security) + Spec (APIs)       │
│                                                                     │
│  Layer 4: LEGACY DOCS (5 min — ALWAYS LAST, can be skipped)        │
│    Scan docs/ → Cross-reference with code → Tag contradictions     │
│    Output: Notes tagged [legacy-doc]                                │
├─────────────────────────────────────────────────────────────────────┤
│ PASS 2: DEEPENING (--deep and --full)                               │
│                                                                     │
│  For EACH major artifact from Pass 1, spawn a sub-agent:           │
│    RFC  → Read ALL files in module, document every function         │
│    Spec → Read all handlers, complete request/response schemas      │
│    Problem → git blame, trace root cause, propose fix               │
│    Evidence → Read all tests, count assertions, map coverage        │
│                                                                     │
│  Output: Updated artifacts with full details + child Notes          │
├─────────────────────────────────────────────────────────────────────┤
│ PASS 3: SYNTHESIS (--full only)                                     │
│                                                                     │
│  3.1 Dependency graph — who calls whom, circular deps               │
│  3.2 Gap analysis — undocumented modules, missing specs             │
│  3.3 Contradiction check — cross-reference all artifacts            │
│  3.4 Impact analysis — blast radius per module, risk ranking        │
│  3.5 Health check — forgeplan health, completeness score            │
│                                                                     │
│  Output: Epic "Project Knowledge Base" with full system map         │
└─────────────────────────────────────────────────────────────────────┘
```

### Source Tier Priority

Not all sources are equal. The agent follows strict trust tiers:

| Tier | Source | Trust Level | Example |
|------|--------|-------------|---------|
| **T1** | Code, git, manifests, DB schemas | CL3 — Highest | `package.json`, `src/`, `git log` |
| **T2** | Tests, JSDoc, CI configs, type definitions | CL2 — Medium | `__tests__/`, `.github/workflows/` |
| **T3** | docs/, README, CHANGELOG, wiki, ADRs | CL1 — Lowest | `docs/architecture.md`, `README.md` |

**Rule**: If documentation says X but code does Y — **code wins**. The agent creates a Problem artifact documenting the contradiction.

## Prerequisites

1. **ForgePlan installed** and workspace initialized:
   ```bash
   forgeplan health  # Should show a working project
   ```

2. **Git repository** — the agent uses git history for analysis

3. **Claude Code** with the discover agent available

## Usage

### Via Agent (recommended)

```
# Quick scan (small project)
Use the discover agent to analyze this codebase.

# Deep analysis (large project)
Use the discover agent with --deep mode to analyze this codebase.

# Full knowledge base (enterprise/critical)
Use the discover agent with --full mode to analyze this codebase.
```

### Manual Workflow

If you prefer to run discovery step by step:

#### Pass 1: Discovery

```bash
# Layer 1: Bird's Eye
cat package.json | head -30
forgeplan new note "Discovery: DETECT — tech stack"

find src/ -maxdepth 2 -type d
forgeplan new note "Discovery: STRUCTURE — module map"

grep -E "(postgres|mysql|redis|kafka)" docker-compose.yml
forgeplan new note "Discovery: DATA STORES"

ls .github/workflows/ k8s/ terraform/ 2>/dev/null
forgeplan new note "Discovery: INFRA"

git shortlog -sn --no-merges | head -10
forgeplan new note "Discovery: GIT overview"

forgeplan new prd "Project Overview — MyProject"
forgeplan link NOTE-001 PRD-001 --relation informs

# Layer 2: Module Deep Dive (repeat per module)
forgeplan new rfc "Module: orders — architecture"
forgeplan new spec "Module: orders — API surface"
forgeplan new evidence "Module: orders — test baseline"
forgeplan link RFC-001 PRD-001 --relation implements

# Layer 3: Cross-Cutting
forgeplan new rfc "Database Architecture — schema overview"
forgeplan new rfc "Auth model — authentication flow"
forgeplan new problem "Security assessment"

# Layer 4: Legacy Docs (LAST!)
forgeplan new note "[legacy-doc] README.md — summary"
forgeplan new problem "Doc/code contradiction: auth flow differs"
```

#### Pass 2: Deepening (optional)

```bash
# For each RFC from Pass 1:
# Read ALL files in module, then update existing artifact
forgeplan update RFC-001 --body "... detailed findings ..."
forgeplan new note "Deepening: orders — hidden dependency on payments module"
forgeplan link NOTE-012 RFC-001 --relation deepens
```

#### Pass 3: Synthesis (optional)

```bash
forgeplan new note "Synthesis: dependency graph"
forgeplan new problem "Synthesis: 3 knowledge gaps found"
forgeplan new note "Synthesis: impact analysis"
forgeplan new epic "Project Knowledge Base — MyProject"
forgeplan health
```

## What You Get

### Per Mode

| Artifact | default | --deep | --full |
|----------|---------|--------|--------|
| PRD (Project Overview) | 1 | 1 | 1 |
| RFC (per module + DB + Auth) | 3-10 | 3-10 (deepened) | 3-10 (deepened) |
| Spec (API surfaces) | 2-8 | 2-8 (deepened) | 2-8 (deepened) |
| Problem (tech debt, security) | 1-5 | 3-10 | 5-15 + gaps |
| Evidence (test baselines) | 1-5 | 1-5 (deepened) | 1-5 (deepened) |
| Note (phases, summaries) | 8-15 | 12-25 | 15-35 |
| Epic (Knowledge Base) | — | — | 1 |
| **Total artifacts** | **~20** | **~40** | **~60+** |

### By Project Size

| Size | LOC | Recommended Mode | Modules | Time | Artifacts |
|------|-----|-----------------|---------|------|-----------|
| Small | <50K | default | 3-5 | 15 min | ~15 |
| Medium | 50-500K | default or --deep | 5-15 | 30-60 min | ~25-40 |
| Large | 500K-2M | --deep | 15-50 | 1-2 hours | ~40-60 |
| Mega | 2M+ | --full | 50+ (sampled) | 2-4 hours | ~60+ |

## Project Type Examples

### Node.js Monolith (~200K LOC)

```
Pass 1: package.json → src/ (auth/, orders/, users/, shared/) → PostgreSQL + Redis → Heroku
  Layer 2: auth/ (JWT middleware) → orders/ (CRUD + Stripe) → users/ (profile, settings)
  Layer 3: 45 tables, Passport.js auth, Express error middleware, Stripe + SendGrid
  Layer 4: docs/api.md (outdated — missing 12 endpoints)

Pass 2 (--deep): Each module agent reads ALL files
  → Found: orders/ has hidden dependency on users/ via shared Redis cache
  → Found: auth/ JWT secret rotation is broken (hardcoded expiry)
  → Updated all RFCs with full function-level documentation

Pass 3 (--full):
  → Gap: payments/ module has no RFC (discovered in Pass 2)
  → Contradiction: docs say "microservices" but it's a monolith
  → Impact: orders/ breaking cascades to 3 other modules
```

### Rust Microservices (~1M LOC)

```
Pass 1: docker-compose (5 services) → Cargo workspaces → PostgreSQL + Kafka → K8s
  Layer 2: api-gateway/ → user-service/ → order-service/ → notification/ → analytics/
  Layer 3: 3 databases (per-service), proto/ shared schemas, Kafka topics, mTLS

Pass 2 (--deep): Per-service agents find internal architecture
  → order-service/ uses CQRS with event sourcing (not visible from entry point)
  → notification/ has 3 undocumented webhook handlers
  → analytics/ has no tests at all (EVID updated: 0% coverage)

Pass 3 (--full):
  → Dependency graph reveals notification/ is a single point of failure
  → Gap: no RFC for shared proto/ schemas
  → Risk ranking: analytics/ (no tests + 5 consumers) = highest risk
```

### Python Data Pipeline (~500K LOC)

```
Pass 1: pyproject.toml + Airflow → dags/ (12 DAGs) → Snowflake + S3 + Kafka
  Layer 2: etl-ingestion/ → etl-transform/ → ml-training/ → reporting/
  Layer 3: Alembic migrations (78 tables), OAuth2, structured logging, AWS SDK

Pass 2 (--deep): Per-pipeline agents trace data flow
  → etl-transform/ has 200+ SQL transformations, 15 are duplicates
  → ml-training/ depends on a deprecated sklearn API
  → Data quality checks exist but only cover 30% of tables
```

## Large Projects (>50 source files per module)

The agent uses a **sampling strategy** in Pass 1:

- **Layer 1**: Always full scan (top 2 levels only — fast by design)
- **Layer 2**: Entry points + 10 most imported + 5 most changed files per module
- **Layer 3**: Grep-based pattern search instead of reading every file
- **Skip**: generated files, `vendor/`, `node_modules/`, `build/`, `dist/`, `*.lock`

**Pass 2 is where depth happens** — deepening agents read ALL files in their assigned module scope. This is intentional: Pass 1 builds the map fast via sampling, Pass 2 fills in the details where it matters.

## FAQ

**Q: Why not start with docs?**
A: Documentation is often outdated on brownfield projects. Starting with docs creates a false mental model that's hard to correct. Code is the single source of truth — docs are verified against code, not the other way around.

**Q: What about huge projects (2M+ LOC)?**
A: Use `--full` mode. Layer 1 gives you a map in 10 minutes. Layer 2 samples strategically (entry points + hot files). Pass 2 deepens the important modules. Pass 3 finds the gaps. The agent never tries to read everything — it samples, deepens, then synthesizes.

**Q: When should I use --deep vs --full?**
A: Use `--deep` when you need thorough module-level documentation. Use `--full` when you also need cross-system analysis: dependency graphs, gap detection, impact analysis, risk ranking. `--full` is for projects where you're planning a major refactor or migration.

**Q: How do I update after code changes?**
A: Re-run specific passes. Changed a module? Re-run Pass 2 deepening for that module's RFC. Changed auth? Re-run Layer 3 Phase 3.2. The multi-pass structure makes partial re-discovery natural.

**Q: Can I skip layers?**
A: Layer 1 is mandatory — it's your map. Layers 2-3 can be done selectively (specific modules, specific concerns). Layer 4 (legacy docs) is the only layer that can be skipped entirely — but it's recommended for detecting doc/code drift.

**Q: What if the project has no tests?**
A: Phase 2.5 (TESTS) will create an Evidence artifact noting "no tests found" — that's valuable information for planning.

**Q: How does Pass 2 avoid duplicating Pass 1 artifacts?**
A: Pass 2 agents UPDATE existing artifacts (via `forgeplan update`), not create new ones. They add depth to what Pass 1 discovered. New child Notes are created only for sub-components discovered during deepening.

## Protocol Reference

The machine-readable protocol is in `protocol.json` (v3.0.0). It contains:
- Source tier definitions with trust levels
- Three modes (default, deep, full) with pass configurations
- All 4 layers with phase details and output specifications
- Pass 2 deepening instructions per artifact type
- Pass 3 synthesis steps
- Project type detection hints
- Sampling strategy rules
- Relation types (informs, implements, summarizes, contradicts, deepens)
- 13 enforcement rules

## Related

- [ForgePlan CLI](https://github.com/ForgePlan/forgeplan) — the tool that stores and manages artifacts
- [ForgePlan Marketplace](https://github.com/ForgePlan/marketplace) — plugins and agents
