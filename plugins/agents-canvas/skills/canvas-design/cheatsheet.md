# canvas-design cheatsheet — CAN / CANNOT

The one-pager. Read before any `batch_design`. Each line maps to a HARD RULE (HR1–HR6) or a KB section.

---

## ✅ CAN — always do this

| You CAN | Because | Ref |
|---|---|---|
| `get_editor_state({include_schema:true})` before any other Pencil tool | the schema is required to use `batch_get`/`batch_design`/`snapshot_layout` | §00 |
| `batch_get({patterns:[{reusable:true}]})` before creating anything | check-DS-first; reuse beats recreate | HR2, §01 |
| Rediscover every node ID per `.pen` file by name | IDs are file-specific; KB IDs are examples | HR2, §06 |
| `I(parent,{type:"ref", ref:"<ID>"})` for any primitive | ref-first keeps the DS link | HR1, §01 |
| Customize via `descendants` / `slot` | preserves the master link | HR1/HR5, §01 |
| Keep `batch_design` to **≤25 ops**; split larger | failures stay diagnosable | HR3, §03 |
| `get_screenshot` + `snapshot_layout({problemsOnly:true})` after **every** batch | catch clipping/overlap immediately | HR4, §06 |
| Space with `nextY = prevY + prevHeight + gap` (real heights) | height-aware = no buried components | HR4, §03 |
| Build a new component (`reusable:true`) for a structural change, then ref it | the only clean alternative to detach | §01 |
| Use `$--var` tokens for color/spacing/font | single source of truth, re-themes | §04 |
| Define themed colors with both Light + Dark values | the Mode axis maps to the port | §04 |
| Consult **getdesign.md** via WebFetch for patterns, then recolor to YOUR chosen brand | reference-only priors; adapt to the brand recorded in the scope artifact | §05 |
| Consult **context7** before touching the token tool / Storybook / resolved-framework config | versions drift; don't guess | §04 |
| Apply UX laws as node constraints at design time (Fitts/Hick/Miller/Doherty/Von Restorff/Gestalt) | the hook can't see `.pen`; design correct first | §07 |
| `M` (move) content into a new shell during a refactor | preserves content, no loss | HR6, §06 |
| Produce the DS snapshot (`export_nodes` + screenshots + layout dump) as the final Capture step | the offline audit input for Guardian/Tester | §03 |

---

## ❌ CANNOT — never do this

| You CANNOT | Why it's wrong | Ref |
|---|---|---|
| `Read` / `Grep` / `cat` a `.pen` file | encrypted — Pencil MCP only | HR6, §06 |
| Build a button/input/badge/card from raw `{type:"frame"}` props | no DS link; Guardian FAIL | HR1, §01 |
| Detach an instance for a minor edit (text/color/icon) | breaks the DS link; use `descendants` | HR5, §01 |
| Mark a screen `reusable:true` | screens are unique, not templates | HR5, §06 |
| Use a fixed Y step (`+80` everywhere) | buries tall components → clipping | HR4, §03 |
| Run `batch_design` without verifying after | breakage compounds silently | HR4, §06 |
| Exceed 25 ops in one `batch_design` | a failed mega-batch is undiagnosable | HR3 |
| Hardcode a hex where a `$--var` exists | forks the source of truth; Guardian FAIL | §04 |
| Copy getdesign.md / Expo hexes 1:1 into the DS | forks the single source; breaks the chosen brand | §05 |
| Split the DS / screens across multiple `.pen` files | cross-file refs don't resolve | §06 |
| Place an atom in MOLECULES (or a molecule in ATOMS, etc.) | atomic-placement FAIL | §03 |
| `D` (delete) / refactor before user approval + OLD-vs-NEW screenshots | irreversible content loss | HR6, §06 |
| Nest beyond ~10 levels | perf + fragile addressing | §06 |
| Write the token tool / Storybook config from memory | use context7 first | §04 |
| Invent brand token values | confirm against the tokens RFC / brand ADR | §05 |

---

## 60-second loop

```
get_editor_state(include_schema:true)         # if schema not in context
batch_get(patterns:[{reusable:true}])         # check DS first, rediscover IDs
batch_design( ≤25 ops, refs + descendants )   # ref-first, tokens not hex
get_screenshot + snapshot_layout(problemsOnly:true)   # verify EVERY batch
# repeat; on refactor: build-new → screenshot OLD+NEW → wait approval → then delete
export_nodes + screenshots + layout dump      # final: the DS snapshot
```

Full rules in [SKILL.md](SKILL.md) (the six HARD RULES) and the seven `sections/`.
