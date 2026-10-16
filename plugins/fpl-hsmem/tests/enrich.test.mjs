// Batch enrichment: validation, routing, secret/PII refusal, dry run vs apply — for the CLI
// (dist/enrich.mjs) and the memory_retain_batch tool. Offline, against the recording fake server.
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { appendFileSync, mkdtempSync, symlinkSync, writeFileSync } from "node:fs";
import { check, finish, project, fakeHindsight, withServer, PLUGIN, HOME } from "./lib/harness.mjs";
import { parseCandidates, routeBank, scanSensitive, loadProjectConfig, ENRICH_SOURCE_TAG } from "../dist/testable.mjs";

const item = (over = {}) => ({
  kind: "decision",
  content: "service-x: retries moved into the queue consumer. Why: the HTTP layer retried non-idempotent calls.",
  context: "ADR-007 in service-x: retries in the consumer",
  timestamp: "2026-05-06",
  document_id: "decision:service-x:ADR-007:retries",
  tags: ["source:adr", "repo:service-x"],
  metadata: { link: "service-x:docs/adr/ADR-007.md@abc1234", artifact: "ADR-007", repo: "service-x" },
  ...over,
});
const jsonl = (...rows) => rows.map((r) => (typeof r === "string" ? r : JSON.stringify(r))).join("\n") + "\n";
const opts = { maxChars: 900, routing: {} };

console.log("validation");
{
  const ok = parseCandidates(jsonl(item({ bank: "alpha" })), opts);
  check(ok.lines === 1 && ok.candidates.length === 1 && ok.refused.length === 0, "a well-formed line is accepted", JSON.stringify(ok.refused));
  const it = ok.candidates[0]?.item ?? {};
  check(it.update_mode === "replace" && it.observation_scopes === "shared", "items are written replace + shared");
  check(it.timestamp === "2026-05-06T00:00:00Z", "a bare date becomes a UTC datetime", it.timestamp);
  check(it.tags?.includes("kind:decision") && it.tags.includes(ENRICH_SOURCE_TAG) && it.tags.length === 4, "kind and the enrich source tag are carried as tags, once", JSON.stringify(it.tags));
  check(!("bank" in it) && !("kind" in it), "bank and kind are not sent as item fields");

  const cases = [
    [item({ bank: "alpha", kind: "idea" }), "unknown kind"],
    [item({ bank: "alpha", content: "" }), "empty content"],
    [item({ bank: "alpha", content: "x".repeat(901) }), "content over the configured cap"],
    [item({ bank: "alpha", context: undefined }), "missing context"],
    [item({ bank: "alpha", timestamp: "" }), "missing timestamp"],
    [item({ bank: "alpha", timestamp: "last tuesday" }), "non-ISO timestamp"],
    [item({ bank: "alpha", document_id: undefined }), "missing document ID"],
    [item({ bank: "alpha", document_id: "a/../b" }), "traversal document ID"],
    [item({ bank: "alpha", document_id: "decision:a/b" }), "multi-segment document ID"],
    [item({ bank: "alpha", documentId: "x" }), "unknown field"],
    [item({ bank: "alpha", metadata: { repo: 5 } }), "non-string metadata"],
    [item({ bank: "alpha", tags: "a,b" }), "non-array tags"],
    [item({ bank: "" }), "empty bank"],
    ["{not json", "malformed JSON"],
    ["[1,2]", "non-object JSON"],
  ];
  for (const [row, label] of cases) {
    const r = parseCandidates(jsonl(row), opts);
    check(r.candidates.length === 0 && r.refused.length === 1 && r.refused[0].line === 1, `refused: ${label}`, JSON.stringify(r.refused));
  }
  const capped = parseCandidates(jsonl(item({ bank: "alpha", content: "y".repeat(120) })), { ...opts, maxChars: 100 });
  check(capped.refused.length === 1, "the content cap is configurable");

  const dup = parseCandidates(jsonl(item({ bank: "alpha" }), "", item({ bank: "alpha", content: "other text" })), opts);
  check(
    dup.lines === 2 && dup.candidates.length === 1 && dup.candidates[0].line === 1 && dup.refused[0]?.line === 3,
    "duplicate source rows cannot replace the first candidate; blank rows preserve line numbering",
    JSON.stringify(dup.refused),
  );
}

