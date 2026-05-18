# agents-core

Core development agents: debugger, code reviewer, error detective, performance engineer, production validator, plus a complete dev team (coder, planner, researcher, reviewer, tester, TDD London School).

## Install

```
/plugin install agents-core@ForgePlan-marketplace
```

## Agents (11)

Legend: ⚙ = forgeplan-aware (B2 paradigm — see [AGENT-AUTHORING-GUIDE.md](../fpl-skills/AGENT-AUTHORING-GUIDE.md)).

| Agent | Profile | Description |
|-------|:-------:|-------------|
| **coder** ⚙ | C-coder | Source-mutating implementation agent — the only profile allowed Write/Edit/Bash on source files. Reads parent RFC/SPEC via forgeplan MCP, writes code, hands off to Profile B reviewer for EVIDENCE recording |
| **code-reviewer** ⚙ | B | Diff/file-set reviewer — runs lint/type-check/tests via Bash, produces forgeplan EVIDENCE artifact with PASS/CONCERNS/BLOCKER verdict + categorised findings (Bug / Style / Architecture / Performance / Docs / Test gap) |
| **tester** ⚙ | B | Test runner and coverage analyst — executes test suite via Bash, parses output, measures coverage delta against acceptance criteria, records verdict as EVIDENCE artifact linked `informs` to parent |
| **debugger** | — | Expert debugger specializing in complex issue diagnosis, root cause analysis, and systematic problem-solving across multiple languages and environments |
| **error-detective** | — | Forensic error investigator — root cause analysis, cascade mapping, log correlation, and anomaly detection across distributed and monolithic systems |
| **performance-engineer** | — | Senior performance engineer covering profiling, bottleneck analysis, optimization techniques, monitoring, SLA management, and capacity planning |
| **production-validator** | — | Production readiness validator — detects mock implementations, verifies real integrations, validates deployment configuration, and ensures no stubs remain in release code |
| **planner** | — | Strategic planning — decomposes complex tasks into actionable execution plans |
| **researcher** | — | Deep research and analysis — investigates codebases, finds patterns, synthesizes knowledge |
| **reviewer** | — | Code review and quality assurance — finds bugs, security issues, and design problems (general-purpose, non-canonical) |
| **tdd-london** | — | TDD London School specialist — outside-in development, mock-driven design, behavior verification, and interaction testing for clean object collaboration |

## Forgeplan-aware agents (3, PRD-026 canonical)

Three agents in this pack implement the **canonical pipeline profiles** for code work:

- **`coder`** (Profile C-coder) — the only agent allowed to mutate source files. Receives RFC/SPEC context via `forgeplan_get`, writes code, requests Profile B review via orchestrator.
- **`code-reviewer`** (Profile B) — produces EVIDENCE artifact with PASS/CONCERNS/BLOCKER verdict and findings categorised by type.
- **`tester`** (Profile B) — produces EVIDENCE artifact with pass/fail/skipped/flaky counts and coverage delta.

This trio enables `coder → code-reviewer → tester → guardian` flow in `/forge-cycle` and `/autorun` orchestrators.

## Groups

### Core (5 agents)
Debugging, code review, error investigation, performance engineering, production validation.

### Dev Team (6 agents)
Full development team: planning, research, implementation, review, testing, TDD.

## License

MIT
