[English](PLAYBOOK.md) | [Русский](PLAYBOOK-RU.md)

# Playbook — Which command for which scenario

A practical map of "I have this situation → here's the setup, here's the command". Pair with [DEVELOPER-JOURNEY.md](DEVELOPER-JOURNEY.md) (narrative onboarding) and [USAGE-GUIDE.md](USAGE-GUIDE.md) (reference manual).

---

## Quick decision matrix

| Your situation | Setup needed | Command to run |
|---|---|---|
| Empty project, no idea yet | `fpl-skills` | `/fpl-init` then `/research <topic>` |
| Empty project, raw idea | `fpl-skills` + `forgeplan-workflow` | `/fpl-init` → `/shape "<idea>"` → `/forge-cycle` |
| Existing project, want to ship a feature | `fpl-skills` + `forgeplan-workflow` | `/forge-cycle "<task>"` (one command, full lifecycle) |
| Existing project, want overnight unattended run | + `agents-sparc` + `agents-pro` | `/autorun "<task>"` (delegates to `/forge-cycle`) |
| Brownfield (legacy code + docs) | + `forgeplan-brownfield-pack` | Discover Agent → playbooks → `/forge-cycle` |
| Plan exists but is rough | `fpl-skills` | `/refine <plan>` |
| Need decision between alternatives | `fpf` plugin | `/fpf-evaluate "A vs B"` |
| Hard bug | `fpl-skills` | `/diagnose "<bug>"` |
| Code review before merge | `fpl-skills` | `/audit` |
| Multi-session team work | + `forgeplan-orchestra` | `/session` → `/sync` |

---

## Use-case 1 — Empty project, raw idea

**Scenario**: You created a new git repo, you have an idea in your head, you want to end up with a working feature plus forgeplan artifacts (PRD, ADR, evidence).

**Setup** (one-time):
```bash
brew install ForgePlan/tap/forgeplan        # CLI
```

```
/plugin install fpl-skills@ForgePlan-marketplace
/plugin install forgeplan-workflow@ForgePlan-marketplace
/reload-plugins
```

**Workflow**:
```
/fpl-init                        # Step 1: bootstrap project (.forgeplan/, CLAUDE.md, docs/agents/)
/shape "<your idea>"             # Step 2: interview from scratch → draft PRD
/refine PRD-NNN                  # Step 3: polish, add ADRs for key decisions
/forge-cycle "<refined task>"    # Step 4: full automated cycle (route → build → evidence → activate)
```

If you want to skip the interview and go full auto:
```
/fpl-init
/autorun "<idea>"                # delegates to /forge-cycle which handles shaping internally
```

---

## Use-case 2 — Interview-driven feature shaping

**Scenario**: You have a fuzzy idea, you want a structured artifact, you want to be **asked the right questions** rather than fill out a template alone.

**Setup**:
```
/plugin install fpl-skills@ForgePlan-marketplace
```

**Workflow**:
```
/shape "<rough description>"     # interview, one question at a time
                                 # outputs: draft PRD with problem/goals/users/scope/risks
```

`/shape` asks 8-12 focused questions, stress-tests thin answers, surfaces contradictions immediately, and writes a forgeplan PRD draft (or markdown if forgeplan CLI is missing). It's the **front-end** of the lifecycle — `/refine` is for polishing what you already wrote, `/shape` writes it with you.

After `/shape`:
```
/refine PRD-NNN                  # add ADRs, sharpen FRs
/research <open question>        # if /shape surfaced uncertainty
/rfc create                      # if architecture deserves an RFC
```

---

## Use-case 3 — Full automation with AgentTeams

**Scenario**: You want one command that does the whole thing — shaping, planning, building with a team of agents, auditing, evidence, activation. Hands-off.

**Setup**:
```
/plugin install fpl-skills@ForgePlan-marketplace
/plugin install forgeplan-workflow@ForgePlan-marketplace
/plugin install agents-sparc@ForgePlan-marketplace
/plugin install agents-core@ForgePlan-marketplace
/plugin install agents-pro@ForgePlan-marketplace
/reload-plugins
```

**Workflow** (single command):
```
/autorun "implement <task>"
```

