# Changelog

All notable changes to `forgeplan-brownfield-pack` are documented here.

## Release notes migrated from the plugin manifest — 2026-09-10

Until this file existed, every release appended its notes to the `description` field in
`.claude-plugin/plugin.json`. That field is what a user reads when browsing the marketplace, and it
had grown into a changelog — for this plugin, 1358 characters of it. The text below is that field,
**preserved verbatim** at the moment it was moved here; the manifest now carries a description of
what the plugin is and when to use it, per `CONTRIBUTING.md`.

Nothing was rewritten or summarised on the way across. Entries are in the order they had accumulated,
which is not strictly chronological — releases were appended wherever the previous author put them.

---

Brownfield extraction pack for forgeplan — turns legacy code + docs into a structured forgeplan graph. Ships 12 extraction skills (ubiquitous-language, use-case-miner, intent-inferrer, invariant-detector, causal-linker, hypothesis-triangulator, interview-packager, scenario-writer, kg-curator, canonical-reproducer, reproducibility-validator, rag-packager), 2 orchestration playbooks (extract-business-logic, phase-transitions), 3 integration recipes (autoresearch hooks, forgeplan MCP additions, RAG export), 5 mappings (c4-to-forge, ddd-to-forge, madr-to-forge, obsidian-to-forge, autoresearch-to-forge), templates, examples, and methodology docs. Implements two-tier extraction (Factum vs Intent) with confidence taxonomy and ADI cycle. v1.4.0: Sprint V (PRD-048) — discover agent migrated from standalone to plugin (canonical Profile A pattern, MCP-first 7-phase procedure, 9 brownfield MCP primitives wired). v1.7.0: Каждый агент пакета получил секцию `## Model tier`: какой ЯРУС нужен его работе и почему ярус задаёт самая трудная стадия, а не самая частая. Там же сказано, что значение `model:` во фронтматтере — привязка Claude Code, а не требование: в OMP/OpenCode/Codex/Gemini этих имён нет, надо подставить модель своего яруса и при промахе промахиваться ВВЕРХ. Лестница ярусов — `docs/GUIDE-AI-SDLC-PDLC-RU.md` §6.2, здесь она не пересказывается.
