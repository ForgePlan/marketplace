# antipatterns — STUB

> **Status**: not yet authored. Coming in **RFC-009**.

This section will be the gold mine — synthesis of 47+ audit findings + 30+ anomalies from Sprint A-W across the marketplace.

Planned anti-patterns to document:

- Mixing CommonJS and ESM module shapes without intent.
- Hooks of type `prompt-type` (BANNED — security regression).
- `memory: project` agent field (force-enables `Write/Edit` overriding `disallowedTools`).
- Anglicism mixing in user-facing replies (Sprint W communication rule).
- "Necessary but not sufficient" — bold-pattern in EVID body required but does not alone give `r_eff > 0`.
- And ~25 more.

Until shipped, see:

- `plugins/fpl-skills/SPRINT-A-E-RETROSPECTIVE.md` for the original meta-lessons.
- `.forgeplan/notes/` for individual anomaly captures.
- The `mm-pipeline-anomalies` mental model in Hindsight bank for the live catalog.

This section will also document the **standalone packaging** path (RFC-009 includes a sub-RFC for repo `ForgePlan/cc-best` distributable via `npx skills add`).
