import { basename, join } from "node:path";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { check, finish, project, fakeHindsight, withServer, runHook, PLUGIN } from "./lib/harness.mjs";

const { BankGate, loadProjectConfig } = await import(join(PLUGIN, "dist", "testable.mjs"));
const base = { url: "http://h.example:8888", banks: ["alpha", "beta"], defaultBank: "alpha" };
const savedEnv = { ...process.env };
const resetEnv = () => { for (const k of Object.keys(process.env)) if (k.startsWith("HINDSIGHT_")) delete process.env[k]; };
resetEnv();

console.log("config discovery");
{
  const bare = project(null);
  check(loadProjectConfig(bare).state === "missing", "no .hindsight.json → missing");

  // A user-wide config must be ignored: it is what made the plugin active everywhere.
  mkdirSync(join(bare, ".hindsight"), { recursive: true });
  writeFileSync(join(bare, ".hindsight", "config.json"), JSON.stringify({ bankId: "x", url: "http://h" }));
  process.env.HOME = bare;
  check(loadProjectConfig(bare).state === "missing", "~/.hindsight/config.json is ignored");

  process.env.HINDSIGHT_URL = "http://h.example:8888";
  process.env.HINDSIGHT_API_KEY = "k";
  process.env.HINDSIGHT_BANK_ID = "alpha";
  check(loadProjectConfig(bare).state === "missing", "env vars alone never enable a project");
  resetEnv();

  const dir = project({ ...base, tokenFile: "secrets/t" }, { "secrets/t": "tok-123\n", "a/b/c/.keep": "" });
  const r = loadProjectConfig(join(dir, "a", "b", "c"));
  check(r.state === "active", "found walking up from a subdirectory", JSON.stringify(r));
  if (r.state === "active") {
    check(r.config.getApiKey() === "tok-123", "tokenFile is resolved relative to the config file");
    check(r.config.tokenSource === "tokenFile", "token source reported");
    check(r.config.autoRetain === false, "autoRetain defaults to false");
    check(r.config.autoRecall === false, "autoRecall defaults to false");
    check(r.config.defaultBank === "alpha" && r.config.banks.join() === "alpha,beta", "banks + defaultBank kept");
    check(r.config.projectRoot === dir, "project root is the config file's directory");
    check(
      !JSON.stringify(r.config).includes("tok-123") && !Object.values(r.config).includes("tok-123"),
      "credential content is absent from config enumeration and serialization",
    );
  }

  process.env.HINDSIGHT_URL = "http://override:1";
  process.env.HINDSIGHT_API_KEY = "env-tok";
  const o = loadProjectConfig(dir);
  check(o.state === "active" && o.config.url === "http://override:1" && o.config.getApiKey() === "env-tok" && o.config.tokenSource === "env", "env overrides url + token of a configured project");
  resetEnv();

  // The env token must never travel to a url the repository chose.
  process.env.HINDSIGHT_API_KEY = "env-tok";
  const k = loadProjectConfig(dir);
  check(k.state === "active" && k.config.getApiKey() === "tok-123" && k.config.tokenSource === "tokenFile", "HINDSIGHT_API_KEY without HINDSIGHT_URL is ignored (tokenFile wins)");
  const kNoFile = loadProjectConfig(project(base));
  check(kNoFile.state === "active" && kNoFile.config.getApiKey() === "" && kNoFile.config.tokenSource === "none", "HINDSIGHT_API_KEY alone is never sent to the config's url");
  resetEnv();

  const cmd = project({ ...base, tokenCommand: ["node", "-e", "require('fs').writeFileSync('ran', '1'); process.stdout.write('from-cmd')"] });
  const refused = loadProjectConfig(cmd);
  check(refused.state === "invalid" && /HINDSIGHT_ALLOW_TOKEN_COMMAND=1/.test(refused.reason), "tokenCommand is refused without the user's opt-in", refused.reason);
  process.env.HINDSIGHT_ALLOW_TOKEN_COMMAND = "1";
  const c = loadProjectConfig(cmd);
  check(c.state === "active" && !existsSync(join(cmd, "ran")), "active config does not run tokenCommand while loading");
  check(c.state === "active" && c.config.getApiKey() === "from-cmd" && c.config.tokenSource === "tokenCommand", "tokenCommand (argv, no shell) runs only when the first request asks for the token");
  resetEnv();
}

