# Section 06 — AI-driven commands (LLM required)

**5 tools** that require an external LLM provider. Every other forgeplan command is pure-Rust. See `smith-bootstrap` Step 1b for how to wire `forgeplan migrate-secrets --apply` to import keys into `.forgeplan/secrets.env`.

## 06.1 forgeplan_reason — FPF ADI reasoning cycle

The canonical S10 (FPF design layer) tool. Generates 3+ hypotheses (Abduction → Deduction → Induction) for an artifact.

```python
forgeplan_reason(id="PRD-001")
# → {"hypotheses": [{"name": "...", "deduction": "...", "induction": "..."}, ...],
#    "chosen": "...", "rationale": "..."}
```

**Sprint Z7 / PRD-059 enforcement**: every Standard+ artifact MUST have an ADI EVID linked `informs` before activation. The ADI EVID body wraps `_reason`'s output into `### Hypothesis N` sections + `## Chosen` + `## Rationale`.

**Failure mode** (no LLM configured): exits with `Error: LLM not configured` + a `Fix:` hint pointing at `forgeplan setup-skill`. See `smith-bootstrap` Step 1b.

## 06.2 forgeplan_generate — generate artifact from description

LLM fills the body of a fresh artifact from a natural-language description.

```python
forgeplan_generate(kind="prd", description="Sprint 1 docker-compose: Fuseki + Postgres + Redis + MinIO + NATS")
# → creates PRD-NNN with FR / NFR / AC / Out-of-scope sections filled
```

**Use case**: Profile A creators bootstrapping artifact bodies. Faster than hand-authoring but always followed by review + edit. The output is a draft starting point, not a final body.

**Owner**: Profile A (`artifact-author` agent uses this as primary path per AGENT-AUTHORING-GUIDE).

## 06.3 forgeplan_decompose — PRD → RFC tasks

Analyses a PRD's FRs and proposes 3-7 RFC artifacts that would implement it.

```python
forgeplan_decompose(id="PRD-001")
# → {"rfcs": [{"title": "...", "description": "...", "scope": "...",
#              "depends_on": [...]}, ...]}
```

**Owner**: `goal-planner` agent (Profile A) — see `plugins/agents-pro/agents/goal-planner.md`. Uses this output to create the RFC artifacts + the dependency DAG between them.

## 06.4 forgeplan_capture — capture decision from conversation

Auto-classifies a free-form decision statement as Note or ADR + writes it.

```python
forgeplan_capture(decision="We're going with JWT RS256 over symmetric HS256.",
                  context="Auth review meeting 2026-05-21")
# → {"id": "ADR-007", "kind": "adr", "title": "...", ...}
```

**Use case**: capturing real-time decisions during a session without leaving the chat. The agent classifies — architectural decisions become ADRs, lighter decisions become Notes.

## 06.5 forgeplan_route — depth + pipeline suggestion

Suggests Tactical / Standard / Deep / Critical depth for a task description + recommends which artifact kinds to create.

```python
forgeplan_route(description="add OAuth login to the existing app")
# → {"depth": "standard", "pipeline": ["brief-intake", "specification", "architecture", "coder"]}
```

**Two levels**:

- Level 1 (LLM) — when API key is configured, full reasoning over the description.
- Level 0 (rule-based keywords) — fallback when LLM unavailable. Catches obvious keywords like "security", "breaking", "migration" but misses nuance.

**Owner**: `smith` (Profile B-orchestrator) calls this from `/smith-plan` to pick a row in the 12-context routing matrix.

## When to skip these and write the body manually

LLM tools are powerful but not always cheap or fast. Skip when:

- The artifact body is short (<200 words) — write directly.
- The LLM provider isn't configured in `.forgeplan/config.yaml`.
- You need deterministic output for CI — LLM responses vary across runs.
- The artifact is a refresh / version bump of an existing one — copy + edit is faster.
