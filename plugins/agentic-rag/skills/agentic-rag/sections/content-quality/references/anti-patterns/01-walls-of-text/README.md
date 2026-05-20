# Anti-Pattern: Walls of Text

## What it is

A single file contains hundreds of lines of prose — background, rules,
examples, edge cases, caveats — all mixed together with no navigation layer.

## Why it's bad

- Claude loads the entire file on every trigger, even when only 10% is relevant
- No affordance to skip — agent reads from line 1 to line 300 every time
- Updates require editing one monolithic file, increasing merge-conflict risk
- Context budget fills up before reaching sections the user actually needs

## How to detect

```
wc -l sections/**/*.md | sort -rn | head -10
```
Any content file over 70 lines is a candidate. SKILL.md over 150 lines is a red flag.

## How to fix

1. Identify logical sub-topics within the file (each gets its own file)
2. Keep each sub-file to 30-50 lines of focused content
3. Replace the monolith with a `_index.md` that lists the sub-files + one-line descriptions

## See also

- `bad.md` — concrete example of a wall-of-text SKILL.md
- `good.md` — same content split into router + focused files
