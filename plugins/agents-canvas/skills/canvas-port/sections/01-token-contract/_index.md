# 01 — Token contract (tokens.json -> CSS custom properties)

The **token contract** is the C5-gated artifact and the single source of truth for the whole DS. It is
**one** `tokens.json` that **mirrors the Pencil `variables`**, compiled by the **project's token tool**
(Style-Dictionary is one option; native stacks may use their own — e.g. a Tailwind theme config, a CSS-vars
generator, or a framework-native theming pipeline) into CSS custom properties (the primary platform,
consumed by the resolved framework's components) plus a JS token export (for tests and any tooling that
needs the values). One source — **never forked** by any component. The single-source `tokens.json` -> CSS
custom-properties contract holds regardless of which tool compiles it.

> **context7 first.** Resolve the project's token tool AND framework before writing config. If the project
> uses **Style-Dictionary**, note v4 changed the JS API (class-based `new StyleDictionary(...)`, `register*`
> hooks, `style-dictionary/enums`) — run `resolve-library-id("Style Dictionary")` -> `query-docs(<id>,
> "build CSS custom properties with light/dark themes and outputReferences")`. If the project uses a
> different token tool, resolve that one instead. Either way also resolve the **resolved framework** for its
> token-consumption API. The shapes below are illustrative; confirm the current API.

## Step 1 — extract the Pencil variables (porter-storybook, MAIN)

The Pencil DS holds its tokens as `variables` (colors, spacing, typography, radii, shadows). Read them
with the Pencil MCP — **never** `Read`/`Grep` the `.pen`:

```
get_variables()                      # the full variable set, grouped + per-mode values
get_editor_state(include_schema:true)# confirm the variable schema first
```

Map each Pencil `$--var` to a token path. Keep the Pencil grouping as the token tree so the contract is
traceable back to the design (and so the Tester can prove provenance at Gate V):

| Pencil variable | tokens.json path | type |
|---|---|---|
| `$--color/bg/base` | `color.bg.base` | `color` |
| `$--color/accent/primary` | `color.accent.primary` | `color` |
| `$--space/4` | `space.4` | `dimension` |
| `$--radius/md` | `radius.md` | `dimension` |
| `$--font/body/size` | `font.body.size` | `dimension` |

## Step 2 — author `tokens.json` (mirror Pencil, two theme axes)

The locked theme axes are **Light** and **Dark** (`Mode:Light` / `Mode:Dark` in Pencil). Model them with
the standard W3C-style design-tokens shape (understood by Style-Dictionary and most token tools), splitting
mode-varying tokens into per-mode source files so one build emits one CSS var set per mode:

```
packages/design-system/.canvas-port/tokens/
  base.tokens.json          # mode-invariant: spacing, radii, typography, z-index
  color.light.tokens.json   # Mode:Light color values
  color.dark.tokens.json    # Mode:Dark color values
```

```jsonc
// color.light.tokens.json  (mirrors Pencil Mode:Light)
{
  "color": {
    "bg":     { "base": { "$value": "#FBF7F0", "$type": "color" } },   // example token from a chosen brand
    "fg":     { "base": { "$value": "#1A1714", "$type": "color" } },
    "accent": { "primary": { "$value": "#C2410C", "$type": "color" } }
  }
}
```

Semantic tokens reference primitives (`"$value": "{color.accent.primary}"`) so a re-brand changes one
primitive and cascades. `outputReferences: true` preserves those as `var(--...)` in the CSS so the
cascade survives into the shadow DOM.

## Step 3 — the token-tool build (CSS custom properties primary; Style-Dictionary shown as one option)

One config, one `css/variables` file **per mode**, each scoped to a theme selector so the resolved
framework can switch modes with a single attribute/class on a root element. The Style-Dictionary config
below is one option — if the project uses a different token tool, produce the same per-mode CSS var sets
with it. Confirm the tool's current API via context7, then:

```js
// style-dictionary.config.js  (illustrative — verify v4 API via context7)
import StyleDictionary from 'style-dictionary';

const sd = (mode) => new StyleDictionary({
  source: ['.canvas-port/tokens/base.tokens.json', `.canvas-port/tokens/color.${mode}.tokens.json`],
  platforms: {
    css: {
      transformGroup: 'css',
      buildPath: 'src/tokens/',
      files: [{
        destination: `theme.${mode}.css`,
        format: 'css/variables',
        options: { outputReferences: true, selector: mode === 'light' ? ':root, [data-theme="light"]' : '[data-theme="dark"], :root[data-theme="dark"]' },   // light-DOM default; use :host([theme=...]) only for the Web Components target
      }],
    },
    js: {
      transformGroup: 'js',
      buildPath: 'src/tokens/',
      files: [{ destination: `tokens.${mode}.ts`, format: 'javascript/es6' }],
    },
  },
});

await sd('light').buildAllPlatforms();
await sd('dark').buildAllPlatforms();
```

Emitted CSS (one custom property per token, references preserved):

```css
/* theme.light.css */
:root, [data-theme="light"] {
  --color-bg-base: #FBF7F0;
  --color-accent-primary: #C2410C;
  --space-4: 1rem;
  --radius-md: 0.5rem;
}
```

## Step 4 — consumption by the resolved framework

The resolved framework imports the compiled CSS once (globally, or per-component) and reads the tokens with
`var(--...)`. The theme axis is a single attribute/class on a root element, so flipping `data-theme="dark"`
once re-themes every descendant — no per-component JS. Example for a **React** target (illustrative — confirm
the framework's current API via context7):

```tsx
// illustrative React usage — confirm the framework API via context7
import './tokens/theme.light.css';   // :root, [data-theme="light"] { --color-... }
import './tokens/theme.dark.css';    // [data-theme="dark"] { --color-... }

export function CanvasButton({ children }: { children: React.ReactNode }) {
  return (
    <button
      style={{
        background: 'var(--color-accent-primary)',
        color: 'var(--color-bg-base)',
        padding: 'var(--space-4)',
        borderRadius: 'var(--radius-md)',
      }}
    >
      {children}
    </button>
  );
}
// a parent sets the axis once: <div data-theme="dark"> ...app... </div>
```

The same compiled CSS vars are consumed the same way by any resolved framework (Vue `:style` / scoped CSS,
Svelte, Angular, etc.) — the component styling API changes, the `var(--...)` contract does not.

> **Web Components target only.** When the project's declared stack *is* Web Components, the Lit base instead
> imports the compiled CSS into its `static styles` (so the vars live inside the shadow root) and flips the
> axis via a host attribute (`:host([theme="dark"])`). That is one selectable target, used only when the
> stack is Web Components — not the default. Confirm the Lit 3 API via context7 when this target applies.

## What Gate V (tokens) checks — author to pass it

The Tester + architect-reviewer validate the contract before the Coder is unblocked:

1. **Complete** — every Pencil `$--var` the DS uses has a token path; no hardcoded hex/px survives in the
   story specs.
2. **Theme-correct** — both `Mode:Light` and `Mode:Dark` axes resolve; the selectors switch cleanly; no
   mode-varying token is hardcoded into `base.tokens.json`.
3. **Traceable to the ADR** — the palette + scale match the recorded brand/token ADR decisions: every
   token traces to a recorded design decision (the chosen brand), not a hardcoded house style. The Tester
   maps token -> ADR; a token with no backing decision is scope creep, a decision with no token is a gap.
4. **References preserved** — semantic tokens emit `var(--primitive)`, not flattened values, so the
   single-source cascade holds.

On PASS the coordinator emits `NEEDS_ACTIVATION: RFC-NNN` (the tokens RFC). Only after the orchestrator
activates it does `canvas-lib.sh set-tokens <slug> RFC-NNN true` unblock `packages/design-system/**`
writes. **The token contract is frozen-on-activate** — changing a token value afterward is a
supersede/new-cycle action, not an inline edit.

## HARD RULES (this section)

1. **`tokens.json` mirrors Pencil `variables`** read via `get_variables()` — never invent values, never
   `Read` the `.pen`.
2. **CSS custom properties are the primary platform**; the JS export is secondary (tests/tooling). The
   resolved framework consumes the vars — do not ship a parallel JS-only theme.
3. **Preserve references** (Style-Dictionary's `outputReferences: true`, or your token tool's equivalent) so semantic tokens stay `var(--...)` — flattening forks the source.
4. **Two axes only in MVP: Light + Dark.** Adding an axis is a contract change -> new Gate V.
5. **context7 before the config** — resolve the project's framework (Step 0) first, then verify the token
   tool's API and the resolved framework's token-consumption pattern; prompt the user to use context7 on any
   version question.
