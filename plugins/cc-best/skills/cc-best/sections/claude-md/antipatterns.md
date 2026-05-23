# CLAUDE.md antipatterns — common mistakes

Each antipattern is named, described, diagnosed, and fixed. The order follows approximate frequency — most common failures first.

## Antipattern 1 — Wall of text without sections

**Symptom**: A single `##` block (or no blocks at all) containing everything from workflow rules to sprint history to forbidden commands, written as running prose.

**Why it fails**: CLAUDE.md loads in full every session. Claude Code's context window is finite. Dense, unsectioned prose forces the assistant to scan the entire file to answer even narrow questions ("what is the commit format?"). Structured sections let the assistant locate the relevant block quickly and cite it precisely.

**Fix**: Use `##` to separate major zones. At minimum: Metadata, Workflow, Forbidden, Version Tables, Sprint History. See `structure.md` for the recommended order.

---

## Antipattern 2 — Mixing languages without intent

**Symptom**: English rules interspersed with Russian phrases, or Russian rules with unexplained English technical terms.

**Why it fails**: When the file mixes languages randomly, the assistant mirrors that pattern in its replies. A project that sets a "reply in Russian" rule but writes half the CLAUDE.md in English will get replies that mix languages — exactly because the training signal (the CLAUDE.md itself) is mixed.

**Fix**: Pick one language for the file body and stick to it. The only legitimate exception is a communication-style section that illustrates the failure mode with intentional examples (see `structure.md` — Language rule). That exception must be clearly delimited, not scattered.

---

## Antipattern 3 — Stale TODO lists

**Symptom**: Bullet lists like "Should fix X before the next release" or "TODO: update this section" that have been sitting unchanged for multiple sprints.

**Why it fails**: Stale TODOs consume context budget every session without providing value. They also create false confidence — the assistant sees a TODO and may assume it is being actively tracked, when in fact it was forgotten months ago.

**Fix**: Either fix the item (it was worth tracking) or delete the TODO (it was not worth tracking). If it is genuinely blocked, file a GitHub issue or a forgeplan artifact and replace the inline TODO with a one-line reference: "see issue #312 for X". Do not let TODOs age in CLAUDE.md.

---

## Antipattern 4 — Duplicating content from README or docstrings

**Symptom**: CLAUDE.md reproduces paragraphs from the project README, copies code examples from docstrings, or re-states what is already written in `CONTRIBUTING.md`.

**Why it fails**: Duplication creates two sources of truth. When the original changes, CLAUDE.md does not — now it is wrong. The assistant may cite the CLAUDE.md version (which it sees every turn) over the correct README version.

**Fix**: Reference, do not reproduce. A one-line pointer is enough:

```markdown
## Contributing

Full guide: [CONTRIBUTING.md](CONTRIBUTING.md). Short form: branch → PR → CI pass → merge.
```

The CLAUDE.md line gives the assistant the gist (enough for most turns). The link goes to the authoritative source when detail is needed.

---

## Antipattern 5 — Unexplained internal codenames

**Symptom**: Rules written in methodology shorthand: "follow ML-12 before dispatch", "ADI required at Profile B gate", "FPF decompose before shaping".

**Why it fails**: Codenames are opaque to anyone who was not present when the term was coined. A new team member, a new session that lacks the mental model, or a cross-project context will all fail to apply the rule correctly because the meaning is not stated.

**Fix**: Spell out the meaning inline, with the codename as a parenthetical or footnote:

```markdown
## Before launching sub-agents

Verify the premise against the current codebase first (per ML-12 — the pattern
from Sprint U where a confident premise was refuted in 5 minutes by a direct test,
saving ~145k tokens). Only then dispatch agents.
```

If the codename is used frequently, define it once in a Glossary section and reference it by name after that.

---

## Antipattern 6 — Transient state instead of durable rules

**Symptom**: "Currently working on the authentication refactor", "Sprint X is in progress — don't touch `src/auth/`", "John is reviewing PR #298 this week".

**Why it fails**: Transient state becomes incorrect the moment the state changes — which is often before the next session. The assistant then operates on false context.

**Fix**: CLAUDE.md is for durable rules, not current state. Transient state belongs in:
- A GitHub issue or PR comment.
- A forgeplan NOTE artifact (sprint state).
- A conversation message in the current session.

If you genuinely need "do not touch this module" to persist, write it as a durable rule: "Module `src/auth/` is under active refactor — coordinate with the team before editing. See RFC-007."

---

## Antipattern 7 — No "what NOT to do" section

**Symptom**: CLAUDE.md lists only positive rules ("do X", "use Y format") but has no forbidden section.

**Why it fails**: Positive rules tell the assistant what to do when it knows what it is doing. Forbidden rules cover the failure cases — when the assistant is unsure and might default to the easiest or most familiar option (e.g., `git add .`, `git push origin main`). Without an explicit forbidden list, those defaults happen.

**Fix**: Add a Forbidden section (see Pattern 5 in `patterns.md`). Write it as an absolute list. The bar for inclusion is: "if the assistant did this by mistake, what is the worst case?" If the answer is "data loss, broken main branch, leaked secret" — it belongs in Forbidden.

---

## Antipattern 8 — No version or date on the file

**Symptom**: No "Last Updated" line. Sprint history sections with vague headers like "Recent changes" instead of "Sprint W 2026-05-22".

**Why it fails**: Without dates, neither you nor the assistant can determine if a rule is current. An instruction that made sense six months ago may be actively harmful today (e.g., referencing a workflow that was deprecated). The assistant has no way to detect staleness without temporal anchors.

**Fix**: Add "Last Updated" to the metadata block (see Pattern 2 in `patterns.md`). Date every sprint history section. If you edit a rule mid-file, update the "Last Updated" line — even a one-word fix warrants a date bump.

---

## Antipattern 9 — Using CLAUDE.md as a changelog

**Symptom**: Every small change gets a new dated section: "2026-05-22: Fixed typo in Forbidden section", "2026-05-21: Added plugin version", "2026-05-20: Clarified commit format".

**Why it fails**: Git history is the changelog. CLAUDE.md sprint sections should capture sprint-level decisions and anomalies — things that need context for future sessions. A log of minor edits provides no useful context and inflates the file size.

**Fix**: Use sprint-level summaries only. If you made 12 small edits during a sprint, summarise them in one sprint section: "Sprint T: updated plugin versions, clarified commit format, fixed 3 typos in Forbidden." The individual changes live in `git log`.

---

## Antipattern 10 — Rules without rationale for non-obvious constraints

**Symptom**: "Never use `git add -A`" with no explanation. "Always run the validation script before PR" with no explanation of what it checks.

**Why it fails**: The assistant can follow a rule it understands. A rule without rationale gets silently overridden when the assistant encounters a situation that "seems like an exception". Knowing WHY makes the boundary robust.

**Fix**: Add a one-phrase rationale for any non-obvious constraint:

```markdown
- `git add .` / `git add -A` — stage specific files only. (Avoids accidentally
  committing .env files, generated artifacts, or large binaries.)
```

Save the full explanation for docs or a forgeplan ADR. One phrase is enough to prevent the obvious workaround.

---

## Related

- `patterns.md` — the correct version of each antipattern above
- `structure.md` — file anatomy that prevents Antipattern 1 and 8
- `basics.md` — what belongs and does not belong (prevents Antipatterns 3, 4, 6)
- `examples.md` — annotated real examples showing antipatterns avoided
