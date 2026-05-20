# fp-cookbook

Practical cookbook of forgeplan CLI recipes. 25+ task-oriented how-to guides organised
into 8 sections. Each recipe follows a uniform structure:
**Цель → Команда → Пример → Common errors → Refs**.

Complements `forgeplan-methodology` (what-is reference) by answering **"how do I do X?"**.

## Install

```
/plugin install fp-cookbook@ForgePlan-marketplace
```

## Sections

| # | Section | What's inside |
|---|---------|---------------|
| 01 | getting-started | Install CLI, init workspace, first PRD walkthrough |
| 02 | recipes-prd | Create/validate/activate, FR vs Goals, link direction rules |
| 03 | recipes-evidence | Bold-pattern body, informs vs based_on, hitting R_eff ≥ 0.9 |
| 04 | recipes-workflow | Route→Shape→Build→Audit cycle, wave dispatch, dogfood discipline |
| 05 | recipes-multiplugin | Version-bump policy, catalog discipline, cross-plugin supersedes |
| 06 | recipes-ai-pair | Profile selection, task dispatch, sentinel conventions |
| 07 | troubleshooting | Sprint A-O anomalies: R_eff cascade, EVID draft, FSM rejections, link footguns |
| 08 | cli-cheatsheet | One-page CLI + MCP quick reference |

## Usage

Ask Claude: *"How do I create and activate a PRD?"* or *"Why is my R_eff low?"*
The skill router will load only the relevant recipe (~50 lines), not the full corpus.

## Version

1.0.0 — Sprint P 2026-05-20. Implements PRD-013.
