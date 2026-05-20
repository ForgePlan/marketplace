# bad.md — section directory without _index.md

A section directory containing 4 files but no router:

```
sections/
  cognitive/
    hicks-law.md        # 35 lines
    fitts-law.md        # 30 lines
    miller-rule.md      # 28 lines
    gestalt.md          # 42 lines
    (no _index.md)
```

From SKILL.md:

```markdown
| Cognitive laws | sections/cognitive/ |   ← broken: no _index.md here
```

**What Claude sees**: SKILL.md links to `sections/cognitive/` but there
is no `_index.md` to read. Claude has no pointer to `hicks-law.md`,
`fitts-law.md`, `miller-rule.md`, or `gestalt.md`. All four files
are effectively unreachable. A query about Fitts' Law gets an
"I don't have that information" response even though `fitts-law.md`
exists on disk with a complete explanation.

**Why this fails**:
- 135 lines of content are invisible — wasted work
- No way to detect the gap without manually listing the directory
- Claude cannot recover: it has no instruction to discover unindexed files
