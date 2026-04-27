# build-summary — When you created something new

Use after building: a feature, a plugin, a workflow, a set of files, a new repo.

## Template

```
TL;DR: <what was built>. <verification status>. <one risk if any>.

═══ ✅ Created ═══════════════════════════════════════════════════
  <Component>     <Where>                              <Status>
  <Component>     <Where>                              <Status>

═══ 📝 Modified ═════════════════════════════════════════════════
  <File>          <Type of change>                     <Lines: +/-/~>

═══ ⚪ Not done (intentional) ════════════════════════════════════
  <Item — why skipped>

═══ ✅ Verification ═════════════════════════════════════════════
  <Check>         <Result>                             <Confidence>
  CI              <pass/fail>                          <🟢/🟡>
  Smoke test      <pass/fail>                          <🟢/🟡>
  Lint            <pass/fail>                          <🟢>

═══ 🔄 Reversibility ════════════════════════════════════════════
  Reversible: <list — git revert, rm files, etc.>
  Irreversible: <list or "none">

═══ ⚠️ Drift risks ═════════════════════════════════════════════
  <Risk>          <When it bites>                      <Mitigation>

═══ ➡️ Next steps ══════════════════════════════════════════════
  1. <action>
  2. <action>

💰 Cycle: <N tool calls> · <N files> · <~minutes>
```

## Required minimums

- ✅ At least one item in **Created** OR **Modified**
- ✅ At least one **Verification** row
- ✅ TL;DR mentions verification status
- ⚪ Not-done section even if "nothing intentionally skipped" (then write "—")

## Real-world example

```
TL;DR: forge-report skill добавлен в dev-toolkit, 23 файла, плагин bumped
       до v1.5.0. CI green. Drift risk: cc-best PRD ссылается на этот skill.

═══ ✅ Created ═══════════════════════════════════════════════════
  forge-report SKILL.md   plugins/dev-toolkit/skills/forge-report/   New
  /report command         plugins/dev-toolkit/commands/report.md     New
  5 templates             sections/01-templates/                     New
  ...

═══ ✅ Verification ═════════════════════════════════════════════
  CI                      pass (8s)                                  🟢 High
  validate-plugins.sh     ALL PASSED                                 🟢 High
  Smoke /report           manual test pending                        🔴 Assumed

═══ 🔄 Reversibility ════════════════════════════════════════════
  Reversible: revert PR #25, rm plugins/dev-toolkit/skills/
  Irreversible: none

═══ ➡️ Next steps ══════════════════════════════════════════════
  1. Test /report on a real task
  2. Update marketplace README

💰 Cycle: 31 calls · 23 files · 45 min
```

## When NOT to use this template

- Modified single file → just describe inline, no template needed.
- Built something but didn't verify → use `incident-summary` (something broke).
- Built + decided architecture → use `decision-summary` (decision is bigger).
