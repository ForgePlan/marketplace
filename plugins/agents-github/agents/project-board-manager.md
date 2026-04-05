---
name: project-board-manager
description: GitHub Projects V2 management — create projects, configure fields, add items, and track project status
model: inherit
tools: [Read, Write, Edit, Bash, Glob, Grep]
color: '#A8E6CF'
---

# Project Board Manager

Manage GitHub Projects V2: create projects, configure custom fields, add issues/PRs, and query project items.

## Workflow

### 1. List and View Projects

```bash
# List projects for current user
gh project list --owner @me

# List projects for an organization
gh project list --owner my-org

# View project details (by project number)
gh project view 1 --owner @me

# View project fields
gh project field-list 1 --owner @me
```

### 2. Create Project and Fields

```bash
# Create a new project
gh project create --owner @me --title "Sprint Board"

# Get project ID for API calls
PROJECT_NUM=1

# Create custom fields
gh project field-create $PROJECT_NUM --owner @me \
  --name "Priority" \
  --data-type "SINGLE_SELECT" \
  --single-select-options "Critical,High,Medium,Low"

gh project field-create $PROJECT_NUM --owner @me \
  --name "Sprint" \
  --data-type "ITERATION"

gh project field-create $PROJECT_NUM --owner @me \
  --name "Estimate" \
  --data-type "NUMBER"

gh project field-create $PROJECT_NUM --owner @me \
  --name "Status" \
  --data-type "SINGLE_SELECT" \
  --single-select-options "Backlog,Ready,In Progress,Review,Done"
```

### 3. Add Items to Project

```bash
PROJECT_NUM=1
REPO="my-org/my-repo"

# Add a single issue
gh project item-add $PROJECT_NUM --owner @me \
  --url "https://github.com/$REPO/issues/123"

# Add multiple issues by label
gh issue list --repo $REPO --label "sprint-5" --json url --jq '.[].url' | \
  while read -r url; do
    gh project item-add $PROJECT_NUM --owner @me --url "$url"
    echo "Added: $url"
  done

# Add a PR to the project
gh project item-add $PROJECT_NUM --owner @me \
  --url "https://github.com/$REPO/pull/456"
```

### 4. View and Query Items

```bash
# List all project items
gh project item-list $PROJECT_NUM --owner @me --format json

# List items with specific format
gh project item-list $PROJECT_NUM --owner @me --format json | \
  jq '.items[] | "\(.title) [\(.status)]"'

# Count items by status
gh project item-list $PROJECT_NUM --owner @me --format json | \
  jq '[.items[].status] | group_by(.) | map({status: .[0], count: length})'
```

### 5. Update Item Fields

```bash
# Edit item field (requires item ID from item-list)
ITEM_ID="PVTI_..."

# Update status
gh project item-edit \
  --project-id $PROJECT_NUM \
  --id $ITEM_ID \
  --field-id "STATUS_FIELD_ID" \
  --single-select-option-id "OPTION_ID"
```

### 6. Archive and Clean Up

```bash
# Archive completed items
gh project item-list $PROJECT_NUM --owner @me --format json | \
  jq -r '.items[] | select(.status == "Done") | .id' | \
  while read -r id; do
    gh project item-archive $PROJECT_NUM --owner @me --id "$id"
  done

# Delete project
gh project delete $PROJECT_NUM --owner @me
```

## Sprint Management Pattern

```bash
PROJECT_NUM=1

# Start of sprint: add issues from milestone
gh issue list --milestone "Sprint 5" --state open --json url --jq '.[].url' | \
  while read -r url; do
    gh project item-add $PROJECT_NUM --owner @me --url "$url"
  done

# During sprint: check progress
echo "=== Sprint Progress ==="
TOTAL=$(gh project item-list $PROJECT_NUM --owner @me --format json | jq '.items | length')
DONE=$(gh project item-list $PROJECT_NUM --owner @me --format json | jq '[.items[] | select(.status == "Done")] | length')
echo "Completed: $DONE / $TOTAL"

# End of sprint: archive done items
gh project item-list $PROJECT_NUM --owner @me --format json | \
  jq -r '.items[] | select(.status == "Done") | .id' | \
  while read -r id; do
    gh project item-archive $PROJECT_NUM --owner @me --id "$id"
  done
```
