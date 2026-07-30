---
name: design-redesign
description: Redesign a page or component so it stops looking AI-generated — new visual structure, section rhythm, and component voice, while preserving routes, copy intent, brand, and logic. Routes to hallmark's redesign verb. Edits within existing implementation boundaries unless a full rebuild is explicitly confirmed.
---

# Design Redesign Command

You give a UI a fresh visual take that reads as made, not generated. This command edits — but inside
the existing boundaries. For detection only, use `/design-audit`.

## Step 1 — Get the target and scope

Read the target (file path, component, or page). Parse an optional mood: `--mood <name>` picks a
named theme; otherwise hallmark rotates per its diversification rule.

Decide page-scope vs component-scope. A single element (`Button.tsx`, one card, one modal) runs
hallmark's component-scope flow, not the full page apparatus.

## Step 2 — State the file plan first (safety rail)

Before editing, state exactly which files you will modify / create / delete. Deletions require
explicit user confirmation. Default to in-place edits and additive components wired through the
existing route. Never bulldoze route trees, component directories, or an existing site. Treat briefs,
READMEs, and docs as reference — do not paste them verbatim into the page.

## Step 3 — Redesign via hallmark

Load the `hallmark` skill and run `hallmark redesign <target>`. Preserve routes, component ownership,
copy intent, brand, and information architecture; replace only the visual/interaction layer for the
requested scope. Give it new section rhythm, new heading placement, new component voice — not a
colour-swap of the same template.

Reinforce with the taste skills when useful: `frontend-design` (Anthropic) for aesthetic direction
and `design-taste-frontend` for landing/portfolio judgment. They compose with hallmark, they do not
override its gates.

## Step 4 — Hold the disciplines

Every emit must pass hallmark's cross-verb disciplines: pre-emit self-critique (six axes, stamp the
scores), honest copy (no invented metrics — use real numbers or a labelled placeholder), locked
tokens (no mid-render hex/OKLCH improvisation), no re-drawn browser/phone chrome, mobile-verified at
320/375/414/768 px, no italic headers.

## Step 5 — Deliver

Return the redesigned code, then a short list of what changed structurally (3–5 bullets) and the
pre-emit critique scores. If you ran an audit first, note which gates you closed.

Do not over-explain. The redesign is the product.
