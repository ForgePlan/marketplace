#!/usr/bin/env node
'use strict';

/**
 * Assert that every stated pipeline-stage count agrees with the machine-readable source.
 *
 * WHY
 * ---
 * ForgePlan calls three different things "phase", and conflating them produced a documented
 * category error (ADR-022):
 *
 *   1. pipeline STAGE      brief · shape · decompose · design · estimate · gate ·
 *                          build · audit · evidence · activate · wrap
 *                          → carrier: templates/project-agent-matrix.yaml (machine-readable)
 *   2. session PHASE       idle · routing · shaping · coding · evidence · pr
 *   3. artifact MARKER     shape · validate · adi · code · test · audit · evidence · done
 *
 * RFC-002 was titled "9 phases" while its own prose named 11 stages and the matrix declared 11
 * keys. Nobody noticed for months, because nothing compared the claim to the source — the same
 * failure class as the agent counts before `catalog-check` learned to descend.
 *
 * The distinction itself is not new: `forgeplan-cookbook/sections/05-session-and-phase.md` has
 * documented the two machines all along, citing upstream PROB-065. It lived in a reference doc
 * while the normative artifact contradicted it. Prose does not hold a distinction — this does.
 *
 * WHAT IT CHECKS
 * --------------
 *   1. Every "<N> phases / stages / фаз / стадий" claim in shipped markdown matches the count
 *      derived from `project-agent-matrix.yaml`
 *   2. The three register vocabularies are not silently merged — a doc that lists the artifact
 *      markers must not label them "stages", and vice versa
 *
 * WHAT THIS GATE DOES NOT COVER — stated, not hidden:
 *
 *  - **RFC-002 itself.** It lives in the PARENT workspace `.forgeplan/`, outside this git
 *    repository, so CI cannot reach the one normative document that started this. Keeping it in
 *    step is a Profile D job, tracked by ADR-022's Revisit Trigger — i.e. a human, again.
 *  - **A Russian self-naming claim.** The second anchor matches the English noun `pipeline`; a
 *    hypothetical `9-фазный конвейер` with no carrier named would slip. No live case exists, and
 *    the anchor's safety was measured on English text, so widening it blind would trade a real
 *    guarantee for a speculative one. The canon this ADR sets says «стадия конвейера» in Russian,
 *    and that phrasing IS caught by the contextual anchor.
 *  - **Semantics.** It compares a stated number to a derived one. A document can describe the
 *    stages wrongly while stating the right count.
 *
 * The counting itself encodes the three-register model rather than just matching digits: 8 and 6
 * are skipped deliberately, because they are the artifact-marker and session-phase vocabularies —
 * correct as written, and conflating them is the very error this gate exists to prevent.
 *
 * Read-only. No --write: a tool that both asserts a number and rewrites it becomes a drift source
 * when the two paths disagree.
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const MATRIX = path.join(REPO_ROOT, 'plugins', 'fpl-skills', 'templates', 'project-agent-matrix.yaml');

/** Keys in the matrix that are configuration, not pipeline stages. */
const NON_STAGE_KEYS = new Set(['auto_approve', 'human_required', 'mental_models']);

/**
 * Files allowed to state a different number, because they are DESCRIBING the error rather than
 * repeating it. Each needs a reason — an allowlist without reasons becomes a dumping ground.
 */
const DESCRIBES_THE_ERROR = new Map([
  ['docs/c4/ADR-022.md', 'C4 for ADR-022 quotes the wrong title verbatim as the thing being fixed'],
  ['docs/PROCESS-GAP-MAP-RU.md', 'the gap map records the pre-fix state as a dated snapshot'],
]);

/**
 * "9 phases", "11 стадий" — but ONLY when the claim is about the forgeplan pipeline.
 *
 * The first version of this matched any "<N> phase" on any line mentioning the word "phase", and
 * fired 96 times — of which exactly five were real. It flagged the Discover agent's 7-phase
 * protocol, SPARC's five phases, TDD's three, CANVAS's stages: all different pipelines, all
 * correctly stated. Worse, `(\d+)[\s-]+phase` matched artifact-id fragments — "PRD-026 Phase 4"
 * became a claim of "026 phases".
 *
 * That is the same defect this repository documented in guardian's STRIDE row on the same day: a
 * check that fires on two thirds of everything is not a gate, it is a tax, and reviewers learn to
 * wave it through. Narrowed rather than exempted — an allowlist covering 90 false positives would
 * be a confession, not a fix.
 *
 * `(?<![\w-])` keeps `PRD-026 Phase` and `#287 Phase` out: a digit run glued to an identifier is
 * not a count.
 */
