# Session Resume Prompt — ForgePlan Marketplace (post-Sprint T, 2026-05-22)

> **Use this prompt to start any future Claude Code session in this workspace.** Copy paste the relevant sections into the new session's first message OR reference this file via `Read` tool. Designed so the new session can pick up cold с full context за 5 минут чтения.

---

## TL;DR — что это и где мы

ForgePlan Marketplace — каталог Claude Code плагинов для structured engineering workflow. Сейчас **post-v0.32.1 production-grade baseline** после **16 sprints** (Sprint A → Sprint T). Plugin layer **truly maxed**. Все upstream anomalies (6) filed + closed + adopted. Methodology compound interest очевиден через 9 consecutive R_eff≥0.9 first-attempt activations.

**State**: catalog v1.60.0, 15 plugins, 17 forgeplan-aware agents, 10 mental models, 24 anomalies (12 resolved + 6 filed/closed + 1 user-side + 5 process), 11 meta-lessons. forgeplan_health = **healthy**.

---

## 1. Контекст проекта

### Что такое и для чего

**ForgePlan ecosystem**:
- **Marketplace** (этот repo): 15 плагинов для Claude Code — workflow + agents + memory + UX
- **forgeplan CLI** (separate repo): structured artifact storage (PRD/RFC/ADR/EVID/NOTE/SPEC/EPIC) + LanceDB + MCP server + ~40 MCP tools
- **Hindsight** (`fpl-hsmem` plugin): cross-session memory bank + mental models + document ingest

**Главный принцип**: "Agents do everything, user provides only information." AI агенты автономно выполняют engineering tasks через структурированные artifacts, человек даёт только domain info.

### Локации

```
~/Work/ForgePlanMarketplace/              ← workspace root (НЕ git)
├── .forgeplan/                           ← artifact store (LanceDB) — shared across child repos
├── forgeplan-marketplace/                ← GitHub: ForgePlan/marketplace (THIS git repo)
│   ├── .git/
│   ├── CLAUDE.md                         ← canonical project memory (always loaded)
│   ├── AGENTS.md                         ← cross-CLI shim (Gemini/Codex/Goose)
│   ├── .claude-plugin/marketplace.json   ← plugin catalog v1.60.0
│   ├── plugins/                          ← 15 plugins
│   │   ├── fpl-skills/                   ← 27 skills + dev-advisor agent (FLAGSHIP)
│   │   ├── fpl-hsmem/                    ← Hindsight v2 plugin
│   │   ├── forgeplan-workflow/           ← /forge-cycle, /forge-audit
│   │   ├── forgeplan-orchestra/          ← Orchestra MCP sync
│   │   ├── forgeplan-brownfield-pack/    ← 12 brownfield skills (Sprint V scope)
│   │   ├── fpf/                          ← First Principles Framework
│   │   ├── agentic-rag/                  ← Sprint O — SKILL.md methodology
│   │   ├── fp-cookbook/                  ← Sprint P — 26 recipes + Sprint R 5 polyglot
│   │   ├── laws-of-ux/                   ← 30 UX laws
│   │   ├── dev-toolkit/                  ← (deprecated, superseded by fpl-skills)
│   │   ├── agents-core/                  ← 11 agents (coder = только writer)
│   │   ├── agents-pro/                   ← 28 agents (12 forgeplan-aware)
│   │   ├── agents-domain/                ← 11 lang specialists (typescript/golang)
│   │   ├── agents-github/                ← 7 PR/issue/release agents
│   │   └── agents-sparc/                 ← 5 SPARC methodology agents
│   ├── docs/                             ← 8+ key load-bearing docs (см. секция 7)
│   └── scripts/validate-all-plugins.sh   ← canonical lint gate
└── agents/discover/                      ← STANDALONE brownfield agent (Sprint V migration target)
```

### Авторитет источников

