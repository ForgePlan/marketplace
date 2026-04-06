# Discover Agent

**Brownfield codebase onboarding for ForgePlan** — structured analysis of existing projects with layered discovery and tiered source priority.

## Problem

When ForgePlan is installed on an existing (brownfield) project, AI agents tend to:
- Start with `docs/` and build knowledge from documentation instead of code
- Build narratives around a single README or architecture document
- Miss actual code structure, patterns, and architectural decisions
- Produce artifacts that reflect documentation (potentially outdated) rather than reality

**Discover solves this** by enforcing a strict protocol: code first, docs last.

## How It Works

### Layered Strategy

Discovery happens in 4 layers, always in order:

```
┌─────────────────────────────────────────────────────────────────┐
│ Layer 1: BIRD'S EYE (10 min)                                   │
│   Manifests → File tree → Data stores → Infra → Git            │
│   Output: PRD "Project Overview" with module list               │
├─────────────────────────────────────────────────────────────────┤
│ Layer 2: MODULE DEEP DIVE (5-10 min per module)                 │
│   API surface → Types → Dependencies → DB usage → Tests → Git  │
│   Output: RFC + Spec per module                                 │
├─────────────────────────────────────────────────────────────────┤
│ Layer 3: CROSS-CUTTING (15 min)                                 │
│   DB schema → Auth → Errors → Config → Integrations → Security │
│   Output: RFC (DB, Auth) + Problem (security) + Spec (APIs)    │
├─────────────────────────────────────────────────────────────────┤
│ Layer 4: LEGACY DOCS (5 min) — ALWAYS LAST                     │
│   Scan docs/ → Cross-reference with code → Tag contradictions  │
│   Output: Notes tagged "legacy-doc, unverified"                 │
└─────────────────────────────────────────────────────────────────┘
```

### Source Tier Priority

Not all sources are equal. The agent follows strict trust tiers:

| Tier | Source | Trust Level | Example |
|------|--------|-------------|---------|
| **T1** | Code, git, manifests, DB schemas | CL3 — Highest | `package.json`, `src/`, `git log` |
| **T2** | Tests, JSDoc, CI configs | CL2 — Medium | `__tests__/`, `.github/workflows/` |
| **T3** | docs/, README, CHANGELOG | CL1 — Lowest | `docs/architecture.md`, `README.md` |

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
Use the discover agent to analyze this codebase.
```

The agent will automatically:
1. Detect the project type (monolith, microservices, monorepo, SPA, pipeline)
2. Execute all 4 layers in order
3. Create ForgePlan artifacts at each step
4. Produce a summary with all findings

### Manual Workflow

If you prefer to run discovery step by step:

#### Step 1: Bird's Eye

```bash
# 1.1 Detect tech stack
cat package.json | head -30        # or Cargo.toml, go.mod, etc.
forgeplan new note "Discovery: DETECT — tech stack"

# 1.2 Map structure
find src/ -maxdepth 2 -type d
forgeplan new note "Discovery: STRUCTURE — module map"

# 1.3 Find data stores
grep -E "(postgres|mysql|redis|kafka)" docker-compose.yml
forgeplan new note "Discovery: DATA STORES"

# 1.4 Check infra
ls .github/workflows/ k8s/ terraform/ 2>/dev/null
forgeplan new note "Discovery: INFRA"

# 1.5 Git overview
git shortlog -sn --no-merges | head -10
git log --oneline -30
forgeplan new note "Discovery: GIT overview"

