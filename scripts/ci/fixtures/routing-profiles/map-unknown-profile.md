# Fixture routing map

Not the real routing map. Drives `routing-profile-check.selftest.sh` only.

## Agent index

| Agent | Plugin | Profile | One-liner |
|---|---|---|---|
| **good-a** | `fixture-pack` | A | fixture |
| **good-b** | `fixture-pack` | B | fixture |
| **good-c** | `fixture-pack` | C | fixture |
| **good-c-coder** | `fixture-pack` | C-coder | fixture |
| **good-d** | `fixture-pack` | D | fixture |
| **good-b-orch** | `fixture-pack` | B-orchestrator (fixture) | fixture |
| **c4-diagram skill** | `fixture-pack` | N/A (skill, not agent) | a row that declares itself not an agent |
| **good-b** | `fixture-pack` | Q | not a profile this gate knows |

## After the index

Bounds the section the gate slices.
