# bad.md — duplicate-content example

Two files that both fully define the same law:

```markdown
# cognitive/hicks-law.md  (file 1)

## Hick's Law

Hick's Law states that the time required to make a decision increases
logarithmically with the number of choices available. Formally:
T = b * log2(n + 1), where n is the number of choices.

**Design implication**: navigation menus, form dropdowns, and toolbars
should expose no more than 7 top-level items. Beyond that, decision
time degrades noticeably. Use progressive disclosure to hide
infrequently-used options behind a secondary layer.
```

```markdown
# code-patterns/navigation-choices.md  (file 2)

## Navigation and Hick's Law

When implementing navigation, keep Hick's Law in mind:
decision time grows logarithmically with the number of options.
For nav menus, this means ≤7 top-level items. The formula is
T = b * log2(n + 1). Progressive disclosure reduces perceived complexity.

Code rule: `nav > ul > li` count must not exceed 7.
```

**Why this fails**:
- The full Hick's Law explanation appears twice — 2x context cost
- If the formula changes or the research is updated, both files diverge
- Claude may give slightly different answers depending on which file triggers
