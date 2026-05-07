# Sprint Template Reference

**This file is the TEMPLATE for `/sprint` command output.**
The agent MUST follow this structure when generating sprint plans.

---

> **Terminology**: Feature = **Agent Teams**. Team creation = `TeamCreate` (tool). Team deletion = `TeamDelete` (tool). Env: `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`.

> **!!! CRITICAL — IRON RULE — READ BEFORE ANYTHING !!!**
>
> **`TeamCreate` — THE ONLY WAY TO LAUNCH. NO EXCEPTIONS.**
>
> - `TeamCreate` — ALWAYS. `Task()` directly — NEVER.
> - **Team-lead** = COORDINATION ONLY. DOES NOT WRITE CODE. DOES NOT EDIT FILES. PERIOD.
> - **Teammates** = ALL the work. Each in its OWN process, its OWN context.
> - Extra work → NEW teammate. DO NOT pile work onto existing ones.
> - Before `TeamCreate` → CHECK old teams → ASK the user → `TeamDelete`.
> - **DO NOT delete teams silently** — always ask the user!
>
> **Violating this rule = sprint failure.**

---

## Template Structure

```
# {Title} — Wave {N-M} Sprint

## Context
- Branch: `{branch}`
- RFC: `{rfc-path}` (if applicable)
- TODO: `{todo-path}` (line range if known)

## What's already done
✅ {Phase/item 1} ({summary — LOC, tests, key deliverables})
✅ {Phase/item 2} (...)

## Remaining work

### {Category 1}: {name} (~{total LOC})
- {sub-task A} (~{LOC}, {N} components/files)
- {sub-task B} (~{LOC}, {N} components/files)

### {Category 2}: {name} (cleanup/bugs/polish)
- [ ] {task} (~{LOC}) — `{file-path}`

## Existing resources (STUDY before writing!)

| File | What's there | How to reuse |
|------|--------------|--------------|
| `{path}` | {description} | {how to reuse} |
| `{path}` | {description} | {how to reuse} |

## Waves

### Wave {N} — {Name}: {summary} ({M} agents in parallel)

**Agent {i}: `{kebab-name}`** (subagent_type: `{type}`)
- Files: {NEW/MODIFY}
  - `{path}` (~{LOC})
  - `{path}` (~{LOC})
- Task: {one-line summary}
  - Study: {2-4 files to read FIRST}
  - Build: {what to build — bullet points}
  - Requirements: {constraints — 2-4 items}

### Wave {N+1} — ... (follows same pattern)

## Dependencies

Wave N: [agent-a] [agent-b] [agent-c] — in parallel
                    ↓
Wave N+1: [agent-d] [agent-e] — in parallel
           ↑ depends on {what from previous wave}

## Key files

| File | Why |
|------|-----|
| `{path}` | {reason to study} |

## !!! EXECUTION — IRON RULE !!!

> **⛔ FORBIDDEN**: Task() directly, team-lead writing code, teammate getting tasks meant for others
> **✅ REQUIRED**: TeamCreate → team-lead (coordination) → teammates (code)

### TeamCreate — THE ONLY way to launch. NO EXCEPTIONS.
1. **Check** existing teams ("sprint-*", "wave-*"):
   - Team exists → check state (finished? stuck? active?)
   - **ASK the user** before deletion: "Team '{name}' — {status}. Delete?"
   - User confirmed → **TeamDelete** | Refused → ask what to do
2. **TeamCreate**: "sprint-{topic}" or "wave-{topic}"
3. **Team-lead** = COORDINATION ONLY:
   - Does NOT write code
   - Does NOT edit files
   - Does NOT run tsc/tests (asks teammates)
   - ONLY: spawn → monitor → verify → report → next wave
4. **Teammates** = ALL the work:
   - Each in its OWN process, OWN context
   - Owns ITS files only — no conflicts

### Dynamic Teammates — NEW teammate for EVERY extra task
- Found a bug, missing file, need a refactor? → NEW teammate
- **FORBIDDEN** to add work to an existing teammate
- New teammate = separate process, own context, own files
- Team-lead waits for ALL teammates (original + new) before closing the wave

## Rules

1. Each agent owns ITS files only — no conflicts
2. Follow CLAUDE.md project rules (APIError, getTenantIdStrict, etc.)
3. {sprint-specific rule 1}
4. {sprint-specific rule 2}
5. 0 new TS errors

## Post-Sprint: Insights Extraction (REQUIRED!)

**After ALL waves complete, the team-lead MUST collect and document:**

### Into the RFC file (Implementation Log section → "Sprint Insights & Bottlenecks"):
- **Architectural decisions (ADR)**: union type cascades, local vs cross-package interfaces, DI patterns, config chains
- **Bottlenecks**: stale dist/, agent context overflow, cascading TS errors, performance bottlenecks
- **Technical Debt**: what didn't get done, stubs, what the next sprint needs to finish

### Into TODO_PHASE_TWO.md (section "Sprint Insights & Technical Debt"):
| # | Task | RFC | Priority | Why it matters |
|---|------|-----|----------|----------------|
| 1 | ...  | ... | P1/P2    | ...            |

### Into KNOWN-ISSUES.md (if bugs were found)

### Into Hindsight (memory_retain):
- All ADRs + tech debt + reusable patterns

### In the final report to the user:
- A separate "Insights & Technical Debt" block (DO NOT bury it in the summary)

**RULE**: A sprint WITHOUT an insights block = an UNFINISHED sprint.

## Effort Summary

| Wave | Agents | LOC | Tests | Description |
|------|--------|-----|-------|-------------|
| {N}  | {M}    | ~{X} | {Y}  | {summary}  |
| **Total** | **{M}** | **~{X}** | **{Y}** | {overall} |
```

