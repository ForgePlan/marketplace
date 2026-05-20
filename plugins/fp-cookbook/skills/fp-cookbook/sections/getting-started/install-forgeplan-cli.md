# Install Forgeplan CLI

## Цель

Install the `forgeplan` binary on a local machine and confirm it is working
before initialising any workspace.

## Команда

```bash
# Option A — Homebrew (macOS / Linux)
brew tap forgeplan/tap
brew install forgeplan

# Option B — Cargo (Rust toolchain required)
cargo install forgeplan

# Verify
forgeplan --version
# Expected: forgeplan 0.31.x (or higher)

forgeplan health
# Expected: ✅ .forgeplan/ reachable  (or "not initialised" — that's fine pre-init)
```

## Пример

```
$ forgeplan --version
forgeplan 0.31.2

$ forgeplan health
⚠  No .forgeplan/ found in current directory or parents.
   Run `forgeplan init` to initialise a workspace.
```

That warning is normal on a fresh machine — proceed to `init-workspace.md`.

## Common errors

| Error | Fix |
|-------|-----|
| `command not found: forgeplan` after cargo install | Add `~/.cargo/bin` to `$PATH`: `export PATH="$HOME/.cargo/bin:$PATH"` |
| `brew: no available formula for forgeplan` | Run `brew tap forgeplan/tap` first |
| `forgeplan health` returns version mismatch warning | Run `brew upgrade forgeplan` or `cargo install forgeplan --force` |
| `error[E0XXX]` during cargo build | Ensure Rust ≥ 1.75: `rustup update stable` |

## Refs

- forgeplan CLI repo: https://github.com/ForgePlan/forgeplan
- Rust toolchain: https://rustup.rs
