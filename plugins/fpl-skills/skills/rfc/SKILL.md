---
name: rfc
description: Creates, reads, and updates RFCs (Request for Comments) / design docs — structured documents for architectural decisions. Knows the canonical structure (Meta header, Phase Progress, Implementation TODO, ADR), the rules for updating progress bars, and the checkbox format. Use when proposing a new technical solution, documenting architecture, or updating progress on an existing RFC after a sprint/wave. Triggers (EN/RU) — "write RFC", "create design doc", "update RFC progress", "draft proposal", "ADR", "напиши RFC", "сделай design doc", "обнови прогресс RFC", "создай предложение", "архитектурное решение".
---

# RFC Document

Canonical format for RFC / design docs / ADR. The skill is universal: it works
whether RFCs live in `docs/rfc/`, `docs/design/`, `docs/adr/`, or at the project
root. The prefix (RFC / ADR / DESIGN) follows the project's convention — check
`CLAUDE.md` or look at existing files.

---

## Project context (read first)

If the project ran `/setup`, the path to RFC/ADR/design-docs is wired into:

- `@docs/agents/paths.md` — fields "RFC dir", "ADR dir", "Architecture docs"

Check via `test -f docs/agents/paths.md`. If present, write new RFCs into the
specified directory and read existing ones from there. If absent, glob for
`**/RFC-*.md`, `docs/rfc/`, `docs/adr/`, `docs/design/`. If nothing turns up,
ask the user where to put it (and offer to record the answer in
`docs/agents/paths.md` for future sessions).

---

## When to use

- The user proposed a new architectural approach and wants to "capture as RFC / ADR".
- An existing RFC needs progress updated after a wave/sprint (Phase Progress, Implementation Log).
- An RFC needs reading to extract current status, remaining tasks, ADRs.
- An `RFC-INDEX.md` needs creating for an RFC folder.

## When NOT to use

- The user wants a README, getting-started guide, or tutorial — different format.
- The decision is trivial (rename a variable, fix a typo) — RFC is overkill.
- The document describes API endpoints — that's OpenAPI, not an RFC.

---

## Base RFC structure

```
┌─────────────────────────────────────────┐
│ 1. Title + Meta Table                   │  ← required
│ 2. Summary                              │  ← required
│ 3. Motivation / Problem Statement       │  ← required
│ 4. Goals / Non-Goals                    │  ← required
│ 5. Architecture Overview                │  ← recommended (ASCII art)
│ 6. Detailed Design                      │  ← main body
│ 7. Table of Contents                    │  ← if RFC > 500 lines
│ ...                                     │
│ N-2. Implementation TODO                │  ← required (phases + checkboxes)
│ N-1. Implementation Log                 │  ← after work begins (waves)
│ N.   ADRs / References                  │  ← optional
└─────────────────────────────────────────┘
```

---

## 1. Meta Header (required)

```markdown
# RFC-{NNN}: {Title}

| Field          | Value                                              |
| -------------- | -------------------------------------------------- |
| **Status**     | Draft / Active / Done / Superseded                 |
| **Author**     | {Team / Person}                                    |
| **Created**    | YYYY-MM-DD                                         |
| **Updated**    | YYYY-MM-DD                                         |
| **Priority**   | P0 / P1 / P2                                       |
| **Depends On** | RFC-XXX, RFC-YYY                                   |
| **Supersedes** | RFC-ZZZ (if it replaces something)                 |
| **Branch**    | `feat/RFC-{NNN}-short-name` or `merged to main`    |
| **TODO Line**  | ~{line_number}                                     |
```

### Phase Progress (ASCII bars at the top of the file)

```
Phase 0 ████████████████████████ 27/27 (100%) DB Foundation       CLOSED
Phase 1 ██████████████████████░░ 11/12 ( 92%) Versioning          1.10 deferred
Phase 2 ████████████████████░░░░ 16/19 ( 84%) Import/Export       Active
Phase 3 ██████████████████████░░ 28/30 ( 93%) Frontend CRUD       Active
─────────────────────────────────────────────────────────────────
TOTAL                            82/88 ( 93%)
```

**Rules**:
- Bar = 24 chars (`█` filled, `░` empty).
- Numbers right-aligned.
- Update after **every** sprint/wave.
- `<-` after the active phase line (if you want to highlight it).

---

## 2. Status — allowed values and nuances

| Status | When |
|---|---|
| `Draft` | RFC written, implementation not started. |
| `Active — Wave N complete, Phase X partial` | In progress. Spell out details. |
| `~99% DONE — Phase 0-5 done, Remaining: E2E + hardening` | Almost finished. |
| `**PR #N MERGED** — Phase 0-5 done, Phase 6-7 pending` | Part merged, rest in flight. |
| `Done` | Fully implemented. |
| `Superseded by RFC-XXX` | Replaced by a newer RFC. |

---

## 3. Implementation TODO

A live progress tracker. Section structure:

