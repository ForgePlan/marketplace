# Section 14 — MCP safety warnings and known asymmetries

**Read this section BEFORE writing artifact bodies via MCP.** It documents 3 confirmed issues in forgeplan 0.32.1 and the canonical workarounds. All filed upstream 2026-05-27.

## 14.1 forgeplan#350 — CRITICAL — MCP `body` is a literal string, no @filepath expansion

**The bug**: `mcp__forgeplan__forgeplan_update(id, body="@/path/to/file.md")` does NOT read the file. It writes the literal string `@/path/to/file.md` (the 16-character path) to the artifact body. The MCP call returns `"message": "Updated successfully"` — no error visible.

**Why this matters**: The CLI variant (`forgeplan update <ID> --body @file.md`) does parse `@filepath` correctly. Agents that mirror CLI patterns via MCP suffer **silent data loss**. Confirmed on two independent sessions 2026-05-27 (user's gerts-hub lost 5 deltas + full ADR-002 body; marketplace sandbox repro on NOTE-018).

**Canonical safe pattern** for any agent writing artifact body via MCP:

```python
# 1. Write the body to a tmp file using your host CLI's Write primitive
Write(file_path="/tmp/PRD-001-body.md", content="...")

# 2. Read it back into a string variable
body_text = Read(file_path="/tmp/PRD-001-body.md")

# 3. Pass the string variable as body=
forgeplan_update(id="PRD-001", body=body_text)
```

Or — if the body is short — inline the string directly. Never start a body string with `@/` if the rest of the string looks like a path.

**Surface comparison**:

| Surface | `--body @file.md` / `body="@file.md"` | Safe alternative |
|---|---|---|
| CLI shell (`forgeplan update`) | Reads file, writes content ✓ | Use as-is |
| MCP (`forgeplan_update`) | Writes literal string ✗ DATA LOSS | Read file via host, pass content as string |

**Filed**: [forgeplan#350](https://github.com/ForgePlan/forgeplan/issues/350). Watch the issue; this section updates when the bug is fixed.

## 14.2 forgeplan#348 — Medium — `Next: forgeplan score-all` hint points to non-existent command

**The bug**: `forgeplan link` and `forgeplan activate` end their stdout with `Next: forgeplan score-all`. That subcommand doesn't exist. Running it returns:

```
error: unrecognized subcommand 'score-all'
  tip: some similar subcommands exist: 'recall', 'score'
```

**Correct command**: `forgeplan score --all` (note the space + flag, not a dash).

**Why this matters**: Users following the `Next:` hint hit a confusing error mid-pipeline. Marketplace skills tell users to follow the hints; agents reading the output would propose `forgeplan score-all` as the next step.

**Workaround** for now: when you see `Next: forgeplan score-all` in tool output, mentally substitute `forgeplan score --all` (or just call MCP `forgeplan_score`).

**Filed**: [forgeplan#348](https://github.com/ForgePlan/forgeplan/issues/348).

## 14.3 forgeplan#351 — Low — `plugins doctor` install hints use wrong syntax

**The bug**: `forgeplan plugins doctor` reports missing Claude plugins with the install instruction `install: claude plugin install <name>`. That string is not a valid Claude Code CLI invocation — the actual command is `/plugin install <name>@<marketplace>` (slash-prefixed, inside a Claude Code session).

**Sample bad output**:
```
✗ agents-pro   Pro agent pack: ddd-domain-expert, ...
    install: claude plugin install agents-pro                     ← wrong
```

**Correct invocation**:
```
/plugin marketplace add ForgePlan/marketplace    # one-time
/plugin install agents-pro@ForgePlan-marketplace
```

**Filed**: [forgeplan#351](https://github.com/ForgePlan/forgeplan/issues/351). Includes plugin-name registry drift (the doctor knows of `sparc-specification` which is shipped as `agents-sparc` in ForgePlan/marketplace).

## 14.4 General safe-MCP discipline

Beyond the three filed issues, two cross-cutting rules:

1. **Never paste secrets into MCP arguments** that get logged. `forgeplan_activity` records every MCP call. The `body=` field of `forgeplan_update` IS logged. If your body contains an API key, the activity log preserves it.
2. **Treat `_next_action` as a hint, not a command**. The forgeplan MCP server adds `_next_action` to most responses. Read it, evaluate it against your current context, then decide. Blindly following `_next_action` is how `score-all` hint propagation happens.

## 14.5 Verification recipes

How to detect the bugs yourself before they bite:

```bash
# 14.1 — @filepath bug
# Set up:
forgeplan new note "smoke" && echo "test content" > /tmp/test.md
# Trigger via MCP (in Claude Code session):
#   mcp__forgeplan__forgeplan_update(id="NOTE-NNN", body="@/tmp/test.md")
#   mcp__forgeplan__forgeplan_get(id="NOTE-NNN")
# Expect body == "test content"; if body == "@/tmp/test.md" → bug present.

# 14.2 — score-all hint
forgeplan link <A> <B> --relation informs 2>&1 | grep "Next: forgeplan score-all"
# Returns the bad line if bug present.

# 14.3 — plugins doctor syntax
forgeplan plugins doctor 2>&1 | grep "claude plugin install"
# Returns ≥1 line if bug present.
```

## 14.6 Reporting new findings

When you discover a new MCP / CLI asymmetry or hidden gotcha:

1. **Reproduce in a tmp project** with current `forgeplan --version`. Confirm bug + behaviour both via MCP and CLI.
2. **File at [ForgePlan/forgeplan/issues](https://github.com/ForgePlan/forgeplan/issues)** — title-pattern "CRITICAL/Medium/Low: short summary". Include reproduction, version, expected behaviour.
3. **Add a 14.N subsection here** linking to the issue. This cookbook is the canonical map between forgeplan version and known caveats; agents read here before mutating state.
4. **If the bug is silent (no agent-visible error)**, file as CRITICAL and add a banner to the AGENT-AUTHORING-GUIDE.md "Critical safety convention" subsection (see PR #122 for the pattern).
