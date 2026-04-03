# Content Grouping & Layout

**Related Laws:** Law of Proximity, Law of Similarity, Law of Common Region, Law of Uniform Connectedness, Law of Prägnanz

## Rules

### 1. Proximity — Related Elements Close Together
Elements that belong together must have smaller gaps between them than between unrelated groups.

```css
/* VIOLATION — uniform spacing, no grouping */
.form label { margin-bottom: 16px; }
.form input { margin-bottom: 16px; }

/* CORRECT — tight within group, loose between groups */
.form-group label {
  margin-bottom: 4px;  /* tight: label to input */
}
.form-group input {
  margin-bottom: 8px;  /* tight: within group */
}
.form-group {
  margin-bottom: 24px; /* loose: between groups */
}
```

**Rule of thumb:** Inter-group spacing should be ≥ 2x intra-group spacing.

### 2. Similarity — Same Function = Same Appearance
Elements with the same function must look the same across the interface.

```css
/* VIOLATION — inconsistent button styles for same function */
.page-a .submit-btn { background: blue; border-radius: 4px; }
.page-b .submit-btn { background: green; border-radius: 20px; }

/* CORRECT — consistent via design tokens */
.btn-primary {
  background: var(--color-primary);
  border-radius: var(--radius-md);
  padding: var(--spacing-sm) var(--spacing-md);
  font: var(--font-button);
}
```

**Check:** All primary buttons, all secondary buttons, all links should use the same CSS class/token.

### 3. Common Region — Visual Boundaries for Groups
Use borders, backgrounds, or cards to create visual regions.

```html
<!-- VIOLATION — flat list, no grouping -->
<div>
  <input name="firstName" />
  <input name="lastName" />
  <input name="email" />
  <input name="cardNumber" />
  <input name="expiry" />
  <input name="cvv" />
</div>

<!-- CORRECT — fieldsets create visual regions -->
<fieldset>
  <legend>Personal Information</legend>
  <input name="firstName" />
  <input name="lastName" />
  <input name="email" />
</fieldset>

<fieldset>
  <legend>Payment Details</legend>
  <input name="cardNumber" />
  <input name="expiry" />
  <input name="cvv" />
</fieldset>
```

```css
fieldset {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
}
```

### 4. Uniform Connectedness — Visual Lines Between Related Items
Use borders, lines, or connectors to show relationships.

```css
/* Timeline / stepper — connected steps */
.stepper-item {
  position: relative;
  padding-left: 32px;
}
.stepper-item::before {
  content: '';
  position: absolute;
  left: 12px;
  top: 24px;
  bottom: -8px;
  width: 2px;
  background: var(--color-border);
}
.stepper-item:last-child::before {
  display: none;
}
```

### 5. Prägnanz — Keep Layouts Simple
Complex layouts should resolve to simple, recognizable patterns.

```css
/* VIOLATION — irregular, unpredictable grid */
.dashboard {
  display: grid;
  grid-template-columns: 1fr 2fr 0.5fr 1.5fr;
  grid-template-rows: auto 3fr 1fr auto 2fr;
}

/* CORRECT — clean, predictable grid */
.dashboard {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: var(--spacing-md);
}
.dashboard-main { grid-column: 1 / 9; }
.dashboard-sidebar { grid-column: 9 / 13; }
```

**Check:** Grid definitions should use standard column counts (12, 16) and consistent gaps.

## Code Review Checklist

- [ ] Related elements have tighter spacing than unrelated groups (ratio ≥ 2:1)
- [ ] Same-function elements use same CSS classes/tokens across pages
- [ ] Form fields are grouped with `<fieldset>` or visual containers
- [ ] Multi-step processes use visual connectors (lines, progress bars)
- [ ] Grid layouts use standard column systems (12-col, etc.)
- [ ] Consistent use of design tokens for spacing, colors, borders
- [ ] No orphaned elements without clear group membership
