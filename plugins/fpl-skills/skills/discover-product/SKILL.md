---
name: discover-product
description: 'Interview-driven product-discovery skill that bridges JTBD / Lean Startup / Double Diamond discovery into the forgeplan artifact graph (ADR-023 D2, routing-map row 10). Double Diamond (Discover -> Define -> Develop -> Deliver) is the INTERNAL walk the skill performs, not a separate methodology skill; JTBD and assumption-mapping are SUB-MODES invoked as `/discover-product jtbd` and `/discover-product assumptions` (the `/smith plan|routing|status` argument pattern), not separate skills. The differentiator over prose-only technique content (already covered by the installed `pm-skills` marketplace, which has zero forgeplan references across 68 skills) is the bridge: discovery assumptions land as `hypothesis` artifacts moved through `forgeplan_hypothesis_promote`, one `PROBLEM` artifact is created per validated problem before any PRD, and interviews are persisted as a sourced discovery `NOTE`. **MCP-first per PRD-022 Tier A, CLI fallback** — and for one step, CLI-ONLY: `hypothesis` is absent from the MCP `forgeplan_new` kind enum and from `forgeplan new --help`, so HYP creation always goes through the CLI. Never calls `interview_packet_draft` / `interview_packet_ingest` — both are core stubs returning `not_implemented` (marketplace#265); the skill uses a discovery-NOTE path instead and names the swap condition. Triggers (EN/RU) — "product discovery", "should we build this", "talk to a user", "user research", "JTBD", "validate this hypothesis", "discovery sprint", "продуктовое открытие", "поговорить с пользователем", "стоит ли строить", "jtbd", "проверить гипотезу", "исследование пользователей", "/discover-product".'
origin: forgeplan
disable-model-invocation: true
allowed-tools: Read Write Edit Bash(test *) Bash(forgeplan *) Bash(command *) Bash(grep *) Bash(ls *) Bash(mkdir *)
---

# discover-product — product discovery, bridged into the forgeplan graph

Walks a product question — "should we build this", "what does the user actually need" — through
Double Diamond (**Discover → Define → Develop → Deliver**) as this skill's own internal steps, and
lands the result as forgeplan artifacts: a `PROBLEM` before any PRD, discovery `assumptions` as
`hypothesis` artifacts with real lifecycle state, interviews as a sourced `NOTE`, and a PRD whose
problem statement carries a JTBD job statement with non-empty Non-Goals.

This skill exists because the gap it closes is not "we lack discovery technique content" — three
`pm-skills` plugins (68 `SKILL.md` files: Opportunity Solution Tree, interview scripts, personas,
segmentation, metrics dashboards, GTM) are already installed and cover that. The gap is that none of
it — and until this skill shipped, none of forgeplan's own discovery primitives either — ever reached
the artifact graph. **ADR-023** measured this precisely (routing-map row 10 named an agent,
`research-analyst`, that is structurally forbidden from persisting anything — its denylist blocks
`forgeplan_new`/`_update`/`_link`) and decided the fix is a skill whose differentiated part is the
bridge, not new prose. Full reasoning: `forgeplan get ADR-023`.

**No new orchestrator.** ADR-023's ADR-012 острый-test verdict for product discovery is **No** — there
is no fail-closed control to bind, only a semantic judgement ("is this problem validated?") that
belongs to a reviewer, not a hook. So this skill runs **main-session-orchestrated**, the same NO-branch
shape as [`/ddd-decompose`](../ddd-decompose/SKILL.md) and [`/riper`](../riper/SKILL.md): one file,
no master, no new Profile B-orchestrator (the count stays at 1 general + 5 narrow — ADR-023 INV-1).

---

## When to use

- The user has a product idea, a feature request, or a "should we build X" question and wants it
  run through discovery before it becomes a PRD.
