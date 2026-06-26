# §05 — Choosing & recording a brand/style (how to choose · record · adapt references)

How a screen *looks*. **CANVAS is brand/style-agnostic** — the visual style is an **input the project
provides**, never something baked into the methodology. The chosen design direction lives in a forgeplan
**scope artifact** (the active PRD/Brief, an ADR "design direction", or a recorded design-tokens decision),
and the Designer **reads it as input**:

- **If a style is recorded** → design to it. Pull its values into tokens (§04) and design every screen against it.
- **If no style is recorded yet** → you must **help the user choose first, record the choice in an artifact,
  then design** — never design against an un-recorded brand. The three steps below are how.

Visual decisions that rise to "brand token" level belong in an ADR and the tokens RFC, not invented ad hoc here.

---

## Step 1 — How to choose a brand (the attributes to decide)

When no style is recorded, walk the user through these brand attributes. Each is a small, concrete decision;
together they pin a visual direction tight enough to tokenize. Pick a value for each, then move to Step 2.

| Attribute | What to decide | Examples of poles |
|---|---|---|
| **Light / dark** | Default theme (and whether both are required) | light-first · dark-first · both with a `Mode` axis (§04) |
| **Palette temperature** | The undertone of neutrals + background | warm (cream/ink) · cool (blue-gray) · true-neutral (pure gray) |
| **Density / whitespace** | How tight the information is packed | calm/generous · balanced · dense/compact (dashboards, IDE-like) |
| **Accent strategy** | How many accents and how loud | one restrained accent · a small accent pair · vivid multi-accent |
| **Typography** | Type family + scale personality | humanist sans · geometric sans · serif display + sans body |
| **Motion** | How much the UI animates | near-static · subtle transitions · expressive motion |

Keep it short: six decisions, one value each. If the user is unsure on any axis, offer the reference
resources in Step 2 as priors, then record what they land on.

---

## Step 2 — Reference resources to choose from (inputs, never destinations)

These are the **fuel** for choosing and, later, for designing — **adapt them to the brand the user picks;
never copy any of them 1:1**, and never treat any of them as a fixed destination.

- **getdesign.md** — a catalog of **75+ analyzed production `DESIGN.md` systems** (real shipping products'
  color/type/component/token decisions, machine-readable for AI agents). Use it to see "what mature systems
  actually do" on each attribute above. Details + how to consult it below.
- **Laws of UX** — the constraint layer that holds *regardless* of the chosen brand (Hick, Fitts, Von
  Restorff, Aesthetic-Usability, contrast). See [§07 ux-task-map](../07-ux-task-map/_index.md). A brand never
  overrides a usability law.
- **In-domain reference products** — the category leaders for the modules you're building (table below).
  Study them for interaction depth and information architecture, then render in the chosen brand.

---

## Step 3 — Record the decision in a scope artifact (before designing)

The chosen direction must be **pinned and traceable** before any screen is designed:

- A **Brief NOTE** capturing the six attribute values + the references adapted from, **or**
- An **ADR "design direction"** when the choice is load-bearing / contested / supersedes an earlier brand, **or**
- A **recorded design-tokens decision** (the tokens RFC) when exact values are settled.

Only once the choice lives in one of these does the Designer proceed. The Tester checks that the brand/token
decisions trace back to this artifact (`canvas-truth-map` §02-provenance) — an un-recorded brand is a
provenance gap, not a style.

> **The rule, restated:** style recorded → design to it. Style not recorded → choose (Step 1) → record
> (Step 3) → *then* design. getdesign.md / reference products / any named preset are reference **inputs** you
> adapt to the recorded brand — never the destination.

---

## Worked example A — a recorded "warm-paper" brand

*This is an **example of a recorded brand**, not "the" brand. A different project records a different one;
adapt to whatever the scope artifact pins.*

A project that recorded a **warm-paper** direction: a cream/off-white, low-glare "printed page" surface with
warm ink text and a single restrained accent — the opposite of cold neon-on-black dev-tool chrome. The values
below are an **example token set from one chosen brand**; confirm exact values against *that* project's tokens
RFC / brand ADR before committing.

```
// example warm-paper tokens (Light)          // Dark counterpart (warm ink)
$--background        #FAF6EF  warm paper       #1A1714  warm near-black
$--surface           #F5EFE3  raised paper     #221E19  raised ink
$--foreground        #2B2620  warm ink         #EDE6D8  warm off-white
$--muted-foreground  #8A8175  warm gray        #9A9082
$--border            #E4DCCB  paper edge       #342E27
$--accent            #B5532A  terracotta       #D8743E
$--font-primary      Inter (or the brand sans declared in that project's tokens RFC)
$--radius-md         6
```

How that example brand reasons about its attributes (illustrating Step 1 in practice):
- **Warm not cold** — off-white paper, never pure `#FFFFFF`; warm ink, never pure `#000000`.
- **One accent, used sparingly** — terracotta/amber for the single primary CTA (Von Restorff, §07); the
  rest is paper, ink, and warm gray.
- **Calm density** — generous whitespace, AA contrast in both themes, restraint over decoration.

Whatever brand *your* project records, apply it via `$--var` tokens only (§04). Define them with
[`themed-color-var`](../../templates/themed-color-var.md).

---

## Worked example B — an "Expo monochrome" reference preset

