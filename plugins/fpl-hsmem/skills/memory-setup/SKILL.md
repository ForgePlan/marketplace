---
name: memory-setup
description: |
  Look at a project and propose the retrieval and memory layers it should have — what to install,
  what each layer answers, and what it will never answer. The reason this exists: an agent that can
  only grep is slow in a way nobody notices, and an agent with no memory re-learns the same lesson
  every session. Both are invisible from inside a single conversation.
  EN: Inspect a repository and recommend a stack — search layers (LSP, indexed text, AST, semantic)
  and memory layers (a Hindsight bank, knowledge pages, formal decision records). Says what each is
  worth on THIS repo, in this order, and shows the commands. Never installs anything silently.
  NOT the wiring of an already-chosen bank — that is /fpl-hsmem:bootstrap.
  RU: Осмотреть репозиторий и предложить набор — слои поиска (LSP, индексированный текст, AST,
  семантика) и слои памяти (банк Hindsight, страницы знаний, формальные решения). Говорит, чего
  каждый слой стоит именно на ЭТОМ репозитории, в каком порядке ставить, и показывает команды.
  Ничего не ставит молча. НЕ настройка уже выбранного банка — это /fpl-hsmem:bootstrap.
  Triggers: "set up this project properly", "what should I install", "make development faster here",
  "memory setup", "what tools does this repo need", "how do I search this codebase",
  "настрой проект как надо", "что поставить", "чтобы разработка шла быстрее", "настройка памяти",
  "какие инструменты нужны репозиторию", "как искать по этой кодовой базе"
hindsight-tools: [memory_get_current_bank, memory_status, bank_config_get, mental_model_list, document_list]
extra-tools: [Bash, Read, Glob, Grep]
allowed-tools: mcp__hindsight__memory_get_current_bank, mcp__plugin_fpl-hsmem_hindsight__memory_get_current_bank, mcp__hindsight__memory_status, mcp__plugin_fpl-hsmem_hindsight__memory_status, mcp__hindsight__bank_config_get, mcp__plugin_fpl-hsmem_hindsight__bank_config_get, mcp__hindsight__mental_model_list, mcp__plugin_fpl-hsmem_hindsight__mental_model_list, mcp__hindsight__document_list, mcp__plugin_fpl-hsmem_hindsight__document_list, Bash, Read, Glob, Grep
---

# Set a project up so it can be worked on

## Model tier

**This skill asks for tier B.**

The measurements are mechanical; the recommendation is not. Proposing a heavy
layer for a repository that does not need it wastes real money and setup time,
and omitting one on a repository that does costs an hour of grep per week
forever. The judgement is proportionality, and the oracle — repository size,
language, how often the same question recurs — is available but has to be read.

`model:` values like `opus` / `sonnet` / `haiku` are Claude Code names, not the
requirement. On another runtime substitute whatever serves tier B there, and
when you cannot tell, miss **upward**.

---

## The idea in one paragraph

There are two different questions a developer asks all day, and no single tool
answers both. **"Where is it in the code?"** is answered by search — and which
kind of search depends entirely on what you already know about the thing you
are looking for. **"Why is it like that?"** is answered by memory — and code
search cannot answer it at all, because the repository shows what won and never
shows what lost. A project set up well has a layer for each, and knows which one
to reach for.

## Step 1 — measure the repository, do not guess about it

```bash
# size and shape
git ls-files 2>/dev/null | wc -l                     # tracked files
git ls-files 2>/dev/null | sed 's/.*\.//' | sort | uniq -c | sort -rn | head -8
du -sh .git 2>/dev/null                              # history weight
git log --oneline 2>/dev/null | wc -l                # how much history exists to mine

# what is already installed
command -v rg ast-grep tgrep chunkhound 2>/dev/null
ls .tgrep .chunkhound.json 2>/dev/null

# what memory is already wired
grep -rln HINDSIGHT_BANK_ID .mcp.json .claude/settings.json .claude/settings.local.json 2>/dev/null
ls .forgeplan forge docs/adr 2>/dev/null
```

Then read the memory side through the relay:

```
memory_get_current_bank      # is there a bank, and did anyone choose it
memory_status                # size, and whether masking is on
bank_config_get              # privacy posture before you propose filling it further
```

**Report what you found before proposing anything.** A recommendation that does
not name the repository's actual size and language reads as a template, and the
user is right to distrust it.

## Step 2 — the search layers, in the order they earn their place

Each row says what it answers and what it cannot. Propose a layer only when the
measurement in Step 1 supports it; say plainly when one is not worth it here.

