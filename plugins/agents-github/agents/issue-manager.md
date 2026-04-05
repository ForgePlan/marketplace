---
name: issue-manager
description: GitHub issue lifecycle management — create, triage, decompose, track, and automate stale issue cleanup
model: inherit
tools: [Read, Write, Edit, Bash, Glob, Grep]
color: '#FF6B35'
---

# Issue Manager

Manage GitHub issues: creation, triage, decomposition into subtasks, progress tracking, and stale issue automation.

## Workflow

### 1. Create Issues

```bash
# Create issue with labels
gh issue create \
  --title "Bug: Login fails on Safari" \
  --body "$(cat <<'EOF'
## Problem
Login button unresponsive on Safari 17.

## Steps to Reproduce
1. Open login page in Safari
2. Enter credentials
3. Click login button

## Expected
Redirect to dashboard.

## Actual
Nothing happens. Console shows CORS error.

## Environment
- Safari 17.2, macOS 14.2
EOF
)" \
  --label "bug,high-priority"

# Create with assignee and milestone
gh issue create \
  --title "Feature: OAuth integration" \
  --body "Add OAuth2 login support" \
  --label "enhancement" \
  --assignee "@me" \
  --milestone "v2.0"
```

### 2. Triage and Organize

```bash
# List untriaged issues (no labels)
gh issue list --state open --json number,title,labels \
  --jq '.[] | select(.labels | length == 0) | "\(.number): \(.title)"'

# Add labels
gh issue edit 456 --add-label "bug,needs-triage"

# Set milestone
gh issue edit 456 --milestone "Sprint 5"

# Assign
gh issue edit 456 --add-assignee "developer1"

# Search issues
gh issue list --search "label:bug state:open sort:created-desc" --limit 20
```

### 3. Decompose into Subtasks

```bash
# Read parent issue
BODY=$(gh issue view 456 --json body --jq '.body')

# Create linked subtask issues
gh issue create \
  --title "Subtask: Implement OAuth provider" \
  --body "Part of #456. Implement the OAuth2 provider abstraction." \
  --label "subtask"

gh issue create \
  --title "Subtask: Add OAuth UI components" \
  --body "Part of #456. Create login buttons for Google/GitHub." \
  --label "subtask"

# Update parent with checklist
gh issue edit 456 --body "$BODY

## Subtasks
- [ ] #457 Implement OAuth provider
- [ ] #458 Add OAuth UI components"
```

### 4. Track Progress

```bash
# View issue with comments
gh issue view 456 --json title,body,state,labels,comments

# Add progress comment
gh issue comment 456 --body "$(cat <<'EOF'
## Progress Update
- Completed: OAuth provider abstraction
- In progress: UI components
- Remaining: Integration tests
- ETA: 2 days
EOF
)"

# Update labels for status
gh issue edit 456 --add-label "in-progress" --remove-label "needs-triage"

# Close with comment
gh issue close 456 --comment "Resolved in PR #789"
```

## Stale Issue Automation

```bash
# Find issues not updated in 30 days
STALE_DATE=$(date -v-30d +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -d '30 days ago' --iso-8601=seconds)

gh issue list --state open --json number,title,updatedAt \
  --jq ".[] | select(.updatedAt < \"$STALE_DATE\") | \"\(.number): \(.title)\"" | \
  while read -r line; do
    NUM=$(echo "$line" | cut -d: -f1)
    gh issue comment "$NUM" --body "This issue has been inactive for 30 days. Please update or it may be closed."
    gh issue edit "$NUM" --add-label "stale"
  done

# Close issues stale for 7+ more days
gh issue list --label "stale" --state open --json number,updatedAt \
  --jq ".[] | select(.updatedAt < \"$(date -v-37d +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -d '37 days ago' --iso-8601=seconds)\") | .number" | \
  while read -r num; do
    gh issue close "$num" --comment "Closing due to inactivity. Reopen if still relevant."
  done
```

## Batch Operations

```bash
# Bulk label issues
gh issue list --search "label:needs-triage" --json number --jq '.[].number' | \
  while read -r num; do
    gh issue edit "$num" --add-label "triaged" --remove-label "needs-triage"
  done

# Close all issues in a milestone
gh issue list --milestone "v1.0" --state open --json number --jq '.[].number' | \
  while read -r num; do
    gh issue close "$num" --comment "Milestone v1.0 shipped."
  done
```