---

## Real Example (RFC-080 Wave 9-12)

Below is a REAL example from the RFC-080 sprint. Use this as reference for density, detail level, and structure.

```markdown
# RFC-080 Wave 9-12 Sprint — Phase 5 Command Center + Cleanup

## Context

Branch: `feat/RFC-080-chat-agent-platform`
RFC: `apps/pipeline/docs/RFC-080-CHAT-AGENT-PLATFORM.md`
TODO: `apps/pipeline/docs/TODO_PHASE_TWO.md` (line 2300+)

## What's already done (Wave 1-8)

✅ Phase 0 — Schema + Stores (8 tables, 5 stores, 323 tests)
✅ Phase 1 — Backend Wiring (memory-bridge, provenance, completions, folders)
✅ Phase 1.5 — Frontend Wiring (useGertsChat, transport, gsp-parser, 125 tests)
✅ Phase 2 — Graph Memory (RRF, BM25, SpreadingActivation, 38 tests)
✅ Phase 3 — Agent System (tree, skills, builtins, MCP, 73 tests)
✅ Phase 4 — UI/UX ~95% (Chat, Agent, Memory, Model, Observe wired, 96+ tests)

## Remaining work

### Phase 5: Command Center (~2,670 LOC)

- 5A: AI Sidebar (~530 LOC, 7 components)
- 5B: Enhanced ⌘K (~360 LOC, 5 components)
- 5C: Full AI Assistant Page (~1,010 LOC, 9 components)
- 5D: Admin Tools Integration (~270 LOC, 4 components)
- 5E: Polish (~300 LOC, 4 components)

### Cleanup:

- [ ] Wire compact views (~60 LOC) — `ContextPanel.tsx`

## Existing resources

| File                                      | What's there          | How to reuse            |
| ----------------------------------------- | --------------------- | ----------------------- |
| `features/ai-chat/ui/ChatLayout.tsx`      | 3-panel chat layout   | Layout pattern          |
| `features/ai-chat/ui/ChatComposer.tsx`    | Input with file uploads | Composer for sidebar  |
| `features/ai-chat/hooks/useGertsChat.ts`  | GSP streaming hook    | Core chat hook          |
| `features/ai-chat/hooks/useChats.ts`      | CRUD conversations    | Conversation management |
| `features/ai-chat/model/chat-ui-store.ts` | Zustand chat store    | UI state pattern        |
| `shared/ui/command-palette.tsx`           | ⌘K Level 1 (36 items) | Base for enhanced ⌘K    |

## Waves

### Wave 9 — Foundation: Stores + Hooks (3 agents in parallel)

**Agent 1: `foundation-stores`** (subagent_type: `general-purpose`)

- Files: NEW
  - `widgets/ai-sidebar/model/store.ts` (~40 LOC)
  - `shared/lib/use-page-context.ts` (~50 LOC)
  - `shared/lib/use-global-search.ts` (~40 LOC)
  - `features/admin/ai/model/preferences.ts` (~40 LOC)
- Task: Zustand stores + shared hooks
  - Study: `chat-ui-store.ts`, `command-palette.tsx`
  - Build: AI Sidebar Store (isOpen, mode, toggle), usePageContext (route parsing),
    useGlobalSearch (TanStack Query), Chat Preferences (persist)
  - Requirements: No getters in Zustand state. 0 TS errors

**Agent 2: `compact-views-fix`** (subagent_type: `general-purpose`)

- Files: MODIFY `ContextPanel.tsx`
- Task: Wire compact views to existing hooks
  - Study: `ContextPanel.tsx`, `useMessageMemory.ts`, `useMessageGraph.ts`, `useMessageTrace.ts`
  - Build: Wire MemoryContent → facts count, GraphContent → entities count,
    TraceContent → steps count + duration
  - Requirements: ~60 LOC. 0 TS errors

**Agent 3: `assistant-hooks`** (subagent_type: `general-purpose`)

- Files: MODIFY `features/admin/ai/hooks.ts`
- Task: Extend AI hooks for assistant page
  - Study: `hooks.ts`, `useGertsChat.ts`, `useChats.ts`
  - Build: useAIChat (wrapper), useConversationSearch, useRecentConversations,
    useMessageActions (copy, regen, edit, delete)
  - Requirements: TanStack Query + authFetch. ~150 LOC. 0 TS errors

---

### Wave 10 — AI Sidebar + Enhanced ⌘K (3 agents in parallel)

**Agent 4: `ai-sidebar`** (subagent_type: `general-purpose`)

- Files: NEW `widgets/ai-sidebar/ui/AISidebar.tsx` (~200 LOC), MODIFY DashboardLayout
- Task: AI Sidebar widget — fixed right panel, slides in/out
  - Study: store from Wave 9, ChatComposer, useGertsChat, MessageList
  - Build: AISidebar (header + messages + input), wire into DashboardLayout,
    Cmd+Shift+A shortcut, page context badge
  - Requirements: Reuse MessageParts, ModelSelector. Dark theme. 0 TS errors

**Agent 5: `enhanced-cmdk`** (subagent_type: `general-purpose`)

- Files: MODIFY `shared/ui/command-palette.tsx`
- Task: 4 modes for ⌘K (Navigate, Search, Action, AI)
  - Study: `command-palette.tsx`, `use-global-search.ts` from Wave 9
  - Build: Mode detection by prefix (none/`/`/`>`/`?`), mode indicator badge,
    search results, action list, inline AI streaming
  - Requirements: ~360 LOC additions. 0 TS errors

**Agent 6: `chat-components`** (subagent_type: `general-purpose`)

- Files: NEW `features/admin/ai/ui/chat-message.tsx` (~100 LOC), `provenance-badge.tsx` (~60 LOC)
- Task: Shared AI chat UI components
  - Study: `MessageParts.tsx`, `ModelSelector.tsx`, `SourcesWide.tsx`
  - Build: ChatMessage (lightweight bubble), ProvenanceBadge (source count + tooltip).
    Re-export ModelSelector if existing one fits
  - Requirements: THIN wrappers, reuse ai-chat. 0 TS errors

---

### Wave 11 — Full Assistant Page + Admin Tools (4 agents in parallel)

**Agent 7: `assistant-lists`** (subagent_type: `general-purpose`)

- Files: NEW `features/admin/ai/ui/conversation-list.tsx` (~200 LOC), `folder-list.tsx` (~80 LOC)
- Task: Conversation list + Folder management
  - Study: `ChatSidebar.tsx`, `useChats.ts`, `useFolders.ts`
  - Build: ConversationList (grouped by time, search, context menu),
    FolderList (collapsible, drag-drop, count badge)
  - Requirements: Reuse hooks from ai-chat. 0 TS errors

**Agent 8: `assistant-chat-area`** (subagent_type: `general-purpose`)

- Files: NEW `features/admin/ai/ui/chat-area.tsx` (~250 LOC), `message-actions.tsx` (~80 LOC)
- Task: Full chat area + message actions toolbar
  - Study: `ChatLayout.tsx`, `MessageList.tsx`, `ChatComposer.tsx`, `useGertsChat.ts`
  - Build: ChatArea (orchestrator — messages + composer + streaming + header),
    MessageActions (Copy, Regenerate, Edit, Delete hover toolbar)
  - Requirements: MAX reuse from ai-chat (import, NOT copy). 0 TS errors

**Agent 9: `assistant-panels`** (subagent_type: `general-purpose`)

- Files: NEW `features/admin/ai/ui/provenance-panel.tsx`, `memory-facts.tsx`,
  `app/(dashboard)/ai/assistant/page.tsx`, `layout.tsx`
- Task: Side panels + route setup
  - Study: `SourcesWide.tsx`, `MemoryWide.tsx`, `useProvenance.ts`
  - Build: ProvenancePanel (sources with scores), MemoryFacts (timeline),
    Route /ai/assistant (page + layout)
  - Requirements: Panels toggle on/off. Reuse ai-chat hooks. 0 TS errors

**Agent 10: `admin-tools`** (subagent_type: `general-purpose`)

- Files: NEW `features/admin/ai/lib/tools.ts` (~100 LOC), `ui/tool-result.tsx`, `ui/tool-confirm.tsx`
- Task: Admin tools integration (navigate, search, create)
  - Study: `ToolCallBlock.tsx`, `command-palette.tsx`, `packages/tools/src/`
  - Build: Tool Registry (Map<string, AdminTool>), ToolResult renderer,
    ToolConfirm dialog, NavigateTool handler
  - Requirements: Destructive tools require confirmation. 0 TS errors

---

### Wave 12 — Polish + Tests + Docs (3 agents in parallel)

**Agent 11: `keyboard-shortcuts`** (subagent_type: `general-purpose`)

- Files: NEW `shared/lib/use-keyboard-shortcuts.ts` (~80 LOC),
  `features/admin/ai/ui/mention-autocomplete.tsx` (~100 LOC)
- Task: Global shortcuts + @mention autocomplete
  - Study: `command-palette.tsx`, `ChatComposer.tsx`
  - Build: useKeyboardShortcuts (registry, Cmd+K/Cmd+Shift+A/Cmd+Shift+N/Escape),
    MentionAutocomplete (@trigger → fuzzy dropdown)
  - Requirements: No conflicts with browser defaults. 0 TS errors

**Agent 12: `polish-ui`** (subagent_type: `general-purpose`)

- Files: MODIFY `observe/cost/page.tsx`, NEW `features/admin/ai/ui/agent-marketplace.tsx`
- Task: Cost dashboard refinements + marketplace placeholder
  - Study: `CostDashboard.tsx`, `features/admin/agents/`
  - Build: Sparkline charts, model breakdown, budget alert.
    Marketplace placeholder (grid of "coming soon" cards)
  - Requirements: 0 TS errors

**Agent 13: `tests-docs`** (subagent_type: `general-purpose`)

- Files: NEW `__tests__/hooks.test.ts`, `__tests__/store.test.ts`,
  MODIFY `TODO_PHASE_TWO.md`, `RFC-080.md`
- Task: Tests (~26) + docs update
  - Tests: hooks (12), sidebar store (8), preferences (6) — Vitest
  - Docs: mark Phase 5 done, update status to ~98%

---

## Dependencies

Wave 9: [foundation-stores] [compact-views-fix] [assistant-hooks] — in parallel
↓
Wave 10: [ai-sidebar] [enhanced-cmdk] [chat-components] — in parallel
↑ depends on stores from Wave 9
↓
Wave 11: [assistant-lists] [assistant-chat-area] [assistant-panels] [admin-tools] — in parallel
↑ depends on hooks + components from Wave 10
↓
Wave 12: [keyboard-shortcuts] [polish-ui] [tests-docs] — in parallel

## Key files

| File                                      | Why                 |
| ----------------------------------------- | ------------------- |
| `features/ai-chat/hooks/useGertsChat.ts`  | Core streaming hook |
| `features/ai-chat/model/chat-ui-store.ts` | Zustand pattern     |
| `shared/ui/command-palette.tsx`           | Existing ⌘K         |
| `app/(dashboard)/layout.tsx`              | Dashboard layout    |

## !!! EXECUTION — IRON RULE !!!

> **⛔ Task() directly = FORBIDDEN. Team-lead writing code = FORBIDDEN.**

### TeamCreate (THE ONLY way to launch)

1. Check existing teams → if any:
   - Determine status (finished/stuck/active)
   - **ASK the user**: "Team '{name}' — {status}. Delete via TeamDelete?"
   - Only after confirmation → **TeamDelete** → **TeamCreate**: "sprint-rfc080-phase5"
2. **Team-lead**: COORDINATION ONLY — does NOT write code, does NOT edit files, period
3. **Teammates**: ALL the work — each in its OWN process, OWN context
4. Extra work → NEW teammate (DO NOT pile work onto existing ones)
5. Team-lead waits for ALL teammates before closing the wave

## Rules

1. Each agent owns ITS files only
2. Follow CLAUDE.md rules (APIError, getTenantIdStrict, etc.)
3. REUSE from `features/ai-chat/` — import, not copy
4. Zustand: do NOT use getters in state (use selectors)
5. Dark theme: bg-[#0a0a0b], border-[#27272a], text-[#ededed]
6. 0 new TS errors. Vitest, not Jest

## Effort Summary

| Wave      | Agents | LOC        | Tests   | Description                              |
| --------- | ------ | ---------- | ------- | ---------------------------------------- |
| 9         | 3      | ~440       | 0       | Foundation: stores, hooks, compact views |
| 10        | 3      | ~790       | 0       | AI Sidebar + Enhanced ⌘K + components    |
| 11        | 4      | ~1,160     | 0       | Full Page + Admin Tools                  |
| 12        | 3      | ~560       | ~26     | Polish + Tests + Docs                    |
| **Total** | **13** | **~2,950** | **~26** | Phase 5 Command Center                   |
```

