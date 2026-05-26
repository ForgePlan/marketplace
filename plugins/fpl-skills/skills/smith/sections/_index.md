# Smith Sections — Agentic RAG Index

Each section is self-contained (≤300 lines, target ~100). Load on demand per context — never load all 12 at once. The routing-map (`../routing-map.md`) picks the row; this index points at the matching playbook.

## Available sections

| Section | File | Trigger (EN / RU) | One-liner |
|---|---|---|---|
| Greenfield bootstrap | [01-greenfield.md](01-greenfield.md) | "new project", "from scratch", "новый проект", "с нуля" | Spec-first BMAD + GitHub Spec Kit walkthrough for clean greenfield work. |
| Brownfield modernisation | [02-brownfield.md](02-brownfield.md) | "legacy", "modernize", "переписать монолит" | Strangler Fig + DDD + ACL step-by-step with 7-phase discover agent. |
| New feature | [03-feature.md](03-feature.md) | "add a feature", "новая фича" | SPARC walk-through for adding a feature to an existing service. |
| Bug fix — production | [04-bug-fix-prod.md](04-bug-fix-prod.md) | "production bug", "race condition", "продовый баг" | RIPER-5 + 5 Whys RCA before any code touches the symptom. |
| Bug fix — trivial | [05-bug-fix-trivial.md](05-bug-fix-trivial.md) | "typo", "hotfix", "опечатка", "хотфикс" | Tactical fast-path — no PRD, no ADR, just coder + reviewer. |
| Refactor | [06-refactor.md](06-refactor.md) | "refactor", "clean up code", "рефакторинг" | Branch-by-Abstraction + Mikado with pre/post architect-reviewer. |
| Architecture decision (ADR) | [07-adr-decision.md](07-adr-decision.md) | "we need to decide", "выбрать между" | FPF ADI + MADR + C4 L1+L2 for irreversible architecture choices. |
| Security audit | [08-security-audit.md](08-security-audit.md) | "security review", "OWASP", "аудит безопасности" | OWASP Top 10 2025 + STRIDE/ASTRIDE threat-model walkthrough. |
| Performance audit | [09-perf-audit.md](09-perf-audit.md) | "slow", "perf review", "тормозит" | DORA + SRE error-budget + perf-budget baseline-first audit. |
| Product discovery | [10-pdlc-discovery.md](10-pdlc-discovery.md) | "what should we build", "discovery", "что строить" | JTBD + Lean MVP + Double Diamond for pre-product framing. |
| Tech debt cleanup | [11-tech-debt.md](11-tech-debt.md) | "tech debt", "cleanup sprint", "техдолг" | A3 + Fishbone for systemic-vs-local distinction + ADR-supersede. |
| Live incident | [12-incident.md](12-incident.md) | "production down", "outage", "лежит прод" | ICS during the fire + blameless post-mortem + 5 Whys after. |

## How smith uses this

Smith reads `../routing-map.md` first and picks **exactly one row**. The row
identifies the primary methodology, the dispatch sequence, and the evidence
requirements — enough information to start orchestrating. The smith agent
should not pull a section file unless the situation has enough novelty or
complexity that the routing-map row alone is not sufficient guidance (e.g.
the user explicitly asks "how does the brownfield flow work step-by-step",
or smith hits a non-trivial branch point where the section's "Failure
modes" list is the cheapest source of recovery hints).

When smith does load a section, it loads exactly one — the one matching the
chosen row — and reads it from top to bottom. Sections are designed to fit
in working memory (≤300 lines, ~100 target); chaining multiple sections in
one decision is a smell that means the routing-map row was picked wrong.
If that happens, smith should back up to the routing-map, re-justify the
row choice, and only then proceed.
