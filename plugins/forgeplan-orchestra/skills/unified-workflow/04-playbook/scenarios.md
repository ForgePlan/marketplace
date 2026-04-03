# Playbook: Daily Workflow Scenarios

## Task Lifecycle

### From Idea to Done

```
ROUTE -> SHAPE -> CODE -> EVIDENCE -> DONE
```

Detailed steps:

### 1. ROUTE

```bash
forgeplan route "task description"
# -> Depth: Standard, Pipeline: PRD -> RFC
# Orchestra: nothing yet
```

Determines the depth (Tactical/Standard/Deep/Critical) and the artifact pipeline.

### 2. CREATE (Forgeplan + Orchestra)

```bash
forgeplan new prd "Title"              # -> PRD-XXX created

# Orchestra:
create_entity: task "[PRD-XXX] Title"
set_fields: Artifact=PRD-XXX, Type=PRD, Depth=Standard
set_fields: Phase=Shape, Status=Backlog
```

### 3. SHAPE

Fill MUST sections (Problem, Goals, FR, Non-Goals, Related).

```bash
forgeplan validate PRD-XXX             # -> PASS
# Orchestra: Phase=Validate, Status=To Do
```

### 4. CODE

```bash
# Use /sprint or /wave for implementation
# Orchestra: Phase=Code, Status=Doing
# Orchestra: Branch=feat/xxx
# Orchestra: add Checklist with FR items from PRD
```

### 5. AUDIT + EVIDENCE

```bash
# /audit -> 5-agent review
forgeplan new evidence "Tests pass, N new tests, audit clean"
forgeplan link EVID-XXX PRD-XXX --relation informs
# Orchestra: Phase=Evidence, Status=Review
```

### 6. ACTIVATE

```bash
forgeplan review PRD-XXX               # -> PASSED
forgeplan activate PRD-XXX             # -> draft -> active
# Orchestra: Phase=Done, Status=Done
```

### 7. COMMIT + PR

```bash
git commit + git push + gh pr create
# Orchestra: Branch field updated
```

### Tactical Tasks (No Artifact)

```bash
forgeplan route "fix typo"             # -> Tactical
# Create task in Orchestra WITHOUT Artifact field
# Status: To Do -> Doing -> Done
# No validate, no evidence, no activate
```

---

## 10 Daily Scenarios

### Scenario 1: Start of Day

```
You: open Claude Code
AI: executes Session Start Protocol
AI: "Good morning. In progress:
     - [PROB-021] ADI Quality -- Doing, Phase: Code, Sprint 9
     Health: 1 blind spot (RFC-003 without evidence)
     Recommendation: finish PROB-021, then fix blind spot"
You: "OK, continuing PROB-021"
-> AI picks up context and works
```

### Scenario 2: Found a Bug (Quick Fix)

```
You: "Found a bug -- search doesn't find artifacts with cyrillic"

AI: forgeplan route "search bug with cyrillic"
    -> Tactical (quick fix, reversible)

AI: creates Orchestra task:
    "[BUG] Search cyrillic" -- Status: To Do, Tags: Bug
    NO Artifact (Tactical = no artifact needed)

You: fix the bug
AI: tests pass
    Orchestra: Status -> Done
    git commit
```

### Scenario 3: Found a Serious Bug (Needs Investigation)

```
You: "R_eff scoring gives wrong results at CL0"

AI: forgeplan route "R_eff scoring incorrect for CL0 evidence"
    -> Standard (need to understand root cause, may affect other scoring)

AI: forgeplan new problem "R_eff incorrect at CL0"  -> PROB-XXX
    Fills: Problem, Impact, Reproduction Steps
    forgeplan validate PROB-XXX -> PASS

AI: creates Orchestra task:
    "[PROB-XXX] R_eff incorrect at CL0"
    Fields: Artifact=PROB-XXX, Type=Problem, Depth=Standard, Phase=Shape
    Status: Backlog, Sprint: Sprint 9, Priority: High

AI: investigates, fixes, creates evidence
    -> Orchestra: Phase: Code -> Evidence -> Done
```

### Scenario 4: New Idea / Feature

