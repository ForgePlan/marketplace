# Retrieval layers and memory — which question goes where

> [!IMPORTANT]
> **3.7.0 is project-only and default-off.** It requires explicit `.hindsight.json` banks and
> Hindsight API >=0.10.2 and <0.11.0. The initial pilot is minimal/read-only; auto hooks and write
> paths require separate authorization. See [`CONFIGURATION.md`](./CONFIGURATION.md).


A developer asks two kinds of question all day. **"Where is it?"** is answered by search, and which
kind of search depends entirely on what you already know about the thing. **"Why is it like that?"**
is answered by decisions and memory. Using the wrong layer is the failure mode, and it almost never
looks like a failure — it looks like an answer.

This document is the reference. `/fpl-hsmem:memory-setup` is the actionable version (what a given
project should install); the agent `memory-curator` carries the memory half as operating rules.

**Происхождение исторических измерений.** Источник — TypeScript-монорепозиторий `gerts-hub`,
2026-09-10, HEAD `94dec532f9e8828e8908f86c1d2421809daba504`, **dirty working copy**:
**117 строк `git status --porcelain=v1`**, а не чистый снимок коммита.
Это зафиксировано в EVID-264, `.forgeplan/evidence/EVID-264-adr-028.md` родительского workspace,
строки 229–244. `bash --noprofile --norc` означает чистую оболочку, не чистое рабочее дерево.
Отдельно **2,154 tracked paths** привязаны к коммиту командой
`git ls-tree -r --name-only 94dec532 | wc -l`; историческая сверка индекса — EVID-264:256–259.
Это размер tracked-дерева, не число файлов, просмотренных поисковиком.

В EVID-264:267–278 записаны команды `rg -l -F Moleculer .` и `tgrep -l -F Moleculer .`,
их результаты и лучшие времена из трёх запусков с Python-таймером; для AST —
`ast-grep run --pattern Moleculer --lang ts --json=compact .`.
Индекс `.tgrep/` тогда **не перестраивался** (EVID-264:306–307).
Полный dirty-снимок и точные версии инструментов в этом свидетельстве не сохранены;
один HEAD не позволяет воспроизвести его результаты поиска. Ниже — исторические наблюдения,
не новые замеры и не пороги. Число файлов «на диске» не используется:
оно зависит от рабочего дерева и не доказывает причину ускорения.

---

## The three layers of "why"

The neat version — "search answers where, memory answers why" — is wrong, and the error is
expensive. **ADRs, RFCs and PRDs are files in the repository.** They are found by the same search
tools, versioned alongside the code, and they outrank memory. Stating the boundary as two layers
sends an agent past a ratified written answer to go asking a layer with no clock and no provenance.

| Layer | Holds | Ask it |
|---|---|---|
| **Sources** | what won | never for "why" — the code cannot contain the reason |
| **Recorded decisions** — `.forgeplan/`, ADR / RFC / PRD, PR bodies, commit messages | reasons that got as far as "decided" | **first**, for any "why" |
| **Memory** — this plugin | the long tail: discussions that decided nothing, options rejected, lessons paid for | when no record exists; and for "what did we try that failed" |

**If memory answers a "why" and no artifact exists, that is a signal the decision should be written
down** — not that memory did the job.

---

## Size decides which layers are worth having

**The rule, before the numbers: the ordering below is general, the timings are not.** Every measured
figure in this document comes from **one repository on one machine on one day**. Read as thresholds
they will make a small project pay for machinery it does not need — an index to maintain, an
embedding model to run — for a saving that does not exist at its size. Read as what they are, they
tell you roughly where to look and what to measure yourself.

**Различайте единицы подсчёта.** `git ls-files | wc -l` считает tracked paths в индексе Git;
это ориентир размера проекта, а не охват `rg`. Обычный `rg` может искать в untracked-файлах,
но пропускает hidden-файлы и пути по действующим ignore-правилам, если флаги не задают иное.
`rg -l` выводит только файлы **с совпадениями**, не все просмотренные файлы.
Ни tracked-count, ни число совпавших файлов не измеряют объём исключённого дерева
и не устанавливают, какая часть выигрыша во времени связана с его исключением.

| Tracked files | Text search | Indexed search | Semantic search | Why |
|---|---|---|---|---|
| **under ~1,000** | plain `rg`, nothing else | **no** | **no** | a full scan is already instant; an index costs more to build and keep fresh than it can ever return |
| **~1,000 – 10,000** | plain `rg` | **probably not** — measure | only if questions are genuinely abstract | EVID-264:267–270: `gerts-hub`, 2026-09-10, HEAD `94dec532`, dirty working copy с 117 изменениями, literal `Moleculer`: `rg -l -F` **36.0 ms**, `tgrep -l -F` **39.1 ms**, лучшие из трёх запусков. 2,154 — tracked paths коммита, не число просмотренных файлов. В этом наблюдении индекс проиграл; вывод для других размеров требует своего замера |
| **~10,000 – 100,000** | `rg` for one-off scans | **measure before adopting** — this is where the crossover lives | worth considering | the honest answer is that we have no data point in this band. Anyone who tells you otherwise is quoting a vendor |
| **over ~100,000** | `rg` for a subdirectory | **likely yes** | likely yes | Историческое утверждение поставщика: 52× на 388,000 файлов, записано как НЕПРОВЕРЕННОЕ в EVID-264:299–300. Это повод измерить свой проект, не наш результат |

