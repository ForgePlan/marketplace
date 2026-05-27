# Section 07 — Multi-agent coordination

**4 tools** for sub-agent coordination + parallel dispatch.

## 07.1 forgeplan_claim — claim artifact for exclusive work

Writes `.forgeplan/claims/<id>.yaml` with agent identity + TTL. Advisory (other tools don't block on claims), but orchestrators use claims to avoid double-assigning work.

```python
forgeplan_claim(id="PRD-057", agent="adr-architect/1.11.1",
                ttl_minutes=30, note="working on ADR-006 supersede")
# → {"claim_id": "...", "expires_at": "...", "message": "Claimed PRD-057"}
```

**Refuses** if a live claim by a different agent exists. Same-agent calls renew the TTL.

**Owner**: every agent that mutates state — Profile A / D before they start writing. Orchestrator may claim on behalf of a sub-agent (Profile B-orchestrator).

## 07.2 forgeplan_claims — list live claims

Read-only. Returns active claims sorted by expiry ascending.

```python
forgeplan_claims()
# → [{"id": "PRD-057", "agent": "adr-architect/1.11.1", "expires_at": "...", "note": "..."}, ...]
```

**Use case**: orchestrator dispatcher checks who's holding what before assigning work. Skips claimed artifacts.

## 07.3 forgeplan_release — release a claim

```python
forgeplan_release(id="PRD-057", agent="adr-architect/1.11.1")
# Idempotent — missing claim = success.

# Orchestrator escape hatch for crashed sub-agents:
forgeplan_release(id="PRD-057", force=true)
```

**Convention**: agents release at the end of their work, even on failure. Stale TTL eventually clears the claim but force-release is faster.

## 07.4 forgeplan_dispatch — parallel-safe work plan for N sub-agents

Computes how to bucket draft artifacts across N sub-agents without file conflicts. Skips claimed artifacts. Routes by `agent_skills` domain match when provided.

```python
forgeplan_dispatch(agents=4)
# → {"buckets": [["PRD-001"], ["PRD-002", "PRD-003"], ...],
#    "serial_queue": ["PRD-005"], "reasoning": "PRD-005 deferred — overlap with bucket 2"}

forgeplan_dispatch(agents=3,
                   kind="rfc",
                   agent_skills=[["typescript"], ["rust"], ["python"]],
                   overlap_threshold=0.3)
```

**Conflict detection**: Jaccard similarity on `affected_files:` frontmatter. Threshold default 0.3 — above that, artifacts go to the serial queue.

**Use case**: Profile B-orchestrator (`smith`) computes the dispatch plan, then dispatches each bucket to a sub-agent via host CLI's Task tool.

## Composition pattern — orchestrator drives N parallel sub-agents

```python
# 1. Read state
session = forgeplan_session()
plan = forgeplan_dispatch(agents=N, status="draft")

# 2. Claim each artifact (one per agent)
for bucket_idx, bucket in enumerate(plan["buckets"]):
    for artifact_id in bucket:
        forgeplan_claim(id=artifact_id, agent=f"sub-agent-{bucket_idx}", ttl_minutes=60)

# 3. Dispatch (host-CLI specific — Claude Code Task tool, Codex agent invocation, etc.)
for bucket_idx, bucket in enumerate(plan["buckets"]):
    Task(subagent_type=plan["agent_skills"][bucket_idx][0],
         prompt=f"Process artifacts {bucket}")

# 4. After sub-agents finish, release the claims
for bucket in plan["buckets"]:
    for artifact_id in bucket:
        forgeplan_release(id=artifact_id, agent=f"sub-agent-{...}")
```

See `plugins/forgeplan-workflow/agents/forge-orchestrator.md` for the canonical implementation.
