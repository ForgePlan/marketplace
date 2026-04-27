# Duplicate info — Anti-pattern

Same fact repeated across multiple sections.

## Why it's bad

- Report **looks longer** than it is, but reader gets less.
- When facts inevitably **drift apart** (one edit updates one copy), report becomes contradictory.
- Reader stops trusting any single statement because "maybe the other section is more current".

## Bad

```
TL;DR: Created PR #25 with forge-report skill. Awaiting CI.

═══ ✅ Created ═══════════════════════════════════════════════════
  PR #25 with forge-report skill                       awaiting CI

═══ ➡️ Next steps ══════════════════════════════════════════════
  1. Wait for CI on PR #25 (forge-report skill)
  2. Merge once CI passes for PR #25 with forge-report
```

(Same fact "PR #25 / forge-report / CI" stated 4 times.)

## Good

```
TL;DR: PR #25 (forge-report skill) opened, CI running. ETA ~30s.

═══ ➡️ Next steps ══════════════════════════════════════════════
  1. Wait for CI green
  2. Merge → branch auto-deletes
```

(Each fact stated once. Context flows.)

## When repetition IS OK

- **TL;DR + body**: TL;DR is a summary, body is detail. They restate by design.
- **Cross-references** to other artefacts: "see PRD-016" doesn't duplicate, it links.
- **Summary at end** of long sectional report.

## How to spot duplication

Read your own report from top to bottom. Mark every fact. If a fact appears 3+ times in 3+ sections — collapse.

## Refactor pattern

1. Identify the **canonical place** for each fact (usually first occurrence).
2. Other places link or reference (`see ✅ Created above`).
3. Delete pure repetition.
