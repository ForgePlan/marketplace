---
name: project-agent-scaffold
description: |
  Methodology: Project-scoped agent generation via tech-stack detection.
  EN: Detects project tech stack from package manifests (package.json, Cargo.toml, go.mod, pyproject.toml, pom.xml, mix.exs, Gemfile, composer.json, Package.swift, pubspec.yaml) + secondary signals (tailwind.config.*, next.config.*, nuxt.config.*, docker-compose.yml). Classifies signals into a stack profile, proposes 1–3 project-scoped agents (project:<slug>-pro) baked from agent-template.md with stack-specific patterns. Asks approval per proposal before writing any file. Does NOT auto-create — user always confirms. Writes agent files to .claude/agents/ on approval and suggests project-agent-matrix.yaml entries for dispatch overrides.
  RU: Определяет технологический стек проекта по package-манифестам + вторичным сигналам. Классифицирует в stack profile, предлагает 1–3 project-scoped агента (project:<slug>-pro) на базе agent-template.md. Спрашивает подтверждения для каждого предложения. Записывает только после согласия пользователя. НЕ создаёт автоматически.
  Triggers: "scaffold project agent", "create project agent", "detect project stack", "project-specific agent", "agent for my stack", "создай agent для проекта", "agent под мой стек", "agent под мой проект", "/project-agent-scaffold"
disable-model-invocation: true
allowed-tools: Read Write Edit Bash(ls *) Bash(cat *) Bash(test *) Bash(find *) Bash(grep *)
---

# project-agent-scaffold — tech-stack-aware agent generation

Detects what the project is built with, proposes 1–3 tailored agents, asks
your approval for each, then writes the file. Nothing is written without
an explicit "yes".

---

## When to use

- You just cloned a new project and want a project-scoped Claude Code agent pre-loaded with its conventions
- The canonical `agents-domain` or `agents-pro` agents exist but need project-specific context baked in
- You want a proposal before manually writing `.claude/agents/project-*.md` from scratch

## When NOT to use

- The project already has project-scoped agents in `.claude/agents/` — audit with `agent-advisor` first
- You need a general-purpose specialist (no project context needed) — use `agent-advisor` directly
- You want the agent to be forgeplan-aware (produce EVIDENCE, claim/release, etc.) — use `AGENT-AUTHORING-GUIDE.md` for manual authoring; this skill generates non-forgeplan project helpers

---

## Step 1 — Detect tech stack

Read manifests in priority order. Stop after first match per category; collect secondary signals from any depth.

### Primary manifests (one match per runtime)

| File | Runtime | Key fields to read |
|---|---|---|
| `package.json` | Node / JS / TS | `dependencies`, `devDependencies`, `scripts` |
| `Cargo.toml` | Rust | `[dependencies]` section |
| `go.mod` | Go | `require` lines |
| `pyproject.toml` | Python | `[project.dependencies]` or `[tool.poetry.dependencies]` |
| `requirements.txt` | Python (alt) | package names, one per line |
| `pom.xml` | Java / Kotlin | `<groupId>` + `<artifactId>` under `<dependencies>` |
| `build.gradle` / `build.gradle.kts` | Java / Kotlin | `dependencies { ... }` block |
| `mix.exs` | Elixir | `deps` list |
| `Gemfile` | Ruby | `gem "..."` lines |
| `composer.json` | PHP | `require` and `require-dev` keys |
| `Package.swift` | Swift | `.package(url:...)` entries |
| `pubspec.yaml` | Dart / Flutter | `dependencies:` block |

### Secondary signals (layer on top of primary)

| File / pattern | Signal it adds |
|---|---|
| `tailwind.config.*` | Tailwind CSS |
| `next.config.*` | Next.js (App Router if `appDir: true` or `/app` dir present) |
| `nuxt.config.*` | Nuxt 3 |
| `vite.config.*` | Vite bundler |
| `docker-compose.yml` | Multi-service (informs agent scope) |
| `prisma/schema.prisma` | Prisma ORM |
| `drizzle.config.*` | Drizzle ORM |
| `supabase/` dir | Supabase backend |
| `convex/` dir | Convex backend |
| `*.tf` files | Terraform IaC |
| `k8s/` or `charts/` dir | Kubernetes |

### Detection commands (run these)

