# Language idioms — what the scanner must never flag

The #1 correctness rule: idiomatic code is not slop. A pattern the language community treats as the *correct* way to do a thing is a false positive if `scan_code.py` subtracts for it. This file is the baseline the scanner and every `code-slop` catalog entry read from.

Each language section has three parts: **(1) idiomatic — leave it alone**, **(2) genuinely slop in this language**, **(3) scanner threshold notes**. The compact matrix at the end is the machine-readable summary; the prose above it is the reasoning.

The shared metric names are fixed: `comment_ratio`, `redundant_comment`, `banner_comment`, `emoji_in_source`, `todo_placeholder`, `max_nesting_depth`, `long_identifier`, `generic_name_density`, `single_impl_abstraction`, `duplicate_block`. Language sections only *tune* these, never rename them.

---

## JavaScript / TypeScript

### Idiomatic — leave it alone

- **Type guards at trust boundaries.** `if (typeof x !== "string") throw ...`, `if (!isUser(data))`, `if (res == null) return`. Repeated narrowing at API/parse edges is required, not padding. Never count guard bodies toward `max_nesting_depth` slop or `duplicate_block`.
- **`??` / `?.` chains and short early returns.** Terse null handling is the idiom, not a tell.
- **Discriminated-union `switch`.** One arm per variant of a union is exhaustiveness, not nesting slop — the arms are flat, not nested.
- **Single-line JSDoc on exported API** when the repo's lint (`jsdoc/require-jsdoc`) mandates it. A mandated doc is not a `redundant_comment`.
- **Interfaces with one implementer that cross a module/package boundary** — a public port type consumed by external code is legitimately single-impl. Only weight `single_impl_abstraction` when the interface and its sole impl live in the same file/folder with no external consumer.

### Genuinely slop

- `// increment i by one` above `i++`; `// return the result` above `return result` → `redundant_comment`.
- `data`, `result`, `temp`, `obj`, `item`, `handler`, `manager`, `util` as the *actual* variable names in business logic → `generic_name_density`.
- Barrel `interface IFooService` + `class FooService` pair with exactly one impl, same folder, no external consumer → `single_impl_abstraction`.
- Emoji in identifiers, string-key names, or comments outside string literals → `emoji_in_source`.
- `// TODO: implement`, `throw new Error("Not implemented")`, empty `{}` bodies on non-interface functions → `todo_placeholder`.
- Banner comments `// ==============` / `/* ----------- */` → `banner_comment`.

### Threshold notes

- `comment_ratio` baseline; do not subtract for JSDoc blocks when a JSDoc lint rule is active in the repo.
- `long_identifier` at 30 chars, but TS type names (`UserPreferencesUpdatePayload`) run long idiomatically — apply the 30-char rule to *value* identifiers at full weight and to type/interface names at half weight.
- `max_nesting_depth`: promise-`.then` pyramids and nested callbacks count; a flat `switch` does not.

---

## Python

### Idiomatic — leave it alone

- **Required docstrings.** Module/class/function docstrings when a linter mandates them (`pydocstyle`, `ruff D`, Google/NumPy style) are required, not `redundant_comment` and not `comment_ratio` fuel — docstrings are not line comments.
- **`if __name__ == "__main__":`**, context managers, comprehensions — standard idiom.
- **`raise ... from e`, narrow `except`**, and short guard clauses at boundaries (`if not payload: return`).
- **`@dataclass` / `Protocol` with one implementer** when it's a typed boundary consumed elsewhere.

### Genuinely slop

- A docstring that only restates the signature — `"""Get the user by id."""` on `def get_user_by_id(id)` when no doc lint requires it → `redundant_comment`.
- `# loop over items` above `for item in items` → `redundant_comment`.
- `data`, `result`, `tmp`, `obj`, `item`, `helper` as real names → `generic_name_density`.
- `# TODO: implement`, `pass` as the whole body, `raise NotImplementedError` in shipped (non-abstract) code, `...` placeholder bodies outside stubs/Protocols → `todo_placeholder`.
- Emoji in comments or string keys used as identifiers → `emoji_in_source`.
- `# -------------------` section banners → `banner_comment`.

### Threshold notes

- **Docstrings are excluded from `comment_ratio` entirely** — count only `#` line comments against code lines. This is the biggest Python-specific carve-out.
- `redundant_comment` fires on a docstring ONLY when no docstring-requiring lint rule is detected (config sniff: `pyproject`/`setup.cfg`/`ruff` D-rules). When in doubt, do not flag — Python docstrings are the highest false-positive source.
- `abstractmethod` bodies of `pass`/`...` are NOT `todo_placeholder`.
- `max_nesting_depth`: comprehensions collapse nesting, so a deep comprehension is one level, not four.

---

## Go

### Idiomatic — leave it alone

- **`if err != nil { return err }`** and every explicit error-return variant (`return nil, err`, `return fmt.Errorf("...: %w", err)`). This is *the* Go idiom. It repeats on nearly every call. NEVER flag it as `duplicate_block`, and it does not inflate `max_nesting_depth`.
- **Repetitive short error blocks** generally — Go trades brevity for explicitness by design.
- **`err`, `ok`, `ctx`, `i`, `r`, `w`** short names — Go style *prefers* short names in small scopes. Do not count them as `generic_name_density`.
- **One-line doc comments starting with the identifier name** (`// User represents ...`) — required by `golint`/`go doc` convention, not redundant.
- **Interface with one implementation** is common and often correct in Go (accept-interfaces-return-structs). Weight `single_impl_abstraction` LOW for Go.

