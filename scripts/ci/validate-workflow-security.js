#!/usr/bin/env node
/**
 * validate-workflow-security.js — GitHub Actions workflow security linter.
 *
 * Zero external dependencies (Node >= 18 builtins only). The workflow files are
 * scanned as text with a small line-aware scanner — we deliberately do NOT pull
 * in a YAML parser. The rules below only need structural anchors (which `run:`
 * block an expression sits in, which step a `uses:` belongs to), and those are
 * recoverable from indentation without a full parse.
 *
 * Rules implemented:
 *   WF-INJECT     HIGH  Untrusted ${{ github.event.* / github.head_ref / ... }}
 *                       interpolated directly into a `run:` shell block — the
 *                       classic GitHub Actions script-injection RCE.
 *   WF-PRT-CHECKOUT HIGH `pull_request_target` (or `workflow_run`) trigger that
 *                       checks out the PR head ref — attacker code runs with a
 *                       write-scoped token.
 *   WF-PRT-FETCH  HIGH  Same trigger, but the PR code is pulled in a `run:` block
 *                       instead — git fetch/pull/clone, gh pr checkout, an HTTP
 *                       archive download. No checkout step to key on.
 *   WF-PRT-ARTIFACT HIGH Same trigger downloading a build artifact — under
 *                       `workflow_run` that artifact is attacker-produced.
 *   WF-UNPINNED   WARN  Third-party `uses:` pinned to a tag/branch (@v3, @main,
 *                       @master) instead of a full 40-hex commit SHA.
 *   WF-PERMS-WRITEALL HIGH `permissions: write-all` grants every scope write.
 *   WF-PERMS-MISSING  WARN No top-level `permissions:` block (defaults are broad).
 *
 * SELF-TEST: every run first scans `fixtures/workflow-security/`, where each file is built to trip
 * exactly one rule, and fails if any of them stops firing. This exists because the linter shipped
 * with WF-PRT-CHECKOUT silently dead for months — a clean report and a broken rule looked identical
 * from the outside. See `fixtures/workflow-security/README.md`; add a trap with every new rule.
 *
 * Exit code: 1 if any HIGH finding (or WARN promoted via --strict); else 0.
 * Output:    `file:line  rule-id  SEVERITY  message` per finding.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const HIGH = 'HIGH';
const WARN = 'WARN';

// Untrusted GitHub Actions expression contexts. These resolve to
// attacker-controllable strings (PR title/body, branch name, commit message,
// fork repo name, ...). Interpolating any of them straight into a shell `run:`
// block lets the attacker break out of the string and execute commands.
//
// `github.event.*` is the broad catch-all (covers issue/PR/comment/review
// bodies and titles). The explicit head_ref / *_ref / commit-message contexts
// are listed separately because they are the most commonly weaponised and we
// want them matched even outside an `event.` prefix.
const UNTRUSTED_EXPR = new RegExp(
  '\\$\\{\\{\\s*(?:' +
    // github.event.<anything> — issue/PR/comment payloads
    'github\\.event\\.[A-Za-z0-9_.\\[\\]\'"-]+' +
    '|github\\.head_ref' +
    '|github\\.base_ref' +
    // any *.head_ref / *.body / *.title / *.email / *.name / *.label tail —
    // these are the attacker-controlled leaves of the event payload even when
    // referenced via a steps.<id>.outputs.* indirection of a prior raw read.
    '|[A-Za-z0-9_.]*\\.(?:head_ref|body|title|message|email|authors?)' +
  ')\\s*\\}\\}',
);

// A pinned-by-SHA `uses:` ends in @<40 hex>. Anything else (tag, branch,
// short SHA, version range) is "unpinned" for supply-chain purposes.
const USES_LINE = /^\s*-?\s*uses:\s*['"]?([^'"#\s]+)['"]?/;
const FULL_SHA = /^[0-9a-f]{40}$/i;

// Local/first-party action references that are not subject to the SHA-pin rule:
//   ./path                  — action defined in this repo
//   docker://image          — container action (pinned by digest separately)
//   <single-segment>        — a reusable workflow / composite in-repo ref
const LOCAL_USES = /^(?:\.\/|\.\\|docker:\/\/)/;

const WRITE_ALL = /^\s*permissions:\s*['"]?write-all['"]?\s*$/m;
const PERMISSIONS_KEY = /^\s*permissions:\s*(\S.*)?$/m;

// Dangerous trigger events: a workflow that runs on these gets a write-scoped
// token (or runs in the base-repo context) even for fork PRs, so checking out
// the PR head is the classic privilege-escalation footgun.
// This is the MASTER SWITCH: every privileged-trigger rule below is gated on it, so a form it
// fails to recognise turns those rules off entirely and the file reports clean.
//
// It used to be /^\s*(pull_request_target|workflow_run)\s*:/m — the nested block form only. YAML
// has at least four other spellings for the same trigger, and all four silently disabled the rules:
//     on: [pull_request_target]           on: pull_request_target
//     on: [issues, pull_request_target]   on:\n  - pull_request_target
// Adversarial probe over 7 spellings: 2 caught, 5 missed, zero HIGH on the missed ones — with the
// identical dangerous body underneath. Matching the bare word anywhere in the file is coarse (a
// workflow that merely *mentions* the trigger in a comment now counts as privileged) and that is
// the right trade: a false positive costs a comment, a false negative costs the repository.
// Triggers that run in the BASE repo context with a write-scoped token while carrying
// attacker-influenced payload. `issue_comment` is on this list because a ChatOps bot that reacts to
// a comment by checking out the PR is arguably the most common Actions RCE in the wild, and the
// first version of this file did not consider it privileged at all.
const PRIVILEGED_TRIGGERS = [
  'pull_request_target',
  'workflow_run',
  'issue_comment',
  'pull_request_review',
  'pull_request_review_comment',
  'discussion_comment',
];

/**
 * Does this workflow declare a privileged trigger?
 *
 * This is the MASTER SWITCH — every privileged rule is gated on it, so both directions hurt:
 *
 *  - Too narrow and the rules turn OFF silently. The original `/^\s*(trigger)\s*:/m` recognised
 *    only the nested block form; `on: [pull_request_target]`, `on: pull_request_target` and
 *    `on:\n  - pull_request_target` all disabled every rule with the identical dangerous body
 *    underneath.
 *  - Too broad and ordinary CI goes red. Replacing it with a bare word-match over the whole file
 *    (the fix I reached for first) made an `on: push` workflow fail because a COMMENT said
 *    "we deliberately do NOT use pull_request_target here". A gate that reddens honest work gets
 *    switched off, and then it protects nothing.
 *
 * So: read the `on:` mapping specifically, with comments stripped, and accept every YAML spelling
 * of it — block, scalar, flow sequence, flow mapping, block sequence, quoted key.
 */