```bash
test -f package.json     && cat package.json
test -f Cargo.toml       && cat Cargo.toml
test -f go.mod           && cat go.mod
test -f pyproject.toml   && cat pyproject.toml
test -f requirements.txt && cat requirements.txt
test -f mix.exs          && cat mix.exs
test -f composer.json    && cat composer.json
test -f pubspec.yaml     && cat pubspec.yaml
find . -maxdepth 2 -name "next.config.*" -o -name "tailwind.config.*" -o -name "nuxt.config.*" 2>/dev/null
find . -maxdepth 3 -name "prisma" -type d -o -name "drizzle.config.*" 2>/dev/null
ls .claude/agents/ 2>/dev/null || echo "(no project agents yet)"
```

---

## Step 2 — Classify stack profile

Combine primary manifest + secondary signals into a human-readable profile string and derive a slug.

| Example profile | Slug | Agent name |
|---|---|---|
| Next.js + Tailwind + Prisma + PostgreSQL | `nextjs-tailwind-prisma` | `project:nextjs-tailwind-prisma-pro` |
| Next.js + Tailwind + Drizzle + Supabase | `nextjs-drizzle-supabase` | `project:nextjs-drizzle-supabase-pro` |
| Nuxt 3 + Tailwind + Prisma | `nuxt-tailwind-prisma` | `project:nuxt-tailwind-prisma-pro` |
| React + Vite + Express + PostgreSQL | `react-express-pg` | `project:react-express-pg-pro` |
| NestJS + Prisma + PostgreSQL | `nestjs-prisma` | `project:nestjs-prisma-pro` |
| Rust + Tokio + Axum | `rust-axum` | `project:rust-axum-pro` |
| Rust + Axum + Diesel + PostgreSQL | `rust-axum-diesel` | `project:rust-axum-diesel-pro` |
| Go + Gin + GORM | `go-gin-gorm` | `project:go-gin-gorm-pro` |
| Go + Echo + gRPC | `go-echo-grpc` | `project:go-echo-grpc-pro` |
| Python + FastAPI + SQLAlchemy | `python-fastapi-sqlalchemy` | `project:python-fastapi-sqlalchemy-pro` |
| Python + FastAPI + ML (torch/transformers) | `python-fastapi-ml` | `project:python-fastapi-ml-pro` |
| Django + PostgreSQL | `django-pg` | `project:django-pg-pro` |
| Elixir + Phoenix | `elixir-phoenix` | `project:elixir-phoenix-pro` |
| PHP + Laravel | `php-laravel` | `project:php-laravel-pro` |
| PHP + Symfony | `php-symfony` | `project:php-symfony-pro` |
| Dart + Flutter | `dart-flutter` | `project:dart-flutter-pro` |
| Monorepo (mixed runtimes) | `monorepo-<primary>` | up to 3 agents, one per sub-project |

**Slug rule**: 2–4 components, kebab-case, most discriminating first, omit obvious (`js`, `ts`, `web`).

### Base agent mapping

| Stack | Closest marketplace base | If no marketplace base |
|---|---|---|
| Next.js | `agents-domain:nextjs-developer` | — |
| Nuxt / Vue | `agents-domain:frontend-developer` | — |
| React + Vite | `agents-domain:frontend-developer` | — |
| NestJS | `agents-domain:nodejs-developer` | — |
| Rust | none in marketplace | Import from VoltAgent/awesome-claude-code-subagents |
| Go | none in marketplace | Import from VoltAgent/awesome-claude-code-subagents |
| Python / FastAPI | `agents-pro:ml-developer` (ML-heavy) or generic | — |
| Django / Flask | none specific | Generic project agent |
| Java / Spring | none specific | Generic project agent |
| Elixir / Phoenix | none specific | Generic project agent |
| PHP / Laravel | none specific | Generic project agent |
| Dart / Flutter | none specific | Generic project agent |

---

## Step 3 — Generate proposals (one per candidate)

For each candidate (max 3 total), render a proposal block:

```
PROPOSAL: project:<slug>-pro
  Base:         <marketplace base or "none — generic template">
  Stack:        <human profile string>
  Project-specific patterns to bake in:
    - <pattern 1 from stack, e.g. "Next.js App Router conventions (server components, use client boundary)">
    - <pattern 2, e.g. "Prisma migration workflow (npx prisma migrate dev)">
    - <pattern 3, e.g. "Tailwind v4 config (CSS-first, no tailwind.config.js)">
  Target file:  .claude/agents/project-<slug>-pro.md
  matrix.yaml:  project:<slug>-pro → <phase> override (optional)

Approve this proposal? [yes / modify / skip]
<<NEED_USER_INPUT: approve / modify / skip for project:<slug>-pro>>
```

