# Forgeplan workspace — `.gitignore` contract

**Audience**: developers using the Forgeplan CLI / MCP in a team. Also — agent sessions (Claude Code, Cursor, etc.) that may incorrectly classify files as "cache/derived" on the first commit of `.forgeplan/`.

**TL;DR**: `config.yaml` stores **names** of env vars for API keys (not the keys themselves). The actual keys live in process env / `.env` (gitignored, via direnv or similar). `.forgeplan/.gitignore` has a strictly defined list of derived/runtime state. **All artifact kinds — including `memory/`, `notes/`, `state/` — are tracked.**

---

## Canonical `.forgeplan/.gitignore`

```gitignore
# Forgeplan derived/cache/runtime state — NOT committed.
# Source of truth: markdown in prds/, rfcs/, adrs/, specs/, epics/,
# evidence/, problems/, solutions/, refresh/, notes/, memory/
# + lifecycle YAML in state/
# + config.yaml (project config — TRACKED, but no literal API keys)

lance/                 # LanceDB vector index — derived
.fastembed_cache/      # bge-m3 embedding model cache (~600 MB)
logs/                  # local audit/ops logs (per-machine)
.lock                  # runtime mutex
session.yaml           # runtime focus/claim state (per-machine)
trash/                 # soft-deleted artifacts (forgeplan delete)
discovery/             # ephemeral research findings (see note below)

# 🔴 Secrets (env var loaders)
.env
.env.local
```

> **Note on `discovery/`** — gitignored by default because it's short-lived research before formalising into a PRD/RFC. If your team practises sharing research drafts, you can drop the line and track them explicitly. Default works for most teams.

---

## What MUST stay tracked

| File / folder | Why mandatory in git |
|---|---|
| `config.yaml` | Project config (layout, embedding model, llm provider). Without it `forgeplan` 0.28+ fails with `os error 2` on any subcommand. Analogous to `package.json` — part of the project, not a cache. Without it, time-travel reconstruction in `@forgeplan/web` breaks. New contributor clones the repo and must get **the same** forgeplan experience. |
| `prds/*.md` | First-class artifacts |
| `rfcs/*.md` | First-class artifacts |
| `adrs/*.md` | First-class artifacts |
| `specs/*.md` | First-class artifacts |
| `epics/*.md` | First-class artifacts |
| `evidence/*.md` | First-class artifacts (R_eff scoring depends on these being shared) |
| `problems/*.md` | First-class artifacts |
| `solutions/*.md` | First-class artifacts |
| `refresh/*.md` | First-class artifacts |
| **`notes/*.md`** | First-class artifacts. `forgeplan_new note` creates `NOTE-NNN-*.md`. They have a lifecycle (`draft → active → superseded`), appear in `forgeplan list/graph`, count in `health`. **If gitignored — graphs differ across team members**, backlog stored as NOTE is lost. |
| **`memory/*.md`** | First-class artifact kind in Forgeplan with categories (`fact` / `convention` / `constraint` / `observation` / `procedure`). Lifecycle-managed. **Don't confuse with [Hindsight MCP memory](#the-two-memory-concepts--dont-confuse-them)** — that is a separate cloud-backed system. |
| `state/*.yaml` | Lifecycle state of each artifact (status, claims, links). Without it, after clone, `forgeplan list` shows everything as `draft`. |

---

## Effects of typical classification mistakes

### 1. `config.yaml` in gitignore (most common mistake)

| Surface | What breaks |
|---|---|
| **Time-travel slider** in `@forgeplan/web` | `git worktree add` creates an ephemeral checkout without `config.yaml` → `forgeplan reindex` fails with `os error 2` → reconstruction returns generic `502 snapshot reconstruction failed`. |
| **New contributor** | Clones repo → `forgeplan` uses default config, not project config → different embedding model, llm provider, decay timings. Results of `search` / `route` / `score` differ between people. |
| **CI / smoke jobs** | Ephemeral runner gets the wrong config — `forgeplan validate` may pass locally but fail in CI. |
| **`forgeplan health`** | May not even start (CLI 0.28+ fails on any subcommand without config). |