function privilegedTriggers(source) {
  const lines = splitLines(source).map(stripComment);
  let region = '';

  for (let i = 0; i < lines.length; i++) {
    const m = /^(['"]?)on\1\s*:(.*)$/.exec(lines[i]);
    if (!m) continue;
    region = m[2];                              // inline part: `[a, b]`, `push`, `{a: …}` or empty
    for (let j = i + 1; j < lines.length; j++) {
      if (lines[j].trim() === '') continue;
      if (indentOf(lines[j]) === 0) break;      // next top-level key ends the `on:` block
      region += '\n' + lines[j];
    }
    break;
  }

  return PRIVILEGED_TRIGGERS.filter((t) => new RegExp(`\\b${t}\\b`).test(region));
}

/** Back-compat shim: the rules below only ask "is this file privileged at all?". */
const PRIVILEGED_EVENT = { test: (source) => privilegedTriggers(source).length > 0 };

/**
 * A composite action is `action.yml` / `action.yaml`, and it has no `on:` key — it has no triggers
 * of its own, it inherits whatever called it. `privilegedTriggers` reads the `on:` mapping, so for
 * these files it returns nothing and EVERY privileged rule switches off by construction. The
 * directory was added to the scan list and then scanned with all the interesting rules disabled.
 *
 * We cannot see the caller from here, so we assume the worst: a composite action reachable from a
 * privileged workflow runs with that workflow's token, and the whole point of the rules is what
 * happens under that token. A false positive costs a comment in an action that is only ever called
 * from `on: push`; a false negative costs the repository.
 */
const COMPOSITE_ACTION_FILE = /(^|[/\\])action\.ya?ml$/i;
const isPrivilegedFile = (source, filePath) =>
  PRIVILEGED_EVENT.test(source) || (!!filePath && COMPOSITE_ACTION_FILE.test(filePath));

// `github.head_ref` is the single most-cited pull_request_target footgun and was not matched here:
// the old pattern demanded a `github.event.(pull_request|workflow_run).` prefix. It is already in
// UNTRUSTED_EXPR, so it fired inside a `run:` block but not on the `ref:` where it actually hands
// the attacker the token.
const PR_HEAD_REF = new RegExp(
  '\\$\\{\\{\\s*(?:' +
    'github\\.event\\.(?:pull_request|workflow_run)\\.[^}]*\\bhead[._]' +
    '|github\\.head_ref' +
  ')',
);
const REFS_PULL = /\brefs\/(?:remotes\/)?pull\/[^\s'"]+/;

/**
 * Every YAML under `dir`, descending.
 *
 * The first version read one level and stopped. `.github/actions` was added to the scan list on the
 * reasoning that a composite action can do anything a workflow step can — but GitHub requires them
 * at `.github/actions/<name>/action.yml`, one level deeper than the listing reached. The directory
 * was scanned and nothing in it was ever read: a scan list entry that looked like coverage.
 *
 * Depth is bounded because this walks a checkout, and an unbounded recursion over an unexpected
 * symlink or a vendored tree turns a fast gate into a hang. Four levels covers
 * `.github/actions/<name>/<sub>/action.yml` with room to spare.
 */
function listWorkflowFiles(dir, depth = 4) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (depth > 0 && e.name !== 'node_modules') out.push(...listWorkflowFiles(p, depth - 1));
    } else if (e.isFile() && /\.ya?ml$/i.test(e.name)) {
      out.push(p);
    }
  }
  return out.sort();
}

function splitLines(source) {
  return source.split(/\r?\n/);
}

/**
 * Strip a trailing `# comment` from a YAML line without tripping on a `#` that
 * sits inside a quoted string. Good enough for the structural checks here.
 */
function stripComment(line) {
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === "'" && !inDouble) inSingle = !inSingle;
    else if (c === '"' && !inSingle) inDouble = !inDouble;
    else if (c === '#' && !inSingle && !inDouble) return line.slice(0, i);
  }
  return line;
}