console.log("config discovery boundaries");
{
  // Stops at the git toplevel: a config above the repository is not this repository's decision.
  const outer = project({ ...base, tokenFile: "t" }, { t: "tok", "inner/.git/HEAD": "", "inner/src/.keep": "" }, { git: false });
  check(loadProjectConfig(join(outer, "inner", "src")).state === "missing", "a .hindsight.json above the git toplevel is not read");
  check(loadProjectConfig(join(outer, "inner")).state === "missing", "…also from the toplevel itself");
  check(loadProjectConfig(outer).state === "active", "the toplevel's own config is read");
  // A worktree's `.git` is a file, and it is a toplevel too.
  const wt = project({ ...base, tokenFile: "t" }, { t: "tok", "wt/.git": "gitdir: /elsewhere\n", "wt/src/.keep": "" }, { git: false });
  check(loadProjectConfig(join(wt, "wt", "src")).state === "missing", "a worktree (.git file) is a boundary too");

  // Never $HOME/.hindsight.json, and outside a repository the walk stops at $HOME.
  const home = mkdtempSync(join(tmpdir(), "hsmem-home-"));
  writeFileSync(join(home, ".hindsight.json"), JSON.stringify(base));
  mkdirSync(join(home, "notes", "deep"), { recursive: true });
  process.env.HOME = home;
  check(loadProjectConfig(join(home, "notes", "deep")).state === "missing", "$HOME/.hindsight.json never activates a directory under home");
  check(loadProjectConfig(home).state === "missing", "…nor home itself");
  mkdirSync(join(home, ".git"));
  check(loadProjectConfig(join(home, "notes")).state === "missing", "…even when home is a git toplevel (dotfiles repo)");
  mkdirSync(join(home, "proj", ".git"), { recursive: true });
  writeFileSync(join(home, "proj", ".hindsight.json"), JSON.stringify(base));
  mkdirSync(join(home, "proj", "sub"));
  check(loadProjectConfig(join(home, "proj", "sub")).state === "active", "a project under home still finds its own config");
  process.env.HOME = mkdtempSync(join(tmpdir(), "hsmem-home-"));

  // Outside both a repository and home: only cwd itself.
  const loose = project(base, { "sub/.keep": "" }, { git: false });
  check(loadProjectConfig(loose).state === "active", "no repository, outside home: cwd's own config is read");
  check(loadProjectConfig(join(loose, "sub")).state === "missing", "…but nothing above cwd");
}

console.log("tokenFile must stay inside the config's directory");
{
  const secretDir = mkdtempSync(join(tmpdir(), "hsmem-secret-"));
  writeFileSync(join(secretDir, "id_rsa"), "not-a-token-but-a-secret");
  const abs = loadProjectConfig(project({ ...base, tokenFile: join(secretDir, "id_rsa") }));
  check(abs.state === "invalid" && /inside the project/.test(abs.reason) && !abs.reason.includes("not-a-token"), "an absolute path outside is refused, content never echoed", abs.reason);
  const up = loadProjectConfig(project({ ...base, tokenFile: join("..", basename(secretDir), "id_rsa") }));
  check(up.state === "invalid" && /inside the project/.test(up.reason), "`..` out of the directory is refused", up.reason);
  const linked = project({ ...base, tokenFile: "t" });
  symlinkSync(join(secretDir, "id_rsa"), join(linked, "t"));
  const l = loadProjectConfig(linked);
  check(l.state === "invalid" && /inside the project/.test(l.reason), "a symlink pointing out is refused (realpath)", l.reason);
  const inside = project({ ...base, tokenFile: "real/t" }, { "real/t": "tok-in" });
  symlinkSync(join(inside, "real", "t"), join(inside, "alias"));
  const ok = loadProjectConfig(project({ ...base, tokenFile: join(inside, "alias") }));
  check(ok.state === "invalid", "an absolute path into ANOTHER project is outside too");
  writeFileSync(join(inside, ".hindsight.json"), JSON.stringify({ ...base, tokenFile: "alias" }));
  const viaLink = loadProjectConfig(inside);
  check(viaLink.state === "active" && viaLink.config.getApiKey() === "tok-in", "a symlink that stays inside is fine");
}

