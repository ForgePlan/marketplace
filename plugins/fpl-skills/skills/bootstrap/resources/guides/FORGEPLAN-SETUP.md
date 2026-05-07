# Forgeplan setup contract — `.forgeplan/` workspace

Authoritative reference for setting up `.forgeplan/` correctly in a project.
Deviations break team collaboration and risk leaking API keys via `git`.
Keep this file in sync with the actual `forgeplan` CLI behaviour — when the
CLI changes the contract, update here first, then propagate to
`CLAUDE.md.template` and verification scripts.

---

## TL;DR

`config.yaml` stores the **names** of env vars holding API keys (not the
keys themselves). The actual keys live in process env / `.env`
(gitignored, loaded via direnv or similar). `.forgeplan/.gitignore` has a
fixed list of derived/runtime state. All artifact kinds (including
`memory/`, `notes/`, `state/`) are **tracked**.

---

## Canonical `.forgeplan/.gitignore`

```gitignore
# Forgeplan derived/cache/runtime state — NOT committed.
# Source of truth: markdown in prds/, rfcs/, adrs/, specs/, epics/,
# evidence/, problems/, solutions/, refresh/, notes/, memory/
# + lifecycle YAML in state/
# + config.yaml (project config — TRACKED, but without literal API keys)

lance/                 # LanceDB vector index — derived
.fastembed_cache/      # bge-m3 embedding model cache (~600 MB)
logs/                  # local audit/ops logs (per-machine)
.lock                  # runtime mutex
session.yaml           # runtime focus/claim state (per-machine)
trash/                 # soft-deleted artifacts
discovery/             # ephemeral research findings

# 🔴 Secrets (env var loaders)
.env
.env.local
```

## What is mandatory tracked

`config.yaml`, and **all** artifact-kind directories: `prds/`, `rfcs/`,
`adrs/`, `specs/`, `epics/`, `evidence/`, `problems/`, `solutions/`,
`refresh/`, `notes/`, `memory/`, `state/`.

---

## How to handle API keys (the real mechanism)

`.forgeplan/config.yaml` does **not** store the key itself — it stores the
**name** of the env var:

```yaml
llm:
  provider: gemini
  model: gemini-2.0-flash-thinking-exp-01-21
  api_key_env: GEMINI_API_KEY    # ← env var name, not the key itself
  max_tokens: 8192

embedding:
  model: bge-m3

# scoring, decay, fpf rules — also tracked in config.yaml
```

The actual key lives in process env. Options:

- `.env` file (gitignored) + direnv or dotenv-loader in shell
- Export in `~/.zshrc` / `~/.bashrc` (local dev machine only)
- CI secrets (GitHub Actions secrets, GitLab CI variables, etc.)
- `export GEMINI_API_KEY=...` before each `forgeplan` invocation

When committing `config.yaml`, confirm it does not contain a literal API
key (e.g. `api_key: "sk-..."` or `api_key: "AIza..."`). If you accidentally
committed a literal — `git rm --cached`, rewrite to `api_key_env`, and
**revoke the leaked key** (it is already in git history).

## Env var overrides (priority: env > config.yaml > default)

Forgeplan reads the following variables at runtime:

- `FORGEPLAN_LLM_PROVIDER` — overrides `llm.provider` in config
- `FORGEPLAN_LLM_MODEL` — overrides `llm.model`
- `FORGEPLAN_LLM_BASE_URL` — overrides `llm.base_url`
- `FORGEPLAN_LLM_MAX_TOKENS` — overrides `llm.max_tokens`
- `FORGEPLAN_LLM_API_KEY_ENV` — overrides which env var contains the API key
- `FORGEPLAN_EMBEDDING_MODEL` — overrides `embedding.model`
- `FORGEPLAN_STORAGE_DRIVER` / `FORGEPLAN_STORAGE_PATH`
- `FORGEPLAN_MEMORY_DRIVER`

This means local dev can override config from shell without editing the
file.

---

## Three anti-patterns to avoid

### ❌ 1. Gitignoring `memory/`

`memory/` is an artifact kind in Forgeplan (categories:
`fact` / `convention` / `constraint` / `observation` / `procedure`).
**Tracked.** Do not confuse with Hindsight MCP memory (a separate system
with per-project banks).

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

