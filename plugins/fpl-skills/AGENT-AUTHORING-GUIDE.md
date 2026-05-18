# AGENT-AUTHORING-GUIDE

> **Frontmatter paradigm (B2 — current canon, verified 2026-05-18 in EVID-050)**:
> Forgeplan-aware agents use **`disallowedTools:` denylist**, NOT `tools:` allowlist.
> Reason: Anthropic issue #53865 — subagent `tools:` allowlist breaks MCP propagation
> (wildcards parse as ⚠ Unrecognized, exact enumeration is brittle, and unrecognized
> entries silently strip the entire MCP server). Default behavior is "inherit all from
> parent session" — `disallowedTools:` removes only what must not be available.
>
> **Defence-in-depth shifts to**:
> - Body Hard Rules (procedural discipline)
> - PreToolUse hooks on `.forgeplan/` paths
> - Server-side identity-tag enforcement by forgeplan MCP

Canonical pattern for **forgeplan-aware agents** in ForgePlan marketplace. Required reading before authoring or migrating any agent in `agents-pro`, `agents-core`, `agents-domain`, `agents-sparc`, or `agents-github` packs (and for project-scoped agents in `.claude/agents/`).

---

## CRUD-R-A matrix — canonical operations on forgeplan artifacts

Every forgeplan artifact (PRD/RFC/ADR/EPIC/SPEC/PROBLEM/SOLUTION/EVIDENCE/NOTE/REFRESH) has a five-operation lifecycle. Each operation has a designated agent profile:

| Operation | Profile | Generic agent (any kind) | Kind specialists (preferred when available) |
|---|---|---|---|
| **CREATE** | A | `artifact-author` (uses forgeplan_generate primary, forgeplan_new fallback) | adr-architect, specification, architecture, goal-planner, brief-intake, evidence-recorder |
| **READ** | any | (no dedicated agent — direct `forgeplan_get`) | n/a |
| **UPDATE** (metadata, links, status) | D | `artifact-maintainer` (NEW) | n/a — kind-specialists focus on CREATE |
| **REVIEW** (health/quality audit) | B | `artifact-reviewer` (NEW) | code-reviewer, security-expert, architect-reviewer, tester, system-dev — these review CODE/DESIGN/SYSTEM, not the artifact itself |
| **GATE** (activation verdict) | B gate | `guardian` | n/a |

### Why this matrix matters

1. **Dispatch clarity** — orchestrator knows which agent to send for which operation
2. **Defence-in-depth** — creator never activates own artifact (separation of duty)
3. **DRY knowledge** — kind-templates live in forgeplan binary, not duplicated across agents
4. **Fallback resilience** — generic agents work for any kind when specialist unavailable

---

This guide implements PRD-026 / Phase 1. The reference implementation lives in `forgeplan-marketplace/plugins/agents-pro/agents/adr-architect.md` (v1.1, the POC validated in EVID-040).

---

## Who is this for

- **Plugin authors** adding new agents to marketplace packs.
- **Migration owners** rewriting v1.0 generic agents to v2.0 forgeplan-aware.
- **Project owners** customising `.claude/agents/` for their domain.

Everyone else can skip this — agents authored against this guide just *work* when dispatched via `Task(subagent_type=...)` or named in `.forgeplan/project-agent-matrix.yaml`.

---

## TL;DR — the canon in 6 lines

1. **`disallowedTools` denylist is the runtime gate** — explicitly block what must not run; everything else is inherited. (B2 canon — `tools:` allowlist broke MCP propagation, see "Why disallowedTools, not tools" section.)
2. **Model is explicit** — `opus`/`sonnet`/`haiku`, never `inherit` for marketplace agents.
3. **Bilingual description** — EN + RU + Triggers, parseable by orchestrator dispatch.
4. **Body is procedural** — every MCP call mapped to a numbered step. No prose substitutes.
5. **HARD RULES are first-class** — surface invariants that the denylist cannot enforce (identity tagging, "always call X before Y").
6. **Three role profiles** — artifact-creator, consumer+EVID, read-only. Pick one. Mixing leads to drift.

---

## Layered architecture (where agents fit)

```
  /forge-cycle, /autorun, /audit           ← orchestrator (skill layer)
            │
            ▼ dispatches via Task(subagent_type=…)
  forgeplan-aware agent (this guide)
            │
            ▼ calls
  mcp__forgeplan__*  +  mcp__plugin_fpl-hsmem_hindsight__*   ← capability layer
            │
            ▼ writes
  .forgeplan/<kind>/<ID>.md   +   hindsight bank             ← persistence layer
```

