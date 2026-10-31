import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readlinkSync, realpathSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { loadProjectConfig } from "../dist/testable.mjs";

const PLUGIN = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const EVENTS = ["UserPromptSubmit", "Stop", "SessionEnd"];
const NODE = realpathSync(process.execPath);
const SESSION = "BANK-SELECTOR-PROBE";
const say = (text) => console.log(text);
const unavailable = (text) => { say(`НЕПРИМЕНИМА: ${text}`); return 2; };
const object = (value) => value && typeof value === "object" && !Array.isArray(value);
const present = (path) => { try { return statSync(path).isFile(); } catch { return false; } };
const expand = (word) => word.replaceAll("${CLAUDE_PLUGIN_ROOT}", process.env.CLAUDE_PLUGIN_ROOT ?? "");

// Лексер нужен только для обнаружения файлов, не для исполнения shell. Подстановки команд
// намеренно не поддерживаются: их нельзя безопасно разрешить до входа в песочницу.
function shellWords(command) {
  if (/[`\n\r]|\$\(/.test(command)) throw new Error("неподдерживаемая shell-подстановка");
  const words = [];
  let word = "", quote = "", escaped = false;
  for (const char of command) {
    if (escaped) { word += char; escaped = false; }
    else if (char === "\\" && quote !== "'") escaped = true;
    else if (quote) { if (char === quote) quote = ""; else word += char; }
    else if (char === '"' || char === "'") quote = char;
    else if (/[\s;|&<>]/.test(char)) { if (word) words.push(word); word = ""; }
    else word += char;
  }
  if (quote || escaped) throw new Error("незакрытые кавычки");
  if (word) words.push(word);
  return words;
}

function hookCommand(hook, root) {
  if (!object(hook) || (hook.type !== undefined && hook.type !== "command") ||
      typeof hook.command !== "string" || !hook.command.trim()) throw new Error("неизвестный тип хука");
  const structured = Object.hasOwn(hook, "args");
  if (structured && (!Array.isArray(hook.args) || !hook.args.every((v) => typeof v === "string"))) {
    throw new Error("args должен быть массивом строк");
  }
  const words = structured ? [hook.command, ...hook.args].map(expand) : shellWords(hook.command).map(expand);
  if (words.some((w) => w.includes("\0") || w.includes("${CLAUDE_PLUGIN_ROOT}")) ||
      ((hook.command + JSON.stringify(hook.args)).includes("${CLAUDE_PLUGIN_ROOT}") && !process.env.CLAUDE_PLUGIN_ROOT)) {
    throw new Error("CLAUDE_PLUGIN_ROOT не задан");
  }
  const files = words.filter((word) => /(?:^|\/)(?:recall|retain|session-end)\.mjs$/.test(word) ||
    (/hindsight|hsmem/i.test(word) && /\.(?:mjs|cjs|js|sh)$/.test(word)))
    .map((word) => resolve(root, word));
  if (!files.length || files.some((path) => !present(path))) {
    throw new Error("неопознанный хук: не исполняется и не считается проверенным Hindsight-хуком");
  }
  const unsafeOverride = words.some((w) => /^(?:HINDSIGHT_(?:URL|API_KEY|ALLOW_TOKEN_COMMAND)|NODE_OPTIONS|HOME|CLAUDE_PLUGIN_DATA|TMPDIR)=/.test(w));
  return {
    argv: structured ? [expand(hook.command), ...hook.args.map(expand)] : ["/bin/bash", "--noprofile", "--norc", "-c", hook.command],
    files: files.map((path) => realpathSync(path)),
    unsafeOverride,
    timeout: Number.isFinite(hook.timeout) && hook.timeout > 0 ? Math.min(hook.timeout * 1000, 20000) : 20000,
  };
}

// Ни переменные окружения, ни закрытый порт не являются защитой. На macOS сеть и IPC
// запрещены deny-default профилем, на Linux — отдельными network/pid/user namespaces bwrap.
function sandbox(scratch, files, configPath, root) {
  const system = process.platform === "darwin"
    ? ["/System", "/usr", "/bin", "/sbin", "/Library/Apple", "/opt/homebrew", dirname(NODE)]
    : ["/usr", "/bin", "/sbin", "/lib", "/lib64"];
  const readable = [...new Set([...system.filter(existsSync), join(PLUGIN, "dist"), ...files, ...(configPath ? [configPath] : [])])];
  if (process.platform === "darwin" && existsSync("/usr/bin/sandbox-exec")) {
    const paths = readable.map((path) => `(${statSync(path).isDirectory() ? "subpath" : "literal"} ${JSON.stringify(realpathSync(path))})`).join("\n");
    const profile = `(version 1)
(deny default)
(allow process-exec process-fork sysctl-read)
(allow process-info* (target self))
(allow signal (target self))
(allow file-read-metadata)
(allow file-read* file-map-executable ${paths}
  (literal "/")
  (subpath ${JSON.stringify(scratch)})
  (literal "/dev/null") (literal "/dev/random") (literal "/dev/urandom") (literal "/dev/zero")
  (subpath "/dev/fd") (subpath "/private/var/db/dyld"))
(allow file-write* (subpath ${JSON.stringify(scratch)}) (literal "/dev/null"))
(deny network*)
(deny mach-lookup mach-register)
`;
    return { name: "macOS sandbox-exec (deny network/IPC, restricted files)", wrap: (argv) => ["/usr/bin/sandbox-exec", "-p", profile, ...argv] };
  }
  const bwrap = ["/usr/bin/bwrap", "/bin/bwrap"].find(existsSync);
  if (process.platform === "linux" && bwrap) {
    const args = ["--unshare-all", "--die-with-parent", "--new-session", "--cap-drop", "ALL", "--proc", "/proc", "--dev", "/dev"];
    const mounts = [...new Set([...readable, NODE, "/etc/ld.so.cache"].filter(existsSync))]
      .filter((path) => path !== scratch && !path.startsWith(scratch + sep));
    for (const path of mounts) args.push("--ro-bind", path, path);
    // Только синтетические HOME/state/transcript доступны для записи; сокеты host не монтируются.
    args.push("--bind", scratch, scratch, "--dir", root);
    if (configPath) args.push("--dir", join(dirname(configPath), ".git"));
    // Корневой tmpfs иначе остаётся writable; отдельный bind scratch сохраняет запись.
    args.push("--remount-ro", "/", "--chdir", root, "--");
    return { name: "Linux bubblewrap (unshare-all, read-only mounts)", wrap: (argv) => [bwrap, ...args, ...argv] };
  }
  throw new Error("нет OS-песочницы: требуются macOS sandbox-exec или Linux bubblewrap с разрешёнными namespaces; fallback запрещён");
}

function run(argv, { root, env, input = "", timeout = 20000 }) {
  return new Promise((done) => {
    const child = spawn(argv[0], argv.slice(1), { cwd: root, env, detached: true, stdio: ["pipe", "pipe", "pipe"] });
    let output = "", bad = false;
    const kill = () => { try { process.kill(-child.pid, "SIGKILL"); } catch { /* группа уже завершилась */ } };
    const timer = setTimeout(() => { bad = true; kill(); }, timeout);
    const capture = (data) => {
      if (output.length + data.length > 256 * 1024) { bad = true; kill(); }
      else output += data.toString();
    };
    child.stdout.on("data", capture);
    child.stderr.on("data", capture);
    child.stdin.on("error", () => { bad = true; });
    child.on("error", () => { bad = true; });
    child.on("close", (code) => { clearTimeout(timer); kill(); done({ code: bad ? null : code, output }); });
    child.stdin.end(input);
  });
}

function environment(scratch) {
  const home = join(scratch, "home");
  mkdirSync(home, { recursive: true });
  return {
    PATH: `${dirname(NODE)}:/usr/bin:/bin:/usr/sbin:/sbin`, HOME: home, TMPDIR: scratch,
    HINDSIGHT_DEBUG: "1", HINDSIGHT_API_KEY: "", HINDSIGHT_URL: "http://127.0.0.1:9",
    HINDSIGHT_BANK_ID: "NC_ENV_IGNORED", CLAUDE_PLUGIN_DATA: join(scratch, "plugin-data"),
    ...(process.platform === "linux" ? { PROBE_HOST_NET_NS: readlinkSync("/proc/self/ns/net") } : {}),
    ...(process.env.CLAUDE_PLUGIN_ROOT ? { CLAUDE_PLUGIN_ROOT: process.env.CLAUDE_PLUGIN_ROOT } : {}),
  };
}

const isolationCheck = `
const fs = require('node:fs'), cp = require('node:child_process');
fs.writeFileSync(process.env.TMPDIR + '/sandbox-write', 'synthetic');
const namespaced = process.platform === 'linux' && fs.readlinkSync('/proc/self/ns/net') !== process.env.PROBE_HOST_NET_NS;
const code = "const s=require('node:net').connect(9,'127.0.0.1');s.on('connect',()=>process.exit(1));s.on('error',e=>process.exit(['EPERM','EACCES','ENETUNREACH','EHOSTUNREACH'" + (namespaced ? ",'ECONNREFUSED'" : "") + "].includes(e.code)?0:1));setTimeout(()=>process.exit(1),1000).unref()";
const child = cp.spawnSync(process.execPath, ['-e', code], {env:process.env});
if (child.status !== 0) process.exit(1);
console.log('OS_SANDBOX_READY');
`;

async function prepare(scratch, files, configPath, root) {
  const env = environment(scratch);
  const box = sandbox(scratch, files, configPath, root);
  const ready = await run(box.wrap([NODE, "-e", isolationCheck]), { root, env, timeout: 5000 })
    .catch(() => ({ code: null, output: "" }));
  if (ready.code !== 0 || ready.output.trim() !== "OS_SANDBOX_READY") {
    throw new Error(`${box.name}: preflight не подтвердил изоляцию/запуск Node и дочернего процесса`);
  }
  say(`  песочница: ${box.name}`);
  return { box, env };
}

function banks(output) {
  return [...output.matchAll(/^\[Hindsight\] (?:Recall from|Retain to) bank '([^'\r\n]+)'/gm)].map((m) => m[1]);
}

async function measure(command, ctx, root, scratch, retainEveryNTurns = 1) {
  const state = join(ctx.env.CLAUDE_PLUGIN_DATA, "state");
  mkdirSync(state, { recursive: true });
  // Прогреваем только синтетический счётчик, не меняем opt-in или настройки проекта.
  writeFileSync(join(state, "turns.json"), JSON.stringify({ [SESSION]: retainEveryNTurns - 1 }));
  const transcript = join(scratch, "transcript.jsonl");
  writeFileSync(transcript, [
    { type: "user", message: { role: "user", content: "synthetic bank selector probe" } },
    { type: "assistant", message: { role: "assistant", content: [{ type: "text", text: "synthetic answer" }] } },
  ].map((line) => JSON.stringify(line)).join("\n") + "\n");
  const result = await run(ctx.box.wrap(command.argv), {
    root, env: ctx.env, timeout: command.timeout,
    input: JSON.stringify({ cwd: root, session_id: SESSION, transcript_path: transcript, prompt: "synthetic bank selector probe", reason: "exit" }),
  });
  // Не выводим argv, stdout/stderr или токены: неизвестный хук может напечатать секрет.
  return { code: result.code, banks: banks(result.output) };
}

function projectConfig(root) {
  // Внешний URL/ключ не участвует в ожидаемом значении; token loader никогда не вызывается.
  const saved = { ...process.env };
  for (const key of Object.keys(process.env)) {
    if (key.startsWith("HINDSIGHT_") && !["HINDSIGHT_DISABLED", "HINDSIGHT_ALLOW_TOKEN_COMMAND"].includes(key)) delete process.env[key];
  }
  try { return loadProjectConfig(root); }
  finally { process.env = saved; }
}

async function check(settings, rootArg, event = "all") {
  if (!settings || !rootArg || !present(settings)) return unavailable("нужны существующие settings.json и корень проекта");
  const root = realpathSync(rootArg);
  if (!statSync(root).isDirectory()) return unavailable("корень проекта не является каталогом");
  const loaded = projectConfig(root);
  if (loaded.state !== "active") return unavailable(`конфигурация проекта: ${loaded.state} (3.7: url, banks, defaultBank)`);
  const events = event === "all" ? EVENTS : [event];
  if (events.some((ev) => !EVENTS.includes(ev))) return unavailable("неподдерживаемое событие");
  let config;
  try { config = JSON.parse(readFileSync(settings, "utf8")); }
  catch { return unavailable("settings.json не является JSON"); }
  if (!object(config?.hooks)) return unavailable("нет конфигурации hooks");
  const pending = [];
  let incomplete = false, mismatch = false;
  for (const ev of events) {
    const groups = config.hooks[ev];
    if (!Array.isArray(groups) || !groups.length) { say(`  ${ev}: нет хуков`); incomplete = true; continue; }
    for (const [g, group] of groups.entries()) {
      if (!object(group) || !Array.isArray(group.hooks) || !group.hooks.length) { incomplete = true; continue; }
      for (const [h, hook] of group.hooks.entries()) {
        const label = `${ev}[${g}][${h}]`;
        try {
          if (group.matcher && group.matcher !== "*") throw new Error("условный matcher не поддерживается пробой");
          const command = hookCommand(hook, root);
          const enabled = ev === "UserPromptSubmit" ? loaded.config.autoRecall : loaded.config.autoRetain;
          if (!enabled) throw new Error(`${ev === "UserPromptSubmit" ? "autoRecall" : "autoRetain"} выключен (default-off)`);
          pending.push({ label, command });
        } catch (error) { say(`  ${label}: ${error.message}`); incomplete = true; }
      }
    }
  }
  if (!pending.length) return unavailable("нет исполнимых opt-in Hindsight-хуков; неизвестные/чужие хуки не запускались");
  const scratch = realpathSync(mkdtempSync(join(tmpdir(), "hsmem-selector-")));
  try {
    const ctx = await prepare(scratch, pending.flatMap((p) => p.command.files), loaded.config.configPath, root);
    for (const { label, command } of pending) {
      const result = await measure(command, ctx, root, scratch, loaded.config.retainEveryNTurns);
      if (command.unsafeOverride) {
        say(`  ${label}: переопределение URL/секрета/изоляционного окружения — результат не сертифицирован`);
        incomplete = true;
      } else if (result.code !== 0 || !result.banks.length) {
        say(`  ${label}: нет достоверного ответа селектора (exit ${result.code ?? "timeout/error"})`);
        incomplete = true;
      } else {
        const matches = result.banks.every((bank) => bank === loaded.config.defaultBank);
        say(`  ${label}: ${matches ? "совпадает с defaultBank" : "выбран другой банк"}`);
        mismatch ||= !matches;
      }
    }
  } finally { rmSync(scratch, { recursive: true, force: true }); }
  if (mismatch) { say("П1 FAIL"); return 1; }
  if (incomplete) return unavailable("покрытие неполное; П1 не пройдена");
  say(`П1 PASS (${pending.length} хуков; только выбор банка, не серверная интеграция)`);
  return 0;
}

async function negative(hookArg) {
  if (!hookArg || !present(hookArg)) return unavailable("нужен существующий recall.mjs");
  const hook = realpathSync(hookArg);
  const scratch = realpathSync(mkdtempSync(join(tmpdir(), "hsmem-selector-control-")));
  const root = join(scratch, "nc-fixture");
  mkdirSync(join(root, ".git"), { recursive: true });
  const configPath = join(root, ".hindsight.json");
  const base = { url: "http://127.0.0.1:9", banks: ["NC_A", "NC_B"], defaultBank: "NC_A", autoRecall: true };
  const command = { argv: [NODE, hook], files: [hook], timeout: 20000 };
  try {
    writeFileSync(configPath, JSON.stringify(base));
    // Ложные legacy источники остаются одинаковыми: корректный selector обязан их игнорировать.
    writeFileSync(join(root, ".mcp.json"), JSON.stringify({ mcpServers: { hindsight: { env: { HINDSIGHT_BANK_ID: "NC_MCP_IGNORED" } } } }));
    const ctx = await prepare(scratch, command.files, configPath, root);
    let mismatch = false, incomplete = false;
    const cases = [
      ["defaultBank=A", base, "NC_A"],
      ["defaultBank=B", { ...base, defaultBank: "NC_B" }, "NC_B"],
      ["default-off", { url: base.url, banks: base.banks, defaultBank: base.defaultBank }, null],
      ["explicit-off", { ...base, autoRecall: false }, null],
      ["disabled", base, null],
      ["invalid", { ...base, defaultBank: "OUTSIDE_ALLOWLIST" }, null],
      ["missing", null, null],
    ];
    for (const [name, config, expected] of cases) {
      rmSync(join(root, ".hindsight-disabled"), { force: true });
      if (config) writeFileSync(configPath, JSON.stringify(config));
      else rmSync(configPath, { force: true });
      if (name === "disabled") writeFileSync(join(root, ".hindsight-disabled"), "");
      const result = await measure(command, ctx, root, scratch);
      if (result.code !== 0) { incomplete = true; say(`  ${name}: ошибка исполнения`); }
      else if (expected && !result.banks.length) { incomplete = true; say(`  ${name}: нет ответа селектора`); }
      else {
        const matches = expected ? result.banks.every((b) => b === expected) : result.banks.length === 0;
        mismatch ||= !matches;
        say(`  ${name}: ${matches ? "ожидаемое поведение" : "неверный выбор/нарушен opt-in"}`);
      }
    }
    if (mismatch) { say("П3 FAIL"); return 1; }
    if (incomplete) return unavailable("П3 не измерена: selector не ответил в активных состояниях или запуск сломан");
    say("П3 PASS (7 состояний текущего project-only контракта)");
    return 0;
  } finally { rmSync(scratch, { recursive: true, force: true }); }
}

try {
  const [mode, ...args] = process.argv.slice(2);
  if (mode === "check" && args.length >= 2 && args.length <= 3) process.exitCode = await check(...args);
  else if (mode === "negative" && args.length === 1) process.exitCode = await negative(...args);
  else process.exitCode = unavailable("usage: bank-selector-check.sh SETTINGS PROJECT [all|UserPromptSubmit|Stop|SessionEnd]; bank-selector-negative-control.sh RECALL_BUNDLE");
} catch (error) {
  // Только собственные сообщения, без непроверенных stdout/argv/config и путей к секретам.
  process.exitCode = unavailable(error.message.startsWith("нет OS-") || error.message.includes("preflight") ? error.message : "ошибка входных данных или недоступный runtime");
}
