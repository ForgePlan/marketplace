# Hook & MCP anti-patterns — the wiring traps

Where automation that *looks* enforced quietly is not, and where MCP and CLI diverge. Deep treatment lives in `../hooks/fail-closed.md`, `../hooks/common-bugs.md`, and `../mcp/gotchas.md` — these are the recurring traps.

## H1 — prose-only enforcement (a rule that is not a gate)

**The trap**: writing a discipline as a CLAUDE.md sentence ("Profile B EVID MUST contain ≥1 finding", "no code before the Plan is approved") and assuming it is enforced. Nothing executes it.

**Why it bites**: an instruction the model is *asked* to follow is not the same as a gate the harness *runs*. Prose discipline degrades under load, novelty, or a confident wrong premise. The split is sharp: a fail-closed `PreToolUse` hook or a guardian verdict row binds even when conditions are degraded; a paragraph does not.

**The fix**: if skipping it silently is a real risk, make it a **fail-closed gate** (`../hooks/fail-closed.md`) — `/forge-cycle` Step 6.5 dispatching a reviewer, a guardian Step 5 BLOCKER, an LR lint rule. But know the limit: when the spoof signal is *semantic, not structural* (a 1-line `## Findings` could be lazy OR a genuine zero-gap; a short hypothesis could be padding OR precise), a parser-gate either false-positives on legitimate short work or is too lax to catch the spoof. Those gaps (G5/G6/G7) are deliberately left to **social discipline** — visible reviewer identity, peer review — not a brittle parser. The anti-pattern is *assuming* prose enforces; the fix is *deciding* gate-vs-social on purpose. Reference: repo CLAUDE.md "Social-discipline boundaries (Sprint AA)".

## H2 — the MCP `body` `@filepath` data-loss (forgeplan#350)

**The trap**: `forgeplan_update(id, body="@/path/to/file.md")` through MCP, mirroring CLI muscle memory.

**Why it bites**: the CLI expands `@file`; **MCP does not**. It writes the literal 16-char string `@/path/to/file.md` as the entire artifact body, overwriting everything — and returns `"Updated successfully"` with **no error**. You discover the loss on the next `forgeplan_get`. Confirmed twice in production: a user's repo lost 5 deltas + a full ADR body. This is the single most consequential trap in this skill.

**The fix**: the host reads the file; MCP receives the content as a string — `body_text = Read(path); forgeplan_update(id, body=body_text)`. Never start a `body` string with `@/`. Assume MCP and CLI are **not** drop-in equivalents (see also #353: CLI rejects `/` in agent IDs, MCP accepts them). Full treatment: `../mcp/gotchas.md`.

## H3 — exit 127: a wired hook whose target is missing

**The trap**: wiring a hook in `hooks.json`, then every matching tool call (every Bash, every Write) starts failing before doing anything.

**Why it bites**: the shell cannot run the referenced command, so it exits **127** (command not found) — either the script path is wrong, or it calls a binary not on `$PATH`. The real incident (v1.20.1): a hook wrapped a probe in GNU `timeout`, which is **not installed on bare macOS**. CI validates that `hooks.json` is valid JSON; it does **not** check that the referenced scripts exist.

**The fix**: gate on tool availability (`command -v timeout >/dev/null 2>&1 || ...`) and degrade instead of failing; verify the script path yourself before committing. See `../hooks/common-bugs.md` Bug 1.

## H4 — fail-open on parse failure (and prompt-type hooks)

**The trap**: a gate that `exit 0`s when `jq` fails or stdin is unparseable "to avoid breaking the tool" — or a hook declared `"type": "prompt"`.

**Why it bites**: fail-open is safe for the *hook* and unsafe for the *repo* — the gate silently allows exactly when it cannot verify, which is precisely when something is wrong. And `"type": "prompt"` injects unvetted text as a model instruction — an instruction-injection surface, classed here as a security regression (CI rule `Ban prompt-type hooks`).

**The fix**: a gate `exit 2` (deny) on any unexpected input; allow only on the clean not-applicable case (not a git repo, no state file). Use only `"type": "command"`; to inject context, emit `additionalContext` from a vetted command hook. See `../hooks/fail-closed.md` and `../hooks/common-bugs.md` Bugs 4-5.

## Related

- `../hooks/fail-closed.md` — the deny-the-right-way pattern (H1, H4)
- `../mcp/gotchas.md` — the full `body` trap + CLI/MCP asymmetry (H2)
- `agents-and-tools.md` — the gate's other half: who verifies, and the negative control