The agent's *only* contract with the rest of the system is its frontmatter (what it can call, which model runs it) and its body (when to call what). Everything else is replaceable.

---

## Canonical frontmatter schema

```yaml
---
name: <kebab-case-id>                  # required, matches filename without .md
description: |                         # required, bilingual EN+RU+Triggers (see below)
  EN: <one paragraph>
  RU: <одно предложение>
  Triggers: "<phrase 1>", "<phrase 2>", "<фраза 3>"
model: opus | sonnet | haiku           # required, explicit — NEVER inherit
color: "#RRGGBB"                       # required, hex format (no named colors)
disallowedTools:                       # required, denylist (B2 canon — NOT tools: allowlist)
  - <tool-name-to-block>
  - <tool-name-to-block>
---
```

### Field rules

| Field | Rule | Why |
|---|---|---|
| `name` | kebab-case, ≤32 chars, matches filename | dispatched as `subagent_type="pack:name"` |
| `description.EN/RU` | imperative, ≤2 sentences each | shown in dispatcher pickers |
| `description.Triggers` | comma-separated quoted phrases | enables fuzzy intent matching by orchestrator |
| `model` | one of `opus`/`sonnet`/`haiku` | cost-aware dispatch (RFC-003 Layer 2) |
| `color` | hex `#RRGGBB` only | UI rendering; named colors break terminals |
| `disallowedTools` | explicit denylist of strings | **runtime gate** — blocks specific tools; all others inherited from parent session. See "Why disallowedTools, not tools" |

### `model` selection heuristic

- **`opus`** — agent makes decisions, runs ADI cycles, judges trade-offs. Examples: `adr-architect`, `pm`, `architect`, `security-expert`, `guardian`.
- **`sonnet`** — agent does mechanical work that requires structure: scaffolding, drafting, formatting, applying lints. Examples: `tech-writer`, `coder`, `tester`, `research-analyst` (when it summarises rather than reasons).
- **`haiku`** — agent does fast classification, scanning, simple yes/no. Examples: `pii-detector`, `injection-analyst` (per-input scan).

Defaulting to `opus` is wasteful; defaulting to `haiku` is unsafe. When in doubt, `sonnet`.

---

## Three role profiles

Every forgeplan-aware agent matches **exactly one** profile. The profile dictates which subset of MCP tools belongs in the whitelist. Mixing profiles in one agent means it can no longer be safely composed in the pipeline — refuse and split into two agents.

### Profile A — Artifact creator

**Examples**: `adr-architect`, `specification`, `architecture`, `goal-planner` (decomposes into RFCs), `brief-intake`.

**Responsibility**: produces a new forgeplan artifact (`prd`/`rfc`/`adr`/`spec`/`epic`/`evidence`/`note`) and links it to parents.

**Frontmatter denylist** (B2 canon — blocks what Profile A must never call; all forgeplan/hindsight read-ops and write-ops are inherited from parent session):
```yaml
model: opus
color: "#673AB7"
disallowedTools: Write, Edit, NotebookEdit, mcp__forgeplan__forgeplan_activate
```

- `Write, Edit, NotebookEdit` — forces Profile A to use `forgeplan_new`/`forgeplan_update` via MCP, never direct file writes to `.forgeplan/<kind>/`
- `forgeplan_activate` — activation is orchestrator/guardian territory (LR-5 invariant); Profile A creates artifacts in `draft` status only

**Default model**: `opus` — creating an artifact involves judging trade-offs.

### Profile B — Consumer + EVID recorder

**Examples**: `code-reviewer`, `security-expert`, `tester`, `architect-reviewer`.

**New canonical addition**: `artifact-reviewer` (Profile B generic) reviews the ARTIFACT ITSELF (schema, sections, links, freshness, R_eff trust). This is distinct from existing specialist reviewers which audit CODE (code-reviewer), SECURITY (security-expert), RFC design (architect-reviewer), TESTS (tester), or SYSTEM-WIDE (system-dev). For each lifecycle review, dispatch the right specialist — and artifact-reviewer for the artifact-level audit.

**Responsibility**: reads code or an existing artifact, produces an EVIDENCE artifact with verdict / findings.

**Frontmatter denylist** (B2 canon — blocks what Profile B must never call; all read-ops and EVID-write-ops are inherited from parent session):
```yaml
model: sonnet  # or opus for security/architecture reviewers
color: "#1976D2"
disallowedTools: Write, Edit, NotebookEdit, mcp__forgeplan__forgeplan_activate, mcp__forgeplan__forgeplan_reason, mcp__forgeplan__forgeplan_claims, mcp__plugin_fpl-hsmem_hindsight__memory_retain
```

