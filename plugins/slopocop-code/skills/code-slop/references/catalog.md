# Catalog — the AI-code tells

The full list of machine-generated fingerprints `code-slop` looks for. Roughly 35 tells in six groups (A–F). Each entry: the tell, one line on why it reads as machine-authored, and a BEFORE (slop) / AFTER (human) pair. Snippets rotate across JS/TS, Python, Go, and Rust so all four are covered.

Where a tell is deterministically measured, the metric name from `scan_code.py` is named in **`[metric]`** — the catalog and the scanner MUST use the same name. Tells with no metric tag are judgement calls for the reviewer agent, not the scanner.

The correctness backbone is the last section: **False positives — do NOT flag**. Read it before flagging anything. A tell fires only when the idiom is absent.

---

## A. Comments

**A1. Comment restates the next line.** `[redundant_comment]` — a comment whose words are a subset of the code below adds zero information; humans comment the *why*, not the *what*.

```python
# BEFORE — increment the counter by one
count = count + 1  # add one to count
# AFTER
count += 1
```

**A2. Banner / separator comments.** `[banner_comment]` — decorative `// =====` or `# -----` rules are IDE-fold theater, not structure a human needs.

```go
// BEFORE
// ============================================================
//  USER SERVICE
// ============================================================
func NewUserService() *UserService { ... }
// AFTER
func NewUserService() *UserService { ... }
```

**A3. Comment density above threshold.** `[comment_ratio]` — a high comment-to-code ratio (file or per-function) is the surest fingerprint: the model narrates every step.

**A4. Emoji in source.** `[emoji_in_source]` — emoji in comments or identifiers (outside string literals a user sees) is pure model garnish.

```js
// BEFORE
// 🚀 Fast path! ✨ super optimized 🔥
// AFTER — (deleted; the code is the same)
```

**A5. Docstring echoes the signature.** A one-line docstring that renames the parameters back to the reader tells them nothing the signature didn't.

```python
# BEFORE
def add(a, b):
    """Add a and b and return the result."""
    return a + b
# AFTER
def add(a, b):
    return a + b
```

**A6. Step-by-step narration.** `// Step 1: … // Step 2: …` over trivial statements. Humans number steps only when order is non-obvious.

**A7. Inline attribution / changelog.** `# Added by assistant`, `// TODO(2024): refactor`, `# Modified: handle edge case` baked into the body. History belongs in git, not the source.

---

## B. Defensive bloat

**B8. Guarding a value that cannot be null.** A null check on something the type system or the caller already guarantees. Signals the model padding for safety it can't reason about.

```ts
// BEFORE
function len(s: string): number {
  if (s === null || s === undefined) return 0;
  return s.length;
}
// AFTER
const len = (s: string): number => s.length;
```

**B9. Catch that only re-raises.** `try/except` that logs and re-throws the same error changes nothing but line count.

```python
# BEFORE
try:
    result = compute()
except Exception as e:
    raise e
# AFTER
result = compute()
```

**B10. Re-validating typed parameters.** Runtime type-asserting an argument the language already typed. (Boundary validation is the exception — see false positives.)

```go
// BEFORE
func Area(w int, h int) int {
    if w < 0 { w = 0 }
    if h < 0 { h = 0 }   // callers never pass negatives here
    return w * h
}
// AFTER
func Area(w, h int) int { return w * h }
```

**B11. Swallowing catch.** `except Exception: pass` or `catch { }` — the model hides failure it doesn't understand instead of letting it surface.

**B12. Defensive copy with no aliasing risk.** Cloning an input that is never mutated, "just in case".

**B13. Belt-and-suspenders double check.** The same condition asserted twice on adjacent lines, e.g. `assert x is not None` then `if x is None: return`.

---

## C. Over-abstraction

**C14. Interface / trait with one implementation.** `[single_impl_abstraction]` — an abstraction with exactly one impl or one call site is speculative generality; extract the seam when the second case actually arrives.

```rust
// BEFORE
trait Greeter { fn greet(&self) -> String; }
struct EnGreeter;
impl Greeter for EnGreeter { fn greet(&self) -> String { "hi".into() } }
// AFTER
fn greet() -> String { "hi".into() }
```

**C15. Manager / Handler / Service wrapping one call.** A class whose only method forwards to one function. The noun is ceremony. (Naming density of these words is also `[generic_name_density]`.)

```ts
// BEFORE
class UserDataManager {
  getUser(id: string) { return db.users.find(id); }
}
// AFTER
const getUser = (id: string) => db.users.find(id);
```

**C16. Factory for a single product.** `createFooFactory()` that always returns the same concrete `Foo`.

**C17. Config object for two fields.** A struct/dict of options passed to one caller that could take two positional args.

**C18. Premature generics.** A type parameter used at exactly one concrete type across the whole codebase.

**C19. Pass-through wrapper.** A function whose body is a single call to another function with identical arguments.

