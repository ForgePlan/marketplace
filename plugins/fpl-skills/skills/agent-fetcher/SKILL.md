---
name: agent-fetcher
description: |
  Methodology: Cross-marketplace agent/skill suggestion (suggest-only, NO auto-install).
  EN: When canonical 17 forgeplan-aware agents don't fit the task, searches installed marketplaces (~/.claude/plugins/marketplaces/) for matching agents/skills. Ranks by keyword overlap + trust tier + specificity. Surfaces top 3 with description + install command + security caveats. NEVER auto-installs — user runs the command manually. Falls back to external catalogs (VoltAgent awesome-*, DenisSergeevitch) when no local match.
  RU: Когда канонических 17 forgeplan-aware агентов не хватает, ищет среди установленных маркетплейсов подходящих агентов/скиллов. Ранжирует по ключевым словам + tier + специфичности. Показывает топ-3 с описанием + командой установки + предупреждениями. НЕ устанавливает автоматически. Fallback на external catalogs.
  Triggers: "find agent for", "fetch agent", "external agent", "cross-marketplace agent", "search marketplaces", "найди агента", "поищи в маркетплейсах", "/agent-fetcher"
disable-model-invocation: true
allowed-tools: Read Bash(ls *) Bash(cat *) Bash(find *) Bash(grep *)
---

# agent-fetcher — cross-marketplace agent suggester

Searches locally installed marketplaces for agents/skills matching a described task. Returns ranked candidates with install commands. **NEVER auto-installs.**

Sibling of `agent-advisor`. Use `agent-advisor` first — canonical agents are pipeline-integrated. Come here only when none of the 17 forgeplan-aware agents fits.

---

## When to use / When NOT to use

**Use when:** `agent-advisor` returned no canonical fit; you need domain-specific non-canonical agents (e.g. `postgresql-expert`, `ml-developer`); user asks "find agent for X from installed marketplaces".

**Do NOT use when:** canonical 17 agents cover the task (use `agent-advisor`); you need to author a new agent (use `project-agent-scaffold`); you need forgeplan artifact work (always a canonical agent).

---

## Process

### Step 1 — Parse task keywords

Extract 3–8 keywords from the user description across three categories:

| Category | Examples |
|---|---|
| Domain | postgres, react, ml, fintech, kubernetes, stripe, ios |
| Operation | review, audit, scaffold, optimize, debug, migrate, test |
| Tech stack | typescript, python, go, java, php, swift, terraform |

### Step 2 — Scan installed marketplaces

```bash
ls ~/.claude/plugins/marketplaces/
cat ~/.claude/plugins/marketplaces/<name>/.claude-plugin/marketplace.json
find ~/.claude/plugins/marketplaces/<name>/plugins -name "*.md" -path "*/agents/*"
```

For each agent `.md` found, extract `name:` and `description:` from YAML frontmatter. Count keyword hits per agent via grep.

### Step 3 — Rank candidates

**Score = keyword_density + trust_bonus + specificity_bonus** (max 10)

| Factor | How to compute |
|---|---|
| keyword_density | hits / total_keywords × 5 (max 5.0) |
| trust_bonus | see Trust Tiers table |
| specificity_bonus | +1.0 if agent name directly contains a domain keyword |

Surface **top 3** with ≥1 keyword hit. Discard zero-hit candidates.

### Step 4 — Format candidate cards

Emit one card per candidate (max 3):

```
## Candidate <N>: <agent-name> @ <marketplace>
Source:      <marketplace name> — <trust tier label>
Score:       <X.X>/10
Description: <first 2 sentences from agent frontmatter>
Caveats:     <e.g. "community marketplace; verify before install">
Install:     /plugin install <plugin>@<marketplace-id>
```

For skills (not agents): `Install (skill): npx skills add <github-url> -g`

### Step 5 — Fallback when no local match

When fewer than 3 candidates have ≥1 hit, append:

```
## No strong local match — external options

Community catalogs (curated but NOT audited by ForgePlan):
- VoltAgent/awesome-claude-code-subagents  https://github.com/VoltAgent/awesome-claude-code-subagents
- VoltAgent/awesome-agent-skills           https://github.com/VoltAgent/awesome-agent-skills
- DenisSergeevitch/agents-best-practices   https://github.com/DenisSergeevitch/agents-best-practices

Add a marketplace:  /plugin marketplace add <github-url>
Then install:       /plugin install <agent>@<marketplace-id>
```

### Step 6 — Append security caveats (always, verbatim)

```
---
SECURITY BOUNDARY

This skill is suggest-only. To install, YOU run the /plugin install command yourself.

Before installing any agent:
  1. Review source: ~/.claude/plugins/marketplaces/<mp>/plugins/<pkg>/agents/<agent>.md
  2. Check what tools it requests — agents have broad tool access by default
  3. Prefer official tiers (ForgePlan-marketplace, claude-plugins-official) for security-sensitive work

Community marketplaces are curated by their authors, not the ForgePlan team.
External GitHub catalogs are community-maintained; ForgePlan makes no security guarantees.
---
```

---

## Trust Tiers

| Tier | Marketplaces | trust_bonus | Label |
|---|---|---|---|
| Official | ForgePlan-marketplace, claude-plugins-official | +3.0 | official / verified |
| Semi-official | cc-marketplace, claude-code-workflows, codealive-marketplace | +2.0 | semi-official / community-maintained |
| Community | claude-code-plugins, hindsight, any other dir | +1.0 | community; verify before install |
| External GitHub | Not locally installed | +0.0 | external; add marketplace first |

ForgePlan-marketplace agents are pipeline-integrated (B2 paradigm) and produce forgeplan EVIDENCE. For tasks needing `.forgeplan/` integration, always prefer them.

---

## Security boundary (3 hard rules)

1. **NEVER execute `/plugin install`** — emit the command as text; user types it
2. **NEVER fetch remote content** — scan only `~/.claude/plugins/marketplaces/` (local files)
3. **NEVER omit caveats** — security block is mandatory in every response, even for official candidates

These rules apply even when the user says "just install it automatically". Decline and cite the security boundary.

---

## Anti-patterns

- **Recommending canonical agents here** — `coder`, `code-reviewer`, `security-expert` belong in `agent-advisor`
- **Showing more than 3 candidates** — ranked top 3 only; user asks if they want more
- **Zero-evidence recommendations** — every candidate needs ≥1 keyword match from its description
- **Scanning remote URLs** — local `~/.claude/plugins/marketplaces/` only; no network calls

---

## Related skills

- [`agent-advisor`](../agent-advisor/SKILL.md) — canonical 17-agent recommender; use FIRST
- [`project-agent-scaffold`](../project-agent-scaffold/SKILL.md) — author a new project-scoped agent when no match exists