- `Write, Edit, NotebookEdit` — Profile B must not write to `.forgeplan/<kind>/` directly; EVID creation goes through MCP. Source-file writes are only allowed for `coder`-style agents (see Profile C-coder variant)
- `forgeplan_activate` — orchestrator/guardian territory; Profile B records EVIDENCE only
- `forgeplan_reason` — ADI contract belongs to Profile A; Profile B uses mental reasoning, not ADI cycles
- `forgeplan_claims` — Profile B claims one specific artifact; no sibling-exploration needed
- `memory_retain` — auto-hooks (Stop/SessionEnd) handle Hindsight; the EVID artifact is the canonical audit record

**Default model**: `sonnet` for mechanical reviewers (lint-style: `code-reviewer`, `tester`), `opus` for reasoning reviewers (architecture, security: `security-expert`, `architect-reviewer`).

**Profile B universal HARD RULES** (lifted from batch-2 audit — bake these into every Profile B agent body):

1. **Never** use `Write`/`Edit` on `.forgeplan/<kind>/`. Use MCP.
2. **Never** call `forgeplan_reason`, `forgeplan_activate`, `forgeplan_claims`, or `memory_retain`. Whitelist forbids them; any attempt indicates an agent design flaw.
3. **Always** identity-tag `claim`/`release` with `claude-code/<ver>/<agent-name>-task-<id>`.
4. **Always** put the verdict (PASS / CONCERNS / BLOCKER) in the EVID body, not just in the orchestrator handoff. The handoff is a summary; the EVID is the audit record.
5. **Always** label Step 5 of the procedure as "mental reasoning, NOT `forgeplan_reason`". Profile B never calls ADI — that's Profile A's contract.
6. **Never** fake-pass when a scanner / runner / linter is missing. Report it as CONCERNS with "tool unavailable", not PASS.
7. **Always** include `file:line` (or test name) reference for every finding. No vague "somewhere in the auth module".

Per-agent HARD RULES extend these with role-specific invariants (e.g., security-expert adds "every finding has STRIDE/OWASP/CWE attribution"; tester adds "always report skipped/flaky tests separately").

**Profile B mental-model canonical pick** (recommended baseline per role):

| Role flavour | Canonical `mental_model_get` ID |
|---|---|
| Gate-style reviewer (architect-reviewer, guardian) | `mm-gate-failures` |
| Execution reviewer (tester, performance) | `mm-pipeline-methodology` |
| Reasoning reviewer (security-expert, ml-developer) | `mm-fpf-examples` |

Authors may override when their domain demands different priors — document the override in the agent body.

### Profile C — Read-only researcher

**Examples**: `research-analyst`, `search-specialist`, `memory-specialist`. Note: `system-dev` (staff/principal audit) was originally drafted as Profile C audit-only, but the canonical implementation (PRD-026 Phase 4) is **Profile B** — it produces an EVIDENCE artifact that the orchestrator/guardian consumes for the activation decision. Pure read-only audit agents (no EVID output) remain Profile C.

**Responsibility**: gathers context, returns synthesis to the orchestrator. Never mutates state.

**Frontmatter denylist** (B2 canon — blocks all mutation tools; read-ops and WebFetch/Search are inherited):
```yaml
model: sonnet
color: "#388E3C"
disallowedTools: Write, Edit, NotebookEdit, Bash, mcp__forgeplan__forgeplan_new, mcp__forgeplan__forgeplan_update, mcp__forgeplan__forgeplan_link, mcp__forgeplan__forgeplan_validate, mcp__forgeplan__forgeplan_activate, mcp__forgeplan__forgeplan_reason, mcp__forgeplan__forgeplan_claim, mcp__forgeplan__forgeplan_release, mcp__plugin_fpl-hsmem_hindsight__memory_retain, mcp__plugin_fpl-hsmem_hindsight__memory_set_mission, mcp__plugin_fpl-hsmem_hindsight__mental_model_create, mcp__plugin_fpl-hsmem_hindsight__mental_model_update, mcp__plugin_fpl-hsmem_hindsight__mental_model_delete
```

If the agent thinks it needs to write, it should hand findings to a Profile A/B agent via the orchestrator instead.

**Default model**: `sonnet` (summarisation) or `haiku` (single-keyword scan).

### Profile D — Maintainer (NEW)

**Purpose**: Fix existing forgeplan artifacts in-place. NOT a creator (Profile A), NOT a reviewer (Profile B), NOT read-only (Profile C). Distinct fourth profile.

