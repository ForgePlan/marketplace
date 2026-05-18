# Usage patterns

Real-world use cases for `fpl-hsmem` and integration recipes with the
rest of the ForgePlan ecosystem. For installation see
[`GETTING-STARTED.md`](./GETTING-STARTED.md).

---

## Mental model — what fpl-hsmem covers

`fpl-hsmem` covers **one layer** in your knowledge stack:
**conversational long-tail context** — things discussed in chat but not
yet captured in code, commits, or formal documents.

Everything else has its own layer:

| Layer | Source of truth | Read it via |
|-------|----------------|-------------|
| Code | The code itself | `Read`, `Grep`, LSP |
| Change history | Git commits | `git log`, `git blame` |
| Formal decisions | `forge/` artifacts | Read the PRD/RFC/ADR files |
| Global rules | `~/.claude/CLAUDE.md` | Auto-loaded |
| Topical rules | `~/.claude/rules/*.md` | Auto-loaded |
| Project conventions | Project `CLAUDE.md` | Auto-loaded |
| Always-relevant facts | `MEMORY.md` (Claude built-in) | Auto-loaded |
| **Conversational long tail** | **Hindsight bank** | **fpl-hsmem** |

**Don't duplicate other layers into Hindsight.** It dilutes recall and
creates drift.

---

## When auto-recall vs. manual tools vs. mental models

`fpl-hsmem` exposes three different recall mechanisms. Pick by intent:

| Need | Use | Why |
|------|-----|-----|
| Default context for every prompt | **Auto-recall hook** | Already happening, zero overhead, invisible |
| "What did we decide about X?" | **`memory_recall`** | Raw ranked memories, fast, ad-hoc |
| "Give me a coherent summary of X" | **`memory_reflect`** | LLM synthesis across all relevant memories |
| Recurring question with auto-updates | **`mental_model_*`** | Living page, refreshes after each consolidation |
| Searchable archival of a finalized artifact | **`document_ingest`** | One-shot ingestion, becomes findable via recall |

---

## Use case 1 — bug investigation

You hit a bug, suspect it's been seen before.

```
> The billing webhook is dropping events when we exceed 10 req/s.
  Have we seen this kind of issue before?

[hidden context injected by recall.js hook]
  - Stripe webhook retry storm on 2026-02-14 — root cause: synchronous
    DB write blocking event loop, fixed by moving to BullMQ worker
  - Webhook signature validation issue 2026-03-22 — different problem,
    fixed via timestamp tolerance bump
  - Note from RFC-014: "current webhook handler is not built for >5 req/s"

We hit similar rate-limit symptoms on 2026-02-14 — the root cause then
was a synchronous DB write blocking the event loop, fixed by moving
processing to a BullMQ worker. RFC-014 also flagged that the current
webhook path isn't built for sustained >5 req/s. Worth checking if the
BullMQ pattern from 2026-02 is wired up for the billing endpoint
specifically, or only for the subscription one.
```

Hindsight surfaces prior bug history; Claude synthesizes a hypothesis.
No need to grep through old PR descriptions or Slack.

---

## Use case 2 — new team member onboarding

A colleague joins the project. They ask about authentication.

```
> What do I need to know about how auth works in this service?

[recall hook injects context across multiple decisions, ADRs, and
 prior conversations]

Auth design at a glance:
  - JWT RS256 for end-user sessions (ADR-012, decided 2026-03)
  - mTLS for service-to-service (NOTE-003)
  - 7-day refresh token rotation (came up in PRD-018 review)
  - We deliberately don't support OAuth provider login (deprecation
    note from 2026-04, "increases support burden without enterprise
    customers asking for it")
  - Active tech debt: the JWT lib is pinned to v8 because v9 breaks
    cookie parsing — discussed but not fixed yet

The decisions live in /forge/adrs/ADR-012-auth.md and PRD-018. Quick
gotcha: don't try to upgrade the JWT lib — there's an open thread
about why it's pinned.
```

A new dev gets a synthesis that draws on **conversations they weren't
part of**.

---

## Use case 3 — decisions log (mental model)

Set up a living "decisions log" page once, never maintain it:

```
/fpl-hsmem:mental-model

id:           decisions-log
name:         Architectural decisions log
source_query: "What architectural decisions have we made in this project
               and what was the reasoning? Group by area
               (auth, data model, infrastructure, observability)."
```