console.log("tokenFile identity is pinned before lazy acquisition");
{
  const fake = await fakeHindsight(["alpha"]);
  const outsideDir = mkdtempSync(join(tmpdir(), "hsmem-token-swap-"));
  const outsideToken = "outside_replacement_canary";
  const outsidePath = join(outsideDir, "replacement");
  writeFileSync(outsidePath, outsideToken);
  const dir = project(
    { ...base, url: fake.url, tokenFile: "token" },
    { token: "original-token" },
  );
  const loaded = loadProjectConfig(dir);
  check(loaded.state === "active", "token identity is bound without reading its content");
  renameSync(join(dir, "token"), join(dir, "original-token-file"));
  symlinkSync(outsidePath, join(dir, "token"));
  if (loaded.state === "active") {
    let directError = "";
    try {
      loaded.config.getApiKey();
    } catch (error) {
      directError = String(error);
    }
    check(
      /identity changed/.test(directError) && !directError.includes(outsideToken),
      "a path swap is refused with a value-free error",
      directError,
    );
    let networkError = "";
    try {
      await new BankGate(loaded.config).resolve("alpha");
    } catch (error) {
      networkError = String(error);
    }
    check(
      networkError.length > 0 &&
        !networkError.includes(outsideToken) &&
        fake.requests.length === 0,
      "replacement content is neither returned nor sent",
      `${networkError}\n${JSON.stringify(fake.requests)}`,
    );
  }
  fake.close();
}

if (process.platform !== "win32") {
  const fifoDir = project({ ...base, tokenFile: "token" }, { token: "original-token" });
  // Отдельный процесс с deadline: регрессия blocking open не должна подвесить test runner.
  const script = `
    import { loadProjectConfig } from ${JSON.stringify(join(PLUGIN, "dist", "testable.mjs"))};
    import { renameSync } from "node:fs";
    import { execFileSync } from "node:child_process";
    const loaded = loadProjectConfig();
    if (loaded.state !== "active") process.exit(2);
    renameSync("token", "original-token");
    execFileSync("mkfifo", ["token"]);
    try {
      loaded.config.getApiKey();
      process.exitCode = 3;
    } catch {
      process.stdout.write("FIFO_REFUSED");
    }
  `;
  const fifo = spawnSync("node", ["--input-type=module", "-e", script], {
    cwd: fifoDir,
    env: { PATH: process.env.PATH, HOME: process.env.HOME },
    encoding: "utf8",
    timeout: 5000,
  });
  check(
    fifo.status === 0 && fifo.stdout === "FIFO_REFUSED",
    "a post-load FIFO replacement is refused without waiting for a writer",
    `${fifo.status}: ${fifo.error?.code ?? ""} ${fifo.stderr}`,
  );
}

console.log("tool policy");
{
  const all = loadProjectConfig(project(base));
  check(all.state === "active" && all.config.enabledTools.length === 28, "no policy: every tool");
  const deny = loadProjectConfig(project({ ...base, denyTools: ["document_delete", "bank_config_set"] }));
  check(deny.state === "active" && deny.config.enabledTools.length === 26 && !deny.config.enabledTools.includes("document_delete"), "denyTools removes tools");
  const allow = loadProjectConfig(project({ ...base, allowTools: ["memory_recall", "memory_retain"], denyTools: ["memory_retain"] }));
  check(allow.state === "active" && allow.config.enabledTools.join() === "memory_recall", "allowTools narrows, denyTools wins over it");
  const typo = loadProjectConfig(project({ ...base, denyTools: ["document_delet"] }));
  check(typo.state === "invalid" && /contains an unknown tool name/.test(typo.reason) && !typo.reason.includes("document_delet"), "an unknown tool name invalidates the config without echoing it", typo.reason);
  const shape = loadProjectConfig(project({ ...base, allowTools: "memory_recall" }));
  check(shape.state === "invalid" && /`allowTools` must be an array/.test(shape.reason), "allowTools must be an array");
  // The pilot profile documented in CONFIGURATION.md must load as written.
  // The initial pilot profile documented in CONFIGURATION.md is minimal/read-only and excludes
  // batch retain even though the implementation remains in TOOL_NAMES.
  const pilot = [
    "memory_recall", "memory_status", "memory_get_current_bank", "memory_list", "memory_get",
    "memory_operations", "mental_model_list", "mental_model_get", "directive_list",
    "bank_config_get", "document_list",
  ];
  const rc = loadProjectConfig(project({ ...base, allowTools: pilot, autoRecall: false, autoRetain: false }));
  check(rc.state === "active" && rc.config.enabledTools.join() === pilot.join(), "the documented read-only pilot profile loads");
  check(rc.state === "active" && !rc.config.enabledTools.includes("memory_retain_batch"), "pilot policy excludes memory_retain_batch");
}

