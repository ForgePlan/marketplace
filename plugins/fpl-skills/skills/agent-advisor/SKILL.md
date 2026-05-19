---
name: agent-advisor
description: Recommends the right canonical agent (or set of agents) for a described engineering task. Consults the `mm-agent-selection` mental model in Hindsight when available, falls back to embedded knowledge of the 17 forgeplan-aware canonical agents + their CRUD-R-A profile matrix (PRD-026). Returns a structured recommendation — primary agent, optional secondaries, profile letter, short rationale, and a ready-to-paste `Task({ subagent_type: ... })` invocation snippet. Use when the user describes a task in natural language and asks "which agent should I use?", or when you (Claude) want to dispatch the right specialist for a phase but are not 100% sure of the canonical mapping. Triggers (EN/RU) — "which agent for", "recommend agent", "what agent should I use", "agent for this task", "какого агента", "посоветуй агента", "/agent-advisor".
---

# agent-advisor — pick the right canonical agent

A focused advisor. You give it a task description, it tells you which forgeplan-aware agent (or trio of agents) is the right fit, why, and how to dispatch them. Backed by the `mm-agent-selection` mental model when Hindsight is wired; falls back to the embedded canonical map below when not.

This skill **does not** dispatch the agent itself — it returns a recommendation. The orchestrator (you, `/forge-cycle`, `/autorun`, `/sprint`) decides whether to follow it.

---

## When to use

- User asks "which agent for X?", "посоветуй агента для Y", "what should I use for Z"
- Mid-orchestration: you (Claude) are about to dispatch a subagent and want to double-check the choice
- Sprint planning: you need to map 5 phases (shape → design → build → review → gate) to specific agents and want a grounded suggestion per phase
- Onboarding: new user wants to understand "which agent does what"

## When NOT to use

- The task is purely about plain tools (Read, Write, Bash) — no specialist needed, just do it
- The task fits a skill, not an agent (e.g., "run a sprint" → `/sprint`, not an agent dispatch)
- You already know the canonical mapping and have high confidence — don't waste a turn on advisor consultation

---

## Process

### Step 1 — Try mental model first (MCP-first)

If `mcp__plugin_fpl-hsmem_hindsight__mental_model_get` is available, fetch the live `mm-agent-selection` page:

```
mcp__plugin_fpl-hsmem_hindsight__mental_model_get(id="mm-agent-selection")
```

The page is auto-refreshed after every memory consolidation. Content has up-to-date dispatch matrix, RFC-003 Layer 2 mapping, examples per agent.

If unavailable (no Hindsight in project), continue to Step 2 with the embedded fallback below.

### Step 2 — Classify task (one-pass)

Identify the task's primary phase and any secondary phases:

| Phase signal | Words / patterns | Primary phase |
|---|---|---|
| Raw idea, vague request, "I want to build" | "идея", "want to build", "thinking about", "what if we" | brief |
| Requirements / spec writing | "spec", "PRD", "requirements", "acceptance criteria" | shape |
| Decompose epic to RFCs | "break down", "decompose", "split into tasks" | decompose |
| Architecture / design / RFC | "architecture", "RFC", "system design", "module breakdown" | design |
| Write code / implement | "implement", "code this", "write the function", "fix this bug" | build |
| Code review / audit / verify | "review", "audit", "check", "validate", "security review" | review |
| Pre-merge gate decision | "should this ship?", "gate check", "ready to activate" | gate |
| Fix metadata on existing artifact | "update status", "fix link", "deprecate", "metadata" | maintain |
| Research / explore / compare | "research", "explore", "compare", "what does X use" | research |
| Test / coverage | "tests", "coverage", "test suite", "regression" | test |

### Step 3 — Match phase to canonical agent (embedded fallback)

