# 01 — Coverage (bidirectional: gaps + scope creep)

Coverage is a **two-direction** check. A DS that is missing a required component is **incomplete** (a *gap*);
a DS carrying a component no requirement asked for is **bloated** (*scope creep*). Both are defects. You assert
neither from the dispatch prompt — you enumerate both sides from ground truth and match them.

```
required capabilities (from the scope PRD/ADR)  ⇄  DS components (from the snapshot manifest)
        every requirement must map to ≥1 component     ── gap if not
        every component must map to ≥1 requirement      ── scope creep if not
```

## Step A — enumerate the REQUIRED capabilities (the left column)

Read the **active** scope PRD/ADR yourself (`forgeplan_get`, `forgeplan_search`, `forgeplan_coverage`) — do
not trust the prompt's list. From the scope artifact, extract the atoms of *required surface*:

- **Functional Requirements (FR-NN)** that imply a UI surface ("the editor approves a variant", "a publish
  slot picker", "a status badge per platform").
- **Named components / capabilities** the PRD or a linked ADR explicitly calls for (a token palette, an
  AppShell, a Multi-platform Publish table, a primary CTA per screen).
- **Brand / token decisions** the scope artifact fixed (e.g. an example recorded brand might fix a "warm-paper
  surface" token or "one distinct primary action") — these are *required tokens/atoms*, counted as coverage
  items, not as free styling. The brand itself is an **input** the scope artifact records, never baked into the
  check.

Each extracted item gets a stable handle: `FR-12 → "platform status badge"`. That handle is the matrix row.

> Foundational infrastructure (spacing scale, type ramp, color tokens) is **required by construction** even
> when no FR names it — an atomic DS cannot exist without it. Treat the token layer as a single coverage item
> backed by the tokens ADR/RFC, not as N unbacked atoms.

## Step B — enumerate the DS COMPONENTS (the right column)

Read the **snapshot manifest** (the `export_nodes` JSON the Designer exported) yourself — `Read`/`Grep` the
manifest files in the snapshot dir; never `Read`/`Grep` the `.pen` file (encrypted, Pencil-MCP only — and you
are a sub-agent without Pencil). From the manifest, list every **reusable component** (`reusable:true`) by its
`Category/Variant` name and atomic layer (ATOMS / MOLECULES / ORGANISMS / TEMPLATES / PAGES). Screens
(non-reusable pages) are *compositions*, not DS components — count them as coverage of a screen requirement,
not as reusable components.

## Step C — match them (semantic, not literal)

Match a requirement to a component by **role**, not by string equality. "publish button" (FR) maps to
`Actions/Primary` (atom) even though the names differ; one component can satisfy several requirements (a single
`Badge/Status` atom covers per-platform status across screens). Record the match reason in the matrix cell so a
guardian can re-derive it. When a match is ambiguous, prefer **under-claiming** (mark it a possible gap with a
note) over asserting a match that is not really there — a manufactured match is worse than an honest gap.

## The coverage matrix

| Requirement (handle) | Source artifact | DS component (Category/Variant @ layer) | Match | Note |
|---|---|---|---|---|
| `FR-12 platform status badge` | PRD-140 | `Badge/Status` @ ATOMS | ✅ covered | one atom, 5 status variants |
| `FR-18 schedule slot picker` | PRD-140 | — | ❌ **gap** | no molecule for slot selection |
| — | — | `Card/Promo` @ MOLECULES | ⚠️ **scope creep** | no FR/ADR requests a promo card |

## Verdict thresholds

- **BLOCKER** — a **required, in-scope capability** has no component (a real gap on a must-have FR), or a
  component implements a surface the scope **explicitly excluded** (a non-goal). The DS is the wrong DS.
- **CONCERNS** — scope creep with a plausible-but-undocumented rationale; a gap on a SHOULD/COULD requirement;
  an ambiguous match you could not fully resolve from ground truth.
- **PASS-eligible** — every MUST requirement maps to ≥1 component, every component maps to ≥1 requirement (or
  to the token-infrastructure item), and any deviation is already justified in the body / an ADR / a linked
  NOTE.

## Edge cases (do NOT mis-flag these)

- **Intentionally deferred** requirement tracked in a NOTE / marked out-of-slice in the PRD → **not** a gap;
  cite the NOTE. (Read the artifact for the deferral before flagging — `check the body first`.)
- **Token/spacing/type infrastructure** with no 1:1 FR → backed by the tokens ADR/RFC, **not** scope creep.
- **A component slated for a later CANVAS slice** → out of *this* slice's scope; record it as deferred, not as
  creep, if the PRD scopes the slice.
- **One requirement, many variants** (a Button with 4 variants for one "action" FR) → one coverage item, not
  four — count the component, not its variant matrix.

Next: [02 — Provenance](../02-provenance/_index.md) takes the *covered* rows and asks whether each one is
**authorized** — traced to an active decision and matching the recorded token palette.