```python
# BEFORE
def save_user(user): return db_save_user(user)
# AFTER — call db_save_user directly
```

---

## D. Naming

**D20. Generic names.** `[generic_name_density]` — `data`, `result`, `temp`, `tmp`, `obj`, `item`, `helper`, `util`, `manager`, `handler`, `foo`, `bar`. Human code names things after the domain.

```js
// BEFORE
const data = fetch(url);
const result = process(data);
const temp = format(result);
// AFTER
const invoice = fetch(url);
const totals = process(invoice);
const receipt = format(totals);
```

**D21. Over-long identifiers.** `[long_identifier]` — a name longer than 30 chars (`getUserDataFromDatabaseAndValidate`) is the model stacking every responsibility into one label instead of splitting the function.

**D22. Type baked into the name.** `strName`, `listItems`, `userMap`, `boolIsValid` — Hungarian noise the type already carries.

**D23. `get_X_from_Y` helper sprawl.** Utility names that describe a pipeline (`get_active_users_from_db_sorted`) instead of one clear verb.

**D24. Numbered locals.** `item1`, `item2`, `result_a`, `result_b` — a loop or a named pair was wanted, not enumeration.

---

## E. Symmetry / rule-of-three

**E25. Near-duplicate block.** `[duplicate_block]` — three-plus lines repeated with one literal changed. Copy-paste the model didn't fold into a loop or a parameter.

```go
// BEFORE
sumA := a.X + a.Y + a.Z
sumB := b.X + b.Y + b.Z
sumC := c.X + c.Y + c.Z
// AFTER
sum := func(p Point) int { return p.X + p.Y + p.Z }
```

**E26. Branches differing by one value.** `if/else` arms identical but for a single constant — table or map territory.

**E27. Forced rule-of-three.** Three parallel functions/consts emitted for symmetry when the domain has two cases or five. The count follows the model's rhythm, not the problem.

**E28. Exhaustive if/elif ladder.** A long `if x == "a" … elif x == "b" …` mapping strings to values, better as a dict/map lookup.

```python
# BEFORE
if color == "red": code = 1
elif color == "green": code = 2
elif color == "blue": code = 3
# AFTER
code = {"red": 1, "green": 2, "blue": 3}[color]
```

**E29. Mirror getters/setters for every field.** A trivial get+set pair per field on a plain data holder, in a language that doesn't need them.

---

## F. Ceremony / verbosity

**F30. Single-use intermediate.** A variable named, assigned, and immediately returned once. Inline it unless the name earns its keep.

```rust
// BEFORE
let result = x * 2;
result
// AFTER
x * 2
```

**F31. Deep nesting over early return.** `[max_nesting_depth]` — arrow-shaped code four-plus blocks deep where a guard clause would flatten it.

```go
// BEFORE
func f(u *User) error {
    if u != nil {
        if u.Active {
            if u.Email != "" {
                return send(u.Email)
            }
        }
    }
    return errNoTarget
}
// AFTER
func f(u *User) error {
    if u == nil || !u.Active || u.Email == "" { return errNoTarget }
    return send(u.Email)
}
```

**F32. Boolean written the long way.** `if cond { return true } else { return false }` instead of `return cond`.

**F33. Redundant else after return.** An `else` block whose sibling `if` already returns/breaks; the `else` only adds indentation.

**F34. TODO / placeholder body.** `[todo_placeholder]` — `TODO: implement`, `# your code here`, `pass`-only bodies, `throw new Error("not implemented")` shipped as if finished.

```python
# BEFORE
def charge(amount):
    # TODO: implement payment
    pass
# AFTER — implement it, or don't commit the stub
```

**F35. Narrating logs / prints.** `print("Starting…")`, `console.log("done")` scattered as the model's own progress narration, not real observability.

---

## Priority — when to fix

Fix top-down. A-tier changes almost always improve the file; D-tier is taste and may be left in review.

| Tier | Groups | Tells | Fix when |
|------|--------|-------|----------|
| **Critical** | A, F34 | A1–A4, A6, F34 (`redundant_comment`, `banner_comment`, `comment_ratio`, `emoji_in_source`, `todo_placeholder`) | Always. Deterministic, zero behavior risk, biggest score gain. |
| **High** | B, E25–E26 | B8–B13, `duplicate_block` | In `/code-deslop`; each is behavior-preserving if the guarded idioms below are respected. |
| **Medium** | C, F30–F33 | `single_impl_abstraction`, C15–C19, ceremony | When touching the code anyway; abstraction removal needs a human eye for future call sites. |
| **Stylistic** | D, A5, A7, E27–E29, F35 | `generic_name_density`, `long_identifier`, naming, symmetry | Suggest, don't gate. Renames are cheap but reviewer-subjective. |

Scanner bands: score starts at 100, weighted subtractions → **≥85 clean / 60–84 spot-fix / <60 rewrite**; the scanner exits non-zero below 60.