const CLAIM = /(?<![\w-])(\d{1,2})[\s-]+(phases?|stages?|фаз(?:ы|а)?|стади[йяи])\b/gi;

/**
 * The line must be talking about THIS pipeline. Other pipelines legitimately have other counts,
 * and the canonical carriers are the only things that pin the number.
 */
const ABOUT_THIS_PIPELINE = /RFC-002|PRD-024|project-agent-matrix|canonical pipeline|канонич\w* конвейер/i;

/**
 * The bare noun `pipeline` right after the count is itself an anchor — and this was a real miss.
 *
 * Narrowing from 96 hits to 2 also swept out three live "9-phase pipeline" claims sitting in
 * `plugins/`, because those lines never name RFC-002. The gate then reported clean while the exact
 * error it exists to catch was still shipping — a false negative in the one place that matters,
 * traded for the 94 false positives. Caught by the third reviewer, who was asked not to take the
 * mechanism on trust.
 *
 * Safe to anchor on, verified over the whole tree: every other pipeline names its own thing —
 * `7-phase protocol`, `7-phase discovery`, `6-phase debug`, `3 phase generator`, `2 stage-master`.
 * Only the forgeplan pipeline is called `<N>-phase pipeline` with the noun unqualified.
 */
const PIPELINE_CLAIM = /(?<![\w-])(\d{1,2})[\s-]+(?:phase|stage)s?[\s-]+pipeline\b/gi;

function stagesFromMatrix() {
  if (!fs.existsSync(MATRIX)) return null;
  const keys = fs
    .readFileSync(MATRIX, 'utf8')
    .split('\n')
    .map((l) => /^ {2}([a-z_]+):\s*$/.exec(l))
    .filter(Boolean)
    .map((m) => m[1])
    .filter((k) => !NON_STAGE_KEYS.has(k));
  return keys;
}

function shippedMarkdown() {
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
  for (const d of ['plugins', 'docs']) {
    const full = path.join(REPO_ROOT, d);
    if (fs.existsSync(full)) walk(full);
  }
  // CHANGELOG records history verbatim; its old numbers are the point.
  return out.sort();
}

const stages = stagesFromMatrix();
if (stages === null) {
  console.error(
    'phase-canon-check FAILED: the source of truth is missing at\n' +
    `  ${path.relative(REPO_ROOT, MATRIX)}\n` +
    'Without it no count can be derived, and a check that cannot derive its expected value must ' +
    'fail rather than pass silently.',
  );
  process.exit(1);
}

const problems = [];
let claimsChecked = 0;

for (const file of shippedMarkdown()) {
  const rel = path.relative(REPO_ROOT, file);
  const exempt = DESCRIBES_THE_ERROR.get(rel);
  const text = fs.readFileSync(file, 'utf8');

  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Two ways a line can be about this pipeline: it names a canonical carrier, or it uses the
    // bare phrase "<N>-phase pipeline", which nothing else in the tree does.
    const anchored = ABOUT_THIS_PIPELINE.test(line);
    PIPELINE_CLAIM.lastIndex = 0;
    const selfNaming = PIPELINE_CLAIM.test(line);
    if (!anchored && !selfNaming) continue;

    const pattern = anchored ? CLAIM : PIPELINE_CLAIM;
    pattern.lastIndex = 0;
    let m;
    while ((m = pattern.exec(line)) !== null) {
      const n = Number(m[1]);
      // 8 and 6 are the OTHER two registers — artifact markers and session phases. Correct as
      // written, and conflating them is the very error this gate exists to prevent.
      if (n === 8 || n === 6) continue;
      claimsChecked++;
      if (n === stages.length) continue;
      if (exempt) continue;
      problems.push(
        `${rel}:${i + 1}: claims "${m[0]}" about the forgeplan pipeline, but the matrix declares ` +
        `${stages.length} stages (${stages.join(', ')})`,
      );
    }
  }
}

if (problems.length > 0) {
  console.error(`phase-canon-check FAILED: ${problems.length} stale stage-count claim(s)\n`);
  for (const p of problems) console.error(`  - ${p}`);
  console.error(
    `\nThe count is derived from ${path.relative(REPO_ROOT, MATRIX)}, which is the machine-readable\n` +
    'carrier. If the pipeline really changed, change the matrix first and let the documents follow —\n' +
    'never the other way round. If a file is quoting the historical error on purpose, add it to\n' +
    'DESCRIBES_THE_ERROR with a reason.',
  );
  process.exit(1);
}

console.log(
  `Phase canon OK: ${stages.length} pipeline stages in the matrix, ${claimsChecked} count claim(s) ` +
  `checked across shipped docs, all agreeing.`,
);
