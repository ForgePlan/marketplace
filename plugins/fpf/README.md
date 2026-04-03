# FPF Plugin — First Principles Framework for Claude Code

A thinking amplifier for structured reasoning, system decomposition, and decision-making.

## Credits

- **FPF Specification** by Anatoly Levenchuk — [github.com/ailev/FPF](https://github.com/ailev/FPF)
- **Skill packaging** originally by [CodeAlive-AI](https://github.com/CodeAlive-AI) (fpf-simple skill)
- **Enhanced plugin** by [ForgePlan](https://github.com/nickaralis/forgeplan-marketplace) — commands, agent, applied patterns, and forgeplan integration

## What is different from fpf-simple

| Feature | fpf-simple (skill) | fpf (plugin) |
|---------|-------------------|--------------|
| Format | Standalone skill | Full plugin (skill + commands + agent) |
| Commands | None | `/fpf-decompose`, `/fpf-evaluate`, `/fpf-reason` |
| Agent | None | `fpf-advisor` — activates for architecture and decision tasks |
| Applied Patterns | None | Step-by-step guides for decomposition, evaluation, reasoning |
| Forgeplan Integration | None | Maps FPF outputs to PRD, RFC, ADR artefacts |
| FPF Specification | 20 sections (224 files) | Same 20 sections + applied-patterns section |
| Quick Start | None | Onboarding section for FPF newcomers |

The full FPF specification (Parts A through K) is included unchanged. The plugin
adds practical tooling on top of it.

## Install

Install via the ForgePlan marketplace:

```
/install-plugin fpf
```

Or add manually to your `.claude/plugins/` directory.

## Usage

Once installed, use any of these entry points:

- **Ask naturally** — the fpf-knowledge skill activates when you discuss architecture, decomposition, or decision-making
- **Use commands** — `/fpf-decompose`, `/fpf-evaluate`, `/fpf-reason` for guided workflows
- **Talk to the advisor** — the fpf-advisor agent suggests the right FPF tool for your situation

## License

MIT
