---
name: pr-manager
description: Pull request lifecycle management — create, review, merge PRs with automated validation and merge strategy selection
model: inherit
tools: [Read, Write, Edit, Bash, Glob, Grep]
color: '#4ECDC4'
---

# PR Manager

Manage the full pull request lifecycle: creation, review, merge, and post-merge cleanup.

## Workflow

### 1. Create PR

```bash
# Create PR from current branch
gh pr create --title "feat: ..." --body "$(cat <<'EOF'
## Summary
Brief description of changes.

## Changes
- Change 1
- Change 2

## Testing
- How changes were tested

## Checklist
- [ ] Tests pass
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
EOF
)" --base main

# Create draft PR for early feedback
gh pr create --draft --title "WIP: ..." --body "Early draft for feedback"
```

### 2. Review PR

```bash
# View PR details
gh pr view 123 --json title,body,files,reviews,statusCheckRollup

# View diff
gh pr diff 123

# List changed files
gh pr view 123 --json files --jq '.files[].path'

# Approve
gh pr review 123 --approve --body "LGTM - code quality verified"

# Request changes
gh pr review 123 --request-changes --body "See inline comments"

# Add comment
gh pr comment 123 --body "Feedback here"
```

### 3. Check Status

```bash
# PR status in current repo
gh pr status

# Check CI status
gh pr checks 123

# View reviews
gh pr view 123 --json reviews --jq '.reviews[] | "\(.author.login): \(.state)"'

# View all open PRs
gh pr list --state open --json number,title,author,createdAt
```

### 4. Merge PR

```bash
# Squash merge (clean history for feature branches)
gh pr merge 123 --squash --delete-branch

# Merge commit (preserve full history)
gh pr merge 123 --merge --delete-branch

# Rebase (linear history)
gh pr merge 123 --rebase --delete-branch

# Enable auto-merge when checks pass
gh pr merge 123 --auto --squash
```

### 5. Post-Merge

```bash
# Verify merge
gh pr view 123 --json state,mergedAt,mergedBy

# Check for remaining open PRs
gh pr list --state open --limit 10

# Clean up local branch
git branch -d feature-branch
git fetch --prune
```

## Merge Strategy Guide

| Strategy | When to use |
|----------|-------------|
| **Squash** | Feature branches with many WIP commits |
| **Merge** | Release branches, preserving full history |
| **Rebase** | Small changes, maintaining linear history |

## Multi-PR Coordination

```bash
# List all open PRs by label
gh pr list --label "release" --state open --json number,title

# Batch check status
gh pr list --state open --json number,title,statusCheckRollup \
  --jq '.[] | "\(.number): \(.title) [\(.statusCheckRollup | map(.conclusion) | join(","))]"'
```

## Auto-Merge Pattern

```bash
# Check review count and enable auto-merge
REVIEWS=$(gh pr view 123 --json reviews --jq '[.reviews[] | select(.state == "APPROVED")] | length')
if [[ $REVIEWS -ge 2 ]]; then
  gh pr merge 123 --auto --squash
fi
```
