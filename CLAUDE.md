# ForgePlan Marketplace — Claude Code Configuration

**Repo**: [ForgePlan/marketplace](https://github.com/ForgePlan/marketplace)
**Catalog version**: 1.72.1
**Plugins**: 16 (10 workflow + 5 agent packs + 1 memory plugin fpl-hsmem) — cc-best v1.0.0 (Sprint Y) + brownfield-pack canonical discover agent (Sprint V) + smith master-orchestrator (EPIC-002, Profile B-orchestrator)
**Agents**: 20 of ~65 forgeplan-aware (PRD-026 B2 paradigm — `disallowedTools` denylist + Sprint Q PRD-042 ASM-canon + Sprint S Step 9c + Sprint T v0.32.1 + Sprint V PRD-048 discover + Sprint Z4 PRD-055 evidence-gatherer + EPIC-002 smith Profile B-orchestrator. **`memory: project` REJECTED Sprint R** — Hindsight covers use case.)
**Last Updated**: 2026-05-26 (post Sprint BB Wave 1A — added "Social-discipline boundaries" section documenting G5/G6/G7 as accept-by-design per EVID-105 / EPIC-003. EPIC-002 closure baseline (smith master-orchestrator, 4-skill cluster + 12-context routing + Profile B-orchestrator) and EPIC-001 baseline (Sprints Z6-Z10) carried forward unchanged. catalog v1.72.1, fpl-skills v1.31.1, agents-pro v1.10.1, forgeplan-workflow v1.12.0.)

---

## 4-Layer Pipeline (S10→S13) — methodology conveyor

Every Standard+ artifact passes through 4 enforced layers before activation:

```
S10  FPF       — design       — ≥3 hypotheses via ADI (forgeplan_reason); EVID linked
                                  → enforced by /forge-cycle Step 4.5 + guardian Step 5 row
S11  BMAD      — quality gate — Profile B audit with ≥1 finding required
                                  → enforced by /forge-cycle Step 6.5 + guardian Step 5 rows
S12  OpenSpec  — structure    — DAG links + delta-spec ADDED/MODIFIED/REMOVED at supersede
                                  → enforced by adr-supersede template + /supersede skill + decay-watch Step 2e
S13  Forgeplan — automation   — hooks + agents + skills + MCP wire it all together
                                  → enforced by validate + score + activate gates
```

Plus C4 (orthogonal architecture extension) auto-recommended for ≥3-module decisions via adr-architect Step 5b.1.

Run `/methodology-check <ARTIFACT-ID>` for cumulative per-layer coverage report on any artifact.

Foundation: EPIC-001 + sprints Z6-Z10 (PRD-057/058/059/060/061). Motivation: MSR 2026 finding that AI without controls produces +25-41% code complexity.
**Project board**: [orgs/ForgePlan/projects/5](https://github.com/orgs/ForgePlan/projects/5)

---

## User-facing communication style (product manager language)

When replying to the user (especially on status questions like "what was done / what's left / what's next") — write **like a PM talking to a PM, not like an engineer talking to an engineer**. Internal artifacts and technical methodology stay in your head and in forgeplan artifacts; give the user the outcome.

This rule applies to the **assistant's chat replies to the user**, not to the bodies of forgeplan artifacts, agent definitions, skill bodies, or code. Those keep technical language where it belongs.

### Principles

1. **One language per reply.** If the conversation is in Russian, write in Russian — do not sprinkle English words where a normal Russian word exists. If the conversation is in English, write in English. Don't mix.
2. **Internal codenames only when necessary.** Artifact IDs (PRD-049, EVID-076, ADR-006), upstream issue numbers (forgeplan#325), file and command names — fine. Methodology codenames (ML-12, ADI, FPF, Profile B) — fine inside technical sections of structured reports, but in plain "what's next" replies translate them into their meaning.
3. **Conclusion first, justification second.** Start with a short factual statement. If needed, add reasoning below it. Don't lead with the reasoning.
4. **Short concrete phrases.** "Waiting on the forgeplan core team" instead of "awaiting upstream triage". "Need your decision" instead of "requires human decision". "Nothing to do on this right now" instead of "no high-confidence next action".
5. **If there is genuinely nothing to do, say so.** Do not dress it up as "production-grade baseline". "Everything is closed, waiting for your next task" is a perfectly acceptable answer.

### Anti-patterns (Russian conversation — what NOT to write)

These exact phrasings illustrate the failure mode when the user writes in Russian. The English-sprinkled style is the problem:

- ❌ «Все open items требуют ЛИБО external trigger (upstream issues), ЛИБО human decision (PRD-015 — multi-day commit), ЛИБО external target»
- ❌ «Все loose ends либо closed, либо explicitly deferred с trigger»
- ❌ «Если автономно продолжать в этом состоянии — будет manufacturing работы ради работы, что нарушает ML-12 (ADI gate перед dispatch)»
- ❌ «Это и есть production-grade baseline — состояние когда у автономного агента нет high-confidence next action»
- ❌ «Session готова к compact или к новой задаче»

### How to phrase the same meaning in plain Russian

- ✅ «Незакрытых задач три, все ждут внешнего сигнала: одна — ответа от разработчиков forgeplan по нашему запросу, вторая — твоего решения по большому проекту, третья — нужен реальный сторонний репозиторий чтобы протестировать»
- ✅ «Всё, что можно было закрыть в этой сессии — закрыто. Дальше пойдём, когда дашь новую задачу или когда придёт ответ по issue #325»
- ✅ «Если продолжу сам — начну выдумывать работу. У нас есть правило: каждое следующее действие должно иметь явное обоснование, иначе останавливаюсь и жду»

### When English terms are acceptable in any conversation language

- File names, paths, commands: `forgeplan_health`, `validate-all-plugins.sh`, `gh pr merge`.
- Artifact identifiers: PRD-049, ADR-006, EVID-076, forgeplan#325.
- Agent profile names in technical context: Profile A, Profile B, Profile C-coder, Profile D.
- Technical terms with no settled Russian equivalent: frontmatter, denylist, allowlist, hook, sentinel, MCP.

If you are unsure whether an English term is appropriate, try the local-language version first. If it sounds awkward or three times longer, keep the English. Borderline cases — keep English in quotes or with a parenthetical gloss on first mention.

---

<!-- gh-project-convention:v1 -->
## GitHub Projects integration (this project)

This project tracks work via GitHub Projects v2 board: [orgs/ForgePlan/projects/5](https://github.com/orgs/ForgePlan/projects/5). Per-project config in `.forgeplan/state/gh-project.yaml` (not committed). PRs auto-add via `.github/workflows/auto-add-to-project.yml`.

**What goes on the board**:
- All PRs (auto-added by workflow). Type derived from conventional-commit prefix in title.
- Standard+ PRDs/RFCs (manually via `/gh-project link-prd PRD-NNN`). Tactical artifacts → PR-only.

**Lifecycle sync**: after `forgeplan activate <ID>` run `/gh-project sync-status <ID>` to update board Status.

**Skill**: `/gh-project init` (one-time setup per repo), `add-pr`, `link-prd`, `sync-status`, `list`.
**Convention + setup guide**: [docs/GITHUB-PROJECTS.md](docs/GITHUB-PROJECTS.md) (EN) / [docs/GITHUB-PROJECTS-RU.md](docs/GITHUB-PROJECTS-RU.md) (RU).

---

## Git Workflow

**CRITICAL: feature branches + PR only. Direct push to `main` and `dev` is forbidden.**

```
feature-branch → push → PR → CI pass → merge
```

### Branches

| Branch | Purpose | Protection |
|-------|-----------|------------|
| `main` | Production. Stable release | PR + 1 review + CI strict |
| `dev` | Integration. Next release | PR + CI |
| `feat/*`, `fix/*`, `chore/*`, `docs/*` | Working branches | No restrictions |

### Commit message format

```
type(module): short summary

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
```

Types: `feat`, `fix`, `docs`, `audit`, `chore`.

### Branch name format

```
type/description        # feat/new-plugin, fix/hook-regex, docs/readme-update
```

---

## Branch Protection (GitHub Rulesets)

### Main

- PR required, `required_approving_review_count: 1`
- CI check `validate` must pass
- `strict: true` — PR must be up-to-date with main
- No deletion, no force-push
- Merge methods: merge, squash
- Bypass: admin only (`--admin` flag)

### Dev

- PR required, `required_approving_review_count: 0`
- CI check `validate` must pass
- `strict: false`
- No deletion, no force-push
- Merge methods: merge, squash, rebase

### Tags

- Only admins can create / update / delete tags.

---

## CI (GitHub Actions)

**Workflow**: `.github/workflows/validate-plugins.yml`
**Job name**: `validate`
**Triggers**: push to `main`/`dev`, PR to `main`/`dev`

### What it checks

1. `marketplace.json` — valid JSON
2. `plugin.json` — `name`, `version`, `description` required
3. v2 optional fields — `category`, `components` (info)
4. Command collisions — command name uniqueness
5. Marketplace completeness — every plugin on disk is in the catalog
6. `hooks.json` — valid JSON
7. `SKILL.md` — has YAML frontmatter

### Path filters

CI runs only when changes touch:
- `plugins/**`
- `.claude-plugin/marketplace.json`
- `.github/workflows/**`

---

## Security

- **Secret scanning**: enabled — GitHub scans code for tokens / keys
- **Push protection**: enabled — pushes with secrets are blocked
- **Dependabot**: enabled — alerts for CVEs in dependencies

---

## Local Hooks

**File**: `.claude/hooks/safety-hook.sh`
**Config**: `.claude/settings.json`

### What it blocks (PreToolUse → Bash)

- `git push --force` / `git push -f`
- `git push origin main` / `git push origin dev`
- `git reset --hard`
- `git clean -fd`
- `rm -rf /` / `rm -rf ~` / `rm -rf .`
- `DROP TABLE` / `DROP DATABASE`
- `git branch -D main` / `git branch -D dev`

### How to bypass (only if you must)

Admin bypass for rulesets: `gh pr merge --admin`.
Hook bypass: temporarily remove the entry from `.claude/settings.json` (not recommended).

---

## Forbidden

- `git push --force` — NEVER.
- `git push origin main` / `git push origin dev` — only through a PR.
- `git add .` / `git add -A` — stage specific files only.
- `--no-verify` — do not skip hooks.
- Merging without green CI.
- Files containing secrets (`.env`, credentials, tokens).

---

## Defer discipline (Sprint Z5 — PRD-056)

When you (or a sub-agent) decide to **defer** any item — file an upstream issue then wait, postpone a decision, skip a non-goal — **the item MUST land as a row in NOTE-013 «Deferred items tracker»** within the same sprint.

Rules:

1. Every defer goes into NOTE-013 as `- [ ] **Kind**: issue|metric|date|event — description — source — last_checked` row.
2. If a defer is **not** in NOTE-013 — it is not deferred, it is **forgotten**.
3. `/decay-watch` skill scans NOTE-013 on every invocation (4 source-types total: ADR triggers / NOTE-013 / `scripts/check-issue-*.sh` / ADR line-count).
4. `decay-reminder.sh` SessionStart hook silently alerts when any NOTE-013 trigger fires (date past due, upstream issue closed, etc.).
5. `guardian` agent Step 4b cross-references NOTE-013 when gating any artifact that depends on a deferred item.

Quick path for a defer:

```bash
# In the EVID body documenting the defer decision:
# - state WHY this is deferred
# - cite the NOTE-013 row added (e.g., "tracked as DEFER-NNN in NOTE-013")

# In NOTE-013 body (forgeplan_update):
- [ ] **Kind**: issue — forgeplan#NNN <description> — https://... — 2026-MM-DD
```

`/decay-watch` and the SessionStart hook do the rest — you don't have to remember.

---

## BMAD adversarial review discipline (Sprint Z6 — PRD-057)

Foundation: EPIC-001 «4-layer pipeline», S11 BMAD quality-gate layer. MSR 2026 measures **+25–41% complexity gap** in AI-assisted projects without adversarial review controls — artifacts are plausible-sounding but under-specified.

### Rules

1. **Every Standard+ PRD, RFC, or ADR MUST have ≥1 Profile B EVID** linked `informs` before `forgeplan_activate` is called. Zero-evidence activation = BLOCKER at guardian gate.

2. **Profile B EVID body MUST contain a `## Findings` section with ≥1 item.** Zero findings = reviewer was not adversarial enough. The reviewer's role is explicitly adversarial: assume the artifact has a gap, look for it, and name it.

3. **Motivation (MSR 2026)**: AI-generated artifacts exhibit confident incompleteness — they look finished but silently omit non-obvious requirements, measurability constraints, or risk mitigations. A structured adversarial reviewer closes this gap. Without it, the pipeline amplifies AI confidence without adding human-equivalent verification.

4. **What to write when genuinely nothing is wrong**: if after thorough adversarial search the reviewer finds no actionable issue, write a `## Findings` section with exactly one line stating so **plus ≥2 sentences explaining what was specifically checked and why no gap was found**. A bare "no findings" is not acceptable — it reads identically to "reviewer didn't look". Default expectation: ≥1 finding exists. Genuinely zero-gap artifacts are exceptional.

5. **Enforcement**:
   - `/forge-cycle` Step 6.5 dispatches `agents-pro:artifact-reviewer` with adversarial mandate for all Standard+ depth tasks
   - `guardian` Step 5 verdict matrix: zero Profile B EVID with verdict=PASS → **BLOCKER**; Profile B EVID with empty `## Findings` → **CONCERNS** (re-dispatch recommended)

Quick path for the reviewer:

```markdown
## Findings

1. **[Severity: HIGH]** AC-3 has no measurable threshold — "system should respond quickly" is not SMART.
   Recommendation: replace with "System shall respond within 200ms at p95 under 1000 concurrent users".
```

Reference: PRD-057, EPIC-001 (4-layer pipeline S11), MSR 2026 (+25–41% complexity without controls).

---

## OpenSpec delta-spec discipline (Sprint Z8 — PRD-058)

Foundation: EPIC-001 «4-layer pipeline», S12 OpenSpec structure layer. Every **supersede** operation
MUST produce an explicit delta-spec — a structured record of what was ADDED, MODIFIED, REMOVED, and
UNCHANGED relative to the predecessor. Without delta, the supersede history silently loses context.

### Rules

1. **Every supersede MUST use `adr-supersede.md` template** (or include the equivalent delta sections
   in a custom body). The four sub-sections — `### ADDED`, `### MODIFIED`, `### REMOVED`,
   `### UNCHANGED` — are ALL required in the new artifact body.

2. **Empty delta is fine if explicit.** If a category genuinely has nothing, write «no items».
   Implicit empty (missing section entirely) is the violation — not the absence of content.

3. **`/decay-watch` Step 2e enforces.** On every invocation it enumerates all active artifacts with
   a `supersedes` link and classifies each:
   - `HAS-DELTA` — delta-spec present, compliant.
   - `MISSING-DELTA` — pre-Z8 supersede, no delta section, backward-compatible warning.
   - `NO-DELTA-WHEN-REQUIRED` — Z8+ supersede (created on/after 2026-05-25) missing delta → **CONCERNS** in next health check.

4. **Use `/supersede` skill for the workflow.** It walks Steps 1-8: reads old ADR, verifies active
   status, computes delta, fills template, creates new ADR, links `supersedes`, marks predecessor
   `superseded`. Do not manually create supersede artifacts without running this procedure.

5. **REMOVED > 50% of predecessor → reconsider.** If the new decision removes more than half the
   predecessor's substance, it may be a replacement rather than an evolution. Write a standalone ADR
   (using `adr-light.md` or `adr-full.md`) instead. The `/supersede` skill surfaces this check in
   Step 3.

Quick path for a supersede:

```bash
# In your session:
/supersede ADR-NNN
# The skill reads the old ADR, prompts for delta, creates new ADR with delta-spec, links + marks superseded.
```

Reference: PRD-058, EPIC-001 (4-layer pipeline S12 OpenSpec).

---

## FPF ADI discipline (Sprint Z7 — PRD-059)

Foundation: EPIC-001 «4-layer pipeline», S10 FPF design layer. Every Standard+ PRD/RFC/ADR MUST have FPF ADI (Abduction → Deduction → Induction) cycle completed before activation. ADI = ≥3 hypotheses with explicit deductive predictions and inductive evidence checks. The «3» is not arbitrary — 2 always becomes false dichotomy; the third hypothesis is often the most interesting (e.g., «do nothing» or «in-process alternative»).

### Rules

1. Every Standard+ artifact MUST have ≥1 EVID with `kind=evidence` linked `informs` whose body documents the 3+ hypotheses, chosen one, and rationale.

2. `forgeplan_reason <id>` is the canonical primitive (MCP) or `/fpf-reason` skill (interactive — fpf plugin).

3. `/forge-cycle` Step 4.5 enforces — Standard+ artifacts cannot pass Step 5 without ADI EVID.

4. Guardian Step 4b/5 enforces at activation gate: Standard+ artifact with no ADI EVID linked OR fewer than 3 `### Hypothesis` sections in the EVID body → **BLOCKER**.

5. Cite **MSR 2026 finding** (AI without controls → +25-41% complexity) — ADI is the «control process» at the design layer. The gap is highest _before_ code is written: a bad hypothesis that survives to implementation costs 5-10× more to fix than a bad PRD section.

### Why 3 hypotheses minimum

| Count | Failure mode |
|---|---|
| 1 hypothesis | Not a hypothesis — it's a predetermined answer dressed as reasoning |
| 2 hypotheses | False dichotomy — both framed by the same author toward the same conclusion |
| 3+ hypotheses | One can challenge the premise of the other two; structural ADI cycle becomes possible |

The 3rd hypothesis should always be considered: «what if we do nothing / in-process alternative / scope reduction?» Skipping it is the most common ADI failure mode.

### Quick path for ADI EVID

```bash
# MCP path (preferred):
forgeplan_reason <ARTIFACT_ID>
# → review output, confirm ≥3 hypotheses, pick best
forgeplan new evidence "ADI cycle for PRD-XXX — N hypotheses, chosen HN" --parent PRD-XXX
# Fill body: ## Hypotheses (copy from forgeplan_reason output), ## Chosen, ## Rationale

# Interactive path (fpf plugin):
/fpf-reason   # in Claude Code session — generates 3+ hypotheses interactively
# then create EVID manually with body citing the ADI output
```

Cite EPIC-001 4-layer pipeline S10. Pair with BMAD (S11) discipline above and OpenSpec (S12) below.

Reference: PRD-059, EPIC-001 (4-layer pipeline S10 FPF).

---

## C4 diagrams for ≥3-module architectural decisions (Sprint Z9 — PRD-060)

Foundation: Simon Brown's C4 model (c4model.com) — orthogonal architecture documentation methodology that pairs naturally with full ADRs touching multiple modules. **C4 is NOT part of the 4-layer S10-S13 pipeline** — it is a complementary layer. Pair with FPF (S10) which surfaces hypotheses and BMAD (S11) which validates them — C4 makes the module boundaries from S10/S11 explicit before they go into prose.

### Rules

1. **Any full ADR (per Sprint Z1 criteria: ≥3 modules, OR supersede, OR irreversible) MUST be accompanied by C4 L1+L2 diagrams** (Mermaid format) before the ADR body is finalized.

2. **`adr-architect` Step 5b.1 auto-recommends dispatching `/c4-diagram` skill in Dispatch mode** when criterion #1 (≥3 modules) triggers. The dispatch happens BEFORE filling the ADR body — diagrams shape the prose, not the other way around.

3. **Output location**: Mermaid diagrams in a Markdown file co-located with the ADR body or in `docs/c4/<ADR-NNN>.md`.

4. **ADR body MAY reference the C4 file via relative link** in the `## Context` section. If the ADR body discusses inter-module flow without a C4 file present — `guardian` agent flags as CONCERNS at the gate.

5. **L3 (Component) only when needed**: default depth is L1+L2. Add L3 only if the PRD body explicitly discusses component internals of a single container.

### What C4 levels mean for architectural decisions

| Level | When required | When to skip |
|---|---|---|
| L1 — Context | Always for full ADRs | Never — it's 10 lines |
| L2 — Container | Always for full ADRs | Single-service system (embed in L1) |
| L3 — Component | PRD body discusses container internals | Anything higher-level |
| L4 — Code | Never for ADRs | Class-level detail belongs in RFC/code comments |

### Quick path

```bash
# adr-architect Step 5b.1 auto-dispatches:
Task(subagent_type="fpl-skills:c4-diagram",
     prompt="Dispatch mode. System: <name>. Modules: <list>. Depth: L1+L2. Output: docs/c4/<ADR-NNN>.md.")

# Manual invocation if writing ADR without adr-architect:
/c4-diagram   # interactive interview → produces same output
```

Reference: PRD-060, EPIC-001. Simon Brown's C4 model: [c4model.com](https://c4model.com).

---

## Methodology coverage self-check (Sprint Z10 — PRD-061)

For any artifact at any time, run `/methodology-check <ARTIFACT-ID>` to see which of the 4-layer
pipeline layers (S10 FPF design, S11 BMAD quality gate, S12 OpenSpec structure, S13 Forgeplan
automation) plus C4 architecture extension are satisfied. Returns a per-layer score 0–2 + aggregate
percentage + concrete action items per gap.

**Read-only** — surfaces what's needed, never auto-fixes. Use before activating any Standard+ artifact
for a final sanity check. Tactical artifacts are automatically scoped to S12+S13 only (S10/S11 marked N/A).

Quick path:

```bash
# Check any artifact before activation:
/methodology-check PRD-NNN

# Typical pre-activation workflow:
forgeplan_reason PRD-NNN          # S10: generate ADI hypotheses
# → create EVID with ≥3 hypotheses
# → dispatch artifact-reviewer for S11 BMAD EVID with ## Findings
/methodology-check PRD-NNN        # confirm all layers green
forgeplan_activate PRD-NNN        # safe to activate
```

Cite EPIC-001 4-Layer Pipeline (S10→S13) as foundation. Skill: `plugins/fpl-skills/skills/methodology-check/SKILL.md`.

Reference: PRD-061, EPIC-001 (4-layer pipeline meta-layer, Sprint Z10).

---

## Smith — methodology router (EPIC-002)

Foundation: EPIC-002 «smith master-orchestrator» — the ForgePlan equivalent of BMAD-METHOD's BMAD Master persona. A **Profile B-orchestrator** sub-profile agent that reads broad project state (forgeplan_health + list + blocked + stale + hindsight recall + git status), classifies the situation against a **12-context routing matrix**, and returns a structured Markdown plan naming which specialist agents to dispatch, in which order, with which methodology backing each step. Smith **never writes code or activates artifacts** — it routes and recommends; downstream specialists execute.

### When to invoke smith

- At **session start** when unsure what to do next — smith reads health + recent journal and proposes the next action.
- On a **fresh repo** with no artifacts — `/smith-bootstrap` seeds Brief / PRD / first ADR via the greenfield row.
- For a **specific task** of any depth — `/smith-plan <task>` picks the matching row, names the methodology, lists the dispatch sequence.
- For **learning the methodology surface** — `/smith-routing` walks the 12 contexts + 27 methodology cards without committing to a task.
- When existing entry points (`/forge-cycle`, `/autorun`) don't fit — cross-context work, ambiguous depth, methodology mismatch.

If you already know which agent to dispatch, call it directly. Smith picks **which**; it doesn't replace any specialist.

### The 4 skills

| Skill | Mode |
|---|---|
| `/smith` | Default — status + recommended next step from current state |
| `/smith-bootstrap` | Greenfield repo onboarding — seeds Brief / PRD / first ADR |
| `/smith-plan <task>` | Per-task plan — routing-map row + methodology + dispatch sequence + evidence |
| `/smith-routing` | Educational walkthrough of 12 contexts + 27 methodology cards |

### 12-context routing matrix (compact reference)

| # | Context | Primary methodology |
|---|---|---|
| 1 | Greenfield | BMAD-METHOD (trimmed) + GitHub Spec Kit |
| 2 | Brownfield modernisation | Strangler Fig + DDD + Anti-Corruption Layer |
| 3 | New feature in existing service | SPARC + Hexagonal Architecture |
| 4 | Production bug (non-trivial) | RIPER-5 + 5 Whys root-cause |
| 5 | Trivial hotfix | Tactical fast-path (no formal methodology) |
| 6 | Refactoring | Branch-by-Abstraction + Mikado Method |
| 7 | Architecture decision | FPF ADI + ADR/MADR |
| 8 | Security audit | OWASP Top 10 2025 + STRIDE / ASTRIDE |
| 9 | Performance audit | DORA + SRE error-budget + perf budget |
| 10 | Product discovery (PDLC) | Jobs-To-Be-Done + Lean Startup + Double Diamond |
| 11 | Tech debt cleanup | A3 Problem Solving + Fishbone + ADR-supersede |
| 12 | Live incident response | Incident Command System + Blameless post-mortem |

Smith picks **exactly one row** per task — methodology cocktails are forbidden. If two rows genuinely tie, smith emits `<<NEED_USER_INPUT>>` with ≥3 hypotheses per FPF ADI (PRD-059). Full table with dispatch sequences + evidence requirements + agent index in [`plugins/fpl-skills/skills/smith/routing-map.md`](plugins/fpl-skills/skills/smith/routing-map.md).

### Profile B-orchestrator sub-profile

A **strategic planner sub-profile of Profile B**, formalised in EPIC-002. Like standard Profile B it produces no source code, mutates no artifacts, and never activates anything. UNLIKE standard reviewers (`code-reviewer`, `security-expert`, `tester`, `architect-reviewer`, `guardian`), Profile B-orchestrator does NOT audit a single artifact and does NOT produce an EVIDENCE artifact — instead it reads broad state and returns a routing plan. Denies Write/Edit/NotebookEdit/Bash + all forgeplan mutations (`new`, `update`, `link`, `activate`, `deprecate`, `supersede`, `claim`, `release`, `reason`) + `memory_retain` (orchestrator runs frequently; auto-hooks still capture conversation-layer learning).

Authoring contract documented in `plugins/fpl-skills/AGENT-AUTHORING-GUIDE.md` L1162-1268. Intent: keep the set small — ideally one general agent (`smith`) + at most 2-3 narrow-domain orchestrators. More than 3-4 across the marketplace is a smell; orchestration logic belongs in skills (`/forge-cycle`, `/autorun`, playbooks) or in smith's routing matrix, not in a proliferation of B-orchestrator agents.

### Relationship to existing entrypoints

| Entrypoint | Role |
|---|---|
| **`smith`** (this) | **Methodology router** — picks which methodology + which agents apply per task context |
| `/forge-cycle` | Reactive enforcer — runs the 4-layer pipeline ON a Standard+ artifact through to activation |
| `/autorun` | Autonomous loop — picks artifacts from `forgeplan_blocked` + drives them through `/forge-cycle` |

Smith picks the methodology; `/forge-cycle` and `/autorun` execute the methodology smith picks. The three are orthogonal and compose.

Full guide: [`docs/SMITH.md`](docs/SMITH.md) (EN) / [`docs/SMITH-RU.md`](docs/SMITH-RU.md) (RU).

Reference: EPIC-002, PRD-062 (Wave 1 — agent + routing-map + 12 sections + 5 templates), PRD-063 (Wave 2 — 4 skills), PRD-064 (Wave 3 — AGENTS.md + session hook + READMEs), PRD-065 (Wave 4 — Profile B audit + closure), EVID-094..097 + EVID-099 (post-merge multi-expert audit + N1-N4 polish) + EVID-102 (6-test e2e smoke).

---

## Social-discipline boundaries (Sprint AA — accept-by-design)

Foundation: EPIC-003 / Sprint AA production-readiness audit identified 8 methodology auto-enforcement gaps (G1-G8). We closed 5 (G1+G2+G3+G4+G8) with hooks/gates. Three (G5, G6, G7) are intentionally **NOT closed** because closing them would require brittle prose parsing — the cost (false-positive rate, maintenance overhead) exceeds the benefit (catching social-discipline violations that humans should catch in review).

These three gaps remain by design. They are documented here so future Profile A authors know not to try implementing parsers for them.

### G5 — SPARC claim-log gate

**The gap**: there's no automated check that SPARC phases (Specification → Pseudocode → Architecture → Refinement → Completion) actually ran for row 3 (new feature) workflows. Detection lives only in `forgeplan_claims` log, which has TTL and may be expired by the time guardian audits.

**Why deferred**:
- claims log expiry means structural absence ≠ "SPARC wasn't run"
- false-positive risk: legitimate alternative paths (e.g., user invoked agents-sparc directly without /forge-cycle claim mutex) would trigger BLOCKER
- the value SPARC adds is iteration discipline, not artifact-count discipline; parsing claims log measures the wrong thing

**Social discipline**: smith row 3 routes to agents-sparc dispatch sequence. Profile B reviewers (artifact-reviewer at Step 6.5) catch architectural gaps that SPARC phases would have caught. Trust the reviewer chain.

### G6 — BMAD content-spoof in `## Findings`

**The gap**: an EVID with body literally `## Findings\n1. nothing wrong` passes the guardian gate (Step 4b counts ≥1 finding). CLAUDE.md Sprint Z6 Rule 4 requires ≥2-sentence justification when zero gaps were found, but no automated parser enforces "≥2 sentences" or "real reasoning vs placeholder".

**Why deferred**:
- ≥2-sentence parse risks false-positives on legitimate short EVIDs (e.g., "AC-3 measurable threshold absent. Spec says 'fast', SMART requires numeric." — 2 sentences, real finding, short)
- distinguishing "placeholder text" from "real short finding" requires LLM-grade semantic analysis; that's not appropriate at a hook-level gate
- the social cost of bypass is high (reviewer's identity is logged; bad-faith bypasses are visible in audit trail)

**Social discipline**: Profile B reviewers are named in EVID frontmatter. Pattern-of-empty-Findings becomes visible across reviews. Team norm + code-review culture catches it.

### G7 — FPF ADI content-spoof in `### Hypothesis N` sections

**The gap**: 3 placeholder hypothesis headers (`### Hypothesis 1`, `### Hypothesis 2`, `### Hypothesis 3`) with empty or trivial bodies pass guardian's structural count. CLAUDE.md Sprint Z7 "Why 3 hypotheses minimum" rule wants the 3rd to be "do nothing / scope reduction" — no automated check enforces this.

**Why deferred**:
- per-hypothesis body-length check is brittle (a 5-word "if we do nothing X breaks because Y" is a legitimate concise hypothesis)
- enforcing "3rd hypothesis must be do-nothing" by string pattern is too restrictive; many legitimate ADI cycles have 3 non-trivial alternatives + a separate do-nothing baseline
- LLM-grade analysis is the only reliable detector; not appropriate at hook gate

**Social discipline**: ADI EVIDs are reviewed by Profile B. Reviewer is expected to check whether the third hypothesis is genuine. Pattern-of-trivial-hypotheses is visible in the EVID body during review.

### The general pattern (when to NOT automate)

These three deferrals share a common structure:
1. **Spoof is detectable structurally** (`## Findings` count, `### Hypothesis N` count, `forgeplan_claims` log)
2. **But the spoof signal is identical to the legitimate-short signal** — a 1-line findings list could be lazy OR could be a genuine zero-gap; a short hypothesis could be padding OR could be precise
3. **Parser-based gate would either false-positive on legitimate work (eroding trust) OR be so lax it doesn't catch the spoof anyway**
4. **Social discipline** — visible reviewer identity, peer review, pattern recognition over time — is the right enforcement layer

This pattern generalizes: don't write parsers when the signal is semantic, not structural. Trust the reviewer chain. Make their identity visible.

### Reference

- ADI source: EVID-105 (Sprint AA hypotheses 5, 6, 7)
- Sprint AA implementation: EPIC-003 (closed G1, G2, G3, G4, G8; deferred G5, G6, G7)
- Related: Sprint Z6 (BMAD), Sprint Z7 (FPF ADI), Sprint Z9 (C4) — the discipline sections this complements

---

## Ground-truth verification discipline (PROB-002 / RFC-011 / ADR-009)

Foundation: PROB-002 (a worker self-reported success, downstream trusted the report, the gap surfaced later) → RFC-011 (architecture, FR-3) → ADR-009 (decision). The principle is **generator ≠ verifier**: the entity that produced an outcome never verifies its own work, and a reviewer never trusts the worker's "done" claim — it checks the claim against frozen external ground truth it reads itself.

### Rules

1. **Verify the side-effect against ground truth, never against a self-report.** For code, that ground truth is the git object store (`git diff base..head` in a clean shell). For a forgeplan mutation, it is the stored artifact body (`forgeplan_get` — confirm the claimed section is actually present). The worker's transcript ("done", "tests passed") is supplementary, not proof.

2. **Empty diff on a claimed change = fail (BLOCKER).** A green test suite with an empty `git diff` is **vacuous green** — a suite stays green when nothing changed, so it is a null result, not a pass. This holds even when scanners are clean.

3. **Run git probes under `bash --noprofile --norc`.** This sidesteps rc-hook stderr noise and `set -u` footguns that corrupt output parsing. Resolve the repo root with `git -C <cwd> rev-parse --show-toplevel` — never assume `$CLAUDE_PROJECT_DIR` is itself a git repo (in this workspace the marketplace repo is a child directory; the workspace root is not a git repo).

4. **The reviewer pastes the proof; the gate re-checks it.** Profile B reviewers record the literal probe commands + output in a `## Ground-truth verification` EVID section. Guardian Step 5 BLOCKS any code-claiming EVID whose body lacks that section or shows `DELTA=EMPTY`. This is the enforceable form of ML-13. Full procedure (variants A / A' / A'') in `plugins/fpl-skills/AGENT-AUTHORING-GUIDE.md` § "Profile B Step 4.5 — Ground-truth verification clause". Miniature proof: `sandbox-verify/r3-reviewer-groundtruth-smoke.sh` (green tests + empty diff → BLOCKER).

### Worktree isolation — the verified truth (corrects an earlier under-claim)

git worktree isolation **works**, and it is **not coder-only**: standalone subagents, Workflow runs, **and AgentTeams teammates** all receive isolated worktrees — verified in a real project with 14 isolated agent worktrees. (Only the `isolation: worktree` *frontmatter declaration* is coder-specific; the runtime guarantee is general.) The real multi-agent risks are not "isolation doesn't apply to teammates" but:

- **Worktree leak** — stale worktrees accumulate across runs; prune them (`git worktree prune` / `git worktree list` audit).
- **Assuming isolation without verifying** — always confirm `git worktree list` differs from `main` rather than assume the isolation took effect. Assume-without-verify is the same failure class as trust-the-self-report above.

Reference: PROB-002, RFC-011 (FR-3), ADR-009. Related: Claude Code issue [#44035](https://github.com/anthropics/claude-code/issues/44035) (upstream instance of the self-report-trust failure class).

---

## Version Bumping

When a plugin changes, bump version in two places:

1. `plugins/X/.claude-plugin/plugin.json` → `version`
2. `.claude-plugin/marketplace.json` → the corresponding plugin's `version`

| Change | Bump |
|-----------|------|
| Typo, README | patch (1.2.0 → 1.2.1) |
| Bug fix, hook fix | minor (1.2.0 → 1.3.0) |
| New command / agent, breaking change | major (1.2.0 → 2.0.0) |

---

## Validation

Always run before opening a PR:

```bash
./scripts/validate-all-plugins.sh              # all plugins
./scripts/validate-all-plugins.sh plugin-name  # one plugin
```

---

## Plugin cache troubleshooting (workaround for users)

If users report that updates to canonical agents don't appear after `/plugin marketplace update`, the cause is usually Claude Code's plugin cache invalidation behavior (upstream issue, captured in PROB-001 deprecated 2026-05-19):

| Symptom | Root cause | Workaround |
|---------|------------|------------|
| `/plugin install` says "already installed" but new version present | Cache exists, settings.local.json shows enabled | `/plugin uninstall` + `/plugin install` (force re-resolve) |
| `/plugin uninstall` doesn't free disk space | Settings toggle, cache files remain | Manual: `rm -rf ~/.claude-code-plugins/<plugin-name>` then reinstall |
| New version in marketplace.json not picked up | Catalog `metadata.version` not bumped | Verify catalog `metadata.version` was bumped — required for `/plugin marketplace update` to refresh |
| Agent loaded but new tools/config not active | Stale subagent cache in conversation | `/reload-plugins` (Claude Code session-level) |

**Rule of thumb when shipping**: always bump both per-plugin `version` AND catalog `metadata.version`. Without the catalog bump, no user gets the update via `/plugin marketplace update`.

---

## Standalone Agents

### Discover Agent — migrated to plugin in Sprint V (2026-05-22)

The brownfield Discover Agent now ships as part of the `forgeplan-brownfield-pack` plugin (v1.4.0).

| Location | Purpose |
|----------|---------|
| `plugins/forgeplan-brownfield-pack/agents/discover/discover.md` | Canonical Profile A agent — 7-phase MCP discovery procedure, B2 frontmatter |
| `plugins/forgeplan-brownfield-pack/agents/discover/README.md` | Dispatch examples, modes, skill orchestration, Anomaly #14 handling |
| `agents/_archive/discover-pre-sprint-v/` | Archived pre-MCP standalone (agent.md / protocol.json / README.md) — kept as historical reference |

The standalone tree was removed in Sprint V; the archive preserves the original 1466-line implementation for traceability.

---

## Quick Reference

```bash
# Workflow
git checkout -b feat/my-feature        # create a branch
git push -u origin feat/my-feature     # push the branch
gh pr create                           # open a PR
gh pr merge --merge --admin            # merge (admin bypass review)

# Inspection
gh pr checks <N>                       # CI status
gh api repos/ForgePlan/marketplace/rulesets --jq '.[] | .name'  # rulesets

# Validation
./scripts/validate-all-plugins.sh      # before PR
```

---

## Plugin versions (catalog v1.72.1)

### Workflow plugins

| Plugin | Version |
|--------|:-------:|
| **fpl-skills** | **1.31.1** (EPIC-002 PRD-063/064 niceties patch: 4 smith skills + sections + templates + READMEs + AGENT-AUTHORING-GUIDE Profile B-orchestrator L1162-1268; Sprint Z9: c4-diagram Dispatch mode section; Sprint Z8: /supersede skill + templates/adr-supersede.md + /decay-watch Step 2e; Sprint Z5: /decay-watch 4-source extension; Sprint Z2: /decay-watch + decay-reminder.sh; Sprint Z1: /decision + adr templates) |
| **cc-best** | **1.0.0** (Sprint Y phase 1: claude-md section + 5 STUB sections) |
| **fpl-hsmem** | 2.1.0 |
| **forgeplan-workflow** | **1.12.0** (Sprint Z7: Step 4.5 FPF ADI mandatory for Standard+; Sprint Z6: Step 6.5 BMAD adversarial review mandatory for Standard+) |
| **forgeplan-orchestra** | 1.4.1 |
| **forgeplan-brownfield-pack** | 1.4.0 (Sprint V: Discover Agent migrated) |
| **fpf** | 1.4.1 |
| **agentic-rag** | 1.1.0 |
| **fp-cookbook** | 1.2.1 |
| **laws-of-ux** | 1.4.1 |
| **dev-toolkit** | 1.6.3 |

### Agent packs

| Plugin | Version | Last sprint |
|--------|:-------:|---|
| **agents-core** | 1.3.2 | Sprint Q |
| **agents-domain** | 1.1.0 | — |
| **agents-pro** | **1.10.1** | EPIC-002 PRD-062 + niceties patch (smith Profile B-orchestrator agent + 12-context routing matrix) |
| **agents-github** | 1.1.0 | — |
| **agents-sparc** | 1.2.1 | Sprint Q |

> Source of truth: `.claude-plugin/marketplace.json` and `plugins/*/.claude-plugin/plugin.json`. Always verify before PR.

---

## Sprint A-E session 2026-05-19 — autonomy framework

Five consecutive sprints shipped the full autonomy framework. All PRDs closed R_eff=1.0 grade A.

| PRD | Sprint | Deliverable |
|-----|--------|-------------|
| **PRD-029** (active, R_eff=1.0 grade A) | Sprint A | UX layer: `/agent-advisor` skill + `NEED_USER_INPUT` sentinel protocol + prompt-router hook |
| **PRD-030** (active, R_eff=1.0 grade A) | Sprint B | Closure pack: 7 deliverables in 3 waves — parser integration into `/forge-cycle` + `/autorun`, methodology citation in 17 forgeplan-aware agents, Profile A Step 10 retain convention, `/project-agent-scaffold`, `/agent-fetcher`, `/forge-progress` |
| **PRD-031** (active, R_eff=1.0 grade A) | Sprint C | `/autorun` resume protocol + `docs/SESSION-CHECKPOINT-SCHEMA.md` (643-line spec) |
| **PRD-032** (active, R_eff=1.0 grade A) | Sprint D | Pipeline self-healing: `/forge-cleanup` skill + `NEEDS_ACTIVATION` sentinel + parsers in `/forge-cycle` + `/autorun` + 3-tier resolution (AUTO/ADI/USER) |
| **PRD-033** (active, R_eff=1.0 grade A) | Sprint E | Closure pack + GA v2.3.0: 7 Profile B agent body patches for organic sentinel emission + docs sync + AGENTS.md + live smoke + GA release |

### Evidence (Sprint A-E)

- **EVID-056** — Sprint A closure (informs PRD-029)
- **EVID-057** — Sprint B closure (informs PRD-030)
- **EVID-058** — Sprint C closure (informs PRD-031)
- **EVID-059** — Sprint D closure (informs PRD-032)
- **EVID-060** — Sprint E closure (informs PRD-033)

### Mental models added

- **mm-draft-hygiene** — pattern: EVIDs stick in draft because Profile B denied activate; resolution: coder/orchestrator calls `forgeplan_activate` after EVID creation
- **mm-pipeline-anomalies** — 3-tier resolution framework (AUTO/ADI/USER) with 9 initial anomaly kinds; see PRD-032

### Upstream issues filed

| Issue | Description |
|-------|-------------|
| forgeplan#286 | Unlink primitive (filed Sprint A-B era) |
| forgeplan#287 | Brownfield MCP tools epic |
| forgeplan#288 | Pipeline hygiene auto-activate + stale-draft + chain hint |
| forgeplan#289 | `forgeplan_anomalies` MCP tool |

### Known anomalies (Sprint A-E session log)

| # | Anomaly | Status |
|---|---------|--------|
| 1 | Profile B `forgeplan_activate` denied → EVID stays draft | AUTO-resolved: orchestrator activates post-EVID |
| 2 | `/forge-cycle` missing parser for `NEEDS_ACTIVATION` sentinel | Resolved Sprint D (PRD-032) |
| 3 | `/autorun` missing resume on checkpoint load | Resolved Sprint C (PRD-031) |
| 4 | Methodology citation absent in 17 forgeplan-aware agents | Resolved Sprint B (PRD-030) |
| 5 | `/agent-fetcher` unimplemented (dependency gap) | Resolved Sprint B (PRD-030) |
| 6 | `/forge-progress` missing real-time visibility command | Resolved Sprint B (PRD-030) |
| 7 | `/forge-cleanup` unimplemented (stale artifact cleanup) | Resolved Sprint D (PRD-032) |
| 8 | `NEED_USER_INPUT` sentinel not emitted organically by Profile B agents | Resolved Sprint E (PRD-033): 7 agent body patches |
| 9 | Documentation drift — catalog v1.37 vs actual v1.47 | Resolved Sprint E (PRD-033): this sync |
| 10 | AGENTS.md missing (cross-CLI context shim) | Resolved Sprint E (PRD-033) |

## Sprint G 2026-05-20 — Forgeplan core adoption + R_eff cascade fix

Five issues filed earlier closed upstream during Sprint A-F (forgeplan core was building in parallel):
- **#286** `forgeplan_unlink` — CLOSED (CLI v0.31.0 ships it; MCP surface pending)
- **#287** Brownfield extraction MCP epic — STILL OPEN
- **#288** Pipeline hygiene (auto-activate + stale-draft + chain hint) — CLOSED (MCP surface pending)
- **#289** `forgeplan_anomalies` MCP tool — CLOSED (MCP surface pending)

Partial adoption pattern: when an issue is closed in core repo, its MCP surface may not be in our session's binary yet. Sprint G adapts:

**Anomaly #5 (R_eff cascade footgun) — PARTIAL FIX**:
- Used `forgeplan unlink PRD-021 EVID-033 --relation based_on` CLI (works in v0.31.0)
- PRD-021 weakest_link moved from EVID-033 to PRD-018 (cascade deeper than expected)
- Specific anomaly link RESOLVED at surface; deeper PRD-018 → NOTE-003 draft chain remains as follow-up

**7 NEW MCP tools discovered** (landed during Sprint A-F):
- `forgeplan_discover_*` — brownfield protocol (start/finding/complete)
- `forgeplan_release_notes` — auto-generated changelog
- `forgeplan_ingest` — mapping-driven artifact import
- `forgeplan_restore` — soft-delete recovery
- `forgeplan_playbook_run` — playbook orchestration
- `forgeplan_activity` + `_stats` — tool-use audit log
- `forgeplan_fpf_rules` — FPF rule introspection

Sprint G inventory only; live verification deferred to Sprint H+.

### Artifacts (Sprint G)
- PRD-035 (active) — Sprint G scope + partial-adoption documentation
- EVID-062 (active) — verification of Anomaly #5 partial fix + 7-tool discovery
- v1.49.0 → **v1.50.0** catalog (this Sprint G milestone)

## Sprint J+K 2026-05-20 — 4 new MCP tools verified live

Sprint G inventoried 7 new MCP tools; Sprint J+K exercised 4 testable ones:

| Tool | Verdict | Canonical example | Notes |
|---|---|---|---|
| `forgeplan_release_notes` | **Limited use** in split-repo layouts | `forgeplan_release_notes(since="v2.3.0")` | Requires `.forgeplan/` + `.git/` co-located; workaround via shell from git repo |
| `forgeplan_restore` | **Delivers value** | `forgeplan_restore(id="NOTE-XXX")` after deprecate/supersede/delete | Verified roundtrip Sprint J+K K2; body preserves `## Deprecation` section |
| `forgeplan_activity_stats` | **Delivers value** | `forgeplan_activity_stats(since_hours=24)` | Use to find slow tools / error counts; this session 133 calls / 3 errs / forgeplan_score slowest p95=3.5s |
| `forgeplan_fpf_rules` | **Delivers value** | `forgeplan_fpf_rules(summary=true)` | 5 default rules: blind-spot, weak-evidence, orphan-active, medium-quality, ready-to-build |

3 tools NOT yet exercised (need external context):
- `forgeplan_discover_*` — needs brownfield codebase context (Sprint H+ scope)
- `forgeplan_playbook_run` — needs playbook artifact + security gate (`yes: true`)
- `forgeplan_ingest` — needs mapping YAML + source file

### Anomaly #12 (NEW): release_notes split-repo constraint

When `.forgeplan/` and `.git/` are in different directories (workspace root vs child repo), `forgeplan_release_notes` returns "git log failed: fatal: not a git repository". Workaround documented in Phase 7.3 of `/forge-cycle`. Captured as Sprint J+K Anomaly #12; **filed upstream as [forgeplan#290](https://github.com/ForgePlan/forgeplan/issues/290)** (2026-05-20).

### Anomaly #21 (Sprint R discovery): Sprint Q sub-agent false-success on `memory: project`

**Sprint R audit 2026-05-21**: Sprint Q sub-agent A-1 (agents-pro frontmatter dispatch) reported "5 learners received memory:project" but **on-disk verification revealed 0 agents got the field**. Other Sprint Q work (skills/maxTurns/isolation:worktree/MCP comments/evals/anti-patterns) WAS applied correctly.

**Side benefit**: Had `memory: project` been actually applied, it would have triggered a **silent security regression** — Anthropic docs confirm the field **force-enables Read/Write/Edit overriding `disallowedTools` denylist**. The sub-agent overreporting accidentally protected us from a contract-breaking change.

**Resolution**: Documented as ML-11 in SPRINT-A-E-RETROSPECTIVE. Mitigation = filesystem verification after every frontmatter dispatch. `memory: project` REJECTED as design (force-enable conflicts with B2 paradigm intent). Hindsight bank covers the use case without footgun. No upstream filing — this is orchestrator-side verification gap, not forgeplan bug.

### Anomaly #13 (NEW): restore returns artifact to draft, not prior status

`forgeplan_restore` after `_deprecate` or `_delete` returns artifact to `status=draft`, not prior status. FSM forbids `draft → deprecated` direct path, so operators must re-`_activate` then re-`_deprecate`. Captured as Sprint J+K Anomaly #13; **filed upstream as [forgeplan#291](https://github.com/ForgePlan/forgeplan/issues/291)** (2026-05-20).

### Anomaly #18 (Sprint M PRD-039): `forgeplan_drift` partial false-negative on markdown-table affected_files

Sprint M verification: `forgeplan_drift` returned `changed_files: []` for ADR-005 despite `git log --since=2026-05-16` showing 3 of its 10 affected_files (`autorun/SKILL.md`, `fpl-skills/plugin.json`, `marketplace.json`) demonstrably changed post-creation. Suspected root cause: parser fails on markdown-table syntax (ADR-005 stores affected_files as ` `path` | hash | ` table rows with backticks/pipes). 7 of 10 listed files never existed (legitimately skipped). Workaround: use `git log --since=<artifact_created>` directly. **Filed upstream as [forgeplan#293](https://github.com/ForgePlan/forgeplan/issues/293)** (2026-05-20).

### Anomaly #14 (Sprint H pre-work PRD-013): `forgeplan_discover_finding` response `status` ambiguous

The `status: active` field in `discover_finding` response refers to session state, NOT artifact state. Created artifact is in `status=draft`. Subsequent `forgeplan_deprecate` fails with FSM error. Workaround: orchestrator must `forgeplan_activate(force=true)` after each finding. **Filed upstream as [forgeplan#292](https://github.com/ForgePlan/forgeplan/issues/292)** (2026-05-20).

### Anomaly #19 (Sprint O): `_encode/_decode` zsh stderr noise — CONFIRMED USER-SIDE

`forgeplan` CLI emits `zsh: command not found: _encode/_decode` to stderr. Bash test confirmed clean output → this is user's zsh-completion setup, NOT a forgeplan bug. **NOT filed upstream.** Workaround for affected scripts: `grep -v "_encode\|_decode"`. Fix on user side: review `~/.zshrc` for stale completion plugin.

### Anomaly #20 (Sprint P): `forgeplan_activate` error UX for missing-evidence gate

PRD activation fails pre-evidence-link with "No evidence linked — create evidence and link it before activating. Use --force to override." Error doesn't suggest correct order. Operators reach for `--force` instead of fixing order. **Filed upstream as [forgeplan#294](https://github.com/ForgePlan/forgeplan/issues/294)** (2026-05-20).

### Feature request (related to Anomaly #20)

`forgeplan_new(kind="evidence", parent_id="PRD-XXX")` should auto-create `informs` link on creation, reducing 3-step EVID-creation flow to 2 steps. 100% of our Sprint A-P EVIDs (14 created) used this pattern. **Filed upstream as [forgeplan#295](https://github.com/ForgePlan/forgeplan/issues/295)** (2026-05-20).

### Artifacts (Sprint J+K)
- PRD-037 (active) — Sprint J+K scope (PRD-036 superseded as transient duplicate)
- EVID-063 (active) — per-tool verdicts + K2 roundtrip log + activity stats snapshot
- catalog v1.50.0 → **v1.51.0**
- forgeplan-workflow v1.10.0 → v1.10.1 (Phase 7.3 added)

## Sprint L 2026-05-20 — 6 more MCP tools exercised (post-Sprint J+K closure pack)

Continuation of Sprint J+K methodology. PRD-038 wrapped 4 closure deliverables (issues filed + ML-9/10 + mm-fpf-active-rules + Sprint H scaffolding); Sprint L extended with 6 more MCP tool verdicts inline within the same session.

| Tool | Verdict | Canonical example | Notes |
|---|---|---|---|
| `forgeplan_journal` | **RECOMMENDED-INTEGRATE** | `forgeplan_journal(kind="adr")` | Decision-kind timeline (ADR/Note/Problem/Solution) with R_eff + evidence count |
| `forgeplan_phase` | **RECOMMENDED-INTEGRATE** | `forgeplan_phase(id="PRD-XXX")` | Advisory lifecycle phase + append-only history; never blocks |
| `forgeplan_phase_advance` | **READY-TO-USE** | `forgeplan_phase_advance(id, to="audit")` | Schema verified; out-of-order jumps allowed (advisory layer) |
| `forgeplan_calibrate` | **RECOMMENDED-INTEGRATE** | `forgeplan_calibrate(id="PRD-XXX")` | Depth suggestions (Tactical/Standard/Deep/Critical) from dependency_links + section_count + body_length |
| `forgeplan_dispatch` | **LIMITED-USE** | `forgeplan_dispatch(agents=N, status="any")` | Requires PRDs to declare `affected_files` in frontmatter for parallel bucketing; 26/37 our PRDs lack it → serial fallback |
| `forgeplan_supersede` | **WORKS-AS-INTENDED** | `forgeplan_supersede(id="active-X", by="new-X")` | FSM correctly rejects non-active source (must be active or stale); helpful error message |

### Sprint L artifacts

- PRD-038 (active, R_eff=0.90 grade A) — closure-pack scope
- EVID-064 (active, R_eff=1.0) — verifies PRD-038 against 6 AC
- mm-fpf-active-rules — new mental model
- forgeplan#290, #291 — upstream issues filed
- SCAFFOLDING.md (brownfield-pack/agents/discover/) — Sprint H pre-work

### Anomalies surfaced (Sprint L)

- **Anomaly #14** — `discover_finding` response `status` field is session status, not artifact status (captured in EVID-064, deferred upstream filing post-v0.32)
- **Anomaly #15** — `forgeplan_link supersedes` direction is source→target (newer→older), can be set backwards silently
- **Anomaly #16** — `forgeplan_link informs` direction same risk as #15 — informs follows source-gives-info-to-target
- **Anomaly #17** — Custom YAML frontmatter fields ignored; congruence_level/verdict/evidence_type only parsed from markdown bold-pattern body (`**Congruence level**: N` numeric)

### Sprint L tools NOT exercised

`forgeplan_capture` — needs domain context (state capture for what?), DEFERRED
`forgeplan_session` — needs session lifecycle context, DEFERRED
`forgeplan_undo_last` — would mutate workspace state, DEFERRED until needed

## Sprint U/V/adopt-#288 session 2026-05-22 — autonomous 3-sprint run

User-mandated autonomous execution (no per-step confirmation): Sprint U → audit → Sprint V → audit → Sprint adopt-#288 → audit → final closure. All 3 sprints closed inline with ADI for disputes, parallel sub-agent dispatch where applicable.

| PRD | Sprint | Deliverable |
|-----|--------|-------------|
| **PRD-047** (active) | Sprint U **PIVOT** | ADI investigation: Resume Prompt batch-fix premise EMPIRICALLY REFUTED. 3-EVID test (YAML / mixed bold / strict canonical) all r_eff=0. Filed [forgeplan#325](https://github.com/ForgePlan/forgeplan/issues/325). mm-evid-body-convention updated with "necessary but not sufficient" qualifier. 0 sub-agents (saved ~145k tokens) |
| **PRD-048** (active) | Sprint V | Brownfield Discover Agent migrated standalone → `plugins/forgeplan-brownfield-pack/agents/discover/`. 4 sub-agents (3 coder Wave 1 + 1 reviewer Wave 2), 1 BLOCKER caught (missing Write/Edit/NotebookEdit) + fixed inline. Plugin v1.3.2 → v1.4.0, catalog v1.60.0 → v1.61.0 |
| **PRD-049** + **ADR-006** (both active) | Sprint adopt-#288 | ADI decision: KEEP CURRENT 4-layer NEEDS_ACTIVATION sentinel; defer native `auto_activate_source_if_complete` until forgeplan#325 unblocks. Revisit trigger documented. 0 sub-agents (decision-only) |

### Evidence (Sprint U/V/adopt-#288)

- **EVID-074** — Sprint U pivot closure (informs PRD-047) — empirical 3-EVID test case + upstream issue reference
- **EVID-075** — Sprint V closure (informs PRD-048) — 4-sub-agent dispatch + Profile B reviewer findings + post-fix verification
- **EVID-076** — Sprint adopt-#288 closure (informs PRD-049 + ADR-006) — full ADI synthesis

All 3 EVIDs created via `forgeplan_new(kind="evidence", parent_id="PRD-XXX")` (#295 auto-link feature) — **4 consecutive live demos** of #295 in Sprint T/U/V/adopt-#288 arc.

### Mental models updated

- **mm-evid-body-convention** — refreshed with Sprint U finding: bold-pattern is NECESSARY but NOT SUFFICIENT for r_eff > 0. Leaf EVIDs need either child evidence or upstream #325 fix to score > 0. Pattern: bold-pattern raises `granularity` 0.0 → 0.2, but `self_score` stays 0 until child evidence exists.

### Anomalies surfaced (Sprint U/V/adopt-#288)

- **Anomaly #25** (Sprint U) — `forgeplan_score` formula does not self-score leaf EVIDs from canonical bold-pattern body. Affects 82+ EVIDs in production marketplace graph. Filed upstream as [forgeplan#325](https://github.com/ForgePlan/forgeplan/issues/325). Severity: Low (cosmetic; no functional regression). Status: filed, accept as structural noise pending upstream fix.
- **Anomaly #26** (Sprint U process) — Resume Prompt session-handoff documents MUST be ADI-verified against current binary before launching multi-agent waves. Sprint U premise was confidently described "high ROI low risk" but premise failed empirical test in 5 minutes. ML-12 captured.
- **Anomaly #27** (Sprint V) — `scripts/validate-all-plugins.sh` LR-1..LR-7 lint rules check allowlist coverage but do NOT enforce Profile A `disallowedTools` denylist must-contain (`Write`, `Edit`, `NotebookEdit`). Allowed Sprint V BLOCKER to pass CI before Profile B reviewer audit. Recommended fix: add LR-8 rule in future hardening sprint.
- **Anomaly #28** (Sprint V observed) — Canonical agent frontmatter schema in AGENT-AUTHORING-GUIDE.md doesn't list `skills:` or `maxTurns:` fields, yet 18+ forgeplan-aware agents use them. Schema drift from documented spec. Low severity, GUIDE update sprint deferred.

### Meta-lessons (Sprint U/V/adopt-#288)

- **ML-12 (NEW)** — Resume Prompt scope claims MUST be ADI-verified against current binary before launching multi-agent waves. Pattern: "investigate first, dispatch only what survives investigation". Saved ~145k tokens + ~50 min wall-clock in Sprint U alone.
- **ML-13 (NEW)** — Profile B reviewer is mandatory even when Profile C-coder self-reports "ALL CHECKS PASS". Sprint V Coder A self-verified 7 grep checks but missed Profile A canon (Write/Edit/NotebookEdit denials). Reviewer reading the GUIDE caught it. Lesson: lint scripts check what's spec'd; reviewer reads spec to find what should be spec'd.

### Upstream issues filed (Sprint U)

| Issue | Description | Status |
|-------|-------------|--------|
| [forgeplan#325](https://github.com/ForgePlan/forgeplan/issues/325) | `forgeplan_score` returns r_eff=0 for leaf EVIDs with canonical bold-pattern bodies. 3-EVID reproducer + suggested formula change. Affects 82+ marketplace EVIDs. | Filed 2026-05-22; awaiting upstream triage |

### Sub-agent dispatch summary

| Sprint | Sub-agents | Tokens | Outcome |
|---|---:|---:|---|
| Sprint U pivot | 0 | ~5k | ADI refuted premise → no dispatch |
| Sprint V migration | 4 | ~333k | 3 parallel coder Wave 1 + 1 reviewer Wave 2, 0 failures, 1 BLOCKER caught+fixed |
| Sprint adopt-#288 | 0 | ~3k | Decision-only, inline orchestrator |
| **3-sprint total** | **4** | **~341k** | 14th-15th consecutive zero-failure sub-agent series |

### Production-grade outcomes

- Plugin layer **v1.61.0 baseline** — brownfield Discover Agent now canonical (Profile A pattern, 9 MCP brownfield tools wired)
- `forgeplan_health` = healthy post-cycle (147 artifacts, 134 active, 1 unrelated pre-existing draft)
- 18 forgeplan-aware agents (up from 17 with discover migration)
- Plugin manifest changes: brownfield-pack v1.3.2 → v1.4.0; catalog v1.60.0 → v1.61.0
- Zero modifications to non-Sprint-V plugin files (decision-only Sprint adopt-#288 + investigation-only Sprint U)

## Sprint W 2026-05-22 — Anomaly #27 + #28 closure

Inline tactical sprint post-Sprint-V closure. Closed 2 process anomalies that escaped Sprint V CI:

| PRD | Sprint | Deliverable |
|-----|--------|-------------|
| **PRD-050** (active, EVID-077 informs) | Sprint W | LR-8 lint rule added to validate-all-plugins.sh + AGENT-AUTHORING-GUIDE schema formalises `skills:`, `maxTurns:`, `isolation:` fields. Synthetic violation test verified LR-8 catches missing Write/Edit/NotebookEdit in <100ms. 0 sub-agents, ~5k tokens, ~20 min wall-clock |

### LR-8 — Profile A/B/D canon enforcement

New lint rule per AGENT-AUTHORING-GUIDE.md line 136. Agents that deny `forgeplan_activate` (Profile A creators, Profile B reviewers, Profile D maintainers) MUST also deny `Write`, `Edit`, `NotebookEdit` to enforce MCP-path-for-artifact-ops canon. Profile C-coder exception: identified by denying ALL forgeplan mutators (new/update/link), legitimately needs file-write access.

Pre-flight audit: 0/16 forgeplan-aware agents fail in current state (Sprint V discover.md fix already aligned the last outlier). Synthetic violator test verified rule fires correctly with exact error message: `"Profile A/B/D canon — disallowedTools missing file-write blocks: ['Edit', 'NotebookEdit', 'Write']"`.

### Frontmatter schema additions

Three previously-undocumented but widely-used fields now formalised in AGENT-AUTHORING-GUIDE canonical schema:

| Field | Used by | Why |
|---|---|---|
| `skills` | 18+ agents (adr-architect, specification, architecture, discover, ...) | Documents which skills agent orchestrates |
| `maxTurns` | coder (60), discover (60), Profile A/B agents (30-50) | Caps autonomous turn budget |
| `isolation: worktree` | agents-core:coder is the only marketplace agent that *declares* the field | Profile C-coder pattern — isolated git worktree for parallel safety. NOTE: declaring the field is coder-only, but worktree isolation as a runtime guarantee is NOT — standalone subagents, Workflow runs, and AgentTeams teammates all receive isolated worktrees (see "Ground-truth verification discipline" below). |

### Sprint W metrics

- 0 sub-agents (decision-only inline work)
- ~5k tokens net
- ~20 min wall-clock
- 5th consecutive forgeplan#295 live demo (EVID-077 via parent_id auto-link)
- Cumulative session token spend: ~351k across 4 sprints
- Cumulative anomalies: 28 (24 resolved post-Sprint W: 12 internal + 6 upstream-filed-and-closed + 1 user-side + 5 process)

### Anomalies resolved Sprint W

- **#27** (Sprint V) → RESOLVED. LR-8 rule live; would catch exact Sprint V BLOCKER class in CI.
- **#28** (Sprint V) → RESOLVED. Canonical schema formalises de-facto fields used by 18+ agents.
