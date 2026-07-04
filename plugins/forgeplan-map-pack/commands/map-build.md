---
name: map-build
description: "Scan the current forgeplan-enabled repo and generate a validated .forgeplan/map/map.json (schema forgeplan.map/v1) for forgeplan-web's composed-map view, by dispatching the forgeplan-map-pack 8-agent pipeline. Usage: /map-build [repo-root]"
---

# /map-build — generate the project's composed-map data

This command is the **entry point** for the forgeplan-map-pack pipeline. It does NOT run the scan/extract/emit stages itself — it dispatches the **`forgeplan-map-pack:map-orchestrator`** agent, which conducts the full 8-agent walk (SCAN → TYPE → SELECT → EXTRACT → VERIFY → EMIT → VALIDATE) in isolated Task contexts, enforces gates G1–G4, and hands back a `proposed`-or-`confirmed` `.forgeplan/map/map.json`.

Architecture and contract: RFC-023, SPEC-003, ADR-016, ADR-017 (in the marketplace workspace's `.forgeplan/`). The internal skills `zone-extractor` / `edge-verifier` / `map-emitter` are used BY the pipeline's agents — do not invoke them directly; this command is the human-facing entry point.

## What to do

1. **Resolve the target repo root.** If the user passed an argument (`$ARGUMENTS`), use it as the repo root; otherwise use the current working directory. The pipeline runs against **that repo's own files and its `.forgeplan/` graph** — not the marketplace/plugin repo.

2. **Check the precondition.** Confirm the target repo has a `.forgeplan/` directory (`Glob(pattern=".forgeplan", path=<repoRoot>)`). If it does not exist, stop and tell the user plainly: "map-build precondition unmet — `<repoRoot>` has no `.forgeplan/`. Run `forgeplan init` in the target repo first." Do not dispatch on a repo with no forgeplan graph to scan. (The orchestrator re-checks this itself; checking here gives the user a faster, clearer refusal.)

3. **Dispatch the orchestrator** — one Task call, nothing inline:

   ```
   Task(subagent_type="forgeplan-map-pack:map-orchestrator",
        prompt="Run the forgeplan-map-pack map.json generation pipeline against the repo at <repoRoot>. "
             + "Walk SCAN (code-scanner ‖ forgeplan-scanner ‖ docs-scanner) → [G1] → TYPE (inline) → "
             + "SELECT (inline) → EXTRACT (zone-extractor) → [G2] → VERIFY (edge-verifier) → [G3] → "
             + "EMIT (map-emitter) → [G4] → VALIDATE (map-guardian), each non-inline stage a separate "
             + "isolated Task dispatch. Enforce gates G1–G4 by re-reading the returned scratch files "
             + "yourself (never a worker's prose). Max 3 rounds per gate, then <<NEED_USER_INPUT>>. "
             + "Return the map.json path, meta.status (re-read from disk after VALIDATE), and any "
             + "guardian BLOCKER/CONCERNS.")
   ```

   **Do NOT** run any pipeline stage yourself, **do NOT** write `map.json` yourself, and **do NOT** call the three internal skills directly — the orchestrator owns the entire dispatch and every write goes through the fail-closed `map-emitter-gate.sh` hook (SPEC-003 §C2 CTRL-2).

4. **Report the orchestrator's result** to the user: which composition template was selected + its confidence, whether the guardian flipped the map to `confirmed` (or left it `proposed` with a BLOCKER), and where `map.json` was written. If the map is `proposed`/`NEEDS_CONFIRM` (e.g. a hybrid repo landed in the ambiguous scoring band — expected, not a bug, per RFC-023 §5), say so and note the human can confirm it in forgeplan-web.

## Notes

- **Local, headless-only.** There is no "run analysis" button in forgeplan-web (its server structurally cannot spawn `claude`). This command IS the invocation — run it in a Claude Code session opened in the target repo, or headlessly with `claude -p '/map-build' --add-dir <repo> --allowedTools Read Glob Grep Write Task` (the 8-agent version needs `Task` for the orchestrator to dispatch stages).
- **The map is derived + gitignored** (like `lance/`). Re-running is safe and idempotent where nothing changed (content-hash node ids + a pure layout function); a re-run adds new nodes without reshuffling existing ones.
