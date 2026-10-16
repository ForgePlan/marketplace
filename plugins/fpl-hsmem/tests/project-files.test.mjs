// Offline regressions for the descriptor-bound reader and its actual enrich CLI consumer.
import fs from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import { syncBuiltinESMExports } from "node:module";
import { join } from "node:path";
import { check, finish, project, fakeHindsight, PLUGIN, HOME } from "./lib/harness.mjs";
import { readProjectFile } from "../dist/testable.mjs";

const CAP = 2 * 1024 * 1024;
const outsideContent = "outside-file-dummy-canary-never-return";
const outside = fs.realpathSync(project(null, { dummy: outsideContent }));
const outsidePath = join(outside, "dummy");
const root = fs.realpathSync(project(null, { inside: "allowed project bytes", empty: "" }));
fs.symlinkSync(join(root, "inside"), join(root, "alias"));
fs.symlinkSync(outsidePath, join(root, "outside-link"));
fs.mkdirSync(join(root, "directory"));
fs.writeFileSync(join(root, "exact"), Buffer.alloc(CAP, 65));
fs.writeFileSync(join(root, "oversize"), Buffer.alloc(CAP + 1, 65));

function refused(fn, label) {
  let returned;
  let error;
  try {
    returned = fn();
  } catch (caught) {
    error = caught;
  }
  check(returned === undefined && error instanceof Error && /^refusing to read project file/.test(error.message), label, error?.message ?? "returned content");
  if (error) {
    check(!error.message.includes(root) && !error.message.includes(outside) && !error.message.includes(outsideContent), `${label}: fixed reason does not expose paths or bytes`);
  }
}

// This seam changes only filesystem timing, not stat/open/read results: all I/O remains real.
function withFilesystemSeam(replacements, fn) {
  const originals = Object.fromEntries(Object.keys(replacements).map((key) => [key, fs[key]]));
  try {
    for (const [key, replacement] of Object.entries(replacements)) fs[key] = replacement(originals[key]);
    syncBuiltinESMExports();
    return fn();
  } finally {
    Object.assign(fs, originals);
    syncBuiltinESMExports();
  }
}

console.log("regular files, canonical symlinks and strict size cap");
const inside = readProjectFile(join(root, "inside"), root);
check(inside.path === fs.realpathSync(join(root, "inside")) && Buffer.isBuffer(inside.bytes) && inside.bytes.toString() === "allowed project bytes", "regular file returns its canonical path and complete bytes");
const alias = readProjectFile(join(root, "alias"), root);
check(alias.path === inside.path && alias.bytes.equals(inside.bytes), "an in-project symlink to a regular file works");
check(readProjectFile(join(root, "empty"), root).bytes.length === 0, "an empty regular file works");
const exact = readProjectFile(join(root, "exact"), root);
check(exact.bytes.length === CAP && exact.bytes.every((byte) => byte === 65), "exactly 2 MiB is returned in full");
for (const [path, label] of [
  [outsidePath, "outside file"],
  [join(root, "outside-link"), "outside symlink"],
  [join(root, "directory"), "directory"],
  [join(root, "missing"), "missing file"],
  [join(root, "oversize"), "over-cap file"],
]) refused(() => readProjectFile(path, root), `${label} is refused without a partial return`);

console.log("real post-check replacement and mutation");
for (const afterOpen of [false, true]) {
  const path = join(root, afterOpen ? "swap-after-open" : "swap-before-open");
  fs.writeFileSync(path, "original safe bytes");
  let swapped = false;
  let contentReads = 0;
  let closes = 0;
  withFilesystemSeam({
    openSync: (open) => (candidate, ...args) => {
      if (candidate !== path || swapped) return open(candidate, ...args);
      swapped = true;
      const fd = afterOpen ? open(candidate, ...args) : undefined;
      fs.renameSync(path, `${path}.original`);
      fs.symlinkSync(outsidePath, path);
      return afterOpen ? fd : open(candidate, ...args);
    },
    readSync: (read) => (...args) => { contentReads++; return read(...args); },
    closeSync: (close) => (...args) => { closes++; return close(...args); },
  }, () => refused(() => readProjectFile(path, root), `outside replacement ${afterOpen ? "after" : "before"} open is refused`));
  check(swapped && contentReads === 0, "actual replacement happens after identity binding and before any content read");
  if (afterOpen) check(closes === 1, "the verified-open descriptor is closed on replacement refusal");
}

// A different regular inode must also fail, even with the same length and canonical path.
{
  const path = join(root, "new-inode");
  const replacement = join(root, "replacement");
  fs.writeFileSync(path, "old");
  fs.writeFileSync(replacement, "new");
  let contentReads = 0;
  withFilesystemSeam({
    openSync: (open) => (candidate, ...args) => {
      if (candidate === path) fs.renameSync(replacement, path);
      return open(candidate, ...args);
    },
    readSync: (read) => (...args) => { contentReads++; return read(...args); },
  }, () => refused(() => readProjectFile(path, root), "same-size regular-inode replacement is refused"));
  check(contentReads === 0, "descriptor inode is checked before any replacement bytes are read");
}

for (const mutation of ["grow", "shrink"]) {
  const path = join(root, mutation);
  fs.writeFileSync(path, mutation === "grow" ? Buffer.alloc(CAP, 65) : "safe original content");
  let changed = false;
  let requestedBytes = 0;
  withFilesystemSeam({
    readSync: (read) => (...args) => {
      requestedBytes += args[3];
      const count = read(...args);
      if (!changed) {
        changed = true;
        if (mutation === "grow") fs.appendFileSync(path, "extra");
        else fs.truncateSync(path, 1);
      }
      return count;
    },
  }, () => refused(() => readProjectFile(path, root), `${mutation} during a real descriptor read is refused`));
  check(changed && requestedBytes <= CAP + 2, `${mutation} is exercised with a hard bounded read`);
}

