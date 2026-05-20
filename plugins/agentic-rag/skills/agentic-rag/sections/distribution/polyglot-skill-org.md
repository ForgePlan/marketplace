# Polyglot Skill Organization

## Цель

Decide whether to organize a skill serving Rust + Go + TypeScript + Python
consumers as **one skill with language sections** or **separate per-lang skills**.
The wrong choice either bloats context or multiplies maintenance overhead.

## Decision tree

```
Each language has how many topics?
  < 5 topics per language
      → ONE skill with language sections
        (saves orchestration overhead, single SKILL.md router)

  > 5 topics per language  OR  separate maintainers per language
      → SEPARATE per-lang skills
        (rust-conventions/, go-conventions/, etc.)

  Languages share ≥50% content (e.g. shared cross-cutting rules)
      → ONE skill with shared/ + lang-specific/ sections
        (shared/ loaded always; lang-specific/ loaded on demand)
```

## Approach 1 — One skill with language sections

Best when content is moderate and maintained by one person.

```
polyglot-conventions/
├── SKILL.md               ← router: "need Rust? → sections/rust/"
├── sections/
│   ├── shared/            ← cross-cutting: commit style, CI conventions
│   │   ├── _index.md
│   │   └── cross-cutting.md
│   ├── rust/
│   │   ├── _index.md
│   │   └── cargo-workspace.md
│   ├── go/
│   │   ├── _index.md
│   │   └── module-layout.md
│   ├── ts/
│   │   ├── _index.md
│   │   └── strict-mode.md
│   └── python/
│       ├── _index.md
│       └── ruff-pytest.md
```

SKILL.md router table:

```markdown
| Need | Load |
|------|------|
| Rust conventions | sections/rust/ |
| Go conventions | sections/go/ |
| TypeScript conventions | sections/ts/ |
| Python conventions | sections/python/ |
| Cross-cutting rules | sections/shared/ |
```

Agent loads `shared/` always + one lang section per query — ~60-80 lines
total, never the full 300+ line file.

## Approach 2 — Separate per-lang skills

Best when each language has deep content or separate maintainers.

```
rust-conventions/        ← separate plugin or skill
go-conventions/
ts-conventions/
python-conventions/
```

Agent must know which skill to load. Orchestrator overhead increases:
one `read_skill` call per language needed.

## Anti-pattern: flat SKILL.md with all 4 languages inline

```markdown
# ❌ WRONG — flat SKILL.md

## Rust conventions
...40 lines...

## Go conventions
...40 lines...

## TypeScript conventions
...40 lines...

## Python conventions
...40 lines...
```

Problems:
- Agent loads all 160+ lines even for a Rust-only query
- Defeats agentic RAG: no sections to load on demand
- SKILL.md grows past 300-line limit as content deepens
- Context wasted on 3 irrelevant languages per invocation

## When to use each approach

| Signal | One skill | Separate skills |
|--------|-----------|-----------------|
| < 5 topics per language | ✓ | |
| > 5 topics per language | | ✓ |
| Single maintainer | ✓ | |
| Multiple team maintainers | | ✓ |
| Languages share ≥50% content | ✓ (with shared/) | |
| Languages share < 30% content | | ✓ |
| All languages ship together | ✓ | |
| Languages release independently | | ✓ |

## Refs

- PRD-043 FR-006 (active) — polyglot skill org gap this section closes
- `plugin-vs-standalone.md` — distribution channel decision (orthogonal to this choice)
- AGENT-AUTHORING-GUIDE.md — per-skill section conventions
- `polyglot-claude-md-cascade.md` (fp-cookbook recipes-workflow/) — companion: CLAUDE.md cascade for same polyglot setup
