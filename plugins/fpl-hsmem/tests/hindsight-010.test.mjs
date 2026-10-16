import { check, finish, project, fakeHindsight, withServer } from "./lib/harness.mjs";

const fake = await fakeHindsight(["alpha"]);
const CAND = JSON.stringify({ bank: "alpha", kind: "rule", content: "c", context: "x", timestamp: "2026-01-01", document_id: "rule:x:1" });
const dir = project({ url: fake.url, banks: ["alpha"], defaultBank: "alpha", tokenFile: "t" }, { t: "tok", "doc.md": "hello", "c.jsonl": CAND });

const ARGS = {
  memory_retain: { content: "c" },
  memory_retain_batch: { file: "c.jsonl" },
  memory_recall: { query: "q q q" },
  memory_reflect: { query: "q" },
  memory_set_mission: { mission: "Answer as the team's architecture memory." },
  memory_list: { type: "world", tags: ["a", "b"] },
  memory_get: { id: "m1" },
  memory_invalidate: { id: "m1", reason: "wrong" },
  memory_reconsolidate: { id: "m1" },
  memory_operations: {},
  mental_model_get: { id: "mm" },
  mental_model_create: { id: "mm", name: "n", source_query: "s" },
  mental_model_update: { id: "mm", name: "n2" },
  mental_model_delete: { id: "mm" },
  mental_model_refresh: { id: "mm" },
  mental_model_clear: { id: "mm" },
  directive_create: { name: "d", content: "c" },
  directive_delete: { id: "d1" },
  bank_config_set: { key: "enable_reranking", value: true },
  document_ingest: { title: "t", content: "c" },
  document_ingest_file: { path: "doc.md" },
  document_list: {},
  document_delete: { id: "doc" },
};

await withServer(dir, {}, async ({ list, call }) => {
  const names = (await list()).map((t) => t.name);
  for (const n of names) await call(n, ARGS[n] ?? {});
  check(fake.requests[0]?.path === "/version", "compatibility is checked before the first bank request", JSON.stringify(fake.requests.slice(0, 2)));
  check(names.length === 28, "exercised every tool", String(names.length));

  const removed = fake.requests.filter((r) => /\/(profile|background)$/.test(r.path));
  check(removed.length === 0, "no tool calls a removed 0.10 endpoint (/profile, /background)", JSON.stringify(removed));
  check(!fake.requests.some((r) => r.method === "PUT" && /^\/v1\/default\/banks\/[^/]+$/.test(r.path)), "no deprecated PUT /banks/{id}");

  const mission = fake.requests.find((r) => r.method === "PATCH" && r.path === "/v1/default/banks/alpha/config" && r.body?.updates?.reflect_mission);
  check(Boolean(mission), "memory_set_mission → PATCH /config {updates:{reflect_mission}}");
  check(mission && Object.keys(mission.body).join() === "updates" && Object.keys(mission.body.updates).join() === "reflect_mission", "…and nothing else in the body", JSON.stringify(mission?.body));

  const mm = fake.requests.find((r) => r.method === "GET" && r.path === "/v1/default/banks/alpha/mental-models");
  check(mm && /detail=metadata/.test(mm.query), "mental_model_list asks for detail=metadata explicitly (0.10 default)", mm?.query);
  const mmGet = fake.requests.find((r) => r.method === "GET" && r.path === "/v1/default/banks/alpha/mental-models/mm");
  check(mmGet && /detail=content/.test(mmGet.query), "mental_model_get opts in to content (0.10 makes content opt-in)", mmGet?.query);

  const cfg = fake.requests.find((r) => r.method === "PATCH" && r.body?.updates?.enable_reranking === true);
  check(cfg && Object.keys(cfg.body).join() === "updates", "bank_config_set → PATCH /config {updates:{…}}");

  const ml = fake.requests.find((r) => r.path === "/v1/default/banks/alpha/memories/list");
  check(ml && /tags=a&tags=b/.test(ml.query) && /type=world/.test(ml.query), "memory_list sends tags as a repeated key (list[str] Query)", ml?.query);

  const existence = fake.requests.filter((r) => r.path === "/v1/default/banks");
  check(existence.length === 1 && existence[0].method === "GET" && /q=alpha/.test(existence[0].query), "bank existence read once from GET /v1/default/banks?q=", JSON.stringify(existence));
  check(fake.requests.filter((r) => r.path === "/version").length === 1, "the version check is cached across every tool call");
});