*This is an **example reference preset** — a borrowable discipline, not a destination.* A strict monochrome
minimalism worth borrowing for **flat, structural surfaces** (cards, bento grids, section dividers). Borrow
the *discipline*, recolor to your project's chosen brand.

| Trait | Expo value | Adaptation to your chosen brand (warm-paper shown as the example) |
|---|---|---|
| Palette | black / white / gray, **no bright accent** | chosen neutrals + accent strategy (e.g. warm paper / ink / gray, one terracotta accent only on the CTA) |
| Card radius | **0px** (rectangular) | 0px for structural cards; `$--radius-md` for interactive ones |
| Card shadow | **none** | none — separate with border, not elevation |
| Card border | **2px** solid `#363A3F` | 1–2px solid `$--border` |
| Type | Inter; hero 61/700 with **negative** letter-spacing | the chosen type family; large titles may use slight negative tracking |
| Buttons | very round (radius 36/24), horizontal-only padding | match the chosen button radius — do not blindly adopt 36px |
| Sections | alternating **dark / light** bands | alternating bands in the chosen neutrals (e.g. paper / ink) |

What Expo deliberately omits (and a calm/minimal brand often follows): no gradients in content, no bright
accent fields, no card shadows, no rounded structural cards. Build one with
[`expo-monochrome-card`](../../templates/expo-monochrome-card.md) (recolor the hexes to your `$--vars`).

> **Do not paste Expo's hexes into the DS.** `#363A3F` / `#1C2024` are *its* tokens. Map the *idea*
> (flat, bordered, shadowless) onto your chosen brand's `$--vars`.

---

## Reference products by module (depth, not pixels)

When designing a module, study its category leader for **interaction depth and information architecture** —
then render it in the brand recorded in your scope artifact. Mandatory: read the primary reference before
designing a module's MainArea.

| Module kind | Primary reference | Secondary | Study for |
|---|---|---|---|
| Observability / traces | Langfuse | New Relic, PostHog | trace/span trees, score/cost surfaces |
| Pipelines / jobs / ETL | Airflow | Dagster, Prefect | DAG views, run history, scheduling |
| Agents / chat | LangChain, OpenAI Playground | CrewAI, LlamaIndex | agent builder, tools, streaming chat |
| Visual workflows | n8n | Zapier | node canvas, connectors |
| Knowledge / RAG | RAGFlow | LlamaIndex | documents, chunks, retrieval views |
| Graph / discovery | Neo4j Bloom | Cytoscape | graph viz, query surface |
| IAM | Clerk, Auth0 | Zitadel | users, teams, permissions, sessions |
| Settings / billing | Vercel, Stripe | Linear | account, integrations, billing |

For an editorial/CMS-style product (e.g. sources, stories, variants, schedule, publish), the nearest
references are editorial/CMS + scheduling tools — but always re-read the active scope PRD: the product, not
the reference, sets the requirements.

---

## getdesign.md reference (the production-DESIGN.md catalog)

**`https://getdesign.md/`** is a curated catalog of **75+ analyzed production `DESIGN.md` systems** —
real shipping products' color, typography, component, and token decisions, written **machine-readable for AI
agents** across domains (AI/LLM, dev-tools, fintech, e-commerce, media). It is the Designer's "what do
mature systems actually do" lookup — useful both for *choosing* a brand (Step 1) and for designing once one
is recorded. **Reference-only — adapt to the brand recorded in your scope artifact, never copy 1:1.**

### When to consult it

- Helping the user **choose** a direction (Step 1) and wanting priors from shipping systems per attribute.
- Choosing a **token scale** (a sane spacing/type/radius ramp) and wanting priors from shipping systems.
- Deciding a **typography pairing** or a type scale for a content-dense surface.
- Designing a **component pattern** (a stat card, a data table, an empty state) and wanting proven variants.
- Sanity-checking a **theming approach** (Light/Dark token structure, semantic naming) before §04.

### How to consult it (WebFetch)

```
WebFetch("https://getdesign.md/", "What token scale / type ramp / <component> patterns do production
                                    systems in <domain> use? Summarize structures, not exact values.")
```

Then **translate, do not transplant**: take the *structure* (the ramp shape, the semantic token names, the
component anatomy) and re-express it in **your recorded brand's `$--vars`**. A getdesign.md system's literal
hexes, radii, and fonts are *its* brand — pulling them in directly would fork your single source of truth and
break the identity your scope artifact recorded.

### Guardrails

- **Reference-only.** Never copy a catalog system's tokens verbatim into `tokens.json`.
- **The recorded brand wins.** When a borrowed pattern conflicts with your recorded brand (e.g. a neon accent
  where the brand is calm, a pure-black bg where the brand is warm), the recorded brand wins — recolor it.
- **Record the borrow.** A non-obvious pattern adopted from getdesign.md should be noted in the Design NOTE
  (and, if it sets a token decision, escalated to the tokens RFC / ADR) so provenance is traceable
  (`canvas-truth-map`).

---

## Cross-references

- Turn the recorded style into tokens → [§04 tokens-theming](../04-tokens-theming/_index.md).
- The UX-law constraints that govern layout regardless of style → [§07 ux-task-map](../07-ux-task-map/_index.md).
- The Tester checks that brand/token decisions trace to the scope artifact (ADR/PRD/Brief) → `canvas-truth-map` §02-provenance.
- Templates: [`expo-monochrome-card`](../../templates/expo-monochrome-card.md), [`themed-color-var`](../../templates/themed-color-var.md).