### Genuinely slop

- `// call the function` above `foo()`; a doc comment that adds nothing beyond the name → `redundant_comment` (but the name-prefixed convention comment is exempt).
- `data`, `result`, `temp`, `obj`, `manager`, `handler`, `util` as *exported package-level* names → `generic_name_density`. (Short locals like `r`/`w` are exempt; long generic names are not.)
- `// TODO: implement`, `panic("not implemented")`, empty function bodies that should do work → `todo_placeholder`.
- Emoji anywhere in source → `emoji_in_source`.
- `// =====================` banners → `banner_comment`.

### Threshold notes

- `duplicate_block`: **raise the minimum run length and exclude error-handling blocks.** Three-line `if err != nil { return err }` repeats are idiomatic — require >=5 non-error-handling lines before flagging a Go duplicate.
- `generic_name_density`: exempt the canonical short names (`err ok ctx i j k n r w b buf`); apply the metric only to longer generic tokens.
- `single_impl_abstraction`: half weight or lower — single-impl interfaces are normal Go.
- `comment_ratio`: name-prefixed doc comments count as documentation, not comment-noise.

---

## Rust

### Idiomatic — leave it alone

- **`Result` / `Option` / `match` / the `?` operator.** Match arms are exhaustiveness, not nesting slop — a `match` with ten arms is one nesting level, not ten. NEVER count match arms toward `max_nesting_depth`.
- **`.unwrap()` / `.expect(...)` inside `#[test]` / `#[cfg(test)]`** — panicking on a failed assertion is the test idiom. Exempt from `todo_placeholder` and any "unhandled error" heuristic in test code. (Outside tests, `.unwrap()` on fallible I/O is a real smell, but that is a bug-hunt for `code-reviewer`, not a slop signal here.)
- **`impl Trait`, `?` chains, `if let` / `let else`** early returns — core idiom.
- **Doc comments `///` and `//!`** on public items when `#![warn(missing_docs)]` is set — required, not `comment_ratio` fuel.
- **Trait with one implementor** when it's a public/boundary trait or used as a bound — normal Rust generics.

### Genuinely slop

- `// unwrap the value` above `.unwrap()`; `// match on the enum` above `match` → `redundant_comment`.
- `data`, `result`, `temp`, `tmp`, `obj`, `item`, `helper`, `handler`, `manager` as real names → `generic_name_density`.
- `todo!()`, `unimplemented!()`, `// TODO: implement`, empty `{}` bodies where logic belongs → `todo_placeholder`. (`todo!()` in genuinely unreached arms is borderline — flag at low weight, honest false-positive risk.)
- Emoji outside string literals → `emoji_in_source`.
- `// -----------------` banners → `banner_comment`.

### Threshold notes

- `max_nesting_depth`: **`match` arms are flat.** Count nesting by `{}` block depth inside a single arm, not by arm count. This is the single most important Rust carve-out.
- `todo_placeholder`: `todo!()` / `unimplemented!()` fire, but `unreachable!()` does NOT — it is an assertion, not a stub.
- `comment_ratio`: exclude `///` and `//!` doc comments when `missing_docs` lint is active.
- `single_impl_abstraction`: half weight — single-impl traits are idiomatic when used as bounds.

---

## Summary matrix — per-language metric adjustment

Baseline = the default weight/threshold in `scan_code.py`. Cells show the language-specific override.

| Metric | JS/TS | Python | Go | Rust |
|---|---|---|---|---|
| `comment_ratio` | baseline; JSDoc exempt if lint-required | **docstrings excluded**; only `#` counts | name-prefixed doc comments = docs | `///`/`//!` exempt if `missing_docs` on |
| `redundant_comment` | baseline | docstring flagged ONLY if no doc-lint | name-prefixed convention comment exempt | baseline |
| `banner_comment` | baseline | baseline | baseline | baseline |
| `emoji_in_source` | baseline (strict) | baseline (strict) | baseline (strict) | baseline (strict) |
| `todo_placeholder` | baseline | `pass`/`...` in abstract = exempt | `panic("not implemented")` fires | `todo!()`/`unimplemented!()` fire; `unreachable!()` exempt |
| `max_nesting_depth` | flat `switch` exempt | comprehensions collapse | err-blocks don't nest | **`match` arms are flat** |
| `long_identifier` | value 30ch full; type names half | baseline 30ch | baseline 30ch | baseline 30ch |
| `generic_name_density` | baseline | baseline | **exempt short names** `err ok ctx i r w`; long generics only | baseline |
| `single_impl_abstraction` | full unless cross-boundary | full unless typed boundary | **low weight** (idiomatic) | **half weight** (idiomatic) |
| `duplicate_block` | baseline >=3 lines | baseline >=3 lines | **>=5 lines, exclude `if err != nil`** | baseline; match arms not dup |

`emoji_in_source` is strict in every language — there is no idiomatic reason for emoji outside string literals in JS/TS, Python, Go, or Rust source.

When a signal sits between "idiom" and "slop" (a lone `todo!()` in an unreached arm, a single-impl boundary interface), the scanner emits it at reduced weight and the finding text says so. Honesty about false positives is the whole point: a slop scanner that flags `if err != nil` is a broken scanner.