`session.yaml` is per-machine runtime state (current focus, claim TTLs).
Forgeplan writes to it on every operation. If tracked → merge conflicts on
every PR.

---

## Setup steps

```bash
# 1. Init forgeplan (if not already done)
forgeplan init -y

# 2. Create the canonical .gitignore
$EDITOR .forgeplan/.gitignore
# (paste the content from "Canonical .forgeplan/.gitignore" above)

# 3. Verify config.yaml does not contain a literal API key
grep -E '^\s*api_key:\s*["'"'"']?[A-Za-z0-9_-]{20,}' .forgeplan/config.yaml
# If anything matches — that is a literal key. Replace with api_key_env.

# 4. Create .env (gitignored) with real keys
cat > .env <<'EOF'
# Local dev secrets — DO NOT commit (.env is gitignored)
GEMINI_API_KEY=AIza...your-actual-key-here
EOF

# 5. Load env when working with forgeplan:
# Option A — direnv (auto-load):
echo "dotenv .env" > .envrc
direnv allow

# Option B — manual export per session:
set -a && source .env && set +a

# Option C — CI: use the platform's secrets manager.

# 6. Stage the correct paths
git add .forgeplan/.gitignore
git add .forgeplan/config.yaml          # must use api_key_env, not literal
git add .forgeplan/prds/ .forgeplan/rfcs/ .forgeplan/adrs/ \
        .forgeplan/specs/ .forgeplan/epics/ \
        .forgeplan/evidence/ .forgeplan/problems/ \
        .forgeplan/solutions/ .forgeplan/refresh/ \
        .forgeplan/notes/ .forgeplan/memory/ \
        .forgeplan/state/ 2>/dev/null

# 7. If something incorrect was already tracked:
git rm --cached .forgeplan/session.yaml 2>/dev/null
git rm -r --cached .forgeplan/lance/ 2>/dev/null
git rm -r --cached .forgeplan/.fastembed_cache/ 2>/dev/null

# 8. Commit
git commit -m "chore(forgeplan): align .forgeplan/.gitignore with canonical contract"
```

## Verification (run after the commit)

```bash
# Should be tracked (path returned):
git ls-files .forgeplan/.gitignore
git ls-files .forgeplan/config.yaml
git ls-files .forgeplan/prds/ | head -3
git ls-files .forgeplan/notes/ | head -3
git ls-files .forgeplan/memory/ 2>/dev/null

# Should be IGNORED (empty output):
git ls-files .forgeplan/lance/
git ls-files .forgeplan/.fastembed_cache/
git ls-files .forgeplan/session.yaml
git ls-files .forgeplan/.env

# config.yaml does not contain literal keys:
! grep -qE 'api_key:\s*["'"'"']?(sk-|AIza|ant-)[A-Za-z0-9_-]{20,}' .forgeplan/config.yaml \
  && echo "✅ config.yaml clean" \
  || echo "❌ literal API key detected — fix before push"

# CLI works:
forgeplan health
forgeplan list | head -5
```

---

## Bonus: agent instruction for project `CLAUDE.md`

Add to the AI-agent rules section of the project's `CLAUDE.md`:

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

- **Source of truth**: markdown is human-readable, diff-friendly, survives
  forgeplan version changes. The vector index (`lance/`) is rebuilt from
  it on every `forgeplan scan-import`.
- **12-factor secrets**: separating *what env var holds the key* (in
  tracked config) from *the key itself* (in untracked env) lets the same
  config work across dev/staging/prod without code changes, and prevents
  accidental commits.
- **`memory/` and `notes/` ARE artifacts**: forgeplan treats them like
  PRDs and ADRs — typed, scored, lifecycle-managed. They aren't "user
  notes" to be hidden in `.gitignore`.
- **`state/*.yaml`**: lifecycle state machine per artifact. Tracked
  because it encodes lifecycle transitions that other team members need
  to see (e.g. who activated an artifact and when).
- **`session.yaml`**: per-machine focus / claims. **Not tracked** because
  it's transient and would conflict on every PR.
