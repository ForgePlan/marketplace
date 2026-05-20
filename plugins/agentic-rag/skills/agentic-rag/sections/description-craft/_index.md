# description-craft

How to write `description:` and `triggers:` in SKILL.md frontmatter so the skill
activates on the right queries and stays silent on irrelevant ones.

## Contents

| File | Description | Lines |
|------|-------------|-------|
| [triggers.md](triggers.md) | How to write triggers, EN/RU bilingual rules, `disable-model-invocation` | 40 |
| [description-format.md](description-format.md) | Description field format, length, tone, what to include and exclude | 34 |

## Why this matters

A skill with perfect content but wrong triggers never fires.
A skill with vague triggers fires on unrelated queries and pollutes the context.
The `description:` field is the only signal Claude Code uses to decide whether
to load this skill — get it wrong and the rest does not matter.