```markdown
## N. Implementation TODO

**Branch**: `feat/RFC-{NNN}-short-name`
**Start Date**: YYYY-MM-DD
**Strategy**: short description of the approach

### Phase Progress

| Phase | Name           | Done | Total | %     | Status        |
| ----- | -------------- | ---- | ----- | ----- | ------------- |
| 0     | DB Foundation  | 27   | 27    | 100%  | CLOSED        |
| 1     | Versioning     | 11   | 12    | 92%   | 1.10 deferred |
| ...   | ...            | ...  | ...   | ...   | ...           |
| TOTAL |                | 82   | 88    | 93%   |               |

### Phase 0: DB Foundation

- [x] 0.1 Schema design — `db/schema.sql`
- [x] 0.2 Migration scripts — `db/migrations/0001_*.sql`
- [x] 0.3 Seed data — `db/seeds/`
- [ ] 0.4 Indexes review — `db/schema.sql` (deferred — see Phase Progress)

### Phase 1: ...
```

**Checkbox rules**:
- `[x]` = actually done (not "planned" — code exists in the repo). Verify with `grep`/`glob` before checking the box.
- `[ ]` = not yet done (or deferred with a note).
- After each item — file path or key reference.

---

## 4. Implementation Log

Once work starts, append sections per wave/sprint:

```markdown
## N+1. Implementation Log

### Wave 1 — DB Foundation (YYYY-MM-DD)

**Sprint**: 3 agents, ~420 LOC, 12 tests added.

**Files Created**:
- `db/schema.sql` (250 LOC)
- `db/migrations/0001_initial.sql` (120 LOC)

**Files Modified**:
- `package.json` (add prisma scripts)

**Decisions**:
- Use soft-delete instead of hard-delete for audit.
- Index on `(tenant_id, created_at)` for the main query pattern.

#### Sprint Insights & Bottlenecks
- **ADR**: ... (link to ADR section)
- **Bottleneck**: ...
- **Tech debt**: ...
- **Reusable pattern**: ...

### Wave 2 — Backend Logic (YYYY-MM-DD)
...
```

---

## 5. ADR (Architecture Decision Records)

Inside the RFC or as a separate file:

```markdown
### ADR-{NNN}: {Title}

**Status**: Accepted | Proposed | Deprecated | Superseded by ADR-XXX
**Date**: YYYY-MM-DD
**Context**: what forces this decision
**Decision**: what we decide
**Consequences**:
  - Positive: …
  - Negative: …
  - Tradeoffs: …
**Alternatives considered**: …
```

---

## Process: creating a new RFC

### 1. Orient

```bash
# find existing RFCs
find . -name "RFC-*.md" -not -path "*/node_modules/*" 2>/dev/null
find . -name "ADR-*.md" -not -path "*/node_modules/*" 2>/dev/null
ls docs/rfc/ docs/design/ docs/adr/ 2>/dev/null
```

- Determine the convention (RFC / ADR / DESIGN, path, numbering).
- Find `RFC-INDEX.md` (if any) — pick the next free number.

### 2. Ask the user

- RFC topic (one sentence).
- Level: full RFC or short ADR?
- Where to save: path per project convention.
- Dependencies / Supersedes (if any).

### 3. Create the file

Fill in Meta Header, Summary, Motivation, Goals/Non-Goals.
Add empty Phase Progress bars (0%) and an empty Implementation TODO.
**Don't write Implementation Log** — it appears after the first wave.

### 4. Update the index

If `RFC-INDEX.md` exists:

```markdown
| RFC | Title | Status | Updated |
| --- | ----- | ------ | ------- |
| 080 | Command Center | Draft | 2026-04-26 |
```

### 5. Commit (only on user request)

`feat(docs): add RFC-{NNN}-{short-name}`.

---

## Process: updating an RFC after a wave/sprint

1. Read the RFC with `offset`+`limit` if it's large (>500 lines) — Meta + Phase Progress first, then the specific Phase.
2. Update Phase Progress (bars, table, percentages, statuses).
3. Mark `[x]` on completed items; **verify** with `grep`/`glob` — don't tick if the code isn't there.
4. Add a new block to Implementation Log — Wave N with date, files, decisions, insights.
5. Update the `Updated` field in Meta.
6. If a merge happened — update `Status` (e.g. `**PR #N MERGED** — Phase X done`).

---

## Related skills

- [`sprint`](../sprint/SKILL.md) — after a wave you need to update the RFC.
- [`research`](../research/SKILL.md) — research often ends in an RFC.
- [`do`](../do/SKILL.md) — the "research → write RFC" pipeline.

## Anti-patterns

- **Don't tick `[x]` without verifying in the code** — the TODO turns stale fast.
- **Don't duplicate Phase Progress in three places** — Meta + start of TODO is enough.
- **Don't write "Implementation Log: TBD"** — just don't create the section yet.
- **Don't dump API endpoints / full JSON schemas into the RFC** — those belong in `openapi.yaml` or a separate guide.
- **Don't conflate RFC and ADR**: RFC is a broad proposal; ADR is a single decision. If the document is one decision on one page, it's an ADR.
