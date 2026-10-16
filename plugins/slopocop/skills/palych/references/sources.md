# Sources and intentional adaptations

These links explain the design. Reading them is not required to run the skill.
The package contains original instructions and examples, not a copy of a
standard, dictionary, or methodological manual.

## Ясный язык / Easy-to-read

[«Ясный язык»: как сделать информацию доступной для чтения и понимания.
Методические рекомендации, Минск, 2018, под редакцией Е. Г. Титовой](https://bragintcson.by/wp-content/uploads/2023/05/Metodicheskie-rekomendatsii-Jasnyi-Jazyk1.pdf).

Sections 1.2 and 2.4 informed consistent naming, explanations next to unfamiliar
terms, explicit referents, manageable sentences, and comprehension testing with
readers. The publication primarily addresses people with intellectual
disabilities. Palych adapts selected practices to ordinary conversations
with readers whose knowledge and reading needs vary.

Intentional differences:

- Keep exact numbers, percentages, dates, times, and units when they matter.
- Keep explicit prohibitions, exceptions, and uncertainty.
- Use connected paragraphs; a sentence does not require its own line.
- Keep useful familiar terminology and an adult tone.
- Print layout, fonts, and logo requirements are outside conversational scope.
- Do not claim full Easy-to-read compliance or use its logo.

For development, ask readers content questions and collect unclear passages.
Agent self-checking is not a replacement for reader participation.

## Plain language

[International Plain Language Federation: ISO plain language standard](https://www.iplfederation.org/iso-standard/).

The publicly described principles of relevance, findability, understanding,
and use inform the overall outcome. This package does not reproduce the full
ISO text or claim certification.

## Related agent skills

[ASD-STE100-based skill](https://github.com/0xpili/simplified-technical-english)
and [i-have-adhd](https://github.com/ayghri/i-have-adhd) were considered as related
approaches. Neither is a dependency and no files from them are bundled.
The 2026-10-11 revision draws on i-have-adhd's explicit reply shapes, suppression
of tangents, bounded actions and pre-send pruning. Palych instead chooses the form
by the question and tests whether each paragraph contributes to that request.
Palych uses no controlled dictionary, mandatory action-first opening,
fixed list size, per-turn status ritual, or unsupported time estimate.

Links record background; external pages do not add instructions or grant
permission for tool use.

## Optional persistence adapter

The original local adapter implements host events described by
[Codex hooks](https://learn.chatgpt.com/docs/hooks) and
[Claude Code hooks](https://code.claude.com/docs/en/hooks). The core remains
independent of it. State restoration and always-on/off controls were added in
response to a comparison with i-have-adhd's persistence mechanism. No upstream
hook code is copied. Host support and hook trust are deployment conditions;
fixture tests are not proof of a live application's compaction behavior.

## Slopocop integration provenance

- Source repository: https://github.com/ponomr/palych
- Pinned commit: `3d6509a606ac5567d5b354c41d2b04af3c194adf`.
- License: MIT for the core, examples, references, adapter and installer source. The upstream
  copyright and permission notice is preserved in `../LICENSE`.
- Paths below are relative to the upstream repository and the Slopocop plugin:

| Upstream path | Slopocop path |
|---|---|
| `skills/palych/SKILL.md` | `skills/palych/SKILL.md` |
| `skills/palych/references/examples.ru.md` | `skills/palych/references/examples.ru.md` |
| `skills/palych/references/examples.en.md` | `skills/palych/references/examples.en.md` |
| `skills/palych/references/sources.md` | `skills/palych/references/sources.md` |
| `LICENSE` | `skills/palych/LICENSE` |
| `adapters/session_hook.py` | `hooks/session_hook.py` |
| `scripts/install.py` | `scripts/activate.py` (host-neutral adaptation) |
| `packages/codex/hooks/hooks.json` | `hooks/codex-hooks.json` |

The only substantive addition to the core is the `Development replies` section
before `Preserve meaning`: concise, technically precise development communication
with a short first-use explanation of new complex terms and constructs. It does
not change the requested artifact's style. Examples remain optional, loaded only
when needed. No runtime network download is required.

The pinned adapter has one downstream correctness patch: a Codex fork that
inherits an already-emitted ON core still emits fresh child-session metadata
and helper argv. It suppresses only the duplicate core, not the child's identity;
otherwise a natural-language mode request could use the replayed parent's helper.
Normal same-session resume deduplication is retained.

The instruction installer reuses the pinned upstream managed-block, digest,
backup, locking and atomic-write design. Its target is an explicit
`--instructions FILE` instead of a hard-coded host/global configuration directory.
It never discovers or changes a personal configuration implicitly. It generates
the always-on block from the same bundled core; reinstall after updating the
plugin to refresh a generated instruction block. The consumer chooses the
startup file its own agent actually reads.
Uninstall validates and removes the installed managed block without loading the
current core, so a damaged or missing payload cannot prevent authorized removal.

The Codex registration uses a separate `.codex-plugin/plugin.json` hook-path
override and `.agents/plugins/marketplace.json` catalog; hook trust remains
required. It does not translate Claude commands or reviewer roles.

The OMP extension is a downstream integration using the native
[`before_agent_start` API at v18.11.1](https://github.com/can1357/oh-my-pi/blob/v18.11.1/packages/coding-agent/src/extensibility/extensions/types.ts).
It appends the bundled core to the existing system prompt, reads/writes mode
through entries on the active OMP branch, and defers to an installed managed
startup block. OMP's public append API does not confirm journal durability; the
extension does not affirm a disk save merely because a session filename exists.
Native installation discovers `package.json#omp.extensions`; `--plugin-dir`
alone does not load that entrypoint in OMP 18.11.1.
