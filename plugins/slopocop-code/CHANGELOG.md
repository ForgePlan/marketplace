# Changelog

All notable changes to `slopocop-code` are documented here.

## Release notes migrated from the plugin manifest — 2026-09-10

Until this file existed, every release appended its notes to the `description` field in
`.claude-plugin/plugin.json`. That field is what a user reads when browsing the marketplace, and it
had grown into a changelog — for this plugin, 1305 characters of it. The text below is that field,
**preserved verbatim** at the moment it was moved here; the manifest now carries a description of
what the plugin is and when to use it, per `CONTRIBUTING.md`.

Nothing was rewritten or summarised on the way across. Entries are in the order they had accumulated,
which is not strictly chronological — releases were appended wherever the previous author put them.

---

Slop cop for code — detects and strips AI-slop in source without changing behavior. The code sibling to slopocop (text) and slopocop-design (design). Targets the AI-authorship fingerprint: redundant comments, defensive bloat, one-implementation abstractions, generic naming, banner comments, emoji-in-code, copy-paste blocks. Ships a deterministic 0-100 human-code scanner (regex/heuristic, dependency-free) that is CI-gateable, a knowledge-base skill code-slop (catalog + per-language idiom baselines so idiomatic Go/Rust is never flagged), two commands (/code-audit read-only detection, /code-deslop behavior-preserving rewrite), and an on-demand code-slop-cop reviewer agent. Languages: JS/TS, Python, Go, Rust, Java, PHP. Distinct from code-reviewer (bugs) and simplify (general quality) — it targets the machine-generated fingerprint and gives a CI score. v1.4.0: Каждый агент пакета получил секцию `## Model tier`: какой ЯРУС нужен его работе и почему ярус задаёт самая трудная стадия, а не самая частая. Там же сказано, что значение `model:` во фронтматтере — привязка Claude Code, а не требование: в OMP/OpenCode/Codex/Gemini этих имён нет, надо подставить модель своего яруса и при промахе промахиваться ВВЕРХ. Лестница ярусов — `docs/GUIDE-AI-SDLC-PDLC-RU.md` §6.2, здесь она не пересказывается.