### 2. `notes/` in gitignore (second-most common mistake)

| Surface | What breaks |
|---|---|
| **Team workspace** | NOTE artifact created locally → `forgeplan list` shows it, but on commit it doesn't reach the repo → colleagues don't see it → divergent artifact graphs. |
| **`@forgeplan/web` viewer** | Node count differs between machines. You see 13, your colleague sees 12 — because NOTE-001 (your backlog) didn't reach them. |
| **Time-travel reconstruction** | In `git worktree` of an old SHA those NOTEs aren't present — OK. But if a NOTE is deleted in a new commit, the local stale file remains, and the diff with the past shows "node disappeared" where it just was never committed. |
| **R_eff / blindspots** | NOTEs can affect decay rules / blindspot detection. Different NOTEs → different risk metrics. |
| **PR-Diff overlays** (planned) | `git diff .forgeplan/` won't show NOTE changes → "+N ~M -K" counters lie. |

### 3. `session.yaml` NOT in gitignore (inverse mistake)

`session.yaml` stores **runtime state** — current focus task, last-activity, local claim timeouts. Forgeplan writes to it on **every** operation.

| Effect |
|---|
| **Merge conflict on every PR** — each developer generates their own diff in `session.yaml`, `git pull` regularly conflicts. |
| **Noise in `git log`** — review buried under session-update commits. |
| **Race conditions** — if two developers simultaneously change the same session-state, the merge becomes lossy. |

### 4. `state/` in gitignore (rare but fatal)

`state/<ID>.yaml` — the **lifecycle state** of an artifact (status, claims, links, valid_until). If gitignored:

- After clone all artifacts look like `draft` — regardless of the repo containing `active` PRDs with evidence.
- The activation gate `R_eff > 0` is lost between sessions.
- Claims (multi-agent dispatch) disappear on commit.

### 5. `memory/` in gitignore (artifact-loss mistake)

`memory/*.md` files are first-class Forgeplan artifacts with categories (fact, convention, constraint, observation, procedure). If gitignored:

| Surface | What breaks |
|---|---|
| Team conventions | A "convention" memory recording "we always use feat:* prefix" exists locally, doesn't reach colleagues, conventions drift. |
| Constraint propagation | A "constraint" memory ("Lambda cold start budget = 2s") visible only on its author's machine, others violate it without knowing. |
| `forgeplan list` | Memory artifacts missing from the list, blindspot detection misses them. |
| Time-travel | Memory creation/deletion never appears in history — graph evolution looks broken. |

### 6. Literal API key in `config.yaml` (security mistake)

`config.yaml` IS tracked, but it must contain only the **name** of the env var holding the key:

```yaml
llm:
  provider: gemini
  api_key_env: GEMINI_API_KEY    # ← env var NAME, not the key itself
```

If a literal key landed in any commit:

1. `git rm --cached .forgeplan/config.yaml`
2. Rewrite to `api_key_env`
3. **Revoke the leaked key** — it's already in git history; `git rm --cached` doesn't erase it from past commits.
4. Re-stage and commit.

---

## How to handle API keys (the real mechanism)

`config.yaml` is **tracked** but contains only the env var **name**:

```yaml
llm:
  provider: gemini
  model: gemini-2.0-flash-thinking-exp-01-21
  api_key_env: GEMINI_API_KEY
  max_tokens: 8192

embedding:
  model: bge-m3

# scoring, decay, fpf rules — also tracked in config.yaml
```

The actual key lives in process env. Options:

- `.env` file (gitignored) + direnv or dotenv loader in shell
- Export in `~/.zshrc` / `~/.bashrc` (local dev machine only)
- CI secrets (GitHub Actions secrets, GitLab CI variables, etc.)
- `export GEMINI_API_KEY=...` before each `forgeplan` invocation

### Default fallback chain

If `api_key_env` is omitted, `resolve_api_key()` falls back based on `provider`:

