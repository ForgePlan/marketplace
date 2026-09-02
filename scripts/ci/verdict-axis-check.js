#!/usr/bin/env node
'use strict';

/**
 * Assert that no shipped EVID-body template puts review vocabulary in the `verdict` field.
 *
 * WHY
 * ---
 * `verdict` is an EVIDENCE field. It says what a piece of evidence does to confidence in its
 * parent: supports / weakens / refutes. A reviewer's PASS / CONCERNS / BLOCKER is a different
 * axis — how ready the work is — and lives in `review_verdict`.
 *
 * The guide used to say `Verdict` accepts PASS / CONCERNS / BLOCKER, and four shipped agent
 * templates showed exactly that. Thirteen EVID bodies followed the instruction (marketplace#251).
 * The agents were not careless; the template was wrong.
 *
 * The failure is silent and worse than an empty field. Measured on the live graph 2026-09-03:
 * EVID-041 carried only `verdict: PASS` and `forgeplan_score` reported it as `[Supports] CL3 = 1.0`.
 * A reviewer who meant *weakens* and typed *CONCERNS* does not get an error and does not get a
 * zero — the artifact silently counts as evidence FOR the thing it was warning about, and
 * `forgeplan validate` raises no MUST on it.
 *
 * Prose could not hold this distinction: it was written down, and thirteen artifacts broke anyway.
 *
 * HOW IT TELLS A TEMPLATE FROM A HANDOFF
 * --------------------------------------
 * Both shapes exist in agent bodies and only one is wrong:
 *
 *   ```markdown            <- an EVID BODY template. `verdict:` here is written into an artifact.
 *   verdict: ...              Must use the evidence vocabulary.
 *   ```
 *
 *   ```                    <- an orchestrator HANDOFF block. `verdict:` here is a summary line in
 *   verdict: PASS | ...       a message, never stored. PASS / CONCERNS / BLOCKER is correct.
 *   ```
 *
 * The fence language IS the signal, verified against all six live instances at the time this gate
 * was written (4 templates, 9 handoffs). It is a convention, not a guarantee.
 *
 * WHAT THIS DOES NOT COVER — stated, not hidden:
 *
 *  - **The artifacts themselves.** `.forgeplan/evidence/*.md` lives in the PARENT workspace,
 *    outside this git repository, so CI cannot reach the bodies this gate is trying to protect.
 *    It guards the SOURCE of the defect — the templates agents copy — not the output.
 *  - **An EVID template written in a bare fence.** It would read as a handoff and pass. The fix is
 *    to write EVID templates in ```markdown, which every current one already does.
 *  - **Semantics.** A body can say `supports` about evidence that plainly weakens. Only a reader
 *    catches that.
 *
 * Read-only. No --write: a tool that both asserts a value and rewrites it becomes a drift source
 * when the two paths disagree.
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');

/** The evidence axis — the only vocabulary `verdict` may carry. */
const EVIDENCE_VOCAB = new Set(['supports', 'weakens', 'refutes', 'contradicts']);

/**
 * The review axis. Suffixed forms (`PASS-WITH-NITS`) count too — the live corpus had three of
 * them, and a template that offers one is teaching the same mistake as a template offering PASS.
 */
const REVIEW_TOKEN = /^(PASS|CONCERNS|BLOCKER|FAIL)\b/i;

/**
 * The two forms the body parser reads, and ONLY those: the lowercase plain key `verdict:` and the
 * bold `**Verdict**:`. Deliberately case-sensitive.
 *
 * A capitalised bare `Verdict: PASS` is neither — it is prose, and it is not stored. The first
 * version of this pattern carried the `i` flag and fired on exactly that: a cookbook recipe
 * illustrating a tester probe printout inside a ```markdown fence
 * (`fp-cookbook/.../tester-multi-runner-probe.md`). Narrowed rather than exempted — an allowlist
 * entry there would have been a confession that the rule matches the wrong thing.
 */
const VERDICT_LINE = /^\s*(?:\*\*Verdict\*\*|verdict)\s*:\s*(.+)$/;

function shippedAgentAndSkillDocs() {
  const out = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name === 'node_modules' || e.name === '_archive' || e.name === 'fixtures') continue;
        walk(p);
      } else if (e.isFile() && e.name.endsWith('.md')) {
        out.push(p);
      }
    }
  };
  const plugins = path.join(REPO_ROOT, 'plugins');
  if (fs.existsSync(plugins)) walk(plugins);
  return out.sort();
}

/**
 * Returns, for each line, the fence language it sits inside — or null when outside any fence.
 * The opening ``` line itself is treated as outside, so a fence marker never reports itself.
 */
function fenceLanguages(lines) {
  const out = [];
  let lang = null;
  for (const line of lines) {
    const m = /^\s*```(\S*)/.exec(line);
    if (m) {
      out.push(null);
      lang = lang === null ? (m[1] || '') : null;
      continue;
    }
    out.push(lang);
  }
  return out;
}

const problems = [];
let templatesChecked = 0;

for (const file of shippedAgentAndSkillDocs()) {
  const rel = path.relative(REPO_ROOT, file);
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  const langs = fenceLanguages(lines);

  for (let i = 0; i < lines.length; i++) {
    // Only EVID-body templates are in scope. A bare fence is an orchestrator handoff, where the
    // review vocabulary is the correct thing to print.
    if (langs[i] !== 'markdown') continue;

    const m = VERDICT_LINE.exec(lines[i]);
    if (!m) continue;

    const value = m[1].trim();
    // Placeholders like `<same as verdict above>` state no vocabulary and constrain nothing.
    if (value.startsWith('<')) continue;

    templatesChecked++;
    const first = value.split(/[\s|]+/)[0];
    if (EVIDENCE_VOCAB.has(first.toLowerCase())) continue;
    if (!REVIEW_TOKEN.test(first)) continue;

    problems.push(
      `${rel}:${i + 1}: EVID-body template sets \`verdict\` to "${value}" — that is the review ` +
      `axis. \`verdict\` takes supports/weakens/refutes; PASS/CONCERNS/BLOCKER goes in ` +
      `\`review_verdict\`.`,
    );
  }
}

if (problems.length > 0) {
  console.error(`verdict-axis-check FAILED: ${problems.length} template(s) teach the wrong axis\n`);
  for (const p of problems) console.error(`  - ${p}`);
  console.error(
    '\nTwo fields, two axes (AGENT-AUTHORING-GUIDE Step 9b.1):\n' +
    '  verdict:        supports | weakens | refutes   — what the evidence does to trust\n' +
    '  review_verdict: PASS | CONCERNS | BLOCKER      — how ready the work is\n' +
    '\nAn audit that found defects is CONCERNS on one axis and weakens on the other. Write both.\n' +
    'If this line is an orchestrator handoff rather than an EVID body, put it in a bare ``` fence\n' +
    'instead of a ```markdown one — handoffs are summaries, not stored fields.',
  );
  process.exit(1);
}

console.log(
  `Verdict axis OK: ${templatesChecked} verdict line(s) in EVID-body templates across shipped ` +
  `agents and skills, all using the evidence vocabulary.`,
);
