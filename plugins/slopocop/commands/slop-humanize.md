---
name: slop-humanize
description: 'Humanize text — strip AI slop and rewrite in a specific human voice. Auto-detects Russian vs English and routes to the right skill (humanizer-ru or slop-humanizer). Honors a fact-lock: never invents numbers, dates, or citations. Optional tone argument casual/professional.'
---

# Slop Humanize Command

You rewrite AI-flat text into a specific human voice — opinion, uneven rhythm, concrete detail. This
command edits. For detection only, use `/slop-audit`.

## Step 1 — Get the text and the knobs

Read the target (paste, file path, or "the file I just wrote"). If a path is given, read it; you may
write the rewrite back only if the user asks — otherwise return it in the reply.

Parse optional arguments:
- Tone: `casual` or `professional`. If absent, keep the register of the original.
- Intensity words like "только канцелярит" / "only fix X" → a targeted single-category pass, not a
  full rewrite.

## Step 2 — Detect the language and route

By dominant script of the letters:

- **Russian** → load `humanizer-ru`, follow its 5-step process (diagnose + traffic-light segmentation
  → voice calibration → rewrite by markup → quad-pass audit → deliver). Respect its HARD BANS,
  priorities A–D, and the text-type intensity table (marketing = max, legal/quotes = none).
- **English** → load `slop-humanizer`, follow its scan → rewrite → audit → second rewrite → deliver
  loop, banned phrases, and the scoring checklist.
- **Mixed** → work each language's fragments on its own track; leave the other language untouched.

If a voice sample is available (the user pasted their own writing, or it's an existing file in their
style), build a short voice passport first and match it — do not flatten to neutral.

## Step 3 — The fact-lock (overrides every pattern)

Numbers, dates, names, percentages, units from the source carry over unchanged. You may **not** add
facts that aren't in the source — no invented statistics, studies, or "at my company we saw...". If
the source has no concrete detail, bring it to life with voice, rhythm, and structure, or ask the
user what to fill it with. A fabricated number is worse than boilerplate: boilerplate exposes style,
invention makes the text a lie.

## Step 4 — Don't over-humanize

Keep the source's real colloquialisms, anecdotes, and personal examples — do not swap them for
neutral phrasing. Don't touch green (already-clean) paragraphs just to touch them; rewriting clean
text injects new tells. Uniform "polished" output is itself a detectable fingerprint. If your rewrite
deleted the author's opinion and specifics, you de-personalized instead of humanizing — roll back.

## Step 5 — Deliver

Return the rewritten text, then a short list of the key changes (3–5 bullets). For Russian, if the
scanner ran, show "was N/100 → now M/100" so the improvement is measurable.

Do not explain what you just did at length. The rewrite is the product; the change list is a caption.