After a few weeks of conversations, `mental_model_get("decisions-log")`
returns a synthesized log that Hindsight rebuilds after each
consolidation cycle. Free, always current.

Useful sibling pages:

| Mental model | Source query |
|---|---|
| `tech-debt` | "What technical debt have we identified across conversations but not fixed? Group by severity." |
| `bug-history` | "What bugs have we hit and how were they fixed? Group by area." |
| `team-conventions` | "What conventions specific to this codebase have we agreed on (naming, error handling, testing)?" |
| `deprecations` | "What features or patterns have we deliberately decided NOT to support, and why?" |
| `recent-context` | "What were we last working on, and where did we leave off?" |

Don't create all of these at once. Start with one, see if it pays off,
add more as recurring questions emerge.

---

## Integration with `fpl-skills`

`fpl-hsmem` is **complementary** to `fpl-skills`, not a replacement.

### `/restore` + auto-recall

`fpl-skills:/restore` reconstructs session context from git + working
copy. Auto-recall **adds** the long-tail of cross-session conversation
context on top of that — without you calling anything.

Best practice: run `/restore` at session start (or let SessionStart hook
do it). The recall hook handles every subsequent prompt automatically.

### `/research` results — ingest as documents

When `/research` produces `research/reports/<topic>/REPORT.md`:

```
> /research streaming uploads vs presigned URLs

Synthesis written to research/reports/uploads/REPORT.md
Next: /refine to lock terminology, then /rfc create
```

If you want the report findable via semantic recall going forward:

```
document_ingest_file("research/reports/uploads/REPORT.md", tags=["research", "uploads"])
```

Now future `memory_recall("upload approaches we evaluated")` will surface
it. Don't ingest preliminary work — only finalized reports.

### `/audit` findings — manual retain for non-obvious lessons

`/audit` produces a list of findings. Most go into the audit report
itself. But if an audit revealed a **non-obvious pattern** worth
remembering across sessions:

```
memory_retain(
  content="Lesson from audit 2026-05-12: the BullMQ worker pattern \
           we used for billing webhooks should NOT be applied to the \
           subscription webhook because subscription events need \
           ordering guarantees within a customer. Use ordered queues \
           or per-customer locks instead.",
  tags=["audit", "lesson", "subscription"],
  context="audit-2026-05-12"
)
```

This is the **non-obvious** category — `memory_retain` excels here.
Routine findings stay in the audit report.

### `/sprint` wave plans — ingest finished sprints

After a `/sprint` completes:

```
document_ingest("sprint-2026-05-18-billing-refactor", "<full plan>")
```

Subsequent recalls about billing changes will surface the wave structure
and decisions — without grepping `forge/` for the sprint artifact.

---

## Integration with forgeplan artifacts

Forgeplan tracks formal artifacts (PRDs, RFCs, ADRs) with strict
lifecycle. Hindsight tracks the **conversations leading up to them**.

### When a PRD activates

```bash
forgeplan activate PRD-024
```

After activation, optionally:

```
document_ingest_file("forge/prds/PRD-024-multi-agent-pipeline.md",
                     tags=["PRD", "active"])
```

The PRD becomes semantically searchable. Conversations about
"multi-agent" or "pipeline" will now surface PRD-024 alongside ad-hoc
discussion notes.

### When an ADR is sealed

```
document_ingest_file("forge/adrs/ADR-005-orchestrator-split.md",
                     tags=["ADR", "sealed"])
```

ADRs are immutable once sealed — perfect candidates for ingestion. The
ADR file remains the source of truth; Hindsight just makes it findable
via natural-language recall.

### When a `NOTE` is created

NOTEs in forgeplan capture autonomous decisions or external findings.
They're the natural format for things `memory_retain` would otherwise
hold:

```
forgeplan note create --type observation \
  --title "Ruflo-style outcome feedback pattern" \
  --body "..."
```

If the NOTE will be referenced repeatedly, also ingest:

```
document_ingest_file("forge/notes/NOTE-004-ruflo-outcome-feedback.md",
                     tags=["NOTE", "pattern"])
```

---

## Integration with `forgeplan-orchestra`

`forgeplan-orchestra` coordinates multiple sessions / agents working on
the same project.

