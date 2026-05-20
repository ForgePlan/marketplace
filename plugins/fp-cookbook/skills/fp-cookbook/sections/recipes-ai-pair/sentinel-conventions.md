# Sentinel Conventions: NEED_USER_INPUT and NEEDS_ACTIVATION

## Цель

Use the two forgeplan pipeline sentinels correctly so `/forge-cycle` and
`/autorun` can auto-resolve them without stalling.

## The two sentinels

| Sentinel | When to emit | Who emits | Who resolves |
|----------|-------------|-----------|--------------|
| `<<NEED_USER_INPUT: <question>>>` | Agent blocked — needs human decision | Profile B agents | Human (via orchestrator) |
| `<<NEEDS_ACTIVATION: EVID-NNN>>` | EVID created but Profile B cannot activate | Profile B agents | Orchestrator / /forge-cycle AUTO-tier |

## Format rules

```
# Correct format (exact spelling + double angle brackets)
<<NEED_USER_INPUT: Should the plugin support standalone mode?>>
<<NEEDS_ACTIVATION: EVID-069>>

# Wrong — will not be parsed
NEED_USER_INPUT: question
<<needs_activation: evid-069>>   ← lowercase not parsed
```

## Команда

```bash
# /forge-cycle parser detects NEEDS_ACTIVATION and auto-resolves:
forgeplan activate EVID-069   # executed by orchestrator

# NEED_USER_INPUT halts the pipeline and surfaces to user:
# "Agent blocked: Should the plugin support standalone mode?"
# → user answers → orchestrator resumes with answer in context
```

## When Profile B agents emit NEEDS_ACTIVATION

Profile B (code-reviewer, evidence-recorder, tester) creates EVID artifacts
but `forgeplan_activate` is in their denied-tools list (B2 paradigm, PRD-026).
They MUST emit `<<NEEDS_ACTIVATION: EVID-NNN>>` at end of response.

```
# Evidence-recorder agent output pattern (Sprint E):
EVID-069 created (draft).
**Congruence level**: 3
**Verdict**: Supports
...
<<NEEDS_ACTIVATION: EVID-069>>
```

## Common errors

| Error | Fix |
|-------|-----|
| Sentinel not detected by `/forge-cycle` | Check case: `NEEDS_ACTIVATION` all-caps; double angle brackets |
| EVID stays draft despite sentinel | `/forge-cycle` parser not active — manually: `forgeplan activate EVID-NNN` |
| `NEED_USER_INPUT` blocks entire autorun | Design: use it sparingly; batch questions together |

## Refs

- PRD-029 (active, R_eff=1.0) — Sprint A: NEED_USER_INPUT protocol
- PRD-032 (active, R_eff=1.0) — Sprint D: NEEDS_ACTIVATION + /forge-cycle parser
- PRD-033 (active, R_eff=1.0) — Sprint E: 7 Profile B agents patched to emit organically
- Anomaly #8 — sentinels not emitted organically before Sprint E fix
