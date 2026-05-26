[English](PLAYBOOK.md) | [Русский](PLAYBOOK-RU.md)

# Playbook — Which command for which scenario

A practical map of "I have this situation → here's the setup, here's the command". Pair with [DEVELOPER-JOURNEY.md](DEVELOPER-JOURNEY.md) (narrative onboarding) and [USAGE-GUIDE.md](USAGE-GUIDE.md) (reference manual).

---

## Quick decision matrix

| Your situation | Setup needed | Command to run |
|---|---|---|
| **I don't know which methodology to apply / where to start** | `fpl-skills` | `/smith` — meta-router that reads project state and dispatches the right command (see [SMITH.md](SMITH.md)) |
| Empty project, no idea yet | `fpl-skills` | `/smith-bootstrap` (greenfield pre-flight + scaffold) then `/research <topic>` |
| Empty project, raw idea | `fpl-skills` + `forgeplan-workflow` | `/smith-bootstrap` → `/shape "<idea>"` → `/forge-cycle` |
| Existing project, want to ship a feature | `fpl-skills` + `forgeplan-workflow` | `/forge-cycle "<task>"` (one command, full lifecycle) |
| Existing project, want overnight unattended run | + `agents-sparc` + `agents-pro` | `/autorun "<task>"` (delegates to `/forge-cycle`) |
| Brownfield (legacy code + docs) | + `forgeplan-brownfield-pack` | `/smith` (default mode routes to brownfield) → Discover Agent → `/forge-cycle` |
| Plan exists but is rough | `fpl-skills` | `/refine <plan>` |
| Need decision between alternatives | `fpf` plugin | `/fpf-evaluate "A vs B"` |
| Hard bug | `fpl-skills` | `/diagnose "<bug>"` |
| Code review before merge | `fpl-skills` | `/audit` |
| Multi-session team work, "where did we leave off" | + `forgeplan-orchestra` | `/smith` (reads `forgeplan_health` + recalls memory + recommends next) or `/session` → `/sync` |

---

## Use-case 0 — "I don't know what to run" (smith meta-router)

**Scenario**: You opened a project (fresh, brownfield, mid-sprint — doesn't matter) and you want one command that reads the current state and tells you what's next. You don't want to remember which of `/shape` / `/forge-cycle` / `/autorun` / `/session` fits today.

**Setup** (one-time):
```
/plugin install fpl-skills@ForgePlan-marketplace
/reload-plugins
```

**Workflow** (single command):
```
/smith                           # reads forgeplan_health + git status + recent memory
                                 # → recommends the right next command + explains why
```

For a brand-new empty repo, the canonical entry is `/smith-bootstrap` — it runs greenfield pre-flight, scaffolds `CLAUDE.md` + `AGENTS.md` + `.forgeplan/`, and dispatches the first Brief.

Full reference: [SMITH.md](SMITH.md).

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
/smith-bootstrap                 # Step 1: greenfield pre-flight + scaffold (.forgeplan/, CLAUDE.md, AGENTS.md, docs/agents/)
/shape "<your idea>"             # Step 2: interview from scratch → draft PRD
/refine PRD-NNN                  # Step 3: polish, add ADRs for key decisions
/forge-cycle "<refined task>"    # Step 4: full automated cycle (route → build → evidence → activate)
```

`/smith-bootstrap` replaces the older `/fpl-init` invocation for fresh repos — it adds the greenfield pre-flight (Brief dispatch, cross-CLI `AGENTS.md` shim, project memory bank wiring) on top of the scaffold. See [SMITH.md](SMITH.md) for the full bootstrap procedure.

If you want to skip the interview and go full auto:
```
/smith-bootstrap
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
/smith                                        # default mode auto-detects brownfield and routes here
# (or /smith-bootstrap if the repo has no .forgeplan/ yet)
# Run Discover Agent (canonical in plugins/forgeplan-brownfield-pack/agents/discover/) for codebase map
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

## Use-case — Metric-driven iteration (autoresearch + ForgePlan)

**Scenario**: You have a task with a clear mechanical metric (perf number, test pass rate, bundle size, security findings count) and you want a goal-directed loop that improves the metric until target — with the result captured as proper Evidence.

**Setup** (autoresearch is on a separate marketplace):
```
/plugin marketplace add uditgoenka/autoresearch
/plugin install autoresearch@uditgoenka-autoresearch
/plugin install fpl-skills@ForgePlan-marketplace
/plugin install forgeplan-workflow@ForgePlan-marketplace
/reload-plugins
```

**Three patterns** (full guide: [AUTORESEARCH-INTEGRATION.md](AUTORESEARCH-INTEGRATION.md)):

### Pattern A — Autoresearch as Build phase of `/forge-cycle`

```
/forge-cycle "reduce checkout p95 latency below 200ms"
  → Step 4 — shape: PRD with success criterion "p95 < 200ms"
  → Step 5 — BUILD delegates to /autoresearch:plan (loop runs unattended)
  → Step 7 — evidence: forgeplan new evidence with final p95 measurement
              (verdict: supports, congruence_level: 3, evidence_type: measurement)
  → Step 8 — activate when R_eff > 0
```

The PRD's success criterion **is** the autoresearch metric. The loop's final state becomes high-confidence Evidence (CL3 same-context).

### Pattern B — Autoresearch standalone → Note + Evidence

For lightweight improvements without a full PRD:

```
/autoresearch:debug "fix flaky auth test"
forgeplan new note "fixed flaky auth test — race in token mock"
forgeplan new evidence "/autoresearch:debug 47 iterations; final 100/100; sha=abc123"
```

### Pattern C — Security audit → Evidence

`/autoresearch:security` produces a structured report directly suitable as Evidence:

```
/autoresearch:security        # read-only, or add --fix for confirmed Critical/High
forgeplan new evidence "<scope>: autoresearch:security — 2 HIGH, 4 MED found, 1 HIGH auto-fixed"
forgeplan link EVID-NNN ADR-MMM --relation informs
```

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
/smith                           # one-shot: reads forgeplan_health + recalls Hindsight memory + recommends next
# or, for explicit Orchestra triage:
/session                         # Inbox Pattern: forgeplan health + Orchestra messages + git changes + triage
/sync                            # Bidirectional Forgeplan ↔ Orchestra (Status ↔ Phase mapping)
# Pick a task from inbox synthesis
/forge-cycle "<task>"            # full lifecycle as in use-case 3
```

`/smith` complements `/session` — use `/smith` when you want a single "what should I do next" answer; use `/session` when you specifically want the Orchestra inbox triage.

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

- [SMITH.md](SMITH.md) — meta-router and bootstrap reference (`/smith`, `/smith-bootstrap`)
- [DEVELOPER-JOURNEY.md](DEVELOPER-JOURNEY.md) — narrative onboarding with 4 personas
- [USAGE-GUIDE.md](USAGE-GUIDE.md) — reference manual: every command, hook, troubleshooting
- [METHODOLOGIES.md](METHODOLOGIES.md) — what's built into forgeplan (BMAD, OpenSpec, ADI, F-G-R, DDR, etc.) vs what's external
- [ARCHITECTURE.md](ARCHITECTURE.md) — 4-layer mental model
- [MIGRATION-DEV-TOOLKIT-TO-FPL-SKILLS.md](MIGRATION-DEV-TOOLKIT-TO-FPL-SKILLS.md) — switching from legacy
- [TRACKER-INTEGRATION.md](TRACKER-INTEGRATION.md) — Orchestra / GitHub / Linear / Jira recipes
- [FORGEPLAN-WEB.md](FORGEPLAN-WEB.md) — browser viewer with time-travel
