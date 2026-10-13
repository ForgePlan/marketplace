// Shared, offline test harness: a fake Hindsight that records every request, and a minimal MCP
// stdio driver for the built server. Nothing here reaches a real bank.
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export const PLUGIN = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

let pass = 0;
let fail = 0;
export function check(cond, label, detail = "") {
  if (cond) {
    console.log("  ok   " + label);
    pass++;
  } else {
    console.log("  FAIL " + label + (detail ? "\n         " + detail : ""));
    fail++;
  }
}
export function finish(name) {
  console.log("");
  if (fail > 0) {
    console.log(`${name} FAILED: ${pass} passed, ${fail} failed`);
    process.exit(1);
  }
  console.log(`${name} OK: ${pass} cases`);
}

/**
 * An empty home directory for every spawned process. It must not be the project: discovery never
 * reads `$HOME/.hindsight.json`, so a project that IS the home directory is inert by design.
 */
export const HOME = mkdtempSync(join(tmpdir(), "hsmem-home-"));

/**
 * A temp project. `config` (object) is written as .hindsight.json when given. The directory gets a
 * `.git` so it is a repository toplevel, like a real project: config discovery stops there.
 */
export function project(config, files = {}, { git = true } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "hsmem-test-"));
  if (git) mkdirSync(join(dir, ".git"));
  if (config) writeFileSync(join(dir, ".hindsight.json"), JSON.stringify(config));
  for (const [rel, content] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, rel)), { recursive: true });
    writeFileSync(join(dir, rel), content);
  }
  return dir;
}

/**
 * Fake Hindsight 0.10. `banks` exist; anything else is "missing". The fake reports API 0.10.2
 * from `/version` unless `opts.apiVersion`, `opts.versionBody`, or `opts.failVersion` overrides it.
 * `opts.versionBarrier` delays that response until its promise settles; `opts.onVersionRequest`
 * observes arrival before release so concurrent compatibility behavior can be tested deterministically.
 * The removed 0.10 endpoints answer 410 exactly like the real server, so a regression is visible.
 *
 * `opts.documents` — `{ bank: [documentId | { id, tags }, …] }` that GET /documents/{id} reports as
 * existing (every other id is a 404, as on the real server); a bare id has no tags. Documents
 * written through POST /memories are remembered with their tags, so a re-run sees its own writes.
 * `opts.failRetain` — POST /memories answers 500. `banks` is read live: a test may mutate it.
 */
