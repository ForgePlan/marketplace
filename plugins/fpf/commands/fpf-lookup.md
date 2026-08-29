---
name: fpf-lookup
description: "Look up an FPF concept in the 224-section knowledge base. Takes a term, returns a plain-language explanation, when to use it, related concepts, and a practical example. Usage: /fpf-lookup \"<term>\"."
---

# /fpf-lookup — Concept Lookup

You are answering "what does this FPF term mean?" against the `fpf-knowledge` skill.

This is the narrowest of the FPF commands: it explains one concept and stops. It does not
decompose a system (`/fpf-decompose`), score alternatives (`/fpf-evaluate`), or run a
reasoning cycle (`/fpf-reason`). If the user's question turns out to need one of those,
say so and offer it rather than half-doing it here.

## Step 1 — Take the term

If the user supplied a term, use it. If not, ask for one — a concept name (`U.Holon`,
`Gamma`, `F-G-R`, `bounded context`, `Trust Calculus`), or a plain-language question
("what does congruence level mean?").

If the term is ambiguous — it matches several sections, or it is a common word that FPF
uses in a specific sense — say which readings exist and ask which one they meant. Do not
pick silently; guessing wrong here wastes the whole answer.

## Step 2 — Route, do not read everything

The knowledge base is **224 spec sections**. Loading it whole is the failure mode this
command exists to avoid.

1. Open the `fpf-knowledge` SKILL.md router table and find where the term lives.
2. Open that section's `_index.md` — it lists sub-sections with line counts and descriptions.
3. Read **only** the narrowest file that answers the question (~300 lines max).

If the first file turns out to be the wrong one, go back to the `_index.md` rather than
reading siblings one by one.

## Step 3 — Answer

Four parts, in this order:

- **What it means** — plain language first. Introduce the FPF-internal name only after the
  idea is clear, not before.
- **When to use it** — the situation that should make a reader reach for this concept. A
  definition nobody can act on is a dictionary entry, not an answer.
- **Related concepts** — two or three, with one line each on how they connect. This is what
  turns a lookup into navigation.
- **Example** — concrete, if the concept admits one. Skip it rather than inventing a
  strained one.

Cite the section path you read, so the user can go deeper without asking you where you got it.

## Step 4 — Offer the next step

End with one specific offer, not a menu:

- If the concept has depth the user may want — "Want me to go deeper into `<sub-topic>`?"
- If the question implied a task — "Want me to apply this to your case with `/fpf-decompose`?"
- If nothing suggests itself, stop. A closing question with nothing behind it is noise.

## Language

Match the user's language. If they wrote in Russian, answer in Russian.

Plain words beat FPF vocabulary. Use `U.Holon`, `Gamma`, `F-G-R` when they add precision
the reader needs — not to demonstrate that the knowledge base was read.

## Relationship to `/fpf`

`/fpf lookup <term>` routes to the same behaviour through the universal router. This command
is the direct entry point, for when the user already knows they want a definition.
