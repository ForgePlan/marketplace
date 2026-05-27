# Section 08 — Brownfield discovery and hypothesis verification

**7 tools** for onboarding legacy codebases (PRD-026 / PRD-048 / issue #287). Three discover_*, two hypothesis_*, two interview_packet_* (stubs).

## 08.1 forgeplan_discover_start — open a discovery session

Returns the 7-phase discovery protocol (detect / structure / code / git / tests / docs / synthesize) that the agent then follows.

```python
forgeplan_discover_start(project_name="legacy-billing-api")
# → {"session_id": "discover-2026-05-27-...", "protocol": {7 phases}, ...}
```

**Owner**: `forgeplan-brownfield-pack:discover` (Profile A, migrated from standalone in Sprint V).

## 08.2 forgeplan_discover_finding — report a finding mid-session

Agent calls this after analysing a file / module / git-log during a phase. Creates the relevant artifact (note / prd / rfc / problem / evidence) + tags + links to the session.

```python
forgeplan_discover_finding(
    session_id="discover-2026-05-27-...",
    phase="code",
    tier=2,
    kind="problem",
    title="Auth middleware has no test coverage",
    body="...",
    source_files=["src/auth/middleware.ts", "src/auth/jwt.ts"]
)
# → {"artifact_id": "PROB-NNN", "linked_to_session": true}
```

**Tier semantics**:

- Tier 1 — high-confidence direct observation (function exists, has no tests, fact in git log)
- Tier 2 — inferred from patterns (smell, anti-pattern, missing thing that should exist)
- Tier 3 — hypothesis needing verification (could be intentional, could be a bug)

**Important**: see Anomaly #14 (CLAUDE.md) — `discover_finding` response `status: active` refers to session status, NOT artifact status. The created artifact is in `status=draft`.

## 08.3 forgeplan_discover_complete — close session, emit report

Generates a summary report (findings per phase per tier), runs `forgeplan health`, marks session completed.

```python
forgeplan_discover_complete(session_id="discover-2026-05-27-...")
# → {"summary": {...}, "artifacts_created": 23, "health_after": "needs_attention", ...}
```

## 08.4 forgeplan_hypothesis_promote — verification state machine

Moves a HYP-NNN artifact along the verification state machine: `parked → inferred → strong-inferred → verified` (or any → `refuted`, or any → `parked`).

```python
forgeplan_hypothesis_promote(
    hypothesis_id="HYP-003",
    new_state="strong-inferred",
    evidence_refs=["EVID-014", "EVID-015"],
    rationale="Verified across staging + prod logs sampling 2026-05-27"
)
```

Rejects illegal transitions with structured error enumerating allowed next states.

## 08.5 forgeplan_hypothesis_status — query lifecycle state

Workspace-wide distribution + recent transitions per HYP.

```python
forgeplan_hypothesis_status()              # full workspace report
forgeplan_hypothesis_status(id="HYP-003")  # one hypothesis
```

## 08.6 forgeplan_interview_packet_draft — STUB (marketplace#79)

Draft an interview packet to validate brownfield hypotheses. Full impl ships with `forgeplan-brownfield-pack` plugin.

```python
forgeplan_interview_packet_draft(domain="auth", seed_ids=["HYP-003", "INV-005"])
# Stub returns "not_implemented" envelope so agents can detect the gap.
```

## 08.7 forgeplan_interview_packet_ingest — STUB (marketplace#79)

Ingest a completed interview transcript, propose HYP / UC / INV artifacts.

```python
forgeplan_interview_packet_ingest(transcript_path=".forgeplan/interviews/2026-05-27.md")
```

## Discovery workflow — full pattern

```python
# 1. Start session
sess = forgeplan_discover_start(project_name="legacy-api")
session_id = sess["session_id"]

# 2. Walk the 7 phases. Each iteration:
#    - Read source files relevant to the phase
#    - Call forgeplan_discover_finding for each observation
for phase in ["detect", "structure", "code", "git", "tests", "docs", "synthesize"]:
    findings = analyze_for_phase(phase, project_files)
    for f in findings:
        forgeplan_discover_finding(session_id=session_id, phase=phase, **f)

# 3. Close session
report = forgeplan_discover_complete(session_id=session_id)

# 4. (Optional) Walk hypotheses through verification
for hyp in get_hyp_artifacts():
    state = decide_state(hyp, evidence)
    forgeplan_hypothesis_promote(hypothesis_id=hyp.id, new_state=state, ...)
```

See `plugins/forgeplan-brownfield-pack/agents/discover/discover.md` for the canonical 7-phase walk.