| Phase | Primary agent | Profile | Pack | Note |
|---|---|---|---|---|
| brief | `brief-intake` | A (creator) | agents-pro | Raw idea → Brief NOTE |
| shape | `specification` | A (creator) | agents-sparc | PRD or SPEC with SMART AC; OR `artifact-author` (generic) |
| decompose | `goal-planner` | A (creator) | agents-pro | PRD/EPIC → set of RFCs via GOAP |
| design | `architecture` | A (creator) | agents-sparc | PRD/SPEC → RFC w/ module breakdown |
| design (ADR) | `adr-architect` | A (creator) | agents-pro | MADR 3.0 for cross-cutting decisions |
| build | `coder` | C-coder | agents-core | The only profile allowed source-file mutations |
| review (code) | `code-reviewer` | B | agents-core | EVIDENCE with PASS/CONCERNS/BLOCKER |
| review (architecture) | `architect-reviewer` | B | agents-pro | RFC fitness vs parent PRD |
| review (security) | `security-expert` | B | agents-pro | OWASP/STRIDE/CWE findings |
| review (staff-level) | `system-dev` | B (staff) | agents-pro | Long-term maintainability, blast radius |
| test | `tester` | B | agents-core | Coverage delta + pass/fail/skipped/flaky |
| gate | `guardian` | B-gate | agents-pro | Pre-activation binary verdict from EVID chain |
| maintain | `artifact-maintainer` | D | agents-pro | In-place metadata fixes |
| research | `research-analyst` | C (read-only) | agents-pro | Read-only synthesis, no state mutation |
| evidence (fallback) | `evidence-recorder` | B (fallback) | agents-pro | When no kind-specialist fits |

### Step 4 — Compose recommendation

Format (concise, 5 lines max):

```
PRIMARY:  <agent-name> (Profile <X>, pack <pack>)
SECONDARY: <agent or "none">
RATIONALE: <≤2 sentences citing the phase signal and CRUD-R-A profile>
INVOKE: Task({ subagent_type: "<pack>:<agent>", prompt: "..." })
```

Example for "audit our auth chain for OWASP issues":

```
PRIMARY:  security-expert (Profile B, agents-pro)
SECONDARY: architect-reviewer (Profile B, agents-pro) — if RFC exists for auth
RATIONALE: Phase signal "audit + OWASP" maps to security review specialist; produces EVIDENCE with STRIDE/CWE findings. Architect-reviewer adds RFC-fitness pass.
INVOKE: Task({ subagent_type: "agents-pro:security-expert", prompt: "Audit auth chain for OWASP Top 10; produce EVIDENCE linked informs to PRD-XXX" })
```

### Step 5 — Multi-phase tasks: chain recommendation

If task spans phases ("research and then implement and then audit"), return a chain:

```
CHAIN (3 phases):
  1. research-analyst (Profile C) — "research auth chain prior art"
  2. coder (Profile C-coder) — "implement based on RFC after step 1 produces it"
  3. code-reviewer (Profile B) — "review the diff, produce EVIDENCE"
RATIONALE: Standard build-and-verify cycle. Dispatch sequentially; step 2 depends on step 1's research output, step 3 depends on step 2's diff.
INVOKE (step 1 first):
  Task({ subagent_type: "agents-pro:research-analyst", prompt: "..." })
```

---

## Profile letter cheat sheet

When you only remember "I need a creator agent" but forgot the name:

| Letter | Role | Generic agent | Use when |
|---|---|---|---|
| **A** | Creator (writes new artifacts) | `artifact-author` | You need a draft PRD/RFC/ADR/SPEC/NOTE/EPIC |
| **B** | Reviewer (audits + produces EVID) | `artifact-reviewer` | You need a health check, audit, code review, security review |
| **B-gate** | Pre-activation gatekeeper | `guardian` | Decide if an artifact is ready to activate |
| **C** | Read-only research | `research-analyst` | Gather context without state changes |
| **C-coder** | Source mutation only | `coder` | Write actual code, no forgeplan operations |
| **D** | Maintainer (fix existing) | `artifact-maintainer` | Update metadata, fix links, change status |

Detailed profile semantics: see `plugins/fpl-skills/AGENT-AUTHORING-GUIDE.md`.

---

## Fallback when no agent fits cleanly

If the task is genuinely uncovered by the 17 canonical agents:

