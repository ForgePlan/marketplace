[English](FORGEPLAN-WEB.md) | [Русский](FORGEPLAN-WEB-RU.md)

# `@forgeplan/web` — visual companion for the marketplace

`@forgeplan/web` is a separate product in the ForgePlan ecosystem — a browser viewer for `.forgeplan/` artifacts. It's the **third sibling** alongside the `forgeplan` CLI and this marketplace's plugins. The marketplace doesn't ship it, but most marketplace users benefit from running it locally on projects they care about.

> Source: [github.com/ForgePlan/forgeplan-web](https://github.com/ForgePlan/forgeplan-web)

---

## TL;DR

- **What**: SvelteKit-based local web app that reads your project's `.forgeplan/` directory (markdown + lance index) and renders it as an interactive graph + time-travel slider.
- **When to use**: After you've built up 10+ artifacts in `.forgeplan/`. Before that, `forgeplan list/graph/health` from the CLI is enough.
- **Cost**: Free, OSS. Runs on `localhost`. No data leaves your machine.
- **Pairs with**: `fpl-skills` (the marketplace flagship). The plugin produces artifacts; the web viewer makes them legible.

---

## When to install

Install `@forgeplan/web` when one of these applies:

- You have 10+ `.forgeplan/` artifacts and the CLI text output is hard to scan.
- You want to **time-travel** — see what your artifact graph looked like at any past commit.
- A teammate joins and needs to understand decisions made over the last 6 months without reading 50 markdown files.
- You're presenting forgeplan-driven work to a stakeholder who'd rather see a graph than a CLI.
- You're debugging artifact lifecycle (e.g. "why is PRD-042 still draft?") — the graph view shows links and state at a glance.

Skip it (or defer) when:

- You have < 10 artifacts. CLI is faster.
- You work entirely solo and never present graphs.
- Your project is too sensitive for any localhost web app (rare; the viewer is read-only and doesn't make outbound calls).

---

## Installation

Per `forgeplan-web` README. The general shape:

```bash
git clone https://github.com/ForgePlan/forgeplan-web.git
cd forgeplan-web
pnpm install
pnpm dev
# Then point it at your project's .forgeplan/ via the env var or UI.
```

Check `forgeplan-web/README.md` for the current install/run procedure — it may have shifted since this guide was written.

---

## Key features

### 1. Artifact graph

Visual representation of `.forgeplan/` as a typed node-edge graph:

| Node type | Color / shape | What it represents |
|---|---|---|
| Epic | Largest, light blue | Group of PRDs/RFCs |
| PRD | Medium, blue | Product requirement |
| RFC | Medium, green | Architecture proposal |
| ADR | Medium, purple | Decision record |
| Spec | Medium, orange | API/data contract |
| Evidence | Small, yellow | Verification linked to PRD/ADR |
| Note | Small, grey | Micro-decision |
| Problem | Small, red | Problem card |
| Solution | Small, gold | Solution portfolio |

Edges show `informs` / `based_on` / `supersedes` / `implements` / `refines` relationships.

### 2. Time-travel slider

Drag a slider across your repo's commit history to see the artifact graph at any past commit.

- Powered by `git worktree` ephemeral checkouts.
- Requires `config.yaml` to be **tracked** in git (otherwise reconstruction fails — see [FORGEPLAN-SETUP.md § config.yaml in gitignore](../plugins/fpl-skills/skills/bootstrap/resources/guides/FORGEPLAN-SETUP.md#1-configyaml-in-gitignore-most-common-mistake)).
- Useful for "when did we decide X?" — slide to before-vs-after the decision.

### 3. PR-Diff overlays (planned)

Future: visualise `git diff .forgeplan/` as a graph delta. Shows artifacts added/modified/deleted in a PR. Useful for reviewers who want to see decision changes alongside code changes.

### 4. Health dashboard

Same data as `forgeplan health` (orphans, stubs, duplicates, blind spots) but as visual cards, sortable, with clickable artifact references.

---

## Setup checklist for full functionality

For `@forgeplan/web` to work correctly on your project:

- [ ] **`.forgeplan/config.yaml` is tracked in git** (not gitignored). Without it, time-travel breaks. See [FORGEPLAN-SETUP.md](../plugins/fpl-skills/skills/bootstrap/resources/guides/FORGEPLAN-SETUP.md).
- [ ] **`notes/`, `memory/`, `state/` are tracked**. The graph viewer expects these as artifact source-of-truth.
- [ ] **`lance/` and `.fastembed_cache/` are gitignored**. Time-travel reconstructs the index from markdown.
- [ ] **`config.yaml` does not contain literal API keys** (use `api_key_env`). Otherwise leaked into git history.
- [ ] **`session.yaml` is gitignored**. Otherwise time-travel slider sees runtime focus state instead of canonical artifact state.

These are the same rules as [FORGEPLAN-SETUP.md](../plugins/fpl-skills/skills/bootstrap/resources/guides/FORGEPLAN-SETUP.md) — `@forgeplan/web` just amplifies the cost of getting them wrong.

---

## How it integrates with the marketplace

| Marketplace plugin | What it produces | What `@forgeplan/web` does with it |
|---|---|---|
| `fpl-skills` `/research` | `research/reports/*` (outside `.forgeplan/`) | Doesn't show — research lives outside the artifact graph by design. |
| `fpl-skills` `/refine` → `/rfc create` | RFC in `.forgeplan/rfcs/` | Renders as RFC node, edges to related PRDs/ADRs. |
| `fpl-skills` `/sprint` → evidence + activate | PRD with linked evidence | Renders evidence node attached to PRD; PRD turns "active" on the graph. |
| `fpl-skills` `/audit` | No artifact unless evidence is logged | If you `forgeplan new evidence "audit results"`, evidence appears. |
| `fpf` `/fpf decompose` | Bounded contexts table (no artifact unless saved) | Save as ADR via `/rfc create` for the graph to pick it up. |
| `forgeplan-orchestra` `/sync` | Mapping between artifacts and Orchestra tasks | Doesn't show Orchestra side, but tasks created via mapping have `Artifact-ID` for cross-reference. |
| `forgeplan-brownfield-pack` ingest | Bulk-imported PRDs/ADRs from legacy docs | Same as native artifacts — fully visible. |

---

## Workflow integration tips

### Daily

- Keep `forgeplan-web` running locally as a tab. When the CLI prints something interesting (after `/sprint`, `/audit`, `/forge-cycle`), refresh the tab to see the graph update.
- Time-travel is **expensive** (it spins `git worktree` + reindex). Use sparingly.

### Code review

- Open `forgeplan-web` time-travel side-by-side with the PR diff.
- Slide to "before this PR" to see the artifact graph that existed when the PR was opened.
- Helps reviewers understand whether the PR's claim "implements PRD-042" is consistent with PRD-042's state at that time.

### Onboarding a new teammate

```
1. They clone the repo.
2. forgeplan init -y && forgeplan scan-import   (rebuild local index)
3. cd ../forgeplan-web && pnpm dev               (start the viewer)
4. Open localhost:5173, point at the new clone.
5. They see the full graph + can time-travel through key decisions.
```

Replaces a 30-min "let me explain our architecture" call with self-serve exploration.

---

## What `@forgeplan/web` is NOT

To set expectations:

- **Not a replacement for the CLI.** `forgeplan` CLI is the source of truth for artifact creation/mutation. The web app is read-only.
- **Not a multi-user collaboration tool.** It's a local viewer; multiple people running it on the same project see independent state.
- **Not a substitute for Orchestra.** Orchestra tracks tasks (assignees, statuses, messages); `@forgeplan/web` shows artifact decisions. Different layers.
- **Not hosted SaaS.** Runs on `localhost`. If you want a hosted viewer for your team, host the SvelteKit app yourself.

---

## Troubleshooting

### "Time-travel slider returns 502"

Cause: ephemeral worktree's `.forgeplan/config.yaml` is missing. Means `config.yaml` is gitignored. Fix per [FORGEPLAN-SETUP.md migration steps](../plugins/fpl-skills/skills/bootstrap/resources/guides/FORGEPLAN-SETUP.md#migration-from-a-misaligned-state).

### "Graph node count differs from `forgeplan list`"

Likely cause: `notes/` or `memory/` is gitignored — the web viewer reads from git, the CLI reads from disk, so they diverge. Track those directories.

### "Web app can't find my project"

Point it at the absolute path containing `.forgeplan/`, not at `.forgeplan/` itself. The viewer expects to navigate from the project root.

### "Performance is slow on large projects"

The lance index can grow large for projects with 100+ artifacts. Consider:
- Run `forgeplan reindex` if you suspect the index is fragmented.
- The viewer paginates the graph; use search/filter rather than rendering all nodes at once.

---

## Future directions

Per the `forgeplan-web` README, planned features include:

- **PR-Diff overlays** (mentioned above) — visualise artifact deltas in a PR.
- **Hosted viewer** — optional SaaS for teams that want shared visualisation without self-hosting.
- **Plugin-aware annotations** — show which marketplace plugin produced each artifact (e.g. "this evidence was created via `/audit` from fpl-skills").

Track development at [github.com/ForgePlan/forgeplan-web](https://github.com/ForgePlan/forgeplan-web).

---

## See also

- [github.com/ForgePlan/forgeplan-web](https://github.com/ForgePlan/forgeplan-web) — install + run + contribute.
- [DEVELOPER-JOURNEY.md](DEVELOPER-JOURNEY.md) — narrative onboarding for the marketplace; mentions `@forgeplan/web` as a recommended add-on once you have artifacts.
- [FORGEPLAN-SETUP.md](../plugins/fpl-skills/skills/bootstrap/resources/guides/FORGEPLAN-SETUP.md) — `.gitignore` contract; full functionality of `@forgeplan/web` depends on the contract being correct.
- [ARCHITECTURE.md](ARCHITECTURE.md) — the 4-layer mental model; `@forgeplan/web` visualises Layer 2 (Forgeplan).
