---
name: research
description: Deep multi-agent research on a topic — parallel scout agents cover source code, design docs/RFCs, TODO/status files, reference implementations, persistent memory. Each agent gets a bounded domain and its own context. Use when the topic is large (auth chain, competitor comparison, gap-analysis for a feature) and one agent/context isn't enough. Triggers (EN/RU) — "deep research", "explore X across the project", "compare our X with Y", "gap analysis for X", "разберись", "изучи", "сравни", "глубокий research", "что есть по теме X", "/research".
---

# Multi-Agent Deep Research

Parallel scouting of a topic by multiple agents with non-overlapping domains.
Each knowledge source is large and needs its own context window; splitting work
keeps every agent under the limit while leaving room for thorough verification.

Builds on [`team`](../team/SKILL.md) — all rules for Mode A/B, file ownership, and
cleanup live there. This file holds the research recipe.

---

## Project context (read first)

If `/setup` ran in the project, paths and terminology are pinned in:

- `@docs/agents/paths.md` — where RFCs, TODOs, ADRs, and source code live
- `@docs/agents/issue-tracker.md` — which tracker (Orchestra/GitHub/Linear/local) and how to query it
- `@CONTEXT.md` — domain glossary (use when phrasing queries)

Check with `test -f docs/agents/paths.md`. If the files exist, hand their contents
to each teammate inside the prompt. If not, fall back to auto-detection (glob
`**/docs/`, `**/RFC-*.md`, `**/TODO*.md`).

Never assume project-specific paths — either read `docs/agents/*.md` or glob in
the current session.

---

## When to use

- Topic is large or unfamiliar; need a full overview (auth chain, queue architecture, RAG pipeline).
- Comparison: "our approach vs reference implementations".
- Gap analysis before a feature: what exists, what's missing, where docs drifted from code.
- User said: "разберись", "изучи", "сравни", "что у нас по теме X", "deep research".

## When NOT to use

- Pinpoint question "where is function X?" — plain grep is faster.
- All sources sit in one module (1 package, 1 file) — orchestration overhead isn't worth it.
- You need a change plan — that's [`sprint`](../sprint/SKILL.md).

---

## Architecture: 5 agents, 5 domains

| Agent | Searches | Does NOT touch |
|---|---|---|
| **code-researcher** | Source code: `src/`, `packages/`, `services/`, `apps/`, tests | Documentation, references, memory |
| **doc-researcher** | RFCs, design docs, guides, ADRs, top-level READMEs | Source code, TODOs |
| **status-researcher** | TODO files, project status docs, KNOWN-ISSUES, recently_completed | Source code, RFCs |
| **reference-researcher** | `sources/`, `vendor/`, `examples/`, Context7 for external libs | Internal project code |
| **knowledge-researcher** | Persistent memory (Hindsight/notes), `research/`, `docs/decisions/` | Source code, references |

If a source doesn't exist in the project (no `sources/`, no memory), skip the
matching agent. **Don't invent** non-existent domains.

---

## Lightweight mode (2–3 agents)

For narrow or simple questions:

- Plain factual question ("where is X located?").
- Single domain (only code OR only docs).
- Expected scope <10 files.

Use parallel `Task()` calls without `TeamCreate`. Selection rule:

- **3+ agents** → MUST `TeamCreate` (Mode A).
- **1–2 agents** → no team is fine.
- **In doubt** → `TeamCreate` (overhead is minimal).

---

## Process

### Step 0: Validate input

`$ARGUMENTS` is the topic. If empty:

```
What to research? Examples:
- "auth chain architecture"
- "что у нас сделано по webhooks"
- "сравни наш queue с n8n и trigger.dev"
- "SSO SAML integration patterns"
```

### Step 1: Recall (quick memory check)

If memory is available:

```
memory_recall("$ARGUMENTS")
```

Free, and often already holds part of the answer. Share the result with all teammates.

### Step 2: Classify — keywords + domain mapping

Extract 3–5 keywords:

- "auth chain architecture" → `auth, chain, middleware, session, token`
- "SSO SAML integration" → `sso, saml, oidc, connector, login`
- "webhooks v2" → `webhook, event, notification, callback, realtime`

Determine which of the 5 domains actually apply (no `sources/` → no reference-researcher).

### Step 3: Spawn team

`TeamCreate(team_name="research-{sanitized-topic}")` + up to 5 parallel `Agent(team_name=...)`
calls in **one** message.

Prompt templates are below. Each agent gets: topic, keywords, `memory_recall` result
(if any), its scope, its output format.

