# Example: full bootstrap of a new project

Demonstration of a dialogue where the user deploys the baseline into a freshly created folder.

---

**User:**
> Install my guides into this project.

**Claude (via the `bootstrap` skill):**

```
Orientation:
  cwd: /Users/me/Work/new-api-service
  .git: found (branch main, 0 commits)
  CLAUDE.md: missing
  guides/: missing

Plan:
  + CLAUDE.md                          (from template, placeholder <PROJECT_NAME> → new-api-service)
  + guides/                            (will create)
  + guides/CLAUDE-MD-GUIDE.ru.md       (will copy)
  + guides/GIT-FLOW-GUIDE.ru.md        (will copy)
  + guides/INDEX.md                    (will create)

Proceed? [y/n]
```

**User:**
> y

**Claude:**
```
✓ guides/                                   created
✓ guides/GIT-FLOW-GUIDE.ru.md               copied
✓ guides/CLAUDE-MD-GUIDE.ru.md              copied
✓ guides/INDEX.md                           created
✓ CLAUDE.md                                  created from template

Next steps:
  - Open CLAUDE.md, fill in "What this project is" and "How to work with it".
  - To capture the baseline: git add . && git commit -m "chore: add Claude Code baseline scaffold"
```

---

## Example: append a guides block to an existing CLAUDE.md

**User:**
> I already have CLAUDE.md, but I want to add the guides.

**Claude:**
```
Found existing CLAUDE.md. Mode: append — will only add a "Reference" block
linking to guides/INDEX.md. Old content untouched.

  + guides/ (will create)
  + guides/CLAUDE-MD-GUIDE.ru.md
  + guides/GIT-FLOW-GUIDE.ru.md
  + guides/INDEX.md
  ~ CLAUDE.md (append "Reference" section — only if not already there)

Proceed? [y/n]
```

---

## Example: git-flow only

**User:**
> I only need the git-flow guide, no CLAUDE.md rules.

**Claude:**
```
Mode: git-flow only. CLAUDE.md untouched.

  + guides/ (will create)
  + guides/GIT-FLOW-GUIDE.ru.md
  + guides/INDEX.md (only the git-flow line)

Proceed? [y/n]
```