---

## Agent Description Guidelines

Each agent description should follow this compact format (80-120 words):

```
**Agent {i}: `{name}`** (subagent_type: `{type}`)
- Files: {NEW/MODIFY} `{path}` (~{LOC})
- Task: {one-line what}
  - Study: {2-4 files — comma separated}
  - Build: {what to build — comma separated items}
  - Requirements: {2-4 constraints — comma separated}
```

### DO:

- Use comma-separated lists (not bullet sub-points)
- Reference specific file paths (not vague "the auth module")
- Include LOC estimate per file
- Mark files as NEW or MODIFY
- Include "0 TS errors" in every requirements

### DON'T:

- Don't repeat rules from CLAUDE.md (just say "Follow CLAUDE.md")
- Don't describe implementation details (the agent will figure it out from the files)
- Don't write >3 lines for "Build"
- Don't include API schemas or type definitions in the description

---

## Scaling Guidelines

| Sprint Size        | Waves                | Agents/Wave | Total Agents | Approach                                     |
| ------------------ | -------------------- | ----------- | ------------ | -------------------------------------------- |
| Small (~500 LOC)   | 1-2                  | 2-3         | 2-4          | TeamCreate REQUIRED (even for small ones!)   |
| Medium (~1-2K LOC) | 2-3                  | 2-4         | 5-8          | TeamCreate with team-lead                    |
| Large (~3-5K LOC)  | 3-5                  | 3-4         | 10-15        | TeamCreate, verify between waves             |
| XL (>5K LOC)       | Split into 2 sprints | —           | —            | `/sprint` twice                              |

## Wave Pattern Cheat Sheet

| Task Type          | Wave Pattern                                   |
| ------------------ | ---------------------------------------------- |
| Full-stack feature | Stores/Types → Backend → Frontend → Tests      |
| UI-only feature    | Stores/Hooks → Components → Pages → Tests      |
| Backend-only       | Schema/Types → Services → Actions → Tests      |
| Refactor           | Foundation → Migration → Integration → Cleanup |
| Bug sprint         | Research → Fixes → Verification → Docs         |