**The measurement that decides it**, on your own repository, in a clean shell — three runs, take the
best, warm cache, a literal that actually occurs:

```bash
time rg -l -F '<a literal in your code>' .
time <indexer> -l -F '<the same literal>' .     # after building its index
```

If the difference is under 2×, the index is not paying for itself: it has to be built, kept fresh
after every large pull, and remembered. **A stale index is worse than no index** — it answers with
false negatives that look exactly like an honest "not found" (see the anti-patterns below).

**Semantic search is not chosen by size.** It is chosen by the shape of your questions. If you can
usually name the thing you are looking for, an embedding pipeline is theatre; if you routinely ask
"where is X enforced" and cannot name X, it earns its place at any size above trivial.

**Memory is not chosen by file count either — it is chosen by session count.** A bank fills from
conversations, so a project that will run for two or three sessions never accumulates enough for
recall to be worth reading. Past a dozen sessions the arithmetic reverses: the cost of re-deciding
something already decided exceeds the cost of storing it.

---

## Which layer answers which question

First move **narrows**. Verification **confirms**. No layer is its own verification.

| The question | First move | Verify with |
|---|---|---|
| An exact literal, filename, error string | plain text search (`rg -F`) | open the file. If an *indexed* searcher returned nothing, repeat unindexed before believing it |
| The same, asked dozens of times on a large tree | indexed search (`tgrep -F`, ideally with its watch server running) | one unindexed pass on the candidate subset |
| Where a symbol is defined | LSP / Serena `find_symbol` | `rg -F` on the name — catches re-exports the language server did not surface |
| Who references a symbol | LSP / Serena `find_referencing_symbols` | AST search on the call shape, plus `rg -F` as a net for dynamic use: string keys, registries, config, templates |
| Rename a symbol | LSP rename | `rg -F` on the OLD name must return **zero**. It did not → the rename is incomplete |
| Every site of one syntactic shape | `ast-grep run -p '<pattern>'` | `ast-grep scan -r rule.yml` without `-U`, read the diff |
| A codemod by shape | `ast-grep scan -r rule.yml` → diff → `-U` | build + tests, then `rg` for survivors of the old shape |
| "Where is X *enforced*" — you cannot name the thing | semantic search, queried as a **noun phrase**, not a question | LSP references + `rg -F` on the candidates BEFORE reading whole files |
| "Why is it built this way" | recorded decisions (`rg` over `.forgeplan/`, `forgeplan_get`) | if the answer names code, re-check the code |
| "What did we try and reject" | memory only | nothing to verify against — the code does not contain it by definition |
| "What did we decide last Tuesday" | memory | if the decision has matured, it should have become an artifact |

**Discovery → verification → reading.** In that order. Skipping to reading is the read-read-read
cascade: ten files opened because the first search was the wrong kind.

---

## Anti-patterns, by symptom

Every one of these produces a **plausible answer**, not an error. That is what makes them expensive.

| Wrong pairing | How you recognise it |
|---|---|
| AST tool for a plain literal | **Уверенный маленький результат.** EVID-264:273–278, `gerts-hub`, 2026-09-10, HEAD `94dec532`, **dirty working copy с 117 изменениями**: `rg -l -F Moleculer .` — **192 файла с совпадениями**; `ast-grep run --pattern Moleculer --lang ts --json=compact .` — **4 совпадения в 2 файлах**. Отношение сопоставимых единиц — **192 / 2 = 96×**, не 192 / 4. Это наблюдение рабочего дерева, не чистого коммита. Симптом — неполный ответ, не задержка: AST-запрос ограничен TypeScript и не покрывает Markdown, JSON, YAML и другие форматы |
| Invalid AST pattern | **exit 0 and no matches** — indistinguishable from a correct search that found nothing. The pattern must be a parseable fragment of real code |
| AST tool for "is this variable shadowed" / "what type is this" | a confident match on the wrong binding. The tool documents that it has no scope analysis, no type information, no data-flow |
| Text search for "who uses this symbol" | hits in comments, strings, and on a same-named different thing; the rename that follows breaks sites you never saw |
| Semantic search for an exact identifier | Правдоподобные соседи выше определения в выдаче или самого определения нет; оценка сходства не доказывает точное совпадение |
| A verbose question given to semantic search | it honours every word and loses the intent; lifecycle files rank above the thing you meant. Query as a noun phrase |
| **Believing an empty result from a stale index** | the most expensive one. Trigram indexes give false NEGATIVES — a symbol added after the last build is not found, and the exit code is identical to an honest "no such thing". Reproduced live |
| Verifying with the same layer you searched with | the same snapshot, twice. A "confirmation" taken before the change |
| `grep -r` on a tree with vendored dependencies | Совпадения в чужом коде и иной охват поиска. Без точного запроса, состава рабочего дерева и одинаковых правил отбора файлов сравнение времени ничего не доказывает |
| Memory for "where is it" | a confident path. Easy failure: it no longer exists. Expensive failure: it still exists and the claim about it is stale — the coordinate checks out and confirms nothing |
| Code search for "why is it like this" | a rationale reverse-engineered from an implementation, which nobody actually reasoned from. Reopens a settled argument |
| Retain then immediately recall | the old statement comes back — extraction has not run. Pass `wait: true` |
| Correcting memory by editing a record's text | irreversible upstream, and the derived observations are dropped. Retire it and write the correction instead |