---

## False positives — do NOT flag

This is the correctness backbone and the #1 rule of the plugin: **language idioms are not slop.** Per-language thresholds already suppress most of these in `scan_code.py`; the reviewer agent must never re-flag them.

### Go
- **`if err != nil { return err }`** and every explicit error return. This is *the* Go idiom, not defensive bloat (B8/B10). Repetition of it is not `duplicate_block` — never flag error-handling runs.
- Explicit `nil` checks on pointers/interfaces that genuinely can be nil at that point.
- Named `err` reused across a function — idiomatic, not D20 generic-naming.

### Rust
- **`Result` / `Option` / `match` / the `?` operator** — control flow, not ceremony. A `match` with three arms is exhaustiveness (compiler-required), not E27 rule-of-three.
- **`.unwrap()` / `.expect()` inside `#[test]` / `#[cfg(test)]`** — accepted in tests; only flag them in non-test code.
- `impl Trait for T` where the trait comes from a crate/std (e.g. `Display`, `From`, `Iterator`) — never `single_impl_abstraction`; the "second impl" is the external contract.

### Python
- **Required docstrings** — when a linter config mandates them (`pydocstyle`, `ruff D`-rules, public API), a docstring is not A5 even if terse. Only flag docstrings that *restate the signature* in projects with no such rule.
- Boundary validation at trust edges (request handlers, deserialization, CLI parsing) — `if not isinstance(...)` there is B10-exempt.
- `pass` in an intentionally empty `Protocol`, abstract method, or `except X: pass` with a comment explaining the deliberate ignore.

### TS / JS
- **Type guards at trust boundaries** — `if (typeof x !== "string") throw …` on `unknown` from `JSON.parse`, `fetch`, `process.env`, or user input is required narrowing, not B8/B10.
- Discriminated-union `switch` with a `default: assertNever` — exhaustiveness, not E28.
- `?.` / `??` on values that are legitimately optional in the type.

### All languages
- A **`TODO` with a tracking reference** (`TODO(#1234)`) in code that otherwise works is a real backlog note, not a `todo_placeholder` stub — only an empty/placeholder *body* counts.
- Comments that record a **non-obvious why** (a workaround, a spec citation, a perf reason) are the opposite of slop. Never flag them, however long.
- Generated files, vendored code, and migrations — out of scope; the scanner skips them by path, the agent should too.

## Java + PHP tells

The four groups (A comments, C over-abstraction, D naming, E symmetry) hold in Java and PHP too; below are the language-specific fingerprints. A tell fires only when the idiom is absent (annotations, DI-bound interfaces, container bindings are NOT slop — see language-idioms.md).

**J1. Javadoc restates the signature.** `[redundant_comment]` — a doc block that renames the params back to the reader, in a project with no Javadoc lint.

```java
// BEFORE
/**
 * Gets the user by id and returns it.
 * @param id the id
 * @return the user
 */
public User getUser(long id) { return repo.find(id); }
// AFTER
public User getUser(long id) { return repo.find(id); }
```

**J2. `IFoo` + lone `FooImpl` with no DI consumer.** `[single_impl_abstraction]` — an interface whose only implementor sits in the same package, injected nowhere, is speculative generality.

```java
// BEFORE
interface IPriceCalculator { int calc(Order o); }
class PriceCalculatorImpl implements IPriceCalculator {
    public int calc(Order o) { return o.qty() * o.unitPrice(); }
}
// AFTER
class PriceCalculator { int calc(Order o) { return o.qty() * o.unitPrice(); } }
```

**J3. Mass dead getters/setters.** `[duplicate_block]` — accessor pairs generated for every field on a class nothing reads through them. (Real entity/DTO accessors are exempt.)

**P1. Docblock echoes the typed signature.** `[redundant_comment]` — `@param`/`@return` that only restate declared types, in a project with no phpstan/psalm/PHPCS consuming them.

```php
// BEFORE
/**
 * @param string $name
 * @return void
 */
public function setName(string $name): void {
    // set the name on the object
    $this->name = $name;
}
// AFTER
public function setName(string $name): void { $this->name = $name; }
```

**P2. `FooInterface` + lone `Foo`, no container binding.** `[single_impl_abstraction]` — one impl, same namespace, bound nowhere.

```php
// BEFORE
interface GreeterInterface { public function greet(): string; }
class Greeter implements GreeterInterface {
    public function greet(): string { return 'hi'; }
}
// AFTER
function greet(): string { return 'hi'; }
```

**P3. Generic `$data`/`$result` chain.** `[generic_name_density]` — placeholder names where the domain has words.

```php
// BEFORE
$data = fetchOrder($id);
$result = process($data);
$temp  = format($result);
// AFTER
$order   = fetchOrder($id);
$totals  = process($order);
$receipt = format($totals);
```