/**
 * Strip comments from a MULTI-LINE block, line by line.
 *
 * `stripComment` returns at the first unquoted `#`, which is correct for one line and catastrophic
 * for many: applied to a joined step body it throws away everything after the first comment. That
 * is how WF-PRT-CHECKOUT was silently dead — one `# fetch the contributor branch` inside a step
 * hid the `uses: actions/checkout@` below it, the rule's precondition failed, and it never fired.
 * Commenting inside steps is this repo's own house style, so the bypass was the default.
 *
 * Same failure class as trimming a whole `git status --porcelain` blob instead of each line: one
 * line's logic applied to many lines' data.
 */
function stripComments(text) {
  return splitLines(text).map(stripComment).join('\n');
}

const indentOf = (line) => line.length - line.replace(/^\s*/, '').length;

/**
 * Collect the line ranges that belong to `run:` blocks. Handles both the inline
 * form (`run: echo hi`) and the block-scalar form (`run: |` / `run: >` followed
 * by an indented body). Returns [{startLine, endLine}] (1-based, inclusive).
 *
 * We need this so WF-INJECT only fires on expressions that actually land in a
 * shell, not on `with:`/`env:` values (where `${{ ... }}` is safe).
 */
function findRunBlocks(lines) {
  const blocks = [];
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const code = stripComment(raw);
    // `- run: cmd` is a step whose only key is run:, and it is the most compact form there is.
    // Matching bare `run:` alone missed it entirely, so WF-INJECT was blind to
    //     - run: echo "${{ github.event.issue.title }}"
    // while catching the identical command written under a `- name:` step (marketplace#249).
    // keyIndent counts the dash too, so a block scalar's body still has to sit deeper than `run:`.
    const m = code.match(/^(\s*(?:-\s+)?)run:\s*(\S.*)?$/);
    if (!m) continue;

    const keyIndent = m[1].length;
    const inlineValue = (m[2] || '').trim();

    // Inline `run: cmd` — single line, unless it opens a block scalar.
    if (inlineValue && inlineValue !== '|' && inlineValue !== '>' &&
        !/^[|>][+-]?\d*\s*$/.test(inlineValue)) {
      blocks.push({ startLine: i + 1, endLine: i + 1 });
      continue;
    }

    // Block scalar: body is every following line indented deeper than the key,
    // up to the first line at-or-below the key indent (ignoring blanks).
    let end = i;
    for (let j = i + 1; j < lines.length; j++) {
      const bodyRaw = lines[j];
      if (bodyRaw.trim() === '') {
        end = j;
        continue;
      }
      if (indentOf(bodyRaw) > keyIndent) {
        end = j;
      } else {
        break;
      }
    }
    blocks.push({ startLine: i + 1, endLine: end + 1 });
  }
  return blocks;
}

/** True if 1-based lineNo falls inside any run block. */
function inRunBlock(blocks, lineNo) {
  return blocks.some((b) => lineNo >= b.startLine && lineNo <= b.endLine);
}

/**
 * Group physical lines into step blocks so a `uses:` + checkout `ref:` can be
 * correlated. A step starts at a `- ` list item; its body runs until the next
 * list item at the same-or-shallower indent.
 */
function findSteps(lines) {
  const steps = [];
  let current = null;
  for (let i = 0; i < lines.length; i++) {
    const code = stripComment(lines[i]);
    const start = code.match(/^(\s*)-\s+/);
    if (start) {
      if (current) steps.push(current);
      current = { indent: start[1].length, startLine: i + 1, lines: [lines[i]] };
    } else if (current) {
      // A line shallower than the step's `- ` indent closes the step.
      if (lines[i].trim() !== '' && indentOf(lines[i]) <= current.indent) {
        steps.push(current);
        current = null;
      } else {
        current.lines.push(lines[i]);
      }
    }
  }
  if (current) steps.push(current);
  return steps;
}

function findInjection(lines, runBlocks) {
  const findings = [];
  for (let i = 0; i < lines.length; i++) {
    const lineNo = i + 1;
    if (!inRunBlock(runBlocks, lineNo)) continue;
    const code = stripComment(lines[i]);
    const m = code.match(UNTRUSTED_EXPR);
    // GitHub generates these leaves itself — they are integers, timestamps and opaque ids, not free
    // text, so they cannot carry a shell break-out. Flagging `pull_request.number` sent an ordinary
    // `echo "building PR #${{ ... }}"` red, which is the kind of noise that gets a gate ignored.
    if (m && /\.(?:number|id|node_id|run_id|run_number|created_at|updated_at)\s*\}\}/.test(m[0])) continue;
    if (m) {
      findings.push({
        line: lineNo,
        rule: 'WF-INJECT',
        severity: HIGH,
        message:
          `untrusted expression ${m[0]} interpolated into a run: shell block ` +
          '(script-injection RCE — read it via an env: var and reference "$VAR" instead)',
      });
    }
  }
  return findings;
}

function findUnpinned(lines) {
  const findings = [];
  for (let i = 0; i < lines.length; i++) {
    const code = stripComment(lines[i]);
    const m = code.match(USES_LINE);
    if (!m) continue;
    const ref = m[1];
    if (LOCAL_USES.test(ref) || !ref.includes('@')) continue; // local / reusable
    const pin = ref.slice(ref.lastIndexOf('@') + 1);
    if (FULL_SHA.test(pin)) continue;
    findings.push({
      line: i + 1,
      rule: 'WF-UNPINNED',
      severity: WARN,
      message:
        `action "${ref}" is pinned to "${pin}", not a full 40-hex commit SHA ` +
        '(a moved tag/branch can ship malicious code)',
    });
  }
  return findings;
}