| Provider | Default env var |
|---|---|
| `openai` | `OPENAI_API_KEY` |
| `anthropic` | `ANTHROPIC_API_KEY` |
| `gemini` | `GEMINI_API_KEY` |

Be explicit (`api_key_env: …`) when running multiple providers in parallel.

### Single config file

| What | Supported? |
|---|---|
| `secrets.yaml` | ❌ no — there is **no** separate secrets file. Don't create one. |
| `config.local.yaml` | ❌ no — there is no per-machine config override. |
| `config.yaml` | ✅ the **only** config. |
| Env var overrides | ✅ explicitly: `FORGEPLAN_LLM_PROVIDER`, `FORGEPLAN_LLM_MODEL`, `FORGEPLAN_LLM_BASE_URL`, `FORGEPLAN_LLM_MAX_TOKENS`, `FORGEPLAN_LLM_API_KEY_ENV`, `FORGEPLAN_EMBEDDING_MODEL`, `FORGEPLAN_STORAGE_DRIVER`/`PATH`, `FORGEPLAN_MEMORY_DRIVER`. |
| API keys from env | ✅ `config.yaml` stores `api_key_env: "GEMINI_API_KEY"` (the var name); the key itself is read from process env via `resolve_api_key()`. |

So `config.yaml` does not leak API keys when written correctly (use `api_key_env`, not literal `api_key`).

### Env var overrides (priority: env > config.yaml > default)

Forgeplan accepts these overrides without editing `config.yaml`:

- `FORGEPLAN_LLM_PROVIDER` — overrides `llm.provider`
- `FORGEPLAN_LLM_MODEL` — overrides `llm.model`
- `FORGEPLAN_LLM_BASE_URL` — overrides `llm.base_url`
- `FORGEPLAN_LLM_MAX_TOKENS` — overrides `llm.max_tokens`
- `FORGEPLAN_LLM_API_KEY_ENV` — overrides which env var contains the key
- `FORGEPLAN_EMBEDDING_MODEL` — overrides `embedding.model`
- `FORGEPLAN_STORAGE_DRIVER` / `FORGEPLAN_STORAGE_PATH`
- `FORGEPLAN_MEMORY_DRIVER`

Local dev can override config from the shell without touching the file.

---

## How to verify your workspace

```bash
# 1. What you have ignored
cat .forgeplan/.gitignore

# 2. config.yaml present and tracked?
git ls-files .forgeplan/config.yaml                 # should return the path
test -f .forgeplan/config.yaml && echo "ok on disk" || echo "MISSING"

# 3. session.yaml MUST NOT be tracked
git ls-files .forgeplan/session.yaml                # empty = ok, path returned = bad

# 4. notes/, memory/, state/ ARE tracked
git ls-files .forgeplan/notes/  | head -3
git ls-files .forgeplan/memory/ | head -3
git ls-files .forgeplan/state/  | head -3

# 5. Derived caches NOT tracked
git ls-files .forgeplan/lance/                      # empty = ok
git ls-files .forgeplan/.fastembed_cache/           # empty = ok
git ls-files .forgeplan/.env                        # empty = ok

# 6. config.yaml has no literal API key
! grep -qE 'api_key:\s*["'"'"']?(sk-|AIza|ant-)[A-Za-z0-9_-]{20,}' .forgeplan/config.yaml \
  && echo "✅ config.yaml clean" \
  || echo "❌ literal API key — revoke + rewrite to api_key_env"

# 7. CLI works
forgeplan health
forgeplan list | head -5
```

