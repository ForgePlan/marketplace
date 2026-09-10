# Changelog

All notable changes to `agents-core` are documented here.

## Release notes migrated from the plugin manifest — 2026-09-10

Until this file existed, every release appended its notes to the `description` field in
`.claude-plugin/plugin.json`. That field is what a user reads when browsing the marketplace, and it
had grown into a changelog — for this plugin, 2565 characters of it. The text below is that field,
**preserved verbatim** at the moment it was moved here; the manifest now carries a description of
what the plugin is and when to use it, per `CONTRIBUTING.md`.

Nothing was rewritten or summarised on the way across. Entries are in the order they had accumulated,
which is not strictly chronological — releases were appended wherever the previous author put them.

---

v1.4.1: coder body gains a 'TDD GREEN-phase discipline' section (RFC-012 FR-4) — when dispatched in a TDD GREEN phase, never Write/Edit test files; on a wrong test STOP and emit TEST_BUG; lint after each change. v1.6.0: performance-engineer loses Write/Edit — same B-reviewer alignment as agents-pro (marketplace#236); its own description already said 'hand off findings to coder for implementation'. v1.4.0: code-reviewer + tester (Profile B) bodies gain Step 4.5 Ground-truth verification clause (RFC-011 FR-3) — reviewers MUST read frozen git diff themselves before PASS; empty diff on a claimed change = BLOCKER (vacuous green). Core development agents: debugger, code reviewer, error detective, performance engineer, production validator, plus a complete dev team (coder, planner, researcher, reviewer, tester, TDD London School). v1.3.1: code-reviewer + tester (Profile B) bodies patched with Step 9b NEEDS_ACTIVATION sentinel emit instruction per Sprint E PRD-033 — Profile B reviewers now emit `<<NEEDS_ACTIVATION: EVID-XXX>>` on first line of return to enable orchestrator auto-activation. v1.3: 8 legacy specialists canonical-lint compliant. v1.2: coder Profile C-coder + code-reviewer + tester (batch 2 forgeplan-aware migration). v1.9.0: Каждый агент пакета получил секцию `## Model tier`: какой ЯРУС нужен его работе и почему ярус задаёт самая трудная стадия, а не самая частая. Там же сказано, что значение `model:` во фронтматтере — привязка Claude Code, а не требование: в OMP/OpenCode/Codex/Gemini этих имён нет, надо подставить модель своего яруса и при промахе промахиваться ВВЕРХ. Лестница ярусов — `docs/GUIDE-AI-SDLC-PDLC-RU.md` §6.2, здесь она не пересказывается. v1.10.0: Каждый агент пакета получил секцию `## Model tier`: какой ЯРУС нужен его работе и почему ярус задаёт самая трудная стадия, а не самая частая. Там же сказано, что значение `model:` во фронтматтере — привязка Claude Code, а не требование: в OMP/OpenCode/Codex/Gemini этих имён нет, надо подставить модель своего яруса и при промахе промахиваться ВВЕРХ. Лестница ярусов — `docs/GUIDE-AI-SDLC-PDLC-RU.md` §6.2, здесь она не пересказывается. Memory-denylist fix: the relay grew 13 -> 27 tools and every agent denylist kept naming the old three, so document_delete (irreversible, cascades to every fact from a document), bank_config_set, memory_invalidate, mental_model_clear and directive_delete became reachable by every memory-restricted agent. All denylists completed from one source (fpl-hsmem MEMORY_WRITE_TOOLS) and held there by a new CI gate with a 4-case self-test.
