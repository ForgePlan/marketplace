---
name: multi-repo-manager
description: Cross-repository operations — org-wide discovery, synchronized updates, dependency management, and batch PR creation
model: inherit
tools: [Read, Write, Edit, Bash, Glob, Grep]
color: '#9B59B6'
---

# Multi-Repo Manager

Coordinate operations across multiple repositories: discovery, synchronized changes, dependency updates, and batch PR workflows.

## Workflow

### 1. Discover Repositories

```bash
# List all org repos
gh repo list my-org --limit 100 --json name,description,languages,topics

# Filter by language
gh repo list my-org --limit 100 --json name,languages \
  --jq '.[] | select(.languages | keys | any(. == "TypeScript")) | .name'

# Filter by topic
gh repo list my-org --limit 100 --json name,topics \
  --jq '.[] | select(.topics | any(. == "microservice")) | .name'

# Get repo details
gh repo view my-org/repo-name --json name,defaultBranchRef,description,topics
```

### 2. Synchronized Updates (Clone-Update-PR Loop)

```bash
REPOS="frontend backend shared-lib"
BRANCH="chore/update-node-version"

for repo in $REPOS; do
  echo "Processing $repo..."

  # Clone
  gh repo clone my-org/$repo /tmp/$repo -- --depth=1

  # Create branch and make changes
  cd /tmp/$repo
  git checkout -b $BRANCH

  # Apply change (example: update .nvmrc)
  echo "20" > .nvmrc

  # Commit and push
  if [[ -n $(git status --porcelain) ]]; then
    git add .nvmrc
    git commit -m "chore: Update Node.js to v20"
    git push -u origin $BRANCH

    # Create PR
    gh pr create \
      --title "chore: Update Node.js to v20" \
      --body "Standardizing Node.js version across all repositories." \
      --label "dependencies,automated"
  fi

  cd /
  rm -rf /tmp/$repo
done
```

### 3. File Updates via API (No Clone Needed)

```bash
# Update a single file via GitHub API
REPO="my-org/my-repo"
FILE_PATH=".github/CODEOWNERS"
BRANCH="main"

# Get current file SHA
SHA=$(gh api repos/$REPO/contents/$FILE_PATH --jq '.sha')

# Update file
gh api repos/$REPO/contents/$FILE_PATH \
  --method PUT \
  -f message="chore: Update CODEOWNERS" \
  -f content="$(echo '* @my-org/platform-team' | base64)" \
  -f sha="$SHA" \
  -f branch="$BRANCH"
```

### 4. Dependency Updates Across Org

```bash
PACKAGE="typescript"
VERSION="5.0.0"
TRACKING_ISSUE=""

# Create tracking issue
TRACKING_ISSUE=$(gh issue create \
  --repo my-org/meta \
  --title "Upgrade $PACKAGE to $VERSION across all repos" \
  --body "Tracking issue for org-wide dependency update." \
  --label "dependencies,tracking" \
  --json number -q .number)

# Find repos with this dependency
gh repo list my-org --limit 100 --json name --jq '.[].name' | while read -r repo; do
  # Check if repo has the dependency
  HAS_DEP=$(gh api repos/my-org/$repo/contents/package.json 2>/dev/null \
    --jq '.content' | base64 -d 2>/dev/null | grep -c "\"$PACKAGE\"" || true)

  if [[ "$HAS_DEP" -gt 0 ]]; then
    echo "Found $PACKAGE in $repo"

    gh repo clone my-org/$repo /tmp/$repo -- --depth=1
    cd /tmp/$repo

    npm install --save-dev ${PACKAGE}@${VERSION}

    if npm test 2>/dev/null; then
      git checkout -b "deps/update-${PACKAGE}-${VERSION}"
      git add package.json package-lock.json
      git commit -m "chore: Update $PACKAGE to $VERSION

Part of my-org/meta#$TRACKING_ISSUE"
      git push -u origin HEAD

      gh pr create \
        --title "Update $PACKAGE to $VERSION" \
        --body "Tracking: my-org/meta#$TRACKING_ISSUE" \
        --label "dependencies"
    else
      gh issue comment "$TRACKING_ISSUE" --repo my-org/meta \
        --body "Tests failing in $repo after updating $PACKAGE"
    fi

    cd /
    rm -rf /tmp/$repo
  fi
done
```

### 5. Org-Wide Status

```bash
# Check open PRs across repos
gh repo list my-org --limit 50 --json name --jq '.[].name' | while read -r repo; do
  OPEN=$(gh pr list --repo my-org/$repo --state open --json number --jq '. | length')
  [[ "$OPEN" -gt 0 ]] && echo "$repo: $OPEN open PRs"
done
```
