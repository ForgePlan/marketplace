# Changelog

All notable changes to `agents-tdd` are documented here.

## Release notes migrated from the plugin manifest — 2026-09-10

Until this file existed, every release appended its notes to the `description` field in
`.claude-plugin/plugin.json`. That field is what a user reads when browsing the marketplace, and it
had grown into a changelog — for this plugin, 1509 characters of it. The text below is that field,
**preserved verbatim** at the moment it was moved here; the manifest now carries a description of
what the plugin is and when to use it, per `CONTRIBUTING.md`.

Nothing was rewritten or summarised on the way across. Entries are in the order they had accumulated,
which is not strictly chronological — releases were appended wherever the previous author put them.

---

v0.2.1: tdd-orchestrator denylist adds forgeplan_validate - B-orchestrator parity (DEFER-015 / EVID-157 F1): a master coordinates, it does not validate; now matches smith/sparc + the AGENT-AUTHORING-GUIDE canon. Enforced-TDD methodology: tdd-orchestrator master + RED/GREEN phase agents + fail-closed PreToolUse gate (first instance of the AD/AID-PDLC sub-cycle contract). Implements RFC-012 / ADR-010: tdd-planner (scenarios→plan) + coder-tdd (plan→failing tests, RED) + tdd-test-validator (independent C4 verifier) + PreToolUse tdd-gate (permissionDecision:deny, exit2 fail-closed) + normalized full-file SPEC hash freeze (FR-6). v0.4.0: Каждый агент пакета получил секцию `## Model tier`: какой ЯРУС нужен его работе и почему ярус задаёт самая трудная стадия, а не самая частая. Там же сказано, что значение `model:` во фронтматтере — привязка Claude Code, а не требование: в OMP/OpenCode/Codex/Gemini этих имён нет, надо подставить модель своего яруса и при промахе промахиваться ВВЕРХ. Лестница ярусов — `docs/GUIDE-AI-SDLC-PDLC-RU.md` §6.2, здесь она не пересказывается. Memory-denylist fix: the relay grew 13 -> 27 tools and every agent denylist kept naming the old three, so document_delete (irreversible, cascades to every fact from a document), bank_config_set, memory_invalidate, mental_model_clear and directive_delete became reachable by every memory-restricted agent. All denylists completed from one source (fpl-hsmem MEMORY_WRITE_TOOLS) and held there by a new CI gate with a 4-case self-test.
