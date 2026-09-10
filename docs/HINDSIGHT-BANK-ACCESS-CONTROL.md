# Per-bank access control for the self-hosted Hindsight deployment

**Status: a plan, not a decision.** Nothing here is built. It is written so the decision can be made
with the costs and the limits visible, rather than in the abstract. Per the methodology routing, the
decision it leads to belongs in an ADR — including the decision to *accept the risk and wait*, which
is a decision with a price like any other.

**Measured 2026-09-10** against `hindsight.tools.orch.so` and the upstream sources at tag `v0.9.1`
(the deployed version — `GET /version` is open and reports it). Where 0.9.1 and 0.9.2 differ, claims
were re-checked against 0.9.1. Anything not confirmed is marked UNVERIFIED.

---

## The situation, in one paragraph

Authentication is on — a request without a bearer token gets 401. But there is exactly **one key**,
and `GET /v1/default/banks` with it returns **61 banks** spanning every unrelated project on the
machine: billing, VPN, an LMS, research, this marketplace. One key reads and writes all of them.
Banks materialise on first touch, so a dozen of the 61 are directory names that leaked in — `src`,
`docs`, `dev`, `repo`, `shared`, `old`, `k8s`. And `audit_log` is `false`, so there is no record of
who read what: "no evidence of access" is not available as a reassurance, because absence of a log
is not absence of an event.

---

## The seam is wider than the documentation says

This is the finding that changes the plan. The public extensions page describes
`OperationValidatorExtension` as `precheck` + `validate_retain/recall/reflect` + `on_retain_complete`
— and stops. The source carries the hooks that per-bank authorisation actually needs, undocumented:

| Hook | What it governs | Call sites in the engine (0.9.1) |
|---|---|---|
| `validate_bank_read(ctx)` | 36 named read operations | 34 |
| `validate_bank_write(ctx)` | 39 named write operations | 38 |
| `validate_create_bank(ctx)` | refuses **before** the bank row is inserted | 2 |
| `filter_bank_list(ctx)` | narrows what `GET /banks` returns | 1 |
| `filter_mcp_tools(...)` | narrows the MCP tool surface | 1 |
| `validate_retain` / `_recall` / `_reflect` | the three documented abstract methods | 6 |
| `validate_consolidate`, `validate_mental_model_get/refresh` | | 3 |

**~74 check points, and the MCP tools route through the same engine methods** — one implementation
covers both entrances.

**The maintainer answered issue #2235** the day it was filed: *"this request makes sense in
general… Hindsight is intentionally simple in this area… we want to keep it simple. there's already
the extension mechanism for users to fork it."* Adjacent requests are closed `not_planned` with the
same reasoning. There is no roadmap commitment; we are told plainly to build the layer ourselves.

Three constraints to know **before** writing any code:

1. **The validator never receives an `ExtensionContext`.** `set_context` is called on the tenant and
   memory-defense extensions, never on the validator. Touching `self.context` raises. It must be
   self-contained.
2. **`RequestContext.allowed_bank_ids` is a decoy.** The field is declared and used nowhere — three
   hits in the whole tree, all in the model definition and its tests. It is a trace of the
   commercial validator. Do not build on it.
3. **Authorisation state cannot be cached on the request.** Over MCP every tool call rebuilds the
   context from scratch. Identity must be re-derived at every check.

`precheck()` runs **after** authentication and **before** body deserialisation, and only on 8
expensive POST routes — so it is not the primary hook. `validate_bank_read` / `_write` are.

---

## The options

