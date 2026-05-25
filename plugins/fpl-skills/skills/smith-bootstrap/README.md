# /smith-bootstrap — greenfield onboarding

> One-shot bootstrap for a fresh repo: `forgeplan init` + CLAUDE.md/AGENTS.md scaffold + plugin recommendations + first Brief NOTE + first PRD draft. End state is a project ready for `/forge-cycle`.

## When to use

- Fresh repo with no `.git` history (or ≤3 commits) and no scaffolds.
- No `CLAUDE.md`, `AGENTS.md`, `.forgeplan/`, or `.mcp.json` at root.
- User says "новый проект" / "bootstrap" / "fresh start" / "init this project".
- `/smith` default mode auto-delegates here when pre-flight detects greenfield.

**Do NOT use** when:

- The project already has populated `.forgeplan/` + `CLAUDE.md` — use `/smith` default mode instead.
- The repo has substantial source with no forgeplan history — that's brownfield; use `forgeplan-brownfield-pack:discover`.
- User wants to add a single plugin or skill — tactical, do it directly.

## Quick start

```bash
# explicit invocation
/smith-bootstrap

# implicit (auto-routed by /smith when pre-flight detects greenfield)
/smith
```

The skill walks 6 steps top-to-bottom, marking `[x]` on the [`smith-bootstrap.md` template](../../templates/smith-bootstrap.md) as each lands:

1. **Pre-flight detection** — verify the repo is genuinely greenfield (7-row PRESENT/ABSENT matrix; ≥3 PRESENT → exit and recommend brownfield).
2. **`forgeplan init -y`** — create `.forgeplan/`, register MCP server in `.mcp.json`.
3. **AGENTS.md scaffold** — cross-CLI context shim per [agents.md](https://agents.md) Linux Foundation standard (December 2025).
4. **CLAUDE.md scaffold** — primary source of truth: methodology section, hard rules, smith pointer.
5. **Plugin install recommendations** — MUST (`fpl-skills`, `forgeplan-workflow`, `agents-pro`, `agents-core`), SHOULD (`fpf`, `fpl-hsmem`), OPTIONAL (`laws-of-ux`, `forgeplan-brownfield-pack`).
6. **First Brief** — dispatch `agents-pro:brief-intake` (Profile A) to capture the project idea as a Brief NOTE.
7. **First PRD** — dispatch `agents-sparc:specification` (Profile A) to convert the Brief into a Standard-depth PRD draft. **Does NOT activate** — activation belongs to `/forge-cycle`.

See [SKILL.md](./SKILL.md) for the full per-step procedure, verify commands, acceptance criteria, and failure-mode handling.

## How it works

The skill is a wrapper around the [`smith-bootstrap.md` template](../../templates/smith-bootstrap.md). It procedurally drives the template from top to bottom, marking each checklist item complete as it lands. The skill is the doer; the template is the artifact. Output is saved to `.forgeplan/notes/bootstrap-<YYYY-MM-DD>.md` for traceability.

**Hard rules**:

- Never overwrite existing CLAUDE.md / AGENTS.md / .mcp.json — diff and ask first.
- Never install OPTIONAL plugins by default.
- Bootstrap is one-time — re-invocations on a populated project exit with a redirect to `/smith` default mode.
- Never activate the first PRD — that's `/forge-cycle`'s job.

## Examples

### Example A — fresh repo, English

```
User: I want to start a new payment microservice from scratch.
/smith-bootstrap

→ Pre-flight: 0/7 PRESENT — confirmed greenfield.
→ Step 1: forgeplan init -y → .forgeplan/ created, MCP registered.
→ Step 2-3: AGENTS.md + CLAUDE.md written (smith pointer + methodology section).
→ Step 4: User confirms MUST tier — 4 plugins installed.
→ Step 5: brief-intake dispatched → BRIEF NOTE-NNN created.
→ Step 6: specification dispatched → PRD-NNN draft (informs NOTE-NNN).
→ Hand-off: "Bootstrap complete. Next step: run /smith to route PRD-NNN through /forge-cycle."
```

### Example B — partial scaffold (Russian)

```
User: новый проект, давай настраивай
/smith-bootstrap

→ Pre-flight: CLAUDE.md PRESENT, AGENTS.md ABSENT, .forgeplan/ ABSENT — partial greenfield.
→ Diff existing CLAUDE.md vs scaffold → user chooses "extend, don't replace".
→ Continue Steps 1-6 skipping CLAUDE.md write.
→ Hand-off: «Bootstrap done. PRD-NNN в драфте, активация — через /forge-cycle.»
```

## Related

- **`/smith`** — parent default-mode skill; auto-delegates here for greenfield.
- **`/smith-plan`** — once bootstrap completes, use this for the per-task Plan on the first PRD.
- **`/smith-routing`** — if user wants to learn methodologies before bootstrapping.
- **`/forge-cycle`** — the next step after bootstrap; activates the first PRD via the 9-phase pipeline.
- **`forgeplan-brownfield-pack:discover`** — the brownfield counterpart (use this if pre-flight detects existing code).

## References

- [SKILL.md](./SKILL.md) — full procedure, all 6 steps with exact commands, acceptance criteria, failure modes.
- [`templates/smith-bootstrap.md`](../../templates/smith-bootstrap.md) — the 175-line checklist artifact this skill fills.
- [`skills/smith/routing-map.md`](../smith/routing-map.md) row 1 — greenfield methodology recipe (BMAD + Spec Kit).
- [`skills/smith/sections/01-greenfield.md`](../smith/sections/01-greenfield.md) — extended greenfield onboarding context (agentic RAG).
- [`agents-pro/agents/smith.md`](../../../agents-pro/agents/smith.md) — sibling Profile B agent (Wave 1A).
- [agents.md](https://agents.md) — Linux Foundation cross-CLI standard (December 2025).
- CLAUDE.md `FPF ADI discipline` (Sprint Z7) + `BMAD adversarial review discipline` (Sprint Z6) — why the first PRD stays draft.
