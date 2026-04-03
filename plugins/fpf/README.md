[English](README.md) | [Русский](README-RU.md)

# FPF Plugin — First Principles Framework for Claude Code

A thinking amplifier for structured reasoning, system decomposition, and decision-making.

## Credits

- **FPF Specification** by [Anatoly Levenchuk](https://github.com/ailev) — [github.com/ailev/FPF](https://github.com/ailev/FPF)
- **Skill packaging** originally by [CodeAlive-AI](https://github.com/CodeAlive-AI) ([fpf-simple-skill](https://github.com/CodeAlive-AI/fpf-simple-skill))
- **Enhanced plugin** by [ForgePlan](https://github.com/ForgePlan) — commands, agent, applied patterns, forgeplan integration

## What's different from fpf-simple

| Feature | fpf-simple (skill) | fpf (plugin) |
|---------|-------------------|--------------|
| Format | Standalone skill | Full plugin (skill + commands + agent) |
| `/fpf` command | None | Universal router: decompose, evaluate, reason, lookup |
| Specialized commands | None | `/fpf-decompose`, `/fpf-evaluate`, `/fpf-reason` |
| Agent | None | `fpf-advisor` — activates for architecture/decision tasks |
| Applied Patterns | None | Step-by-step guides for real-world application |
| Forgeplan Integration | None | Maps FPF outputs to PRD, RFC, ADR artifacts |
| Quick Start | None | Onboarding for FPF newcomers |
| FPF Specification | 224 files | Same 224 files (git submodule from ailev/FPF) |
| Update mechanism | `split_spec.py` | Same + `update-fpf.sh` preserving applied-patterns |

## Install

```bash
/plugin install fpf@forgeplan-marketplace
```

## Usage

```
/fpf                              # Show modes and quick reference
/fpf decompose my auth system     # Break into bounded contexts
/fpf evaluate React vs Vue        # Compare with F-G-R scoring
/fpf reason why API is slow       # ADI cycle: hypotheses → test → conclude
/fpf what is bounded context      # Lookup a concept
```

Or just describe your problem — the advisor agent activates for architecture and decision tasks.

## Updating FPF Spec

The FPF specification is included as a git submodule from `ailev/FPF`. To update:

```bash
cd plugins/fpf
./scripts/update-fpf.sh
```

This will:
1. Pull the latest FPF spec from upstream
2. Regenerate 224 section files via `split_spec.py`
3. **Preserve** applied-patterns/ (our additions)
4. Show what changed for review

## License

MIT — applies to the plugin wrapper. The FPF specification is by Anatoly Levenchuk under its own terms.
