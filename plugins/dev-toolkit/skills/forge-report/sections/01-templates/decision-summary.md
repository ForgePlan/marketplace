# decision-summary — When you made and recorded a product/architecture decision

Use after: choosing between alternatives, recording an ADR, fixing a roadmap, prioritising backlog.

## Template

```
TL;DR: <decision in 1 sentence>. <why now>. <when to revisit>.

═══ 🎯 Decision ════════════════════════════════════════════════════
  What:        <chosen option>
  Alternatives: <what was rejected and why>
  Trigger:     <what forced this decision>

═══ 📊 Trade-offs ════════════════════════════════════════════════
  | Option   | Pros           | Cons              | Score   |
  |----------|----------------|-------------------|---------|
  | <chosen> | <list>         | <list>            | ✅      |
  | <other>  | <list>         | <list>            | ❌ <reason> |

═══ ✅ Recorded as ════════════════════════════════════════════════
  <ADR-NNN / NOTE-NNN / PRD-NNN>                       <where>
  <related artefact>                                   <where>

═══ ⚪ Not decided yet (deferred) ════════════════════════════════
  <open question>     <when to revisit>

═══ 🔄 Reversibility ════════════════════════════════════════════
  Reversible: revert artefact files (rm/git revert) — decision uncommits
  Reversible: supersede via new ADR/PRD with `supersedes` link
  Irreversible: <if any external commitment was made>

═══ ⚠️ Drift risks ═══════════════════════════════════════════════
  <If <X> changes>     →  <decision invalidates>

═══ ➡️ Next steps / Activation triggers ═════════════════════════
  This decision is documented but not "started". Activate when:
  - <condition>
  - <condition>

  Or, if action is immediate:
  1. <action>
  2. <action>

💰 Cycle: <N artefacts created> · <discussion turns> · <~minutes>
```

## Required minimums

- ✅ At least 2 alternatives in trade-off table (if only 1 considered → reframe as "no real choice")
- ✅ "Recorded as" — link to durable artefact (ADR/NOTE/PRD), not just chat
- ⚪ Drift risks — what would invalidate this decision?
- ➡️ Activation triggers — when does decision become an action?

## Real-world example

This very report (the conversation about saving 3 PRD drafts) is a `decision-summary`:

```
TL;DR: 3 PRD drafts (013/014/015) + NOTE-003 roadmap фиксированы. Drift risk:
       PRD-015 устаревает к Q3 2026 без активации. Активировать по триггерам.

═══ 🎯 Decision ════════════════════════════════════════════════════
  What:        Делать все 3 standalone skills, в порядке 014→013→015
  Alternatives: Делать только 1 (узко) / Не делать (потеря momentum)
  Trigger:     User explicit: "буду делать всё, но сперва зафиксировать"

═══ ✅ Recorded as ════════════════════════════════════════════════
  PRD-013      .forgeplan/prds/PRD-013-...md         draft
  PRD-014      .forgeplan/prds/PRD-014-...md         draft
  PRD-015      .forgeplan/prds/PRD-015-...md         draft
  NOTE-003     .forgeplan/notes/NOTE-003-...md       active

═══ ➡️ Activation triggers ═══════════════════════════════════════
  - Пользовательский запрос на standalone skill
  - Adoption fpf/loux выше порога
  - Свободное время + желание
```

## When NOT to use

- Decided alone, no alternatives existed → just announce inline.
- Decision affects only this turn → context evaporates anyway.
- Already recorded in ADR/PRD by tool — link, don't duplicate.
