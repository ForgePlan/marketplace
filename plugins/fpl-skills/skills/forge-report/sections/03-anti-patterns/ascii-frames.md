# ASCII frames — Anti-pattern

Wrapping every section heading in `═══ ✅ Section ═══════` rectangles.

## Why it's bad

- **Visual noise**: rectangles compete with content for attention
- **Width brittleness**: 65 `═` characters look fine in one terminal, broken in another
- **Markdown rendering**: in rendered Markdown viewers (web, IDE), `═══` doesn't compile to anything semantic — it's just a long horizontal slug
- **Copy-paste pain**: reader can't easily copy a section without trimming the frame
- **No semantic value**: a `##` heading already says "this is a section" — the frame adds nothing the heading didn't

## Bad

```markdown
═══ ✅ Created ═══════════════════════════════════════════════════
  Что:    forge-report skill
  Где:    plugins/dev-toolkit/skills/forge-report/

═══ 📈 Modified ════════════════════════════════════════════════
  ...
```

## Good

```markdown
## ✅ Что сделано

  Что:    forge-report skill
  Где:    plugins/dev-toolkit/skills/forge-report/

## 📈 Что обновлено

  ...
```

The `##` heading is semantic, renders correctly in any Markdown viewer, and the section icon (✅) gives the same visual anchor without the noise.

## Where lines ARE good

Thin horizontal lines **between cards inside a section** are fine — they separate items of the same kind:

```markdown
## ✅ Что сделано

  Что:    Skill «forge-report»
  Где:    plugins/dev-toolkit/skills/forge-report/
  ───────────────────────────────────────────────────────────────
  Что:    Slash-команда /report
  Где:    plugins/dev-toolkit/commands/report.md
```

Use simple `─` Unicode lines, not `═` doubles. One purpose: separate items, not decorate sections.

## How to fix

1. Find every `═══` block in your report.
2. Replace with `## <icon> <Section name>`.
3. Add `─` thin lines only between cards inside a section.
