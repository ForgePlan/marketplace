# Agentic RAG Starter Kit

A minimal skeleton for a new Claude Code skill using the agentic RAG pattern.

## How to fork

1. Copy this `starter-kit/` directory to your plugin:

```bash
cp -R starter-kit/ plugins/my-plugin/skills/my-skill/
```

2. Replace all placeholders (search for `MY_SKILL_`):

| Placeholder | Replace with |
|-------------|-------------|
| `MY_SKILL_NAME` | Your skill name (kebab-case, e.g. `fp-cookbook`) |
| `MY_SKILL_DESCRIPTION` | One-line description of what your skill does |
| `MY_SKILL_TRIGGER_1` | First activation phrase |
| `MY_SKILL_TRIGGER_2` | Second activation phrase |
| `MY_TOPIC` | Name of your first section (kebab-case) |
| `MY_TOPIC_DESCRIPTION` | One sentence: what this section covers |

3. Rename `sections/my-topic/` to your first real section name (match the placeholder).

4. Add content files (30-50 lines each) inside each section directory.

5. Add your skill to `plugin.json` components.skills array.

## File count target

Start with: 1 SKILL.md + 1 section with _index.md + 2 content files = 4 files.
Ship early, add sections as you write content.
