# 01 - Single Source (refs / slots / no-detach / no-duplicate)

The load-bearing CANVAS invariant: **one definition, many references.** Every reusable element is a
`reusable:true` **Component**; every appearance of it is a `type:"ref"` **instance** that customizes only
via `descendants` / `slot`. The moment an instance is detached or a primitive is hand-rebuilt, the DS has
two sources of truth for the same thing — and a token/structure change no longer propagates. This section
is where most **Critical** findings live.

Audit inputs: the `export_nodes` manifest (`type`, `ref`, `reusable`, `descendants`, `slot`, `name`,
child structure) for each node.

---

## SS-1 — A Component is referenced at least twice

**Rule.** Every node with `reusable:true` is a real DS Component and is referenced (`type:"ref"`,
`ref:<id>`) from **>= 2** places. A `reusable:true` node referenced **0-1** times is either dead weight
(should be de-componentized to a plain frame) or it is a **screen** mistakenly marked reusable (see AL-2).

**Detect.** Build a ref-count map from the manifest: for each `reusable:true` id, count nodes whose
`ref` equals it. Flag ids with count < 2.

**Severity.** Warning (Critical if the unreferenced `reusable:true` is a screen-sized frame — escalate to
AL-2).

**Fix.** Either reference it a second time where the duplicate-by-hand instance lives, or set
`reusable:false` and inline it. Never leave a single-use Component — it implies a missed dedupe.

---

## SS-2 — Instances are refs, never hand-rebuilt frames

**Rule.** A second (third, ...) appearance of a component is a `type:"ref"` to the base, **not** a fresh
`frame` whose child tree duplicates the base's structure.

**Detect.** Find frames whose child structure (names, node types, nesting) mirrors a known
`reusable:true` Component but that are **not** `type:"ref"`. Structural twins that are not refs are
rebuilt primitives.

**Severity.** Critical — this is a forked source of truth; the base Component will not propagate into the
copy.

**Fix.** Replace the rebuilt frame with `{ type:"ref", ref:"<BaseID>", descendants:{...} }`. Rediscover
`<BaseID>` in **this** `.pen` file (IDs are file-specific — never reuse an ID from another document).

---

## SS-3 — Customize via descendants / slot, never detach

**Rule.** Per-instance variation (a different label, an icon, a state color) is expressed through
`descendants` overrides or `slot` content on the ref — the instance keeps its `ref` link intact. Detach
severs that link permanently.

**Detect.** Look for instances that should be refs but have no `ref` field (link severed), or a `ref`
node whose entire subtree has been overridden such that nothing of the base remains (effective detach).

**Severity.** Critical.

**Fix.** Re-attach as a ref + targeted `descendants`:

```json
{ "type": "ref", "ref": "BaseAlertID", "name": "Alert/Error",
  "fill": "$--color-error",
  "descendants": { "iconChildID": { "name": "icon-Warning" } } }
```

---

## SS-4 — Never detach for a minor edit