- A discovery assumption needs to be tracked with real lifecycle state (not just "we think users
  want this" buried in a chat message).
- An interview happened (or is about to) and its findings need a durable, sourced home.
- User explicitly invokes `/discover-product`, or asks "what should we build", "стоит ли строить",
  "поговорим с пользователем", "проверь эту гипотезу", "jtbd для этой фичи".

## When NOT to use

- The user already knows what to build and just wants implementation — go straight to a PRD via
  `/shape` or route on smith's Row 3 (new feature). Discovery-before-code is for when the *what* is
  still open, not every feature.
- Pure technique lookup with no graph output wanted ("explain JTBD to me", "how do I run an OST") —
  that's what the installed `pm-skills` plugins are for; this skill's value is the bridge, not the
  tutorial.
- Brownfield extraction from existing code (bottom-up, reverse direction) — that is
  [`forgeplan-brownfield-pack`](../../../forgeplan-brownfield-pack/README.md)'s `discover` agent.
  Forward discovery starts from a user; brownfield discovery starts from a repo. ADR-023 rejected
  housing this skill there for exactly that reason (Option C housing rejected).
- Story mapping / decomposing an already-validated discovery PRD into build tasks — that's
  `goal-planner` + `forgeplan_decompose` (register-1 stage `decompose`). `/story-map` is explicitly
  deferred by ADR-023 until that seam demonstrably fails.

---

## Sub-modes

Default (no argument) runs the full Discover→Define→Develop→Deliver walk described below. Two
sub-modes let you enter mid-walk, mirroring the `/smith plan|routing|status` argument pattern —
same skill, same tools, narrower scope:

| Invocation | Scope |
|---|---|
| `/discover-product` | Full walk: Discover → Define → Develop → Deliver → PRD |
| `/discover-product jtbd` | Just the JTBD framing step (Deliver's job-statement work) for a problem/feature that already has a validated `PROBLEM` — skips straight to writing "When [situation], I want [motivation], so I can [outcome]" and checking it against the PRD's Non-Goals |
| `/discover-product assumptions` | Just the Develop step's assumption-mapping — list assumptions, create `hypothesis` artifacts, promote states — for a `PROBLEM` that already exists but whose risky assumptions were never made explicit |

Both sub-modes require an existing `PROBLEM` (or discovery `NOTE`) as their starting point — ask for
its ID if not given; do not fabricate one to make the sub-mode runnable.

---

## Process — the Double Diamond internal walk

### Step 0 — Orient

```bash
pwd
test -d .forgeplan && echo "forgeplan workspace" || echo "no forgeplan — cannot bridge, stop and say so"
command -v forgeplan
```

`.forgeplan/` is required — this skill's whole value is the bridge, so without a forgeplan workspace
there is nothing to hand back to the user beyond what `pm-skills` already produces. If absent, say so
plainly and suggest `/fpl-init` or the general product-discovery skills in `pm-skills`.

Detect MCP availability (`mcp__forgeplan__forgeplan_new` reachable) — MCP-first, CLI fallback for
everything except hypothesis creation, which is **CLI-only regardless** (see Step 4).

### Step 1 — Discover (diverge): the raw material

Ask, don't assume:

> "What's the product question? What made you think about this now — a request, a metric, a
> conversation?"

Capture the starting hypothesis, the target user/segment, and any constraints (timeline, team,
technical). If an interview has already happened or is about to, go to **Interviews** below and
persist it before moving on — Discover is where sourced material enters the graph, not Define.

If the user wants existing research synthesised (competitive landscape, prior user research, internal
data signals) before framing the problem, this is where an orchestrator may dispatch
`agents-pro:research-analyst` (Profile C, **read-only** — its denylist forbids `forgeplan_new` /
`_update` / `_link`, so it returns a synthesis and does **not** persist anything). **This skill (or
the main session running it) is what persists that synthesis** — as raw material folded into the
discovery NOTE in Step 1's Interviews sub-step, never left in the agent's return-only output.

#### Interviews — persisted as a discovery NOTE, sources pinned

Do not call `interview_packet_draft` or `interview_packet_ingest`. Both are core stubs in the running
forgeplan binary — their schema description carries the literal word `STUB` and an envelope that
always returns `not_implemented`. Calling a tool that returns `not_implemented` and counting it as
"wired" is worse than not calling it (ADR-023 INV-6) — it manufactures a false positive on tool
coverage. The blocker is tracked at **marketplace#265**; there is no plugin-side workaround, because a
plugin-shipped MCP server publishes under its own namespace and cannot back the `mcp__forgeplan__*`
tool IDs the core already reserves as stubs.

Instead, for each interview conducted:

1. Ask the user (or read a provided transcript) for: who was interviewed (role/segment, not
   necessarily name if sensitive), when, roughly how many words of transcript, and where the raw
   transcript is stored (a file path, a call-recording link, "not recorded — notes only").
2. Write the transcript (or notes, if no verbatim transcript exists) to
   `docs/discovery/interviews/<YYYY-MM-DD>-<slug>.md` if a local copy doesn't already exist elsewhere
   — this is the "where stored" pointer the NOTE cites.
3. Create the discovery NOTE:

```
# MCP path (preferred)
mcp__forgeplan__forgeplan_new(kind="note", title="Discovery interview — <segment> — <topic>")
```
```bash
# CLI fallback
forgeplan new note "Discovery interview — <segment> — <topic>"
```

Body MUST pin sources — this is the "sources pinned" requirement, not optional colour:

```markdown
## Sources
- **Who**: <role/segment>, <anonymised identifier if needed>
- **When**: <date>
- **Transcript**: ~<N> words, stored at <path or link>, or "notes only — no verbatim transcript"

## Findings
<what was actually said/observed — not what you infer from it; inference goes in the PROBLEM or the hypothesis>
```

An interview whose result was not recorded here did not happen, for this skill's purposes — a
conversation that only lives in chat history evaporates at the PRD boundary exactly the way ADR-023
measured the gap doing.

### Step 2 — Define (converge): the `PROBLEM`

Once enough raw material exists (interviews, data signals, or an explicit "this is an assumption, not
yet validated" label — see **Honesty rails** below), converge it into one problem statement.

> "In one sentence: what's broken, missing, or underserved — and for whom?"

Create one `PROBLEM` artifact **per validated problem, before any PRD**:

```
# MCP path
mcp__forgeplan__forgeplan_new(kind="problem", title="<who> can't <do X> because <why>")
```
```bash
# CLI fallback
forgeplan new problem "<who> can't <do X> because <why>"
```

Link it to its sourcing:

```
mcp__forgeplan__forgeplan_link(source="PROB-NNN", target="NOTE-<interview>", relation="based_on")
```

If the "problem" is really still an assumption — no interview, no data signal, just a hunch — do not
create a `PROBLEM` for it. Route it to Step 4 (Develop) as a `hypothesis` instead, and revisit PROBLEM
creation once it clears the minimum-evidence bar.

### Step 3 — C4 gate before Develop

Before spending Develop-stage effort shaping assumptions into a PRD, dispatch the independent
verifier for what Define just produced:

> Dispatch `agents-pro:artifact-reviewer` (Profile B) via Task, reviewing the discovery NOTE(s) +
> the `PROBLEM` together — the C4 verifier ADR-023 D3 names for this pair (row 10 previously supplied
> one only for the PRD). It reads the NOTE's pinned sources and the PROBLEM's framing and returns an
> EVID with PASS / CONCERNS / BLOCKER.

On BLOCKER or CONCERNS naming a real gap (e.g. sources too thin, problem framing doesn't follow from
the cited findings), go back to Step 1/2 before continuing — do not shape a PRD on top of a problem
statement an independent reviewer flagged as unsupported.

### Step 4 — Develop (diverge): assumption mapping

> "What has to be true for this problem to be worth solving, and for your proposed direction to
> work? List the riskiest ones first."

For each assumption worth tracking, create a `hypothesis` artifact — **CLI-only**:

```bash
forgeplan new hypothesis "<the assumption, stated as a testable claim>"
```

`hypothesis` is absent from `forgeplan new --help`'s kind list and from the MCP `forgeplan_new`
enum (`prd, epic, spec, rfc, adr, problem, solution, evidence, note, refresh`) — it nevertheless
creates a real `HYP-NNN` artifact when called this way (verified live, ADR-023 D1). This is the one
step in this skill that does **not** follow MCP-first: there is no MCP creation path for this kind, so
do not search for one — go straight to the CLI.

Move each hypothesis through its lifecycle as evidence accumulates — this **is** MCP (no CLI
equivalent exists for either call):

```
mcp__forgeplan__forgeplan_hypothesis_promote(
    hypothesis_id="HYP-NNN",
    new_state="inferred",          # parked -> inferred -> strong-inferred -> verified | refuted
    evidence_refs=["NOTE-XXX"],    # or EVID-XXX once formal evidence exists
    rationale="<why this state, in one sentence>"
)
```

Illegal transitions are rejected with a structured error naming the allowed next states — respect
that rather than working around it. Read current state (workspace-wide or per-hypothesis) with:

```
mcp__forgeplan__forgeplan_hypothesis_status(id="HYP-NNN")   # or omit id for the full report
```

Link each hypothesis to the PROBLEM it bears on:

```
mcp__forgeplan__forgeplan_link(source="HYP-NNN", target="PROB-NNN", relation="based_on")
```

Do not shape the PRD in Step 5 around an assumption still at `parked` with no evidence behind it —
either move it toward `inferred`/`strong-inferred` first, or carry it into the PRD explicitly labelled
unvalidated (Honesty rails).

### Step 5 — Deliver (converge): the PRD

Write the PRD's problem statement as a JTBD job statement, not a feature description:

> **When** [situation], **I want** [motivation], **so I can** [outcome].

```
mcp__forgeplan__forgeplan_new(kind="prd", title="<product name/feature>")
```
```bash
forgeplan new prd "<product name/feature>"
```

The PRD body MUST have a non-empty **Non-Goals** section — this is what `guardian`'s D4 rule
structurally checks (a Standard+ PRD with an absent or empty Non-Goals, or that states no user job, is
CONCERNS at the gate, per ADR-023). "We haven't decided yet" is not a substitute for an actual
Non-Goals list; write at least one explicit thing this PRD does **not** cover.

Link the chain:

```
mcp__forgeplan__forgeplan_link(source="PRD-NNN", target="PROB-NNN", relation="based_on")
```

Then dispatch `agents-pro:architect-reviewer` (Profile B) for PRD fitness — is the JTBD framing real
or aspirational, are success criteria measurable, is the scope actually minimal — and `guardian`
(Profile B-gate) before activation, same as any Standard+ PRD.

---

## Sub-mode detail: `jtbd`

Entry: an existing `PROBLEM` (ask for its ID). Skip Steps 1–4; go straight to writing the job
statement and checking it against the target PRD's Non-Goals (create the PRD if none exists yet, same
as Step 5). Useful when the problem was already validated elsewhere (e.g. by `/riper`'s Research NOTE
on a related bug, or by a prior discovery cycle) and only the JTBD framing + PRD shaping remains.

## Sub-mode detail: `assumptions`

Entry: an existing `PROBLEM` or discovery `NOTE` (ask for its ID). Run Step 4 only — list the risky
assumptions, create/promote `hypothesis` artifacts, link them to the PROBLEM. Useful mid-cycle, when
new assumptions surface after the PRD already exists and need tracking without re-running the whole
walk.

---

## Honesty rails

- **Do not manufacture a validated problem out of one interview.** A single conversation is a data
  point, not validation. Minimum evidence to create a `PROBLEM` (rather than routing the claim to a
  `hypothesis`): **≥2 independent sources** (interviews, data signals, or support tickets — not two
  people repeating the same anecdote), **or** an explicit `**Status**: assumption, unvalidated` label
  carried visibly into the PROBLEM body if the team decides to proceed anyway. Never silently treat
  an assumption as validated fact.
- **An experiment or interview whose result was not recorded did not happen.** If the interview NOTE
  or the hypothesis promotion never got written, the discovery step is incomplete regardless of what
  was said in conversation — go back and record it before moving on, don't backfill from memory later.
- **A hypothesis stays at its true state.** Do not promote to `strong-inferred` or `verified` to make
  the walk look further along than the evidence supports — `forgeplan_hypothesis_status` is read by
  whoever reviews this cycle later, and an inflated state is a false record in a log nobody rewrites.

---

## Outputs, in graph terms

A completed discovery cycle produces, minimum:

```
NOTE-XXX  (discovery interview, sources pinned)
   |  based_on
PROB-NNN  (validated problem — or explicitly labelled unvalidated)
   |  based_on               |  based_on
HYP-NNN...  (assumptions,    PRD-NNN  (JTBD job statement +
 lifecycle-tracked)           non-empty Non-Goals)
```

Confirm your own output before calling the cycle done (ADR-023 Confirmation checks C-1..C-3, all
executable by this skill — none of them require the blocked interview-packet tools):

```bash
forgeplan list --type problem      # C-1: your PROBLEM is there
forgeplan list --type hypothesis   # C-2: your hypotheses are there
```
```
mcp__forgeplan__forgeplan_hypothesis_status()   # C-2: lifecycle state moved, not stuck at parked
mcp__forgeplan__forgeplan_graph(id="PRD-NNN")   # C-1/C-3: edges land where you think they do — verify, don't trust the link calls
```

---

## Hand-off

```
✓ Discovery NOTE    NOTE-XXX  (interview sources pinned)
✓ Problem            PROB-NNN  (validated, or labelled unvalidated)
✓ Assumptions         HYP-NNN...  (lifecycle-tracked)
✓ PRD                PRD-NNN   (JTBD framing, non-empty Non-Goals)

Next steps:
  • /forge-cycle "<build PRD-NNN>" once the PRD is active — routes to smith Row 3 (feature) or
    Row 1 (BMAD) depending on scope
  • /discover-product assumptions PROB-NNN — if new risky assumptions surface later
  • /methodology-check PRD-NNN — before activation, confirm the 4-layer pipeline coverage
```

If discovery did **not** produce a clear winner (a real possible outcome — that is what discovery is
for), say so plainly rather than forcing a PRD: leave the PROBLEM and hypotheses as the record, and
note which assumption would need to flip before a PRD is worth writing.

---

## Companion skills

- [`/ddd-decompose`](../ddd-decompose/SKILL.md) — once a discovery PRD is validated and spans multiple
  bounded contexts, decompose it. Different stage: this skill is upstream of "what to build";
  `ddd-decompose` is downstream, on "how to structure what we're building".
- [`/riper`](../riper/SKILL.md) — same NO-branch main-session-orchestrated shape (no master, C4 at
  every gate); use RIPER when the starting point is a production bug requiring investigation, not a
  product question.
- [`/shape`](../shape/SKILL.md) — for a PRD when the *what* is already known; skip discovery.
- `forgeplan-brownfield-pack`'s `discover` agent — the reverse-direction sibling: domain out of
  existing code, not a user in. Different housing, different lifecycle, same vocabulary
  (`hypothesis`, `PROBLEM`) — see ADR-023's housing decision for why they stay separate.
- Third-party `pm-skills` marketplace (`pm-product-discovery`, `pm-market-research`,
  `pm-go-to-market`) — richer technique content (OST, personas, segmentation, GTM). This skill does
  not compete with it; use `pm-skills` for the technique, `/discover-product` to land the outcome in
  the graph.

---

## Anti-patterns

- ❌ **Writing the PRD before the PROBLEM.** The whole point of this skill is that the problem gets a
  graph node *before* the solution does. If you already have a PRD and want to retrofit a PROBLEM
  under it, that's fine — but do not skip creating one for a *new* discovery cycle just because it
  feels faster.
- ❌ **Calling `interview_packet_draft` or `_ingest` "to see what happens".** Both always return
  `not_implemented`. A call that returns that envelope is not wiring, per ADR-023 INV-6 — it is a
  false claim of tool coverage. Use the discovery-NOTE path.
- ❌ **Creating a `PROBLEM` from a single unlabelled hunch.** Route it to a `hypothesis` instead, or
  label it explicitly unvalidated in the PROBLEM body. See Honesty rails.
- ❌ **Leaving hypotheses at `parked` forever.** A hypothesis that never moves is either genuinely
  untested (say so) or was created and forgotten (go back and promote or refute it).
- ❌ **Treating Double Diamond as a forgeplan lifecycle marker.** ADR-022 defines exactly three
  registers of "phase"; Discover/Define/Develop/Deliver are internal steps of this skill and must
  never be written into any of them (ADR-023 INV-4). Don't invent a `phase: discover` field anywhere.
- ❌ **Minting a new orchestrator "just for this cycle".** The ADR-012 острый verdict for product
  discovery is No — a sixth narrow Profile B-orchestrator would need an ADR-012 supersede this skill
  has no authority to grant. If a real cycle proves the skill insufficient, that's a Revisit Trigger
  in ADR-023, not a decision made mid-skill.

---

## References

- **ADR-023** — the decision this skill implements (D1 the bridge, D2 this skill, D3 routing-row
  repair, D4 the guardian rule). `forgeplan get ADR-023` for full reasoning, the ADI cycle, and the
  Confirmation checks this skill's output must satisfy.
- **marketplace#265** — `interview_packet_draft`/`_ingest` core stubs; the tracked swap condition for
  the Interviews sub-step above.
- **routing-map.md row 10** — smith's dispatch context for product discovery; this skill is its
  entry point (ADR-023 D3).
- **sections/10-pdlc-discovery.md** — the fuller methodology chain (JTBD primary, Lean Startup
  secondary, Double Diamond + Event Storming tertiary) this skill executes.
