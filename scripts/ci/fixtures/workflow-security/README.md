# Trap files for validate-workflow-security

Every file here is **deliberately dangerous** and exists to be caught. `validate-workflow-security.js`
scans this directory before it scans anything real; if a trap stops producing its finding, the gate
fails saying the rule is dead.

**Do not "fix" these files.** A green scan here means the linter is broken, not that the code is safe.

They are never executed: nothing in `scripts/ci/fixtures/` is a GitHub Actions workflow path, and
the scanner's real targets are `.github/workflows/` and `docs/templates/`.

| File | Must fire | Why it exists |
|---|---|---|
| `must-fire-prt-checkout.yml` | `WF-PRT-CHECKOUT` | the baseline shape: privileged trigger checks out the PR head |
| `must-fire-prt-checkout-commented.yml` | `WF-PRT-CHECKOUT` | same file plus one `#` comment inside the step — the exact regression that killed this rule (marketplace#249) |
| `must-fire-prt-run-fetch.yml` | `WF-PRT-FETCH` | fetching PR code from a `run:` block, with the PR number laundered through `env:` so it evades WF-INJECT too |
| `must-fire-inject.yml` | `WF-INJECT` | untrusted expression interpolated straight into a shell |
| `must-fire-permissions-writeall.yml` | `WF-PERMS-WRITEALL` | blanket write scope |
| `must-fire-unpinned.yml` | `WF-UNPINNED` | third-party action on a floating tag instead of a SHA |

Adding a rule? Add a trap for it in the same commit and register it in `SELF_TEST_EXPECT`. A rule
without a trap is a rule nobody will notice going quiet.