Present all proposals before writing any file.

---

## Step 4 — On user response

| Response | Action |
|---|---|
| `yes` / `approve` | Write agent file (Step 5). Record in final report. |
| `modify` | Ask what to change (name, scope, base, patterns). Re-render proposal. Loop. |
| `skip` / `no` | Note as skipped. Continue to next proposal. |

---

## Step 5 — Write agent file (on approval only)

Use `plugins/fpl-skills/templates/agent-template.md` as the skeleton. Replace every `TODO` with:

| TODO placeholder | Replacement |
|---|---|
| `TODO-kebab-name` | `project-<slug>-pro` |
| `TODO-role` | `project-specific <stack> developer` |
| `TODO-one-line-scope` | short scope sentence (e.g. "You handle all Next.js App Router + Prisma work in this repo.") |
| `EN: TODO` in description | project-specific description with stack patterns |
| `RU: TODO` in description | Russian translation |
| Triggers | stack-specific natural-language triggers |
| `model:` | `sonnet` (default for project agents — adjust to `opus` if reasoning-heavy) |
| `color:` | pick a stable hex (see palette below) |
| `tools:` | Read, Grep, Glob, Write, Edit, Bash — NO forgeplan MCP (project agents are Profile C-coder) |
| HARD RULES section | project-specific invariants (e.g. "Never run migrations without user confirmation") |

**Color palette** (pick one per agent, avoid duplication with existing agents):

| Stack | Suggested hex |
|---|---|
| Next.js / React | `#0070F3` |
| Rust | `#CE422B` |
| Go | `#00ADD8` |
| Python | `#3572A5` |
| Elixir | `#6E4A7E` |
| PHP | `#777BB4` |
| Flutter | `#54C5F8` |
| Java / Kotlin | `#F89820` |
| Generic | `#546E7A` |

Write to: `.claude/agents/project-<slug>-pro.md`

After writing, suggest the `project-agent-matrix.yaml` entry:

```yaml
# Add to .forgeplan/project-agent-matrix.yaml (if file exists):
overrides:
  - phase: build
    stack_signal: "<primary manifest filename>"
    agent: "project:<slug>-pro"
```

---

## Step 6 — Final report

After all proposals are resolved:

```
project-agent-scaffold complete
  written:  <N> agent(s)
    - .claude/agents/project-<slug-1>-pro.md
    - .claude/agents/project-<slug-2>-pro.md  [if any]
  skipped:  <M> proposal(s) — <reason if given>
  next:     Run `forgeplan list` to verify project-agent-matrix.yaml entries.
            Run `/agent-advisor` to confirm dispatch mapping for new agents.
```

---

## Anti-patterns

- **Do not write files without explicit approval.** Always present the full proposal block and wait for `<<NEED_USER_INPUT:>>` to resolve. Auto-writing bypasses the user's security boundary.
- **Do not propose more than 3 agents.** Cap at 1 per major runtime. If a monorepo has 5 sub-projects, pick the top 3 by LOC or user priority.
- **Do not depend on `agents-domain` availability.** The base mapping is advisory. If the user's installation lacks `agents-domain`, generate from the generic template anyway.
- **Do not add forgeplan MCP tools to proposed agents.** Project-scoped agents are Profile C-coder (source files only). If the project needs forgeplan-aware project agents, direct to `AGENT-AUTHORING-GUIDE.md`.
- **Do not invent stack signals not present in the files.** If `package.json` has no Prisma entry and no `prisma/` dir, do not assume Prisma.

---

## Related skills

- [`agent-advisor`](../agent-advisor/SKILL.md) — identifies which canonical agent to dispatch for a task; complements this skill (run after scaffold to verify dispatch mapping)
- [`AGENT-AUTHORING-GUIDE.md`](../../AGENT-AUTHORING-GUIDE.md) — full B2 paradigm, CRUD-R-A matrix, profiles; required reading before promoting a project agent to a marketplace agent
- [`agent-template.md`](../../templates/agent-template.md) — canonical skeleton used in Step 5
- [VoltAgent/awesome-claude-code-subagents](https://github.com/VoltAgent/awesome-claude-code-subagents) — curated community agents; recommended for stack coverage not yet in ForgePlan marketplace (Rust, Go, Java, Elixir)
- [DenisSergeevitch/agents-best-practices](https://github.com/DenisSergeevitch/agents-best-practices) — authoring conventions for custom Claude Code agents
