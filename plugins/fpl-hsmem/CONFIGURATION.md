# Configuration

> **Note.** Since 3.7.0 configuration
> is **project-only and opt-in**: one `.hindsight.json`, found by walking up from the working
> directory, is the whole of it. There is no user-wide config, no bank derived from the directory
> name, and no way for environment variables to switch the plugin on.

## Where the file is looked for

From the working directory upwards, stopping at the **git toplevel** (a directory with a `.git`
directory, or a `.git` file in a linked worktree). Outside a repository the walk stops at `$HOME`;
outside both, only the working directory itself is checked. **`$HOME/.hindsight.json` is never
read** — a config there would switch the plugin on for every project under the home directory. A
config above the repository is ignored too: it is not that repository's decision.

## What a config may do with your credentials

A `.hindsight.json` can be committed by whoever controls the repository, and it names both the
server (`url`) and where the token comes from. So it is not trusted with more than it needs:

- **`tokenFile`** must resolve — symlinks followed — to a file **inside the directory that holds
  `.hindsight.json`**. An absolute path elsewhere, a `..` escape or a symlink pointing out makes
  the config invalid. Otherwise a cloned repository could send any file you can read (an SSH key,
  a cloud credential) to a server of its choosing as the bearer token.
  Проверка фиксирует идентичность файла; при первом запросе токен читается через проверенный
  файловый дескриптор. Замена файла после загрузки конфигурации вызывает отказ. После атомарной
  ротации tokenFile перезапустите MCP/CLI, чтобы загрузить новую идентичность.
- **`tokenCommand`** runs only when **you** set `HINDSIGHT_ALLOW_TOKEN_COMMAND=1` in your
  environment. Without it, a config that names one is invalid (inert, with the reason).
- **`HINDSIGHT_API_KEY`** is used only together with **`HINDSIGHT_URL`**. Alone it is ignored, so
  your key never travels to a url that a repository chose.
- Config discovery and validation do not read a token or execute `tokenCommand`. The token is
  acquired lazily only when an active configuration makes its first network request.
- Hooks acquire it only after deciding to run (`autoRecall` / `autoRetain`), so inactive and invalid
  states, and a prompt the hooks ignore, perform no token read/command and no network request.

## The rule

| State | MCP server | Hooks |
|---|---|---|
| `missing`: no `.hindsight.json` at or above cwd | answers the handshake, lists **no tools**, silent on stderr | silent no-op; no token or network |
| `disabled`: `.hindsight-disabled` in cwd or next to the config, or `HINDSIGHT_DISABLED=true` | same inert, silent behavior | silent no-op; no token or network |
| `invalid`: config exists but fails validation | zero tools; exactly one useful redacted stderr diagnostic | no action; one useful redacted stderr diagnostic; no token or network |
| `active`: valid `.hindsight.json` | configured tool policy (28 tools without a policy) | recall only if `autoRecall: true`; retain only if `autoRetain: true` |

Diagnostics never print a token, a token file's contents, or raw `tokenCommand` output.
Ошибки конфигурации содержат только имя поля и нарушенное правило: без введённых значений,
абсолютных путей и фрагментов JSON. Один запуск MCP или hook выводит одну физическую строку.

## `.hindsight.json`

Во всех примерах ниже `tokenFile` предполагает уже подготовленный файл токена внутри проекта,
исключённый из git. Setup не создаёт этот файл. Для неаутентифицированного одноразового
локального сервера убери `tokenFile` (и не передавай `--token-file` в setup).

```json
{
  "url": "http://hindsight.example.internal:8888",
  "banks": ["team", "analytics"],
  "defaultBank": "team",
  "tokenFile": ".secrets/hindsight.token",
  "autoRecall": false,
  "autoRetain": false
}
```

