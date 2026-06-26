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

## Cross-checks

- An SS-2/SS-3/SS-4 violation on a **screen** is usually also AL-2 (screens-not-reusable) — record both.
- A duplicate Component (SS-5) that exists because the same atom was placed in two zones is also AL-1.
- If the manifest lacks `descendants`/`ref` fields entirely, that is an export-fidelity gap — record a
  Warning ("snapshot incomplete"), do not infer a PASS.
