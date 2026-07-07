---
name: map-refresh
description: "Incrementally refresh an already-built .forgeplan/map/map.json — find what changed by git + docs since the map was built and rebuild ONLY the affected layers, leaving fresh layers untouched. The cheap counterpart to a full /map-build. Usage: /map-refresh [repo-root]"
---

# /map-refresh — rebuild only what changed (B5)

`/map-build` regenerates the whole map. `/map-refresh` is surgical: it detects
**what actually changed since the map was built** — by `git` (edited code files)
and by docs (updated README/docs) — and rebuilds **only the layers whose content
moved**, skipping everything that is still fresh. On a repo where you touched one
module, that is one scoped layer rebuild instead of a full re-cascade.

It rests on the two B5 fingerprints (`map-emitter` Algorithm 4): the top map's
`meta.source_fingerprint = "git:<HEAD-at-build>"` build anchor, and each layer's
**content** `meta.seed_fingerprint` (which now folds in each member's git blob
signature, so a file edit — not just a node add/remove — moves it).

## What to do

1. **Resolve the target repo root.** `$ARGUMENTS` is `[repo-root]` (arg or cwd),
   same as `/map-build`. Refresh runs against that repo's files + `.forgeplan/`.

2. **Preconditions.** Confirm `<repoRoot>/.forgeplan/map/map.json` exists — if not,
   tell the user to run `/map-build` first (there is nothing to refresh). Read its
   `meta.source_fingerprint`: if it is NOT a `"git:<sha>"` anchor (an older map, or
   a non-git repo), there is no build anchor to diff against — tell the user plainly
   and suggest a full `/map-build` instead; do not guess.

3. **Dispatch the orchestrator in REFRESH mode** — one Task call:

   ```
   Task(subagent_type="forgeplan-map-pack:map-orchestrator",
        prompt="REFRESH the existing .forgeplan/map/map.json for the repo at <repoRoot>. "
             + "Follow your 'Refresh mode' section: read meta.source_fingerprint as the git build "
             + "anchor; find the changed file set = `git diff --name-only <anchor>..HEAD` UNION "
             + "`git status --porcelain` (uncommitted), split out the docs subset; map changed files "
             + "to STALE zones (a top-map node whose provenance.ref matches/contains the changed path, "
             + "or a changed doc narrating a zone's node); recompute each layer's CONTENT seed_fingerprint "
             + "and rebuild ONLY the layers whose fingerprint moved, IN PARALLEL, leaving fresh layers "
             + "untouched; rebuild the top map only if a top-level node's content_sig moved or membership "
             + "changed. Empty changed-set => report 'map is fresh', do nothing. Report changed-file count, "
             + "stale zones, layers rebuilt vs skipped-fresh, and the new anchor.")
   ```

   **Do NOT** run pipeline stages yourself and **do NOT** rebuild fresh layers —
   the whole value of refresh is skipping them. Every write still goes through the
   fail-closed `map-emitter-gate.sh` hook.

4. **Report the orchestrator's result:** how many files changed (and how many were
   docs), which zones were stale, which layers were rebuilt vs left fresh, and
   whether the top map itself was rebuilt. If nothing changed, say "map is fresh —
   nothing to refresh" (the fast, common outcome).

## Notes

- **Fresh vs stale is content-level, not just membership.** Because `seed_fingerprint`
  folds each member's git blob signature (B5), editing a file inside a card marks
  its layer stale — not only adding/removing a card. This is the gap the plain E5
  idempotent-skip (id-set only) could not see.
- **Local, headless-only** (same as `/map-build`). Headless: `claude -p '/map-refresh' --add-dir <repo> --allowedTools Read Glob Grep Write Task`.
- **Doctor first, refresh second.** `/map-doctor` DIAGNOSES (what's stale/broken, read-only, no rebuild); `/map-refresh` FIXES the stale layers. Run `/map-doctor` if you just want to see what would rebuild without touching anything.
- **Deterministic + append-only.** A refreshed layer is byte-identical to what a full `/map-build` would produce for that zone (content-hash ids, no x/y).