function findPermissionIssues(source, lines, filePath) {
  const findings = [];

  // `permissions:` is a WORKFLOW key. A composite action has no such key and cannot have one — it
  // runs under the caller's token. WF-PERMS-MISSING on an action.yml is asking for something the
  // format does not allow, and a gate that demands the impossible gets switched off. (Introduced
  // and caught in the same pass as the composite-action privilege fix; write-all is still checked,
  // since a literal `write-all` in an action file is worth seeing wherever it turns up.)
  const isCompositeAction = !!filePath && COMPOSITE_ACTION_FILE.test(filePath);

  // write-all anywhere (top-level or job-level) is a HIGH over-grant.
  const wa = source.match(WRITE_ALL);
  if (wa) {
    findings.push({
      line: lineNumberAt(source, wa.index),
      rule: 'WF-PERMS-WRITEALL',
      severity: HIGH,
      message:
        'permissions: write-all grants every scope write access ' +
        '(declare the minimal explicit scopes the workflow needs)',
    });
  }

  // Missing top-level permissions → broad default token. Only flag if there is
  // no `permissions:` key before the first top-level `jobs:` line.
  const jobsIdx = source.search(/^jobs:\s*$/m);
  const header = jobsIdx >= 0 ? source.slice(0, jobsIdx) : source;
  if (!isCompositeAction && !PERMISSIONS_KEY.test(header)) {
    findings.push({
      line: 1,
      rule: 'WF-PERMS-MISSING',
      severity: WARN,
      message:
        'no top-level permissions: block — the workflow token defaults to a ' +
        'broad scope; add an explicit minimal permissions: block',
    });
  }
  return findings;
}