| | Enforces | Does **not** enforce | Cost | How it breaks |
|---|---|---|---|---|
| **A. Own `OperationValidatorExtension`** | all 63 bank routes + all MCP tools; refuses creation of an unknown bank; narrows `GET /banks` | anything *inside* a permitted bank; background operations (`internal=True` skips the extension); `/metrics`, `/version` | 150–250 lines + an image layer; 2–3 days with tests | mostly closed (an exception becomes a 500). The real risk is a **coverage gap** at upgrade |
| **B. Separate instances per project group** | everything, hard — separate processes, databases, keys | anything inside a group; does nothing about the 61 that already exist | ×12 containers, databases, domains, certificates, upgrades | not by security — by you no longer upgrading them |
| **C. Tenant extension with schema isolation** | full database-level isolation **between users** | exactly our problem: a schema is an owner, not a project. One user, a dozen projects | zero development (the package exists upstream) but not in 0.9.1, plus migrating all 61 banks | data written into the wrong schema is invisible from the right one |
| **D. An allowlist inside our own relay** | typos and inattentive agents | **everything else** | hours — the hook point already exists | silently and completely, the moment a request does not go through the relay |
| **E. Hindsight Cloud** | exactly this, already built — bank-scoped keys, 403 on a foreign bank, child keys, cascading revocation | self-hosting. The memory moves to a vendor | subscription (UNVERIFIED) + migrating 61 banks | like any external service |
| **F. Reverse proxy** | HTTP access to a foreign bank, if the rule has no holes | MCP passes the bank in a **header** as well as the path; creating a bank is indistinguishable from writing; `GET /banks` still returns all 61 | half a day, then a permanent chase after new routes | divergence between what the proxy parses and what the app does |
| **G. Tags inside one bank** (the maintainer's suggestion) | nothing for this problem — it is cross-bank, and tags are within a bank and optional at query time | | | rejected |

---

## Recommendation, and its limit

**Option A** — our own validator extension with a key → allowed-banks map, packaged the way upstream
packages its own extensions, covering all six hook families.

Why: it is the only option where the **application itself** refuses, knowing both the bank and the
caller — rather than a middleman inferring intent from a URL. The hooks are already there. It is the
path the commercial version took. The maintainer names it as the supported answer.

**What remains possible under it.** Stated without softening, because a control whose limits are not
written down gets trusted past them:

1. **Whoever holds a project key holds the whole project.** There is no granularity below a bank
   without changes to the core.
2. **The admin key still opens all 61.** It is needed for maintenance and stays the prime target.
3. **A new route without a hook passes straight through.** This is not theoretical: issue #1218 —
   "`delete_memory_unit` bypasses `OperationValidatorExtension`" — was a real bypass, fixed in April.
   Hooks are placed per endpoint, and one endpoint has already been forgotten once.
4. **`filter_mcp_tools` fails open.** It is the one hook that swallows exceptions and returns the
   unfiltered list. What leaks is knowledge of the tool surface, not access — calls still hit
   `validate_*` — but it is the one place that must carry its own `try` returning an empty set.
5. **Background operations skip validation entirely.** Deferred retain, consolidation and mental-model
   refresh run as the system.
6. **`/metrics` and `/version` stay open.** The metrics show continuous bot scanning of this host —
   probes for `/.aws/credentials`, `/.env`, `/.config/gcloud/…`. Not a Hindsight vulnerability, but
   it means any new open route is found within hours.
7. **A confused agent inside its own project still writes nonsense into the right bank.** This
   answers *where*, never *what*.

### About the relay-side allowlist — the limit, in plain words

The hook point is already there: `assertBankId` in `src/lib/client.ts` is a **shape** check (rejects
empty, dot segments, slashes, control characters) sitting on the single choke point through which
every bank-scoped request is built. Adding a membership check there is one branch.

And here is the limit:

> **An allowlist in the relay stops typos and inattentive agents. Nothing more.** The key still opens
> all 61 banks. Any `curl`, any other MCP client, any older build of our own relay — and the
> separation is not there. It is not access control. It is a hint that fires before the mistake costs
> money.

It is still worth building — but as a **separate thing**, not as step one toward the same goal. It
fixes the *source* of junk banks; the server-side validator fixes the *consequence*. Both are needed;
neither substitutes.

### Why identity must come from the key, not a header

A frozen v2.1.0 build of our own relay was found registered in this project, writing to a different
bank. That is a class, not a curiosity. So the identity scheme must demand **nothing new** from the
client.

Under "identity = the Authorization key", an old build behaves predictably and loudly: with a project
key it works; with a revoked shared key it gets 401 on every call, immediately and visibly. One
secret, one rotation. Under "identity in a header", an old build never sends a header it does not
know about, our code must treat that as a refusal, and the result is an old client going silent for a
reason nobody connects to the cause. Headers stay in reserve for telling agents apart *within* a
project — and if used, note the documented trap: a header sent twice is not forwarded at all, only
logged as a warning.

---

## Phases

Each phase names what proves it, in a form someone else could run.

**Phase 0 — inventory (½ day).** All 61 banks with statistics, sorted into three buckets (live /
junk / unclear), with memory counts and last-write dates, and a draft project → banks map.
*Proof:* `banks-inventory.json` where the bank count is 61 and no bank has a null bucket.

**Phase 1 — client side: close the source of junk (1 day).** Three changes in the relay: refuse when
`bankIdSource === "derived-from-directory"`; check membership in `assertBankId` against the project's
declared banks; close or delete the deprecated `deriveBankId`.
*Proof, three specific runs:* (1) starting the relay from `<repo>/src/` with no `.mcp.json` fails
with "bank not declared", and `GET /banks` returns the **same count** before and after; (2) a recall
against a foreign bank id from the wrong directory is refused by the relay, **with no corresponding
entry in the server log** — the request never left; (3) negative control — temporarily remove rule
(1) and run (1) again: it **must** create a bank. A check that cannot fail guarantees nothing.
*Open afterwards:* everything server-side. The same key via `curl` still opens 61.

**Phase 2 — the validator, built and exercised off-production (3 days).** A package covering the
three abstract methods plus `validate_bank_read`, `_write`, `validate_create_bank`, `filter_bank_list`,
`filter_mcp_tools`, `validate_consolidate`, `validate_mental_model_get/refresh`. Identity from
`request_context.api_key`, re-derived per check. The map is a **mounted file**, not an environment
variable — issuing a key must not require rebuilding an image. `filter_mcp_tools` carries its own
`try` returning an **empty** set on any internal error.
*Proof — a local compose with a second Hindsight and an empty database, seven checks:* key A + bank A
+ recall → 200; key A + bank B + recall → 403 with our reason text; key A + bank B + retain → 403 and
**no new bank** in `GET /banks`; retain into a non-existent bank → 403 and `SELECT count(*) FROM banks`
unchanged; `GET /banks` returns only A's banks and `total` matches; the same set over MCP with the
bank in the **path** and in the **`X-Bank-Id` header** — both refused identically; `filter_mcp_tools`
with a deliberately broken map → `tools/list` returns **zero** tools, not all of them.
Plus a table-driven test generated from the operation enums, so a new operation in a future version
**breaks the build** instead of opening a hole. Plus a negative control: corrupt the map so the rule
stops matching, and confirm checks 2–5 go red.

**Phase 3 — shadow deployment (1 day + 3 days waiting).** The validator in production in observe
mode: same computation, `reject` replaced by a WOULD-REJECT log line and `accept()`.
*Proof:* 72 hours of ordinary work with **zero** WOULD-REJECT entries for banks in the "live" bucket.
Any entry is an error in the map, resolved before enforcement.
*Open during:* nothing is enforced for those three days.

**Phase 4 — enforce (½ day).** Per-project keys issued; the shared key revoked from every client
config except one admin key held separately and never given to agents.
*Proof:* re-run all seven checks against production, **reads only, against banks known to be foreign,
never writing into someone else's**. Plus: the old shared key returns 401 on `GET /banks`. Plus: any
old relay build left holding the shared key starts failing **loudly** rather than writing quietly to
the wrong place.

**Phase 5 — turn the audit log on (½ day + observation).** The table and API exist in the core; the
setting is hierarchical (environment → tenant → bank).
*Proof:* `GET /version` reports `"audit_log": true`, and one test recall produces **exactly one**
entry with the expected action, transport and bank. Separately measure the added latency and the
table's growth rate — the audit writes both request and response.
*Note the asymmetry:* this fixes forward and **not backward**. For the entire period of one shared
key, no record will ever exist.

**Phase 6 — key rotation (½ day, after 4).** A project holds a **list** of keys, not one; a new key
is introduced before the old is withdrawn.
*Proof:* during the overlap both keys return 200 for their bank; after removal the old returns 403
and the new 200, with **zero** refusals for working clients in between.

---

## The 61 existing banks

**Under option A, no data moves at all.** The banks stay where they are; only who can read them
changes. That is the practical advantage over schema isolation and over Cloud, both of which require
migration.

- **Live** — entered in the map, attributed to a project.
- **Junk** (`src`, `docs`, `dev`, `repo`, `shared`, `old`, `k8s`, …) — entered in **no** project's
  map. From the moment enforcement starts they are unreachable to everyone but the admin key.
  Deleting them is neither required nor urgent: an unreachable bank does no harm, a deleted one does
  not come back. If a junk bank turns out to hold real notes (auto-retain could have written there),
  its contents come out via `document-transfer/export` into the right bank — per bank, after looking,
  not in bulk.
- **Unclear** — behind the admin key, resolved by hand.

**The source of junk is one line of ours.** When no config declares a bank, the relay names it after
the directory. An agent started in a subdirectory creates `src`. Or `docs`. Or `k8s` — exactly the
names in the list. The good news: the relay **already records** where the name came from, so the
client-side lock is a single condition over an existing field, not new plumbing.

**Two independent locks stop the 62nd, and both are needed.** Server-side, `validate_create_bank` sits
on the single lazy-creation path every write shares, and refuses a name absent from the map *before*
the row is inserted — a typo gets a 403 instead of a new bank. Client-side, refusing a derived bank id
stops the flow at the source; without it the server lock refuses correctly while clients keep
hammering and losing writes. Order matters: client first (phase 1), server later (phase 4), with the
shadow period between them to reveal whether every source of junk names has been found.

---

## Risks

- **The extension can fail open** — one documented case, `filter_mcp_tools`. Cured by its own `try`
  returning an empty set; phase 2 check 7 catches it.
- **The extension can break the MCP surface.** MCP tools call the same engine methods, so our bug
  takes down both HTTP and MCP — and MCP is what agents use. Phase 3 exists for exactly this.
- **A load error takes the service down.** Extensions load at import with no exception handling: a
  typo in a class name means the server does not start. Cured by an import check at image-build time
  and by mounting the map as a file so issuing a key never requires a rebuild.
- **Coverage gaps at upgrade.** Precedent #1218. The enum-driven test catches a new *operation*; it
  does **not** catch an endpoint that never called a hook. Only reading the diff before upgrading
  does — and that has to be recorded as a standing obligation, not a one-off.
- **A project key leaked to a log, a shell history, a screenshot** opens that whole project.
- **No audit means no retrospective answer.** Phase 5 fixes forward only.
- **The host is under continuous scanning.** Visible in the open metrics. Worth deciding separately
  whether `/metrics` and `/version` need to be reachable from outside.

---

## Open questions

1. The state of the draft PR against #2235 — whether it implements something we would otherwise write.
2. Hindsight Cloud pricing (UNVERIFIED) — decides only whether option E stays on the table.
3. What is actually inside the junk banks — until read, "delete or merge" cannot be decided.
4. The cost of the audit log in volume and latency — measured in phase 5, unknown until then.

## Sources

Upstream: `github.com/vectorize-io/hindsight` (MIT, tags v0.9.1 / v0.9.2 / main); issues
[#2235](https://github.com/vectorize-io/hindsight/issues/2235) (open, maintainer answered),
[#1218](https://github.com/vectorize-io/hindsight/issues/1218) (a real hook bypass, fixed),
[#2343](https://github.com/vectorize-io/hindsight/issues/2343) and
[#3183](https://github.com/vectorize-io/hindsight/issues/3183) (both closed `not_planned`),
[#3674](https://github.com/vectorize-io/hindsight/issues/3674) (the static-keys tenant extension,
shipped on `main`). Docs: `hindsight.vectorize.io/developer/extensions`,
`docs.hindsight.vectorize.io/api-keys/` (bank-scoped keys — Cloud only).
