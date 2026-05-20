# Flat Skill vs Agentic RAG — Decision Tree

## Step 1 — Count your content

Estimate the final SKILL.md size before writing it.

| Metric | Flat skill | Agentic RAG |
|--------|-----------|-------------|
| Total lines | < 300 | > 300 |
| Distinct topics | ≤ 5 | > 5 |
| Typical user request | Entire skill | One of many sub-topics |
| Knowledge changes independently | No | Yes — per section |

## Step 2 — Answer these questions

1. Will a user ever want ONLY section 3 without loading sections 1-2 and 4-6?
   → **Yes** = use RAG. **No** = keep flat.

2. Does loading the entire skill in one context window waste tokens for 80% of queries?
   → **Yes** = use RAG. **No** = keep flat.

3. Is the knowledge a single coherent explanation, or a library to look things up in?
   → **Library** = use RAG. **Explanation** = keep flat.

## Decision

```
Total lines > 300?  →  YES  →  Use agentic RAG
       ↓ NO
Distinct topics > 5?  →  YES  →  Use agentic RAG
       ↓ NO
User requests one sub-topic at a time?  →  YES  →  Use agentic RAG
       ↓ NO
Keep it flat. A small skill in RAG format is over-engineering.
```

## Anti-pattern warning

A 5-file skill split into sections with _index.md is over-engineered.
The navigation overhead exceeds the content. Flat is better here.

**Threshold**: if your entire skill fits in ~200 lines, keep it flat.
