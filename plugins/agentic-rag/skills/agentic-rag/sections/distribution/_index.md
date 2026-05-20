# distribution

When and how to distribute an agentic RAG skill — as a marketplace plugin vs
a standalone skill installable via `npx skills add`.

## Contents

| File | Description | Lines |
|------|-------------|-------|
| [plugin-vs-standalone.md](plugin-vs-standalone.md) | Comparison table, decision criteria, tradeoffs | 40 |
| [ci-sync.md](ci-sync.md) | How to keep a marketplace plugin and standalone repo in sync via CI | 36 |

## Quick rule

Start with the marketplace plugin. Promote to standalone only when ≥ 3 users
request standalone install (`npx skills add`). This is the NOTE-003 trigger-driven
design pattern used by the ForgePlan ecosystem.