# Compile into PRD
forgeplan new prd "Project Overview — MyProject"
forgeplan link NOTE-001 PRD-001 --relation informs
forgeplan link NOTE-002 PRD-001 --relation informs
# ... link all notes
```

#### Step 2: Module Deep Dive

```bash
# For each module found in Step 1:
forgeplan new rfc "Module: orders — architecture"
forgeplan new spec "Module: orders — API surface"
forgeplan new evidence "Module: orders — test baseline"
forgeplan link RFC-001 PRD-001 --relation implements
```

#### Step 3: Cross-Cutting

```bash
forgeplan new rfc "Database Architecture — schema overview"
forgeplan new rfc "Auth model — authentication flow"
forgeplan new problem "Security assessment"
forgeplan link RFC-002 PRD-001 --relation implements
```

#### Step 4: Legacy Docs (last!)

```bash
forgeplan new note "Legacy docs: README.md — summary"
# Tag: legacy-doc, unverified
# If contradiction with code:
forgeplan new problem "Doc/code contradiction: auth flow differs"
```

#### Step 5: Summary

```bash
forgeplan new note "Discovery Summary — MyProject"
forgeplan link NOTE-010 PRD-001 --relation summarizes
forgeplan health
```

## What You Get

After discovery, your ForgePlan workspace contains:

| Artifact | Count | Content |
|----------|-------|---------|
| **PRD** | 1 | Project Overview — tech stack, modules, data stores |
| **RFC** | 1 per module + DB + Auth | Architecture decisions visible in code |
| **Spec** | 1-2 per module | API surfaces, types, external integrations |
| **Problem** | varies | Hot spots, tech debt, security concerns, doc contradictions |
| **Evidence** | 1 per module | Test baselines, coverage estimates |
| **Note** | varies | Discovery phases, legacy docs (tagged), summary |

Run `forgeplan list` to see everything. Run `forgeplan health` for project status.

## Project Type Examples

### Node.js Monolith

```
Layer 1: package.json → src/ (auth/, orders/, users/, shared/) → PostgreSQL + Redis → Heroku
Layer 2: auth/ (JWT middleware, /login /register) → orders/ (CRUD + Stripe) → users/ (profile, settings)
Layer 3: 45 tables in PostgreSQL, Passport.js auth, Express error middleware, Stripe + SendGrid APIs
Layer 4: docs/api.md (outdated — missing 12 endpoints added since)
```

Artifacts: 1 PRD, 5 RFCs, 8 Specs, 3 Problems, 4 Evidence, 12 Notes

### Rust Microservices

```
Layer 1: docker-compose (5 services) → Cargo workspaces → PostgreSQL + Kafka → K8s
Layer 2: api-gateway/ → user-service/ → order-service/ → notification-service/ → analytics/
Layer 3: 3 databases (per-service), proto/ shared schemas, Kafka topics map, mTLS between services
Layer 4: docs/architecture.md (matches code), docs/deployment.md (outdated k8s configs)
```

Artifacts: 1 PRD, 7 RFCs, 10 Specs, 5 Problems, 5 Evidence, 15 Notes

### Python Monorepo (Turborepo-style)

```
Layer 1: pyproject.toml + hatch workspaces → packages/ (core, api, ml, cli) → PostgreSQL + S3
Layer 2: core/ (domain models, shared utils) → api/ (FastAPI endpoints) → ml/ (training pipelines) → cli/
Layer 3: Alembic migrations (78 tables), OAuth2 auth, structured logging, AWS SDK integrations
Layer 4: docs/ (Sphinx, mostly current), CHANGELOG (6 months behind)
```

Artifacts: 1 PRD, 6 RFCs, 8 Specs, 4 Problems, 4 Evidence, 14 Notes

### React SPA

```
Layer 1: package.json (React 18, Redux Toolkit, React Router) → src/ (features/, components/, api/)
Layer 2: features/auth/ → features/dashboard/ → features/settings/ → components/ui/
Layer 3: Redux store structure, REST API client (axios), Auth0 integration, Tailwind design system
Layer 4: Storybook docs (current), README (basic, but accurate)
```

Artifacts: 1 PRD, 5 RFCs, 6 Specs, 2 Problems, 4 Evidence, 10 Notes

## Large Projects

For projects with >50 source files per module, the agent uses a **sampling strategy**:

- **Layer 1**: Always full scan (top 2 levels only — fast by design)
- **Layer 2**: Entry points + 10 most imported files + 5 most changed files per module
- **Layer 3**: Grep-based pattern search instead of reading every file
- **Skip**: generated files, `vendor/`, `node_modules/`, `build/`, `dist/`, `*.min.js`, lock files

The agent never tries to read the entire codebase in one pass. It samples strategically and creates artifacts that can be deepened later.

## FAQ

**Q: Why not start with docs?**
A: Documentation is often outdated on brownfield projects. Starting with docs creates a false mental model that's hard to correct. Code is the single source of truth.

**Q: What about huge projects (500K+ LOC)?**
A: The layered strategy handles this. Layer 1 gives you a map in 10 minutes. Layer 2 analyzes one module at a time. You can prioritize which modules to analyze first.

**Q: How do I update after code changes?**
A: Re-run specific layers. Changed a module? Re-run Layer 2 for that module. Changed auth? Re-run Phase 3.2. The layered structure makes partial re-discovery natural.

**Q: Can I skip layers?**
A: Layer 1 is mandatory — it's your map. Layers 2-3 can be done selectively (specific modules, specific concerns). Layer 4 is always optional but recommended.

**Q: What if the project has no tests?**
A: Phase 2.5 (TESTS) will create an Evidence artifact noting "no tests found" — that's valuable information for planning. The agent doesn't skip the phase.

## Protocol Reference

The machine-readable protocol is in `protocol.json`. It contains:
- Source tier definitions with trust levels
- All 4 layers with phase details
- Project type detection hints
- Sampling strategy rules
- Artifact creation rules

## Related

- [ForgePlan CLI](https://github.com/ForgePlan/forgeplan) — the tool that stores and manages artifacts
- [ForgePlan Marketplace](https://github.com/ForgePlan/marketplace) — plugins and agents
