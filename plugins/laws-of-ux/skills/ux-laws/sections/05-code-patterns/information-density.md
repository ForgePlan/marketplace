# Information Density

**Related Laws:** Miller's Law, Cognitive Load, Chunking, Working Memory, Paradox of Active User

## Rules

### 1. Chunk Form Fields into Groups
Long forms must be broken into logical groups of 3-5 fields.

```jsx
{/* VIOLATION — 15 fields in one flat form */}
<form>
  <input name="firstName" />
  <input name="lastName" />
  <input name="email" />
  <input name="phone" />
  <input name="street" />
  <input name="city" />
  <input name="state" />
  <input name="zip" />
  <input name="cardNumber" />
  <input name="expiry" />
  <input name="cvv" />
  <input name="billingStreet" />
  <input name="billingCity" />
  <input name="billingState" />
  <input name="billingZip" />
</form>

{/* CORRECT — multi-step form with chunking */}
<FormWizard>
  <Step title="Personal Info" fields={['firstName', 'lastName', 'email', 'phone']} />
  <Step title="Shipping Address" fields={['street', 'city', 'state', 'zip']} />
  <Step title="Payment" fields={['cardNumber', 'expiry', 'cvv']} />
  <Step title="Billing Address" fields={['billingStreet', 'billingCity', 'billingState', 'billingZip']} />
</FormWizard>
```

**Check:** If a form has > 7 visible fields simultaneously, suggest chunking or multi-step.

### 2. Use Input Masks for Structured Data
Chunk data visually in inputs to match mental models.

```html
<!-- VIOLATION — raw input for phone -->
<input type="text" name="phone" placeholder="Phone number" />

<!-- CORRECT — masked input shows chunking -->
<input type="tel" name="phone" placeholder="(___) ___-____"
  pattern="\(\d{3}\) \d{3}-\d{4}" />

<!-- For credit cards -->
<input type="text" name="card" placeholder="____ ____ ____ ____"
  inputmode="numeric" autocomplete="cc-number" />
```

### 3. Table Data — Limit Visible Columns
Data tables should show ≤ 7 columns by default.

```jsx
{/* VIOLATION — too many columns visible */}
<Table columns={[
  'id', 'name', 'email', 'phone', 'address', 'city',
  'state', 'zip', 'country', 'role', 'status', 'created', 'updated'
]} />

{/* CORRECT — essential columns + expandable details */}
<Table
  columns={['name', 'email', 'role', 'status', 'created']}
  expandable={row => <DetailPanel row={row} />}
/>
```

### 4. Progressive Disclosure for Features
New users should see only essential features.

```jsx
{/* VIOLATION — all features visible to everyone */}
<Toolbar>
  <BoldButton /><ItalicButton /><UnderlineButton />
  <StrikeButton /><CodeButton /><BlockquoteButton />
  <H1Button /><H2Button /><H3Button />
  <LinkButton /><ImageButton /><TableButton />
  <AlignLeftButton /><AlignCenterButton /><AlignRightButton />
  <UndoButton /><RedoButton />
</Toolbar>

{/* CORRECT — progressive disclosure */}
<Toolbar>
  <BoldButton /><ItalicButton /><LinkButton />
  <MoreButton>
    {/* Revealed on click */}
    <UnderlineButton /><StrikeButton /><CodeButton />
    <HeadingDropdown /><BlockquoteButton />
    <AlignmentDropdown /><TableButton /><ImageButton />
  </MoreButton>
</Toolbar>
```

### 5. Reduce Cognitive Load — One Primary Action Per Screen
Each screen/section should have one clear primary action.

```html
<!-- VIOLATION — competing CTAs -->
<div class="hero">
  <button class="btn-primary">Sign Up Free</button>
  <button class="btn-primary">Watch Demo</button>
  <button class="btn-primary">Read Docs</button>
</div>

<!-- CORRECT — one primary, others secondary -->
<div class="hero">
  <button class="btn-primary">Sign Up Free</button>
  <button class="btn-secondary">Watch Demo</button>
  <a class="btn-text">Read Docs →</a>
</div>
```

### 6. Inline Help for Active Users
Users don't read docs — provide contextual guidance.

```jsx
{/* VIOLATION — no context for non-obvious field */}
<FormField label="API Key" />

{/* CORRECT — tooltips and inline help */}
<FormField
  label="API Key"
  hint="Find this in Settings → API → Generate Key"
  tooltip="Your API key authenticates requests to our service"
/>
```

## Code Review Checklist

- [ ] Forms with > 7 fields use multi-step or accordion grouping
- [ ] Phone numbers, credit cards, dates use input masks
- [ ] Data tables show ≤ 7 columns by default
- [ ] Complex toolbars use progressive disclosure (More/...)
- [ ] Each screen has exactly one primary CTA
- [ ] Inline help (tooltips, hints) available for non-obvious fields
- [ ] No walls of text — content is chunked with headings, lists, cards