**Examples**: `artifact-maintainer`

**Tools** — uses `disallowedTools` denylist (B2 paradigm):
- `disallowedTools: Write, Edit, NotebookEdit, Bash, mcp__forgeplan__forgeplan_new, mcp__forgeplan__forgeplan_activate, mcp__forgeplan__forgeplan_reason, mcp__plugin_fpl-hsmem_hindsight__memory_retain` (+ other hindsight write tools)
- **Allowed** via default inheritance: forgeplan_get, forgeplan_update, forgeplan_link, forgeplan_supersede, forgeplan_deprecate, forgeplan_validate, forgeplan_score, forgeplan_list, forgeplan_search, forgeplan_claim/release, Read/Grep/Glob, memory_recall, mental_model_get

**Key constraint**: `forgeplan_new` DENIED. Profile D is "fix what exists", never "create from scratch".

**Universal HARD RULES**:
1. **Never** call `forgeplan_new` — creation is Profile A's job
2. **Never** call `forgeplan_activate` — orchestrator/guardian territory
3. **Never** use `Write`/`Edit` on `.forgeplan/<kind>/` — LanceDB is source of truth, not .md projections (file edits silently lose vs LanceDB)
4. **Always** prefer kind-specialist if one exists — Profile D is fallback
5. **Always** verify with `forgeplan_score` after `forgeplan_update` (catches silent LanceDB lag)
6. **Never** touch artifacts >90 days old without explicit instruction (history rewrite risk)
7. **Never** semantic rewrite — use `forgeplan_supersede` if change is fundamental

**Default model**: `sonnet` — mechanical fixes don't need opus judgment.

**Step count**: 7 (claim → get → recall → apply → validate → score → release).

### Profile C-coder variant — Source mutator

A narrow exception: `coder`, `typescript-pro`, `golang-pro`, etc. — agents that write **source code**, not artifacts. This profile DOES have `Write`/`Edit`/`NotebookEdit` allowed (for source files under `src/`) — only forgeplan/hindsight mutations are denied:

```yaml
model: sonnet
color: "#388E3C"
disallowedTools: mcp__forgeplan__forgeplan_new, mcp__forgeplan__forgeplan_update, mcp__forgeplan__forgeplan_link, mcp__forgeplan__forgeplan_activate, mcp__forgeplan__forgeplan_supersede, mcp__forgeplan__forgeplan_deprecate, mcp__forgeplan__forgeplan_reason, mcp__plugin_fpl-hsmem_hindsight__memory_retain, mcp__plugin_fpl-hsmem_hindsight__memory_set_mission, mcp__plugin_fpl-hsmem_hindsight__mental_model_create, mcp__plugin_fpl-hsmem_hindsight__mental_model_update, mcp__plugin_fpl-hsmem_hindsight__mental_model_delete
# Write/Edit/Bash are NOT denied — coder writes source files.
# forgeplan_get/claim/release are inherited from parent — coder uses these.
# If the build produces evidence, a Profile B agent records it.
```

**Denied**: `forgeplan_new`/`update`/`link`/`activate`/`supersede`/`deprecate`/`reason` — coder never creates artifacts or decides artifact lifecycle.

---

## forgeplan_generate — primary creation path (NEW)

`forgeplan_generate(kind, description)` is the canonical primary path for creating artifacts. It uses the LLM provider configured in `.forgeplan/config.yaml` (Gemini Flash, OpenAI, Claude, or Ollama) to render a full body draft from natural language — leveraging forgeplan binary's per-kind template knowledge.

**Why this is the default**:

- **DRY** — kind-templates live in forgeplan binary; agents don't duplicate them
- **Speed** — ~2 sec wall-clock for full draft (vs ~30-60 sec for agent manual fill)
- **Cost** — ~$0.005-0.01 per artifact (Gemini Flash) vs ~$0.10-0.50 (Claude in subagent)
- **Quality** — Gemini Flash produces structured drafts that match schema MUST sections; agent refines

**When to use**:

- Creating standard artifacts (PRD, RFC, ADR, EPIC, SPEC, PROBLEM, SOLUTION, EVIDENCE)
- Bulk creation across kinds
- When kind-specialist doesn't exist (e.g., PROBLEM, SOLUTION, REFRESH have no dedicated agent)

**When to fall back to `forgeplan_new` + manual fill**:

- LLM provider unavailable (rate limit, auth fail, network down)
- `forgeplan_generate` doesn't support the kind (NOTE, REFRESH)
- Generated body fails `forgeplan_validate` MUST rules
- User requires hand-crafted structure (rare)

