# Sprint output formats

Three reusable markdown templates the sprint workflow emits at well-defined moments:

1. **Wave handoff** — between waves, hand off to the user with progress + next-step options.
2. **Wave completion task overlay** — after each wave, a tabular progress snapshot.
3. **Sprint complete report** — final report after all waves and insights extraction.

Use these verbatim. Don't reinvent format mid-sprint — it confuses the reader who's tracking progress across waves.

---

## 1. Wave handoff (between waves)

```markdown
---
## 📊 Sprint Progress: {title}

### ✅ Completed
- Wave 1: {summary} — {LOC} LOC, {N} files
- Wave 2: ...

### 🔄 Current: Wave {N}
{description, agents, expected output}

### 📋 Remaining
- Wave {N+1}: {description}

### ⚠️ Issues
- {any from completed waves}

---

Continue to Wave {N}? Or:
- `/compact` — compact context
- `plan mode` — enter plan mode
- "clear context" — save progress and emit a continuation prompt
```

### Token budget awareness (paired with handoff)

Before each new wave:

```
IF tokens remaining < 30%:
  WARN user:
    "⚠️ Context ~{X}% full. Before Wave {N}:
     A. /compact — compact (fast, loses detail)
     B. New chat with continuation prompt:

     ## Continuation: {title} — Wave {N}
     Branch: {branch}
     Completed: Wave 1-{N-1} ({summary})
     Remaining: Wave {N}-{total}

     ### Wave {N} Prompt: {full description}
     ### Files Modified So Far: {list}

     C. Continue as is (risky)"

IF tokens remaining < 15%:
  → FORCE save continuation prompt, suggest new chat.
```

---

## 2. Wave completion task overlay

After each wave, emit this overlay so the user sees cumulative progress in one glance:

```markdown
## 📋 Sprint Task Overlay: {title}

### Progress: Wave {N}/{total}

| Wave | Status | Agents | LOC | Output |
|---|---|---|---|---|
| 1 | ✅ Done | 3 | ~420 | stores, hooks, types |
| 2 | ✅ Done | 3 | ~810 | sidebar, cmd+k, components |
| 3 | 🔄 Next | 4 | ~1100 | full page, admin tools |
| 4 | ⏳ Pending | 3 | ~500 | tests, polish, docs |

### Files Modified (cumulative)
- NEW: {list}
- MODIFIED: {list}

### Key Decisions
- {decision 1}
- {decision 2}

### Next Wave: {N} — {name}
{brief description}
```

Then options for the user:

```
1. ▶️ Wave {N} — next wave
2. 🔍 Review — show files from previous wave
3. 📊 Tokens — check what's left
4. 💾 Save progress — continuation prompt
5. ⏸️ Pause
```

---

## 3. Sprint complete report (final)

After all waves complete and insights are extracted (Step 6 in the sprint workflow):

```markdown
## ✅ Sprint Complete: {title}

**Waves**: {N}/{N} | **Agents**: {total} | **LOC**: ~{total} | **Tests**: {count}

### Deliverables
{what we built}

### Files Created/Modified
{cumulative list}

### Insights & Tech Debt
{extracted via Step 6 — ADRs, bottlenecks, reusable patterns, tech debt}

### Possible Next Steps
- [ ] Run full test suite
- [ ] Type-check
- [ ] Commit
- [ ] Audit (see [`audit`](../../audit/SKILL.md))
```

---

## When to deviate from these formats

Don't deviate without a reason. The columns and emoji are not decoration —
they let humans skim multi-wave progress in seconds. If you change a column,
change it consistently for every wave in the same sprint.

If you genuinely need a different shape (e.g. a refactor sprint where "LOC"
is misleading because most work is moves rather than additions), state the
substitution at the top of the wave-1 overlay and keep it consistent for the
rest of the sprint.
