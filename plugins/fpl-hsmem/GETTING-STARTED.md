# Getting Started with fpl-hsmem

> [!IMPORTANT]
> **3.7.0 is project-only and default-off.** Each participating project has `.hindsight.json`;
> no bank comes from a folder or global config. The initial pilot below is read-only, has
> `autoRecall: false` and `autoRetain: false`, and requires Hindsight API >=0.10.2 and <0.11.0.


A 10-minute walkthrough from "no memory at all" to "Claude remembers
your project across sessions".

If you already have Hindsight running and just need the install command,
jump to [`README.md`](./README.md). This guide is for the first time you
set up `fpl-hsmem` on a real machine.

---

## What you'll have at the end

- A local Hindsight server running in Docker, no external LLM keys
  required (uses your Claude subscription for fact extraction).
- The `fpl-hsmem` plugin loaded into Claude Code.
- One pilot project explicitly wired to an existing server bank with:
  - A project-declared `banks` allowlist and `defaultBank`.
  - A minimal read-only tool policy.
  - Auto-recall and auto-retain still off.
  - A cached compatibility check before the first bank request.

Each additional project needs its own deliberate `.hindsight.json`; plugin installation alone
does not activate memory.

---

## Step 1 — prepare a compatible Hindsight server

`fpl-hsmem` requires Hindsight API **>=0.10.2 and <0.11.0**. Do not point the Stage-0 pilot at an
unrehearsed production upgrade. If migrating from 0.9.1, follow the restored-copy rehearsal and
paired image+database rollback runbook in [`CONFIGURATION.md`](./CONFIGURATION.md#stage-0-migration-and-pilot-runbook).

For a new disposable local server, pin the compatible version rather than `latest`:

```bash
docker run -d --name hindsight \
  -p 8888:8888 \
  -p 9999:9999 \
  -e HINDSIGHT_API_LLM_PROVIDER=claude-code \
  ghcr.io/vectorize-io/hindsight:0.10.2
```

Verify both health and the API contract:

```bash
curl http://localhost:8888/health
curl http://localhost:8888/version
# /version must report api_version 0.10.2 or another supported 0.10.x patch.
```

The plugin also checks `/version` lazily and fails closed before any bank-list or bank-scoped
request. It has no implicit server URL; the project config supplies one.

> **Why this provider?** `claude-code` reuses your `claude auth login`
> credentials. Alternative providers (`openai`, `anthropic`, `ollama`,
> `groq`, ...) work too — see [`CONFIGURATION.md`](./CONFIGURATION.md#llm-providers)
> if you prefer one of them.

---

## Step 2 — install the plugin

In any Claude Code session:

```
/plugin marketplace add ForgePlan/marketplace
/plugin install fpl-hsmem@ForgePlan-marketplace
/reload-plugins
```

After reload, `claude plugin list` should show `fpl-hsmem` as active.

---

## Step 3 — configure and verify one pilot project

Choose a project and a bank that an operator has already created on the server. The plugin's
allowlist and existence check are client-side safety controls, not server authorization.

Перед запуском с `tokenFile` подготовь существующий файл внутри проекта через хранилище
учётных данных и исключи его из git. Для неаутентифицированного одноразового локального
сервера убери поле `tokenFile`. Setup не создаёт токен; отсутствующий файл делает конфиг невалидным.

```bash
cd ~/Work/my-pilot-project
cat > .hindsight.json <<'JSON'
{
  "url": "http://localhost:8888",
  "banks": ["my-pilot"],
  "defaultBank": "my-pilot",
  "tokenFile": ".secrets/hindsight.token",
  "autoRecall": false,
  "autoRetain": false,
  "allowTools": [
    "memory_recall", "memory_status", "memory_get_current_bank",
    "memory_list", "memory_get", "memory_operations",
    "mental_model_list", "mental_model_get", "directive_list",
    "bank_config_get", "document_list"
  ]
}
JSON
claude
```

Restart the client after writing the file, then call:

```
memory_get_current_bank
memory_status
```

The first bank request checks `/version`, then verifies the selected bank against the server list.
Missing/disabled configuration is silent and inert; invalid configuration lists zero tools and
prints one redacted stderr diagnostic. None of those inactive states reads a token or uses the
network.

---

## Step 4 — exercise the read-only pilot

Use `memory_recall`, `memory_list`, `memory_get`, and `document_list` against existing content.
`memory_retain_batch` remains implemented in 3.7.0 but is intentionally absent from this initial
policy, as are every retain/delete/configuration tool. No enrichment apply belongs in Stage 0.

If the bank is empty, stop: creating/seeding it is a later write-enablement decision, not a reason
to weaken the pilot policy.

---

## Step 5 — observe before enabling automation

Use the project normally while keeping the initial write freeze. Because `autoRecall` and
`autoRetain` are false, the hooks are silent and perform no network or token acquisition.
Repository configuration alone is not sufficient consent to enable automatic hooks.

After the read-only canary has been reviewed, enable one boundary at a time under a separate
record. Production cutover and later write enablement are different decisions. Do not turn on
transcript capture as a convenience during the Stage-0 pilot.

---

## Step 6 — later, separately authorize write features

Mental-model creation, bootstrap, manual retain, transcript capture, and enrichment apply are
write operations. They are deliberately outside the initial pilot. A later authorization may add
only the needed tools and then use `/fpl-hsmem:bootstrap` or `/fpl-hsmem:mental-model`; it should
not replace the read-only policy wholesale with an unrestricted surface.

For enrichment, the MCP `memory_retain_batch` tool only plans. The operator CLI
`node dist/enrich.mjs <file> --apply --confirm <digest>` performs a write after separate
authorization. Its digest proves file/plan freshness only—not ownership, approval, or permission.

---

## Step 7 — explore the web UI (optional)

Hindsight ships with a memory graph visualizer:

```
open http://localhost:9999
```

You can see entities Hindsight extracted, relationships between them,
the raw memories, and run search queries directly. Useful for debugging
recall quality.

---

## What to do next

During the Stage-0 canary:

1. **Run `/fpl-hsmem:status`** and the read-only tools to establish expected behavior.
2. **Record compatibility and bank-selection observations** without changing server state.
3. **Review the migration gates** before any production cutover.
4. **Create a separate write-enablement record** if retain, bootstrap, mental-model creation, or
   automatic hooks are later wanted.
5. **Read [`USAGE.md`](./USAGE.md)** for the post-pilot workflows.

---

## Common first-day issues

| Symptom | Most likely cause | Fix |
|---------|-------------------|-----|
| No Hindsight tools | `.hindsight.json` missing/disabled | Add the project file deliberately; remove `.hindsight-disabled` only if intended |
| One stderr config diagnostic, zero tools | invalid project config | Fix the named field; secrets and raw token-command output are redacted |
| Compatibility error before bank access | server is 0.9.1, 0.11+, malformed, or unreachable | restore/use a server in >=0.10.2 and <0.11.0; do not bypass the gate |
| Bank refused | outside `banks` or absent from server list | correct the explicit config or have an operator create the bank separately |
| No automatic memories | expected in Stage 0 | both hooks remain off until later authorization |

Full diagnostic via `/fpl-hsmem:diagnose` or
[`TROUBLESHOOTING.md`](./TROUBLESHOOTING.md).

---

## Multi-project and multi-runtime workflow

Each participating project needs its own `.hindsight.json`; nothing derives a bank from its folder.
For Claude Code, install the plugin once and keep its hooks default-off. For Codex or OMP, register
`node /absolute/path/to/fpl-hsmem/dist/index.mjs` once in that runtime's project MCP config. Do not
also hand-wire a second copy in the same runtime, and do not add legacy bank environment selectors.
