[English](README.md) | [Русский](README-RU.md)

# FPF Plugin -- Think Before You Build

**FPF is a thinking amplifier for engineers.** It gives your AI assistant structured reasoning from first principles -- so decisions are traced, decompositions are clean, and nothing is hand-waved.

## Credits

- **FPF Specification** by [Anatoly Levenchuk](https://github.com/ailev) -- [github.com/ailev/FPF](https://github.com/ailev/FPF)
- **Skill packaging** by [CodeAlive-AI](https://github.com/CodeAlive-AI) -- [fpf-simple-skill](https://github.com/CodeAlive-AI/fpf-simple-skill)
- **Enhanced plugin** by [ForgePlan](https://github.com/ForgePlan) -- commands, agent, applied patterns, forgeplan integration

## Quick Start

```bash
/plugin install fpf@ForgePlan-marketplace   # install
/fpf                                        # see all modes
/fpf decompose my auth system               # start reasoning
```

## Usage Examples

### Decompose a system into bounded contexts

```
> /fpf decompose our e-commerce platform

Applying FPF Bounded Contexts (A.1.1)...

| Context | Responsibility | Key Roles | Interfaces |
|---------|---------------|-----------|------------|
| Catalog | Product data, search, categories | Product Manager, Search Engine | -> Cart (product lookup) |
| Cart | Shopping cart, pricing, discounts | Pricing Engine | -> Checkout (cart contents) |
| Checkout | Payment, order creation | Payment Gateway | -> Fulfillment (order) |
| Fulfillment | Shipping, tracking, returns | Warehouse System | -> Catalog (stock updates) |
| Identity | Auth, profiles, permissions | Auth Provider | -> All (user context) |

Category error check (A.7): No role/function confusion detected.
Suggest creating forgeplan artifacts for each context? [y/n]
```

### Evaluate alternatives with evidence-based scoring

```
> /fpf evaluate PostgreSQL vs SQLite for our backend

Applying F-G-R Scoring (C.2) + ADI Reasoning...

ABDUCTION (3 hypotheses):
  H1: PostgreSQL -- handles concurrent writes, scales with team
  H2: SQLite -- simpler ops, faster for single-user, embedded
  H3: Start SQLite, migrate later -- low initial cost

| Option | F(0-3) | G(0-3) | R(0-3) | Score | Evidence |
|--------|--------|--------|--------|-------|----------|
| PostgreSQL | 3 | 2 | 3 | 8/9 | Production-proven, team growing |
| SQLite | 2 | 3 | 2 | 7/9 | Works now, migration risk later |
| Start->Migrate | 1 | 1 | 1 | 3/9 | Unproven migration path |

Recommendation: PostgreSQL. Missing evidence: load test under concurrent writes.
Create ADR? [y/n]
```

### Reason through a problem with hypothesis testing

```
> /fpf reason why our API response times degraded

ABDUCTION: 3 hypotheses generated
  H1: N+1 query in new user endpoint (added last sprint)
  H2: Missing index on users.organization_id (growing data)
  H3: External API (Stripe) latency increase

DEDUCTION -> INDUCTION:
  H1: Check git log for recent query changes -> CONFIRMED (commit abc123)
  H2: Check EXPLAIN ANALYZE -> index exists, not this
  H3: Check Stripe status -> no incidents

Conclusion: H1 supported (confidence: HIGH)
Fix: Add eager loading in users.service.ts:45
```

## What's Different from fpf-simple

| Feature | fpf-simple (skill) | fpf (plugin) |
|---------|-------------------|--------------|
| Format | Standalone skill | Full plugin (skill + commands + agent) |
| `/fpf` command | None | Universal router: decompose, evaluate, reason, lookup |
| Specialized commands | None | `/fpf-decompose`, `/fpf-evaluate`, `/fpf-reason` |
| Agent | None | `fpf-advisor` -- activates for architecture/decision tasks |
| Applied Patterns | None | 4 step-by-step guides for real-world application |
| Forgeplan Integration | None | Maps FPF outputs to PRD, RFC, ADR artifacts |
| Quick Start | None | Onboarding for FPF newcomers |

## Under the Hood

- **224 FPF specification sections** parsed from Levenchuk's original text
- **4 applied patterns** -- bounded contexts, F-G-R scoring, ADI reasoning, category error detection
- FPF spec is a **git submodule** from `ailev/FPF`, kept in sync via `split_spec.py`

## Updating FPF Spec (Maintainers Only)

> **Note:** `scripts/update-fpf.sh` and `split_spec.py` are maintainer-only tools not included in the plugin distribution. They live in the source repository used to build this plugin.

```bash
cd plugins/fpf && ./scripts/update-fpf.sh
```

This pulls the latest spec from upstream, regenerates 224 section files via `split_spec.py`, preserves `applied-patterns/`, and shows what changed.

## License

MIT -- applies to the plugin wrapper. The FPF specification is by Anatoly Levenchuk under its own terms.