export async function fakeHindsight(banks = [], opts = {}) {
  let ops = 0;
  const requests = [];
  const docs = new Map();
  for (const [bank, list] of Object.entries(opts.documents ?? {})) {
    for (const d of list) docs.set(`${bank}\u0000${typeof d === "string" ? d : d.id}`, typeof d === "string" ? [] : d.tags);
  }
  const srv = createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      const url = new URL(req.url, "http://x");
      requests.push({ method: req.method, path: url.pathname, query: url.search, body: body ? JSON.parse(body) : null, auth: req.headers.authorization });
      const send = (code, obj) => {
        res.writeHead(code, { "content-type": "application/json" });
        res.end(JSON.stringify(obj));
      };
      if (url.pathname === "/version" && req.method === "GET") {
        const answerVersion = () => {
          if (opts.failVersion) return send(503, { detail: "version unavailable" });
          const versionBody =
            Object.hasOwn(opts, "versionBody") ? opts.versionBody : { api_version: opts.apiVersion ?? "0.10.2" };
          return send(200, versionBody);
        };
        opts.onVersionRequest?.();
        if (opts.versionBarrier) {
          void opts.versionBarrier.then(answerVersion);
          return;
        }
        return answerVersion();
      }
      if (/\/(profile|background)$/.test(url.pathname)) return send(410, { detail: "removed in 0.10" });
      if (url.pathname === "/v1/default/banks" && req.method === "GET") {
        const q = url.searchParams.get("q") ?? "";
        return send(200, { banks: banks.filter((b) => b.includes(q)).map((b) => ({ bank_id: b })), total: banks.length });
      }
      const m = /^\/v1\/default\/banks\/([^/]+)(\/.*)?$/.exec(url.pathname);
      if (m) {
        const bank = decodeURIComponent(m[1]);
        if (!banks.includes(bank)) return send(404, { detail: `bank ${bank} not found` });
        if (m[2] === "/memories/recall") return send(200, { results: [] });
        if (m[2] === "/config" && req.method === "PATCH") return send(200, { bank_id: bank, config: {}, overrides: JSON.parse(body).updates });
        if (m[2] === "/config") return send(200, { bank_id: bank, config: { memory_defense: null }, overrides: {} });
        if (m[2] === "/memories" && req.method === "POST") {
          if (opts.failRetain) return send(500, { detail: "extraction backend down" });
          for (const it of JSON.parse(body).items ?? []) {
            if (it.document_id) docs.set(`${bank}\u0000${it.document_id}`, it.tags ?? []);
          }
          return send(200, { success: true, bank_id: bank, async: true, operation_id: `op-${++ops}` });
        }
        const doc = /^\/documents\/([^/]+)$/.exec(m[2] ?? "");
        if (doc && req.method === "GET") {
          const id = decodeURIComponent(doc[1]);
          const tags = docs.get(`${bank}\u0000${id}`);
          return tags
            ? send(200, { id, bank_id: bank, memory_unit_count: 1, tags })
            : send(404, { detail: `document ${id} not found` });
        }
        if (m[2] === "/stats") return send(200, { total_nodes: 0 });
        if (m[2] === "/mental-models") return send(200, { items: [] });
        return send(200, {});
      }
      send(404, { detail: "no route" });
    });
  });
  await new Promise((r) => srv.listen(0, "127.0.0.1", r));
  return { url: `http://127.0.0.1:${srv.address().port}`, requests, close: () => srv.close() };
}

/** Start the built MCP server in `cwd`, run `fn(call)`, then kill it. */
export async function withServer(cwd, env, fn) {
  const child = spawn("node", [join(PLUGIN, "dist", "index.mjs")], {
    cwd,
    env: { PATH: process.env.PATH, HOME, ...env },
    stdio: ["pipe", "pipe", "pipe"],
  });
  let buf = "";
  let stderr = "";
  const waiting = new Map();
  child.stdout.on("data", (d) => {
    buf += d;
    let i;
    while ((i = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, i);
      buf = buf.slice(i + 1);
      if (!line.trim()) continue;
      const msg = JSON.parse(line);
      waiting.get(msg.id)?.(msg);
    }
  });
  child.stderr.on("data", (d) => (stderr += d));
  let id = 0;
  const rpc = (method, params) =>
    new Promise((resolve, reject) => {
      const myId = ++id;
      const t = setTimeout(() => reject(new Error(`timeout on ${method}; stderr: ${stderr}`)), 15000);
      waiting.set(myId, (m) => {
        clearTimeout(t);
        resolve(m);
      });
      child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id: myId, method, params }) + "\n");
    });
  try {
    const init = await rpc("initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "t", version: "0" } });
    child.stdin.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n");
    const call = async (name, args = {}) => {
      const r = await rpc("tools/call", { name, arguments: args });
      return { text: r.result?.content?.[0]?.text ?? "", isError: r.result?.isError === true, error: r.error };
    };
    const list = async () => (await rpc("tools/list", {})).result.tools;
    return await fn({ init, call, list, stderr: () => stderr });
  } finally {
    child.kill();
  }
}

/** Run a built hook with JSON on stdin; resolves to { code, stdout, stderr }. */
export function runHook(hook, input, env = {}) {
  return new Promise((resolve) => {
    const child = spawn("node", [join(PLUGIN, "dist", "hooks", hook)], {
      cwd: input.cwd,
      env: { PATH: process.env.PATH, HOME, ...env },
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("close", (code) => resolve({ code, stdout, stderr }));
    child.stdin.end(JSON.stringify(input));
  });
}
