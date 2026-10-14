import { createServer } from "node:http";
import { rmSync } from "node:fs";
import { join } from "node:path";
import { check, finish, project, withServer, PLUGIN } from "./lib/harness.mjs";


// Прямой testable client тоже должен игнорировать ambient production URL/key.
for (const key of Object.keys(process.env)) {
  if (key.startsWith("HINDSIGHT_")) delete process.env[key];
}
const { BankGate, loadProjectConfig } = await import(join(PLUGIN, "dist", "testable.mjs"));
const requests = [];
let lookup = "missing";
const server = createServer((req, res) => {
  let body = "";
  req.on("data", (chunk) => { body += chunk; });
  req.on("end", () => {
    const url = new URL(req.url, "http://localhost");
    requests.push({ method: req.method, path: url.pathname, query: url.searchParams, body: body ? JSON.parse(body) : null });
    const send = (status, value) => {
      res.writeHead(status, { "content-type": "application/json" });
      res.end(JSON.stringify(value));
    };
    if (url.pathname === "/version") return send(200, { api_version: "0.10.2" });
    if (url.pathname === "/v1/default/banks") return send(200, { banks: [{ bank_id: "alpha" }] });
    if (url.pathname.includes("/documents/")) {
      if (req.method === "DELETE") return send(200, { deleted: true });
      if (lookup === "missing") return send(404, { detail: "not found" });
      if (lookup === "failed") return send(503, { detail: "unavailable" });
      if (lookup === "false-404") return send(500, { detail: "HTTP 404 from another upstream" });
      if (lookup === "null") return send(200, null);
      return send(200, { id: "existing-doc", memory_unit_count: lookup });
    }
    if (url.pathname.endsWith("/documents")) return send(200, { items: [{ id: "rule:x:1", memory_unit_count: 1 }], total: 1 });
    if (url.pathname.endsWith("/memories/list")) return send(200, { items: [{ id: "memory-a", text: "A rule tied to a source document.", fact_type: "world" }], total: 1 });
    if (req.method === "POST" && url.pathname.endsWith("/memories")) return send(200, { success: true, operation_id: "test-op", async: true });
    if (req.method === "DELETE" && url.pathname.endsWith("/mental-models/page")) return send(200, { deleted: true });
    return send(404, { detail: "not found" });
  });
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const dir = project({ url: `http://127.0.0.1:${server.address().port}`, banks: ["alpha"], defaultBank: "alpha" });
try {
  console.log("invalid arguments cannot select destructive targets");
  await withServer(dir, {}, async ({ call }) => {
    for (const [name, args] of [
      ["mental_model_delete", { id: ["page"] }],
      ["document_ingest", { title: "existing-doc", content: { text: "not a string" } }],
    ]) {
      const before = requests.length;
      const result = await call(name, args);
      check(result.error?.code === -32602 && requests.length === before, `${name}: wrong-typed input refused before network`, JSON.stringify(result));
    }
    const result = await call("mental_model_delete", { id: "page" });
    check(!result.error && !result.isError && requests.some((r) => r.method === "DELETE" && r.path.endsWith("/mental-models/page")), "valid string target remains callable");
  });

  console.log("document replacement requires verified absence or zero memories");
  await withServer(dir, {}, async ({ call }) => {
    for (const [state, mayWrite] of [
      ["missing", true],
      [0, true],
      [7, false],
      ["7", false],
      [-1, false],
      [0.5, false],
      ["failed", false],
      ["false-404", false],
      ["null", false],
    ]) {
      lookup = state;
      const start = requests.length;
      const result = await call("document_ingest", { title: "existing-doc", content: "A deliberate replacement of a synthetic document." });
      const writes = requests.slice(start).filter((r) => r.method === "POST" && r.path.endsWith("/memories"));
      check(mayWrite ? writes.length === 1 && !result.isError && !result.error : writes.length === 0, `lookup ${JSON.stringify(state)}: ${mayWrite ? "safe replacement permitted" : "existing data not replaced"}`, JSON.stringify({ result, writes }));
    }
  });

  console.log("namespaced documents can be browsed and measured without bypassing confirmation");
  await withServer(dir, {}, async ({ call }) => {
    const start = requests.length;
    const listed = await call("memory_list", { document_id: "rule:x:1" });
    const filtered = requests.slice(start).find((r) => r.path.endsWith("/memories/list"));
    check(!listed.error && !listed.isError && listed.text.includes("A rule tied") && filtered?.query.get("document_id") === "rule:x:1", "namespaced document filter returns its memories", listed.text);
    const deletionStart = requests.length;
    const deletion = await call("document_delete", { id: "rule:x:1" });
    const after = requests.slice(deletionStart);
    check(after.some((r) => r.path.endsWith("/documents")) && after.some((r) => r.query.get("document_id") === "rule:x:1") && !after.some((r) => r.method === "DELETE") && !deletion.isError, "namespaced delete reaches measurement but cannot bypass human confirmation", deletion.text);
  });
  const loaded = loadProjectConfig(dir);
  const client = await new BankGate(loaded.config).resolve("alpha");
  const start = requests.length;
  await client.deleteDocument("rule:x:1");
  check(requests.slice(start).some((r) => r.method === "DELETE" && r.path.endsWith("/documents/rule%3Ax%3A1")), "operator API encodes the complete namespaced document ID");
} finally {
  await new Promise((resolve) => server.close(resolve));
  rmSync(dir, { recursive: true, force: true });
}
finish("mcp-safety");
