# Project Context

> Ubiquitous language for this project. Domain terms — what they mean here, not in general.
> Edit during `/grill-with-docs` sessions or whenever a term gets sharper.
>
> Format inspired by Matt Pocock's CONTEXT.md pattern.

## Language

**{Term}**:
{One-paragraph definition in plain English. What it is. What it isn't.}
_Avoid_: {synonyms or older names that drift in meaning}

**{Another term}**:
{...}

## Relationships

- A **{Term A}** has many **{Term B}**
- A **{Term B}** belongs to one **{Term A}**
- An **{Action}** is performed by a **{Actor}** on a **{Target}**

## Flagged ambiguities

> Track here when one word has been used for two meanings, or two words for one.
> Each entry: original confusion → resolution (which term wins, which is retired).

- "{old word}" was used for both {meaning 1} and {meaning 2} — resolved: {meaning 1} is now **{Term A}**, {meaning 2} → **{Term B}**.
- "{ambiguous phrase}" — resolved: collapsed into **{Term}**.

## Out-of-language

> Words that look like domain terms but aren't. Often imported from other systems.

- `{ext_term}` (from {external system}) — NOT part of our domain. We map it to **{Term}** at the boundary.
