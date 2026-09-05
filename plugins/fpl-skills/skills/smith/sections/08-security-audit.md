# Security audit

## When this applies

The user wants a security review of an existing service, a pre-launch
audit, or coverage against a specific framework (OWASP, SOC2, PCI). Triggers
include "security review", "OWASP audit", "pentest preparation", "secure
this endpoint", "проверь безопасность", "аудит безопасности". If the
trigger is a confirmed active vulnerability or breach, route to section 12
(incident) first.

## Methodology chain

1. **Primary**: OWASP Top 10 2025 — industry-standard checklist coverage; baseline for any web-facing service. Refreshed annually so the version year matters.
2. **Secondary**: STRIDE — Spoofing, Tampering, Repudiation, Information disclosure, Denial of service, Elevation of privilege; threat-modelling per data-flow boundary.
3. **Tertiary**: ASTRIDE — STRIDE extended with AI-specific threats (Adversarial inputs, Model-theft, Training-data poisoning). Mandatory if the service uses LLMs or has model-serving surfaces.

## Dispatch sequence

1. **research-analyst** (Profile C, read-only) — returns the attack-surface synthesis TO THE
   ORCHESTRATOR: external endpoints, auth boundaries, data flows, third-party integrations. Its
   denylist forbids `forgeplan_new`/`update`/`link`, so **the orchestrator persists the NOTE** from
   that synthesis (same pattern as rows 10 and 12). Why first: every downstream reviewer needs a
   map; without one they redo each other's work.
2. **security-expert** (Profile B) — produces EVID covering OWASP Top 10 2025 + STRIDE walk (and
   ASTRIDE if applicable); verdict per OWASP category + STRIDE category. Where the audit covers a
   CLAIMED remediation, the EVID carries `## Ground-truth verification` (Step 4.5) — guardian
   BLOCKs a code-claiming EVID without it.
3. **injection-analyst** (Profile B, allowlist-backed since 2026-09-05) — produces EVID
   specifically on injection surfaces (SQL, prompt, command, header, log). Why its own EVID:
   injection is both common and easy to under-test.
4. **pii-detector** (Profile B, allowlist-backed since 2026-09-05) — produces EVID on PII exposure
   surfaces. Detected secret values stay MASKED in the EVID body — the graph is not a place to
   echo credentials. Why fourth: PII findings often drive mitigation ADRs.
5. **adr-architect** (Profile A, **only if mitigations require architectural change**) — produces
   ADR-NNN for the chosen mitigation. Not every finding needs an ADR.
6. **guardian** (Profile B-gate) — gate EVID aggregating the three Profile B security EVIDs + any
   mitigation ADRs. Guardian BLOCKs any of the three that claims a code change without a
   `## Ground-truth verification` section (guardian Step 5, ML-13 row).

After the three reviewer EVIDs exist, each reviewer emits `<<NEEDS_ACTIVATION>>` — Profile B
cannot activate its own record. **The orchestrator activates the EVIDs** before dispatching
guardian, or guardian reads a draft chain and flags it.

Note: this row is **audit-only** — no `coder` dispatch in the sequence.
If mitigations require code changes, smith closes this row, then re-routes
to section 03 (feature) or 04 (bug-fix) for each mitigation as a separate
PRD citing this audit's EVIDs.

## Interaction contract

| Role | Context | forgeplan tools | Human needed? | FPF allowed? | Skills |
|---|---|---|---|---|---|
| orchestrator (main session) | main | full surface; the only one who ACTIVATES and persists C-synthesis | decides launch on CONCERNS; owns any `--force` (never delegated) | `forgeplan_reason` for mitigation ADI — orchestrator/Profile A territory | `/gate-check`, `/methodology-check`, `/decision` |
| research-analyst | fresh isolated dispatch | READ-only (denylist) | no | no — synthesis, not decisions | — |
| security-expert / injection-analyst / pii-detector | fresh isolated dispatch EACH, **serial** — all three claim the SAME artifact under review, and the claim is a soft mutex that must not overlap | B surface: get/list/new/update/link/validate/score/claim/release; NO activate/reason/claims/memory_retain | no — but an unresolved BLOCKER halts the row until a human or a re-audit clears it | `fpf-evaluate` (Trust Calculus) on contested coverage — yes; `fpf-reason`/ADI — no (belongs to Profile A) | `c4-diagram` via orchestrator if the data-flow diagram is missing |
| adr-architect | fresh isolated dispatch | Profile A surface | one-way-door mitigations (crypto migration, auth change) → human confirms before activation | yes — ADI is its contract | `/decision`, `/supersede` if replacing a prior security ADR |
| guardian | fresh isolated dispatch | B-gate surface | a human may overrule CONCERNS; nobody but the orchestrator executes the verdict | no | — |