**What happens under the hood**:
```
/autorun
  ├── detects forgeplan-workflow installed
  └── delegates to /forge-cycle
        ├── Step 1 — health check (forgeplan health)
        ├── Step 2 — task confirmation
        ├── Step 3 — route (decides depth)
        ├── Step 4 — shape (PRD, validate)
        │   └── if Deep: ADI mandatory (forgeplan reason → 3+ hypotheses)
        ├── Step 5 — build → /sprint
        │   ├── TeamCreate(team-lead + 5-8 teammates in 2-5 waves)
        │   ├── if Deep: SPARC phases (Spec → Pseudocode → Architecture → Refinement)
        │   └── each teammate spawns sub-agents from agents-pro/domain
        ├── Step 6 — audit (4-6 reviewers in parallel)
        ├── Step 7 — evidence (verdict + congruence_level + R_eff scoring)
        └── Step 8 — activate + prepare commit
```

Red lines (push to main, secrets writes, deploys) **stop autopilot** and ask for explicit approval.

---

## Use-case 4 — Brownfield migration

**Scenario**: You inherited a legacy codebase plus a pile of existing docs (Obsidian vault, MADR ADRs, Confluence dumps). You want to ingest the knowledge into a forgeplan artifact graph.

**Setup**:
```
/plugin install fpl-skills@ForgePlan-marketplace
/plugin install forgeplan-workflow@ForgePlan-marketplace
/plugin install forgeplan-brownfield-pack@ForgePlan-marketplace
/reload-plugins
```

