---
name: c4-review
description: Review and improve existing Structurizr C4 views, checking scope, evidence, line routes, labels, saved layout and the final export.
argument-hint: "<workspace directory or selected view keys>"
---

Locate portable `structurizr-c4` in the current runtime's catalog. The fallback `../skills/structurizr-c4/SKILL.md` resolves only relative to this command's actual file. Apply it to:

$ARGUMENTS

This is **producer-side review/repair**, not independent acceptance. It may amend the assigned model/geometry but never approves its own work, writes product source/infrastructure or `.forgeplan/`, mutates ForgePlan/Hindsight, or records EVID verdicts. It does not replace `architect-reviewer`, `system-dev` or `guardian`; escalate architectural decisions to the ADR/RFC author.
Read the skill's `references/forgeplan.md`, `references/c4-review.md` and `references/line-routing.md`.
Preserve the model's meaning and existing edits. Fix geometry only within the requested scope; flag semantic model changes separately.
Scan and visually review every affected rendered view, then save, reload, rescan, export with the saved layout and reopen that export.
State exactly which view keys were checked and what remains unresolved.
