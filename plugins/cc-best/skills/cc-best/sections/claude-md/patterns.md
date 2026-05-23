# CLAUDE.md patterns — good practices to copy

These patterns come from production CLAUDE.md files observed across the ForgePlan plugin ecosystem. Each pattern has a name, the rule, an example, and why it works.

## Pattern 1 — Dated sprint sections at the bottom

**Rule**: Append a new dated section at the bottom of CLAUDE.md after each significant sprint or release. Keep all sprint history in one file — do not split until the file exceeds 600 lines.

**Example:**

```markdown
## Sprint W 2026-05-22 — Anomaly #27 + #28 closure

Inline tactical sprint post-Sprint-V closure. Closed 2 process anomalies that escaped Sprint V CI:

| PRD | Sprint | Deliverable |
|-----|--------|-------------|
| **PRD-050** (active, EVID-077 informs) | Sprint W | LR-8 lint rule added ... |

### Anomalies resolved Sprint W

- **#27** → RESOLVED. LR-8 rule live.
- **#28** → RESOLVED. Canonical schema formalised.
```

**Why it works**: A new session opened weeks later can scan the bottom of the file and immediately understand what changed recently — without reading the entire file. The date anchors the reader in time; the one-line deliverable summary is enough to orient. Historical context without ceremony.

## Pattern 2 — "Last Updated" in the metadata block

**Rule**: Put a "Last Updated" line in the metadata block with a parenthetical one-sentence summary of what changed.

**Example:**

```markdown
**Last Updated**: 2026-05-22 (post Sprint W autonomous run: LR-8 lint rule active +
canonical frontmatter schema formalises skills:/maxTurns:/isolation: fields.
28 anomalies (24 resolved) + 13 ML + 10 mental models, catalog v1.61.0)
```

**Why it works**: Claude Code cannot diff files between sessions. Without a date, neither you nor the assistant can tell if a rule is current or stale. The parenthetical summary prevents re-reading the whole sprint history to understand what the "last update" actually changed.

## Pattern 3 — Version-pinned plugin table

**Rule**: Maintain a single version table for all installed plugins. Put it in one place, reference it everywhere else. Bump both the table and the plugin's own `plugin.json` on every change.

**Example:**

```markdown
## Plugin versions (catalog v1.61.0)

### Workflow plugins

| Plugin | Version |
|--------|:-------:|
| **fpl-skills** | **1.24.5** (Sprint T: forge-cleanup Step 2.5 + Profile B EVID 2-step) |
| **fpl-hsmem** | 2.1.0 |
| **forgeplan-workflow** | **1.10.3** (Sprint T: forgeplan_unlink MCP adopted) |
```

**Why it works**: Version drift is one of the most common sources of "why is my agent behaving differently" bugs. A single authoritative table means the assistant always knows what version is installed, and team members know what to expect. Bold for actively-changed entries makes the diff visible at a glance.

## Pattern 4 — Rolling anomaly catalog

**Rule**: Keep a numbered anomaly log. Mark resolved ones RESOLVED; append new ones with fresh numbers. Do not delete old entries — keep them as a record.

**Example:**

```markdown
| # | Anomaly | Status |
|---|---------|--------|
| 21 | Sprint Q sub-agent false-success on `memory: project` | RESOLVED (Sprint R) |
| 25 | `forgeplan_score` returns r_eff=0 for leaf EVIDs | Filed upstream #325 |
| 27 | LR-8 lint rule missing — Profile A canon not enforced in CI | RESOLVED (Sprint W) |
| 28 | Canonical frontmatter schema missing `skills:`, `maxTurns:` fields | RESOLVED (Sprint W) |
```

**Why it works**: Known bugs and workarounds are invisible without a catalog. When the same anomaly surfaces again — or when you file an upstream issue — you have a record of when it first appeared, what the workaround was, and whether it was ever fixed. The rolling numbering means entries are stable references ("see Anomaly #21").

## Pattern 5 — Explicit Forbidden section

**Rule**: Write a short, absolute list of forbidden operations. No hedging, no "try to avoid" — use "NEVER" or "do not" imperatives.

**Example:**

```markdown
## Forbidden

- `git push --force` — NEVER.
- `git push origin main` / `git push origin dev` — only through a PR.
- `git add .` / `git add -A` — stage specific files only.
- `--no-verify` — do not skip hooks.
- Merging without green CI.
- Files containing secrets (`.env`, credentials, tokens).
```

**Why it works**: Positive rules ("do X this way") are necessary but not sufficient. Without an explicit forbidden list, the assistant will make judgment calls — and judgment calls on safety-critical operations (force push, secret commits) are not acceptable. The forbidden list is the cheapest safety gate in your entire workflow.

## Pattern 6 — Artifact cross-references

**Rule**: When a rule originates from a recorded decision, cite the artifact. Do not re-explain the decision in CLAUDE.md — just link to where it lives.

**Example:**

```markdown
## Forgeplan Integration

**Canonical architecture (read first for understanding pipeline)**

| Artifact | Purpose |
|---|---|
| **PRD-024** (active) | Full SDLC Pipeline with Quality Gates — 9 phases, 9 kinds, 3 entrypoints |
| **ADR-005** (active, supersedes ADR-004) | Keep `/forge-cycle` and `/autorun` distinct |
| **NOTE-004** (active) | Gas Town and Ruflo architectural patterns — what to adopt, what to reject |
```

**Why it works**: CLAUDE.md is not the right place to write long rationales. Cross-referencing artifacts means the rule stays concise in CLAUDE.md while the full context lives in its proper home. It also means the assistant knows exactly where to look when asked "why is this rule here?"

## Pattern 7 — Communication style rules near the top

**Rule**: Put communication style rules in the top third of the file, before workflow and reference sections.

**Example:**

```markdown
## User-facing communication style

Write like a PM talking to a PM, not like an engineer talking to an engineer.
Internal methodology terms stay in forgeplan artifacts; give the user the outcome.

### Principles

1. One language per reply. If the conversation is in Russian, write in Russian.
2. Conclusion first, justification second.
3. Short concrete phrases. "Waiting on the forgeplan core team" not "awaiting upstream triage".
```

**Why it works**: Communication style shapes every reply. If it is buried after 300 lines of sprint history, it is effectively invisible — the assistant's context window is finite and earlier content has higher weight. High-leverage rules belong near the top.

## Pattern 8 — Quick Reference section for common commands

**Rule**: Add a compact Quick Reference block with the 5-10 commands used most often in the project. Use bash code blocks.

**Example:**

```bash
# Workflow
git checkout -b feat/my-feature
git push -u origin feat/my-feature
gh pr create

# Inspection
gh pr checks <N>

# Validation
./scripts/validate-all-plugins.sh
```

**Why it works**: Common commands do not require explanation — they require recall. A quick reference block eliminates the cognitive overhead of remembering exact flags and script names. It is the one section where brevity beats completeness.

## Related

- `structure.md` — where to place each pattern in the file anatomy
- `antipatterns.md` — the failure mode corresponding to each pattern
- `examples.md` — these patterns shown in annotated real-world CLAUDE.md files
- `basics.md` — what belongs vs what does not belong in CLAUDE.md
