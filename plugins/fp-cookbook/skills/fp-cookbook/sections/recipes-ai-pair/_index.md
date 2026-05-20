# recipes-ai-pair

Recipes for dispatching forgeplan-aware AI sub-agents correctly:
which profile to use, how to write dispatch prompts, and sentinel conventions.

## Contents

| File | Description | Lines |
|------|-------------|-------|
| [profile-selection.md](profile-selection.md) | CRUD-R-A matrix: when to use Profile A/B/C/C-coder/D | 55 |
| [task-tool-dispatch.md](task-tool-dispatch.md) | Agent dispatch prompt patterns; how to write good sub-agent prompts | 52 |
| [sentinel-conventions.md](sentinel-conventions.md) | <<NEED_USER_INPUT>> + <<NEEDS_ACTIVATION>> — when emitted, how parsed | 48 |

## Quick profile lookup

| Need | Profile | Agent |
|------|---------|-------|
| Create new PRD/ADR/RFC | A — Creator | artifact-author |
| Review code / write Evidence | B — Reviewer | code-reviewer, evidence-recorder |
| Research (read-only) | C — Read-only | research-analyst |
| Write source code | C-coder | coder |
| Update existing artifact in-place | D — Maintainer | artifact-maintainer |