**Available now** (after the brownfield port — see [PR #41 plan](#)):
- 12 extraction skills (ubiquitous-language, use-case-miner, intent-inferrer, invariant-detector, causal-linker, hypothesis-triangulator, interview-packager, scenario-writer, kg-curator, canonical-reproducer, reproducibility-validator, rag-packager)
- Orchestration playbooks (extract-business-logic, phase-transitions)
- Integration recipes (autoresearch-hooks, forgeplan-mcp-additions, rag-export-format)
- Two-tier methodology (Factum vs Intent) with confidence taxonomy
- Mappings: C4 → forgeplan, DDD → forgeplan

**Two-tier extraction**:
- **Tier 1 — Factum**: what code does, provable by reading. 100% confidence, verifiable via re-grep.
- **Tier 2 — Intent**: why the business chose this implementation. Variable confidence (verified / strong-inferred / inferred / speculation / unknown). Each claim tagged.

**Workflow**:
```
/fpl-init                                     # if not already done
# Run Discover Agent (standalone in agents/discover/) for codebase map
# Then chain extraction skills:
/extract ubiquitous-language                  # build domain glossary
/extract use-cases                            # find user-facing scenarios
/extract intent --confidence-tagged           # infer business why
/extract invariants                           # detect rules that always hold
/triangulate hypotheses                       # ADI cycle on uncertain claims
/interview <domain owner>                     # validate intent claims
/forge-cycle "<reproduce key flow>"           # canonical reproduction
```

The output is a forgeplan graph populated with PRDs, RFCs, ADRs derived from the brownfield code and docs.

---

## Use-case 5 — Night-run with full methodology

**Scenario**: You want to start a complex task before bed, wake up to a finished feature with full methodology applied (SPARC for code, ADI for decisions, evidence with R_eff).

**Setup** (full stack):
```
/plugin install fpl-skills@ForgePlan-marketplace
/plugin install forgeplan-workflow@ForgePlan-marketplace
/plugin install fpf@ForgePlan-marketplace
/plugin install agents-sparc@ForgePlan-marketplace
/plugin install agents-core@ForgePlan-marketplace
/plugin install agents-pro@ForgePlan-marketplace
/reload-plugins
```

**Before sleep**:
```
/autorun "implement <complex task> with deep methodology"
```

**What runs unattended**:
- `forgeplan health` first — surfaces blind spots before starting
- Route → if Deep, ADI required (forgeplan reason → 3+ hypotheses with deduction → induction)
- Shape → PRD + RFC + ADR with BMAD validation rules (built into `forgeplan validate`)
- Build → SPARC phases via agents-sparc; each phase delegates to domain agents from agents-pro
- Audit → 4-6 expert reviewers (logic, architecture, security, tests; +ux-reviewer if frontend)
- Evidence → R_eff scoring with CL penalties (CL3 same-context = best, CL0 opposing = penalty 0.9)
- Activate → if R_eff > 0; otherwise stops and surfaces missing evidence
- Commit prepared with `Refs: PRD-NNN, ADR-MMM`

**What stops autopilot** (red lines):
- `git push --force` or push to main
- Secret writes (any value matching `sk-*`, `AIza*`, `ant-*`)
- Destructive ops (`rm -rf`, `DROP TABLE`)
- Cross-system effects (deploy, package publish)
- Cost-bearing operations (mass LLM calls beyond a threshold)

When you wake up: check `forgeplan health` and `git log` to see what shipped vs stopped.

---

## Use-case 6 — When `/fpf` and ADI fit

**Scenario**: You're not running the full lifecycle — you just need structured thinking on a specific question.

| Question shape | Command |
|---|---|
| "How should I decompose this system?" | `/fpf-decompose "<system>"` — bounded contexts table + Mermaid |
| "Which option should I pick — A vs B?" | `/fpf-evaluate "A vs B"` — F-G-R scoring + ADI 3+ hypotheses |
| "Why is this happening?" (debug) | `/fpf-reason "<symptom>"` — abduction → deduction → induction |
| "What does <FPF concept> mean?" | `/fpf-lookup "<term>"` — 224 spec sections in agentic RAG |

**ADI is also automatic**:
- In `/forge-cycle` Step 4 (Reason) for Deep+ depth tasks
- In `/autorun` to resolve blockers (3 rounds max, then surface)
- Required by `forgeplan reason PRD-NNN` for Standard+ activation

So you don't always need to invoke `/fpf-reason` directly — if you're using `/forge-cycle` or `/autorun`, ADI is enforced behind the scenes.

---

## Use-case 7 — Multi-session team coordination

**Scenario**: You and your team work across sessions. Tasks live in Orchestra. You need an inbox-style triage every morning.

**Setup**:
```
/plugin install fpl-skills@ForgePlan-marketplace
/plugin install forgeplan-orchestra@ForgePlan-marketplace
/reload-plugins
```

**Daily workflow**:
```
/session                         # Inbox Pattern: forgeplan health + Orchestra messages + git changes + triage
/sync                            # Bidirectional Forgeplan ↔ Orchestra (Status ↔ Phase mapping)
# Pick a task from inbox synthesis
/forge-cycle "<task>"            # full lifecycle as in use-case 3
```

Status mapping:
- Orchestra `Backlog` ↔ Forgeplan `Shape`
- Orchestra `To Do` ↔ Forgeplan `Validate`
- Orchestra `Doing` ↔ Forgeplan `Code`
- Orchestra `Review` ↔ Forgeplan `Evidence`
- Orchestra `Done` ↔ Forgeplan `Done`

---

## Recommended stacks (by persona)

| Persona | Plugins |
|---|---|
| 🟢 Solo developer | `fpl-skills` + `forgeplan-workflow` |
| 🎨 Frontend developer | + `laws-of-ux` + `agents-domain` |
| 🏛 Architect / tech lead | + `fpf` + `agents-sparc` + `agents-pro` |
| 👥 Team with Orchestra | + `forgeplan-orchestra` |
| 🏚 Brownfield migration | + `forgeplan-brownfield-pack` + `agents-pro` |
| 🌙 Night-run / autopilot | All of the above (full stack) |

---

## See also

- [DEVELOPER-JOURNEY.md](DEVELOPER-JOURNEY.md) — narrative onboarding with 4 personas
- [USAGE-GUIDE.md](USAGE-GUIDE.md) — reference manual: every command, hook, troubleshooting
- [METHODOLOGIES.md](METHODOLOGIES.md) — what's built into forgeplan (BMAD, OpenSpec, ADI, F-G-R, DDR, etc.) vs what's external
- [ARCHITECTURE.md](ARCHITECTURE.md) — 4-layer mental model
- [MIGRATION-DEV-TOOLKIT-TO-FPL-SKILLS.md](MIGRATION-DEV-TOOLKIT-TO-FPL-SKILLS.md) — switching from legacy
- [TRACKER-INTEGRATION.md](TRACKER-INTEGRATION.md) — Orchestra / GitHub / Linear / Jira recipes
- [FORGEPLAN-WEB.md](FORGEPLAN-WEB.md) — browser viewer with time-travel