```
You: "I want to add PDF export for artifacts"

AI: forgeplan route "PDF export for artifacts"
    -> Standard (new feature, 1-3 days)
    -> Pipeline: PRD -> RFC

AI: forgeplan new prd "PDF Export"  -> PRD-XXX
    Fills MUST sections
    forgeplan validate PRD-XXX -> PASS

AI: creates task:
    "[PRD-XXX] PDF Export"
    Fields: Type=PRD, Depth=Standard, Phase=Validate
    Status: To Do, Sprint: Sprint 10 (next sprint)

You: "Let's do it next sprint"
AI: Sprint=Sprint 10, Status=Backlog, Phase=Shape
    (Phase reset to Shape because Backlog maps to Shape in the mapping)
```

### Scenario 5: Starting a New Sprint

```
You: "Starting Sprint 10"

AI: 1. Checks unclosed Sprint 9 tasks:
       query -> Sprint=Sprint 9, Status != Done
       "2 tasks not closed: [RFC-003] and [PROB-023]"

    2. Asks: "Carry over to Sprint 10 or close?"
       You: "RFC-003 carry over, PROB-023 close -- no longer relevant"

    3. AI updates:
       RFC-003: Sprint -> Sprint 10
       PROB-023: Status -> Done (or forgeplan deprecate)

    4. forgeplan health -> what's ready for Sprint 10?
       "4 tasks in Backlog with Sprint 10:
        [PRD-XXX] PDF Export -- To Do
        [RFC-003] Layered arch -- carried from Sprint 9
        ..."

    5. Proposes prioritization by Priority field
```

### Scenario 6: Finished a Task (Full Cycle)

```
AI: code written, tests passing

AI: /audit -> 5-agent review
    Findings: 2 LOW, 0 HIGH
    Fixes LOW findings

AI: forgeplan new evidence "Tests pass, 15 new tests, audit clean"
    forgeplan link EVID-XXX PRD-XXX --relation informs
    forgeplan score PRD-XXX -> R_eff = 1.00

AI: forgeplan review PRD-XXX -> PASSED
    forgeplan activate PRD-XXX -> active

AI: Orchestra: Phase=Done, Status=Done

AI: git commit + git push + gh pr create
    Orchestra: Branch=feat/xxx

AI: "PRD-XXX complete. R_eff=1.00, activated, PR created."
```

### Scenario 7: Task Blocks Another Task

```
You: "Can't do PRD-025 until RFC-005 is ready"

AI: forgeplan link PRD-025 RFC-005 --relation blocked-by
    Orchestra: adds relation between tasks
    PRD-025 Status -> Backlog (blocked)

    forgeplan blocked -> shows dependency graph

You: "Then I'll do RFC-005 first"
AI: RFC-005 Status -> Doing, Phase -> Code
```

### Scenario 8: Hotfix After Merge

```
You: "Tests failing after merge to dev"

AI: does NOT create artifact (this is a hotfix)
    -> Investigates, finds root cause
    -> git checkout -b fix/broken-tests
    -> Fixes

AI: creates task:
    "[BUG] Tests broken after merge" -- Tags: Bug, Priority: High
    Status: Doing -> Review -> Done

    git commit + git push + gh pr create --base dev
```

### Scenario 9: Discussion About a Task

```
You: "Write in the task chat for PRD-021 that I started work"

AI: mcp__orch__send_message(chatUid=task, message="Work started...")
    <- ONLY because user explicitly requested it!

You: "What was written in the chat for PROB-021?"
AI: mcp__orch__read_messages(entityUid=task)
    -> Shows history
```

**Important**: AI NEVER sends messages without explicit user request. Reading is always safe.

### Scenario 10: End of Day

```
You: "What was done today?"

AI: Orchestra: query tasks updated today
    "Today:
     - [PROB-021] ADI Quality -> Done
     - [PRD-XXX] PDF Export -> Shape (PRD filled)
     - [RFC-003] Layered arch -> no changes"

    forgeplan health:
    "Active: 5, Draft: 15, Blind spots: 1"

You: "OK, what about tomorrow?"
AI: "Recommendation: RFC-003 blind spot (needs evidence),
     then [PRD-XXX] PDF Export in Sprint 10"
```

---

## Prohibitions