| Layer | Answers | Worth it when | Not worth it when |
|---|---|---|---|
| **LSP** (definition / references / rename) | where a symbol is *actually* used | there is a typed language and a language server. Always first for an exact name — text tools miss re-exports and shadowing, and silently break renames | no language server exists for the stack |
| **Indexed text search** (`tgrep` or equivalent) | where a literal appears, fast, repeatedly | repo-wide searches are frequent and the tree is large. An index turns seconds into milliseconds and the difference compounds over a session | small tree, or one-shot searches — the index build costs more than it saves |
| **`ripgrep`** | where a literal appears, right now | one-shot scans of a subdirectory; no index to keep fresh | repeated repo-wide queries — an index wins there |
| **AST search** (`ast-grep`) | where a *shape* appears; safe codemods | you refactor patterns rather than strings, e.g. "every `throw new Error(...)` call site". Survives renaming and reformatting | plain literal search — it has no regex and no index, and using it there is just slower grep |
| **Semantic code search** (e.g. ChunkHound) | where an *intent* is implemented | you routinely ask questions you cannot name — "where is tenant isolation enforced". Needs an embedding model and an index | the query is exact. Running an embedding pipeline to find `PaymentRepository` is theatre |

**The order matters more than the list.** Discovery first (semantic for abstract
questions, indexed search or LSP for concrete ones), then verification (LSP
references, AST, literal search) on the small candidate set. The failure this
prevents is the read-read-read cascade: opening ten files because the first
search was the wrong kind.

**Say the anti-pattern out loud when you propose the stack**, because each wrong
pairing has a distinct symptom:

- AST tool used for a literal → slow, and misses matches inside strings and comments.
- Text search used for a rename → callsites silently left behind; the build passes and production does not.
- Semantic search used for an exact identifier → plausible neighbours ranked above the exact hit.
- Any search used to answer "why" → a confident answer assembled from code that cannot contain the reason.

## Step 3 — the memory layers

| Layer | Holds | Propose when |
|---|---|---|
| **A Hindsight bank** | conversational knowledge: decisions made in chat, things tried and rejected, lessons | the project will run across more than a few sessions. Below that, the bank never fills enough to be worth reading |
| **Auto-hooks** (recall before each prompt, retain after each response) | the corpus itself, without anyone remembering to save | almost always, once a bank exists — this is what makes memory happen instead of being intended |
| **Knowledge pages** (mental models) | a standing answer to a recurring question, rebuilt from memories | you can name a question that gets asked and re-researched repeatedly. Two or three, not ten |
| **Formal decision records** (`.forgeplan/`, ADR/RFC/PRD files) | ratified decisions, with authority | a decision needs to outrank memory. These are the source of truth; memory is what surrounds them |

**And the boundary rule, stated to the user as part of the proposal:** memory
answers *why*, search answers *where*, and neither substitutes for the other. A
memory that names a file is a lead, not a fact — files move, and memory is a
snapshot of a past conversation.

## Step 4 — privacy, before you propose filling anything

Read `bank_config_get` and report three fields plainly:

- **`memory_defense`** — `null` means no secret masking. Anything pasted into a
  session is stored verbatim.
- **`store_document_text`** — `true` means whole raw transcripts are kept, not
  just extracted facts.
- **`audit_log_enabled`** — `false` means there is no record of who read what,
  so "no evidence of access" is not available as a reassurance.

**State the asymmetry.** Turning masking on changes future writes only; it
cleans nothing already stored. This is the one thing worth saying before a bank
starts filling, and it is worth nothing said after.

## Step 5 — propose, in order, with commands

Output a short numbered plan. For each item: what it gives, what it costs, and
the exact command. Then stop and let the user choose.

```
For this repo (1,674 files, TypeScript, 3,200 commits, no index, no bank):

1. Indexed text search      — repo-wide search goes from seconds to milliseconds
                              cost: one binary + an index refreshed on pull
                              → brew install <indexer> && <indexer> index .

2. AST search + codemods    — pattern-shaped refactors across 1,674 files without sed
                              cost: one binary
                              → brew install ast-grep

3. A memory bank            — decisions stop being re-litigated every session
                              cost: a server, and everything said gets stored
                              → /fpl-hsmem:bootstrap
                              ⚠ masking is off on this deployment: raw transcripts are
                                stored verbatim. Decide that before turning it on.

4. Semantic code search     — NOT recommended here: your questions in this repo have
                              been exact names, which LSP answers in two keystrokes.
                              Revisit when you start asking "where is X enforced".
```

**Never run the installs.** This skill proposes; the user installs. A setup step
that ran without being asked is indistinguishable from a bug, and the user is
the one who pays for the model, the disk and the leaked transcript.

## Hard rules

1. **Measure before recommending.** No proposal without the file count, the
   language, and what is already installed.
2. **Recommend against, out loud.** A layer that is not worth it here is a
   finding, not a silence. Saying "not this one, because…" is what makes the
   rest of the list credible.
3. **Never install, never write config.** Propose commands; the user runs them.
4. **Name the privacy state before proposing a bank**, not after.
5. **Never propose two things that do the same job.** Two indexed searchers, or
   two memory relays, is not redundancy — it is a split corpus and a stale one
   of the pair. This exact failure has happened here: one project wrote to three
   banks at once because two servers and a hook each resolved the name
   differently.
6. **If the project already has a bank, say who chose it.** `bank_id_source:
   derived-from-directory` means nobody did, and renaming the directory will
   move the memory silently.