| Key | Type | Default | Meaning |
|---|---|---|---|
| `url` | string | **required** | Hindsight API base URL (`http://` or `https://`). |
| `banks` | string[] | **required**, non-empty | Allowlist. The only banks any tool may touch. |
| `defaultBank` | string | **required**, must be in `banks` | Used when a tool call omits `bank`; the only bank the recall hook reads. |
| `tokenFile` | string | — | File holding the bearer token. Relative paths resolve against the directory containing `.hindsight.json`; the real path must stay inside that directory. Keep it out of git. |
| `tokenCommand` | string[] | — | argv (run without a shell, 10 s timeout) whose stdout is the token — e.g. `["security", "find-generic-password", "-s", "hindsight", "-w"]`. Used only when `tokenFile` is absent, and only with `HINDSIGHT_ALLOW_TOKEN_COMMAND=1` in your environment. |
| `autoRecall` | boolean | `false` | Inject recalled memories from `defaultBank` before each prompt. |
| `autoRetain` | boolean | `false` | Capture the session transcript on Stop / SessionEnd. See below. |
| `recallBudget` | `low`\|`mid`\|`high` | `mid` | Recall thoroughness. |
| `recallMaxTokens` | number | `1024` | Recall token budget. |
| `recallTypes` | string[] | `["world","experience"]` | Fact types the hook recalls. |
| `recallContextTurns` | number | `1` | Prior turns folded into the hook's query. |
| `recallMaxQueryChars` | number | `800` | Query length cap. |
| `recallRoles` | string[] | `["user","assistant"]` | Roles used when composing the query. |
| `recallPromptPreamble` | string | (built in) | Text above injected memories. |
| `retainEveryNTurns` | number | `10` | Throttle for the Stop hook (only with `autoRetain`). |
| `retainRoles` / `retainToolCalls` / `retainContext` / `retainTags` | | | Transcript formatting (only with `autoRetain`). |
| `debug` | boolean | `false` | Log to stderr. |
| `allowTools` | string[] | all | Tool policy: only these tools are listed and callable. See [Tool policy](#tool-policy). |
| `denyTools` | string[] | — | Tool policy: these tools are never listed and refuse calls. Wins over `allowTools`. |
| `enrichMaxChars` | number (≤ 2000) | `900` | Longest `content` a batch-enrichment item may carry. See [Batch enrichment](#batch-enrichment). |
| `routing` | object | `{}` | Repository name or glob → bank, for batch-enrichment items that name no `bank`. Every target must be in `banks`. See [Batch enrichment](#batch-enrichment). |

Refused keys — the config is treated as invalid, never silently reinterpreted: `bankId` (use
`banks` + `defaultBank`), `apiKey` (never store the token in the config; use `tokenFile` /
`tokenCommand`), `bankMission`, `retainMission`, `enabled`.

### Token precedence

`HINDSIGHT_API_KEY` env (only together with `HINDSIGHT_URL`) → `tokenFile` → `tokenCommand` (only with `HINDSIGHT_ALLOW_TOKEN_COMMAND=1`) → none. `memory_status` and
`memory_get_current_bank` report *where* the token came from, never the token.

**Доступ по ключу сохранён.** Активный проект по-прежнему отправляет `Authorization: Bearer`
с ключом из выбранного источника. Можно использовать пару `HINDSIGHT_URL` +
`HINDSIGHT_API_KEY` в пользовательском окружении или `tokenFile`/явно разрешённый
`tokenCommand`. Ключ без проектного opt-in не включает плагин глобально; поле `apiKey`
в JSON намеренно отвергается, чтобы ключ не попадал в репозиторий.

### Environment variables

Only these are read, and only for a project that is already configured:

| Variable | Effect |
|---|---|
| `HINDSIGHT_URL` | overrides `url` |
| `HINDSIGHT_API_KEY` | supplies the token — **only when `HINDSIGHT_URL` is set too** |
| `HINDSIGHT_ALLOW_TOKEN_COMMAND` | `1` lets a config's `tokenCommand` run |
| `HINDSIGHT_DEBUG` | turns on `debug` |
| `HINDSIGHT_DISABLED` | turns the plugin off |

`HINDSIGHT_BANK_ID`, `HINDSIGHT_AUTO_RETAIN` and the other upstream variables are ignored.

## Tool policy

`allowTools` / `denyTools` name tools (bare names, e.g. `document_delete`). A tool the policy removes
is not listed and a direct call is refused as an unknown method — it is not merely described as
off-limits. An unknown name makes the config invalid, so a typo cannot silently leave a tool on.
`memory_get_current_bank` reports what is enabled (`"tools": "all"` without a policy).

Hindsight's own per-bank tool allowlist (`mcp_enabled_tools`) applies only to its built-in MCP
endpoint. This plugin talks REST with the configured token, so `BankGate` and this policy narrow
what this **client** will call; they are not server-side authorization and do not protect a bank
from other clients or credentials.

**Recommended Stage-0 pilot profile** — read-only and intentionally minimal. It excludes
`memory_retain_batch` even though the tool remains implemented, and it is paired with
`autoRecall: false` and `autoRetain: false`:

```json
{
  "autoRecall": false,
  "autoRetain": false,
  "allowTools": [
    "memory_recall", "memory_status", "memory_get_current_bank",
    "memory_list", "memory_get", "memory_operations",
    "mental_model_list", "mental_model_get", "directive_list",
    "bank_config_get", "document_list"
  ]
}
```

## Several banks

Every tool except `memory_get_current_bank` and `memory_retain_batch` takes an optional `bank`.
Omitted, it is `defaultBank`. This client refuses a call **before any bank-scoped request** when the
bank is outside `banks` or absent from the server's `GET /v1/default/banks` response. This prevents
the plugin from causing Hindsight's implicit create-on-write behavior through an unapproved bank
name. It does not change server permissions, prevent another client from creating banks, or prove
that every read endpoint is non-creating. There is no cross-bank search: ask each bank separately.

## Batch enrichment

`memory_retain_batch` remains available as an MCP **read-only planner** for a JSONL file of
distilled candidates. It validates, routes and previews, but never applies. A separately authorized
operator may apply the same plan with `dist/enrich.mjs`; keeping write authority out of the MCP
surface is part of the initial adoption posture. The procedure for producing the file is the
`/fpl-hsmem:enrich` skill. Both entry points read this same `.hindsight.json`.

```json
{
  "url": "http://hindsight.example.internal:8888",
  "banks": ["team", "payments", "platform"],
  "defaultBank": "team",
  "tokenFile": ".secrets/hindsight.token",
  "enrichMaxChars": 900,
  "routing": {
    "billing-service": "payments",
    "billing-*": "payments",
    "infra-*": "platform",
    "*": "team"
  }
}
```

**Bank per item.** An item's explicit `bank` wins. Otherwise its `metadata.repo` is looked up in
`routing`: an exact key first, then the first glob (`*` any run, `?` one character) in declaration
order. No match → the line is refused; it is **never** sent to `defaultBank` by default, because a
wrong bank is a silent split of the team's memory. Add `"*": "<bank>"` if you want a catch-all.
A route to a bank outside `banks` makes the whole config invalid, so the mistake is reported where
it was made. The client also refuses a resolved bank absent from the server's list.

**Line schema.** `kind` (`decision`|`rejected`|`lesson`|`pitfall`|`rule`|`finding`), `content`
(≤ `enrichMaxChars`), `context`, `timestamp` (ISO date or datetime — when it was decided),
`document_id` (letters, digits, `. _ ~ : -`; unique within the file), optional `tags` (strings),
`metadata` (string values), `bank`. Any other field refuses the line — it is usually a typo.

**Refused, never sent.** A line that fails validation, cannot be routed, names a disallowed or
missing bank, or carries a credential or personal-data shape (private key, bearer token, JWT,
known token prefixes, `password=`, credentials in a URL, database DSNs, long opaque tokens, email
addresses) is listed with its line number and the reason — the matched text is never echoed. The
rest of the file proceeds.

Проверяются также имена metadata-полей. Невалидный/чувствительный document_id не возвращается
в refusal record, а ошибки вида/полей не воспроизводят введённые значения. Проверка остаётся
pattern-based: отсутствие совпадений не доказывает отсутствие всех возможных секретов.

**Dry run is the default.** It reports counts per bank and kind, the refused lines, which
`document_id`s already exist on the server (an operator apply would replace them), and samples.
Only the CLI apply path posts `/v1/default/banks/{bank}/memories` in batches per bank, `async: true`,
each item with `update_mode: "replace"` and `observation_scopes: "shared"`, and prints operation
ids. Re-running the same file is idempotent: same `document_id`s, replaced in place.

**The digest proves freshness only.** Dry run prints a sha256 over the file bytes and resolved plan
(banks, routing, refusals, existing documents и fingerprint эффективного server endpoint).
CLI apply recomputes it and refuses any difference. При смене URL нужен новый dry-run;
отчёт показывает fingerprint назначения, а не сырой URL с возможными credentials.
A matching digest is an anti-TOCTOU check; it is **not** human authorization, ownership, or
permission to write. Operator authorization for apply is a separate gate.

**Apply never replaces a document enrich did not write.** Every item is written with the tag
`source-tool:enrich`. A `document_id` that already exists without that tag — a captured transcript,
an ingested document, a manual retain — refuses its line, and the dry run names it. Pass
`--allow-replace-foreign` только в отдельно разрешённом операторском CLI, когда замена намеренна; это меняет
the digest, so dry-run with it too. The tag guards against accidents, not against a writer who sets
it on purpose.

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/enrich.mjs" candidates.jsonl                  # dry run
node "${CLAUDE_PLUGIN_ROOT}/dist/enrich.mjs" candidates.jsonl --apply --confirm <digest>   # write
#   --allow-replace-foreign  --max-chars N (overrides enrichMaxChars, ≤ 2000)  --batch-size N (default 20, max 100)
#   --samples N (dry-run samples per bank, default 2)  --json (machine-readable summary)
```

CLI exit codes: `0` every line accepted (and queued, with `--apply`); `3` some lines refused; `1`
config, file, server, confirmation or batch failure; `2` usage. Both planner entry points require
the file to be inside the project root, symlinks followed (same rule as `document_ingest_file`).

## Why `autoRetain` is off by default

Before 3.7.0 the whole conversation was captured after every response. Since 3.7.0 the plugin keeps the Stop and
SessionEnd hooks registered but makes them do nothing unless `autoRetain: true`:

- memory is meant for curated facts and decisions, not a store of raw conversation;
- transcripts carry whatever was pasted into a session — credentials included — and server-side
  masking applies to future writes only;
- every captured session becomes an extraction job and a document someone has to audit.

Write deliberately with `memory_retain` (or `document_ingest` for a real document) instead. Even
with `autoRetain: true`, a retain into a bank the server does not have is skipped.

## Scaffolding

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/setup.mjs" --url http://hindsight.example.internal:8888 \
  --bank team --bank analytics --token-file .secrets/hindsight.token
```

Writes `.hindsight.json` (first `--bank` is the default) with the Stage-0 read-only policy and both
hooks off, plus `.claude/rules/hindsight.md`. The plugin registers the MCP server and hooks itself;
no `.mcp.json` is written.

## Direct client registration

The plugin install registers one Claude Code runtime. Do not also hand-wire it in that runtime.
For Codex or OMP, register the same built bundle once in that client's project configuration:
command `node`, argument `/absolute/path/to/fpl-hsmem/dist/index.mjs`, working directory the project.
The server discovers `.hindsight.json` itself; do **not** add legacy `HINDSIGHT_BANK_ID` selectors,
and do not put a token in a committed MCP config. One registration per runtime avoids two clients
quietly writing to different banks.

## Проверки входа и файлов

MCP исполняет опубликованные input schemas до bank/network действий. Невалидные типы
аргументов возвращают `InvalidParams`, а не преобразуются в строки и цели удаления.
При ingest ошибка lookup или неизвестный/некорректный memory count означает отказ;
проверенный HTTP 404 или целый нулевой счётчик — единственные разрешающие варианты.

`document_ingest_file`, MCP planner и enrich CLI читают только regular-файл внутри проекта,
через проверенный дескриптор, с лимитом 2 MiB. Допустимы ссылки на файл внутри проекта;
ссылки наружу, FIFO, каталоги, подмена объекта и изменение файла во время чтения отвергаются.

## Hindsight server compatibility

The prerequisite is Hindsight API **>=0.10.2 and <0.11.0**. On the first bank-list or bank-scoped
request, an active client calls `/version`; the result is cached. API 0.9.1, 0.11+, missing or
malformed versions, and request failures all fail closed before any bank request. Missing,
disabled, and invalid project configurations make no version request or other network call.
No URL is implied: every active `.hindsight.json` must declare `url`.

Nothing calls the endpoints 0.10 removed (`GET/PUT /banks/{id}/profile`,
`POST /banks/{id}/background` → 410). The bank persona is `reflect_mission`, set with
`memory_set_mission` via `PATCH /banks/{id}/config`. `tests/test-hindsight-010.sh` pins this.

## Stage-0 migration and pilot runbook

This is rehearsal guidance, not production-cutover authorization:

1. Rehearse **0.9.1 → 0.10.2** on a restored copy. Prove restore before touching the source
   system. Roll back the **image and database together**; never mix a downgraded image with an
   upgraded database.
2. Make configuration changes first, then canary **one boundary at a time**. Keep exactly one
   registration per runtime. Begin with the read-only pilot policy above, `autoRecall: false`,
   `autoRetain: false`, no retain hooks, and no enrichment apply.
3. Freeze writes initially. Repository configuration alone is not consent to enable automatic
   hooks. Enable no automatic write path merely because `.hindsight.json` was committed.
4. Quiesce ForgePlanOps, take fresh **M/U/O** snapshots, classify all eight roles, and transact the
   migration as one controlled operation. Record production cutover separately from the later
   decision to enable writes.
5. A later production backup/cutover requires documented encryption, least privilege,
   authenticated integrity, custody, retention, destruction, and successful restore evidence.
   Write enablement needs its own later record and authorization.

---

## LLM providers (Hindsight server side)

`fpl-hsmem` is just an MCP client — the actual LLM for fact extraction
runs inside the Hindsight server. Provider is set when you launch the
Docker container.

| Provider | env vars |
|----------|----------|
| `claude-code` (recommended) | `HINDSIGHT_API_LLM_PROVIDER=claude-code` (no API key needed — reuses `claude auth login` credentials) |
| `openai` | `HINDSIGHT_API_LLM_PROVIDER=openai`, `HINDSIGHT_API_LLM_API_KEY=sk-...` |
| `anthropic` | `HINDSIGHT_API_LLM_PROVIDER=anthropic`, `HINDSIGHT_API_LLM_API_KEY=sk-ant-...` |
| `ollama` | `HINDSIGHT_API_LLM_PROVIDER=ollama`, `HINDSIGHT_API_LLM_BASE_URL=http://host.docker.internal:11434/v1`, `HINDSIGHT_API_LLM_MODEL=gemma3:12b` |
| `groq` | `HINDSIGHT_API_LLM_PROVIDER=groq`, `HINDSIGHT_API_LLM_API_KEY=gsk_...` |

See [Hindsight docs](https://hindsight.vectorize.io/developer/models) for
the full provider list and per-provider quirks.

---

## State files

Hooks persist runtime state under:

```
~/.hindsight/state/
├── turns.json       Per-session turn counter (used by retain throttling)
└── retention.json   Per-session message_count (used for compaction detection)
```

State files are bounded — capped at 10 000 sessions with FIFO eviction.
Safe to delete at any time; counters reset on next retain cycle.

If `CLAUDE_PLUGIN_DATA` env is set (plugin runtime), state lives there
instead — `${CLAUDE_PLUGIN_DATA}/state/`.

---

---

## Common configuration recipes

### Faster recall, less context bloat

```json
{ "autoRecall": true, "recallBudget": "low", "recallMaxTokens": 512 }
```

### Domain-tagged manual retains

Pass `tags` to `memory_retain`; with `autoRetain: true`, `retainTags` / `retainContext` tag the
captured transcript.

### Bank persona

Call `memory_set_mission` (optionally with `bank`). Extraction rules (`retain_mission`) are an
operator setting on the server and deliberately not reachable from a tool.

---

## Verification

After any config change, restart Claude Code and run `memory_get_current_bank`, then
`/fpl-hsmem:status`.