console.log("routing");
{
  const routing = { "service-x": "alpha", "svc-*": "beta", "service-?": "gamma", "*": "delta" };
  check(routeBank("service-x", routing) === "alpha", "an exact name wins over globs");
  check(routeBank("svc-billing", routing) === "beta", "`*` glob");
  check(routeBank("service-y", routing) === "gamma", "`?` glob, first matching glob in declaration order");
  check(routeBank("anything.else", routing) === "delta", "a catch-all glob is opt-in");
  check(routeBank("service-x", { "svc-*": "beta" }) === undefined, "no match → undefined");
  check(routeBank("a.b", { "a?b": "x", "a.b-not": "y" }) === "x" && routeBank("axb", { "a.b": "x" }) === undefined, "glob metacharacters only `*` `?`");

  const routed = parseCandidates(jsonl(item()), { maxChars: 900, routing: { "service-*": "beta" } });
  check(routed.candidates[0]?.bank === "beta", "a line without `bank` is routed by metadata.repo");
  const explicit = parseCandidates(jsonl(item({ bank: "alpha" })), { maxChars: 900, routing: { "service-*": "beta" } });
  check(explicit.candidates[0]?.bank === "alpha", "an explicit bank beats routing");
  const unrouted = parseCandidates(jsonl(item()), opts);
  check(unrouted.candidates.length === 0 && unrouted.refused[0]?.line === 1, "unroutable line is refused instead of sent to defaultBank");
  const norepo = parseCandidates(jsonl(item({ metadata: undefined })), opts);
  check(norepo.candidates.length === 0 && norepo.refused[0]?.line === 1, "a line without a bank or repository is refused");
}

console.log("secret / PII scan");
{
  const positives = {
    "private-key": "key: -----BEGIN RSA PRIVATE KEY----- MIIE",
    bearer: "call it with Bearer abcdef1234567890abcdef",
    "password-assignment": "the dev db uses password=hunter2",
    "connection-string": "point it at postgres://svc@db.internal:5432/app",
    "connection-string ": "via https://deploy:s3cr3t@git.example.org/repo",
    email: "ask jane.doe@example.com about it",
    "long-token": "the key is 9fK2mQ7xL4pR8sT1vW3yZ6aB0cD5eF",
    jwt: "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U",
    "github-token": "ghp_abcdefghijklmnopqrstuvwxyz0123456789",
  };
  for (const [kind, text] of Object.entries(positives)) {
    const hits = scanSensitive(text);
    check(hits.includes(kind.trim()), `flags ${kind.trim()}`, JSON.stringify(hits));
  }
  const negatives = [
    "service-x:.forgeplan/adrs/ADR-001-single-intent-upgrade-flow-with-mode-2-mit-confirm-drop-in-fallback-option-c.md@fb18f8f88",
    "operation 550e8400-e29b-41d4-a716-446655440000 failed; commit 9fceb02d0ae598e95dc970b74767f19372d61af8 fixed it",
    "Bearer token auth was rejected in favour of session cookies",
    "use the useSubscriptionUpgradeStateMachine hook and the v2 OAuth2 flow",
    "the password policy moved to the identity service",
  ];
  for (const text of negatives) check(scanSensitive(text).length === 0, `no false positive: ${text.slice(0, 50)}…`, JSON.stringify(scanSensitive(text)));

  const r = parseCandidates(jsonl(item({ bank: "alpha" }), item({ bank: "alpha", document_id: "d2", content: "contact jane.doe@example.com", context: "Bearer abcdef1234567890abcdef" })), opts);
  check(r.candidates.length === 1 && r.refused[0]?.line === 2, "the offending line is refused, the clean one kept");
  const why = r.refused[0]?.reasons.join("; ") ?? "";
  check(/email in content/.test(why) && /bearer in context/.test(why), "reports kind and field", why);
  check(!why.includes("jane.doe") && !why.includes("abcdef1234567890"), "never echoes the matched value", why);
  const meta = parseCandidates(jsonl(item({ bank: "alpha", metadata: { repo: "service-x", link: "https://u:p4ss@host.example/x" } })), opts);
  check(meta.refused.length === 1 && /in metadata/.test(meta.refused[0].reasons.join()), "metadata values are scanned too");
}