fake.close();

console.log("concurrent first bank calls share the compatibility request");
{
  let releaseVersion;
  const versionBarrier = new Promise((resolve) => {
    releaseVersion = resolve;
  });
  let observeVersion;
  const versionEntered = new Promise((resolve) => {
    observeVersion = resolve;
  });
  const concurrent = await fakeHindsight(["alpha"], {
    versionBarrier,
    onVersionRequest: observeVersion,
  });
  const concurrentDir = project({
    url: concurrent.url,
    banks: ["alpha"],
    defaultBank: "alpha",
  });
  await withServer(concurrentDir, {}, async ({ call }) => {
    const first = call("memory_recall", { query: "first concurrent compatibility call" });
    const second = call("memory_recall", { query: "second concurrent compatibility call" });
    await versionEntered;
    check(
      concurrent.requests.filter((request) => request.path === "/version").length === 1,
      "concurrent first calls issue exactly one delayed /version request",
      JSON.stringify(concurrent.requests),
    );
    check(
      !concurrent.requests.some(
        (request) =>
          request.path === "/v1/default/banks" ||
          request.path.startsWith("/v1/default/banks/"),
      ),
      "no bank traffic is sent before compatibility release",
      JSON.stringify(concurrent.requests),
    );
    releaseVersion();
    const [firstResult, secondResult] = await Promise.all([first, second]);
    check(
      !firstResult.isError &&
        !secondResult.isError &&
        concurrent.requests.filter((request) => request.path === "/version").length === 1 &&
        concurrent.requests.some((request) => request.path.startsWith("/v1/default/banks")),
      "both concurrent operations continue successfully after release",
      `${firstResult.text}\n${secondResult.text}\n${JSON.stringify(concurrent.requests)}`,
    );
  });
  concurrent.close();
}

console.log("server compatibility gate");
async function versionCase(label, opts, accepted) {
  const f = await fakeHindsight(["alpha"], opts);
  const cwd = project({ url: f.url, banks: ["alpha"], defaultBank: "alpha" });
  await withServer(cwd, {}, async ({ call }) => {
    const first = await call("memory_recall", { query: "what did we decide" });
    const second = await call("memory_recall", { query: "what else did we decide" });
    const versions = f.requests.filter((r) => r.path === "/version");
    const bankRequests = f.requests.filter((r) => r.path === "/v1/default/banks" || r.path.startsWith("/v1/default/banks/"));
    check(versions.length === 1, `${label}: version check is cached`, JSON.stringify(f.requests));
    if (accepted) {
      check(!first.isError && !second.isError, `${label}: accepted`, `${first.text}\n${second.text}`);
      check(bankRequests.length > 0 && f.requests[0]?.path === "/version", `${label}: version precedes bank requests`, JSON.stringify(f.requests));
    } else {
      check(first.isError && second.isError && />=0\.10\.2 and <0\.11\.0/.test(first.text), `${label}: rejected with supported range`, first.text);
      check(bankRequests.length === 0, `${label}: rejected before any bank request`, JSON.stringify(f.requests));
    }
  });
  f.close();
}

await versionCase("0.10.2", { apiVersion: "0.10.2" }, true);
await versionCase("supported 0.10.x", { apiVersion: "0.10.37" }, true);
await versionCase("0.9.1", { apiVersion: "0.9.1" }, false);
await versionCase("0.10.1", { apiVersion: "0.10.1" }, false);
await versionCase("0.11.0", { apiVersion: "0.11.0" }, false);
await versionCase("malformed", { apiVersion: "ten" }, false);
await versionCase("missing", { versionBody: { build: "unknown" } }, false);
await versionCase("request failure", { failVersion: true }, false);
finish("hindsight-0.10");