console.log("setup emits the Stage-0 pilot policy");
{
  const dir = mkdtempSync(join(tmpdir(), "hsmem-setup-"));
  const result = spawnSync(
    process.execPath,
    [join(PLUGIN, "dist", "setup.mjs"), "--url", "http://h.example:8888", "--bank", "alpha", "--no-rules"],
    { cwd: dir, encoding: "utf8" },
  );
  check(result.status === 0, "setup succeeds", `${result.stdout}\n${result.stderr}`);
  const generated = JSON.parse(readFileSync(join(dir, ".hindsight.json"), "utf8"));
  check(
    generated.autoRecall === false &&
      generated.autoRetain === false &&
      Array.isArray(generated.allowTools) &&
      generated.allowTools.length === 11 &&
      !generated.allowTools.includes("memory_retain_batch"),
    "setup policy is minimal, read-only, and excludes memory_retain_batch",
    JSON.stringify(generated),
  );
  const loaded = loadProjectConfig(dir);
  check(
    loaded.state === "active" &&
      loaded.config.enabledTools.includes("memory_recall") &&
      !loaded.config.enabledTools.includes("memory_retain_batch"),
    "generated pilot policy is accepted by the runtime",
    JSON.stringify(loaded),
  );
}

console.log("configuration states");
for (const [label, cfg] of [
  ["defaultBank outside banks", { ...base, defaultBank: "gamma" }],
  ["missing banks", { url: base.url, defaultBank: "alpha" }],
  ["legacy bankId", { ...base, bankId: "alpha" }],
  ["token in config", { ...base, apiKey: "x" }],
  ["bad url", { ...base, url: "h.example" }],
  ["autoRetain not boolean", { ...base, autoRetain: "yes" }],
  ["unresolvable tokenFile", { ...base, tokenFile: "nope" }],
]) {
  const r = loadProjectConfig(project(cfg));
  check(r.state === "invalid" && typeof r.reason === "string" && r.reason.length > 0, `${label} → invalid`, JSON.stringify(r));
}
{
  const dir = project(base, { ".hindsight-disabled": "" });
  check(loadProjectConfig(dir).state === "disabled", ".hindsight-disabled → disabled");
  check(loadProjectConfig(project(base)).state === "active", "valid project config → active");
}

