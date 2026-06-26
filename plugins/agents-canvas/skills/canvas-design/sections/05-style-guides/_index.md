# §05 — Style guides (warm-paper brand · Expo monochrome · reference products · getdesign.md)

How a screen *looks*. The brand is the destination; the presets and references are fuel — **adapt them to
the warm-paper brand, never copy 1:1.** Visual decisions that rise to "brand token" level belong in an ADR
and the tokens RFC, not invented ad hoc here.

---

## The warm-paper brand (the destination)

ExtraBoost's surface is **warm paper**: a cream/off-white, low-glare "printed page" feel with warm ink
text and a single restrained accent — the opposite of cold neon-on-black dev-tool chrome. Use it as the
default visual target; **confirm exact values against the active tokens RFC / brand ADR before committing**
— the values below are a *starter preset*, not law.

```
// warm-paper starter tokens (Light)         // Dark counterpart (warm ink)
$--background        #FAF6EF  warm paper      #1A1714  warm near-black
$--surface           #F5EFE3  raised paper     #221E19  raised ink
$--foreground        #2B2620  warm ink         #EDE6D8  warm off-white
$--muted-foreground  #8A8175  warm gray        #9A9082
$--border            #E4DCCB  paper edge       #342E27
$--accent            #B5532A  terracotta       #D8743E
$--font-primary      Inter (or the brand sans declared in the tokens RFC)
$--radius-md         6
```

Brand stance:
- **Warm not cold** — off-white paper, never pure `#FFFFFF`; warm ink, never pure `#000000`.
- **One accent, used sparingly** — terracotta/amber for the single primary CTA (Von Restorff, §07); the
  rest is paper, ink, and warm gray.
- **Calm density** — generous whitespace, AA contrast in both themes, restraint over decoration.

Apply via `$--var` tokens only (§04). Define them with [`themed-color-var`](../../templates/themed-color-var.md).

---

## The Expo monochrome preset (a borrowable discipline)

A strict monochrome minimalism worth borrowing for **flat, structural surfaces** (cards, bento grids,
section dividers). Borrow the *discipline*, recolor to warm paper.

| Trait | Expo value | Warm-paper adaptation |
|---|---|---|
| Palette | black / white / gray, **no bright accent** | warm paper / ink / gray, one terracotta accent only on the CTA |
| Card radius | **0px** (rectangular) | 0px for structural cards; `$--radius-md` for interactive ones |
| Card shadow | **none** | none — separate with border, not elevation |
| Card border | **2px** solid `#363A3F` | 1–2px solid `$--border` |
| Type | Inter; hero 61/700 with **negative** letter-spacing | brand sans; large titles may use slight negative tracking |
| Buttons | very round (radius 36/24), horizontal-only padding | match the brand button radius — do not blindly adopt 36px |
| Sections | alternating **dark / light** bands | alternating paper / ink bands |

What Expo deliberately omits (and warm-paper mostly follows): no gradients in content, no bright accent
fields, no card shadows, no rounded structural cards. Build one with
[`expo-monochrome-card`](../../templates/expo-monochrome-card.md) (recolor the hexes to `$--vars`).

> **Do not paste Expo's hexes into the DS.** `#363A3F` / `#1C2024` are *their* tokens. Map the *idea*
> (flat, bordered, shadowless) onto warm-paper `$--vars`.

---

## Reference products by module (depth, not pixels)

When designing a module, study its category leader for **interaction depth and information architecture** —
then render it in warm paper. Mandatory: read the primary reference before designing a module's MainArea.

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

For ExtraBoost's editorial surfaces (sources, stories, variants, schedule, publish), the nearest references
are editorial/CMS + scheduling tools — but always re-read the scope PRD: the product, not the reference,
sets the requirements.

---

## getdesign.md reference (the production-DESIGN.md catalog)

**`https://getdesign.md/`** is a curated catalog of **75+ analyzed production `DESIGN.md` systems** —
real shipping products' color, typography, component, and token decisions, written **machine-readable for AI
agents** across domains (AI/LLM, dev-tools, fintech, e-commerce, media). It is the Designer's "what do
mature systems actually do" lookup. **Reference-only — adapt to the warm-paper brand, never copy 1:1.**

### When to consult it

- Choosing a **token scale** (a sane spacing/type/radius ramp) and want priors from shipping systems.
- Deciding a **typography pairing** or a type scale for a content-dense surface.
- Designing a **component pattern** (a stat card, a data table, an empty state) and want proven variants.
- Sanity-checking a **theming approach** (Light/Dark token structure, semantic naming) before §04.

### How to consult it (WebFetch)

```
WebFetch("https://getdesign.md/", "What token scale / type ramp / <component> patterns do production
                                    systems in <domain> use? Summarize structures, not exact values.")
```

Then **translate, do not transplant**: take the *structure* (the ramp shape, the semantic token names, the
component anatomy) and re-express it in **warm-paper `$--vars`**. A getdesign.md system's literal hexes,
radii, and fonts are *its* brand — pulling them in directly would fork our single source of truth and break
the warm-paper identity.

### Guardrails

- **Reference-only.** Never copy a catalog system's tokens verbatim into `tokens.json`.
- **Brand wins.** When a borrowed pattern conflicts with warm-paper (e.g. a neon accent, a pure-black bg),
  the brand wins — recolor it.
- **Record the borrow.** A non-obvious pattern adopted from getdesign.md should be noted in the Design NOTE
  (and, if it sets a token decision, escalated to the tokens RFC / ADR) so provenance is traceable
  (`canvas-truth-map`).

---

## Cross-references

- Turn these styles into tokens → [§04 tokens-theming](../04-tokens-theming/_index.md).
- The UX-law constraints that govern layout regardless of style → [§07 ux-task-map](../07-ux-task-map/_index.md).
- The Tester checks that brand/token decisions trace to an ADR/PRD → `canvas-truth-map` §02-provenance.
- Templates: [`expo-monochrome-card`](../../templates/expo-monochrome-card.md), [`themed-color-var`](../../templates/themed-color-var.md).