**Rule.** A minor edit (change a label's `content`, disable an icon, swap a token) is **always** a
`descendants` override, never a reason to detach the whole instance. This is the most common detach
anti-pattern and the most expensive (it silently freezes that copy against future base changes).

**Detect.** Detached copies that differ from a base Component by only one or two leaf properties
(content / enabled / a single fill).

**Severity.** Critical.

**Fix.**

```json
{ "type": "ref", "ref": "ButtonID",
  "descendants": { "labelID": { "content": "Submit" }, "iconID": { "enabled": false } } }
```

---

## SS-5 — No duplicate Components

**Rule.** No two base Components share an identical structure or a colliding name. Two Components that
render the same thing are two sources of truth.

**Detect.** Group `reusable:true` nodes by normalized name and by descendant-tree shape; flag collisions
(same `name`, or structurally identical trees under different ids).

**Severity.** Warning (Critical when both duplicates are referenced — consumers now diverge by accident).

**Fix.** Keep one canonical Component; repoint every `ref` of the duplicate to it; delete the duplicate
(deletion is a destructive op — propose it, with an OLD-vs-NEW screenshot, and get user approval per the
methodology HARD RULES; the Guardian never deletes).

---

## SS-6 — Slots for injected content

**Rule.** Containers designed to receive variable content (card body, dropdown list, modal content)
expose an empty `slot: []` (or a slot with default children) so consumers inject via the slot — they do
not hardcode the children into the Component.

**Detect.** Components named like containers (`Card`, `Dropdown`, `Modal`, `* Content`) that have fixed
`children` and **no** `slot` key, yet are referenced with differing inner content across instances.

**Severity.** Warning.

**Fix.** Add a `slot` to the container:

```json
{ "type": "frame", "name": "Card Content", "slot": [], "layout": "vertical", "gap": 8, "padding": 24 }
```

---

## SS-7 — Reuse -> extend-variant -> new (the constructive decision)

**Rule.** Before adding any component, walk the decision **in order** and stop at the first outcome that
fits — the same tree the design side (Capture) walks, so design and code never diverge on what counts as
"a new component":

1. **REUSE** — an existing DS Component already renders this thing → `ref` it
   (`{type:"ref", ref:<BaseID>}`) and customize via `descendants` / `slot`. No new node.
2. **EXTEND-VARIANT** — it is the *same* component differing on **one axis** (a state, a size, a
   color/tone, an icon slot) → add that axis to the **existing** Component as a variant / token-driven
   override, and `ref` it with the variant selected. Do **not** mint a sibling Component.
3. **NEW** — only when the structure *and* semantics are genuinely new (a different child tree, a
   different role) → create a new `reusable:true` Component. A "new" Component that is really outcome #2
   in disguise is the SS-8 cousin-duplicate violation.

**Detect.** For each newly-added `reusable:true` Component, ask: "could a `descendants` / `slot` /
variant on an existing Component have produced this?" If yes → it should have been REUSE or
EXTEND-VARIANT, not NEW.

**Severity.** Warning (Critical when the new Component duplicates a *referenced* one — consumers now
diverge; see SS-5 / SS-8).

**Fix.** Collapse the new node into a variant / override of the canonical Component and repoint refs;
reserve a standalone Component for genuinely-new structure + semantics only.

---

## SS-8 — Cousin-duplicate (one-axis near-duplicate) is an extend-variant violation

**Rule.** A **cousin-duplicate** is a near-duplicate Component that differs from an existing one on
**exactly one axis** — e.g. `PrimaryButton` vs `Button` with `variant=primary`, `SmallCard` vs `Card`
at `size=sm`, `DangerBadge` vs `Badge` with `tone=danger`. Per SS-7 this is an **EXTEND-VARIANT case**:
the axis belongs on the existing Component as a variant, **not** as a second Component. A cousin-duplicate
is therefore a **VIOLATION in its own right — not merely "a duplicate"** — because it bakes a value-axis
into a *name* and forks the single source of truth along that axis.

**Detect.** Group Components by structural shape; within a group flag any pair that differs only by a
single token-able axis (a fill / tone, a size, a state, one slot) **and** encodes that axis in the
**name** (`Primary*` / `Small*` / `Danger*` / `*Active`) instead of as a variant prop. The
name-encodes-an-axis signal is the tell.

**Severity.** Critical when both cousins are referenced (consumers diverge by accident); Warning
otherwise.

**Fix.** Keep the **base** Component, promote the differing axis to a variant / token-driven override on
it, repoint every `ref` of the cousin to `ref:<Base>` + the variant selected, then propose deleting the
cousin (destructive — OLD-vs-NEW screenshot + user approval per the methodology HARD RULES; the Guardian
never deletes). **The Guardian flags a cousin-duplicate explicitly as an SS-8 extend-variant violation**
— not as a generic SS-5 duplicate — so the fix routes to "add the variant", not "pick one of two".

```
VIOLATION   reusable Component "PrimaryButton"  +  reusable Component "Button"   (identical tree, fill differs)
CORRECT     one reusable Component "Button" with variant {primary | secondary};
            primary usage = { "type":"ref", "ref":"ButtonID", "descendants": { "rootID": { "variant":"primary" } } }
```

---

## Cross-checks

- An SS-2/SS-3/SS-4 violation on a **screen** is usually also AL-2 (screens-not-reusable) — record both.
- A duplicate Component (SS-5) that exists because the same atom was placed in two zones is also AL-1.
- A cousin-duplicate (SS-8) is the **named one-axis case** of SS-5 — record it as SS-8 (extend-variant)
  so the fix is "add the variant on the base", not just "dedupe two copies"; it also fails the SS-7
  reuse→extend→new walk at step 2.
- If the manifest lacks `descendants`/`ref` fields entirely, that is an export-fidelity gap — record a
  Warning ("snapshot incomplete"), do not infer a PASS.