| Что нужно знать | Где смотреть |
|---|---|
| Текущее состояние project | `forgeplan_health` MCP call |
| Список плагинов + версии | `.claude-plugin/marketplace.json` + `forgeplan-marketplace/CLAUDE.md` |
| История sprint'ов + meta-lessons | `docs/SPRINT-A-E-RETROSPECTIVE.md` |
| Канонические frontmatter правила для agents | `plugins/fpl-skills/AGENT-AUTHORING-GUIDE.md` |
| Рецепты «как делать X в forgeplan» | `plugins/fp-cookbook/skills/fp-cookbook/sections/` |
| Production-grade canon (Anthropic + community) | `docs/ASM.md` |
| Performance baseline (tools latency) | `docs/PERFORMANCE-BASELINE-SPRINT-Q.md` |
| Honest error budget + chaos scenarios | `docs/CHAOS-TEST-SPRINT-S.md` |
| Hindsight optimization gaps | `docs/HINDSIGHT-OPTIMIZATION-SPRINT-R.md` |

---

## 2. Что сделано (Sprint A → T)

**16 sprints completed**. См. `SPRINT-A-E-RETROSPECTIVE.md` для full timeline.

| Sprint | Theme | Key delivery |
|---|---|---|
| A | UX layer | agent-advisor + sentinel protocol |
| B | Closure pack | 7 deliverables / 3 waves |
| C | /autorun resume | session checkpoint schema (643 LOC spec) |
| D | Self-healing | /forge-cleanup + 3-tier auto-resolution |
| E | Audit + GA v2.3.0 | live smoke GREEN |
| F | Plugin closure | Anomaly #1+#11 + retrospective doc |
| G | Core adoption | CLI unlink fallback (Anomaly #5 partial fix) |
| J+K | 4 MCP tools live | release_notes/restore/stats/fpf live exercise |
| L+M | Closure + ML-9/10 | Anomaly #17 (EVID body bold-pattern) + Step 9b.1 |
| N | Doc sync | mm-evid-body-convention + retrospective update |
| O | agentic-rag plugin | 22 files + link footgun detection |
| P | fp-cookbook plugin | 37 files / 26 recipes |
| Q | Production-grade closure | 17 frontmatter + evals + anti-patterns |
| R | Memory architecture + polyglot | memory:project REJECTED + 5 polyglot recipes |
| S | Logical closure | Step 9c + ingest_file + chaos test |
| T | v0.32.1 adoption | 5/6 fixes verified + 3 MCP wired + 82 root-cause |

**Major outcomes**:
1. **Self-validating ecosystem**: 6 upstream issues filed → forgeplan core shipped all 6 в v0.32.1 → Sprint T adopted all 6
2. **11 meta-lessons** captured (ML-1..ML-11) — methodology compound interest visible
3. **Native MCP adoption complete**: `forgeplan_anomalies`, `forgeplan_unlink`, EVID auto-link `parent_id` all wired
4. **24 anomalies** triaged: 12 resolved internally, 6 filed-and-closed upstream, 1 user-side, 5 process (#21-24)

---

## 3. Что в очереди (Sprint U/V/adopt-#288)

### Sprint U — Batch-fix 82 historical EVIDs (~1-1.5h, **LOW risk / HIGH ROI**)

**Что**: 82 старых EVID artifacts (EVID-001..EVID-051+, pre-Sprint M era) используют YAML-style structured fields:
```yaml
## Structured Fields

verdict: supports
congruence_level: 3
evidence_type: measurement
```

Парсер forgeplan читает только **markdown bold-pattern**:
```markdown
**Verdict**: PASS — <one-line>

- **Congruence level**: 3
- **Evidence type**: artifact_inspection
```

Из-за этого 82 EVID имеют R_eff=0 → cascade penalty на parent PRDs → `forgeplan_anomalies` surface 82 `weakest_link_unresolvable` (low/adi).

**Как делать**:
1. `PRD-047` создать + activate
2. Параллельные Profile C-coder sub-agents (по 20 EVIDs каждому, file-isolated)
3. Каждый sub-agent: `forgeplan_get(EVID-XXX)` → identify YAML fields → re-write в bold-pattern body via `forgeplan_update(id, body=...)` → `forgeplan_score` verify CL=3
4. **ML-11 mandatory**: orchestrator grep-verify on disk after each sub-agent return
5. Final: `forgeplan_anomalies` should show 0 weakest_link_unresolvable
6. Catalog bump v1.60 → v1.61 (только если plugin files touched; иначе nothing to bump — only artifact bodies)
7. EVID-074 + commit + PR

**Risk**: low (косметика данных, не runtime behavior). Single anomaly kind, single pattern.

**ROI**: high — R_eff baseline cleanup, blind_spots clean, honest scoring across entire artifact graph.

### Sprint V — Brownfield Discover Agent migration (~2-3h, **MEDIUM risk / MEDIUM ROI**)

**Что**: `agents/discover/` standalone (44KB: agent.md 18KB + protocol.json 26KB) написан April 2026 когда forgeplan не имел MCP brownfield tools. v0.32.1 ship'нул 9 новых MCP tools (`forgeplan_orphans`, `_contradictions`, `_coverage_business`, `_hypothesis_promote`, `_hypothesis_status`, `_interview_packet_draft`, `_interview_packet_ingest`).

**Как делать**:
1. `PRD-048` создать + activate (depth=Deep, депенды на #287)
2. Read existing standalone agent.md + protocol.json — understand current procedure
3. Migration plan:
   - Move `agents/discover/agent.md` → `plugins/forgeplan-brownfield-pack/agents/discover/discover.md`
   - Rewrite procedure: replace custom protocol с 9 MCP tools
   - Create example `domain_model_id` artifact (test fixture) для `coverage_business` tool
   - Create example interview_packet (test fixture) для `interview_packet_*` tools
4. Update brownfield-pack `plugin.json` + `marketplace.json` (catalog v1.61 → v1.62)
5. Live smoke test: brownfield agent runs against test repo, returns valid findings
6. EVID-075 + commit + PR

**Risk**: medium (significant code change in 44KB legacy agent). Mitigation: standalone остаётся until migration verified.

**ROI**: medium (brownfield workflow becomes plugin-canonical; не блокирует ничего).

### Sprint adopt-#288 — Design decision (~1h, **HIGH risk / LOW ROI** — recommend KEEP CURRENT)

**Что**: v0.32 добавил `forgeplan_link(auto_activate_source_if_complete=True)` parameter. Когда source = evidence с complete fields (verdict + congruence_level + R_eff>0), link auto-activates EVID. **Может заменить нашу 4-layer NEEDS_ACTIVATION sentinel defense** (Sprint D).

**Pro adoption**:
- Меньше кода (убираем sentinel + parser + 3-tier logic)
- Native primitive vs plugin workaround

**Con adoption**:
- 4-layer защита works в 12+ sprints, 0 failures, 48 dispatches
- Native parameter имеет unknown edge cases
- Замена working на working = риск без visible benefit

**Recommendation**: **KEEP CURRENT 4-LAYER DEFENSE**. Document the feature exists, declare intentionally non-adopted. Можно revisit если concrete pain surfaces.

**Output if executed**: PRD-049 с ADR (Architecture Decision Record) — explicit decision + rationale documented. NO code changes. ~1h decision documentation.

### Что ещё в backlog

- **47 audit findings → fp-cookbook troubleshooting** — incremental, низкий priority, добавить когда дойдут руки
- **HINDSIGHT_RETAIN_TOOL_CALLS=true** env config — user-side change, не Sprint scope
- **Cross-CLI smoke** (Gemini/Codex/Goose) — exploratory, требует CLI installs
- **forgeplan v0.33+ adopt** — wait for upstream ship; #287 epic ongoing

---

## 4. Workflow / how to work in this project

### Канонический методологический поток

```
Route → Shape → Build → Audit → Evidence → Commit → PR → Activate
```

| Шаг | Что | Skip allowed for |
|---|---|---|
| Route | `forgeplan route "task"` — определить глубину | typo fixes |
| Shape | `forgeplan_new(kind="prd")` + fill body + validate | tactical work |
| Build | Sub-agent dispatch via `Task(subagent_type=...)` или inline | — |
| Audit | `validate-all-plugins.sh` + maybe `/audit` skill | docs-only |
| Evidence | `forgeplan_new(kind="evidence", parent_id="PRD-XXX")` — auto-link via #295 | tactical |
| Commit | branch + `git add` specific files + commit с conventional message | — |
| PR | `gh pr create` to main | — |
| Activate | `forgeplan_activate(EVID)` then `forgeplan_activate(PRD)` | — |

### Sub-agent dispatch — when to use

**Inline orchestrator** (no dispatch):
- < 5 file edits
- Pure documentation changes
- Single-concern fixes
- Validation/health checks

**Sub-agent dispatch** (via `Task(subagent_type="agents-X:Y", prompt="...")`):
- ≥5 file edits in parallel
- Long-running tasks (>50 turns)
- Domain-specific work (Profile A creator, Profile B reviewer)
- Wave-based file isolation needed

**Canonical sub-agent types**:
- `agents-core:coder` — Profile C-coder, only writer of source files, has `isolation: worktree`
- `agents-core:code-reviewer` — Profile B reviewer
- `agents-pro:research-analyst` — Profile C read-only synthesis
- `agents-pro:adr-architect` — Profile A creator для ADR
- `agents-pro:artifact-author` — Profile A generic creator
- `agents-pro:guardian` — Profile B gate

### Filesystem verification (ML-11 mandatory)

После КАЖДОГО Profile C-coder dispatch который claims file changes:

```bash
# Verify claimed file existence
test -f <path> && echo "EXISTS" || echo "MISSING"

# Verify specific marker present
grep -c "<expected_marker>" <file>

# Verify JSON validity if applicable
python3 -c "import json; json.load(open('<file>'))"
```

Sub-agent's "ALL PASSED" lint result is **necessary but NOT sufficient**. Orchestrator grep-verify is the closure proof. See `AGENT-AUTHORING-GUIDE.md` "Orchestrator Step 9c".

### EVID body convention (Anomaly #17 / mm-evid-body-convention)

EVID body MUST use **markdown bold-pattern** в body, NOT YAML frontmatter:

```markdown
# EVID-XXX: <title>

## Verdict

**Verdict**: PASS — <one-line>

- **Congruence level**: 3 (<observed: live invocation / structured output / cross-system>)
- **Evidence type**: <artifact_inspection | live_verification | code_review | test_run>
- **Method**: <how evidence gathered>
```

YAML `congruence_level: high` silently fails parsing → R_eff=0. Always check `forgeplan_score(EVID)` after creation. CL=0 means parsing failed.

### Activate order (Anomaly #20)

`forgeplan_activate(PRD)` requires evidence linked first. Canonical order:

```python
# Pre-v0.32.1 (3-step):
evid = forgeplan_new(kind="evidence", title="...")
forgeplan_update(id=evid.id, body="<bold-pattern>")
forgeplan_link(source=evid.id, target="PRD-XXX", relation="informs")
forgeplan_activate(id=evid.id)
forgeplan_activate(id="PRD-XXX")  # now succeeds

# Post-v0.32.1 (2-step via #295):
evid = forgeplan_new(kind="evidence", title="...", parent_id="PRD-XXX")
# auto_linked happens — visible in response
forgeplan_update(id=evid.id, body="<bold-pattern>")
forgeplan_activate(id=evid.id)
forgeplan_activate(id="PRD-XXX")  # now succeeds
```

### Link direction (Anomalies #15/#16 — detection in Sprint O)

`forgeplan_link` is **directional**: source → target.
- `supersedes`: NEWER source supersedes OLDER target (e.g., RFC-002 supersedes RFC-001)
- `informs`: source provides info to target (e.g., EVID informs PRD, NOT vice versa)
- `refines`: source refines target (newer artifact refines elder)

**Footgun check**: `plugins/fpl-skills/skills/forge-cleanup/scripts/detect_link_footguns.sh` — graph-walk surfaces inverted links. 4 found Sprint O, all fixed Sprint P.

---

## 5. Critical conventions

### Git workflow

- **ВСЕГДА через feature branch + PR**, не push to main/dev directly
- Branch naming: `feat/short-description`, `fix/...`, `chore/...`, `docs/...`
- Commit message: conventional (`feat(module): summary` + body + `Co-Authored-By:`)
- PR body format: Summary + Verification + Test plan (checkboxes preferably checked already)
- Merge via `gh pr merge --admin` after `gh pr checks <N>` green
- **NEVER**: `git push --force`, `git add .` blindly, `--no-verify`

### Version bumping

При любом изменении plugin:
1. Bump `plugin.json` version (patch/minor/major per change scope)
2. Bump `marketplace.json` plugin entry version
3. Bump `marketplace.json` metadata.version (catalog)

| Изменение | Bump |
|---|---|
| Typo, README | patch |
| Bug fix, hook | minor |
| New command/agent, breaking | major |

### dogfood discipline (Sprint D onwards)

- ACTIVATE PRD + EVID immediately upon creation — no draft accumulation
- Inline activate via canonical order (см. секция 4)
- Don't accumulate "I'll activate later" pile

### Run validation per change

After every plugin file edit:
```bash
cd forgeplan-marketplace
./scripts/validate-all-plugins.sh  # full validation
# OR
./scripts/validate-all-plugins.sh <plugin-name>  # single plugin
```

ALL PASSED before merge. Zero tolerance for errors/warnings.

---

## 6. Hindsight memory patterns

### When to call manually (auto-hooks handle most)

- **Session start**: `memory_recall("project context")` — one broad recall
- **Topic-specific**: `memory_recall("specific topic")` when needed
- **Save lesson**: `memory_retain(...)` only for non-obvious facts (auto-retain handles transcript)
- **Living page**: `mental_model_get(id)` for synthesized topics (cheaper than recall + reflect)

### 10 mental models (all auto-refresh on consolidation)

1. `mm-pipeline-methodology` — what to apply per phase
2. `mm-agent-selection` — specialist agent per task
3. `mm-gate-failures` — common gate causes
4. `mm-fpf-examples` — when FPF decompose/evaluate/reason
5. `mm-branch-decision` — feature/bug/epic/refactor detection
6. `mm-draft-hygiene` — EVID draft 3-tier resolution
7. `mm-pipeline-anomalies` — 9 anomaly kinds + 3-tier
8. `mm-fpf-active-rules` — 5 default FPF rules
9. `mm-evid-body-convention` — Anomaly #17 codified
10. `mm-production-grade-checklist` — ASM canon mapping

### memory_retain content shape

For non-obvious lessons:
- **One-line topic heading**
- **For decisions/patterns**: rule → **Why:** → **How to apply:**
- **For bugs**: symptom → root cause → fix → one-line lesson
- Concrete: paths, env vars, versions, command examples
- Bias to fewer larger memories over many tiny fragments

---

## 7. Key load-bearing references

| Doc | When to read |
|---|---|
| `forgeplan-marketplace/CLAUDE.md` | Auto-loaded every session |
| `docs/SPRINT-A-E-RETROSPECTIVE.md` | Need full sprint history + 11 ML |
| `docs/CHAOS-TEST-SPRINT-S.md` | Question about error budget / chaos |
| `docs/HINDSIGHT-OPTIMIZATION-SPRINT-R.md` | Question about Hindsight API |
| `docs/PERFORMANCE-BASELINE-SPRINT-Q.md` | Question about tool latency / caching |
| `docs/ASM.md` | Question about Anthropic canon / community best practices |
| `plugins/fpl-skills/AGENT-AUTHORING-GUIDE.md` | Authoring/migrating agents (1100+ LOC canonical) |
| `plugins/fpl-skills/skills/forge-cleanup/SKILL.md` | Anomaly classification + cleanup |
| `plugins/fp-cookbook/skills/fp-cookbook/sections/` | Recipes для специфической задачи |

---

## 8. Upstream tracking

### Closed (v0.32.1 shipped 2026-05-21)
- forgeplan#286 unlink primitive (CLI v0.31 + MCP v0.32.1)
- forgeplan#288 pipeline hygiene auto-activate
- forgeplan#289 forgeplan_anomalies MCP
- forgeplan#290 release_notes split-repo
- forgeplan#291 restore prior_status
- forgeplan#292 discover_finding status
- forgeplan#293 forgeplan_drift markdown
- forgeplan#294 activate error UX
- forgeplan#295 EVID auto-link parent_id

### Still open
- forgeplan#287 brownfield extraction MCP epic (Phase C partial via _orphans/_contradictions; full = Sprint V)
- forgeplan#296-#304, #307, #318 — v0.33 backlog from forgeplan core team

---

## 9. Quick-start commands for new session

```bash
# 1. Verify environment
forgeplan --version              # should be v0.32.1+
cd forgeplan-marketplace
git status                       # clean tree on main
git log --oneline -3             # recent merged sprints

# 2. Health check
# (via Claude Code, not bash)
mcp__forgeplan__forgeplan_health  # verdict=healthy expected
mcp__plugin_fpl-hsmem_hindsight__memory_status  # bank=forge-marketplace, 3036+ memories

# 3. Recall context
mcp__plugin_fpl-hsmem_hindsight__memory_recall("Sprint A-T summary")
mcp__plugin_fpl-hsmem_hindsight__mental_model_list  # 10 models expected
mcp__plugin_fpl-hsmem_hindsight__mental_model_get("mm-evid-body-convention")  # canonical EVID body
mcp__plugin_fpl-hsmem_hindsight__mental_model_get("mm-pipeline-anomalies")     # anomaly catalog

# 4. Pick next sprint
# Option A: Sprint U (cleanup) — see section 3
# Option B: Sprint V (brownfield migration) — see section 3
# Option C: Defer — wait for v0.33 or user request
```

---

## 10. Когда что делать

### Если приходит ad-hoc user request

1. Use `forgeplan route "<description>"` to determine depth (Tactical / Standard / Deep / Critical)
2. If Standard+ → `forgeplan_new(kind="prd")` first, validate, activate inline
3. Execute work per established workflow (section 4)
4. EVID + activate inline (section 4 canonical order)
5. Commit + PR
6. Update CLAUDE.md / catalog if plugin changed

### Если "что делать?" question

Default: prefer **Sprint U** (1-1.5h, low risk, high ROI). Then **Sprint V** when wanted. Skip adopt-#288 unless concrete pain.

### Если "идеально работает / production-grade" goal

Plugin layer **already at this state** post-Sprint T. Further work = incremental polish, not foundational gaps.

### Если "хочу проверить cross-CLI"

Install Gemini CLI / Codex CLI / Goose locally, then run a representative `/forge-cycle` task через каждый. Compare outputs vs Claude Code baseline. AGENTS.md is the cross-CLI shim.

---

## 11. Anti-patterns to avoid

1. **Don't trust sub-agent return values** (ML-11) — filesystem grep verify
2. **Don't use YAML frontmatter** for EVID body verdict/CL/evidence_type (Anomaly #17) — bold-pattern only
3. **Don't use `based_on`** for evidence→PRD (Anomaly #5) — use `informs`
4. **Don't add `memory: project`** to agents (force-enables Read/Write/Edit overriding denylist — Sprint R rejected design)
5. **Don't push to main directly** — always feature branch + PR
6. **Don't `git add .` blindly** — specific files only
7. **Don't activate PRD without EVID linked** (Anomaly #20) — canonical 2-step order
8. **Don't accumulate draft pile** — inline activate per artifact creation
9. **Don't expect upstream-closed = MCP available** (ML-8) — verify via ToolSearch
10. **Don't speculative-ship features** without demand signal (NOTE-003 trigger pattern)

---

## 12. Compound interest evidence

5 consecutive R_eff ≥ 0.9 grade A first-attempt activations post-Sprint M:
- Sprint M (PRD-039): 0.90 first try (Anomaly #17 lesson applied)
- Sprint N (PRD-040): 0.90 first try
- Sprint O (PRD-014): 1.00, (PRD-041): 0.90
- Sprint P (PRD-013): 0.90
- Sprint Q (PRD-042): 1.00 first try
- Sprint R (PRD-044): grade A
- Sprint S (PRD-045): grade A
- Sprint T (PRD-046): **1.00 grade A, NO weakest_link** (cleanest in arc)

Sub-agent dispatch reliability:
- 48 cumulative dispatches Sprint A-T
- 0 failures (13 consecutive zero-failure series)
- Average 60-80k tokens per dispatch
- Up to 5 concurrent parallel waves без conflicts

---

## 13. Финальный TL;DR для следующей сессии

1. **Project healthy, plugin layer maxed pre-v0.33**
2. **3 backlog items spec'd**: Sprint U (cleanup, 1.5h), Sprint V (brownfield migration, 2.5h), Sprint adopt-#288 (decision, 1h, recommend KEEP CURRENT)
3. **Read CLAUDE.md first** — auto-loaded, has plugin versions + recent sprints
4. **memory_recall context** — Hindsight has full Sprint A-T snapshot ingested as document + 4 retain entries + 10 mental models
5. **Pick task or wait** — if no specific user request, default to Sprint U (highest ROI)
6. **Apply ML-11 verification** to all sub-agent dispatches
7. **Use bold-pattern EVID body** + `parent_id` auto-link
8. **Dogfood discipline**: activate inline, no draft pile

If in doubt — `forgeplan_health` для current state, `memory_recall` для historical context. Foundation is solid.