Context rule: every dispatch above is a fresh isolated context (ADR-010 C4 — re-labelling one
context is not verification). The three reviewers never share context with each other, with the
orchestrator, or with the author of the code under audit.

## Evidence requirements

1. NOTE with attack-surface map (persisted by the orchestrator from the Profile C synthesis)
2. security-expert Profile B EVID (OWASP + STRIDE; ASTRIDE if AI) — both verdict axes
   (`verdict:` evidence vocabulary, `review_verdict:` PASS/CONCERNS/BLOCKER)
3. injection-analyst Profile B EVID
4. pii-detector Profile B EVID (secret values masked)
5. For each architectural mitigation: ADR-NNN + C4 L1+L2 if ≥3 modules + delta-spec if supersedes
6. BMAD adversarial EVID with ≥1 finding — often satisfied by the security-expert EVID itself; an
   honest zero is legal but lands as CONCERNS with ≥2 sentences on what was checked, never
   auto-PASS
7. guardian Profile B EVID with review_verdict=PASS (or CONCERNS with explicit remediation plan)

(Reference list, not a runtime checklist — numbered per the CLAUDE.md ban on empty `- [ ]` in
committed files.)

## Failure modes

1. **OWASP version mismatch.** Reviewer cites OWASP 2021 in 2026; misses the 2025 category re-org (e.g. cryptographic failures vs sensitive data exposure renaming). **Recovery**: re-run security-expert with explicit instruction to cite OWASP 2025; backfill EVID body.
2. **STRIDE applied at the wrong granularity** — reviewer applies STRIDE to "the API" as one unit instead of per data-flow boundary. Result: misses spoofing between internal services. **Recovery**: produce a data-flow diagram (C4 L2 helps); re-run STRIDE per boundary.
3. **AI surfaces audited with STRIDE only, missing ASTRIDE.** Prompt-injection or model-theft surfaces unflagged. **Recovery**: re-dispatch security-expert with explicit ASTRIDE coverage requirement; cite the AI-specific threats checklist.
4. **PII finding without a defined retention/access policy.** Mitigation ADR can't be written because the team hasn't decided who can see PII for how long. **Recovery**: dispatch `brief-intake` to interview legal/compliance; produce policy NOTE; then proceed with ADR.
5. **Audit concludes "no critical findings" but reviewer never tested.** Reviewer reads the code but doesn't run any tooling (semgrep, gitleaks, dependency-audit). **Recovery**: re-dispatch with explicit tooling requirement; EVID must list tool outputs, not just narrative. A scanner the reviewer could not run is CONCERNS `tool unavailable` — never a silent PASS (reviewer-discipline canon, now in all three reviewer bodies).

## Example invocation

```
User: "Pre-launch security review of our new LLM-powered customer
      support assistant. We're going live in 2 weeks."

Smith: Context=security-audit (row 8). Methodology=OWASP 2025 + STRIDE +
       ASTRIDE (LLM in scope).
       Dispatch:
       1. research-analyst → synthesis to orchestrator (attack surface:
          public chat endpoint; auth: JWT; data: ticket history as context;
          3rd party: OpenAI API) → ORCHESTRATOR writes the NOTE
       2. security-expert → EVID covering:
          - OWASP 2025: A01..A10
          - STRIDE per data-flow: user→chat, chat→OpenAI, chat→ticket-db
          - ASTRIDE: prompt-injection HIGH, model-theft LOW
          - Findings: 3 HIGH, 5 MEDIUM. review_verdict CONCERNS.
       3. injection-analyst → EVID (system-prompt isolation insufficient;
          recommendation: structured context envelope. review_verdict CONCERNS.)
       4. pii-detector → EVID (ticket history contains PII, sent to OpenAI
          unredacted; recommendation: PII-redaction layer. Values masked.
          review_verdict CONCERNS.)
       → orchestrator reads <<NEEDS_ACTIVATION>> ×3, activates the EVIDs
       5. adr-architect → ADR-NNN (PII-redaction layer + structured
          context envelope) + c4-diagram (L1+L2, 4 modules)
       6. guardian → gate EVID (CONCERNS with explicit remediation plan:
          3 PRDs to follow; do not launch until those land)
       → HUMAN decides: launch with the plan, or hold

       Evidence required: NOTE + 3 Profile B security EVIDs + ADR +
                          C4 file + guardian EVID
```

## References

- `../routing-map.md` — table row #8 + agent index (allowlist-backed B since 2026-09-05)
- OWASP Top 10 2025: https://owasp.org/Top10/
- STRIDE: https://learn.microsoft.com/en-us/azure/security/develop/threat-modeling-tool-threats
- ASTRIDE: https://arxiv.org/abs/2403.13309
- This repo's CLAUDE.md — Sprint Z6 (BMAD adversarial findings — security EVIDs satisfy this)