### Step 4: Synthesize

When all agents return:

1. Read all 5 reports.
2. Cross-reference:
   - Source code vs TODOs (code is the source of truth).
   - RFCs vs implementation (note gaps).
   - Our code vs reference implementations (compare patterns).
   - Memory vs current state (update memory if stale).
3. Identify conflicts — where sources disagree.
4. Synthesize into the final report.

### Step 5: Deliver report

Format is fixed (see below).

### Step 6: Save to memory

If memory is available:

```
memory_retain("# Research: {topic} — Summary (YYYY-MM-DD)
Scope: 5-agent deep research
Key findings: ...
Gaps: ...
Recommendations: ...
Key files: ...")
```

### Step 7: Cleanup

Shut down teammates → `TeamDelete()`.

---

## Teammate prompt templates

### Teammate 1: code-researcher (subagent_type: Explore)

```
You are a SOURCE CODE research agent.
Search ONLY source code — no docs, no reference projects, no memory.

TOPIC: "{$ARGUMENTS}"
KEYWORDS: {$KEYWORDS}
MEMORY CONTEXT: {$MEMORY_RECALL_RESULTS}

=== SCOPE ===
- Primary code dirs (check CLAUDE.md or look in usual places: src/, packages/, services/, apps/, lib/)
- Tests (*.test.ts, *.spec.ts, __tests__/)
- Configs that affect behavior

=== STRATEGY ===
1. Glob "**/README.md" in main code folders — find relevant modules.
2. Grep keywords across source — find implementations.
3. Read public API surface (index.ts, mod.rs, __init__.py) of relevant modules.
4. Check tests — which scenarios are covered, which aren't.
5. Note configs (env example, package.json scripts) if they affect behavior.

=== OUTPUT ===

## Source Code: {topic}

### Modules / Packages
| Module | Key Files | Tests | What It Does |

### Patterns
- pattern: where, how it works

### Gaps (NOT implemented)
- missing piece: expected location, why we know it's missing

### Key Files (top 10)
| File | Lines | Relevance |
```

### Teammate 2: doc-researcher (subagent_type: Explore)

```
You are a DOCS & DESIGN research agent.
Search ONLY documentation — RFCs, design docs, ADRs, guides, READMEs. No source code, no TODOs.

TOPIC, KEYWORDS, MEMORY CONTEXT — same as above.

=== SCOPE ===
- docs/, doc/, documentation/
- RFC-*.md, ADR-*.md, DESIGN-*.md
- README.md (top-level + per-package)
- Guides, runbooks, architecture overviews

=== STRATEGY ===
1. Find index/TOC: docs/INDEX.md, docs/README.md, RFC-INDEX.md.
2. Locate related RFCs/ADRs by topic. Read them (use offset/limit if large).
3. Extract: status, key decisions, open questions, dependencies.
4. Find guides matching keywords. Note: patterns, configurations, examples.

=== OUTPUT ===

## Docs & Design: {topic}

### Related RFCs / ADRs
| ID | Title | Status | Key Decisions |

### Decision History
- decision: source, rationale, date

### Guides
| Guide | Key Info | Relevance |

### Known Issues
- related bugs/issues with refs
```

### Teammate 3: status-researcher (subagent_type: Explore)

```
You are a STATUS & TODO research agent.
Search ONLY TODO files and project status docs to determine "what's done, what's left".

TOPIC, KEYWORDS — same.

=== SCOPE ===
- TODO.md, TODO_*.md, **/docs/TODO.md
- KNOWN-ISSUES.md, BUGS.md, ROADMAP.md
- Recently completed sections / changelogs

=== STRATEGY ===

TODO files are often LARGE (1000+ lines). NEVER read them whole.
1. Grep keywords in TODO files — find sections.
2. Read relevant sections with offset/limit (±50 lines around match).
3. Extract: [x] done items, [ ] remaining, "Gaps", "Backend endpoints needed".
4. CROSS-CHECK with source code:
   For each [x] done item, quick-verify with grep/glob — does the code actually exist?
   Mark verified vs unverified.

=== OUTPUT ===

## Status: {topic}

### Done [x] (verified in code)
| Item | Location |

### Done [x] (claimed but NOT found in code)
| Item | TODO ref | Where we expected to find it |

### Remaining [ ]
| Item | TODO ref | Phase / Priority |

### Timeline (from TODO dates)
- date: what was done
```

### Teammate 4: reference-researcher (subagent_type: Explore)