const underscoreSecret = "private_key_material_underscore_canary";
const controlCanary = "forged\r\n[Hindsight] extra\u0007record";
const routingCanary = join(tmpdir(), "private-route-canary");
const toolCanary = `unknown_${controlCanary}`;
const commandCanary = join(tmpdir(), "read-private-key-canary");
const adversarialConfig = {
  ...base,
  defaultBank: underscoreSecret,
  allowTools: [toolCanary],
  routing: { [routingCanary]: controlCanary },
  tokenFile: join(tmpdir(), "private-token-path-canary"),
  tokenCommand: [commandCanary],
};
const adversarialDir = project(adversarialConfig);
const adversarialCanaries = [
  underscoreSecret,
  controlCanary,
  routingCanary,
  toolCanary,
  commandCanary,
  adversarialConfig.tokenFile,
  join(adversarialDir, ".hindsight.json"),
];
const adversarialLoaded = loadProjectConfig(adversarialDir);
check(
  adversarialLoaded.state === "invalid" &&
    adversarialLoaded.reason.startsWith(".hindsight.json:") &&
    adversarialCanaries.every((canary) => !adversarialLoaded.reason.includes(canary)) &&
    !/[\r\n\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(adversarialLoaded.reason),
  "invalid reasons contain fixed field/rule text only",
  JSON.stringify(adversarialLoaded),
);

const malformedDir = project(null);
writeFileSync(
  join(malformedDir, ".hindsight.json"),
  `{"defaultBank":${JSON.stringify(controlCanary)},"path":${JSON.stringify(routingCanary)},`,
);
const malformed = loadProjectConfig(malformedDir);
check(
  malformed.state === "invalid" &&
    malformed.reason === ".hindsight.json is not valid JSON" &&
    adversarialCanaries.every((canary) => !malformed.reason.includes(canary)) &&
    !malformed.reason.includes(malformedDir),
  "JSON parser excerpts and absolute config paths are not reported",
  JSON.stringify(malformed),
);

console.log("MCP and hook configuration states");
{
  const fake = await fakeHindsight(["alpha"]);
  const input = (cwd) => ({
    cwd,
    prompt: "what did we decide about caching?",
    session_id: "s",
    transcript_path: "/nonexistent",
  });

  const missing = project(null);
  const env = { HINDSIGHT_URL: fake.url, HINDSIGHT_API_KEY: "k", HINDSIGHT_BANK_ID: "alpha" };
  await withServer(missing, env, async ({ init, list, call, stderr }) => {
    check(Boolean(init.result?.serverInfo?.version), "missing: still answers the handshake");
    check(/inactive/.test(init.result?.instructions ?? ""), "missing: instructions are inert without a diagnostic");
    check((await list()).length === 0, "missing: lists no tools");
    check(Boolean((await call("memory_recall", { query: "anything at all" })).error), "missing: direct call is unknown");
    check(stderr() === "", "missing: MCP stderr is silent", stderr());
  });
  for (const hook of ["recall.mjs", "retain.mjs", "session-end.mjs"]) {
    const r = await runHook(hook, input(missing), env);
    check(r.code === 0 && r.stdout === "" && r.stderr === "", `missing: ${hook} is silent`, r.stderr);
  }

  const tokenCommand = ["node", "-e", "require('fs').writeFileSync('ran', '1'); process.stdout.write('tok')"];
  const disabled = project({ ...base, url: fake.url, tokenCommand }, { ".hindsight-disabled": "" });
  await withServer(disabled, { HINDSIGHT_ALLOW_TOKEN_COMMAND: "1" }, async ({ list, stderr }) => {
    check((await list()).length === 0 && stderr() === "", "disabled: zero tools and silent MCP", stderr());
  });
  for (const hook of ["recall.mjs", "retain.mjs", "session-end.mjs"]) {
    const r = await runHook(hook, input(disabled), { HINDSIGHT_ALLOW_TOKEN_COMMAND: "1" });
    check(r.code === 0 && r.stdout === "" && r.stderr === "", `disabled: ${hook} is silent`, r.stderr);
  }
  check(!existsSync(join(disabled, "ran")), "disabled: tokenCommand never runs");

  const invalid = adversarialDir;
  await withServer(invalid, {}, async ({ list, stderr }) => {
    check((await list()).length === 0, "invalid: lists no tools");
    const diagnostic = stderr();
    check(
      /invalid configuration/.test(diagnostic) &&
        adversarialCanaries.every((canary) => !diagnostic.includes(canary)) &&
        diagnostic.split(/\r?\n/).filter(Boolean).length === 1,
      "invalid: MCP emits exactly one value-free physical diagnostic",
      diagnostic,
    );
  });
  for (const hook of ["recall.mjs", "retain.mjs", "session-end.mjs"]) {
    const r = await runHook(hook, input(invalid));
    check(
      r.code === 0 &&
        r.stdout === "" &&
        /invalid configuration/.test(r.stderr) &&
        adversarialCanaries.every((canary) => !r.stderr.includes(canary)) &&
        r.stderr.split(/\r?\n/).filter(Boolean).length === 1,
      `invalid: ${hook} emits exactly one value-free physical diagnostic`,
      r.stderr,
    );
  }
  check(!existsSync(join(invalid, "ran")), "invalid: tokenCommand never runs");
  check(fake.requests.length === 0, "missing/disabled/invalid: no network", JSON.stringify(fake.requests));
  fake.close();
}

console.log("active MCP acquires token and checks compatibility lazily");
{
  const fake = await fakeHindsight(["alpha"]);
  const tokenCommand = ["node", "-e", "require('fs').writeFileSync('ran', '1'); process.stdout.write('tok')"];
  const dir = project({ ...base, url: fake.url, tokenCommand });
  await withServer(dir, { HINDSIGHT_ALLOW_TOKEN_COMMAND: "1" }, async ({ list, call }) => {
    check((await list()).length === 28, "active: lists the full tool surface");
    check(!existsSync(join(dir, "ran")) && fake.requests.length === 0, "active: handshake and tool listing are token- and network-free");
    await call("memory_get_current_bank");
    check(!existsSync(join(dir, "ran")) && fake.requests.length === 0, "active: bankless local status remains token- and network-free");
    await call("memory_recall", { query: "what did we decide" });
    check(existsSync(join(dir, "ran")), "active: first bank request acquires the token");
    check(fake.requests[0]?.path === "/version", "active: first network request is the compatibility gate", JSON.stringify(fake.requests));
  });
  fake.close();
}

console.log("token command output is never reported");
{
  const fake = await fakeHindsight(["alpha"]);
  const secret = "hsk_abcdefghijklmnopqrstuvwxyz012345";
  const tokenCommand = ["node", "-e", `process.stdout.write(${JSON.stringify(secret)}); process.exit(1)`];
  const dir = project({ ...base, url: fake.url, tokenCommand });
  await withServer(dir, { HINDSIGHT_ALLOW_TOKEN_COMMAND: "1" }, async ({ call, stderr }) => {
    const result = await call("memory_recall", { query: "what did we decide" });
    check(result.isError && !result.text.includes(secret) && !stderr().includes(secret), "failed tokenCommand output is not exposed", `${result.text}\n${stderr()}`);
  });
  check(fake.requests.length === 0, "failed tokenCommand sends no network request");
  fake.close();
}

console.log("MCP server with a tool policy");
{
  const fake = await fakeHindsight(["alpha"]);
  const dir = project({ ...base, url: fake.url, tokenFile: "t", denyTools: ["document_delete", "bank_config_set"] }, { t: "tok" });
  await withServer(dir, {}, async ({ list, call }) => {
    const names = (await list()).map((t) => t.name);
    check(names.length === 26 && !names.includes("document_delete") && !names.includes("bank_config_set"), "denied tools are not listed", names.join());
    const before = fake.requests.length;
    const r = await call("document_delete", { document_id: "x" });
    check(Boolean(r.error) && /disabled by this project's tool policy/.test(r.error.message), "a denied tool refuses the call as a protocol error", JSON.stringify(r));
    check(fake.requests.length === before, "…without reaching the server");
    const cur = JSON.parse((await call("memory_get_current_bank")).text);
    check(Array.isArray(cur.tools) && cur.tools.length === 26, "memory_get_current_bank reports the enabled tools");
  });
  const open = project({ ...base, url: fake.url, tokenFile: "t" }, { t: "tok" });
  await withServer(open, {}, async ({ call }) => {
    check(JSON.parse((await call("memory_get_current_bank")).text).tools === "all", "no policy: tools \"all\"");
  });
  fake.close();
}

console.log("hooks decide before reading a token");
{
  const fake = await fakeHindsight(["alpha"]);
  // The token command leaves a marker in the project, so a test can see whether it ran.
  const tokenCommand = ["node", "-e", "require('fs').writeFileSync('ran', '1'); process.stdout.write('tok')"];
  const env = { HINDSIGHT_ALLOW_TOKEN_COMMAND: "1" };
  const input = (cwd) => ({ cwd, prompt: "what did we decide about caching?", session_id: "s", transcript_path: "/nonexistent" });
  const off = project({ ...base, url: fake.url, tokenCommand });
  for (const hook of ["recall.mjs", "retain.mjs", "session-end.mjs"]) await runHook(hook, input(off), env);
  check(!existsSync(join(off, "ran")), "autoRecall/autoRetain off: tokenCommand never runs");
  check(fake.requests.length === 0, "autoRecall/autoRetain off: no version or other network request");
  const on = project({ ...base, url: fake.url, tokenCommand, autoRecall: true });
  await runHook("recall.mjs", input(on), env);
  check(existsSync(join(on, "ran")), "autoRecall on: it does (the marker works)");
  fake.close();
}

Object.assign(process.env, savedEnv);
finish("project-config");