If `(2)` is empty, or `(3)` returns a path, or `(4)` is empty, or `(6)` reports a leak — workspace is misaligned. See [Migration](#migration-from-a-misaligned-state) below.

---

## Migration from a misaligned state

If something is already committed wrong — the fix lands as **one commit**:

```bash
# (a) Remove wrong ignores, add the right ones
$EDITOR .forgeplan/.gitignore
# - DELETE lines: config.yaml, notes/, memory/, state/  (if present)
# - ADD lines:    session.yaml, lance/, .fastembed_cache/, logs/, .lock,
#                 trash/, discovery/, .env, .env.local  (if absent)

# (b) Sync tracking
git add .forgeplan/config.yaml                          # was ignored, now tracked
git add .forgeplan/notes/    2>/dev/null
git add .forgeplan/memory/   2>/dev/null
git add .forgeplan/state/    2>/dev/null
git rm --cached .forgeplan/session.yaml      2>/dev/null   # untrack, file stays on disk
git rm -r --cached .forgeplan/lance/         2>/dev/null   # untrack derived index
git rm -r --cached .forgeplan/.fastembed_cache/ 2>/dev/null

# (c) ONE commit with a meaningful message
git add .forgeplan/.gitignore
git commit -m "chore(forgeplan): align .forgeplan/.gitignore with canonical contract

- track config.yaml (project config, not cache)
- track notes/, memory/, state/ (first-class artifacts and lifecycle YAML)
- ignore session.yaml (per-machine runtime state)
- ignore lance/, .fastembed_cache/ (derived caches)

Without this alignment: time-travel reconstruction breaks,
team workspace state diverges between machines, merge conflicts
on every PR via session.yaml."
```

After merge — every team member runs `git pull` and once `forgeplan reindex` (in case the local `lance/` is stale).

---

## Anti-patterns (for agent sessions)

When an AI agent first sets up `.forgeplan/.gitignore`, it **may** group files by weak semantic similarity. Concrete observed mistakes:

### ❌ 1. Gitignoring `memory/`

`memory/` is an **artifact kind** in Forgeplan with categories (fact / convention / constraint / observation / procedure). Tracked. Don't confuse with Hindsight MCP memory (a separate cloud-backed system with per-project banks).

### ❌ 2. Literal API key in `config.yaml`

```yaml
# WRONG:
llm:
  api_key: "sk-proj-..."

# RIGHT:
llm:
  api_key_env: "OPENAI_API_KEY"
```

`config.yaml` is tracked, so a literal key is a **leak in git history**.

### ❌ 3. Tracked `session.yaml`

`session.yaml` is per-machine runtime state (current focus, claim TTLs). Forgeplan writes to it on every operation. Tracked → merge conflicts on every PR.

### ❌ 4. Grouping by weak similarity (most likely on first init)

Avoid these false groupings:

- **"Cache/derived: lance/, logs/, config.yaml"** — `lance/` and `logs/` are derived; `config.yaml` is **not**. Different categories.
- **"Volatile state: session.yaml, notes/, memory/"** — `notes/` and `memory/` are **artifacts** with lifecycle, not volatile. Only `session.yaml` is volatile.
- **"Local-only: state/, config.yaml"** — `state/` defines lifecycle and **must** be shared. It's part of source-of-truth.

When in doubt: open `forgeplan list --json` — if a file produces an entry in `list`, it's an **artifact** and must be tracked. If it doesn't (cache, log, lock, runtime focus state) — ignore it.

---

## The two "memory" concepts — don't confuse them

There are two unrelated systems both called "memory":

| | `.forgeplan/memory/` | Hindsight MCP memory |
|---|---|---|
| **What** | Forgeplan artifact kind (fact/convention/constraint/observation/procedure) | Cloud-backed long-term memory for Claude Code |
| **Tracked in git** | YES (first-class artifact) | N/A (lives outside the repo) |
| **Authority** | Project-level shared knowledge with lifecycle | Cross-session, cross-project knowledge |
| **Access** | `forgeplan_new memory` / `forgeplan list` | `mcp__hindsight__memory_*` tools |
| **Survives clone** | Yes — same as PRDs/ADRs | Yes (cloud) |

Both are "memory" but at different layers. `.forgeplan/memory/` is for shared *project* knowledge ("we always do X"). Hindsight is for *agent's personal* knowledge across all projects ("user prefers shorter explanations").

---

## Setup steps for a fresh project

```bash
# 1. Init forgeplan
forgeplan init -y

# 2. Create the canonical .gitignore
$EDITOR .forgeplan/.gitignore
# (paste the canonical contents from above)

# 3. Verify config.yaml has no literal API key
grep -E '^\s*api_key:\s*["'"'"']?[A-Za-z0-9_-]{20,}' .forgeplan/config.yaml
# If anything matches — that's a literal key. Replace with api_key_env.

# 4. Create .env (gitignored) with the real key
cat > .env <<'EOF'
# Local dev secrets — DO NOT commit (.env is gitignored)
GEMINI_API_KEY=AIza...your-actual-key-here
EOF

# 5. Load env when working with forgeplan
# Option A — direnv (auto-load):
echo "dotenv .env" > .envrc
direnv allow

# Option B — manual export per session:
set -a && source .env && set +a

# Option C — CI: use the platform's secrets manager.

# 6. Stage the correct paths
git add .forgeplan/.gitignore
git add .forgeplan/config.yaml          # uses api_key_env, no literals
git add .forgeplan/prds/ .forgeplan/rfcs/ .forgeplan/adrs/ \
        .forgeplan/specs/ .forgeplan/epics/ \
        .forgeplan/evidence/ .forgeplan/problems/ \
        .forgeplan/solutions/ .forgeplan/refresh/ \
        .forgeplan/notes/ .forgeplan/memory/ \
        .forgeplan/state/ 2>/dev/null

# 7. If something incorrect was already tracked
git rm --cached .forgeplan/session.yaml          2>/dev/null
git rm -r --cached .forgeplan/lance/             2>/dev/null
git rm -r --cached .forgeplan/.fastembed_cache/  2>/dev/null

# 8. First commit
git commit -m "chore(forgeplan): initialise workspace with canonical .gitignore"
```

---

## AI-agent rules (paste into your project `CLAUDE.md`)

> Forgeplan artifact mutations through MCP/CLI **only**
> (`mcp__forgeplan__forgeplan_*` or the `forgeplan` CLI). Never use
> `Edit` / `Write` / `sed` directly on
> `.forgeplan/{prds,adrs,specs,rfcs,evidence,notes,memory,solutions,problems,refresh}/*.md`
> or `state/*.yaml`. Direct edits desync the LanceDB index, the state
> machine, and the canonical body. Recovery:
> `forgeplan_update id=<ID> body=<full new body>` (idempotent) or
> `forgeplan scan-import` rebuilds LanceDB from markdown.

---

## Why this contract exists

- **Source of truth**: markdown is human-readable, diff-friendly, survives forgeplan version changes. The vector index (`lance/`) is rebuilt from it on every `forgeplan scan-import`.
- **12-factor secrets**: separating *what env var holds the key* (in tracked config) from *the key itself* (in untracked env) lets the same config work across dev/staging/prod without code changes, and prevents accidental commits. There is no separate `secrets.yaml` — that would be redundant; `api_key_env` solves it cleanly.
- **`notes/` ARE artifacts**: forgeplan treats them like PRDs and ADRs — typed, scored, lifecycle-managed. They aren't "user notes" to be hidden in `.gitignore`.
- **`memory/` ARE artifacts**: project-level shared knowledge with categories. Different from per-agent caches; different from Hindsight MCP. **Tracked.**
- **`state/*.yaml`**: lifecycle state machine per artifact. Tracked because it encodes lifecycle transitions that other team members need to see (e.g. who activated an artifact and when).
- **`session.yaml` is per-machine**: focus / claims. **Not tracked** because it's transient and would conflict on every PR.

---

## Related references

- ADR-003 in the Forgeplan repo: "Markdown is source of truth, Lance is derived".
- `forgeplan init` does NOT create `.forgeplan/.gitignore` itself — it leaves the choice to the project (verified on CLI 0.28).
- `@forgeplan/web` rule 22 (`template/src/routes/api/`) — read-only proxy also depends on `config.yaml` presence in ephemeral worktrees.
- `plugins/fpl-skills/skills/bootstrap/resources/guides/CLAUDE-MD-GUIDE.ru.md` — CLAUDE.md best practices.
- `docs/MIGRATION-DEV-TOOLKIT-TO-FPL-SKILLS.md` — migration guide if you're switching plugins.
