# Section 13 — Release notes

**1 tool**: generate Keep-a-Changelog-shaped release notes from artifacts that changed between two git refs.

## 13.1 forgeplan_release_notes

Walks `git log` over `.forgeplan/{prds, problems, evidence, rfcs, adrs, specs, epics, solutions}/` between two git refs. Classifies each touched artifact into Keep-a-Changelog buckets:

| Artifact kind | Changelog bucket |
|---|---|
| PRD | Added |
| PROB | Fixed |
| EVID with security tag | Security |
| RFC, ADR | Changed |

```python
forgeplan_release_notes()                                       # since latest tag, until HEAD
forgeplan_release_notes(since="v0.30.0")
forgeplan_release_notes(since="v0.30.0", until="v0.31.0")
forgeplan_release_notes(since="...", draft=true)                # include artifacts without evidence
```

**Quality gate** (default): only artifacts with `status==active` OR `r_eff_score > 0` are emitted. Pass `draft=true` to waive the gate.

## Known limitation

`forgeplan_release_notes` requires `.forgeplan/` and `.git/` to be co-located. Split-repo layouts (workspace root vs child repo) cause `git log failed: fatal: not a git repository`. Anomaly #12 in CLAUDE.md, filed upstream as [forgeplan#290](https://github.com/ForgePlan/forgeplan/issues/290).

Workaround for split repos:

```bash
cd <git-repo-with-.forgeplan>
forgeplan release-notes --since v0.30.0
```

## Use case — release prep

```python
# At release time, after merging the release branch into main:
notes = forgeplan_release_notes(since="v1.77.0", until="v1.78.1")

# Render as Markdown for the GitHub release body:
markdown = render_keep_a_changelog(notes)
```

Pair with `gh release create v1.78.1 --notes "$markdown"` to publish.
