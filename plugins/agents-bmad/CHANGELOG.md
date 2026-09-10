# Changelog

All notable changes to `agents-bmad` are documented here.

## Release notes migrated from the plugin manifest — 2026-09-10

Until this file existed, every release appended its notes to the `description` field in
`.claude-plugin/plugin.json`. That field is what a user reads when browsing the marketplace, and it
had grown into a changelog — for this plugin, 1825 characters of it. The text below is that field,
**preserved verbatim** at the moment it was moved here; the manifest now carries a description of
what the plugin is and when to use it, per `CONTRIBUTING.md`.

Nothing was rewritten or summarised on the way across. Entries are in the order they had accumulated,
which is not strictly chronological — releases were appended wherever the previous author put them.

---

v0.1.2: ADR-012 internal codename rendered hook-gate in shipped artifacts — bmad-orchestrator + bmad-gate.sh comment; terminology only, no behavior change. v0.1.1: bmad-orchestrator denylist adds forgeplan_validate - B-orchestrator parity (DEFER-015 / EVID-157 F1); now matches smith/sparc + the AGENT-AUTHORING-GUIDE canon. BMAD greenfield methodology: bmad-orchestrator master walks the persona arc (Analyst → PM → Architect → Scrum-Master → Dev → QA) with a blocking quality-gate at every handoff and a fail-closed no-code-before-plan PreToolUse gate (second instance of the AD/AID-PDLC sub-cycle contract). Implements RFC-013 / ADR-010: reuses existing forgeplan-aware personas (brief-intake/specification/adr-architect/architecture/goal-planner/coder/tester/code-reviewer/guardian/evidence-recorder) + a new bmad-orchestrator + /bmad + /bmad-init + bmad-gate (permissionDecision:deny, exit2 fail-closed) reading a per-branch phase state file. v0.4.0: Каждый агент пакета получил секцию `## Model tier`: какой ЯРУС нужен его работе и почему ярус задаёт самая трудная стадия, а не самая частая. Там же сказано, что значение `model:` во фронтматтере — привязка Claude Code, а не требование: в OMP/OpenCode/Codex/Gemini этих имён нет, надо подставить модель своего яруса и при промахе промахиваться ВВЕРХ. Лестница ярусов — `docs/GUIDE-AI-SDLC-PDLC-RU.md` §6.2, здесь она не пересказывается. Memory-denylist fix: the relay grew 13 -> 27 tools and every agent denylist kept naming the old three, so document_delete (irreversible, cascades to every fact from a document), bank_config_set, memory_invalidate, mental_model_clear and directive_delete became reachable by every memory-restricted agent. All denylists completed from one source (fpl-hsmem MEMORY_WRITE_TOOLS) and held there by a new CI gate with a 4-case self-test.
