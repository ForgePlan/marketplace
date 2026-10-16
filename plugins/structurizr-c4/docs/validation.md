# Release-candidate validation

Observed on 2026-10-16 for the initial package. These checks do not constitute marketplace publication or a full-repository CI pass.

| Check | Observed result |
|---|---|
| Official `claude plugin validate <payload> --strict` | Passed |
| Skill-creator `quick_validate.py` | Passed |
| `bash tests/test-package.sh` | Passed: metadata parity, interop alias, helper loading, a path containing spaces, quoted model name, and refusal to overwrite an existing DSL |
| Node syntax check of `check-routing.js` | Passed |
| `bash tests/test-routing.sh` | Passed: 38 synthetic tests (17 native SVG parser, 13 router, 8 safe layout application) |
| Independent regression review | Passed: nonzero bbox offset preserves native element origin; stale relationship endpoints are rejected; dynamic response retains model endpoint direction |
| Optional Codex role TOML parsing | Passed; model remains inherited |
| Generic starter initialized and validated by official Structurizr 2026.09.19 | Passed |
| Generic starter JSON and static exports through the copied helper | Passed |
| Payload scan for concrete user home paths, customer names/models and non-English text outside the Russian guide | Passed |
| Unmodified marketplace frontmatter gate against an isolated fixture | Passed: all four skill/command/agent entry points parse and names match paths |
| Marketplace interop-skills gate against the same fixture | Passed: alias exists, is a symlink, resolves and is not stale |
| Marketplace description-shape gate against the same fixture | Passed: complete description matches the catalog entry |
| Marketplace install-manifests gate against the same fixture | Passed: beta metadata and full-profile membership resolve |
| Marketplace personal-path gate against the same fixture | Passed |
| Reusable `tests/test-marketplace-compat.sh <checkout>` | Passed: reruns all five unchanged marketplace gates in a fresh isolated fixture without installation |

The native Java runtime emitted non-fatal reflective final-field warnings during CLI tests; validation/export exited successfully. They were not suppressed or presented as parser failures.

The generic integration fixture was temporary and removed. The payload retains no customer workspace. The test verifies runtime/helper operation; visual review of a real system's diagrams remains a separate per-workspace requirement in the skill.

A separate local pilot checked 15 views and 190 relationship appearances after a full native viewer reload and again through exported native SVGs. All five measured collision categories were empty after repair. The pilot's model, snapshots, diagrams and reports remain outside this payload. Static/JSON model and layout equality were verified from files; a fresh static-browser render was not verified because the browser tool did not allow the file URL. This observation is not a universal layout guarantee.

The routing suite passed on macOS system Python 3.9. One independent environment selected a Homebrew Python 3.14 with a broken `pyexpat`/system `libexpat` linkage and could not load XML tests; the same 38 tests passed using system Python. No runtime libraries or system settings were changed to hide that environment issue.

The marketplace checkout was inspected read-only. The five named gates were copied unchanged to a temporary isolated fixture containing this payload and its proposed catalog entry; the fixture was then removed. This does not establish that a merged marketplace catalog and its documentation pass all repository gates. Full catalog integration/gates must run after adding the plugin as described in [marketplace-integration.md](marketplace-integration.md). The optional Codex custom-role adapter was parsed locally; an end-to-end new-session role registration test was not performed. No MCP server was registered.
