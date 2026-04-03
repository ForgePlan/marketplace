# Depth Calibration Matrix

Use `forgeplan route "<task description>"` to auto-determine depth level. This matrix explains the criteria.

## Decision Matrix

| Factor | Tactical | Standard | Deep | Critical |
|--------|----------|----------|------|----------|
| **Time estimate** | < 1 hour | 1 hour - 1 day | 1-5 days | 5+ days |
| **Files changed** | 1-3 | 3-10 | 10-30 | 30+ |
| **Risk if wrong** | Low, easily reversed | Medium, some rework | High, significant rework | Very high, hard to reverse |
| **Scope** | Single function/fix | Single feature | Cross-cutting concern | System-wide change |
| **Team impact** | Solo, no review needed | Needs review | Needs design discussion | Needs team consensus |

## Artifacts Required by Depth

| Depth | PRD | RFC | ADR | Evidence |
|-------|-----|-----|-----|----------|
| Tactical | No | No | No | Optional |
| Standard | Yes | No | No | Yes |
| Deep | Yes | Yes | No | Yes |
| Critical | Yes | Yes | Yes | Yes |

## Examples

**Tactical**: Fix a typo, update a dependency version, add a log statement.

**Standard**: Add a new API endpoint, implement a feature flag, create a new UI component.

**Deep**: Refactor the authentication system, migrate to a new ORM, introduce caching layer.

**Critical**: Switch from REST to GraphQL, change the database engine, redesign the deployment architecture.

## When in Doubt

- Route up, not down. It is better to over-document than under-document.
- If the task touches security or data integrity, bump up one level.
- If the task is reversible within minutes, it is probably Tactical.
- If you are asking "should I write a PRD for this?", the answer is usually yes.
