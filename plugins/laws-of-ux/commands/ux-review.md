---
name: ux-review
description: Review frontend code against 30 Laws of UX principles. Analyzes HTML/CSS/JS/React/Vue files for UX violations and provides actionable recommendations.
---

# UX Review Command

You are a UX expert performing a comprehensive review of frontend code against the 30 Laws of UX. Follow these steps precisely.

## Step 1 — Detect the Frontend Stack

Scan the project to identify the frontend framework and technology stack:
- Check for `package.json` (React, Vue, Svelte, Angular dependencies)
- Check for framework config files (`next.config.*`, `nuxt.config.*`, `vite.config.*`, `angular.json`, `svelte.config.*`)
- Check for `tsconfig.json` (TypeScript usage)
- Check for CSS methodology (Tailwind config, styled-components, CSS modules, SCSS files)
- Note the detected stack in your report header

## Step 2 — Scan Relevant Frontend Files

Find and collect all frontend files for review:
- HTML files: `*.html`
- Stylesheets: `*.css`, `*.scss`, `*.sass`, `*.less`
- JavaScript/TypeScript: `*.js`, `*.jsx`, `*.ts`, `*.tsx`
- Framework-specific: `*.vue`, `*.svelte`, `*.astro`
- Focus on components, pages, and layout files
- Skip `node_modules`, `dist`, `build`, `.next`, and other output directories

## Step 3 — Load UX Laws Knowledge Base

Use the `ux-laws` skill to access the full knowledge base. Read the following sections:
1. `sections/01-heuristics/_index.md` — Fitts's Law, Hick's Law, Choice Overload, Aesthetic-Usability Effect
2. `sections/02-cognitive/_index.md` — Chunking, Cognitive Bias, Cognitive Load, Miller's Law, Paradox of Active User, Selective Attention, Serial Position Effect, Von Restorff Effect, Working Memory, Flow
3. `sections/03-gestalt/_index.md` — Proximity, Similarity, Common Region, Uniform Connectedness, Prägnanz, Mental Model
4. `sections/04-principles/_index.md` — Jakob's Law, Tesler's Law, Postel's Law, Doherty Threshold, Occam's Razor, Goal-Gradient Effect, Zeigarnik Effect, Peak-End Rule, Pareto Principle, Parkinson's Law
5. `sections/05-code-patterns/_index.md` — All code-level checks mapped to UX laws

Then drill into the specific law files that are relevant to the code patterns found.

## Step 4 — Analyze Each File Against UX Laws

For each frontend file, check against the Code Patterns section and the individual law implications:

### Heuristics Checks
- **Fitts's Law**: Are touch/click targets at least 44x44px? Are important actions large and easy to reach? Are related actions grouped close together?
- **Hick's Law**: Are there menus/dropdowns with more than 7 items? Are navigation options overwhelming? Are choices progressively disclosed?
- **Choice Overload**: Are there too many options presented simultaneously? Are defaults provided? Is progressive disclosure used?
- **Aesthetic-Usability Effect**: Is the UI visually consistent? Are spacing and alignment uniform?

### Cognitive Checks
- **Miller's Law**: Are lists/groups limited to 7 plus or minus 2 items? Is information chunked into meaningful groups?
- **Cognitive Load**: Is there too much information on a single screen? Are complex tasks broken into steps?
- **Von Restorff Effect**: Do important elements visually stand out? Are CTAs distinctive from surrounding elements?
- **Serial Position Effect**: Are the most important items placed first or last in lists/navigation?
- **Working Memory**: Does the UI require users to remember information across steps?
- **Flow**: Can users complete tasks without unnecessary interruptions?
- **Chunking**: Is content broken into digestible groups? Are form fields logically grouped?
- **Cognitive Bias**: Are comparison UIs objective? Are there dark patterns or shame-based opt-outs?
- **Paradox of Active User**: Is there contextual help (tooltips, empty states) instead of requiring users to read docs?
- **Selective Attention**: Do notifications avoid looking like ad banners? Are critical changes visually highlighted?

### Gestalt Checks
- **Proximity**: Are related elements close together? Are unrelated elements spaced apart?
- **Similarity**: Do similar elements share visual properties (color, size, shape)?
- **Common Region**: Are grouped items enclosed in shared containers/boundaries?
- **Uniform Connectedness**: Are related elements visually connected (lines, shared backgrounds)?
- **Prägnanz**: Is the visual structure as simple as possible?
- **Mental Model**: Does the UI follow established conventions and patterns?

### Principles Checks
- **Jakob's Law**: Does the UI follow conventions users know from other sites/apps?
- **Doherty Threshold**: Are loading states provided for operations over 400ms? Are there skeleton screens or progress indicators?
- **Tesler's Law**: Is essential complexity properly managed? Are forms as simple as possible without losing necessary fields?
- **Postel's Law**: Are form inputs flexible in what they accept? Are error messages helpful?
- **Goal-Gradient Effect**: Is progress shown for multi-step processes?
- **Zeigarnik Effect**: Are incomplete tasks indicated to encourage completion?
- **Peak-End Rule**: Is the final step of a flow well-designed (confirmation pages, success states)?
- **Occam's Razor**: Is the simplest solution used? Are there unnecessary UI elements?
- **Pareto Principle**: Are the most-used features (top 20%) the most accessible?
- **Parkinson's Law**: Are time-sensitive tasks appropriately constrained?

## Step 5 — Generate the Structured Report

Format the output as follows:

```
# UX Laws Review Report

**Project Stack**: [detected framework/stack]
**Files Scanned**: [count]
**Laws Checked**: 30
**Violations Found**: [count]

---

## Critical Violations (Must Fix)

### [Law Name] — [Category]
- **File**: `path/to/file.tsx:42`
- **Issue**: [Clear description of what violates the law]
- **Fix**: [Actionable recommendation]
- **Code Example**:
  ```[language]
  // Before
  [problematic code]

  // After
  [fixed code]
  ```

---

## Warnings (Should Fix)

[Same format as Critical]

---

## Suggestions (Nice to Have)

[Same format as Critical]

---

## Summary by Category

### Heuristics
- [count] findings ([list law names])

### Cognitive
- [count] findings ([list law names])

### Gestalt
- [count] findings ([list law names])

### Principles
- [count] findings ([list law names])
```

## Important Notes

- Prioritize findings by user impact: Critical = directly harms usability, Warning = degrades experience, Suggestion = improvement opportunity
- Always provide concrete code fixes, not just theory
- Reference the specific UX law name and its core principle in each finding
- If a file has no violations, do not include it in the report
- Group multiple violations of the same law together when they appear in the same file
- If the project has no frontend files, report that clearly and exit