`artifact-author` agent implements the 2-path strategy automatically. Specialists (adr-architect, specification, etc.) should also adopt Step 5 forgeplan_generate as primary, with Step 6 manual refinement only when needed.

**Real example (PRD-026 dogfooding)**: PROB-001 generated via forgeplan_generate in 2 seconds with Signal/Context/Impact/Anti-Goodhart/Action Plan sections — quality sufficient as starting draft, no manual fill needed.

---

## Canonical body structure

```markdown
You are a <role>. <one-line scope>.

## Identity & audit

When invoked as a subagent, use the identity tag
`claude-code/<version>/<agent-name>-task-<task-id>`
for every `claim`/`release` call. The orchestrator passes the task id in the prompt.

## When to invoke this agent

Invoke when:
- <trigger 1>
- <trigger 2>

Do **not** invoke for:
- <anti-pattern 1>

## Forgeplan MCP usage pattern

Numbered steps, one MCP call per step.

### Step 1 — Claim
…

### Step N — Release
…

## HARD RULES

1. **Never** <invariant the whitelist cannot enforce>.
2. **Always** <invariant the whitelist cannot enforce>.
…

## Output to orchestrator

Return a short structured handoff (5–8 lines, no prose).

## Common failures (and how to avoid them)

| Failure | Avoidance |
|---|---|
| <failure> | <one-line mitigation> |
```

### Body length budget

| Section | Lines (approx) |
|---|---|
| Header + Identity | 5–10 |
| When to invoke | 10–20 |
| MCP usage pattern | 60–120 (most of the body) |
| HARD RULES | 5–10 |
| Output | 5–15 |
| Common failures | 5–15 |
| **Total** | **100–200** |

If your agent body exceeds 250 lines, split the procedural detail into a skill and link to it. Body bloat means the agent is doing two jobs.

---

## HARD RULES — what to put there

The whitelist enforces *what tools the agent can call*. HARD RULES enforce *how it calls them*. Put rules here only when:

1. The whitelist allows a tool but a specific call shape is required (e.g., `claim` is allowed but must include identity).
2. A sequence is required (e.g., "always call `forgeplan_reason` before `forgeplan_new(kind=adr)`").
3. A combination is forbidden (e.g., "never activate without linked EVIDENCE").

Anti-pattern: putting prose-only conventions like "use clear titles" in HARD RULES. That belongs in a style guide, not a load-bearing invariant.

### HARD RULES voice convention

Use **plain bold** (`**Never**` / `**Always**`) for each numbered rule. Reserve severity icons (🔴 / 🟠 / 🟡 / 🔵) for **inline body callouts** — e.g., next to a particular step or inside a "common failures" cell — not as bullet prefixes for the HARD RULES list itself. This keeps the rule list visually consistent across the marketplace, and the icons retain meaning when they appear (a 🔴 in body text is a load-bearing red flag, not a list ornament).

Correct:
```
1. **Never** use Write/Edit on .forgeplan/<kind>/.
2. **Always** identity-tag claim/release.
```

Incorrect:
```
1. 🔴 **Never** use Write/Edit on .forgeplan/<kind>/.
2. 🟠 **Always** identity-tag claim/release.
```

---

## Identity tagging — non-negotiable

Every `forgeplan_claim` / `forgeplan_release` call **must** pass an `agent` parameter:

```
claude-code/<cli-version>/<agent-name>-task-<task-id>
```

- `<cli-version>` — e.g. `2.1.143` (from CLI environment, orchestrator can pass).
- `<agent-name>` — exact `name:` from frontmatter, e.g. `adr-architect`.
- `<task-id>` — orchestrator-assigned; for direct invocation, generate a UUIDv4 short prefix.

Why: the activity log uses this for attribution. Anonymous claims are rejected by reviewer agents (and will fail the canonical-pattern lint rule once it ships).

---

## Lessons from the POC (EVID-040) and B2 shift (EVID-050)

The reference implementation taught us:

