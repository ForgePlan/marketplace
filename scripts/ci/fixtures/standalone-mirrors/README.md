# standalone-mirror-check fixtures

**These trees are deliberately broken.** Each one violates exactly one rule of
`scripts/ci/standalone-mirror-check.js`, so the self-test can prove the gate fires — a guard that
has never been seen to fail is decoration, not a guard.

| Fixture | Violates | Expected code |
|---|---|---|
| `clean-skill/` | nothing — the must-NOT-fire control | (exit 0) |
| `residue-skill/` | carries the plugin-runtime variable | `PLUGIN-ROOT-RESIDUE` |
| `vocab-skill/` | carries forbidden ecosystem vocabulary | `VOCABULARY-LEAK` |
| `name-mismatch-skill/` | frontmatter name != manifest installedName | `NAME-MISMATCH` |
| `symlink-skill/` | contains a symlink | `SYMLINK` |
| `manifest-*.json` + `workflow-*.yml` | the three-list parity cases | `WORKFLOW-PARITY` |

Run them via `scripts/ci/standalone-mirror-check.selftest.sh`. Do not "fix" the breakage.