function findDangerousCheckout(source, lines, filePath) {
  const findings = [];
  if (!isPrivilegedFile(source, filePath)) return findings;

  for (const step of findSteps(lines)) {
    const text = step.lines.join('\n');
    const code = stripComments(text);
    if (!/uses:\s*['"]?actions\/checkout@/m.test(code)) continue;

    // Form 1: checkout an explicit untrusted head ref expression.
    const headExpr = text.match(PR_HEAD_REF);
    // Form 2: checkout a refs/pull/<n>/{head,merge} ref (GitHub treats this
    // as equivalent — it fetches attacker code under the privileged token).
    const refPull = code.match(/^\s*ref:\s*.*?(refs\/(?:remotes\/)?pull\/[^\s'"]+)/m);

    if (headExpr || refPull) {
      const evidence = headExpr ? headExpr[0] : refPull[1];
      findings.push({
        line: step.startLine,
        rule: 'WF-PRT-CHECKOUT',
        severity: HIGH,
        message:
          'pull_request_target/workflow_run trigger checks out the PR head ' +
          `(${evidence.trim()}) — attacker code runs with a write-scoped token`,
      });
    }
  }
  return findings;
}

/**
 * `actions/checkout` is not the only way to fetch a PR's code, and under a privileged trigger the
 * others are just as fatal. A `run:` block can pull the branch with one line and carries no `uses:`
 * for the checkout rule to key on:
 *
 *     - env: { PR: '${{ github.event.number }}' }
 *       run: gh pr checkout "$PR" && npm ci && npm test
 *
 * That passes WF-PRT-CHECKOUT (no checkout step) and WF-INJECT (the expression sits in `env:`,
 * which that rule treats as safe by design) — a textbook pull_request_target RCE, clean on both.
 *
 * So this rule keys on the ACT of fetching PR code, not on which action performs it. It fires on
 * the fetch verb alone, without needing to prove where the PR number came from: under a privileged
 * trigger there is no benign reason to check out the contributor's branch.
 */
function findPrivilegedPrFetch(source, lines, runBlocks, filePath) {
  const findings = [];
  if (!isPrivilegedFile(source, filePath)) return findings;

  // The first version of this rule matched five tight regexes ONE PHYSICAL LINE AT A TIME. An
  // adversarial probe put 10 shapes straight through it, and every one is ordinary shell:
  //
  //   git -c protocol.version=2 fetch origin "pull/$PR/head"   flag between `git` and `fetch`
  //   git --no-pager fetch ...                                 same
  //   git pull origin "pull/$PR/head"                          `pull` is not `fetch`
  //   git fetch origin \  ⏎  "pull/$PR/head"                   backslash continuation
  //   REF="pull/$PR/head"; git fetch origin "$REF"             ref laundered through a variable
  //   gh pr \  ⏎  checkout "$PR"                               command split across lines
  //   gh pr diff "$PR" --patch | git apply                     fetches the code without checkout
  //   git remote add fork "$URL" && git fetch fork "$BR"       no `pull/` token anywhere
  //   curl codeload.github.com/$REPO/tar.gz/$SHA | tar xz      not git at all
  //
  // So this now reads the WHOLE block: comments stripped per line, continuations folded, newlines
  // collapsed. And it stops trying to recognise "a fetch of the PR specifically" — under a
  // privileged trigger there is no benign reason to pull remote code at all, so the rule fires on
  // the act of fetching. Broad on purpose: a false positive costs a comment on a PR, a false
  // negative costs the repository.
  const FETCHERS = [
    { re: /\bgh\s+pr\s+(?:checkout|diff|view)\b/, what: 'gh pr checkout/diff' },
    { re: /\bhub\s+pr\s+checkout\b/, what: 'hub pr checkout' },
    { re: /\bgit\b[^;&|]{0,120}?\b(?:fetch|pull|clone)\b/, what: 'git fetch/pull/clone' },
    { re: /\bgit\s+remote\s+add\b/, what: 'git remote add (a second remote to fetch from)' },
    { re: /\bgit\s+(?:checkout|switch)\b[^;&|]{0,120}?\brefs\/pull\//, what: 'checkout of a refs/pull/ ref' },
    { re: /\bpull\/[^\s'"]*\/(?:head|merge)\b/, what: 'a pull/<n>/head ref' },
    { re: /\bcodeload\.github\.com\b/, what: 'codeload.github.com tarball' },
    // Downloading the tree over HTTP is the same act with a different tool. Keyed on the archive
    // path shapes GitHub serves rather than on the fetcher, so curl/wget/aria2 all land here.
    { re: /\b(?:curl|wget|aria2c)\b[^;&|]{0,200}?\/(?:archive|tarball|zipball)\//, what: 'HTTP download of a repo archive' },
    { re: /\b(?:curl|wget)\b[^;&|]{0,200}?\|\s*(?:tar|unzip|bash|sh|python)\b/, what: 'download piped straight into an extractor or shell' },
  ];

  for (const block of runBlocks) {
    const text = lines
      .slice(block.startLine - 1, block.endLine)
      .map(stripComment)
      .join('\n')
      .replace(/\\\n/g, ' ')   // fold backslash continuations
      .replace(/\n/g, ' ');    // and folded/multi-line commands

    for (const f of FETCHERS) {
      if (!f.re.test(text)) continue;
      findings.push({
        line: block.startLine,
        rule: 'WF-PRT-FETCH',
        severity: HIGH,
        message:
          'pull_request_target/workflow_run trigger fetches remote code in a run block ' +
          `(${f.what}) — under this trigger that code runs with a write-scoped token and the ` +
          'secrets in scope',
      });
      break;
    }
  }
  return findings;
}

/**
 * `workflow_run` + downloading the PR's build artifact + running it is the canonical
 * artifact-poisoning RCE for that trigger, and it has neither a checkout step nor a fetch verb —
 * so both rules above fall straight through it while the file is correctly identified as
 * privileged. Downloading and executing a PR-built artifact is fetching PR code by another name.
 */
function findPrivilegedArtifactDownload(source, lines, filePath) {
  const findings = [];
  if (!isPrivilegedFile(source, filePath)) return findings;

  // Downloading an artifact is not itself the attack — reading a PR's lint report and posting it as
  // a comment is GitHub's own recommended pattern, and the first version of this rule reddened it.
  // The attack is download-then-RUN. So HIGH requires an execution sink somewhere in the file;
  // a bare download stays WARN, which says "look at this" without failing the build.
  const executes = /\b(?:chmod\s+\+x|unzip|tar\s+x|\.\/|bash\s|sh\s|node\s|python\s|npm\s+(?:ci|i|install|run)|make\b)/
    .test(lines.map(stripComment).join('\n'));

  const DOWNLOADERS = [
    { re: /uses:\s*['"]?[\w.-]+\/[\w.-]*download-artifact[\w.-]*@/, what: 'a download-artifact action' },
    { re: /\bgh\s+run\s+download\b/, what: 'gh run download' },
  ];

  for (let i = 0; i < lines.length; i++) {
    const code = stripComment(lines[i]);
    const hit = DOWNLOADERS.find((d) => d.re.test(code));
    if (!hit) continue;
    findings.push({
      line: i + 1,
      rule: 'WF-PRT-ARTIFACT',
      severity: executes ? HIGH : WARN,
      message:
        `privileged trigger downloads a build artifact (${hit.what})` +
        (executes
          ? ' AND the job unpacks or executes — an artifact produced by the PR is attacker-controlled, ' +
            'so this is the artifact-poisoning path'
          : ' — no execution sink found in this file, so this is a heads-up rather than a failure; ' +
            'reading an artifact to post a comment is a legitimate pattern'),
    });
  }
  return findings;
}

function lineNumberAt(source, index) {
  return source.slice(0, index).split(/\r?\n/).length;
}

function scanFile(filePath) {
  const source = fs.readFileSync(filePath, 'utf8');
  const lines = splitLines(source);
  const runBlocks = findRunBlocks(lines);

  const findings = [
    ...findInjection(lines, runBlocks),
    ...findDangerousCheckout(source, lines, filePath),
    ...findPrivilegedPrFetch(source, lines, runBlocks, filePath),
    ...findPrivilegedArtifactDownload(source, lines, filePath),
    ...findUnpinned(lines),
    ...findPermissionIssues(source, lines, filePath),
  ];

  return findings
    .map((f) => ({ ...f, filePath }))
    .sort((a, b) => a.line - b.line || a.rule.localeCompare(b.rule));
}

function run(workflowsDir, opts = {}) {
  const strict = !!opts.strict;
  const files = listWorkflowFiles(workflowsDir);
  const all = [];
  for (const file of files) all.push(...scanFile(file));

  let highCount = 0;
  let warnCount = 0;
  for (const f of all) {
    const rel = path.basename(f.filePath);
    const sink = f.severity === HIGH ? console.error : console.log;
    sink(`${rel}:${f.line}  ${f.rule}  ${f.severity}  ${f.message}`);
    if (f.severity === HIGH) highCount++;
    else warnCount++;
  }

  if (all.length === 0) {
    console.log(`Workflow security: ${files.length} file(s) scanned, no findings.`);
  } else {
    console.log(
      `Workflow security: ${files.length} file(s) scanned, ` +
        `${highCount} HIGH, ${warnCount} WARN.`,
    );
  }

  // HIGH always fails; WARN fails only under --strict.
  return highCount > 0 || (strict && warnCount > 0) ? 1 : 0;
}

function resolveWorkflowsDir() {
  if (process.env.WORKFLOWS_DIR) return process.env.WORKFLOWS_DIR;
  // Repo layout: <repo>/scripts/ci/this-file → <repo>/.github/workflows
  return path.resolve(__dirname, '..', '..', '.github', 'workflows');
}

/**
 * Directories that ship workflow YAML and therefore need scanning.
 *
 * `docs/templates/` was invisible to this linter for its whole life, which is backwards: those
 * files are written to be copied into OTHER repositories, so a mistake there propagates to people
 * who never read our review comments. The one artifact with the widest blast radius had zero
 * mechanical checking.
 */
function resolveScanDirs() {
  if (process.env.WORKFLOWS_DIR) return [process.env.WORKFLOWS_DIR];
  const root = path.resolve(__dirname, '..', '..');
  return [
    path.join(root, '.github', 'workflows'),
    // Composite actions run inside workflows and can do everything a workflow step can, including
    // fetching the PR. They were never scanned.
    path.join(root, '.github', 'actions'),
    path.join(root, 'docs', 'templates'),
  ].filter((d) => fs.existsSync(d));
}

/**
 * WHAT THIS LINTER CANNOT SEE — stated, because a security check that hides its blind spots is
 * worse than one that has none, and an adversarial pass will find them anyway.
 *
 *  - **Obfuscation.** `echo <base64> | base64 -d | sh` reconstructs any command at runtime. No
 *    regex reaches it. Treat a privileged workflow that decodes-and-executes as unreviewable.
 *  - **Indirection through a called workflow or action.** `uses: ./…` under `pull_request_target`
 *    resolves against the BASE branch, so it is your own code — but this linter only reads the two
 *    directories above, so a fetch hidden in an action elsewhere in the tree is invisible.
 *  - **`secrets: inherit` to a reusable workflow.** Base-branch code, so not attacker-controlled,
 *    but it widens which job sees the secrets. Judgement, not a rule.
 *  - **Semantics.** It matches text. A workflow can be dangerous without any string here, and safe
 *    with several.
 *  - **A gate edited to exempt its own fixtures.** Mutation testing killed 6 of 7 sabotage attempts;
 *    the survivor was `scanFile` returning `[]` for any path that is not a fixture. No self-test can
 *    catch that, because the self-test runs through the same mutated function. Whoever can make that
 *    edit can also delete this file — it is a code-review question, not a linter one.
 *  - **Coverage — 12 attacks walk past this gate, and they are checked in.**
 *    `fixtures/workflow-security/known-miss/` holds one privileged workflow per attack that this
 *    linter reads without complaint, and the self-test asserts each stays silent. The number moves
 *    on its own: a known-miss that starts firing fails the suite and gets promoted; a must-fire that
 *    stops firing fails the traps. Nobody has to remember to re-measure.
 *
 *    Three classes, all rooted in the same thing — **the mechanism of attack is data flow, and a
 *    regex over text cannot see flow**:
 *      · indirection in `ref` (4) — the untrusted expression is read into `env` / a step output /
 *        a `needs` output / JavaScript, then used one hop away
 *      · fetch inside `run:` (6) — a package manager, a docker git-context, an API diff, the binary
 *        behind a variable, download and extraction split by `;`
 *      · injection outside `run:` (4) — `github-script`'s `script:`, a docker action's `args:`,
 *        bracket notation, `fromJSON(toJSON(…))`
 *
 *    This replaces an earlier claim of "a corpus of 41 gets past roughly half". That corpus was
 *    never checked in and cannot be reproduced from what was written down; 14 concrete forms were
 *    enumerated and are what this directory contains. Do not restore a number that has no fixtures
 *    behind it.
 *
 *    Closing the first class properly means marking expressions that read untrusted context and
 *    propagating the mark through `env` → `outputs` → `needs` — a small analyser plus a YAML
 *    parser, which `scripts/ci/` has no dependency on today. Adding pattern rules one at a time was
 *    tried; it produces a longer regex and the same blind spot, because the next hop is free to the
 *    attacker and expensive to us.
 *
 * This is a tripwire, not a proof. It exists to stop the shapes people actually write by accident,
 * and to be honest about the ones it does not.
 */

/**
 * Prove the rules are alive before trusting them to say "no findings".
 *
 * A linter that reports clean is indistinguishable from a linter whose rules are broken — and this
 * one shipped with WF-PRT-CHECKOUT silently dead, defeated by a single `#` inside a step, for as
 * long as anyone had been relying on it. Silence was read as safety.
 *
 * So every run first scans `fixtures/workflow-security/`, where each file is built to trip exactly
 * one rule. If a fixture stops producing its finding, the rule is dead and the gate fails saying so
 * — instead of passing the real files and reporting a reassuring zero.
 */
const SELF_TEST_EXPECT = {
  'must-fire-prt-checkout.yml': ['WF-PRT-CHECKOUT', HIGH],
  'must-fire-prt-checkout-commented.yml': ['WF-PRT-CHECKOUT', HIGH],
  'must-fire-prt-trigger-flowseq.yml': ['WF-PRT-CHECKOUT', HIGH],
  'must-fire-prt-head-ref.yml': ['WF-PRT-CHECKOUT', HIGH],
  'must-fire-prt-run-fetch.yml': ['WF-PRT-FETCH', HIGH],
  'must-fire-prt-fetch-flagged.yml': ['WF-PRT-FETCH', HIGH],
  'must-fire-prt-artifact.yml': ['WF-PRT-ARTIFACT', HIGH],
  'must-fire-prt-http-archive.yml': ['WF-PRT-FETCH', HIGH],
  'must-fire-prt-chatops.yml': ['WF-PRT-FETCH', HIGH],
  'must-fire-inject.yml': ['WF-INJECT', HIGH],
  'must-fire-permissions-writeall.yml': ['WF-PERMS-WRITEALL', HIGH],
  'must-fire-templates-scanned.yml': ['WF-PERMS-WRITEALL', HIGH],
  'must-fire-unpinned.yml': ['WF-UNPINNED', WARN],
  // Caught INCIDENTALLY, by WF-INJECT rather than by the checkout-indirection rule. Both spell the
  // hop through a `run:` block, and interpolating untrusted context into a shell block is its own
  // finding. The same hop through actions/github-script slips — known-miss/ref-via-github-script.
  'must-fire-ref-via-step-output.yml': ['WF-INJECT', HIGH],
  'must-fire-ref-via-needs-output.yml': ['WF-INJECT', HIGH],
  // Composite action. Proves BOTH structural fixes at once: the recursive listing reaches
  // `<dir>/action.yml`, and an action.yml is treated as privileged despite having no `on:` key.
  'nested/action-dir/action.yml': ['WF-PRT-CHECKOUT', HIGH],
};

/** Ordinary CI that MUST stay clean. A gate that reddens honest work gets switched off. */
const SELF_TEST_BENIGN = [
  'must-not-fire-plain-ci.yml',
  'must-not-fire-mentions-trigger-in-comment.yml',
  'must-not-fire-pr-number.yml',
  // An ordinary composite action must stay silent. It carries no `permissions:` — correct for the
  // format, not an omission — so WF-PERMS-MISSING must not fire on it. That false positive was
  // introduced by the privilege fix and caught by this control in the same pass.
];

/**
 * Fixtures that must produce NO finding at all — not even a WARN.
 *
 * SELF_TEST_BENIGN only rejects HIGH, which is right for ordinary CI (a WARN about an unpinned
 * action there is a true positive). It is wrong here: making composite actions privileged also made
 * them fail WF-PERMS-MISSING, a WARN — asking an `action.yml` for a `permissions:` key the format
 * does not have. Mutation testing found that the HIGH-only control could not see it.
 */
const SELF_TEST_SILENT = [
  'nested/benign-action-dir/action.yml',
];

/**
 * The measured gap: privileged workflows carrying a real attack that this gate reads without
 * complaint. They live in `fixtures/workflow-security/known-miss/` and the self-test asserts they
 * produce NOTHING.
 *
 * Asserting a miss reads backwards until you see what it buys. The count stops being a sentence
 * somebody wrote once and becomes a number the suite maintains:
 *
 *   - a known-miss file that STARTS firing fails the self-test, which tells you to promote it to
 *     `must-fire` — coverage improved and the corpus records it
 *   - a `must-fire` fixture that STOPS firing fails the existing traps — coverage regressed
 *
 * Both directions are caught, and nobody has to remember to re-measure. Before this, the gap was
 * "roughly half of a corpus of 41" — a corpus that was never checked in and cannot be reproduced.
 * See known-miss/README.md for the three classes and why patterns lose to them.
 */
const SELF_TEST_KNOWN_MISS_DIR = 'known-miss';

/**
 * Prove the gate can still FAIL before trusting it to say "clean".
 *
 * The first version of this checked only that each trap produced a finding with the right rule
 * NAME. An adversarial pass then showed it constrained almost nothing: 13 of 13 mutations kept all
 * traps green, and six of them left the gate structurally unable to fail CI at all — because
 * severity, file discovery and the exit code were never asserted. Only the two regressions it was
 * literally written against died. That is a self-test as theatre: it manufactured confidence
 * instead of evidence.
 *
 * So it now asserts the whole pipeline, end to end:
 *   1. every trap fires its rule AT ITS SEVERITY — severity is what decides pass/fail, so a
 *      HIGH→WARN downgrade must not pass
 *   2. ordinary CI fixtures stay clean — false positives are how a gate gets disabled
 *   3. `run()` over the fixtures directory EXITS 1 — this exercises listWorkflowFiles and the exit
 *      logic, which a per-file scan never touches
 *   4. `resolveScanDirs()` still contains the real workflow directory — dropping it was a silent
 *      blinding that no rule-level check could see
 *
 * It still cannot prove the rules catch attacks it has no trap for. That is a coverage question,
 * tracked separately; this only guarantees the machinery is alive.
 */
function selfTest() {
  const dir = path.join(__dirname, 'fixtures', 'workflow-security');
  const repoRoot = path.resolve(__dirname, '..', '..');
  if (!fs.existsSync(dir)) {
    console.error(
      'validate-workflow-security FAILED: self-test fixtures are missing at ' +
      `${path.relative(repoRoot, dir)}.\n` +
      'Without them a clean report cannot be distinguished from dead rules — which is exactly how ' +
      'WF-PRT-CHECKOUT stayed broken. Restore the fixtures rather than deleting this check.',
    );
    return 1;
  }

  const dead = [];

  // 1 — traps fire, at their severity
  for (const [file, [rule, severity]] of Object.entries(SELF_TEST_EXPECT)) {
    const p = path.join(dir, file);
    if (!fs.existsSync(p)) { dead.push(`${file}: fixture missing (rule ${rule} is now unproven)`); continue; }
    const hits = scanFile(p).filter((f) => f.rule === rule);
    if (hits.length === 0) { dead.push(`${file}: expected ${rule}, got nothing — the rule is DEAD`); continue; }
    if (!hits.some((f) => f.severity === severity)) {
      dead.push(`${file}: ${rule} fired at ${hits[0].severity}, expected ${severity} — severity is what fails CI`);
    }
  }

  // 2 — ordinary CI stays clean
  for (const file of SELF_TEST_BENIGN) {
    const p = path.join(dir, file);
    if (!fs.existsSync(p)) { dead.push(`${file}: benign fixture missing — false positives are now unproven`); continue; }
    const high = scanFile(p).filter((f) => f.severity === HIGH);
    if (high.length > 0) {
      dead.push(`${file}: benign workflow produced ${high[0].rule} HIGH — a gate that reddens honest CI gets turned off`);
    }
  }

  // 2a — fixtures that must be completely silent, WARN included
  for (const file of SELF_TEST_SILENT) {
    const fp = path.join(dir, file);
    if (!fs.existsSync(fp)) { dead.push(`${file}: silent-control fixture missing`); continue; }
    const hits = scanFile(fp);
    if (hits.length > 0) {
      dead.push(
        `${file}: expected complete silence, got ${hits[0].rule}/${hits[0].severity} — this control ` +
        'exists because a WARN-level false positive is invisible to the HIGH-only benign check',
      );
    }
  }

  // 2a2 — DISCOVERY, separately from detection.
  // The nested fixtures above are read by explicit path, so they prove the rules and say nothing
  // about whether the walker would ever reach them. Breaking recursion left every trap green —
  // found by mutation. Assert the walker actually returns the nested file.
  const walked = listWorkflowFiles(dir);
  const nested = walked.filter((f) => path.relative(dir, f).includes(path.sep));
  if (nested.length === 0) {
    dead.push(
      'listWorkflowFiles returned no nested file — directory recursion is broken. Composite ' +
      'actions live at <dir>/action.yml, one level down; a non-recursive walk scans the parent ' +
      'directory and reads nothing in it.',
    );
  }

  // 2b — the measured gap holds its shape in both directions
  const missDir = path.join(dir, SELF_TEST_KNOWN_MISS_DIR);
  if (!fs.existsSync(missDir)) {
    dead.push(
      `${SELF_TEST_KNOWN_MISS_DIR}/: corpus missing — the coverage gap goes back to being a ` +
      'sentence nobody re-measures',
    );
  } else {
    const missFiles = fs.readdirSync(missDir).filter((f) => /\.ya?ml$/i.test(f)).sort();
    if (missFiles.length === 0) {
      dead.push(`${SELF_TEST_KNOWN_MISS_DIR}/: no fixtures — an empty corpus proves nothing`);
    }
    for (const file of missFiles) {
      const hits = scanFile(path.join(missDir, file));
      if (hits.length > 0) {
        dead.push(
          `${SELF_TEST_KNOWN_MISS_DIR}/${file}: now fires ${hits[0].rule} — coverage IMPROVED. ` +
          'Move the fixture to must-fire-*.yml, add it to SELF_TEST_EXPECT, and update the count ' +
          'in this file’s header. This failure is good news; it is not a reason to delete the trap.',
        );
      }
    }
  }

  // 3 — the whole pipeline can actually fail
  const savedLog = console.log;
  const savedErr = console.error;
  console.log = () => {};
  console.error = () => {};
  let code;
  try {
    code = run(dir, {});
  } finally {
    console.log = savedLog;
    console.error = savedErr;
  }
  if (code !== 1) {
    dead.push(
      `run() over the fixtures returned ${code}, expected 1 — file discovery or the exit path is ` +
      'broken, so the gate cannot fail CI no matter what the rules find',
    );
  }

  // 4 — the real workflow directory is still in scope
  const dirs = resolveScanDirs();
  const wf = path.join(repoRoot, '.github', 'workflows');
  if (fs.existsSync(wf) && !dirs.includes(wf)) {
    dead.push('resolveScanDirs() no longer includes .github/workflows — the gate is scanning nothing that ships');
  }

  if (dead.length > 0) {
    console.error(`validate-workflow-security FAILED its own self-test — ${dead.length} problem(s):\n`);
    for (const d of dead) console.error(`  - ${d}`);
    console.error('\nA gate that cannot fail on its own trap files will not fail on a real attack.');
    return 1;
  }
  return 0;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const strict = args.includes('--strict');
  const dirArg = args.find((a) => !a.startsWith('--'));

  if (!dirArg && selfTest() !== 0) process.exit(1);

  const dirs = dirArg ? [dirArg] : resolveScanDirs();
  let code = 0;
  let scanned = 0;
  for (const d of dirs) {
    scanned += listWorkflowFiles(d).length;
    code = run(d, { strict }) || code;
  }

  // Mutation testing found a family the self-test cannot see: blind file DISCOVERY on the real path
  // while leaving it working for the fixtures, and every trap still passes while the gate reads
  // nothing that ships. Asserting that real files were actually read closes it — a report of
  // "no findings" over zero files is not a clean bill of health, it is an empty room.
  if (!dirArg && scanned === 0) {
    console.error(
      'validate-workflow-security FAILED: scanned 0 files. Either the workflow directories moved, ' +
      'or file discovery is broken. A clean report over nothing is not a pass.',
    );
    process.exit(1);
  }
  process.exit(code);
}

module.exports = {
  scanFile,
  run,
  selfTest,
  findRunBlocks,
  findSteps,
  stripComments,
  resolveWorkflowsDir,
  resolveScanDirs,
};
