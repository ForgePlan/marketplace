# Process from Idea to Delivery - ForgePlan System Reference

> **This is a normative document.** It describes how the system **must** work from the first line of an idea to a commit on the main branch. It is used as:
>
> 1. **Course material** - for people new to the ecosystem
> 2. **Audit reference** - the real implementation is checked against this document; discrepancies are counted as technical debt
> 3. **Template for creation** - when new artifact types or new methodologies are added, they fit into this scheme
>
> **Version**: 1.2 (2026-05-28)
> **Author**: collective knowledge, formatted as course material
> **Status**: reference.

---

## Contents

1. [Why this whole machine is needed](#1-why-this-whole-machine-is-needed)
2. [Five canonical agent roles](#2-five-canonical-agent-roles)
3. [Methodologies - which one and when](#3-methodologies---which-one-and-when)
4. [Flow from idea to delivery](#4-flow-from-idea-to-delivery)
5. [Quality defender - adversarial review](#5-quality-defender---adversarial-review)
6. [Guardian - final master gate](#6-guardian---final-master-gate)
7. [Checks through forgeplan](#7-checks-through-forgeplan)
8. [Four-layer pipeline S10-S13](#8-four-layer-pipeline-s10-s13)
9. [Reinforcement discipline - four rules](#9-reinforcement-discipline---four-rules)
10. [What does not work automatically](#10-what-does-not-work-automatically)
11. [Smith - choosing a methodology for the task](#11-smith---choosing-a-methodology-for-the-task)
12. [Glossary and abbreviations](#12-glossary-and-abbreviations)

---

## 1. Why this whole machine is needed

When one person writes code for themselves, no methodology is needed. When a team of five builds a product over 2 years, you need something that prevents anyone (including the AI assistant) from quietly cutting a corner and then discovering a month later that the foundation is crooked.

The machine solves three problems.

**First problem - confidence without verification.** The AI assistant writes confidently. Artifacts look finished until a third party reads them and finds a gap. Without a structural defender, such gaps accumulate +25-41% complexity (per MSR 2026 data). This is not an assistant malfunction; this is a property of machine text generation.

**Second problem - blurring of role boundaries.** One person in the role of architect can switch to the role of programmer at any moment, and vice versa. The longer the session, the more switches, the harder it is to trace who made what decision and why. In the machine, roles are separated **physically**: each role is a separate agent, each has its own set of allowed tools, and switching is impossible.

**Third problem - loss of context between sessions.** A week later, no one remembers why that particular database was chosen. Artifacts (PRD, RFC, ADR, EVID, NOTE) are the memory between sessions. The machine forces you to write them before writing code.

The machine consists of four entities:

- **Artifacts** (PRD, RFC, ADR, EVID, NOTE, EPIC, PROBLEM, SOLUTION, SPEC, REFRESH) - record decisions and verifications
- **Agents** (five canonical roles) - perform work in isolated contexts
- **Methodologies** (BMAD, FPF ADI, SPARC, RIPER-5 and others) - define how exactly to approach the task
- **Quality gates** (forge-cycle, guardian, methodology-check, forgeplan checks) - prevent skipping steps

Below, in detail about each entity and how they connect into one process.

---

## 2. Five canonical agent roles

Every agent in the system belongs to one of five roles. The role defines **what an agent is allowed and what is forbidden** at the tool level - through a denylist in its frontmatter (`disallowedTools`). This is the most reliable protection: even if an agent mistakenly wants to do something outside its role, the tool physically will not be invoked.

### Summary table - CRUD-R-A matrix

```
+--------------+-------------------------+----------------------------+-----------------------------+
| Role         | What it does            | What is forbidden          | Typical output              |
+--------------+-------------------------+----------------------------+-----------------------------+
| Profile A    | Creates new artifacts   | Write, Edit, NotebookEdit, | Artifact in draft status    |
| Creator      | through MCP             | forgeplan_activate         | (PRD, RFC, ADR, NOTE...)    |
+--------------+-------------------------+----------------------------+-----------------------------+
| Profile B    | Adversarially reviews   | All artifact mutations,    | EVID with verdict           |
| Reviewer     | an existing artifact    | activate, reason, claims,  | PASS / CONCERNS / BLOCKER   |
|              |                         | memory_retain              | + ## Findings (>=1 finding) |
+--------------+-------------------------+----------------------------+-----------------------------+
| Profile C    | Researches and gathers  | ALL mutations (Write, Edit | Structured synthesis to     |
| Read-only    | context                 | Bash, forgeplan_*)         | the orchestrator (no files) |
+--------------+-------------------------+----------------------------+-----------------------------+
| Profile      | Writes source code      | All forgeplan mutations    | Changes in files            |
| C-coder      |                         | (new, update, link, ...)   | + git commit in the         |
|              |                         |                            |   worktree                  |
+--------------+-------------------------+----------------------------+-----------------------------+
| Profile D    | Fixes an existing       | forgeplan_new, Write,      | Updated artifact            |
| Maintainer   | artifact in-place       | Edit, activate, reason     | (same ID, modified body)    |
+--------------+-------------------------+----------------------------+-----------------------------+
```

Now, each role in detail.

### 2.1 Profile A - Creator

**Task**: create a new artifact. One role, many specialized variants - one per artifact type.

**What characterizes it**:
- Uses `forgeplan_new` or `forgeplan_generate` through MCP
- Does not write files directly (`Write`, `Edit`, `NotebookEdit` are forbidden)
- Does not activate its own artifact (`forgeplan_activate` is forbidden) - that is the orchestrator's job
- Before creation, must call `forgeplan_reason` - structured reasoning through the FPF ADI cycle, produces at least 3 hypotheses
- Leaves the artifact in `draft` status; from there, a Profile B reviewer takes it

**Who belongs** (seven specialized agents):

| Agent | What it creates | When invoked |
|---|---|---|
| `brief-intake` | Brief NOTE | The very first step - turns a raw idea into a structured artifact |
| `specification` | PRD or SPEC | After Brief - forms requirements with measurable acceptance criteria |
| `architecture` | RFC | After PRD - one RFC per PRD |
| `goal-planner` | EPIC + decomposition into several RFCs | When a large PRD needs splitting into parallel RFCs |
| `adr-architect` | ADR | When an architectural decision must be recorded |
| `artifact-author` | Any artifact via `forgeplan_generate` | Universal creator when no specialist exists (PROBLEM, SOLUTION, REFRESH) |
| `discover` (brownfield-pack) | NOTE / ADR from 7-phase discovery | Onboarding a legacy codebase via MCP tools |

**Hard rules of Profile A**:

1. Never writes files - only MCP calls
2. Before finalizing an artifact, the ADI cycle is mandatory (at least 3 hypotheses)
3. Never activates the created artifact - it stays in `draft` status
4. Every claim in the artifact body is tagged with an identifier (for the audit trail)

### 2.2 Profile B - Reviewer

**Task**: read a finished artifact, find problems, write a report as an EVID. Does not edit the artifact itself - only records findings.

**What characterizes it**:
- Denylist includes: `Write`, `Edit`, `NotebookEdit`, `forgeplan_activate`, `forgeplan_reason`, `forgeplan_claims`, `memory_retain`
- Creates EVID through `forgeplan_new(kind="evidence", parent_id=...)` - `informs` link to the parent
- Mandatory `## Findings` section in EVID body with at least one finding
- Verdict: PASS / CONCERNS / BLOCKER

**Who belongs** (eight specialized agents):

| Agent | What it reviews / gathers | What it looks for / does |
|---|---|---|
| `code-reviewer` | Code diff | Bugs, style violations, duplication, broken edge cases |
| `security-expert` | Code or artifact for security | STRIDE / OWASP Top 10 / CWE categories |
| `tester` | Test suite (runs via `Bash`) | pass / fail / skipped / flaky + coverage delta |
| `architect-reviewer` | RFC against parent PRD | Module boundaries, blast radius, compliance gaps |
| `system-dev` | RFC against the system as a whole | Long-term maintainability, 6+ month operational risks |
| `artifact-reviewer` | Any artifact for health | Schema completeness, link graph, freshness |
| `evidence-recorder` | Any external results (logs, measurements, manual QA) | Turns raw input into a canonical EVID. Fallback when no specialized reviewer exists |
| `evidence-gatherer` | Active evidence collection for Trust Calculus | Searches 20-30 sources, scores reliability, synthesizes EVID with F+G+R |

**Hard rules of Profile B**:

1. Never edits what it reviews
2. Empty `## Findings` means CONCERNS (rerun)
3. A single-line "no issues" is not adversarial enough. You need an explanation of what exactly was checked and why no gap was found (at least 2 sentences)
4. Works in an **isolated context** - does not see the main conversation or the author's discussions

> Note: `evidence-gatherer` is a Profile B variant (research + EVID) with a different denylist: blocks Write/Edit/NotebookEdit + forgeplan_activate/supersede/deprecate/delete, but (unlike the others) allows forgeplan_reason and memory_retain - these are needed for collecting Trust Calculus evidence.

### 2.3 Profile B-orchestrator (smith) - strategic planner

A special sub-profile. Does not review a specific artifact, does not create an EVID. Reads **broad project state** and returns a plan - which methodology to apply and who to dispatch next.

**Who belongs**: only `smith` (one for the whole ecosystem - that is enough).

**What characterizes it**:
- Denylist same as Profile B, plus all forgeplan mutations (`new`, `update`, `link`, ...)
- Does not write files, does not dispatch agents itself - returns a plan as Markdown
- Input: snapshot of project state (`forgeplan_health`, `git status`, `memory_recall`)
- Output: a plan with exactly one selected context out of 12 + an agent dispatch sequence

### 2.4 Profile B-gate (guardian) - final gate

Also a sub-profile of Profile B, but with a special role. Does not look for new problems (specialists do that), but **weighs already found ones** and renders a binary verdict before artifact activation.

**Who belongs**: only `guardian`.

**What characterizes it**:
- Reads the artifact itself + the ENTIRE EVID chain (from all prior reviewers)
- Unlike other Profile B agents, guardian's denylist does NOT contain `forgeplan_activate`. Non-activation is enforced not by the denylist but by the whitelist and strict agent body rules (the tool is simply not granted). Guardian writes the verdict instruction into an EVID; the orchestrator activates (PASS = orchestrator MAY activate).
- Verdict: PASS (orchestrator may activate) / CONCERNS (dispatch a fixer and re-review) / BLOCKER (pipeline halt)

### 2.5 Profile C - Read-only

**Task**: gather context from internal and external sources and pass it to the orchestrator. Persists nothing.

**Who belongs**: `research-analyst`.

**What characterizes it**:
- Denylist forbids ALL mutations (including `Write`, `Edit`, `Bash`, any `forgeplan_*`)
- May use `WebFetch`, `WebSearch`, `Read`, `Grep`, MCP reads
- Returns a structured synthesis - the orchestrator decides what to do with it

### 2.6 Profile C-coder - the only one with the right to write code

**The most important role from the discipline standpoint** - this is the only agent in the whole ecosystem allowed to `Write`, `Edit`, `Bash` on source files.

**Who belongs**: only `agents-core:coder`.

**What characterizes it**:
- Denylist forbids ALL forgeplan mutations (`new`, `update`, `link`, `activate`, ...)
- Receives an already-activated RFC via MCP as input
- Works in `isolation: worktree` - a separate git worktree, so parallel coders do not step on each other
- Limit: `maxTurns: 50`
- When finished, writes "ALL CHECKS PASS" and **hands control back to the orchestrator**, which then dispatches a Profile B reviewer

**Why exactly one**: the split between "who writes the artifact" and "who writes the code" guarantees that code does not outpace documentation. The PRD author physically cannot silently write code that is not described in the PRD. The coder physically cannot silently create an ADR.

### 2.7 Profile D - Maintainer

**Task**: fix metadata or body of an already-existing artifact **without creating a new one**. For example - fix congruence_level, repair a broken link, change status from `draft` to `deprecated`.

**Who belongs**: `artifact-maintainer`.

**What characterizes it**:
- Denylist forbids `forgeplan_new` (does not create new ones), `Write`, `Edit`, `forgeplan_activate`, `forgeplan_reason`
- Uses `forgeplan_update` and `forgeplan_link` on existing artifacts
- Last-resort fallback - if a kind specialist exists, use that one instead of Profile D

---

## 3. Methodologies - which one and when

The agent's role says **what it is allowed to do**. The methodology says **how exactly to approach the task**. One role can map to several methodologies - for example, the `specification` agent applies BMAD for PRDs, while `adr-architect` applies FPF ADI for ADRs. Both are Profile A.

### 3.1 BMAD - four phases from idea to PRD

**When applied**: creating a new PRD. This is the Specification phase methodology - turning a raw idea into a formal requirements document.

> Note: BMAD is expanded here into four teaching phases (Brainstorm -> Modeling -> Architecting -> Delivery) for clarity. The canonical BMAD-METHOD definition is a multi-role framework: Analyst -> PM -> Architect -> Dev -> QA. See github.com/bmad-code-org/BMAD-METHOD.

**Four phases**:

```
+------------------+    +------------------+    +------------------+    +------------------+
| B - Brainstorm   |--->| M - Modeling     |--->| A - Architecting |--->| D - Delivery     |
|                  |    |                  |    |                  |    |                  |
| Expanding the    |    | Structuring the  |    | Picking one      |    | Final artifacts: |
| solution space   |    | chosen direction |    | option from those|    | PRD with 13      |
|                  |    |                  |    | that passed M    |    | sections         |
|                  |    |                  |    |                  |    |                  |
| At least 3       |    | User stories,    |    | Trade-offs,      |    | + test plan      |
| hypotheses via   |    | data model,      |    | risks, decision  |    | + migration plan |
| FPF ADI          |    | state machine,   |    | recorded         |    | + deployment     |
|                  |    | edge cases       |    |                  |    |   checklist      |
+------------------+    +------------------+    +------------------+    +------------------+
```

**Analogy**: an architect of a residential building. First the brief with the client (who will live there, budget). Then the concept (floors, kitchen, load-bearing walls). Then materials selection (reinforced concrete or glued laminated timber). Only then the working drawings for the builders. Skip any phase and you get a house without a foundation or a kitchen without a window.

**Thirteen mandatory PRD sections**:

1. Context
2. Problem
3. Goals
4. **Non-Goals** - critical, engineers reflexively skip this
5. Success metrics
6. Target users
7. User stories
8. Acceptance criteria
9. Technical requirements
10. Risks
11. Dependencies
12. **Open Questions** - critical
13. Timeline

Three critical sections - **Non-Goals, Open Questions, Risks** - are the ones without which the project "forgets" edge cases and falls over in production.

**Example of Non-Goals** for a "Tags in notes" feature:

```markdown
## Non-Goals
- DO NOT support tag hierarchy (parent / child) in MVP
- DO NOT do colors and icons for tags
- DO NOT sync tags between devices
- DO NOT integrate with external systems (Notion, Obsidian)
```

Four lines, but these are exactly what saves you from scope creep.

### 3.2 FPF ADI - three hypotheses before a decision

**When applied**: any significant decision. Mandatory when creating an ADR. Also inside BMAD at the Brainstorming phase.

**FPF** = First Principles Framework (a frame for reasoning from first principles), **ADI** = Abduction -> Deduction -> Induction (Charles Peirce's reasoning cycle).

**Three steps**:

```
+----------------------------------------------------------------------+
| Abduction - generating hypotheses                                    |
|                                                                      |
| Formulate at least 3 hypotheses, each claiming to be the solution.   |
| The third one must be "do nothing / scope reduction".                |
|                                                                      |
| Why exactly 3:                                                       |
|   1 hypothesis  = not a hypothesis, it's a predetermined answer      |
|   2 hypotheses  = false dichotomy, both framed by the same author    |
|   3+ hypotheses = one can challenge the premise of the other two     |
+----------------------------------------------------------------------+
                                |
                                v
+----------------------------------------------------------------------+
| Deduction - predicting consequences                                  |
|                                                                      |
| For each hypothesis - what is the outcome if it is true.             |
| What will be measured, what will break, what gains, what it costs.   |
+----------------------------------------------------------------------+
                                |
                                v
+----------------------------------------------------------------------+
| Induction - verification via evidence                                |
|                                                                      |
| What data we have (measurements, documentation, historical experience)|
| that confirms or refutes the predictions of each hypothesis.         |
|                                                                      |
| If there is no data - dispatch evidence-gatherer to collect.         |
+----------------------------------------------------------------------+
                                |
                                v
                       Pick one hypothesis
                       + justification why
                       + record in an EVID
```

**Technically** this is done through the MCP call `forgeplan_reason <ARTIFACT-ID>`. It returns a structured set of hypotheses. The agent reviews, picks, and records in a new EVID linked to the parent artifact.

**Hard rule (Sprint Z7, PRD-059)**: for every Standard+ artifact (PRD/RFC/ADR), at least one EVID with at least 3 `### Hypothesis N` sections in the body is **mandatory**. Without it, guardian issues a BLOCKER.

### 3.3 SPARC - five phases for technical implementation

**When applied**: implementing a feature in an existing service. This is the methodology for the "new feature" context (row 3 of the smith matrix).

**Five phases**:

```
+------------------------------------------------------------------------+
|                                                                        |
|   S - Specification    Refining requirements from PRD to a level       |
|                        sufficient for implementation                   |
|        |                                                               |
|        v                                                               |
|   P - Pseudocode       Algorithm sketches + complexity analysis        |
|                        (Big-O time + memory) BEFORE writing code       |
|        |                                                               |
|        v                                                               |
|   A - Architecture     Modules, contracts, data flow,                  |
|                        function signatures (RFC document)              |
|        |                                                               |
|        v                                                               |
|   R - Refinement       TDD red-green-refactor cycle:                   |
|                        failing test -> minimal implementation          |
|                        -> refactor                                     |
|        |                                                               |
|        v                                                               |
|   C - Completion       Polish: error handling, edge cases,             |
|                        performance tuning                              |
|                                                                        |
+------------------------------------------------------------------------+
```

Phase S (requirements refinement) - the `specification` agent (Profile A, also produces PRDs). Phase P (pseudocode + Big-O) - a separate sub-agent `pseudocode` (not forgeplan-aware). Phase A (modules, contracts) - the `architecture` agent (Profile A), outputting an RFC. The last two (R+C) are done by `coder` (Profile C-coder; optionally sub-agent `refinement`) - outputting code.

**Between phases** - mandatory quality gates. After each phase, a Profile B reviewer checks the result.

### 3.4 RIPER-5 - five phases for a production bug

**When applied**: non-trivial production bug (row 4 of the smith matrix). Does NOT apply to trivial hotfixes (typo in a log line) - those go the direct route without methodology (row 5).

**Five phases**:

```
+----------------------------------------------------------------------+
|  R - Research        Gather facts. Logs, stack traces, recent        |
|                      commits, reproducibility.                       |
|                      Agents `debugger` and `error-detective`         |
|                      (Profile C, read-only) gather facts ->          |
|                      `research-analyst` (Profile A) formalizes the   |
|                      RIPER Research mode via 5 Whys.                 |
|        |                                                             |
|        v                                                             |
|  I - Innovate        At least 3 root-cause hypotheses via 5 Whys.    |
|        |                                                             |
|        v                                                             |
|  P - Plan            Which checks to run to pick a hypothesis.       |
|        |                                                             |
|        v                                                             |
|  E - Execute         Minimal fix + regression test.                  |
|                      Agent `coder` of Profile C-coder.               |
|        |                                                             |
|        v                                                             |
|  R - Review          Blameless post-mortem (separate NOTE).          |
+----------------------------------------------------------------------+
```

**5 Whys** is a technique inside the Innovate phase, not a separate methodology. You ask "why?" five times, starting from the observed symptom, until you reach a cause deep enough that you can fix it permanently.

**Blameless post-mortem** is a mandatory artifact after fixing a production bug. Not "who is to blame", but "what condition allowed this to happen". The goal is to prevent the class of bugs, not punish a person.

### 3.5 Strangler Fig + DDD + ACL - for legacy

**When applied**: modernizing an old system (row 2 of the smith matrix). For example - rewriting a monolith into microservices, migrating from one DB to another, replacing an outdated framework.

**Strangler Fig** (by analogy with the strangler fig tree, which wraps around an old tree until it rots away): new code grows **around** the old, routing gradually switches over, the old code dies piece by piece. Never done as a "rewrite everything at once".

**DDD** (Domain-Driven Design): first the **bounded context** is described - where exactly the new code's boundary lies. Without this, Strangler Fig turns into mush.

**ACL** (Anti-Corruption Layer): a layer between new and old code that translates data models. So that the old "rot" does not seep into the new code.

**Special agent**: `discover` (in the `forgeplan-brownfield-pack` plugin) - a 7-phase legacy-codebase discovery procedure via MCP tools.

### 3.6 OWASP / STRIDE - for security audit

**When applied**: security audit (row 8 of the smith matrix), as well as scattered through all other rows when sensitive areas are touched.

**OWASP Top 10** - the ten most common classes of web-application vulnerabilities, updated every 3-4 years.

**STRIDE** - Microsoft's threat model:
- **S**poofing - identity impersonation
- **T**ampering - data tampering
- **R**epudiation - denial of action (no audit trail)
- **I**nformation Disclosure - data leak
- **D**enial of Service - service denial
- **E**levation of Privilege - privilege escalation

**Agent**: `security-expert` (Profile B). Categorizes findings by STRIDE / OWASP / CWE.

### 3.7 Other methodologies in the smith matrix

Full list - in section [11. Smith - choosing a methodology for the task](#11-smith---choosing-a-methodology-for-the-task).

---

## 4. Flow from idea to delivery

This is the core of the document. It shows how an idea moves through the whole system - from a Slack message to a commit on the main branch.

### 4.0 Complete map of artifact kinds

Forgeplan supports **ten artifact kinds**, each with its own directory in `.forgeplan/` and its own lifecycle. Do not confuse with the five agent roles - these are **different entities**: role = agent function, kind = artifact type.

#### Summary table of all kinds

```
+------------+--------------+---------------------+----------------------+--------------------------+
| Kind       | Directory    | Profile A (creates) | Profile B (reviews)  | Purpose                  |
+------------+--------------+---------------------+----------------------+--------------------------+
| note       | notes/       | brief-intake        | artifact-reviewer    | Free-form notes -        |
|            |              | artifact-author     | (optional)           | Brief, deferred items,   |
|            |              |                     |                      | post-mortems, research   |
+------------+--------------+---------------------+----------------------+--------------------------+
| problem    | problems/    | artifact-author     | artifact-reviewer    | Formal record of a       |
|            |              |                     |                      | problem (what is broken  |
|            |              |                     |                      | and why)                 |
+------------+--------------+---------------------+----------------------+--------------------------+
| solution   | solutions/   | artifact-author     | artifact-reviewer    | Proposal for solving     |
|            |              |                     |                      | a specific PROBLEM       |
+------------+--------------+---------------------+----------------------+--------------------------+
| prd        | prds/        | specification       | artifact-reviewer +  | Product requirements     |
|            |              |                     | architect-reviewer   | (13 sections, BMAD out)  |
+------------+--------------+---------------------+----------------------+--------------------------+
| spec       | specs/       | specification       | artifact-reviewer    | Narrow technical         |
|            |              | artifact-author     |                      | specification (file      |
|            |              |                     |                      | format, protocol, API)   |
+------------+--------------+---------------------+----------------------+--------------------------+
| rfc        | rfcs/        | architecture        | architect-reviewer + | Technical implementation |
|            |              | goal-planner        | system-dev           | plan (SPARC S+P+A)       |
+------------+--------------+---------------------+----------------------+--------------------------+
| adr        | adrs/        | adr-architect       | artifact-reviewer    | Architectural decision   |
|            |              |                     | (+ security-expert)  | (MADR 3.0, FPF ADI)      |
+------------+--------------+---------------------+----------------------+--------------------------+
| epic       | epics/       | goal-planner        | architect-reviewer   | Multi-sprint initiative, |
|            |              |                     |                      | parent to several PRDs   |
+------------+--------------+---------------------+----------------------+--------------------------+
| evidence   | evidence/    | (any Profile B)     | (not self-reviewed - | Evidence artifact -      |
|            |              | code-reviewer,      | guardian weighs)     | output of a Profile B    |
|            |              | tester, security-   |                      | reviewer with a verdict  |
|            |              | expert, and so on   |                      |                          |
+------------+--------------+---------------------+----------------------+--------------------------+
| refresh    | refresh/     | artifact-author     | artifact-reviewer    | Update of outdated       |
|            |              | artifact-maintainer |                      | knowledge without a      |
|            |              |                     |                      | full replacement         |
+------------+--------------+---------------------+----------------------+--------------------------+
```

> Note: PROBLEM/SOLUTION/SPEC/REFRESH are supported kinds but are currently almost unused in this project (PROB-001 deprecated; solution/spec/refresh are empty). Their flows are normative, not battle-tested in practice.

#### Auxiliary directories (not artifacts in the strict sense)

In `.forgeplan/`, besides artifacts, there are auxiliary directories:

| Directory | Purpose |
|---|---|
| `claims/` | File claims - which agent holds a claim on which file (prevents conflicts in parallel worktrees) |
| `discovery/` | Intermediate results of the 7-phase `discover` agent |
| `findings/` | Standalone findings (for integration with external trackers) |
| `research/` | Raw results of research-analyst before they become NOTE/EVID |
| `lance/` | Internal forgeplan storage (vector index, cache) |
| `memory/` | Local forgeplan memory (separate from Hindsight MCP) |
| `state/` | Session state (`session.yaml`, `gh-project.yaml`, checkpoints) |
| `trash/` | Soft delete - artifacts removed via `forgeplan_delete`, recoverable via `forgeplan_restore` |
| `logs/`, `anomalies-journal.jsonl` | Operational logs and anomalies journal |

The directory structure **mirrors** the kinds API: one `.md` file per artifact, filename = canonical ID.

#### Links between artifact kinds

Artifacts are linked through `forgeplan_link`. Exactly 5 relation types are valid: `informs`, `based_on`, `supersedes`, `contradicts`, `refines`. Solid arrows `--rel-->` are real graph links; double arrows `==>` are conceptual transitions, NOT graph links.

```
RFC ---based_on---> PRD ---based_on---> EPIC
 |                   |                   |
 | implemented      informs           informs
 v via (==>)         |                   |
Code (worktree,      EVID                EVID
NOT a graph node)

SOLUTION ---based_on---> PROBLEM
   |                        ^
 informs                   (SOLUTION may also --based_on--> PRD/ADR)
   v
 EVID

ADR (active) ---supersedes---> ADR (new active)
                                + delta ADDED/MODIFIED/REMOVED/UNCHANGED

NOTE (Brief) ---based_on---> PRD
NOTE (research) ---informs---> PRD / RFC / ADR
NOTE (post-mortem) ---informs---> the parent fix
NOTE (deferred items): items live as rows in the NOTE-013 body, not as graph links
REFRESH ---informs---> the outdated parent
```

Per-kind flow in detail follows in the next sections.

---

### 4.1 From raw idea to Brief

**Input**: a single line from a person. "I want to add tags to notes." "Need auth via Google." "PDF export is slow, need to speed it up."

**What happens**:

```
+------------------------------------------------------+
| Person: "I want tags in notes"                       |
+------------------------------------------------------+
                          |
                          v
+------------------------------------------------------+
| Orchestrator: dispatches `brief-intake` (Profile A)  |
| Passes the raw thought verbatim                      |
+------------------------------------------------------+
                          |
                          v
+------------------------------------------------------+
| brief-intake in its context:                         |
|   1. Structures the idea (what / why / for whom)     |
|   2. Calls forgeplan_reason - surfaces hidden        |
|      assumptions of the author ("one-level tags or   |
|      hierarchy?", "need sync?")                      |
|   3. Creates Brief NOTE via forgeplan_new            |
|   4. Returns the artifact ID to the orchestrator     |
+------------------------------------------------------+
                          |
                          v
                  Brief NOTE in draft status
                  (has not yet gone through the PRD process)
```

**Why this step is needed**: so the original thought is not lost. Three weeks later, when the PRD has been rewritten 4 times, the Brief remains the point of reference.

### 4.2 From Brief to PRD (BMAD methodology)

**Input**: Brief NOTE in `active` status.

**What happens**:

```
+------------------------------------------------------+
| Orchestrator: dispatches `specification` (Profile A) |
| Passes: Brief NOTE ID + any additional context       |
+------------------------------------------------------+
                          |
                          v
+------------------------------------------------------+
| specification agent walks BMAD four phases:          |
|                                                      |
|  --- B - Brainstorming ----------------------------  |
|  forgeplan_reason -> at least 3 implementation       |
|  options (free strings / separate table / hierarchy) |
|                                                      |
|  --- M - Modeling ---------------------------------  |
|  Chosen direction -> user stories,                   |
|  data model, edge cases                              |
|                                                      |
|  --- A - Architecting -----------------------------  |
|  Trade-offs, risks, decision recorded                |
|                                                      |
|  --- D - Delivery ---------------------------------  |
|  Fills the 13 mandatory PRD sections                 |
|                                                      |
| Creates PRD draft via forgeplan_new                  |
| Links to Brief NOTE with `based_on` relation         |
+------------------------------------------------------+
                          |
                          v
                 PRD draft (draft status, not yet active)
                          |
                          v
+------------------------------------------------------+
| Adversarial review (Profile B reviewers)             |
|                                                      |
| In parallel, in isolated contexts:                   |
|   - artifact-reviewer    - health, schema, links     |
|   - architect-reviewer   - compliance, consequences  |
|                                                      |
| Each creates an EVID with ## Findings (>=1 item)     |
| Links to PRD with `informs` relation                 |
+------------------------------------------------------+
                          |
                          v
              Feedback loop (see Pattern A / Pattern B below)
                          |
                          v
+------------------------------------------------------+
| Guardian (Profile B-gate)                            |
|                                                      |
| Reads PRD + all EVIDs + R_eff score                  |
| Checks the 4 layers (S10 ADI / S11 Findings / ...)   |
| Verdict: PASS / CONCERNS / BLOCKER                   |
+------------------------------------------------------+
                          |
                          v
           If PASS -> orchestrator -> forgeplan_activate
              If CONCERNS -> rerun specification
                 If BLOCKER -> back to BMAD
```

**Result**: an active PRD, ready to be decomposed into RFCs.

### 4.3 From PRD to RFC (SPARC methodology, phases S+P+A)

**Input**: active PRD.

**What happens**:

```
+------------------------------------------------------+
| Orchestrator:                                        |
|   If one PRD -> one RFC -> dispatch `architecture`   |
|   If decomposition needed -> dispatch `goal-planner` |
|   (lays PRD into a DAG of N RFCs via GOAP)           |
+------------------------------------------------------+
                          |
                          v
+------------------------------------------------------+
| architecture agent walks SPARC first three phases:   |
|                                                      |
|  --- S - Specification ----------------------------  |
|  Additional refinement of requirements from PRD      |
|                                                      |
|  --- P - Pseudocode -------------------------------  |
|  Algorithm sketches + Big-O analysis                 |
|  (usually done by sub-agent agents-sparc:pseudocode) |
|                                                      |
|  --- A - Architecture -----------------------------  |
|  Modules, contracts, data flow, signatures           |
|                                                      |
| FPF ADI is mandatory - at least 3 architectural opts |
| Creates RFC draft via forgeplan_new                  |
| Links to PRD with `based_on` relation                |
+------------------------------------------------------+
                          |
                          v
                  RFC draft
                          |
                          v
+------------------------------------------------------+
| Adversarial review (Profile B):                      |
|   - architect-reviewer - RFC vs PRD compliance       |
|   - system-dev         - system view, blast radius   |
|                          over 6+ months              |
|                                                      |
| Each creates an EVID with findings                   |
+------------------------------------------------------+
                          |
                          v
          Feedback loop -> Guardian -> activation
```

**Result**: an active RFC, ready for implementation in code.

### 4.4 From RFC to code (SPARC methodology, phases R+C)

**Input**: active RFC.

**What happens**:

```
+------------------------------------------------------+
| Orchestrator: dispatches `coder` (Profile C-coder)   |
|                                                      |
| Creates an isolated git worktree                     |
| Passes: RFC ID + list of affected files              |
+------------------------------------------------------+
                          |
                          v
+------------------------------------------------------+
| coder in its worktree:                               |
|                                                      |
|  --- R - Refinement (TDD red-green-refactor) -----   |
|  1. Writes a failing test                            |
|  2. Minimal implementation to make it pass           |
|  3. Refactor for clarity                             |
|  Repeats the cycle for each acceptance criterion     |
|                                                      |
|  --- C - Completion -------------------------------  |
|  Error handling, edge cases, performance             |
|  tuning                                              |
|                                                      |
| At the end: "ALL CHECKS PASS" + returns to orch.     |
+------------------------------------------------------+
                          |
                          v
                  Code in the worktree
                          |
                          v
+------------------------------------------------------+
| Adversarial review - three reviewers in parallel:    |
|   - code-reviewer    - bugs, style, duplication      |
|   - security-expert  - STRIDE/OWASP/CWE              |
|   - tester           - run tests, coverage           |
|                        delta                         |
|                                                      |
| Three separate EVIDs                                 |
+------------------------------------------------------+
                          |
                          v
              Feedback loop -> Guardian
                          |
                          v
              PASS -> worktree merge -> commit -> PR
```

**Hard rule**: only `coder` has the right to write code. If the orchestrator itself edits source via `Write`, this is a **CRUD-R-A discipline violation** (see section 9).

> In the canonical /forge-cycle path the R+C cycle is led by coder; in SPARC-orchestrated runs phase R may be taken by the sub-agent `agents-sparc:refinement`.

### 4.5 Architectural decision -> ADR (FPF ADI + MADR 3.0)

**When an ADR is needed**: one of three conditions (Sprint Z1 criteria):

- The decision affects 3 or more modules
- The decision **replaces an old one** (supersede)
- The decision is **irreversible** (e.g. choice of database, platform migration)

**What happens**:

```
+------------------------------------------------------+
| Architectural question:                              |
| "Which database to pick?" "How to split the service?"|
+------------------------------------------------------+
                          |
                          v
+------------------------------------------------------+
| Orchestrator: dispatches `adr-architect` (Profile A) |
+------------------------------------------------------+
                          |
                          v
+------------------------------------------------------+
| adr-architect walks the FPF ADI cycle:               |
|                                                      |
|  Abduction: forgeplan_reason -> at least 3 options   |
|             (one must be "do nothing")               |
|                                                      |
|  Deduction: for each - what outcome, cost,           |
|             what will be measured, what breaks       |
|                                                      |
|  Induction: measurements, documentation,             |
|             historical experience                    |
|                                                      |
| If 3 or more modules affected:                       |
|   Step 5b.1 - dispatch `c4-diagram` skill            |
|   -> produces C4 L1 + L2 diagrams in Mermaid         |
|                                                      |
| If replacing an old ADR:                             |
|   Uses adr-supersede.md template                     |
|   Fills 4 delta sections:                            |
|     ADDED / MODIFIED / REMOVED / UNCHANGED           |
|   If REMOVED > 50% - flagged "this is not a replace, |
|   it's a new artifact, write a separate ADR"         |
|                                                      |
| Creates ADR draft in MADR 3.0 format                 |
+------------------------------------------------------+
                          |
                          v
+------------------------------------------------------+
| Adversarial review:                                  |
|   - artifact-reviewer (always)                       |
|   - security-expert (if security-critical)           |
|   - architect-reviewer (if touches architecture)     |
+------------------------------------------------------+
                          |
                          v
              Guardian -> PASS -> activation
                          |
                          v
                Old ADR -> status superseded
```

### 4.6 Production bug -> fix (RIPER-5 methodology)

**Input**: a complaint about a production bug. "Export doesn't work for the client." "API is slow." "Crashes in 5% of cases on large files."

**What happens**:

```
+------------------------------------------------------+
| Orchestrator classifies the bug:                     |
|   Trivial (typo)   -> row 5 -> direct                |
|                                fix                   |
|   Non-trivial      -> row 4 -> RIPER-5               |
+------------------------------------------------------+
                          |
                          v
+------------------------------------------------------+
| R - Research                                         |
| Dispatch `debugger` (Profile C, first - confirms     |
| reproducibility) -> `error-detective` (Profile C -   |
| log/metric/deploy correlation) -> `research-analyst` |
| (Profile A - 5 Whys from symptom to root cause; this |
| is the formalized RIPER-5 Research mode).            |
| Each creates a NOTE.                                 |
+------------------------------------------------------+
                          |
                          v
+------------------------------------------------------+
| I - Innovate                                         |
| Orchestrator + (if architectural root cause)         |
| `adr-architect` (Profile A) formulates and picks     |
| the fix hypothesis.                                  |
| Creates an EVID with hypotheses                      |
+------------------------------------------------------+
                          |
                          v
+------------------------------------------------------+
| P - Plan                                             |
| Orchestrator: which checks to perform to             |
| confirm or refute each hypothesis                    |
+------------------------------------------------------+
                          |
                          v
+------------------------------------------------------+
| E - Execute                                          |
| Dispatch `coder` (Profile C-coder):                  |
|   - Minimal fix                                      |
|   - Regression test (fails without the fix,         |
|     passes with the fix)                             |
+------------------------------------------------------+
                          |
                          v
+------------------------------------------------------+
| R - Review                                           |
| - code-reviewer + tester on the fix                  |
| - Blameless post-mortem (separate NOTE):             |
|   - what condition allowed this to happen            |
|   - what to change so the class of bugs no longer    |
|     arises (not this bug, but the whole class)       |
+------------------------------------------------------+
                          |
                          v
                  Guardian -> commit -> PR
```

### 4.7 PROBLEM -> SOLUTION - a separate pair

**When applied**: when you need to record **a problem separately** from its solution. For example: "we have unpredictably growing tail latency" is a PROBLEM. Solution(s) may appear later, may be several alternatives, may require separate PRDs.

PROBLEM is **not** PRD. PROBLEM describes what is wrong. PRD describes what we will build. The split is needed when:

- The solution is not obvious and the problem must first be formalized
- One problem produces several potential solutions (several SOLUTION candidates)
- The problem is found, but no resources to solve it now (PROBLEM active, SOLUTION not yet)

**What happens**:

```
+------------------------------------------------------+
| Observed problem                                     |
| ("users' plugins do not update",                     |
|  "clients lose notes when offline")                  |
+------------------------------------------------------+
                          |
                          v
+------------------------------------------------------+
| Orchestrator: dispatches `artifact-author` (Profile A)|
| with kind="problem"                                  |
+------------------------------------------------------+
                          |
                          v
+------------------------------------------------------+
| artifact-author creates PROBLEM-NNN:                 |
|   - Symptoms (what is observed)                      |
|   - Context (when it happens, to whom)               |
|   - Reproducibility                                  |
|   - What is NOT known (open questions)               |
|   - Related artifacts                                |
| Via forgeplan_new(kind="problem")                    |
+------------------------------------------------------+
                          |
                          v
+------------------------------------------------------+
| Adversarial review via artifact-reviewer (Profile B) |
| Looks for: reproducibility proven? Symptoms separated|
| from causes? Open questions enumerated?              |
+------------------------------------------------------+
                          |
                          v
                Guardian -> PROBLEM activation
                          |
                          v
   Next - in a separate cycle - SOLUTIONs are born:
                          |
                          v
+------------------------------------------------------+
| For each SOLUTION:                                   |
| Orchestrator -> artifact-author with kind="solution" |
|   - One of the approaches to solve PROBLEM-NNN       |
|   - Trade-offs, cost, risks                          |
|   - Linked to PROBLEM with the `based_on` relation   |
+------------------------------------------------------+
                          |
                          v
              Review + Guardian -> SOLUTION activation
                          |
                          v
       Chosen SOLUTION -> link to PRD with `based_on`
                          |
                          v
            Next - standard flow PRD -> RFC -> Code
```

**Note**: SOLUTION is not equal to ADR. SOLUTION is "here is one of the options to solve". ADR is "here is the final architectural decision". Often a PROBLEM produces several SOLUTION candidates, and the discussion between them is finalized in an ADR.

### 4.8 EPIC - decomposing a multi-sprint initiative

**When applied**: when the work clearly does not fit into a single PRD. For example: "migration from MongoDB to PostgreSQL", "release of mobile app", "4-Layer Pipeline Enforcement" (like our EPIC-001).

**What happens**:

```
+------------------------------------------------------+
| Multi-sprint initiative                              |
| ("migrate from MongoDB to PostgreSQL")               |
+------------------------------------------------------+
                          |
                          v
+------------------------------------------------------+
| Orchestrator: dispatches `goal-planner` (Profile A)  |
| with large context + kind="epic"                     |
+------------------------------------------------------+
                          |
                          v
+------------------------------------------------------+
| goal-planner applies GOAP                            |
| (Goal-Oriented Action Planning + A* search):         |
|                                                      |
|  1. Defines the final state                          |
|     "all clients migrated, MongoDB decommissioned"   |
|                                                      |
|  2. Builds a DAG of intermediate states              |
|     ("schema created" -> "migration written" ->      |
|      "new clients write to PG" -> "old ones          |
|      migrated" -> "MongoDB read-only" ->             |
|      "MongoDB removed")                              |
|                                                      |
|  3. Each intermediate state = a separate PRD         |
|                                                      |
|  4. Creates EPIC via forgeplan_new(kind="epic")      |
|                                                      |
|  5. Creates N draft PRDs (one per DAG step)          |
|     Links each to EPIC with `based_on` relation      |
|                                                      |
|  6. Marks dependencies (PRD-2 blocked_by PRD-1)      |
+------------------------------------------------------+
                          |
                          v
+------------------------------------------------------+
| Adversarial review of EPIC via architect-reviewer    |
| Looks for: decomposition complete? DAG without cycles?|
| Parallel paths used where possible?                  |
+------------------------------------------------------+
                          |
                          v
              Guardian -> EPIC activation
                          |
                          v
       Each PRD goes through its standard flow:
       BMAD -> review -> Guardian -> activation -> RFC -> Code
                          |
                          v
       EPIC closes when **all** child PRDs are active
       and shipped to production
```

**EPIC lifecycle**:

- `draft` - DAG drawn, child PRDs not yet active
- `active` - at least one child PRD activated, work in progress
- `closed` - all child PRDs completed, EPIC done

**EPICs in our project** (as of 2026-05-28): three active:

- EPIC-001 - 4-Layer Pipeline Enforcement (Sprints Z6-Z10)
- EPIC-002 - smith master-orchestrator
- EPIC-003 - Sprint AA: methodology auto-enforcement gates

### 4.9 SPEC - narrow technical specification

**When applied**: for **narrow technical artifacts** - file format, message protocol, API schema, linter rule set. SPEC is not equal to PRD: PRD is product, SPEC is technical.

Examples of real SPECs:

- Canonical EVID body format (markdown bold-pattern)
- `session-checkpoint.yaml` schema
- `<<NEED_USER_INPUT>>` sentinel protocol
- Agent frontmatter structure

**What happens**:

```
+------------------------------------------------------+
| Technical need:                                      |
| "need a standard format for X"                       |
+------------------------------------------------------+
                          |
                          v
+------------------------------------------------------+
| Orchestrator: dispatches `specification` (Profile A) |
| with kind="spec" - or `artifact-author` as fallback  |
+------------------------------------------------------+
                          |
                          v
+------------------------------------------------------+
| specification creates SPEC-NNN:                      |
|   - Specification goal                               |
|   - Exact format (fields, types, required)          |
|   - Valid and invalid examples                       |
|   - Versioning                                       |
|   - Backward compatibility                           |
+------------------------------------------------------+
                          |
                          v
+------------------------------------------------------+
| Adversarial review via artifact-reviewer (Profile B) |
| Looks for: edge cases covered? Versioning explicit?  |
| Examples exhaustive?                                 |
+------------------------------------------------------+
                          |
                          v
              Guardian -> SPEC activation
                          |
                          v
         SPEC becomes a contract - all artifacts
         and code must follow it
```

### 4.10 NOTE - notes of different sub-kinds

NOTE is the most universal kind. Used when you need to record something structurally but it does not rise to the level of PRD/RFC/ADR. By purpose, sub-kinds are distinguished:

| NOTE sub-kind | Who creates | When | Example |
|---|---|---|---|
| **Brief** | `brief-intake` | Pipeline entry - raw idea -> structure | NOTE-001..018 in inbox |
| **Research results** | `research-analyst` (via orchestrator) | After broad research | NOTE-004 "Comparable systems research" |
| **Deferred items tracker** | orchestrator (one per project) | Each deferred item is one row | NOTE-013 - central deferred catalog |
| **Blameless post-mortem** | orchestrator after a bug fix | After RIPER-5 closure | "what condition allowed this to happen" |
| **Discovery findings** | `discover` agent (legacy) | Each phase of 7-phase discovery | NOTE-014..017 "discover-smoke-..." |
| **Sprint closure summary** | orchestrator at sprint end | After Sprint A-E, J-K, U-V | NOTE-007 "PRD-026 implementation closure" |
| **Roadmap / planning** | orchestrator for long-term plan | For future PRD chains | NOTE-003 "Skill expansion roadmap" |

**NOTE lifecycle**:

- Can be `active` (useful information) or `deprecated` (information is outdated)
- Can be an **orphan** (no links) - this is a signal for `/decay-watch`
- Can be a **stale draft** (29+ hours in `draft` without links) - also a signal

### 4.11 REFRESH - updating outdated knowledge

**When applied**: when an active artifact (PRD/RFC/ADR/SPEC) has a small discrepancy with reality and a **part of the information needs updating** without full replacement.

REFRESH is a compromise between "everything is fine" and "a new ADR with delta is needed":

- If the discrepancy is systemic and the decision is being reconsidered -> replacement via a new ADR
- If the discrepancy is factual (numbers, links, paths) -> REFRESH

**What happens**:

```
+------------------------------------------------------+
| Discovered: "PRD-049 says the hook is in             |
| /a/b/c, but we moved long ago to /x/y/z"             |
+------------------------------------------------------+
                          |
                          v
+------------------------------------------------------+
| Orchestrator: dispatches `artifact-author` (Profile A)|
| OR `artifact-maintainer` (Profile D - if in-place    |
| edit without a new artifact)                         |
+------------------------------------------------------+
                          |
                          v
+------------------------------------------------------+
| Creates REFRESH-NNN or edits existing                |
| Links to the parent artifact with the `informs`      |
| relation. Describes: what was updated,               |
| source of the edit, when discovered                  |
+------------------------------------------------------+
                          |
                          v
                  Review -> activation
```

REFRESH is a lightweight mechanism. Does not require an FPF ADI cycle (this is not a decision). Requires review only if the edit is substantial.

---

## 5. Quality defender - adversarial review

### 5.1 The principle of fresh eyes

The author does not see their own typos. This is a **physiological property of perception**, not a weakness of will. The same applies to AI assistants: the model defends its previous answer - not out of malice, but because of how attention is wired; fresh text is "more convincing" than an abstract rule "look for problems".

The solution is **adversarial review in a fresh context**. You open a clean session, give the role of a critic with an explicit instruction: find at least 3 problems, do not praise.

In our machine this is a **programmatic rule**: every Profile B reviewer is dispatched via the `Task` tool, which creates a **new isolated sub-agent context**. It does not see the main conversation, does not see the author's discussions, does not see why a particular decision was made. Only the artifact itself via `forgeplan_get`.

### 5.2 Context isolation as a hard rule

Every dispatch via `Task` = **a new clean session** at the model level:

- The whole main conversation is not passed - only the prompt formed by the orchestrator
- The sub-agent's frontmatter loads (its own instructions, denylist)
- After completion only the final result is returned

This solves exactly the problem BMAD talks about: "open a new clean session". Only programmatically - it is impossible to accidentally "peek" at the previous context.

### 5.3 Mandatory report sections

**Sprint Z6 BMAD discipline** (PRD-057) sets hard requirements for every Profile B EVID:

1. **At least 1 Profile B EVID is mandatory** for every Standard+ PRD/RFC/ADR before activation. Zero reviews = BLOCKER at the guardian gate.

2. **The EVID body must contain a `## Findings` section with at least one finding**. Zero findings = the reviewer was not adversarial enough.

3. **What to write when there really are no problems**: a single line "no findings" is **not enough** - it reads identically to "reviewer didn't look". You need at least 2 sentences explaining **what exactly was checked** and **why no gap was found**. Default expectation: at least 1 finding exists. Genuinely zero-gap artifacts are exceptional.

4. **Example of a good finding**:

```markdown
## Findings

1. **[Severity: HIGH]** AC-3 has no measurable threshold - "the system must
   respond quickly" is not measurable.
   Recommendation: replace with "The system responds within 200ms at p95 under
   1000 concurrent users".

2. **[Severity: MEDIUM]** Non-Goals does not state that cross-device sync is
   not supported - high risk that in Sprint 2 it will arise as
   "self-evident".

3. **[Severity: LOW]** The Risks section does not mention that data migration
   will require downtime - this must be explicitly recorded.
```

### 5.4 Two feedback loops

When the reviewer found problems, there are two reaction patterns. The choice depends on the **severity and number of findings**.

#### Pattern A - quick fix (short cycle)

Applied for LOW / MEDIUM findings from a single reviewer:

```
Profile A creates draft
                |
                v
Profile B reviewer -> EVID with findings (MEDIUM)
                |
                v
Orchestrator -> rerun Profile A with specific edits
                |
                v
Profile A -> fix -> new draft
                |
                v
Profile B reviewer (new context) -> EVID #2:
            "findings from EVID #1 resolved, no new ones"
                |
                v
Guardian -> PASS -> activation
```

Fast (2-3 turns in the dialogue), does not accumulate debt, the author immediately knows what was wrong.

#### Pattern B - gate with rework (long cycle)

Applied for HIGH / CRITICAL findings or when several reviewers found the same thing:

```
Profile A creates draft
                |
                v
Several Profile B reviewers (in parallel) -> EVID #1, #2, #3
                |
                v
Guardian reads ALL -> CONCERNS / BLOCKER
                |
                v
If CONCERNS: orchestrator -> dispatches a fixer (often the same
            Profile A with different instructions) -> new draft ->
            repeat review
                |
                v
If BLOCKER: pipeline halts, human decision required.
            Possibly - rework with a different methodology
            (e.g. revisit a row in the smith matrix)
```

Slower, but gives a **strategic view**: "three different reviewers found the same problem - this is not a bug in the PRD, this is a bug in the approach".

#### Selection rule

```
+--------------------+------------------------+---------------------+
| Severity of findings | Who decides          | Pattern             |
+--------------------+------------------------+---------------------+
| LOW (minor)        | Orchestrator alone     | A - quick fix       |
| MEDIUM (one, from  | Orchestrator alone     | A - quick fix       |
| one reviewer)      |                        |                     |
| HIGH (any)         | Guardian               | B - through the gate|
| CRITICAL           | Guardian + possibly    | B - mandatory       |
| or several         | a human via            | through the gate    |
| reviewers          | <<NEED_USER_INPUT>>    |                     |
| agree              |                        |                     |
+--------------------+------------------------+---------------------+
```

This logic is encoded as **3-tier resolution** (AUTO / ADI / USER) in the `mm-pipeline-anomalies` mental model.

---

## 6. Guardian - final master gate

Guardian is the **arbiter role**, the last step before activating any artifact. Does not look for new problems, but **weighs already found ones**.

### What Guardian does

```
+------------------------------------------------------+
| Input: ID of an artifact ready for activation        |
+------------------------------------------------------+
                          |
                          v
+------------------------------------------------------+
| Step 1. Read via MCP                                 |
|   - forgeplan_get(artifact_id) - the artifact itself |
|   - forgeplan_link graph - all relations and EVIDs   |
|   - forgeplan_score - current R_eff                  |
|   - forgeplan_health - surrounding state             |
|   - forgeplan_phase - lifecycle position             |
+------------------------------------------------------+
                          |
                          v
+------------------------------------------------------+
| Step 2. Check against the 4-layer checklist:         |
|                                                      |
|   S10 FPF:    EVID with at least 3                   |
|               ### Hypothesis sections ?              |
|                                                      |
|   S11 BMAD:   Profile B EVID with non-empty          |
|               ## Findings (at least 1 item) ?        |
|                                                      |
|   S12 OpenSpec: For replacement, is there a delta    |
|                 (ADDED/MODIFIED/REMOVED/UNCHANGED) ? |
|                 For 3+ modules, are C4 diagrams there?|
|                                                      |
|   S13 Forgeplan: Correct parent/child links ?        |
+------------------------------------------------------+
                          |
                          v
+------------------------------------------------------+
| Step 3. Verdict (binary):                            |
|                                                      |
|   PASS      -> orchestrator may call activate        |
|   CONCERNS  -> dispatch a fixer + re-review          |
|   BLOCKER   -> halt pipeline, artifact stays draft   |
+------------------------------------------------------+
```

### Important nuances

**Guardian does not activate** - `forgeplan_activate` is not granted to it (whitelist), not listed in its denylist. Guardian writes the verdict instruction into an EVID, the orchestrator activates.

**Guardian works in an isolated context** - has not seen discussions, has not seen how the author explained their decisions. Only the artifact and the EVID chain.

**Guardian is the last barrier**. If an artifact passed Guardian, it is considered ready for use by the rest of the system. This means Guardian takes responsibility for quality. Therefore if CONCERNS - the pipeline must obey, "bypass" is not allowed.

### When Guardian is not applicable

For **trivial tasks** (typos, variable rename, README update) Guardian is not dispatched. Trivial tasks go via row 5 of the smith matrix - direct fix without formal methodology. Dispatching Guardian for every typo is process overhead exceeding the cost of the fix.

---

## 7. Checks through forgeplan

Besides human and agent reviews, there are three **automatic** mechanisms from the forgeplan system. They work continuously, not only at gates.

### 7.1 R_eff - automatic score

**What it is**: a number from 0 to 1 measuring the "effective reliability" of an artifact.

**How it is computed**: weakest-link principle - `R_eff = min(linked evidence scores)`. Each piece of evidence has factors: **Formality** (how structured and conditional the claim is), **Granularity** (level of detail), **Reliability** (source reliability), plus a decay penalty for staleness. This is NOT an additive sum - it is the minimum across the chain: the chain is only as strong as its weakest link.

**Property**: computed **without invoking an AI**, purely by artifact graph structure. Cheap, reproducible, objective.

**Command**: `forgeplan_score <ARTIFACT-ID>`

Do not confuse with the additive F+G+R of the Trust Calculus (hypothesis-rating rubric used by `evidence-gatherer` / `adr-architect` / `/decision`) - there F is also **Formality**, and that is a separate mechanism, not `forgeplan_score`.

**Where to use**: periodically check R_eff of top-level PRDs. If a top PRD has low R_eff, this is a signal that either there is little evidence or what exists is weak.

### 7.2 FPF rules - background check

**What it is**: 5 rules that traverse the whole artifact graph and flag suspicious ones.

**Five default rules**:

```
+------------------+----------------------------------------------------+
| Rule             | What it catches                                    |
+------------------+----------------------------------------------------+
| blind-spot       | Artifact is active but a critical section is empty |
| weak-evidence    | EVID exists but R_eff is low                       |
| orphan-active    | Artifact is active but has no links (orphan)       |
| medium-quality   | Formal criteria not met                            |
| ready-to-build   | All dependencies active, can start                 |
+------------------+----------------------------------------------------+
```

**Command**: `forgeplan_fpf_rules`

**Where to use**: runs automatically inside `forgeplan_health`. Violations surface in `next_actions`.

### 7.3 `/methodology-check` - coverage across four layers

**What it is**: a read-only skill that for a single artifact shows coverage across all four pipeline layers (S10-S13) + C4 (if applicable).

**Returns**:

- Per-layer score: 0 (none), 1 (partial), 2 (full)
- Aggregate percentage
- Concrete action items per gap

**Command**: `/methodology-check <ARTIFACT-ID>`

**When to invoke**: **before every activation** of a Standard+ artifact as a final sanity check.

**Does not auto-fix** - only surfaces what is needed. This is a deliberate decision: auto-fix can silently break the author's intent.

**Example output**:

```
Methodology coverage for PRD-049
================================
S10 FPF ADI         : FULL    (2/2) - EVID-072 has 3 hypotheses
S11 BMAD review     : PARTIAL (1/2) - Findings present but only 1 item,
                                      Sprint Z6 expects >=2 sentences of
                                      justification on zero-gap claim
S12 OpenSpec        : MISSING (0/2) - no delta-spec for supersede
                                      operation linking to ADR-003
S13 Forgeplan       : FULL    (2/2)
C4 (>=3 modules)    : N/A - only 2 modules touched

Aggregate: 6/8 = 75% - ACTIVATION NOT RECOMMENDED

Action items:
1. Re-dispatch artifact-reviewer with mandate to expand Findings
2. Run /supersede ADR-003 to generate delta-spec
```

---

## 8. Four-layer pipeline S10-S13

This is the **mandatory filter** that every Standard+ artifact must pass before activation. Decoded:

```
+------------------------------------------------------------------------+
|                                                                        |
|  S10  FPF       Design - at least 3 hypotheses via ADI                 |
|  ---  ---       Enforced by: /forge-cycle Step 4.5 + guardian Step 5   |
|                 Without EVID with 3 ### Hypothesis sections = BLOCKER  |
|                                                                        |
|         |                                                              |
|         v                                                              |
|                                                                        |
|  S11  BMAD      Quality gate - Profile B review with at least 1 finding|
|  ---  ----      Enforced by: /forge-cycle Step 6.5 + guardian Step 5   |
|                 Without EVID with non-empty ## Findings = BLOCKER      |
|                                                                        |
|         |                                                              |
|         v                                                              |
|                                                                        |
|  S12  OpenSpec  Structure - DAG links + delta on supersede             |
|  ---  --------  Enforced by: adr-supersede template + /supersede +     |
|                 /decay-watch Step 2e                                   |
|                 Supersede after 2026-05-25 without delta = BLOCKER at  |
|                 guardian; pre-Z8 supersede without delta = CONCERNS    |
|                 (via /decay-watch). Missing parent/child links         |
|                 (orphan) is a separate S12 failure.                   |
|                                                                        |
|         |                                                              |
|         v                                                              |
|                                                                        |
|  S13  Forgeplan Automation - hooks + agents + skills + MCP             |
|  ---  --------- Enforced by: validate + score + activation gates       |
|                 Without proper wiring = technical debt                 |
|                                                                        |
+------------------------------------------------------------------------+
```

**Plus C4** (orthogonal layer) - auto-recommended for decisions touching 3+ modules via `adr-architect` Step 5b.1. This is not part of the main four-layer pipeline but a complement.

**Motivation**: MSR 2026 research showed that AI assistance **without structural controls** produces +25-41% code complexity. Each of the four layers closes one category of problems:

| Layer | Which AI failure mode it closes |
|---|---|
| S10 FPF | Confidence without alternatives - the model confidently proposes the first solution |
| S11 BMAD | Confident incompleteness - the artifact looks finished with a critical item missed |
| S12 OpenSpec | Loss of context on replacement - "we forget" what was changed and why |
| S13 Forgeplan | Un-synchronized wiring - code exists but hooks/tests/CI are not pulled in |

**Verification command**: `/methodology-check <ID>` (see section 7.3).

---

## 9. Reinforcement discipline - four rules

These four rules are the practical minimum for keeping discipline. Not a methodology, but **process hygiene**.

### Rule 1. `/methodology-check` before every activation

Before calling `forgeplan_activate` on a Standard+ artifact, run `/methodology-check <ID>` and make sure coverage is 100% across all applicable layers.

**Why**: this is a final read-only check. It will find gaps that you or the agents could have missed (e.g. forgot the delta on a supersede). Costs 5 seconds, saves hours of rework.

### Rule 2. `/forge-cycle` as the entry point for Standard+

For any task of Standard scale or higher - enter through `/forge-cycle`. This command **enforces** key steps:

- Step 4.5 - FPF ADI is mandatory
- Step 6.5 - BMAD adversarial review is mandatory

If done by hand, it is easy to cut a corner. Through `/forge-cycle`, corner-cutting is impossible.

**When NOT to apply**: trivial fixes (row 5 of the matrix). A typo in README should not go through a nine-step pipeline.

### Rule 3. For critical decisions - two different reviewers

On a critical artifact (e.g. PRD of a platform component, ADR of a database choice) dispatch **two different Profile B reviewers** in parallel. For example - `artifact-reviewer` + `architect-reviewer` on a PRD.

**Why**: if both independently found the same problem - this is a **high-reliability signal**. If only one found it - it may be their private opinion. A cheap way to raise sensitivity.

### Rule 4. Trust Pattern A (quick fix)

Most findings are LOW/MEDIUM. For them it is **cheaper** to rerun Profile A with specific edits than to go through Guardian. The Guardian gate is for serious cases.

**Signal that Pattern B is needed**: either a single HIGH-or-higher finding, or several reviewers agree. Then - through Guardian.

---

## 10. What does not work automatically

Despite the completeness of the scheme - there are **four places** where adversarial review is currently not enforced automatically. These are **deliberate gaps** (see CLAUDE.md section Sprint AA "Social-discipline boundaries"). They **cannot be closed by a parser** because the spoof signal is identical to the legitimate-short-work signal.

### Gap 1 - Brief NOTE (before PRD)

`brief-intake` creates a Brief, but **a mandatory Profile B review on the Brief does not exist**. The assumption is that PRD is already a Brief after adversarial review. In practice, if a PRD starts from a bad Brief, the problem surfaces only at the PRD review.

**What to do manually**: after creating a Brief - a short eyeball review or a quick dispatch of `artifact-reviewer` on the Brief itself.

### Gap 2 - hypothesis content in FPF ADI (Gap G7 from Sprint AA)

`forgeplan_reason` produces at least 3 hypotheses, but **picking one and the quality of its justification are not automatically checked**. Sprint Z7 (PRD-059) only checks structure: "are there at least 3 `### Hypothesis` sections?". Content - no.

**Why not parsed**: 3 stubs with empty bodies are indistinguishable by a parser from 3 short but genuine hypotheses. This is solved by social discipline - a Profile B reviewer must check manually.

### Gap 3 - stub in `## Findings` (Gap G6 from Sprint AA)

Similarly - an EVID with the body `## Findings\n1. nothing wrong` will pass the guardian gate (guardian Step 5 verdict matrix checks for a non-empty ## Findings). Sprint Z6 requires at least 2 sentences of justification when claiming zero gaps, but no automatic parser for "at least 2 sentences" exists.

**Why not parsed**: a short legitimate finding like "AC-3 is not measurable, needs a numeric threshold" is 2 sentences and a genuinely useful finding. Distinguishing it from a stub by a parser is not possible.

### Gap 4 - between waves in `/sprint` (organizational, not a parser issue)

In parallel waves via TeamCreate, EVIDs are gathered **at wave closure**, not after each agent. If 5 coders ran and 1 wrote bad code, adversarial review sees it only when all 5 finish.

**What to do**: for critical waves - dispatch a reviewer **inside the wave** on an intermediate merge, do not wait for closure.

### General pattern - when NOT to automate

All four gaps share a common structure:

1. Spoof is detectable structurally (section present/absent, item count)
2. But the spoof signal is identical to the legitimate-short-work signal
3. A parser gate either false-positives on legitimate work (eroding trust) or is so lax that the spoof passes anyway
4. Social discipline - visible reviewer identity, peer review, pattern recognition over time - is the right enforcement layer

This generalizes: **do not write parsers when the signal is semantic, not structural**. Trust the reviewer chain. Make their identity visible.

---

## 11. Smith - choosing a methodology for the task

When it is unclear which methodology to start with - `/smith`. This is the master-orchestrator that reads project state and returns a plan: which methodology to apply + dispatch sequence.

### Twelve matrix contexts

```
+----+-------------------------------+--------------------------------------+
| N  | Context                       | Primary methodology                  |
+----+-------------------------------+--------------------------------------+
|  1 | Empty repository              | BMAD (trimmed) + GitHub Spec Kit     |
|  2 | Legacy modernization          | Strangler Fig + DDD + ACL            |
|  3 | New feature in a service      | SPARC + Hexagonal Architecture       |
|  4 | Production bug (non-trivial)  | RIPER-5 + 5 Whys                     |
|  5 | Trivial hotfix                | Without formal methodology           |
|  6 | Refactoring                   | Branch-by-Abstraction + Mikado       |
|  7 | Architectural decision        | FPF ADI + ADR / MADR 3.0             |
|  8 | Security audit                | OWASP Top 10 2025 + STRIDE / ASTRIDE |
|  9 | Performance audit             | DORA + SRE error-budget + perf budget|
| 10 | Product discovery (PDLC)      | Jobs-To-Be-Done + Lean Startup       |
|    |                               | + Double Diamond                     |
| 11 | Tech-debt cleanup             | A3 + Fishbone + ADR-supersede        |
| 12 | Live production incident      | Incident Command System              |
|    |                               | + blameless post-mortem              |
+----+-------------------------------+--------------------------------------+
```

### Hard rules of smith

1. **Exactly one row is picked**. Mixing methodologies is forbidden - this produces artifacts that fit none and force the team to invent checklists from scratch.

2. **If the situation is on the boundary of two rows** - the primary rule on a genuine tie: emit `<<NEED_USER_INPUT>>` with >=3 hypotheses (FPF ADI) for the user to decide. Auto-picking the higher-risk row (legacy > empty, audit > feature) is an exception for autonomous mode (e.g. a blocking incident); the deviation is recorded in Notes.

3. **smith does not write code, does not activate artifacts**. Only returns a plan - the orchestrator decides what to do.

4. **smith dispatches nothing itself**. It writes "dispatch X" and returns the plan - dispatch happens in the main session after smith returns.

### When to invoke `/smith`

- At the start of a session when it is unclear what to do next
- On an empty repository (automatically routes into `/smith-bootstrap`)
- For a task of non-trivial scale
- When `/forge-cycle` or `/autorun` do not fit (e.g. a bug-fix flow with RIPER-5)
- Before launching a multi-sprint EPIC

### When NOT to invoke

- Trivial one-line fixes - process overhead exceeds fix cost
- Execution of a known dispatch - if you already know which agent to invoke, invoke directly
- Artifact activation - that is the orchestrator + guardian's job

### What smith returns

Markdown plan with **8 mandatory sections**:

```
1. Context type - one of the 12 rows
2. Methodology decision - primary + rationale
3. Dispatch sequence - numbered list of agents
4. Evidence requirements - checklist for the guardian gate
5. Risks - what could go wrong
6. Reversibility - how reversible the decision is
7. Notes - if the choice is on the boundary of two rows
8. Handoff - for the next session if work spans several days
```

---

## 12. Glossary and abbreviations

### Artifacts

- **PRD** (Product Requirements Document) - product requirements document, the primary artifact of the Specification phase. 13 mandatory sections.
- **RFC** (Request for Comments) - technical implementation proposal, child of a PRD.
- **ADR** (Architecture Decision Record) - architectural decision record in MADR 3.0 format.
- **EVID** (Evidence) - evidence artifact, output of a Profile B reviewer. Contains a verdict and `## Findings`.
- **NOTE** - free-form note (Brief, deferred items tracker, opinions).
- **EPIC** - large multi-sprint initiative, decomposed into N PRDs.
- **PROBLEM / SOLUTION** - pair of "problem and solution" artifacts, used when the solution is not obvious.
- **SPEC** - narrow technical specification (format, protocol, schema).
- **REFRESH** - update of outdated knowledge without full replacement.

### Methodologies

- **BMAD** (Brainstorming -> Modeling -> Architecting -> Delivery) - four-phase PRD-creation methodology (expanded in this document into 4 teaching phases; the canon is the multi-role Analyst->PM->Architect->Dev->QA framework).
- **FPF** (First Principles Framework) - frame of structured reasoning. Includes ADI as its primary cycle.
- **ADI** (Abduction -> Deduction -> Induction) - Charles Peirce's reasoning cycle. At least 3 hypotheses.
- **SPARC** (Specification -> Pseudocode -> Architecture -> Refinement -> Completion) - five-phase feature-implementation methodology.
- **RIPER-5** (Research -> Innovate -> Plan -> Execute -> Review) - five-phase production-bug-fix methodology.
- **Strangler Fig** - pattern of gradual legacy code replacement, by analogy with the strangler fig tree.
- **DDD** (Domain-Driven Design) - methodology of domain modeling with bounded contexts.
- **ACL** (Anti-Corruption Layer) - protective layer between new and old code.
- **OWASP** (Open Web Application Security Project) - web-vulnerability classification standard.
- **STRIDE** - Microsoft threat model (Spoofing/Tampering/Repudiation/InfoDisclosure/DoS/ElevationOfPrivilege).
- **MADR** (Markdown Architecture Decision Records) - format for recording ADRs in Markdown.

### Pipeline layers

- **S10 FPF** - design layer, requires ADI with at least 3 hypotheses.
- **S11 BMAD** - quality gate layer, requires Profile B review with at least 1 finding.
- **S12 OpenSpec** - structure layer, requires delta on supersede.
- **S13 Forgeplan** - automation layer, requires proper wiring of hooks/agents/skills/MCP.

### Agent roles (CRUD-R-A)

- **Profile A - Creator** - creates new artifacts via MCP.
- **Profile B - Reviewer** - reviews, creates EVIDs.
- **Profile B-orchestrator - Strategic planner** (smith) - plans, does not execute.
- **Profile B-gate - Final gate** (guardian) - final verdict.
- **Profile C - Read-only** - gathers context without persistence.
- **Profile C-coder** - the only one with the right to write code.
- **Profile D - Maintainer** - edits existing artifacts in-place.

### Other

- **MCP** (Model Context Protocol) - protocol for calling forgeplan/Hindsight tools from the assistant.
- **Hook** - bash script reacting to events (PreToolUse, PostToolUse, SessionStart, etc.).
- **Frontmatter** - YAML block at the start of an agent/skill file, defining metadata (name, description, denylist, ...).
- **Denylist** - list of forbidden tools in the frontmatter. Physical protection against role violation.
- **Sentinel** - service string like `<<NEED_USER_INPUT>>` or `<<NEEDS_ACTIVATION>>`, parsed by the orchestrator.
- **R_eff** - effective reliability, score 0..1, computed by the weakest-link principle (minimum across linked evidence scores); factors Formality/Granularity/Reliability + decay. Do not confuse with the additive F+G+R Trust Calculus.
- **Worktree** - isolated git branch for parallel work of Profile C-coder agents.

---

## Appendix A. Summary diagram - idea's path from Slack to production

```
                            +----------------------+
                            | Idea from a person   |
                            | (Slack / voice / ...)|
                            +-----------+----------+
                                        |
                                        v
                            +----------------------+
                            | brief-intake (A)     |
                            +-----------+----------+
                                        |
                                        v
                            +----------------------+
                            | Brief NOTE (draft)   |
                            +-----------+----------+
                                        |
                                        v
                       BMAD: Brainstorm -> Model -> Architect -> Deliver
                                        |
                                        v
                            +----------------------+
                            | specification (A)    |
                            +-----------+----------+
                                        |
                                        v
                            +----------------------+
                            | PRD (draft)          |
                            +-----------+----------+
                                        |
                                        v
                          adversarial review (B in parallel)
                                        |
                                        v
                            +----------------------+
                            | guardian (B-gate)    |
                            +-----------+----------+
                                        |
                                        v
                            +----------------------+
                            | PRD (active)         |
                            +-----------+----------+
                                        |
                                        v
                       SPARC S+P+A: architecture / goal-planner (A)
                                        |
                                        v
                            +----------------------+
                            | RFC (draft)          |
                            +-----------+----------+
                                        |
                                        v
                          adversarial review (B in parallel)
                                        |
                                        v
                            +----------------------+
                            | guardian (B-gate)    |
                            +-----------+----------+
                                        |
                                        v
                            +----------------------+
                            | RFC (active)         |
                            +-----------+----------+
                                        |
                                        v
                       SPARC R+C: coder (C-coder) in the worktree
                                        |
                                        v
                            +----------------------+
                            | Code in the worktree |
                            +-----------+----------+
                                        |
                                        v
                  code-reviewer + security-expert + tester (B)
                                        |
                                        v
                            +----------------------+
                            | guardian (B-gate)    |
                            +-----------+----------+
                                        |
                                        v
                            +----------------------+
                            | Worktree merge -> PR |
                            +-----------+----------+
                                        |
                                        v
                              CI green -> main
                                        |
                                        v
                            forgeplan_activate of all artifacts
```

## Appendix B. Pre-activation checklist for a Standard+ artifact

Before every `forgeplan_activate` for a Standard+ artifact, walk through:

```
- /methodology-check <ID> - coverage 100% across all applicable layers
- S10 FPF: EVID with at least 3 ### Hypothesis sections exists and is linked
- S11 BMAD: at least 1 Profile B EVID with non-empty ## Findings is linked
- S12 OpenSpec: if replacement - delta is filled (ADDED/MODIFIED/REMOVED/UNCHANGED)
- S12 OpenSpec: if 3+ modules - C4 L1+L2 diagrams created
- guardian (B-gate) gave PASS
- Artifact R_eff is acceptable (guideline: `artifact-reviewer` considers >=0.7 generally safe for activation; no hard threshold by depth - guardian relies on `quality_gates` from `.forgeplan/project-config.yaml`)
- No CONCERNS open on parent artifacts
```

If at least one item is not satisfied - **do not activate**. Return to the pipeline at the required step.

---

**End of document**.
