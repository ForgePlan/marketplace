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

1. **research-analyst** (Profile A) — produces NOTE with attack surface map: external endpoints, auth boundaries, data flows, third-party integrations. Why first: every downstream reviewer needs a map; without one they redo each other's work.
2. **security-expert** (Profile B) — produces EVID covering OWASP Top 10 2025 + STRIDE walk (and ASTRIDE if applicable). Why second: the canonical Profile B security reviewer; outputs verdict per OWASP category + STRIDE category.
3. **injection-analyst** (Profile B) — produces EVID specifically on injection surfaces (SQL, prompt, command, header, log). Why third: injection deserves its own EVID because it's both common and easy to under-test.
4. **pii-detector** (Profile B) — produces EVID on PII exposure surfaces. Why fourth: PII findings often drive mitigation ADRs (tokenisation, encryption-at-rest decisions).
5. **adr-architect** (Profile A, **only if mitigations require architectural change**) — produces ADR-NNN for the chosen mitigation. Why conditional: not every finding needs an ADR; only those that change architecture.
6. **guardian** (Profile B-gate) — produces gate EVID aggregating the three Profile B security EVIDs + any mitigation ADRs.

Note: this row is **audit-only** — no `coder` dispatch in the sequence.
If mitigations require code changes, smith closes this row, then re-routes
to section 03 (feature) or 04 (bug-fix) for each mitigation as a separate
PRD citing this audit's EVIDs.

## Evidence requirements

- [ ] NOTE with attack-surface map
- [ ] security-expert Profile B EVID (OWASP + STRIDE; ASTRIDE if AI)
- [ ] injection-analyst Profile B EVID
- [ ] pii-detector Profile B EVID
- [ ] For each architectural mitigation: ADR-NNN + C4 L1+L2 if ≥3 modules + delta-spec if supersedes
- [ ] BMAD adversarial EVID with ≥1 finding (often satisfied by the security-expert EVID itself if findings ≥1)
- [ ] guardian Profile B EVID with verdict=PASS (or CONCERNS with explicit remediation plan)

## Failure modes

1. **OWASP version mismatch.** Reviewer cites OWASP 2021 in 2026; misses the 2025 category re-org (e.g. cryptographic failures vs sensitive data exposure renaming). **Recovery**: re-run security-expert with explicit instruction to cite OWASP 2025; backfill EVID body.
2. **STRIDE applied at the wrong granularity** — reviewer applies STRIDE to "the API" as one unit instead of per data-flow boundary. Result: misses spoofing between internal services. **Recovery**: produce a data-flow diagram (C4 L2 helps); re-run STRIDE per boundary.
3. **AI surfaces audited with STRIDE only, missing ASTRIDE.** Prompt-injection or model-theft surfaces unflagged. **Recovery**: re-dispatch security-expert with explicit ASTRIDE coverage requirement; cite the AI-specific threats checklist.
4. **PII finding without a defined retention/access policy.** Mitigation ADR can't be written because the team hasn't decided who can see PII for how long. **Recovery**: dispatch `brief-intake` to interview legal/compliance; produce policy NOTE; then proceed with ADR.
5. **Audit concludes "no critical findings" but reviewer never tested.** Reviewer reads the code but doesn't run any tooling (semgrep, gitleaks, dependency-audit). **Recovery**: re-dispatch with explicit tooling requirement; EVID must list tool outputs, not just narrative.

## Example invocation

```
User: "Pre-launch security review of our new LLM-powered customer
      support assistant. We're going live in 2 weeks."

Smith: Context=security-audit (row 8). Methodology=OWASP 2025 + STRIDE +
       ASTRIDE (LLM in scope).
       Dispatch:
       1. research-analyst → NOTE (attack surface: public chat endpoint;
          auth: JWT from existing identity provider; data: ticket history
          fed as context; 3rd party: OpenAI API; data flow diagram inline)
       2. security-expert → EVID covering:
          - OWASP 2025: A01 BAC, A02 Crypto, A03 Injection (incl. prompt),
            A04 Insecure Design, A05 Misconfig, A06 Vulnerable Components,
            A07 ID/Auth, A08 Software/Data Integrity, A09 Logging, A10 SSRF
          - STRIDE per data-flow: user→chat, chat→OpenAI, chat→ticket-db
          - ASTRIDE: prompt-injection HIGH, training-data poisoning N/A
            (no fine-tuning), model-theft LOW
          - Findings: 3 HIGH (prompt-injection, log-PII, missing SSRF guard),
            5 MEDIUM. Verdict CONCERNS.
       3. injection-analyst → EVID (deep-dive on prompt-injection:
          system-prompt isolation insufficient; user can extract context;
          recommendation: structured context envelope. Verdict CONCERNS.)
       4. pii-detector → EVID (ticket history contains PII; sent to OpenAI
          without redaction; recommendation: PII-redaction layer pre-API.
          Verdict CONCERNS.)
       5. adr-architect → ADR-NNN (PII-redaction layer + structured
          context envelope) + c4-diagram (L1+L2, 4 modules)
       6. guardian → gate EVID (CONCERNS with explicit remediation plan:
          3 PRDs to follow; do not launch until those land)

       Evidence required: NOTE + 3 Profile B security EVIDs + ADR +
                          C4 file + guardian EVID
       Methodology refs: OWASP 2025  https://owasp.org/Top10/
                         STRIDE      https://learn.microsoft.com/en-us/azure/security/develop/threat-modeling-tool-threats
                         ASTRIDE     https://arxiv.org/abs/2403.13309
```

## References

- `../routing-map.md` — table row #8
- OWASP Top 10 2025: https://owasp.org/Top10/
- STRIDE: https://learn.microsoft.com/en-us/azure/security/develop/threat-modeling-tool-threats
- ASTRIDE: https://arxiv.org/abs/2403.13309
- This repo's CLAUDE.md — Sprint Z6 (BMAD adversarial findings — security EVIDs satisfy this)
