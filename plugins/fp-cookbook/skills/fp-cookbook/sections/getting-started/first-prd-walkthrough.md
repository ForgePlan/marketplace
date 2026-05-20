# First PRD: Create → Validate → Activate

## Цель

Ship your first forgeplan artifact — a PRD — from blank page to `status=active`
in under 10 minutes. Uses PRD-038 (Sprint J+K closure) as a live reference example.

## Команда

```bash
# Step 1 — Create
forgeplan new prd "My first feature"
# Returns: PRD-NNN created (status=draft)

# Step 2 — Edit body (open in $EDITOR or Claude Code)
# Fill in: Vision, Problem, Goals, Non-Goals, FRs, ACs

# Step 3 — Validate
forgeplan validate PRD-NNN
# Must show: PASS (no BLOCKER issues)

# Step 4 — Activate
forgeplan activate PRD-NNN
# Returns: PRD-NNN status → active
```

## Пример

PRD-038 (Sprint J+K scope) was created and activated inline within the same session:

```
$ forgeplan new prd "Sprint J+K: 4 new MCP tools verified live"
PRD-038 created (status=draft)

$ forgeplan validate PRD-038
✅ PASS  title: present
✅ PASS  vision: present
✅ PASS  goals: ≥1
⚠  WARN  non-goals: absent (optional but recommended)
✅ PASS  functional-requirements: ≥1

$ forgeplan activate PRD-038
PRD-038 status: draft → active ✅
```

## Validation requirements (depth=standard)

| Field | Required | Notes |
|-------|----------|-------|
| title | yes | H1 in body |
| Vision | yes | 1–3 sentences |
| Goals | yes | ≥1 G1 item |
| Non-Goals | recommended | avoid scope creep |
| Functional Requirements | yes | ≥1 FR-NNN item |
| Acceptance Criteria | yes | ≥1 AC-N item |

## Common errors

| Error | Fix |
|-------|-----|
| `BLOCKER: missing acceptance-criteria` | Add `## Acceptance Criteria` section with ≥1 AC |
| `activate` rejected: "no evidence" | For depth=deep+, create EVID first; for standard, evidence optional |
| `validate` returns nothing | Body is empty — edit the PRD body before validating |
| PRD stays `draft` after activate | Check `forgeplan score PRD-NNN` — low score may block |

## Refs

- PRD-038 (active, R_eff=0.90 grade A) — live example Sprint J+K
- PRD-024 (active) — SDLC pipeline foundation
- `recipes-prd/create-validate-activate.md` — deeper walkthrough with edge cases