**When layers disagree, the code wins.**

---

## What the tools say about their own limits

A pattern worth knowing: **the closer a tool sits to semantics, the worse it documents its limits** —
while the cost of a wrong answer moves the other way. A text searcher's miss is obvious; an AST
tool's miss is a small number; a semantic searcher's miss is a plausible paragraph.

- **AST search** is the best-documented. It states plainly that it has no scope analysis, no type
  information, no control-flow or data-flow or taint analysis, and it points elsewhere for those.
  It also lists the three reasons a pattern silently fails to match.
- **Indexed text search** documents its shape but not its failure mode: built for repeated queries
  over large trees, little gained on one-off searches of small ones. Files above 64 MiB and binaries
  are skipped. The staleness behaviour above is not written down anywhere — it was measured.
- **Semantic code search** declares **no limits at all**. There is no "this is not a replacement for
  grep or a language server" anywhere in its material. That rule has to come from us.

---

## Two corrections to a widely-copied policy

A measured six-layer search policy exists in another project here and was the starting point for
this document. Two of its conclusions did not survive re-measurement, and both are the kind of error
that propagates because the document looks rigorous:

1. **Исторический замер не поддержал рекомендацию индекса для этого дерева.**
   EVID-264:249–254 фиксирует исходную рекомендацию; строки 267–270 — проверку:
   `gerts-hub`, 2026-09-10, HEAD `94dec532`, **dirty working copy с 117 изменениями**,
   literal `Moleculer`, `rg -l -F Moleculer .` — **36.0 ms**,
   `tgrep -l -F Moleculer .` — **39.1 ms**, лучшие из трёх запусков.
   Это одна историческая точка на существовавшем индексе, не универсальный выигрыш
   unindexed-поиска. Ранние тайминги без восстановимого контекста здесь не используются.
2. **Разный охват не устанавливает причину ускорения.** Число файлов с совпадениями
   у `grep`, `rg` или `tgrep` не равно числу просмотренных файлов и не измеряет вклад
   индекса. Respecting ignore-правил не означает «искать только tracked-файлы»:
   untracked-файлы тоже могут попасть в поиск.

   Пара `rg -l -F '<literal>' .` и `rg -uu -l -F '<literal>' .` меняет **два** условия:
   `-uu` отключает ignore-фильтрацию и включает hidden-файлы. Поэтому её разность нельзя
   приписать только `.gitignore`. Это также не обход «всего диска»: обработка бинарных файлов,
   symlink и другие ограничения поиска сохраняются.

   Для отдельной проверки ignore-фильтрации используйте один literal и одинаковый hidden-режим:

   ```bash
   literal='<a literal in your code>'
   rg --no-config --hidden             -l -F -- "$literal" .  # ignore-файлы действуют
   rg --no-config --hidden --no-ignore -l -F -- "$literal" .  # ignore-файлы отключены
   ```

   `--no-ignore` отключает **все** ignore-файлы, не только `.gitignore`; `--no-config`
   исключает пользовательский конфиг `rg`. Оба вывода — пути **с совпадениями**, не полный
   перечень просмотренных файлов. Это рецепт для своего дерева, не новый замер `gerts-hub`
   и не доказательство причины разницы во времени. Для вывода именно о `.gitignore` нужен
   отдельный контроль остальных ignore-источников и одинаковые правила отбора файлов.

Урок обобщается: **у измерения должны быть репозиторий, dirty/clean-состояние, точный запрос,
флаги, единицы и дата.** Отсутствующие данные надо назвать, а не заменять ссылкой на HEAD.

---

## Prior art — mostly absent, so write carefully

The problem statement is common ground: several vendors describe exactly the gap — that the reasons
for decisions live in PR descriptions, design documents and chat threads rather than in code, and
that an agent without that layer reads the code but not the intent. The staleness check is published
practice too: verify that a remembered path still exists before building on it.

What could **not** be found, in a deliberate search: a published routing discipline — which question
goes to which layer, and which layer verifies which. The academic work on agent memory is about the
memory's internals. The product answer is to merge code, discussion and decisions into one graph,
which dissolves the routing question rather than answering it.

So this table is ours. Not proof that nobody has written one, but nobody's turned up — which is a
reason to be careful with the wording rather than confident about it.
