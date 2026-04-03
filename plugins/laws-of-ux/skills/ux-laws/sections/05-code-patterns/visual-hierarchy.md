# Visual Hierarchy & Emphasis

**Related Laws:** Von Restorff Effect, Serial Position Effect, Selective Attention, Aesthetic-Usability Effect

## Rules

### 1. One Visually Distinct CTA Per Section
The primary action must be visually distinct from all other elements (Von Restorff).

```css
/* VIOLATION — all buttons look the same */
.actions button {
  background: var(--color-primary);
  color: white;
  padding: 12px 24px;
}

/* CORRECT — clear visual hierarchy */
.btn-primary {
  background: var(--color-primary);
  color: white;
  font-weight: 600;
  padding: 12px 24px;
}
.btn-secondary {
  background: transparent;
  color: var(--color-primary);
  border: 1px solid var(--color-primary);
  padding: 12px 24px;
}
.btn-tertiary {
  background: transparent;
  color: var(--color-text);
  padding: 12px 24px;
  text-decoration: underline;
}
```

### 2. Don't Rely Only on Color for Distinction
Accessibility requires multiple visual cues.

```css
/* VIOLATION — only color distinguishes error */
.input-error { border-color: red; }

/* CORRECT — color + icon + text */
.input-error {
  border-color: var(--color-error);
  border-width: 2px;  /* thicker border */
}
.input-error-icon {
  display: inline-block; /* ⚠ icon visible */
}
.input-error-message {
  color: var(--color-error);
  font-size: var(--font-sm);
  margin-top: 4px;
}
```

**Check:** Contrast ratio ≥ 4.5:1 for normal text, ≥ 3:1 for large text and UI components (WCAG AA).

### 3. Visual Weight for Important Content
Use size, weight, and position to establish hierarchy.

```css
/* Typography scale — clear hierarchy */
.heading-1 { font-size: 2.5rem; font-weight: 700; line-height: 1.2; }
.heading-2 { font-size: 2rem; font-weight: 600; line-height: 1.3; }
.heading-3 { font-size: 1.5rem; font-weight: 600; line-height: 1.4; }
.body      { font-size: 1rem; font-weight: 400; line-height: 1.6; }
.caption   { font-size: 0.875rem; font-weight: 400; line-height: 1.5; color: var(--color-text-secondary); }
```

### 4. Avoid Banner Blindness (Selective Attention)
Critical info must not look like ads.

```html
<!-- VIOLATION — looks like an ad banner -->
<div style="background: linear-gradient(red, orange); text-align: center; padding: 20px;">
  <strong>🔥 LIMITED OFFER! 50% OFF! 🔥</strong>
</div>

<!-- CORRECT — integrated, contextual notification -->
<aside role="alert" class="notification-bar">
  <p><strong>Limited offer:</strong> 50% off annual plans. <a href="/pricing">View pricing</a></p>
  <button aria-label="Dismiss">×</button>
</aside>
```

```css
.notification-bar {
  background: var(--color-surface-elevated);
  border-left: 4px solid var(--color-primary);
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
```

### 5. Pricing / Feature Comparison — Highlight Recommended
Apply Von Restorff to pricing tables.

```css
/* Recommended plan stands out */
.pricing-card { border: 1px solid var(--color-border); }
.pricing-card--recommended {
  border: 2px solid var(--color-primary);
  box-shadow: 0 4px 24px rgba(0,0,0,0.12);
  position: relative;
}
.pricing-card--recommended::before {
  content: 'Most Popular';
  position: absolute;
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--color-primary);
  color: white;
  padding: 4px 16px;
  border-radius: var(--radius-full);
  font-size: var(--font-sm);
  font-weight: 600;
}
```

## Code Review Checklist

- [ ] Each section has at most one primary CTA (visually distinct)
- [ ] Button hierarchy: primary → secondary → tertiary (max 3 levels)
- [ ] Color is not the only means of conveying information
- [ ] Text contrast ratio ≥ 4.5:1 (WCAG AA)
- [ ] Typography has clear size/weight hierarchy (max 4-5 levels)
- [ ] Important notifications don't look like ad banners
- [ ] Recommended options in comparison views are visually highlighted
- [ ] No more than 2-3 elements competing for attention per viewport
