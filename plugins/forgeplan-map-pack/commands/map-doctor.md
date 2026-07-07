---
name: map-doctor
description: "Fast, read-only health check for an already-built .forgeplan/map/map.json + its layers — runs the deterministic guardian on every file, flags stale layers (content changed by git/docs), and finds orphan layers, WITHOUT regenerating anything. Says what's broken and which command fixes it. Usage: /map-doctor [repo-root] [--deep]"
---

# /map-doctor — fast triage of a built map (B5)

`/map-doctor` quickly finds **broken and stale things** in an already-generated
map WITHOUT regenerating anything. It is the diagnose half of the pair:
**doctor finds, `/map-refresh` fixes.** It runs the existing deterministic guardian
script (11+2 checks) over the top map and every layer, checks freshness via the
same git anchor `/map-refresh` uses, and reports a one-screen digest naming the fix
command for each issue. No pipeline, no LLM agents, no writes — just the script +
a couple of git reads, so it is fast.

## What to do

1. **Resolve the target repo root.** `$ARGUMENTS` may carry `[repo-root]` (arg or
   cwd) and the `--deep` flag. Confirm `<repoRoot>/.forgeplan/map/map.json` exists;
   if not, tell the user to run `/map-build` first.

2. **Enumerate the map files.** `Glob` `.forgeplan/map/map.json` +
   `.forgeplan/map/layers/**/*.json`. Each is a `forgeplan.map/v1` document.

3. **Structural health — run the guardian on every file (fast).** For each file:
   ```
   node ${CLAUDE_PLUGIN_ROOT}/scripts/map-guardian.mjs <file> --smoke
   ```
   `--smoke` runs **Layer A** only (GC-1..GC-4 + GC-7..GC-11 — schema, assembly
   guards, mega integrity, relations, found_at, flow completeness, layer-meta canon,
   mega-kind, accent neighbours) — doc-only, no repo scan, so it is quick and needs
   no scan context. Parse the `[PASS]/[WARN]/[BLOCKER] <check-id>: <message>` lines
   and the exit code. With **`--deep`**, additionally run the TOP map with
   `--check-only --repo-root <repoRoot> --scan-fpl <path>` to exercise Layer B
   (GC-5/GC-6/XC-1/XC-2) — slower (re-greps + re-derives), off by default.
   **Both `--smoke` and `--check-only` are read-only** — they run the checks and
   print the verdict but perform NO write. Doctor MUST NOT invoke the guardian in
   plain non-smoke mode (neither `--smoke` nor `--check-only`): that path flips a
   clean `proposed` top map to `confirmed` via a real write (the ADR-017 confirm
   authority) — a mutation, not a diagnosis. `--check-only` exists precisely so
   `--deep` reaches Layer B while keeping doctor strictly read-only, even on a clean PASS.

4. **Freshness — flag stale layers (git, one diff).** Read the top map's
   `meta.source_fingerprint`. If it is `"git:<anchor>"`, run
   `git -C <repoRoot> diff --name-only <anchor>..HEAD` UNION `git status --porcelain`
   to get the changed-file set since build. A layer is **stale** when a changed
   **code/artifact** file maps to its zone — a zone node's `provenance.ref`
   matches/contains the changed path. (Doctor is read-only and the shipped map
   carries no doc→node link — by CM-23 the `description_ru_source` field is NOT
   emitted — so a changed **doc** cannot be attributed to a specific zone from the
   map alone; report the doc-change COUNT in the digest but defer doc-driven
   staleness to `/map-refresh`, which re-scans docs and can attribute them.) Report
   stale layers → they need `/map-refresh`. (If the anchor is not a git anchor, say
   freshness can't be checked — suggest a full `/map-build`.)

5. **Orphans — layer whose zone is gone.** For each layer, read its `meta.parent_zone`
   and confirm that zone id still exists in the top map's `zones[]`. A layer whose
   parent zone no longer exists is an **orphan** (the top map was rebuilt and dropped
   that zone) → it should be deleted or the map re-cascaded.

6. **Report a digest**, grouped and fix-oriented — e.g.:
   ```
   map-doctor: <repoRoot>/.forgeplan/map  (anchor git:abc1234)
     top map      ✅ confirmed, guardian PASS
     layers       12 total
       ✅ fresh + PASS   9
       🔁 stale          2  (z.core, z.api)      → /map-refresh
       ❌ BLOCKER        1  (z.data: GC-10 …)     → /map-build-layer "z.data"
       ⚪ orphan         0
     changed since build: 4 files (1 doc)
   ```
   Lead with the conclusion (all-clear, or the count of things to fix). For each
   problem name the exact fix command. If everything is fresh + PASS, say so plainly.

## Notes

- **Fast + read-only by construction.** `--smoke` is a pure Node re-derivation per
  file; freshness is one `git diff`. No stage of the generation pipeline runs, no
  agent is dispatched, nothing is written — safe to run anytime.
- **Doctor diagnoses, refresh fixes.** Doctor never rebuilds. Its stale/BLOCKER
  findings map to `/map-refresh` (content-stale layers) or `/map-build-layer "<zone>"`
  / `/map-build` (structural failures) — it prints those commands, it does not run them.
- **Local, headless-only** (same as the rest of the pack). Headless: `claude -p '/map-doctor' --add-dir <repo> --allowedTools Read Glob Bash`.
