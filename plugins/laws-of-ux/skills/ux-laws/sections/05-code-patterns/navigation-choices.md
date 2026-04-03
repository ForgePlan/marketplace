# Navigation & Choices

**Related Laws:** Hick's Law, Choice Overload, Serial Position Effect

## Rules

### 1. Limit Top-Level Navigation Items
Navigation should not exceed 7±2 items to avoid decision paralysis.

```html
<!-- VIOLATION — too many top-level items -->
<nav>
  <a href="/home">Home</a>
  <a href="/products">Products</a>
  <a href="/services">Services</a>
  <a href="/about">About</a>
  <a href="/blog">Blog</a>
  <a href="/careers">Careers</a>
  <a href="/press">Press</a>
  <a href="/investors">Investors</a>
  <a href="/partners">Partners</a>
  <a href="/support">Support</a>
  <a href="/contact">Contact</a>
  <a href="/legal">Legal</a>
</nav>

<!-- CORRECT — 5 items + "More" dropdown -->
<nav>
  <a href="/home">Home</a>
  <a href="/products">Products</a>
  <a href="/services">Services</a>
  <a href="/about">About</a>
  <a href="/contact">Contact</a>
  <button aria-expanded="false">More ▾</button>
</nav>
```

**Check:** Count direct children of `<nav>`. If > 7, suggest grouping.

### 2. Progressive Disclosure
Complex features should be revealed gradually, not all at once.

```jsx
{/* VIOLATION — all options visible at once */}
<SettingsPanel>
  <GeneralSettings />
  <NotificationSettings />
  <PrivacySettings />
  <SecuritySettings />
  <IntegrationSettings />
  <DeveloperSettings />
  <ExperimentalSettings />
</SettingsPanel>

{/* CORRECT — progressive disclosure with tabs or accordion */}
<SettingsPanel>
  <Tabs defaultTab="general">
    <Tab label="General"><GeneralSettings /></Tab>
    <Tab label="Notifications"><NotificationSettings /></Tab>
    <Tab label="Privacy & Security"><PrivacySecuritySettings /></Tab>
    <Tab label="Advanced"><AdvancedSettings /></Tab>
  </Tabs>
</SettingsPanel>
```

### 3. Highlight Recommended Options
When choices are necessary, reduce cognitive load by pre-selecting or highlighting the recommended option.

```jsx
{/* VIOLATION — three equal pricing cards */}
<div className="pricing">
  <PriceCard plan="basic" />
  <PriceCard plan="pro" />
  <PriceCard plan="enterprise" />
</div>

{/* CORRECT — recommended option is visually distinct */}
<div className="pricing">
  <PriceCard plan="basic" />
  <PriceCard plan="pro" recommended label="Most Popular" />
  <PriceCard plan="enterprise" />
</div>
```

```css
.price-card--recommended {
  border: 2px solid var(--color-primary);
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}
```

### 4. Serial Position — Key Items First and Last
Most important navigation items should be placed at the beginning and end.

```html
<!-- Mobile bottom navigation — key items at edges -->
<nav class="bottom-nav">
  <a href="/home">Home</a>      <!-- FIRST — primacy effect -->
  <a href="/search">Search</a>
  <a href="/cart">Cart</a>
  <a href="/account">Account</a> <!-- LAST — recency effect -->
</nav>
```

**Check:** In horizontal navigation, verify most-used items are at start and end positions.

### 5. Search and Filtering for Large Sets
When options exceed ~10 items, provide search or filtering.

```jsx
{/* VIOLATION — long dropdown without search */}
<select>
  {countries.map(c => <option key={c.code}>{c.name}</option>)}
</select>

{/* CORRECT — searchable dropdown */}
<Combobox>
  <ComboboxInput placeholder="Search countries..." />
  <ComboboxOptions>
    {filteredCountries.map(c => (
      <ComboboxOption key={c.code} value={c.code}>
        {c.name}
      </ComboboxOption>
    ))}
  </ComboboxOptions>
</Combobox>
```

## Code Review Checklist

- [ ] Top-level navigation ≤ 7 items
- [ ] Complex options use progressive disclosure (tabs, accordion, step wizard)
- [ ] Recommended/default options are visually highlighted
- [ ] Lists > 10 items have search or filtering
- [ ] Most important nav items at first and last positions
- [ ] Dropdowns with > 10 options have search capability
- [ ] No duplicate navigation paths to same content
