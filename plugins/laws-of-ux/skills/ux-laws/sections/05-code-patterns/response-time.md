# Response Time & Feedback

**Related Laws:** Doherty Threshold, Flow, Aesthetic-Usability Effect

## Rules

### 1. Show Feedback Within 100ms
Any user action must produce visual feedback within 100ms.

```css
/* Button active state — immediate feedback */
.btn:active {
  transform: scale(0.97);
  transition: transform 50ms ease;
}

/* Input focus — immediate visual change */
.input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-alpha);
  outline: none;
  transition: border-color 100ms, box-shadow 100ms;
}
```

### 2. Show Loading State for Operations Exceeding 400ms (Doherty Threshold)
If content takes > 400ms to load, show a loading indicator.

```jsx
{/* VIOLATION — no loading state */}
function UserList() {
  const { data } = useFetch('/api/users');
  return <List items={data} />;
}

{/* CORRECT — skeleton screen for loading */}
function UserList() {
  const { data, isLoading } = useFetch('/api/users');

  if (isLoading) return <UserListSkeleton />;
  return <List items={data} />;
}

{/* Skeleton component */}
function UserListSkeleton() {
  return (
    <div className="skeleton-list">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="skeleton-row" />
      ))}
    </div>
  );
}
```

```css
.skeleton-row {
  height: 48px;
  border-radius: var(--radius-sm);
  background: linear-gradient(90deg,
    var(--color-skeleton) 25%,
    var(--color-skeleton-shine) 50%,
    var(--color-skeleton) 75%
  );
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s infinite;
}

@keyframes skeleton-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

### 3. Progress Indicators for Long Operations (> 1s)
Operations exceeding 1 second need progress feedback.

```jsx
{/* CORRECT — progress bar for file upload */}
function FileUpload() {
  const [progress, setProgress] = useState(0);

  return (
    <div>
      <input type="file" onChange={handleUpload} />
      {progress > 0 && progress < 100 && (
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${progress}%` }}
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      )}
    </div>
  );
}
```

### 4. Animation Duration: 200-500ms
UI animations should be fast enough to feel responsive but slow enough to be perceived.

```css
/* Micro-interactions: 100-200ms */
.btn { transition: background-color 150ms ease; }
.toggle { transition: transform 200ms ease; }

/* Content transitions: 200-300ms */
.modal { transition: opacity 250ms ease, transform 250ms ease; }
.dropdown { transition: max-height 200ms ease-out; }

/* Page transitions: 300-500ms */
.page-enter { animation: fadeIn 300ms ease; }

/* VIOLATION — too slow, breaks flow */
.btn { transition: background-color 800ms ease; }
.modal { transition: opacity 1500ms ease; }
```

### 5. Optimistic UI Updates
For common actions, update UI immediately before server confirms.

```jsx
{/* VIOLATION — wait for server */}
async function handleLike() {
  await api.like(postId);
  refetchPost();
}

{/* CORRECT — optimistic update */}
function handleLike() {
  setLiked(true);           // Immediate UI update
  setCount(c => c + 1);

  api.like(postId).catch(() => {
    setLiked(false);         // Revert on failure
    setCount(c => c - 1);
    toast.error('Failed to like');
  });
}
```

### 6. Respect prefers-reduced-motion
Honor user's motion preferences for accessibility.

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

## Code Review Checklist

- [ ] All interactive elements have :active/:focus states (< 100ms)
- [ ] Data fetching shows skeleton/spinner when response exceeds 400ms
- [ ] Operations > 1s show progress indicator
- [ ] Animations are 200-500ms (micro: 100-200ms)
- [ ] No animations > 500ms for UI transitions
- [ ] Optimistic updates for common user actions (like, save, toggle)
- [ ] `prefers-reduced-motion` is respected
- [ ] Content loading uses skeleton screens for layout stability; spinners are appropriate for inline button/action loading states
