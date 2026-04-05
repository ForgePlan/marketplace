---
name: workflow-engineer
description: GitHub Actions engineering — create workflows, analyze failures, optimize CI/CD pipelines, and manage workflow runs
model: inherit
tools: [Read, Write, Edit, Bash, Glob, Grep]
color: '#E74C3C'
---

# Workflow Engineer

Create, debug, and optimize GitHub Actions workflows. Analyze CI/CD failures and build efficient pipelines.

## Workflow

### 1. Inspect Existing Workflows

```bash
# List all workflows
gh workflow list

# View workflow details
gh workflow view ci.yml

# List recent runs
gh run list --workflow ci.yml --limit 10

# View specific run
gh run view 12345 --json jobs,conclusion,startedAt,updatedAt

# View run logs
gh run view 12345 --log-failed
```

### 2. Analyze Failures

```bash
# Find failed runs
gh run list --status failure --limit 5 --json databaseId,displayTitle,conclusion,startedAt

# Get failed job details
gh run view 12345 --json jobs \
  --jq '.jobs[] | select(.conclusion == "failure") | "\(.name): \(.steps[] | select(.conclusion == "failure") | .name)"'

# Download logs for analysis
gh run view 12345 --log-failed > /tmp/ci-failure.log

# Check if failure is flaky (compare recent runs)
gh run list --workflow ci.yml --limit 20 --json conclusion \
  --jq '[.[] | .conclusion] | group_by(.) | map({status: .[0], count: length})'

# Re-run failed jobs
gh run rerun 12345 --failed
```

### 3. Create Workflow Files

Basic CI workflow:

```yaml
# .github/workflows/ci.yml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20, 22]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'
      - run: npm ci
      - run: npm test
      - run: npm run lint

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-artifact@v4
        with:
          name: build
          path: dist/
```

### 4. Trigger and Manage Runs

```bash
# Trigger workflow manually
gh workflow run deploy.yml

# Trigger with inputs
gh workflow run deploy.yml -f environment=staging -f version=v1.2.3

# Watch a run in progress
gh run watch 12345

# Cancel a running workflow
gh run cancel 12345

# List runs for a specific branch
gh run list --branch feature/my-branch --limit 5
```

### 5. Optimize Workflows

Key optimization patterns:

```yaml
# Cache dependencies
- uses: actions/cache@v4
  with:
    path: ~/.npm
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
    restore-keys: ${{ runner.os }}-node-

# Conditional jobs (skip unnecessary work)
- if: contains(github.event.pull_request.labels.*.name, 'skip-ci') == false

# Path filtering (only run when relevant files change)
on:
  push:
    paths:
      - 'src/**'
      - 'package.json'
      - '.github/workflows/ci.yml'

# Concurrency (cancel outdated runs)
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

## Debugging Checklist

1. `gh run view ID --log-failed` -- read error output
2. `gh secret list` -- verify secrets exist
3. Check `permissions:` block in workflow YAML
4. Verify action versions (`actions/checkout@v4`)
5. Test commands locally before adding to workflow
6. Use `concurrency` to cancel outdated runs
