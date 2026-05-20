# good.md — canonical owner + cross-reference

One file owns the definition; the other adds only local-relevant content:

```markdown
# cognitive/hicks-law.md  (canonical owner)

## Hick's Law

Decision time grows logarithmically with the number of choices:
T = b * log2(n + 1), where n is the number of choices.

**Design implication**: expose ≤7 top-level options in any decision surface.
Use progressive disclosure for infrequently-used options.
```

```markdown
# code-patterns/navigation-choices.md  (cross-reference)

## Navigation choice limits

See [Hick's Law](../cognitive/hicks-law.md) for the research principle.

Code rule: `nav > ul > li` count must not exceed 7.

\`\`\`html
<!-- VIOLATION: 11 items -->
<nav><ul>
  <li>Home</li><li>About</li><li>Products</li><li>Services</li>
  <li>Blog</li><li>Docs</li><li>Pricing</li><li>Contact</li>
  <li>Login</li><li>Sign Up</li><li>Help</li>
</ul></nav>
\`\`\`
```

**Why this works**:
- Definition lives in exactly one place — one source of truth
- Code pattern file adds only what it uniquely owns (the HTML rule + example)
- Updating the research means editing one file, not hunting duplicates
