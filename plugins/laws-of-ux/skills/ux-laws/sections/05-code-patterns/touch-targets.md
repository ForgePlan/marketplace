# Touch Targets & Interaction

**Related Laws:** Fitts's Law, Aesthetic-Usability Effect

## Rules

### 1. Minimum Touch Target Size
Interactive elements must meet minimum size requirements.

```css
/* VIOLATION — too small */
.icon-button {
  width: 24px;
  height: 24px;
}

/* CORRECT — meets WCAG 2.5.8 */
.icon-button {
  min-width: 44px;
  min-height: 44px;
}

/* BETTER — meets Material Design 3 */
.icon-button {
  min-width: 48px;
  min-height: 48px;
}
```

**Check:** All `<button>`, `<a>`, `<input>`, clickable `<div>` elements must have computed size ≥ 44x44px.

### 2. Touch Target Spacing
Adjacent interactive elements must have adequate spacing.

```css
/* VIOLATION — buttons too close */
.button-group button {
  margin: 2px;
}

/* CORRECT — minimum 8px gap */
.button-group {
  display: flex;
  gap: 8px;
}

/* BETTER for mobile — 12px gap */
.button-group {
  gap: 12px;
}
```

**Check:** Gap between adjacent interactive elements ≥ 8px.

### 3. Clickable Area ≥ Visual Area
The clickable area should be at least as large as the visual element, ideally larger.

```css
/* VIOLATION — tiny visual, tiny click area */
.close-icon {
  width: 12px;
  height: 12px;
}

/* CORRECT — padding extends clickable area */
.close-icon {
  width: 12px;
  height: 12px;
  padding: 16px;
  cursor: pointer;
}

/* ALTERNATIVE — pseudo-element expands hit area */
.close-icon {
  position: relative;
}
.close-icon::after {
  content: '';
  position: absolute;
  inset: -12px;
}
```

### 4. Important Actions Positioned for Easy Reach
Primary actions should be positioned within thumb reach on mobile.

```css
/* Mobile-first: primary actions at bottom */
.mobile-actions {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16px;
  padding-bottom: env(safe-area-inset-bottom, 16px);
}
```

**Check:** On mobile layouts, primary CTAs should not be in top corners.

## Code Review Checklist

- [ ] All interactive elements ≥ 44x44px
- [ ] Gap between adjacent interactive elements ≥ 8px
- [ ] Small icons have extended click areas (padding or pseudo-elements)
- [ ] Primary mobile actions within thumb-reach zone
- [ ] Cursor: pointer on all clickable elements
- [ ] No overlapping click areas
