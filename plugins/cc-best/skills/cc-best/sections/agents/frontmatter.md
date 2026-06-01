# Agent frontmatter — the canonical fields

An agent is a Markdown file with YAML frontmatter (the contract) and a body (the procedure). The frontmatter declares what the agent is, which model runs it, and which tools it must not call. Get the frontmatter wrong and the agent is silently mis-dispatched or loses its MCP access — the body cannot fix a broken contract.

## The fields

| Field | Required | Rule |
|---|:---:|---|
| `name` | yes | kebab-case, matches filename without `.md`. Dispatched as `subagent_type="pack:name"`. |
| `description` | yes | bilingual block — `EN:` + `RU:` + `Triggers:`. Shown in the dispatcher picker; drives fuzzy intent matching. |
| `model` | yes | one of `opus` / `sonnet` / `haiku`. Never `inherit` for a marketplace agent. |
| `color` | yes | hex `#RRGGBB` only. Named colors (`red`, `blue`) break some terminals. |
| `disallowedTools` | yes | a denylist of tool names. NOT an allowlist — see `tools-and-denylist.md`. |
| `skills` | optional | list of `<plugin>:<skill>` the agent orchestrates; helps the orchestrator pre-load skill context. |
| `maxTurns` | optional | integer cap on the agent's turn budget (typical 20-80). Prevents runaway loops. |
| `isolation` | optional | only value is `worktree` — runs the agent in an isolated git worktree (source-writer pattern). |

## Rule — model is explicit and cost-aware

Pick the model by what the agent *does*, never default to opus:

- **`opus`** — judges trade-offs, runs reasoning cycles. Examples: `adr-architect`, `guardian`, `security-expert`.
- **`sonnet`** — structured mechanical work: scaffolding, drafting, applying lints, running tests. Examples: `coder`, `tester`, `code-reviewer`.
- **`haiku`** — fast classification, single-keyword scans, yes/no checks.

Defaulting to opus is wasteful; defaulting to haiku is unsafe. When unsure, `sonnet`.

## Example — a real frontmatter (agents-core `coder`)

```yaml
---
name: coder
description: |
  EN: Source-mutating implementation agent (Profile C-coder). The only agent
      allowed Write / Edit / Bash on source files. Hands off to a Profile B reviewer.
  RU: Агент-исполнитель, мутирующий исходники. Передаёт ревьюеру.
  Triggers: "implement", "write code", "build it", "реализуй", "напиши код"
model: sonnet
color: "#00897B"
disallowedTools: mcp__forgeplan__forgeplan_new, mcp__forgeplan__forgeplan_update, ...
skills:
  - fp-cookbook
isolation: worktree    # the only writer who gets a worktree
maxTurns: 50
---
```

The `description` is parseable: the dispatcher reads `EN:`/`RU:` for the picker and `Triggers:` for fuzzy matching. A single-line description (no EN/RU/Triggers) ships, but the orchestrator cannot route to it well.

## Trap — `inherit` model and named colors

Two silent-degradation traps:

1. **`model: inherit`** — the agent runs on whatever the parent session uses. A haiku-suitable scan ends up on opus (cost) or an opus-grade decision ends up on haiku (unsafe). Marketplace agents pin the model.
2. **`color: red`** — named colors render inconsistently across terminals; some show nothing. Always hex.

A third, worse trap — `memory: project` — is covered in `tools-and-denylist.md`: it force-enables Write/Edit and silently overrides the denylist. It was rejected outright.

## Related

- `tools-and-denylist.md` — why `disallowedTools` is a denylist, and the `memory: project` trap
- `profiles.md` — the profile dictates the model and the blocked set
- `examples.md` — full annotated frontmatter + body of real agents
- `../plugins/manifest.md` — where agent files sit inside a plugin