console.log("config");
{
  const base = { url: "http://127.0.0.1:1", banks: ["alpha", "beta"], defaultBank: "alpha" };
  const good = loadProjectConfig(project({ ...base, routing: { "svc-*": "beta" }, enrichMaxChars: 500 }));
  check(good.state === "active" && good.config.routing["svc-*"] === "beta" && good.config.enrichMaxChars === 500, "routing and enrichMaxChars load", JSON.stringify(good));
  const dflt = loadProjectConfig(project(base));
  check(dflt.state === "active" && dflt.config.enrichMaxChars === 900 && Object.keys(dflt.config.routing).length === 0, "defaults: 900 chars, no routing");
  const bad = loadProjectConfig(project({ ...base, routing: { "svc-*": "outside" } }));
  check(bad.state === "invalid", "a route to a bank outside the allowlist invalidates the config");
  const badShape = loadProjectConfig(project({ ...base, routing: ["svc"] }));
  check(badShape.state === "invalid" && /`routing` must be an object/.test(badShape.reason), "routing must be an object");
  const badCap = loadProjectConfig(project({ ...base, enrichMaxChars: 0 }));
  check(badCap.state === "invalid" && /enrichMaxChars/.test(badCap.reason), "enrichMaxChars must be positive");
  const overCap = loadProjectConfig(project({ ...base, enrichMaxChars: 2001 }));
  check(overCap.state === "invalid" && /enrichMaxChars` must be an integer from 1 to 2000/.test(overCap.reason), "enrichMaxChars is capped at 2000", overCap.reason);
  check(loadProjectConfig(project({ ...base, enrichMaxChars: 2000 })).state === "active", "enrichMaxChars 2000 is allowed");
}

/** Run the built CLI in `cwd`. */
function cli(cwd, args) {
  return new Promise((resolve) => {
    const child = spawn("node", [join(PLUGIN, "dist", "enrich.mjs"), ...args], {
      cwd,
      env: { PATH: process.env.PATH, HOME },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}
/** The digest a dry run of `args` reports. */
const digestOf = async (cwd, args) => JSON.parse((await cli(cwd, [...args, "--json"])).stdout).digest;

// alpha, beta exist; "ghost" is allowed but missing on the server; "other" exists but is not allowed.
// In alpha, one document was written by enrich earlier and "sess-1234" (a transcript) was not.
const fake = await fakeHindsight(["alpha", "beta", "other"], {
  documents: { alpha: [{ id: "decision:service-x:ADR-007:retries", tags: ["kind:decision", ENRICH_SOURCE_TAG] }, "sess-1234"] },
});
const config = {
  url: fake.url,
  banks: ["alpha", "beta", "ghost"],
  defaultBank: "alpha",
  tokenFile: "t",
  routing: { "service-*": "alpha", "web-*": "beta" },
};
const FILE = jsonl(
  item(), //                                                                    1 → alpha (routed), exists, written by enrich
  item({ document_id: "rejected:service-x:ADR-007:http-retries", kind: "rejected", content: "Rejected: retries in the HTTP client. Why: non-idempotent calls." }), // 2 → alpha
  item({ document_id: "lesson:web-app:NOTE-1:x", kind: "lesson", metadata: { repo: "web-app" } }), // 3 → beta (routed)
  item({ document_id: "rule:x:1", kind: "rule", bank: "ghost" }), //            4 → refused: bank missing
  item({ document_id: "rule:x:2", kind: "rule", bank: "other" }), //            5 → refused: not allowed
  item({ document_id: "pitfall:x:3", kind: "pitfall", content: "token=ZXlKaGJHY2lPaUpJVXpJMU5pSjk1234 leaked" }), // 6 → secret
  item({ document_id: "finding:x:4", kind: "finding", metadata: { repo: "unknown-repo" } }), // 7 → unroutable
  item({ document_id: "sess-1234", kind: "lesson", content: "Lesson: a collision with a captured transcript." }), // 8 → refused: foreign document
);
const dir = project(config, { t: "tok", "cands.jsonl": FILE });
const bankScoped = () => fake.requests.filter((r) => r.path.startsWith("/v1/default/banks/"));
const posts = () => fake.requests.filter((r) => r.method === "POST");

console.log("CLI dry run");
{
  const r = await cli(dir, ["cands.jsonl"]);
  check(r.code === 3, "exit 3 when some lines are refused", `${r.code} ${r.stderr}`);
  check(posts().length === 0, "dry run writes nothing", JSON.stringify(posts()));
  check(/DRY RUN — nothing written/.test(r.stdout) && /lines 8 · accepted 3 · refused 5/.test(r.stdout), "summary counts", r.stdout);
  check(/bank "alpha": 2 item\(s\) \(decision 1, rejected 1\) · already on the server 1 → would be replaced · new 1/.test(r.stdout), "per bank / kind / existing", r.stdout);
  check(/bank "beta": 1 item\(s\) \(lesson 1\)/.test(r.stdout), "routed to a second bank");
  check(/line 4 \[rule:x:1\]: Refusing: bank "ghost" does not exist/.test(r.stdout), "missing bank refused with its line");
  check(/line 5 \[rule:x:2\]: Refusing: bank "other" is not in this project's allowlist/.test(r.stdout), "bank outside the allowlist refused");
  check(/line 6 \[pitfall:x:3\]: secret\/PII scan: [a-z-]+ in content/.test(r.stdout) && !r.stdout.includes("ZXlKaGJH"), "secret line refused without echoing it", r.stdout);
  check(/line 7 \[finding:x:4\]: no bank/.test(r.stdout), "unroutable line refused");
  check(/line 8 \[sess-1234\]: document "sess-1234" already exists in bank "alpha" and was not written by enrich — replacing it would delete 1 memory unit/.test(r.stdout), "a document enrich did not write is refused, never replaced", r.stdout);
  check(/alpha {2}decision:service-x:ADR-007:retries/.test(r.stdout), "lists the document_ids already on the server");
  check(/^digest [0-9a-f]{64}$/m.test(r.stdout), "prints the digest", r.stdout);
  const digest = /^digest ([0-9a-f]{64})$/m.exec(r.stdout)?.[1];
  check(new RegExp(`Apply would send 3 item\\(s\\) in 2 request\\(s\\)\\. .*--apply --confirm ${digest}`).test(r.stdout), "says what apply would do and how to confirm it", r.stdout);
  check(!bankScoped().some((q) => q.path.includes("/ghost") || q.path.includes("/other")), "never touches a missing or disallowed bank");
  const docGets = bankScoped().filter((q) => q.method === "GET" && q.path.includes("/documents/"));
  check(docGets.some((q) => q.path.endsWith("/documents/decision%3Aservice-x%3AADR-007%3Aretries")), "existence is an exact GET by encoded id", JSON.stringify(docGets.map((q) => q.path)));

  const j = await cli(dir, ["cands.jsonl", "--json"]);
  const s = JSON.parse(j.stdout);
  check(s.mode === "dry-run" && s.accepted === 3 && s.refused.length === 5 && s.banks[0].kinds.decision === 1 && s.digest === digest, "--json summary carries the same digest", j.stdout.slice(0, 300));
  check((await digestOf(dir, ["cands.jsonl"])) === digest, "the digest is deterministic");

  const f = await cli(dir, ["cands.jsonl", "--allow-replace-foreign"]);
  check(/lines 8 · accepted 4 · refused 4/.test(f.stdout) && /alpha {2}sess-1234 {2}\(NOT written by enrich/.test(f.stdout), "--allow-replace-foreign accepts the foreign document and flags it", f.stdout);
  check(/^digest ([0-9a-f]{64})$/m.exec(f.stdout)?.[1] !== digest, "allowing foreign replacement changes the digest");
}

console.log("CLI apply needs the dry run's digest");
{
  const none = await cli(dir, ["cands.jsonl", "--apply"]);
  check(none.code === 1 && /requires the freshness digest printed by the dry run/.test(none.stderr) && posts().length === 0, "--apply without --confirm writes nothing", `${none.code} ${none.stderr}`);
  const wrong = await cli(dir, ["cands.jsonl", "--apply", "--confirm", "0".repeat(64)]);
  check(wrong.code === 1 && /changed since the dry run/.test(wrong.stderr) && posts().length === 0, "a wrong digest writes nothing", wrong.stderr);
  const orphan = await cli(dir, ["cands.jsonl", "--confirm", "abc"]);
  check(orphan.code === 2, "--confirm without --apply is a usage error");

  const edited = project(config, { t: "tok", "c.jsonl": FILE });
  const before = await digestOf(edited, ["c.jsonl"]);
  appendFileSync(join(edited, "c.jsonl"), jsonl(item({ bank: "beta", document_id: "decision:late:1" })));
  const e = await cli(edited, ["c.jsonl", "--apply", "--confirm", before]);
  check(e.code === 1 && /changed since the dry run/.test(e.stderr) && posts().length === 0, "a file edited after the dry run is refused", e.stderr);
  const ff = await cli(dir, ["cands.jsonl", "--apply", "--allow-replace-foreign", "--confirm", await digestOf(dir, ["cands.jsonl"])]);
  check(ff.code === 1 && posts().length === 0, "a digest from a dry run without --allow-replace-foreign does not confirm an apply with it");
}

console.log("destination-bound freshness");
{
  const documents = { alpha: [{ id: "decision:destination:1", tags: [ENRICH_SOURCE_TAG] }] };
  const a = await fakeHindsight(["alpha"], { documents });
  const b = await fakeHindsight(["alpha"], { documents });
  try {
    const file = jsonl(item({ bank: "alpha", document_id: "decision:destination:1" }));
    const aDir = project({ ...config, url: a.url, banks: ["alpha"], routing: {} }, { t: "tok", "c.jsonl": file });
    const bDir = project({ ...config, url: b.url, banks: ["alpha"], routing: {} }, { t: "tok", "c.jsonl": file });
    const aRun = await cli(aDir, ["c.jsonl", "--json"]);
    const bRun = await cli(bDir, ["c.jsonl", "--json"]);
    const aPlan = JSON.parse(aRun.stdout);
    const bPlan = JSON.parse(bRun.stdout);
    check(aRun.code === 0 && bRun.code === 0 && aPlan.accepted === 1 && bPlan.accepted === 1 &&
      aPlan.banks[0].existing.length === 1 && bPlan.banks[0].existing.length === 1,
      "both destinations expose identical candidate and document state");
    check(aPlan.digest !== bPlan.digest, "the same file and document state on different endpoints have different digests");
    const fingerprintA = createHash("sha256").update(a.url).digest("hex");
    const fingerprintB = createHash("sha256").update(b.url).digest("hex");
    check(aPlan.destinations.some((d) => d.bank === "alpha" && d.fingerprint === fingerprintA) &&
      bPlan.destinations.some((d) => d.bank === "alpha" && d.fingerprint === fingerprintB),
      "JSON identifies each exact destination by its safe fingerprint");
    const text = await cli(bDir, ["c.jsonl"]);
    check(text.stdout.includes(fingerprintB) && !text.stdout.includes(b.url) && !bRun.stdout.includes(b.url),
      "text and JSON report the destination fingerprint without the raw endpoint");
    const stale = await cli(bDir, ["c.jsonl", "--apply", "--confirm", aPlan.digest, "--json"]);
    check(stale.code === 1, "confirmation for destination A cannot apply to destination B");
    check(!a.requests.some((r) => r.method === "POST") && !b.requests.some((r) => r.method === "POST"),
      "cross-destination confirmation refusal sends no POST to either fake server");
  } finally {
    a.close();
    b.close();
  }
}

console.log("missing-bank report privacy");
{
  const missing = await fakeHindsight([]);
  try {
    const missingDir = project(
      { url: missing.url, banks: ["ghost"], defaultBank: "ghost" },
      { "c.jsonl": jsonl(item({ bank: "ghost" })) },
    );
    const text = await cli(missingDir, ["c.jsonl"]);
    const json = await cli(missingDir, ["c.jsonl", "--json"]);
    const report = JSON.parse(json.stdout);
    check(
      text.code === 3 && json.code === 3 && report.accepted === 0 && report.refused[0]?.line === 1 &&
        !text.stdout.includes(missing.url) && !json.stdout.includes(missing.url) &&
        !missing.requests.some((r) => r.method === "POST"),
      "missing-bank text and JSON keep the refusal without exposing its endpoint or writing",
    );
  } finally {
    missing.close();
  }
}

console.log("refusal report privacy");
{
  const email = "audit.person@example.com";
  const token = "ghp_abcdefghijklmnopqrstuvwxyz0123456789";
  const unsafeId = "private-id/$unrecognized";
  const unknownKey = "$unrecognized-private-field";
  const invalidKind = "unrecognized-private-kind";
  const cases = [
    item({ bank: "alpha", document_id: email }),
    item({ bank: "alpha", document_id: token }),
    item({ bank: "alpha", document_id: unsafeId }),
    item({ bank: "alpha", document_id: "decision:privacy:kind-email", kind: email }),
    item({ bank: "alpha", document_id: "decision:privacy:kind-token", kind: token }),
    item({ bank: "alpha", document_id: "decision:privacy:kind-object", kind: { [email]: token } }),
    item({ bank: "alpha", document_id: "decision:privacy:kind-unknown", kind: invalidKind }),
    item({ bank: "alpha", document_id: "decision:privacy:field-email", [email]: "ordinary" }),
    item({ bank: "alpha", document_id: "decision:privacy:field-token", [token]: "ordinary" }),
    item({ bank: "alpha", document_id: "decision:privacy:field-unknown", [unknownKey]: { contact: email, secret: token } }),
    item({ bank: "alpha", document_id: "decision:privacy:meta-email", metadata: { [email]: "ordinary" } }),
    item({ bank: "alpha", document_id: "decision:privacy:meta-token", metadata: { [token]: "ordinary" } }),
    item({ bank: "alpha", document_id: "decision:privacy:meta-invalid", metadata: { [email]: 7 } }),
    item({ bank: "alpha", document_id: "decision:privacy:meta-value", metadata: { link: token } }),
    item({ document_id: "decision:privacy:repo", metadata: { repo: email } }),
  ];
  const clean = item({ bank: "alpha", document_id: "decision:privacy:clean" });
  const parsed = parseCandidates(jsonl(...cases, clean), opts);
  check(parsed.refused.length === cases.length && parsed.candidates.length === 1,
    "unsafe identifiers, invalid fields and sensitive metadata are refused while a clean candidate survives");
  check(parsed.refused.slice(0, 3).every((r) => !Object.hasOwn(r, "documentId")) &&
    parsed.refused[3]?.documentId === "decision:privacy:kind-email",
    "refusals omit unsafe IDs but preserve validated clean IDs");
  check(parsed.refused[10]?.reasons.some((r) => r.includes("email in metadata key")) &&
    parsed.refused[11]?.reasons.some((r) => r.includes("github-token in metadata key")),
    "metadata key refusals expose only field category and recognized kind");
  const privateValues = [email, token, unsafeId, unknownKey, invalidKind];
  check(privateValues.every((v) => !JSON.stringify(parsed.refused).includes(v)),
    "raw refused values and unknown names do not leak even when no scanner recognizes them");
  const server = await fakeHindsight(["alpha"]);
  try {
    const privacyDir = project({ ...config, url: server.url, banks: ["alpha"], routing: {} },
      { t: "tok", "c.jsonl": jsonl(...cases, clean) });
    const text = await cli(privacyDir, ["c.jsonl"]);
    const json = await cli(privacyDir, ["c.jsonl", "--json"]);
    const plan = JSON.parse(json.stdout);
    check(text.code === 3 && json.code === 3 && plan.accepted === 1 && plan.refused.length === cases.length,
      "both report modes keep every privacy refusal and the ordinary candidate");
    check(privateValues.every((v) => ![text.stdout, text.stderr, json.stdout, json.stderr].some((s) => s.includes(v))),
      "neither text nor JSON reports echo sensitive or unvalidated values");
    check(!server.requests.some((r) => r.method === "POST"), "privacy dry runs send no writes");
    const applied = await cli(privacyDir, ["c.jsonl", "--apply", "--confirm", plan.digest, "--json"]);
    const writes = server.requests.filter((r) => r.method === "POST");
    const sent = writes.flatMap((r) => r.body.items);
    check(applied.code === 3 && writes.length === 1 && sent.length === 1 &&
      sent[0].document_id === clean.document_id && JSON.stringify(sent[0].metadata) === JSON.stringify(clean.metadata),
      "only the clean candidate is retained and its ordinary metadata remains functional");
    check(privateValues.every((v) => !JSON.stringify(server.requests).includes(v) &&
      !applied.stdout.includes(v) && !applied.stderr.includes(v)),
      "refused values never reach fake requests or apply reports");
  } finally {
    server.close();
  }
}

console.log("CLI apply");
{
  const digest = await digestOf(dir, ["cands.jsonl"]);
  const r = await cli(dir, ["cands.jsonl", "--apply", "--confirm", digest, "--batch-size", "1"]);
  check(r.code === 3, "exit 3: applied, but some lines were refused", `${r.code} ${r.stderr}`);
  const p = posts();
  check(p.length === 3, "one request per batch (batch size 1, 3 items)", String(p.length));
  check(p.every((q) => q.path.endsWith("/memories") && q.body.async === true), "POST /banks/{bank}/memories, async");
  check(p.filter((q) => q.path === "/v1/default/banks/alpha/memories").length === 2 && p.filter((q) => q.path === "/v1/default/banks/beta/memories").length === 1, "each item went to its own bank");
  const first = p[0].body.items[0];
  check(
    first.document_id === "decision:service-x:ADR-007:retries" && first.update_mode === "replace" && first.observation_scopes === "shared" &&
      first.timestamp === "2026-05-06T00:00:00Z" && first.context && first.metadata?.link && first.tags.includes("kind:decision") && first.tags.includes(ENRICH_SOURCE_TAG),
    "item carries content, context, timestamp, document_id, tags (+ source tag), metadata, replace, shared",
    JSON.stringify(first),
  );
  const sent = p.flatMap((q) => q.body.items.map((i) => i.document_id));
  check(!sent.some((id) => ["rule:x:1", "rule:x:2", "pitfall:x:3", "finding:x:4", "sess-1234"].includes(id)), "refused lines are never sent, the foreign document is never replaced", sent.join());
  check(/alpha 1\/2: 1 item\(s\) → operation op-\d+/.test(r.stdout) && /Queued\. Extraction is asynchronous/.test(r.stdout), "prints operation ids", r.stdout);

  const stale = await cli(dir, ["cands.jsonl", "--apply", "--confirm", digest]);
  check(stale.code === 1 && posts().length === 3, "the pre-apply digest no longer confirms: the server now holds those documents");
  const again = await cli(dir, ["cands.jsonl", "--apply", "--confirm", await digestOf(dir, ["cands.jsonl"])]);
  const p2 = posts().slice(3);
  check(again.code === 3 && p2.length === 2, "default batch size: one request per bank");
  check(JSON.stringify(p2.flatMap((q) => q.body.items.map((i) => i.document_id)).sort()) === JSON.stringify(sent.sort()), "a re-run replaces its own documents (idempotent)");
}

console.log("CLI apply replacing a foreign document, deliberately");
{
  const f2 = await fakeHindsight(["alpha"], { documents: { alpha: ["sess-9"] } });
  const fdir = project({ ...config, url: f2.url, banks: ["alpha"], routing: {} }, { t: "tok", "c.jsonl": jsonl(item({ bank: "alpha", document_id: "sess-9" })) });
  const plain = await cli(fdir, ["c.jsonl"]);
  check(plain.code === 3 && /not written by enrich/.test(plain.stdout), "refused by default");
  const digest = await digestOf(fdir, ["c.jsonl", "--allow-replace-foreign"]);
  const r = await cli(fdir, ["c.jsonl", "--apply", "--allow-replace-foreign", "--confirm", digest]);
  const w = f2.requests.filter((q) => q.method === "POST");
  check(r.code === 0 && w.length === 1 && w[0].body.items[0].document_id === "sess-9", "replaced with --allow-replace-foreign and its own digest", `${r.code} ${r.stdout} ${r.stderr}`);
  f2.close();
}

console.log("CLI edges");
{
  const clean = project(config, { t: "tok", "c.jsonl": jsonl(item({ bank: "beta", document_id: "decision:clean:1" })) });
  const r = await cli(clean, ["c.jsonl", "--apply", "--confirm", await digestOf(clean, ["c.jsonl"])]);
  check(r.code === 0, "exit 0 when every line was accepted and queued", `${r.code} ${r.stdout}`);
  const over = await cli(clean, ["c.jsonl", "--max-chars", "10"]);
  check(over.code === 3 && /over the 10-char cap/.test(over.stdout), "--max-chars overrides the config cap");
  const huge = await cli(clean, ["c.jsonl", "--max-chars", "2001"]);
  check(huge.code === 2 && /--max-chars must be 1\.\.2000/.test(huge.stderr), "--max-chars cannot exceed 2000", huge.stderr);

  const failing = await fakeHindsight(["beta"], { failRetain: true });
  const fdir = project({ ...config, url: failing.url }, { t: "tok", "c.jsonl": jsonl(item({ bank: "beta", document_id: "decision:clean:1" })) });
  const f = await cli(fdir, ["c.jsonl", "--apply", "--confirm", await digestOf(fdir, ["c.jsonl"])]);
  check(f.code === 1 && /beta 1\/1: 1 item\(s\) → FAILED/.test(f.stdout), "a failed batch is reported and exits 1", f.stdout);
  failing.close();

  const outside = mkdtempSync(join(tmpdir(), "hsmem-out-"));
  writeFileSync(join(outside, "c.jsonl"), jsonl(item({ bank: "beta" })));
  const o = await cli(clean, [join(outside, "c.jsonl")]);
  check(o.code === 1 && /outside the project root/.test(o.stderr), "a file outside the project is refused", o.stderr);
  symlinkSync(join(outside, "c.jsonl"), join(clean, "link.jsonl"));
  const l = await cli(clean, ["link.jsonl"]);
  check(l.code === 1 && /outside the project root/.test(l.stderr), "a symlink pointing out of the project is refused", l.stderr);

  const bare = mkdtempSync(join(tmpdir(), "hsmem-noconf-"));
  writeFileSync(join(bare, "c.jsonl"), jsonl(item({ bank: "beta" })));
  const n = await cli(bare, ["c.jsonl"]);
  check(n.code === 1 && /not configured/.test(n.stderr), "no .hindsight.json → exit 1, nothing sent");
  const u = await cli(clean, []);
  check(u.code === 2 && /usage/.test(u.stderr), "usage error → exit 2");
}

console.log("MCP tool stays implemented but cannot apply");
{
  const before = posts().length;
  await withServer(dir, {}, async ({ list, call }) => {
    const t = (await list()).find((x) => x.name === "memory_retain_batch");
    const props = t?.inputSchema.properties ?? {};
    check(
      Boolean(t) && Object.keys(props).join() === "file" && t.inputSchema.required.join() === "file",
      "memory_retain_batch remains implemented as a file-only planner",
      JSON.stringify(props),
    );
    check(t?.annotations?.readOnlyHint === true, "the batch MCP surface advertises read-only planning");
    let r = await call("memory_retain_batch", { file: "cands.jsonl" });
    check(
      !r.isError && /DRY RUN/.test(r.text) && /freshness.*grants no authorization/.test(r.text) && posts().length === before,
      "MCP dry run reports freshness-only digest semantics and writes nothing",
      r.text,
    );
    r = await call("memory_retain_batch", { file: "cands.jsonl", apply: true, confirm: "f".repeat(64) });
    check(
      /read-only planner/.test(r.text) && /does not authorize a write/.test(r.text) && posts().length === before,
      "legacy apply arguments cannot turn the planner into a writer",
      r.text,
    );
  });
}

fake.close();
finish("enrich");

