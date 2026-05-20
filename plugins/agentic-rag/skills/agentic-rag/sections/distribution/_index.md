# distribution

When and how to distribute an agentic RAG skill — as a marketplace plugin vs
a standalone skill installable via `npx skills add`.

## Contents

| File | Description | Lines |
|------|-------------|-------|
| [plugin-vs-standalone.md](plugin-vs-standalone.md) | Comparison table, decision criteria, tradeoffs | 40 |
| [ci-sync.md](ci-sync.md) | How to keep a marketplace plugin and standalone repo in sync via CI | 36 |
| [polyglot-skill-org.md](polyglot-skill-org.md) | One-skill-with-sections vs separate-per-lang-skills decision tree for polyglot consumers | 52 |

## Quick rule

Start with the marketplace plugin. Promote to standalone only when ≥ 3 users
request standalone install (`npx skills add`). This is the NOTE-003 trigger-driven
design pattern used by the ForgePlan ecosystem.

## Polyglot consumers

When the skill serves Rust + Go + TypeScript + Python consumers, decide the
section layout before authoring. The flat-SKILL.md anti-pattern (all 4 languages
inline) defeats agentic RAG by forcing agents to load 160+ irrelevant lines per
query. See `polyglot-skill-org.md` for the decision tree.