function cli(cwd, input, preload) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [...(preload ? ["--import", preload] : []), join(PLUGIN, "dist", "enrich.mjs"), input, "--json"], {
      cwd,
      env: { PATH: process.env.PATH, HOME },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; child.kill("SIGKILL"); }, 5000);
    child.stdout.on("data", (data) => { stdout += data; });
    child.stderr.on("data", (data) => { stderr += data; });
    child.on("error", (error) => { clearTimeout(timer); reject(error); });
    child.on("close", (code) => { clearTimeout(timer); resolve({ code, stdout, stderr, timedOut }); });
  });
}

console.log("actual CLI file refusals happen before HTTP");
const fake = await fakeHindsight(["alpha"]);
const candidate = JSON.stringify({
  bank: "alpha", kind: "decision", content: "Queue workers own delivery retries.",
  context: "ADR-001: keep retries out of request handlers", timestamp: "2026-05-06",
  document_id: "decision:demo:ADR-001:retries", tags: ["source:adr"],
  metadata: { repo: "demo", artifact: "ADR-001" },
}) + "\n";
const cliRoot = fs.realpathSync(project({ url: fake.url, banks: ["alpha"], defaultBank: "alpha" }, {
  "candidates.jsonl": candidate,
  "exact.jsonl": candidate + " ".repeat(CAP - Buffer.byteLength(candidate)),
  "oversize.jsonl": Buffer.alloc(CAP + 1, 65),
}));
fs.symlinkSync(join(cliRoot, "candidates.jsonl"), join(cliRoot, "inside-link.jsonl"));
fs.symlinkSync(outsidePath, join(cliRoot, "outside-link.jsonl"));
fs.mkdirSync(join(cliRoot, "directory"));
try {
  for (const input of ["candidates.jsonl", "inside-link.jsonl", "exact.jsonl"]) {
    const result = await cli(cliRoot, input);
    check(!result.timedOut && result.code === 0 && JSON.parse(result.stdout).accepted === 1, `actual CLI plans the allowed ${input}`, result.stderr);
  }
  const unsafeInputs = [outsidePath, "outside-link.jsonl", "directory", "oversize.jsonl"];
  if (process.platform !== "win32") {
    const fifo = join(cliRoot, "writerless-fifo");
    const made = spawnSync("mkfifo", [fifo], { timeout: 2000, encoding: "utf8" });
    check(made.status === 0 && !made.error, "writerless FIFO fixture is created");
    if (made.status === 0) unsafeInputs.push("writerless-fifo");
  }
  for (const input of unsafeInputs) {
    const before = fake.requests.length;
    const result = await cli(cliRoot, input);
    check(!result.timedOut && result.code === 1 && result.stdout === "" && /^refusing to read project file/.test(result.stderr), `actual CLI promptly refuses ${input === outsidePath ? "outside file" : input}`, result.stderr);
    check(fake.requests.length === before, "refused CLI file triggers no HTTP, version check or bank access");
    check(!result.stderr.includes(outsidePath) && !result.stderr.includes(outsideContent), "CLI refusal never echoes outside paths or contents");
  }

  // Preload a narrow open seam into the actual CLI: replace the checked file immediately
  // before its real open, without faking data or stat results. FIFO replacement also tests
  // O_NONBLOCK: a checked regular file becoming writerless must not block during open.
  for (const kind of process.platform === "win32" ? ["outside-link"] : ["outside-link", "fifo"]) {
    const path = join(cliRoot, `cli-swap-${kind}.jsonl`);
    fs.writeFileSync(path, candidate);
    const preload = "data:text/javascript," + encodeURIComponent(`
      import fs from 'node:fs';
      import { execFileSync } from 'node:child_process';
      import { syncBuiltinESMExports } from 'node:module';
      const target = ${JSON.stringify(path)};
      const open = fs.openSync;
      fs.openSync = (candidate, ...args) => {
        if (candidate === target) {
          fs.openSync = open;
          syncBuiltinESMExports();
          fs.renameSync(target, target + '.original');
          ${kind === "fifo" ? "execFileSync('mkfifo', [target], { timeout: 2000 });" : `fs.symlinkSync(${JSON.stringify(outsidePath)}, target);`}
        }
        return open(candidate, ...args);
      };
      syncBuiltinESMExports();
    `);
    const before = fake.requests.length;
    const result = await cli(cliRoot, `cli-swap-${kind}.jsonl`, preload);
    check(fs.existsSync(`${path}.original`) && (kind === "fifo" ? fs.lstatSync(path).isFIFO() : fs.lstatSync(path).isSymbolicLink()), `actual CLI ${kind} replacement runs after the original file check`);
    check(!result.timedOut && result.code === 1 && result.stdout === "" && /^refusing to read project file/.test(result.stderr), `actual CLI promptly refuses a post-check ${kind} replacement before returning content`, result.stderr);
    check(fake.requests.length === before && !result.stderr.includes(outsideContent) && !result.stderr.includes(outsidePath), "replacement causes no HTTP or outside content/path disclosure");
  }
} finally {
  fake.close();
  fs.rmSync(cliRoot, { recursive: true, force: true });
  fs.rmSync(root, { recursive: true, force: true });
  fs.rmSync(outside, { recursive: true, force: true });
}

finish("project file reader");
