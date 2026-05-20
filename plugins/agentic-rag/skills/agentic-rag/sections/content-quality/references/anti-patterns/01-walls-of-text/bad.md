# bad.md — walls-of-text example

A SKILL.md that crams all knowledge directly into one file:

```markdown
---
name: my-skill
description: Comprehensive guide to component design. Use when designing components.
---

# My Skill

## Principles

Component design requires careful consideration of multiple factors.
First, you must understand that components should be atomic — meaning they
do one thing only. The single responsibility principle, borrowed from
software engineering, applies directly here. A component that handles both
display logic and business logic will be harder to test, harder to reuse,
and harder to maintain. The solution is to separate concerns early...
[continues for 80 more lines on SRP]

## Patterns

There are twelve patterns commonly used in component design. Pattern 1
is the Container/Presenter pattern, first described by Dan Abramov...
[60 lines of pattern descriptions]

## Anti-patterns

Anti-pattern 1: God components. A god component is one that...
[80 lines of anti-pattern descriptions]

## Examples

Here is a complete example of a correctly structured component...
[120 lines of code examples]
```

**Why this fails**:
- Entire file (340+ lines) loads on every component-design query
- No navigation — Claude reads all 340 lines even for a simple question
- Adding a new pattern means editing the same giant file, risking conflicts
