# User Expectations

**Related Laws:** Jakob's Law, Mental Model, Postel's Law

## Rules

### 1. Follow Platform Conventions (Jakob's Law)
Use standard patterns that users already know.

```html
<!-- VIOLATION — non-standard navigation placement -->
<footer>
  <nav><!-- Primary navigation in footer?! --></nav>
</footer>

<!-- CORRECT — standard placement -->
<header>
  <nav><!-- Primary navigation in header --></nav>
</header>
```

```jsx
{/* VIOLATION — custom scroll behavior */}
<div onWheel={customScrollHandler}>
  {/* Overrides native scroll — confuses users */}
</div>

{/* CORRECT — enhance, don't replace native behavior */}
<div style={{ overflowY: 'auto', scrollBehavior: 'smooth' }}>
  {/* Standard scroll with smooth enhancement */}
</div>
```

### 2. Standard Form Patterns
Use HTML form elements as intended. Users expect them to work consistently.

```html
<!-- VIOLATION — custom checkbox without proper semantics -->
<div class="custom-check" onclick="toggle()">
  <span class="checkmark">✓</span>
  <span>I agree</span>
</div>

<!-- CORRECT — proper checkbox with label -->
<label class="checkbox">
  <input type="checkbox" name="agree" />
  <span class="checkbox-label">I agree to the terms</span>
</label>
```

```html
<!-- Use correct input types for mobile keyboards -->
<input type="email" autocomplete="email" />
<input type="tel" autocomplete="tel" />
<input type="url" autocomplete="url" />
<input type="number" inputmode="numeric" />
<input type="search" />
```

### 3. Predictable Link Behavior
Links should behave as users expect.

```html
<!-- VIOLATION — link that doesn't navigate -->
<a href="#" onclick="openModal()">View Details</a>

<!-- CORRECT — button for actions, links for navigation -->
<button type="button" onclick="openModal()">View Details</button>

<!-- External links should indicate they open in new tab -->
<a href="https://example.com" target="_blank" rel="noopener noreferrer">
  External Resource
  <span class="sr-only">(opens in new tab)</span>
  <ExternalLinkIcon aria-hidden="true" />
</a>
```

### 4. Accept Variable Input (Postel's Law)
Be liberal in what you accept from users.

```jsx
{/* VIOLATION — strict input validation */}
function validatePhone(value) {
  // Only accepts exactly (123) 456-7890
  return /^\(\d{3}\) \d{3}-\d{4}$/.test(value);
}

{/* CORRECT — accept multiple formats, normalize internally */}
function normalizePhone(value) {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 10) return digits;
  if (digits.length === 11 && digits[0] === '1') return digits.slice(1);
  return null; // Invalid
}

{/* Accept various date formats */}
function normalizeDate(value) {
  // Try multiple parsers
  const formats = [
    /^(\d{2})\/(\d{2})\/(\d{4})$/,  // MM/DD/YYYY
    /^(\d{2})\.(\d{2})\.(\d{4})$/,  // DD.MM.YYYY
    /^(\d{4})-(\d{2})-(\d{2})$/,    // YYYY-MM-DD
  ];
  // ... parse and normalize
}
```

```jsx
{/* Trim whitespace automatically */}
<input type="email"
  onBlur={(e) => setValue(e.target.value.trim())} />

{/* Case-insensitive search */}
<input type="search" placeholder="Search..."
  onChange={(e) => search(e.target.value.toLowerCase())} />
```

### 5. Gradual Migration for Design Changes
When redesigning, allow users to adapt (Jakob's Law).

```jsx
{/* CORRECT — feature flags for new UI */}
function Navigation() {
  const { useNewNav } = useFeatureFlags();

  return useNewNav ? <NewNavigation /> : <ClassicNavigation />;
}

{/* CORRECT — "Try new version" opt-in */}
<Banner>
  <p>We've updated our interface!</p>
  <Button onClick={enableNewUI}>Try New Design</Button>
  <Button variant="text" onClick={dismiss}>Maybe Later</Button>
</Banner>
```

## Code Review Checklist

- [ ] Primary navigation is in `<header>` or standard position
- [ ] Form inputs use correct HTML types (email, tel, url, number, search)
- [ ] `autocomplete` attributes on form fields
- [ ] Links navigate, buttons perform actions (no `<a href="#">`)
- [ ] External links indicate new tab behavior
- [ ] Input validation accepts multiple formats, normalizes internally
- [ ] Leading/trailing whitespace trimmed automatically
- [ ] Native browser behaviors not overridden (scroll, back button, selection)
- [ ] Custom components maintain expected keyboard behavior