| Situation | Prohibition | Why | Correct Approach |
|-----------|-------------|-----|------------------|
| Bug found | Start coding without route | May not be Tactical | `forgeplan route` first |
| Standard+ task | Write code without PRD | No justification | Shape -> Validate -> Code |
| Task ready | `forgeplan activate` without evidence | R_eff = 0, blind spot | Create evidence first |
| Need to discuss | `send_message` autonomously | Orchestra safety rule | Only on explicit user request |
| Task not needed | `delete_entity` | Destructive | Status=Done or deprecate |
| Sprint ended | Delete old tasks | Loses history | Done or Archive |
| Merge conflict | `git push --force` | Blocked by hook | Resolve conflict properly |
| Tests failing | Commit anyway | Hook prevents | Fix tests first |
| Active artifact outdated | Delete it | Loses lineage | `forgeplan supersede` or `deprecate` |
| AI creates task | Skip duplicate check | Noise in tracker | `search_entities` first |

---

## Inbox Pattern

### The Problem

Signals (ideas, decisions, observations) arise in different places:
- Chat messages in Orchestra
- Calls and meetings
- Git history (commits without artifacts)
- AI observations (code duplication, flaky tests)
- Forgeplan health (stale artifacts, blind spots)

If not collected, decisions are lost, ideas forgotten, tech debt accumulates.

### The Solution: Inbox at Session Start

```
Signals from various sources
|         |          |          |
Chat Orch |   Git    |  Calls   |  AI background
    |     |    |     |    |     |      |
    v     v    v     v    v     v      v
    +----------------------------------+
                     |
                     v
          +------------------+
          |     INBOX        | <- AI collects (read-only)
          |  (session start) |
          +--------+---------+
                   |
                   v
          +------------------+
          |   TRIAGE         | <- Human decides
          |   (with AI help) |
          +--------+---------+
                   |
      +------------+------------+
      v            v            v
 Discard      Note/Memory    Artifact
 (noise)      (context)      + Task
```

### How AI Collects Inbox (Automatic at Session Start)

**Step 1: Collection (read-only, safe)**
- Orchestra: unread chats, @mentions
- Git: `git log --since="last session"` -- new commits
- Forgeplan: `forgeplan health` -- stale, blind spots
- Memory: context from previous session

**Step 2: Classification (AI proposes, human validates)**

AI prioritizes signals:
- Red -- action needed: overdue tasks, @mentions, blind spots, failing tests
- Yellow -- good to know: chat messages, new commits, stale artifacts
- White -- background: AI observations, minor issues

Shows red immediately, yellow on request, white only if asked.

**Step 3: Human Decides**

For each signal, the user chooses: create artifact, create task, add note, ignore.

**Step 4: AI Executes** the confirmed decisions.

### Safety Matrix for Background Actions

| Action | Background OK? | Reason |
|--------|---------------|--------|
| Read Orchestra chats | Yes | Read-only |
| Read git log | Yes | Read-only |
| Run forgeplan health | Yes | Read-only |
| Classify signals | Yes | Preparation for triage |
| Save to Memory/Hindsight | Yes | Non-destructive |
| **Create artifact** | **No** | Needs confirmation |
| **Create task** | **No** | Needs confirmation |
| **Send message** | **No** | Safety rule |
| **Delete/archive** | **No** | Destructive |
| **Change Status/Phase** | **No** | Needs confirmation |

**Principle**: AI COLLECTS and PROPOSES. Human DECIDES and CONFIRMS. AI EXECUTES.

### Handling Signal Overflow

After weekends or vacations, inbox may be large (30+ signals). AI handles this by:

1. Red signals shown immediately (action required)
2. Yellow signals shown on request (good to know)
3. White signals only if asked (background noise)

AI deduplicates signals that appear in multiple sources (e.g., same event in chat AND git).

### Capturing Decisions from Calls

Recommended approach: tell AI immediately after the call.

```
You: "From the call:
  1. Decided: PostgreSQL instead of SQLite (reason: concurrent writes)
  2. Decided: Phase 5 deadline -- end of April
  3. Task: Alice does migration plan
  4. Idea: add real-time sync (discuss later)
  5. Cancelled: not doing GraphQL API"

AI: creates ADR for #1, updates Sprint/due dates for #2,
    creates task for #3, Note for #4, deprecate for #5
```

### Multi-Person Inbox Triage

- **Config A** (Solo): you are the triage owner
- **Config B** (Small Team): each person handles their own inbox (mentions, tasks). PM does cross-area triage
- **Config C** (Medium Team): PM/Tech Lead does general triage at standup. Devs do personal inbox