### `/sync` + memory bootstrap

After `/orchestra:sync` pulls down artifacts from upstream:

```
/fpl-hsmem:bootstrap
```

The bootstrap skill will detect newly-synced artifacts in `forge/` and
offer to ingest them. Keeps the bank aligned with the latest artifact
state.

### Multi-session memory consistency

All sessions in the same project share **one bank** (derived from cwd
or `.mcp.json`). When one session retains, all subsequent sessions
recall those facts. Auto-retain is idempotent — same content won't
duplicate.

---

## Integration with `forgeplan-workflow`

`forgeplan-workflow:/forge-cycle` Step 0 already calls
`mental_model_get` to seed the engineering loop with synthesized
context. For this to work, ensure you've created at least one mental
model relevant to the cycle (e.g. `decisions-log` or `recent-context`).

If `mental_model_list` is empty at cycle start, Step 0 falls back
gracefully — but you're missing the value.

---

## Anti-patterns

### Don't `memory_retain` everything

Auto-retain already captures the full transcript every N turns.
Manual `memory_retain` is for **non-obvious lessons** that might get
diluted in the transcript stream. Saving "we use TypeScript" is noise.
Saving "we tried X, it failed because Y, now we use Z" is signal.

### Don't ingest active documents

If a PRD is currently being iterated on, leave it as a file. Ingest
**after** it stabilizes (activated, sealed). Otherwise you'll have
stale versions in memory contradicting fresh edits.

### Don't create mental models speculatively

A mental model is only valuable if you actually ask its question 3+
times across weeks. Creating "Architecture overview" with `source_query
"Describe the architecture"` produces a page nobody reads. Wait for
recurring questions, then crystallize them.

### Don't share banks across unrelated projects

`fpl-hsmem` derives one bank per project (via git root). Don't override
to share across projects — recall quality degrades fast when contexts
mix. Use multiple banks; cross-reference manually if needed.

### Don't `memory_recall` reflexively

The hook already runs recall for every prompt. Manual recall is for:
- Targeted searches with specific filters (`types`, `tags`)
- Re-running with `recallBudget: "high"` when initial recall missed
- Explicit "remember when..." user requests

Otherwise, just talk to Claude — the hook does the rest.

---

## Recall query quality

Hindsight uses semantic search. Quality matters:

| ❌ Don't | ✅ Do |
|---------|------|
| `memory_recall("auth")` | `memory_recall("decisions about authentication and session management")` |
| `memory_recall("bug")` | `memory_recall("webhook handler bugs we've encountered")` |
| `memory_recall("Stripe")` | `memory_recall("how have we handled Stripe webhook retries and idempotency?")` |

Keyword-style queries return shallow results. Full natural-language
questions trigger semantic matching across the entire memory graph.

---

## Performance and cost

- **Auto-recall** runs on every prompt with a 12-second timeout. If
  recall is slow, the prompt proceeds without it — never blocks.
- **Auto-retain** runs async (`async: true`) — non-blocking. Returns
  immediately, server processes in background.
- **Mental model consolidation** is server-side work. Triggered
  automatically after retains accumulate. Costs LLM tokens (on whatever
  provider Hindsight is configured for — defaults to `claude-code`
  reusing your subscription).

If you're on `claude-code` provider: cost is **zero extra dollars**
beyond your Pro/Max subscription. If you're on a paid API provider
(`openai`, `anthropic`), each retain triggers ~1-3K tokens of extraction
work. Throttling (`retainEveryNTurns: 10`) keeps this manageable.

For private / offline setups: `ollama` provider with `gemma3:12b`
runs the whole pipeline locally — zero cloud, zero cost, but slower
recall and lower extraction quality. See
[`CONFIGURATION.md`](./CONFIGURATION.md#llm-providers).

---

## Where to go next

- [`CONFIGURATION.md`](./CONFIGURATION.md) — full settings reference
- [`TROUBLESHOOTING.md`](./TROUBLESHOOTING.md) — diagnostic recipes
- [`GETTING-STARTED.md`](./GETTING-STARTED.md) — first-time setup
- Hindsight docs — [hindsight.vectorize.io](https://hindsight.vectorize.io)
- Web UI for live memory graph — `http://localhost:9999` (with default
  Docker setup)
