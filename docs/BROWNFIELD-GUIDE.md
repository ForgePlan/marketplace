[English](BROWNFIELD-GUIDE.md) | [Русский](BROWNFIELD-GUIDE-RU.md)

# Brownfield guide — working in an existing codebase

> ForgePlan Marketplace in legacy repos. When you didn't write the code but now you have to ship in it.

## When this guide applies

You should be reading THIS guide (not [ONBOARDING.md](ONBOARDING.md)) if:

- The repo has >100 commits when you arrived
- There's code you didn't write — and someone other than you authored most of it
- There are conventions you have to follow that aren't documented anywhere
- You can't just "rewrite it" — there are users depending on it being up
- The test suite is partial, flaky, or you don't fully trust it
- The dependency graph has at least one library on a major version older than current

If your repo is fresh (`git log` is empty or near-empty, you're authoring the second commit, no one else has touched it) → read [ONBOARDING.md](ONBOARDING.md) first. Greenfield uses a different methodology row in smith's routing matrix (row 1 — BMAD-METHOD + Spec Kit). Brownfield uses row 2 — Strangler Fig + DDD + Anti-Corruption Layer. The two are not interchangeable.

## Why brownfield is harder

Greenfield is a blank page — you author the first line, you set every convention, the only constraint is the problem itself. Brownfield is the opposite. You inherit legacy gravity: undocumented assumptions baked into the data model, conventions enforced only through code review, dependencies you can't upgrade because three other things depend on the broken behavior, and a test suite that tells you what *used* to be true but not what's true today.

You also inherit the fear of breaking things. In greenfield, breaking a feature means refactoring your own code from yesterday. In brownfield, breaking a feature means a production user — one you have never met — discovering at 3am that the report they run every morning now returns the wrong number. That fear is rational, and it changes the calculus on every change you make.

This guide does not pretend that fear away. What it does is name the patterns that have a track record of working under brownfield constraints — and tell you which ones to skip when the constraints don't actually apply.

## Step 0 — Prerequisites

Install the standard ForgePlan Marketplace plugins, plus the brownfield-specific one:

```bash
# Standard set — same as greenfield onboarding
/plugin install fpl-skills@ForgePlan-marketplace
/plugin install agents-pro@ForgePlan-marketplace
/plugin install agents-sparc@ForgePlan-marketplace
/plugin install agents-core@ForgePlan-marketplace
/plugin install fpf@ForgePlan-marketplace
/plugin install fpl-hsmem@ForgePlan-marketplace

# Brownfield-specific — the Discover Agent lives here
/plugin install forgeplan-brownfield-pack@ForgePlan-marketplace
```

> [!TIP]
> The brownfield pack ships the canonical `discover` agent — a Profile A creator that runs the 7-phase MCP discovery protocol and seeds your forgeplan artifact graph from the existing code. You will use it as the first step in nearly every brownfield engagement.

## Step 1 — Don't bootstrap; discover first

`/smith-bootstrap` is for empty repos. It seeds a Brief, a first PRD, and a first ADR. On a brownfield repo with 100+ commits, none of that is what you want — you don't need to invent context; the code already contains it. You need to extract it.

For brownfield you want:

```bash
/discover
```

Or invoke smith in its default mode and let it route you:

```bash
/smith
```

On brownfield, `/smith` reads `git log`, finds you have history, and routes to row 2 (brownfield modernisation) of the [routing matrix](../plugins/fpl-skills/skills/smith/routing-map.md). The first agent it dispatches is `discover` from `forgeplan-brownfield-pack`.

> [!WARNING]
> Do not run `/smith-bootstrap` on a brownfield repo. It assumes greenfield conditions and will produce a Brief that contradicts what the code actually does. If you've already run it by mistake, deprecate the artifacts it created (`forgeplan_deprecate <ID>`) before continuing — old artifacts that conflict with reality poison every subsequent automated review.

## Step 2 — What Discover Agent does (the 7-phase MCP protocol)

The Discover Agent runs a **strict source-tier priority**: Tier 1 (code, git log, manifests, schemas) wins over Tier 2 (tests, JSDoc, CI configs) wins over Tier 3 (docs/, README, wiki). If docs contradict code — code wins, and the contradiction itself becomes a PROBLEM artifact. This is non-negotiable: brownfield docs are usually stale, and trusting them is the most common way discoveries go sideways.

The 7 phases run in sequence (canon — never skip ahead to docs):

**Phase 1 — detect.** Identify language(s), framework(s), runtimes, monorepo structure. Reads `package.json`, `Cargo.toml`, `go.mod`, `pyproject.toml`, `composer.json`, `Gemfile`, etc. Output: 1 NOTE artifact classifying the project type (Monolith / Microservices / Monorepo / Frontend SPA / Data Pipeline).

**Phase 2 — structure.** Walk the directory tree to 3 levels of depth, identify module boundaries and entry points. Output: 1 NOTE with the module tree, candidate bounded contexts, and entry-point map.

**Phase 3 — code.** Read entry points and key modules; map public API surface, owned types, and database schemas. Output: 1 root PRD ("Project Overview") + 1 RFC per major module describing its public API, owned types, and dependencies.

**Phase 4 — git.** Pull `git shortlog -sn`, recent commits, and the most-changed files. Output: 1 NOTE on contributors + activity + hot files + 1 PROBLEM artifact per identified tech-debt signal (high-churn module, large diffs, frequent renames).

**Phase 5 — tests.** Count test files vs source files, identify the framework, sample coverage patterns. Output: 1 EVIDENCE artifact with verdict (PASS / CONCERNS / BLOCKER) on the test baseline.

**Phase 6 — docs (always last in Pass 1).** Read `docs/`, `README.md`, `CHANGELOG.md`. Tag every finding `[legacy-doc]` because it's Tier 3. Cross-reference against Phase 3 code findings — every contradiction becomes a PROBLEM artifact stating "doc says X, code does Y".

**Phase 7 — synthesize.** Run `forgeplan_orphans` + `forgeplan_contradictions` to surface unlinked or conflicting findings. Output: 1 EVIDENCE artifact summarising the discovery — mode, phases done, top 5 findings, contradictions, recommended next steps.

The discover agent closes its session with `forgeplan_discover_complete`, then emits `<<NEEDS_ACTIVATION: ARTIFACT-ID>>` sentinels for every draft artifact so the orchestrator activates them. After that, your `forgeplan health` reflects an actual map of the repo, and downstream agents (architect-reviewer, ddd-domain-expert, security-expert) can route off it.

> [!TIP]
> For repos >100K LOC, run `/discover --deep`. For >2M LOC or business-critical, run `/discover --full`. Both add deepening passes that fan out parallel sub-agents per module RFC. See the [Discover Agent README](../plugins/forgeplan-brownfield-pack/agents/discover/README.md) for mode details.

## Step 3 — Common brownfield situations + how to handle them

### Situation A: Modernize a monolith

> Example: a Rails 5 monolith with 200 routes, 80 models, and a `User` model that's grown to 47 fields covering auth, billing, profile, and preferences.

**Pattern**: Strangler Fig + DDD bounded contexts + Anti-Corruption Layer. This is smith routing-map row 2 — the canonical brownfield trinity.

**Sequence**:

```bash
/discover                                              # Pass 1: 7-phase map of what's there
/smith-plan "modernize the User domain into bounded contexts"
# smith picks row 2 → dispatches ddd-domain-expert (A) → adr-architect (A)
forgeplan_reason PRD-NNN                               # ADI ≥3 hypotheses: lift-and-shift / Strangler / leave-alone
# author the chosen-hypothesis ADR with delta-spec
# implement strangler vertical: new code reads from legacy via ACL, writes to new + legacy
```

Failure mode: trying to do all 80 models in one PR. Each Strangler vertical is one bounded context at a time. The Rails monolith stays running the whole time.

### Situation B: Add a new feature to legacy

> Example: add a "team subscriptions" feature to a 5-year-old SaaS that only ever supported individual subscriptions.

**Pattern**: Anti-Corruption Layer + Hexagonal core for the new feature. Don't pollute the legacy `Subscription` model — wrap it.

**Sequence**:

```bash
/smith-plan "add team subscriptions alongside individual subscriptions"
# smith picks row 3 (new feature in existing service) → SPARC + Hexagonal
# OR row 2 if the change really requires touching legacy boundaries — smith decides
# specification (A) → architecture (A) → coder (C-coder)
```

The ACL is a single class — `LegacySubscriptionAdapter` — that translates between the new `Team` aggregate and the old `Subscription` row. New code never sees `Subscription` directly.

Failure mode: skipping the ACL "because it's just one extra layer". Three months later the new `Team` code is full of legacy-shaped concerns and refactoring it costs more than building it did.

### Situation C: Refactor without breaking

> Example: split the 47-field `User` model into `User` (identity) + `Account` (billing) + `Profile` (display) + `Preferences` (config).

**Pattern**: Branch-by-Abstraction + Mikado Method. The old and new must coexist on `main` for weeks while you migrate readers and writers one at a time.

**Sequence**:

```bash
/smith-plan "split User model into 4 bounded contexts"
# smith picks row 6 (refactoring) → Branch-by-Abstraction + Mikado
# architect-reviewer (B, pre-refactor) → adr-architect (A) → coder (C-coder)
# → architect-reviewer (B, post-refactor)
```

You write the new abstractions first, ship them behind a feature flag, migrate readers one at a time, migrate writers, then delete the old code. Mikado tracks the dependency tree as you walk it — every time you discover a prerequisite, write it down before doing it.

Failure mode: skipping the post-refactor architect-reviewer EVID. Without it you've made the code different, not better, and the BMAD adversarial gate has nothing to point at.

### Situation D: Upgrade a major dependency

> Example: Rails 5 → 7, React 16 → 18, Node 14 → 20.

**Pattern**: Branch-by-Abstraction per module. Upgrade one module at a time, behind a flag, with a regression test bench you trust.

**Sequence**:

```bash
/smith-plan "upgrade React 16 to 18"
# smith picks row 6 (refactoring) — major upgrade is a refactor with deadline
# research-analyst (A) → architect-reviewer (B) → coder (C-coder, per module)
# → tester (B, regression suite per module)
```

Known failure modes: deprecated APIs that compile but behave differently (e.g. React 18 automatic batching), peer-dependency cascades (TypeScript major bump pulling 30 type packages), and library-specific breaking changes you didn't know existed because they were buried in a CHANGELOG. The Discover Agent's Phase 4 (git) often surfaces the modules most likely to hide these — the high-churn ones.

### Situation E: Security audit on legacy code

> Example: pre-SOC2 audit, or post-breach hardening.

**Pattern**: OWASP Top 10 2025 + STRIDE threat modelling, plus ASTRIDE if the system has AI components.

**Sequence**:

```bash
/smith-plan "OWASP audit of the auth + payment paths"
# smith picks row 8 (security audit)
# research-analyst (A) → security-expert (B) → injection-analyst (B)
# → pii-detector (B) → adr-architect (A, for mitigations) → guardian (B-gate)
```

Output: 3 Profile B EVIDs (one per reviewer), each with `## Findings` listing concrete CWEs and remediation steps. Any mitigation that changes architecture becomes an ADR. Tactical mitigations (input validation, output encoding) get filed as fix PRs without an ADR.

### Situation F: Pay down tech debt

> Example: 200 lint warnings, a 1500-line god class, and three deprecated APIs scattered through the codebase.

**Pattern**: A3 Problem Solving (Toyota one-page format) + Fishbone diagram for root cause. Tech-debt sprints fail when the team can't articulate out loud *why* paying this debt now is worth it.

**Sequence**:

```bash
/smith-plan "tech debt cleanup sprint for Q3"
# smith picks row 11 (tech debt cleanup) → A3 + Fishbone
# code-analyzer (C) → research-analyst (A) → architect-reviewer (B)
# → adr-architect (A) → coder (C-coder) → tester (B)
```

The A3 sheet — Background / Current state / Target state / Analysis / Countermeasures / Plan / Follow-up — fits on one page. If you can't fit it on one page, you're trying to fix too many things at once. Pick one.

### Situation G: Fix a production bug

> Example: race condition in the payment webhook, or a regression report from a customer.

**Pattern**: RIPER-5 (Research-Innovate-Plan-Execute-Review) + 5 Whys root-cause. Same as greenfield row 4 — the methodology doesn't change just because the codebase is old.

**Sequence**:

```bash
/smith-plan "fix the duplicate-charge bug in webhook handler"
# smith picks row 4 (production bug)
# debugger (C) → error-detective (C) → research-analyst (A)
# → coder (C-coder) → code-reviewer (B) → tester (B)
```

The 5 Whys forces you past the first plausible cause. The Research phase of RIPER-5 prevents the common pattern of "patch the symptom, move on, see the same bug in 6 weeks under a different presentation".

## Step 4 — Strangler Fig + DDD + ACL — the brownfield trinity

These three patterns are smith's row 2 (brownfield modernisation) primary methodologies. They work together, and each one alone is not enough.

**Strangler Fig** (Martin Fowler). You don't rewrite. You grow the new system *around* the legacy until the legacy is small enough to safely retire. The metaphor is a strangler fig vine that grows around a host tree, eventually replacing it without ever cutting it down. At any point during the migration both old and new are running; at the end the old is gone but no big-bang cutover was ever required. This is risk-averse by design — the legacy keeps generating revenue the whole time.

**DDD bounded contexts** (Eric Evans). Find the seams in the legacy where one "domain" ends and another begins. A 47-field User model usually contains 3-5 hidden bounded contexts that the original author never extracted. The seams are where the field names change tone — `email` and `password_hash` (Identity) sit next to `stripe_customer_id` and `billing_address` (Billing) sit next to `display_name` and `avatar_url` (Profile). Each is a different bounded context with its own ubiquitous language. Strangler Fig works one bounded context at a time — DDD names the contexts.

**Anti-Corruption Layer** (DDD tactical pattern). A translation layer between the old legacy concepts and the new clean domain concepts. The ACL absorbs all the legacy weirdness so the new code never has to. Without it, the new domain model gets polluted within weeks — a legacy field used by one consumer becomes an attribute on your clean entity "just for now", and that "just for now" never ends.

### Concrete example — the 47-field User

Starting state: a Rails 5 `User` model with 47 fields covering auth state, billing data, display profile, and notification preferences. Every other model has `belongs_to :user`. The `User` model file is 1200 lines.

DDD analysis identifies 4 bounded contexts inside the existing model:

| Context | Fields (sample) | Owner role |
|---|---|---|
| **User** (Identity) | `email`, `password_hash`, `mfa_enabled`, `last_login_at` | who you are |
| **Account** (Billing) | `stripe_customer_id`, `plan_tier`, `billing_email`, `seat_count` | how you pay |
| **Profile** (Display) | `display_name`, `avatar_url`, `bio`, `timezone` | how others see you |
| **Preferences** (Config) | `email_notifications`, `digest_frequency`, `theme` | what you've configured |

Strangler Fig vertical for `Profile`:

1. Create new `Profile` aggregate as a separate table + Hexagonal repository
2. Write the `LegacyProfileAdapter` ACL: reads from `users.display_name`, etc., writes to both old User row and new `profiles` row
3. Behind a feature flag, route new writes through the ACL
4. Backfill the `profiles` table from `users`
5. Migrate readers one consumer at a time (50+ call sites — Mikado Method tracks them)
6. Once all readers migrated, stop dual-writing — only the new path
7. Delete the legacy fields from `users`

At step 7 the legacy is dead for `Profile`. The old `User` shrank by 4 fields. You can then start the next vertical (`Account`, `Preferences`, etc.). The Rails app stayed running the whole time and no migration window was ever needed.

This is the trinity in action. Strangler Fig is the strategy; DDD names the seams; ACL keeps the new code clean while the legacy is still alive.

## Step 5 — When NOT to use smith automation

Smith is not always the right tool. Be honest with yourself about which case you're in:

- **Tiny one-line fixes.** A typo in an error message, a missing semicolon, a README spelling error. Manual `git commit` is faster than orchestrating a dispatch. Smith's overhead exceeds the value.
- **Exploratory spikes.** A spike is by definition an experiment you might throw away. Smith wants to pick a methodology and produce evidence; spikes skip methodology to learn faster. Use smith *after* the spike to choose the methodology for the real work.
- **Codebases you're throwing away in 3 months.** A migration project where everyone knows the current code is dead in 90 days. The automation overhead exceeds the value because you'll never benefit from the artifacts.
- **Incidents at 3am.** Smith CAN handle incident response (row 12) but for the first 10 minutes of a fire, a human + a runbook is faster than a routing matrix. Use smith for the post-incident PRD + ADR, not for stopping the bleeding.

> [!TIP]
> Rule of thumb: smith pays off when (a) the artifact needs to survive sessions, (b) the team needs the same methodology applied consistently, (c) the work has multiple coordinated steps. Otherwise just do it.

## Step 6 — Common pitfalls + recovery

**Discover Agent produces 7 phases of "this is what the repo is" but what do I DO with it?** That's the input, not the output. Discovery is the map; the situation patterns in Step 3 are the routes. Pick one and call `/smith-plan <task>` — the artifacts discovery seeded give downstream agents (architect-reviewer, ddd-domain-expert, security-expert) the context they need to do their actual work. A common mistake is treating discovery itself as deliverable; it's not — the modernisation PR / ADR / refactor branch is the deliverable, and discovery just makes those possible without reading the entire repo first.

**ACL gets bloated and becomes its own legacy.** Re-evaluate the boundary. Sometimes the ACL is doing too much because the bounded contexts you drew are wrong — split the ACL into two. Sometimes the ACL is bloated because you're trying to keep both old and new alive long after the migration was meant to finish — write an ADR with a hard deadline and supersede when the deadline lands.

**Strangler Fig gets stuck mid-migration.** Some routes are new, some are old, both are maintained, and the team forgot about it. This is the most common failure mode. Forcing function: write an ADR with a deadline + supersede when the last legacy route lands. Without a deadline, mid-migration is the steady state.

**Brownfield discovery produces 7 draft artifacts that clutter `forgeplan_health`.** Either run `/forge-cleanup` to deprecate the ones that no longer reflect reality, or use `forgeplan_deprecate` directly. Don't leave drafts hanging — they fail validation gates and confuse subsequent automated review.

**Smith routes to row 6 (refactor) but you needed row 2 (full modernisation).** Tell smith explicitly which row, or refine the task description. The routing matrix is deterministic given a clear task; ambiguous task descriptions produce ambiguous routes. If two rows genuinely tie, smith emits `<<NEED_USER_INPUT>>` and stops.

**Tests are flaky, missing, or lie.** Write a regression test FIRST, before any refactor. That's the Mikado Method's gating step — you don't touch the implementation until you have a test that fails for the right reason. If the existing tests are unreliable, the cost of a wrong refactor is unbounded.

**Dependency upgrade breaks 50 things.** Don't try to fix all 50 in one PR. Branch-by-Abstraction one module at a time, ship each module independently, fix one consumer at a time. The big-bang upgrade is the most common way major dependency upgrades become 6-month projects.

**The bounded contexts I drew don't match how the team talks.** That's a DDD ubiquitous-language gap, not a brownfield problem. Run `ddd-domain-expert` on the discovery output — it surfaces the vocabulary the code actually uses versus the vocabulary the team uses in standups. The mismatch itself is often the most valuable finding of the engagement. Re-draw the contexts using the team's terms, not the code's.

**Production users depend on legacy behaviour I think is a bug.** Don't fix it silently. The "bug" may be load-bearing for an external workflow you've never seen. Write an ADR documenting the legacy behaviour, decide explicitly whether to keep it, deprecate it with a deadline, or replace it. Strangler Fig gives you the runway to do this without breaking anyone.

## Step 7 — Where to go next

- Companion: [ONBOARDING.md](ONBOARDING.md) (greenfield)
- Discover Agent details: [`../plugins/forgeplan-brownfield-pack/agents/discover/`](../plugins/forgeplan-brownfield-pack/agents/discover/)
- Methodology cards (Strangler Fig, DDD, ACL, Branch-by-Abstraction, Mikado, A3, Fishbone): [SMITH.md](SMITH.md) + [METHODOLOGIES.md](METHODOLOGIES.md)
- 4-Layer Pipeline foundations: [ARCHITECTURE.md](ARCHITECTURE.md)
- Use-case matrix: [PLAYBOOK.md](PLAYBOOK.md)

## Credits & License

Brownfield guide for ForgePlan Marketplace. MIT license.