1. **`disallowedTools` denylist is the correct runtime gate** (B2 canon, EVID-050). The original `tools:` allowlist physically broke MCP propagation (Anthropic #53865) — wildcards silently stripped entire MCP servers. Denylisting what must not run, while inheriting everything else, restores working MCP without brittle enumeration.
2. **Identity tagging belongs in the body** — `forgeplan_claim` is inherited from parent session but cannot auto-enforce that `agent=` is set. HARD RULES rule 3 must reject anonymous claims.
3. **`forgeplan_reason` must be gated as mandatory** for Profile A agents. Without an explicit "must call before choosing" rule, agents skip the ADI cycle when they "already know the answer".
4. **Profile surface sizes stay conceptually the same** — Profile A needs forgeplan write-ops + hindsight recall; Profile B drops `activate`/`reason`; Profile C uses `search`/`list`/`recall` only. The difference is now expressed as a denylist rather than an allowlist.
5. **Bash is rarely needed**. Read/Grep/Glob cover most cross-reference work. Skip Bash unless the agent runs tests or scanners (Profile B).
6. **Templates inline, not in skills.** A MADR 3.0 template lives in the `adr-architect` body, not in a separate skill — keeps the agent self-contained.
7. **`forgeplan_claims` exploration is Profile A only.** Profile B claims one specific artifact — no sibling-exploration needed. Deny it in Profile B denylist.

---

## Decision tree — which tools does my agent need?

```
START: what does the agent produce?
  │
  ├─ A new forgeplan artifact (PRD/RFC/ADR/SPEC/EPIC)
  │     └─ Profile A. Tools: 13 MCP + Read/Grep/Glob.
  │
  ├─ An EVIDENCE attached to existing artifact (verdict / findings)
  │     └─ Profile B. Tools: 9 MCP + Read/Grep/Glob/Bash.
  │
  ├─ A summary / synthesis returned to the orchestrator (no persistence)
  │     └─ Profile C. Tools: 6 MCP (read-only) + Read/Grep/Glob (+ WebFetch/Search optional).
  │
  ├─ Source code under src/ (real implementation)
  │     └─ Profile C-coder. Tools: Read/Grep/Glob/Write/Edit/Bash + 3 MCP (get/claim/release).
  │
  └─ A side-effect on the world (deploy, push, send-msg)
        └─ STOP. This is orchestrator territory, not an agent.
           Surface it as an approval gate in the orchestrator skill, not as a subagent.
```

---

## Why disallowedTools, not tools (canon decision)

**Background**: The natural intuition is to use `tools:` allowlist for runtime security — explicitly enumerate what the agent CAN call. This is what we tried first.

**What broke**: Anthropic Claude Code v2.1.143 has open issue #53865 — subagent `tools:` field requires exact tool-name match. Wildcards (`mcp__forgeplan__*`) parse as "⚠ Unrecognized" and silently filter out the ENTIRE MCP server. Even explicit enumeration was unreliable because Task-dispatched subagents inherit MCP from parent by default, but `tools:` strips this inheritance the moment it's specified.

**Live evidence**: PRD-026 SC-8 smoke (EVID-049 / EVID-050):
- Pre-B2: subagent dispatch yielded 0/9 successful MCP calls (canon discipline forced refusal, no Write/Edit fallback — early detection of upstream blocker)
- Post-B2: subagent dispatch successfully called `mcp__forgeplan__forgeplan_claim` AND `mcp__plugin_fpl-hsmem_hindsight__memory_status` (EVID-050 verdict: B2 FIX WORKS)

**Trade-off accepted**:
- **Lost**: explicit positive-allow runtime gate (was already broken by #53865 anyway)
- **Kept**: body Hard Rules + PreToolUse hooks + server-side identity-tag enforcement
- **Gained**: actual working MCP propagation for canonical agents

When Anthropic fixes #53865, we can re-evaluate adding `tools:` enumeration for tighter scoping — but only as additive layer atop `disallowedTools:`, not replacement.

---

## Validation

Before submitting a PR with a new or migrated agent:

```bash
# 1. Frontmatter parses + schema-conformant (B2 canon: disallowedTools, not tools)
python3 -c "
import re, yaml, sys
text = open('plugins/<pack>/agents/<name>.md').read()
fm = yaml.safe_load(re.match(r'^---\n(.*?)\n---', text, re.S).group(1))
for k in ['name','description','model','color','disallowedTools']:
    assert k in fm, f'missing {k}'
assert fm['model'] in ('opus','sonnet','haiku'), f'bad model {fm[\"model\"]}'
# disallowedTools may be a list OR a comma-separated string
dt = fm['disallowedTools']
assert isinstance(dt, (list, str)) and dt, 'disallowedTools must be non-empty'
assert 'tools' not in fm, 'tools: allowlist found — migrate to disallowedTools: denylist (B2 canon)'
assert all(s in fm['description'] for s in ('EN:','RU:','Triggers:'))
print('PASS')
"

# 2. Validator
./scripts/validate-all-plugins.sh <pack>

# 3. Smoke test (optional, but recommended)
# Have the orchestrator dispatch a task and observe MCP calls:
#   - claim with identity tag
#   - get parent
#   - recall + mental_model_get
#   - reason (Profile A only)
#   - new + update + link
#   - validate
#   - release
```

A canonical-pattern lint rule will be added to `validate-all-plugins.sh` once the top-10 migration completes (PRD-026 Phase 3+1 lint). Until then, the python snippet above is the gate.

---

## Worked examples

### Profile A — `adr-architect` (reference implementation)

See `forgeplan-marketplace/plugins/agents-pro/agents/adr-architect.md` (v1.1, 16 tools, model=opus, MADR 3.0 template inlined). EVID-040 documents the migration audit.

### Profile B — `code-reviewer` (sketch)

```yaml
---
name: code-reviewer
description: |
  EN: Reviews code diffs and produces EVIDENCE with verdict (pass/concerns/blocker) + findings.
  RU: Ревьюит diff и пишет EVIDENCE с verdict + findings.
  Triggers: "review this PR", "code review", "ревью кода"
model: sonnet
color: "#E53935"
disallowedTools: Write, Edit, NotebookEdit, mcp__forgeplan__forgeplan_activate, mcp__forgeplan__forgeplan_reason, mcp__forgeplan__forgeplan_claims, mcp__plugin_fpl-hsmem_hindsight__memory_retain
---
```

Body procedure: claim parent → get parent body → run lints/tests via Bash → `forgeplan_new(kind="evidence")` → fill verdict + findings → link `informs` to parent → validate → release.

### Profile C — `research-analyst` (sketch)

```yaml
---
name: research-analyst
description: |
  EN: Gathers external + internal context, returns synthesis. Read-only.
  RU: Собирает внешний и внутренний контекст, возвращает синтез. Read-only.
  Triggers: "research", "compare alternatives", "найди prior art"
model: sonnet
color: "#1E88E5"
disallowedTools: Write, Edit, NotebookEdit, Bash, mcp__forgeplan__forgeplan_new, mcp__forgeplan__forgeplan_update, mcp__forgeplan__forgeplan_link, mcp__forgeplan__forgeplan_validate, mcp__forgeplan__forgeplan_activate, mcp__forgeplan__forgeplan_reason, mcp__forgeplan__forgeplan_claim, mcp__forgeplan__forgeplan_release, mcp__plugin_fpl-hsmem_hindsight__memory_retain, mcp__plugin_fpl-hsmem_hindsight__memory_set_mission, mcp__plugin_fpl-hsmem_hindsight__mental_model_create, mcp__plugin_fpl-hsmem_hindsight__mental_model_update, mcp__plugin_fpl-hsmem_hindsight__mental_model_delete
---
```

Body procedure: clarify question → recall + reflect → search artifacts via `forgeplan_search` → WebFetch/Search for external prior art → synthesise → return structured handoff to orchestrator. **No mutations.**

---

## Migration checklist (for existing v1.0 agents)

When migrating an existing agent from generic v1.0 to canonical v2.0:

- [ ] Pick the profile (A / B / C / C-coder)
- [ ] Replace `model: inherit` with explicit `opus`/`sonnet`/`haiku`
- [ ] Replace `description: <single line>` with bilingual EN+RU+Triggers
- [ ] Replace `color: red` (named) with hex `#RRGGBB`
- [ ] Replace `tools:` allowlist (v1.0 / B1 paradigm) with `disallowedTools:` denylist using the profile-specific blocked set (B2 canon)
- [ ] Rewrite body around the **9-step MCP usage pattern** (Profile A) or **6-step EVID pattern** (Profile B) or **synthesis pattern** (Profile C)
- [ ] Add **Identity & audit** section near the top
- [ ] Add **HARD RULES** section with the 3–7 invariants the whitelist cannot enforce
- [ ] Add **Output to orchestrator** section with the structured handoff template
- [ ] Bump plugin `version` (minor when one agent migrates; major when --strict lint enforces)
- [ ] Update marketplace catalog version
- [ ] Run `validate-all-plugins.sh <pack>` → ALL PASSED
- [ ] Create EVIDENCE artifact recording the migration (audit trail)
- [ ] Link EVIDENCE to the relevant PRD-026 phase
- [ ] Run frontmatter audit snippet → PASS

When a migration deviates from this checklist, document the deviation in the EVIDENCE artifact body so the next author sees the precedent.

---

## YAML freshness model (PRD-026 Phase 6)

Two project-level YAML files coexist at `.forgeplan/`:

- `project-agent-matrix.yaml` — orchestrator dispatch directives
- `project-config.yaml` — depth defaults + autonomy + quality_gates + branch policy

Different consumers read them with different freshness semantics:

| Consumer | File | Freshness | Why |
|---|---|---|---|
| `/forge-cycle` (orchestrator) | `project-agent-matrix.yaml` | **Read once per cycle** — load at Step 0.5, hold in memory for all phases | Dispatch is the cycle's hot path; reading per-phase is wasteful + risks mid-cycle inconsistency |
| `/autorun` (orchestrator) | `project-config.yaml` (autonomy section) | **Read once per session** — load at autonomy gate init, applied on every operation | Autonomy is a session-level contract; mid-session config edits would surprise the user |
| `guardian` (Profile B agent) | `project-config.yaml` (quality_gates section) | **Read fresh per dispatch** — each guardian invocation re-reads | Quality gates can tighten between gate decisions; guardian must reflect the current rules |
| Other Profile B agents (when consuming config) | `project-config.yaml` | **Read fresh per dispatch** | Same reasoning as guardian |

**Implication for authors**: if your agent reads `project-config.yaml`, default to **read-fresh-per-dispatch**. Use the orchestrator "read-once" pattern only when you're the long-running owner of the operation (forge-cycle owns the cycle; autorun owns the session). Otherwise, fresh reads keep you honest about user edits.

## Pipeline phase ↔ orchestrator step mapping

`/forge-cycle` uses sequential numbered Steps (1-9 in the SKILL.md narrative) but dispatches per the 11 canonical phases defined in `project-agent-matrix.yaml`. The mapping is documented in `forge-cycle.md` Step 0.5; the canonical list (RFC-002):

| Canonical phase | forge-cycle Step | Default agent (matrix) | Methodology |
|---|---|---|---|
| `brief` | Step 1 (when raw idea) | `agents-pro:brief-intake` | fpf |
| `shape` | Step 2 | `agents-sparc:specification` | sparc |
| `decompose` | Step 3 (deep+) | `agents-pro:goal-planner` | fpf |
| `design` | Step 4 | `agents-sparc:architecture` | sparc |
| `estimate` | inline (deep+) | inline | none |
| `gate` | Step 5 | `agents-pro:guardian` | fpf |
| `build` | Step 6 | `agents-core:coder` | tdd-london |
| `audit` | Step 7 (parallel) | 5 Profile B reviewers | fpf (merger) |
| `evidence` | inline (per Profile B) | `agents-pro:evidence-recorder` (fallback) | none |
| `activate` | Step 8 | `agents-pro:guardian` (final gate) | fpf |
| `wrap` | Step 9 (deep+) | inline | none |

A future RFC-005 will formalise this mapping; for now this table is the contract.

---

## When to break the canon

Three situations justify deviating from this guide:

1. **Cross-CLI agent.** When the agent must run identically under Gemini CLI / Codex CLI, follow `AGENTS.md` interop standard instead — the MCP surface differs.
2. **Orchestrator-internal helper.** Agents called only by a single skill (never by the user, never by `/forge-cycle`) can skip identity tagging if the skill provides its own audit.
3. **Experimental research agent.** Mark with `keywords: ["experimental"]` in plugin.json and skip the lint rule. Move to canon before promoting to the marketplace.

**Profile D note**: Profile D (artifact-maintainer) is a NEW profile introduced in this guide revision. It's distinct from A/B/C and addresses metadata maintenance — a gap discovered during PRD-026 implementation when 5 of 10 subagents falsely reported success on EVID body edits (they wrote .md projection files instead of LanceDB because their profile lacked forgeplan_update). Profile D's identity is "fix what exists in-place".

Anything else — follow the canon. Drift compounds, and "we'll fix it later" rarely happens.

---

## References

- **PRD-026** — Forgeplan-aware agent layer (canonical pattern + project config + fpl-init v2.0)
- **EVID-040** — POC migration audit (adr-architect v1.0 → v1.1)
- **EVID-049** — SC-8 smoke pre-B2 (0/9 MCP calls — upstream blocker detected)
- **EVID-050** — SC-8 smoke post-B2 (B2 FIX WORKS — `disallowedTools` restores MCP propagation, 2026-05-18)
- **MASTER-REFERENCE.md** — 7-layer architecture context, project root
- **NOTE-006** — Agent layer integration research synthesis
- **RFC-003** — Multi-agent multi-CLI architecture (Layer 2 Agent Pack Dispatch)
- **agents-pro/agents/adr-architect.md** — reference implementation (Profile A)