1. **Check non-canonical specialists** in agents-pro (claims-authorizer, injection-analyst, pii-detector, ddd-domain-expert, microservices-architect, prompt-engineer, ml-developer, etc.) — these are NOT B2-paradigm but useful for narrow specialist work
2. **Check agents-domain** for language/framework specialists (typescript-pro, golang-pro, frontend-developer, nextjs-developer, mobile-app-developer, etc.)
3. **Check agents-github** for repo operations (issue-manager, pr-manager, release-manager, etc.)
4. **Recommend creating a project-scoped agent** via the `project-agent-matrix.yaml` override mechanism if the task is recurring and specific to this project
5. **Browse external community catalogs** (curated, frequently updated) before authoring from scratch:
   - [VoltAgent/awesome-claude-code-subagents](https://github.com/VoltAgent/awesome-claude-code-subagents) — curated subagent examples across domains
   - [VoltAgent/awesome-agent-skills](https://github.com/VoltAgent/awesome-agent-skills) — curated skill examples
   - [DenisSergeevitch/agents-best-practices](https://github.com/DenisSergeevitch/agents-best-practices) — best-practices guide for writing custom Claude Code agents
   - Other Claude Code marketplaces installed locally (cc-marketplace, claude-plugins-official, claude-code-workflows) — list with `ls ~/.claude/plugins/marketplaces/`

   If you find a candidate, recommend it as **suggest install** rather than auto-install (security boundary — let the user run `/plugin install <agent>` themselves).

---

## Output schema (machine-readable)

When called by an orchestrator (not human user), output as JSON for downstream parsing:

```json
{
  "primary": { "name": "security-expert", "profile": "B", "pack": "agents-pro" },
  "secondary": [{ "name": "architect-reviewer", "profile": "B", "pack": "agents-pro", "condition": "RFC exists" }],
  "rationale": "Phase signal 'audit + OWASP' maps to security-expert; architect-reviewer adds RFC-fitness pass when applicable.",
  "invoke_primary": "Task({ subagent_type: \"agents-pro:security-expert\", prompt: \"...\" })",
  "chain": null,
  "mental_model_consulted": true,
  "mental_model_id": "mm-agent-selection"
}
```

Human-facing output stays in the 5-line text format from Step 4.

---

## Anti-patterns

- ❌ **Recommending multiple agents when one suffices.** Default to single-agent answer. Add a secondary only when the task truly has two distinct phases.
- ❌ **Recommending non-canonical agent when canonical fits.** Always prefer the 17 forgeplan-aware agents — they integrate with the pipeline, produce EVIDENCE, respect profile boundaries.
- ❌ **Generic answer "use any reviewer".** Be specific — name one agent or refuse and explain why no canonical fits.
- ❌ **Dispatching the recommended agent directly.** This skill recommends, doesn't dispatch. The orchestrator (or user) decides.
- ❌ **Ignoring the mental model when it's available.** Mental model is more recent than embedded fallback; prefer it.

---

## Related skills

- [`/forge-cycle`](../../../forgeplan-workflow/) — invokes canonical agents per phase; calls `agent-advisor` internally for ambiguous phase dispatch
- [`/autorun`](../autorun/SKILL.md) — autopilot orchestrator; uses agent-advisor in ADI resolve loop when phase-to-agent mapping is unclear
- [`/forge-audit`](../../../forgeplan-workflow/) — multi-expert review; uses fixed 4-agent dispatch (code-reviewer, security-expert, architect-reviewer, tester)
- [`/sprint`](../sprint/SKILL.md) — wave-based execution; agent-advisor advises wave composition
- [`AGENT-AUTHORING-GUIDE.md`](../../AGENT-AUTHORING-GUIDE.md) — full CRUD-R-A matrix and Profile A/B/C/C-coder/D definitions

---

## Forgeplan integration (MCP-first per PRD-022)

This skill reads-only from Hindsight (`mental_model_get`) and forgeplan (`forgeplan_list` to count agents in current project's matrix override). It does NOT create artifacts, mutate links, or activate anything. Pure recommendation engine.

If recommendation leads to a forgeplan-aware agent dispatch, the orchestrator handles the lifecycle (claim → work → release → evidence) per the dispatched agent's canonical profile. See `AGENT-AUTHORING-GUIDE.md`.