```
You are a REFERENCE IMPLEMENTATION research agent.
Search ONLY reference projects — sources/, vendor/, examples/, plus Context7 for library docs.

TOPIC, KEYWORDS — same.

=== STRATEGY ===
1. Read sources/SOURCES-REFERENCE.md or sources/README.md (if exists).
2. Pick 3-5 most relevant reference projects.
3. For each:
   - Grep keywords inside that project.
   - Read main entry points and architecture docs.
   - Focus on PATTERNS, not implementation details.
   - Note pros / cons / tradeoffs.
4. Context7 (for libraries):
   mcp__context7__resolve-library-id(libraryName="...", query="...")
   mcp__context7__query-docs(libraryId="...", query="...")

=== OUTPUT ===

## Reference: {topic}

### Projects Analyzed
For each (top 3-5):

#### {Project}
- Approach: how they solve it
- Key architecture: structure, patterns
- Key files: 2-3 most important paths
- Pros: ...
- Cons: ...
- Relevance to our project: ...

### Industry Patterns
| Pattern | Used By | Pros | Cons |

### Best Fit
- Recommended approach: ...
- Adaptations needed: ...
```

### Teammate 5: knowledge-researcher (subagent_type: Explore)

```
You are a KNOWLEDGE BASE research agent.
Search persistent memory and accumulated research notes.

TOPIC, KEYWORDS — same.

=== STRATEGY ===
1. Memory (Hindsight or whatever's configured):
   memory_recall("{topic}")
   memory_recall("{kw1} architecture")
   memory_recall("{kw2} decisions")
   memory_recall("{kw1} bugs known issues")
   memory_reflect("What patterns emerge for {topic}?")

   If memory is not configured — skip and say so explicitly in output.

2. Research directory (if exists):
   research/, research/projects/, research/architecture/, research/reports/
   Glob, Grep, Read relevant files.

3. Decision logs:
   docs/decisions/, ADR/, decisions.md.

=== OUTPUT ===

## Knowledge: {topic}

### From Memory
| Memory | Date | Key Info |

### Past Decisions
- decision: rationale, source

### Research Documents
| Document | Path | What It Contains |

### Patterns & Insights
- pattern 1: where observed, significance

### Contradictions
- Memory says X, but code/research says Y

### Knowledge Gaps
- what we don't know yet
```

---

## Final report (format)

```markdown
# Research Report: {topic}

**Date**: YYYY-MM-DD
**Team**: 5 agents (code + docs + status + reference + knowledge)

---

## Executive Summary

2-3 sentences: what we found, what exists, what's missing.

## Current State

### Code
{from code-researcher}

### Docs
{from doc-researcher}

### Status (from TODOs)
{from status-researcher}

### Code vs Docs Alignment
| Item | In Code? | In Docs? | Status |
| ---- | -------- | -------- | ------ |
| feature | Yes/No | RFC-XXX/TODO | Aligned / Gap / Stale |

## How Others Do It

{from reference-researcher — top 2-3 approaches}

## Accumulated Knowledge

{from knowledge-researcher}

## Gaps & Opportunities

1. gap — where, impact, suggested approach

## Recommendations

1. recommendation with rationale

## Sources Consulted

{flat list — every file/doc/RFC/source/memory checked, by agent}
```

---

## Tips for the leader

1. **Memory recall first** — free, may already hold the answer.
2. **Good keywords matter** — every agent greps with them; precise = less noise.
3. **Pass memory results to teammates** — otherwise they duplicate work.
4. **Don't overlap scopes** — each agent owns an exclusive domain.
5. **Synthesis = value** — don't just glue reports together; surface conflicts and insights.
6. **Save findings** — the next research on a related topic will be shorter.
7. **Verify TODO claims against code** — that's the status-researcher's main job.

---

## Related skills

- [`team`](../team/SKILL.md) — base rules (Mode A/B, cleanup, file ownership).
- [`audit`](../audit/SKILL.md) — research → audit for quality checks.
- [`sprint`](../sprint/SKILL.md) — after research → plan + wave execution.
- [`rfc`](../rfc/SKILL.md) — research often ends in an RFC.
- [`do`](../do/SKILL.md) — orchestrator chains research → write-doc → build.

## Anti-patterns

- **Don't spawn 5 agents for a simple question** — that's what lightweight mode is for.
- **Don't split scope loosely** — overlapping scopes = duplicated work.
- **Don't trust TODOs alone** — verify in code.
- **Don't dump raw outputs from all 5 agents** — synthesis is the value.
- **Don't `TeamDelete` silently** — ask the user first.
