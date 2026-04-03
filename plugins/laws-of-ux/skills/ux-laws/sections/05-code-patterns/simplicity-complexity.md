# Simplicity & Complexity

**Related Laws:** Occam's Razor, Tesler's Law, Pareto Principle

## Rules

### 1. Remove Non-Essential Elements (Occam's Razor)
Every element should serve the user's goal. If it doesn't, remove it.

```html
<!-- VIOLATION — decorative complexity -->
<div class="card">
  <div class="card-badge">NEW</div>
  <div class="card-ribbon">FEATURED</div>
  <img class="card-bg-pattern" src="pattern.svg" />
  <img class="card-image" src="product.jpg" />
  <div class="card-overlay">
    <div class="card-glow"></div>
  </div>
  <h3>Product Name</h3>
  <p>Description</p>
  <button>Buy Now</button>
</div>

<!-- CORRECT — essential elements only -->
<div class="card">
  <img class="card-image" src="product.jpg" alt="Product Name" />
  <h3>Product Name</h3>
  <p>Description</p>
  <button class="btn-primary">Buy Now</button>
</div>
```

### 2. Absorb Complexity Into the System (Tesler's Law)
Complexity can't be eliminated — push it from user to system.

```jsx
{/* VIOLATION — user must know date format */}
<label>
  Date (YYYY-MM-DD):
  <input type="text" name="date" placeholder="2024-01-15" />
</label>

{/* CORRECT — system handles complexity */}
<label>
  Date:
  <input type="date" name="date" />
  {/* Browser provides native date picker */}
</label>

{/* VIOLATION — user constructs API query */}
<input placeholder="Filter: status:active AND role:admin AND created:>2024-01-01" />

{/* CORRECT — structured UI absorbs query complexity */}
<FilterPanel>
  <FilterSelect name="status" options={['active', 'inactive']} />
  <FilterSelect name="role" options={['admin', 'user', 'viewer']} />
  <FilterDateRange name="created" />
</FilterPanel>
```

### 3. Focus on the Critical 20% (Pareto Principle)
80% of users use 20% of features. Optimize for the common case.

```jsx
{/* VIOLATION — all settings equally prominent */}
<SettingsPage>
  <Toggle label="Dark mode" />
  <Toggle label="Email notifications" />
  <Toggle label="Push notifications" />
  <Toggle label="Custom webhook URL" />
  <Toggle label="Debug mode" />
  <Toggle label="Experimental features" />
  <Toggle label="API access logging" />
  <Toggle label="Custom CSS injection" />
</SettingsPage>

{/* CORRECT — common settings prominent, advanced hidden */}
<SettingsPage>
  <Section title="General">
    <Toggle label="Dark mode" />
    <Toggle label="Email notifications" />
    <Toggle label="Push notifications" />
  </Section>
  <Disclosure title="Advanced Settings">
    <Toggle label="Custom webhook URL" />
    <Toggle label="Debug mode" />
    <Toggle label="API access logging" />
    <Toggle label="Experimental features" />
    <Toggle label="Custom CSS injection" />
  </Disclosure>
</SettingsPage>
```

### 4. Smart Defaults
Pre-fill and pre-select the most common options.

```jsx
{/* VIOLATION — empty selects, no defaults */}
<Select name="country" defaultValue="" />
<Select name="language" defaultValue="" />
<Select name="timezone" defaultValue="" />
<input name="email" />
```

```jsx
{/* CORRECT — smart defaults reduce decisions */}
<Select name="country" defaultValue={detectedCountry} />
<Select name="language" defaultValue={browserLanguage} />
<Select name="timezone" defaultValue={Intl.DateTimeFormat().resolvedOptions().timeZone} />
<Select name="currency" defaultValue={countryCurrency[detectedCountry]} />
```

```html
<!-- Pre-fill with autocomplete -->
<input name="name" autocomplete="name" />
<input name="email" autocomplete="email" />
<input name="address" autocomplete="street-address" />
```

## Code Review Checklist

- [ ] Every visual element serves the user's primary task
- [ ] No decorative elements that could be removed without loss of function
- [ ] Complex inputs use structured UI (date pickers, selectors) not free text
- [ ] Rarely-used features are in "Advanced" or "More" sections
- [ ] Common flows are optimized (fewest steps possible)
- [ ] Smart defaults pre-fill based on context (locale, device, history)
- [ ] `autocomplete` attributes on all applicable form fields
- [ ] Error messages tell users how to fix, not just what's wrong
