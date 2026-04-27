# audit-summary — When you reviewed/audited

Use after: code review, security audit, architecture review, dependency check, performance audit.

## Template

```
TL;DR: <N findings, severity breakdown>. <action priority>. <biggest risk>.

═══ 📊 Scope ═══════════════════════════════════════════════════════
  Audited:   <files/modules/services>
  Method:    <static analysis / manual review / tool used>
  Duration:  <time spent>
  Confidence: <High/Medium/Assumed — based on coverage>

═══ ❌ Critical findings ═══════════════════════════════════════════
  #N  <issue>                                          <where>
       Impact: <what breaks>
       Fix: <action>

═══ ⚠️ High-priority findings ════════════════════════════════════
  #N  <issue>  →  <where>  →  <fix>

═══ 🔵 Medium / Low findings ═══════════════════════════════════
  <count by severity, link to detailed findings file if many>

═══ ✅ Strengths noted ═══════════════════════════════════════════
  <what's done well — bias against only listing problems>

═══ ⚪ Out of scope (intentional) ═══════════════════════════════
  <what was NOT audited and why — also serves as Not-done section>

═══ 🔄 Reversibility ════════════════════════════════════════════
  Findings recorded — reversible (delete report).
  Recommended fixes — not yet applied (no state change).
  Irreversible: none (audit is read-only).

═══ ⚠️ Drift risks ═════════════════════════════════════════════
  Findings staleness: <when audit becomes outdated — code keeps changing>
  Coverage gaps: <areas not audited may regress unnoticed>

═══ ➡️ Next steps ══════════════════════════════════════════════
  Immediate (P0): <fix critical>
  This sprint (P1): <fix high>
  Backlog (P2+): <medium/low → ticket>

💰 Cycle: <N files reviewed> · <N findings> · <~minutes>
```

## Required minimums

- ✅ Severity breakdown in TL;DR (e.g. "5C/17H/16M/9L")
- ✅ At least one **Strengths** item — pure-negative audits feel hostile and miss balance
- ✅ Confidence label on overall audit (small sample = lower confidence)
- ⚪ Out-of-scope section is **mandatory** — defines audit boundary

## Real-world example

```
TL;DR: 47 findings (5C/17H/16M/9L) in marketplace plugins. Critical: 3 hooks
       allow injection. P0 fixes within 2 days. Strength: validation script
       solid. Confidence: High (full plugin review).

═══ ❌ Critical findings ═══════════════════════════════════════════
  #1  prompt-type hooks bypass user consent              hooks.json (3 plugins)
       Impact: arbitrary command execution
       Fix: ban prompt type, require type=command

═══ ✅ Strengths noted ═══════════════════════════════════════════
  • CI validates plugin.json + hooks.json structure
  • Hash-pinned actions in workflows (good supply chain hygiene)

═══ ⚪ Out of scope (intentional) ═══════════════════════════════
  • Agent prompts not audited (separate review needed)
  • Performance audit (no perf SLOs defined yet)
```

## Anti-patterns

- ❌ Listing only problems — appears hostile, misses what to preserve.
- ❌ No severity → reader can't prioritise.
- ❌ "Audited everything" — usually false; declare scope explicitly.
