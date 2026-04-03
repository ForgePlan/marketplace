# Motivation & Progress

**Related Laws:** Goal-Gradient Effect, Zeigarnik Effect, Peak-End Rule, Parkinson's Law

## Rules

### 1. Show Progress in Multi-Step Flows
Users are more motivated when they can see progress toward a goal.

```jsx
{/* VIOLATION — no progress indication */}
<form>
  <Step1 />  {/* User has no idea how many steps remain */}
</form>

{/* CORRECT — progress stepper */}
<div>
  <ProgressBar current={2} total={4} />
  <StepIndicator
    steps={['Account', 'Profile', 'Preferences', 'Confirm']}
    current={2}
  />
  <Step2 />
</div>
```

```css
.progress-bar {
  height: 4px;
  background: var(--color-surface-secondary);
  border-radius: 2px;
  overflow: hidden;
}
.progress-bar-fill {
  height: 100%;
  background: var(--color-primary);
  transition: width 300ms ease;
}
```

### 2. Artificial Head Start (Goal-Gradient)
Give users a sense of existing progress to motivate completion.

```jsx
{/* CORRECT — profile starts at 20% "complete" */}
function ProfileCompletion({ user }) {
  // Base 20% for just having an account
  const baseProgress = 20;
  const fields = ['avatar', 'bio', 'location', 'website'];
  const filled = fields.filter(f => user[f]).length;
  const progress = baseProgress + (filled / fields.length) * 80;

  return (
    <div>
      <ProgressBar value={progress} />
      <p>Your profile is {Math.round(progress)}% complete</p>
      {progress < 100 && (
        <p>Complete your {fields.find(f => !user[f])} to level up!</p>
      )}
    </div>
  );
}
```

### 3. Leave Tasks Visibly Incomplete (Zeigarnik)
Incomplete tasks create mental tension that motivates completion.

```jsx
{/* CORRECT — incomplete onboarding persists */}
function OnboardingChecklist({ tasks }) {
  const completed = tasks.filter(t => t.done).length;

  return (
    <aside className="onboarding-panel">
      <h3>{completed}/{tasks.length} setup tasks</h3>
      <ProgressBar value={completed / tasks.length * 100} />
      <ul>
        {tasks.map(task => (
          <li key={task.id} className={task.done ? 'completed' : ''}>
            <input type="checkbox" checked={task.done} readOnly />
            {task.label}
          </li>
        ))}
      </ul>
    </aside>
  );
}
```

```css
/* Visual cue for incomplete vs complete */
.completed { text-decoration: line-through; opacity: 0.6; }
```

### 4. Delight at Peak and End Moments (Peak-End Rule)
The most emotional and final moments define the experience.

```jsx
{/* CORRECT — celebration on first completion */}
function OrderConfirmation() {
  return (
    <div className="confirmation">
      <SuccessAnimation />  {/* Confetti or check animation */}
      <h1>Order Placed!</h1>
      <p>You'll receive a confirmation email shortly.</p>
      <ShareButton />  {/* Positive end moment */}
    </div>
  );
}

{/* CORRECT — smooth, branded loading for important actions */}
function SubmitButton({ isSubmitting, onSubmit }) {
  return (
    <button onClick={onSubmit} disabled={isSubmitting}>
      {isSubmitting ? (
        <span className="submit-loading">
          <Spinner size="sm" />
          Processing...
        </span>
      ) : 'Submit'}
    </button>
  );
}
```

### 5. Time-Constrained Inputs (Parkinson's Law)
Set appropriate constraints to prevent task inflation.

```jsx
{/* CORRECT — communicate expected time */}
<p className="form-estimate">This form takes about 2 minutes</p>

{/* Use deadlines for time-sensitive actions */}
<div className="offer-timer">
  <p>Offer expires in <Countdown target={deadline} /></p>
</div>

{/* Auto-save to reduce "Submit" anxiety */}
<textarea
  onChange={handleChange}
  aria-label="Notes"
/>
<span className="autosave-status">Saved automatically</span>
```

## Code Review Checklist

- [ ] Multi-step flows show progress (stepper, progress bar, X of Y)
- [ ] Long forms show estimated completion time
- [ ] Profile/onboarding completion starts above 0% (artificial head start)
- [ ] Incomplete onboarding tasks remain visible as gentle reminders
- [ ] Success/completion screens have positive visual feedback (animation, illustration)
- [ ] Error states are handled gracefully (not just red text)
- [ ] Important forms have auto-save
- [ ] Final steps in flows feel like achievements, not bureaucracy
