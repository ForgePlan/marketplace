import { check, finish, project, fakeHindsight, withServer, runHook } from "./lib/harness.mjs";
import { BankGate } from "../dist/testable.mjs";

// "ghost" is allowed by the project but absent on the server; "other" exists but is not allowed.
const fake = await fakeHindsight(["alpha", "beta", "other"]);
const dir = project({ url: fake.url, banks: ["alpha", "beta", "ghost"], defaultBank: "alpha", tokenFile: "t" }, { t: "tok" });
const bankScoped = () => fake.requests.filter((r) => r.path.startsWith("/v1/default/banks/"));

await withServer(dir, {}, async ({ list, call }) => {
  console.log("schema");
  const tools = await list();
  // memory_retain_batch routes per item (each line names or is routed to its bank), so it has none.
  const BANKLESS = ["memory_get_current_bank", "memory_retain_batch"];
  const missing = tools.filter((t) => !BANKLESS.includes(t.name) && !t.inputSchema.properties?.bank);
  check(missing.length === 0, "every bank-scoped tool has an optional `bank`", missing.map((t) => t.name).join());
  check(tools.every((t) => !(t.inputSchema.required ?? []).includes("bank")), "`bank` is never required");
  const cur = tools.find((t) => t.name === "memory_get_current_bank");
  check(!cur.inputSchema.properties?.bank, "memory_get_current_bank takes no bank");

  console.log("routing");
  let r = await call("memory_recall", { query: "what did we decide" });
  check(!r.isError && bankScoped().at(-1)?.path === "/v1/default/banks/alpha/memories/recall", "default bank when `bank` omitted", r.text);
  check(bankScoped().at(-1)?.auth === "Bearer tok", "token from tokenFile is sent");
  r = await call("memory_recall", { query: "what did we decide", bank: "beta" });
  check(!r.isError && bankScoped().at(-1)?.path === "/v1/default/banks/beta/memories/recall", "explicit allowed bank", r.text);

  console.log("refusals");
  let before = bankScoped().length;
  r = await call("memory_recall", { query: "x y z", bank: "other" });
  check(r.isError && /allowlist/.test(r.text), "bank outside the allowlist is refused", r.text);
  check(bankScoped().length === before, "…before any bank-scoped request");

  before = bankScoped().length;
  r = await call("memory_retain", { content: "never written", bank: "ghost" });
  check(r.isError && /does not exist/.test(r.text), "retain into a missing bank is refused", r.text);
  check(bankScoped().length === before, "…without touching (and so creating) the bank");
  check(!fake.requests.some((q) => q.method === "POST" && q.path.includes("ghost")), "no write was sent for the missing bank");

  r = await call("mental_model_list", { bank: "beta" });
  check(!r.isError && bankScoped().at(-1)?.path === "/v1/default/banks/beta/mental-models", "mental_model_list honours bank");
  r = await call("memory_set_mission", { mission: "m", bank: 5 });
  check(r.isError && /must be a string/.test(r.text), "a non-string bank is refused");

  console.log("current bank");
  r = await call("memory_get_current_bank");
  const info = JSON.parse(r.text);
  check(info.default_bank === "alpha" && info.allowed_banks.join() === "alpha,beta,ghost", "reports default + allowlist", r.text);
  check(!r.text.includes("tok\""), "never reports the token");
});

console.log("recall hook reads defaultBank only");
{
  const hdir = project({ url: fake.url, banks: ["beta", "alpha"], defaultBank: "beta", tokenFile: "t", autoRecall: true }, { t: "tok" });
  const before = fake.requests.length;
  const res = await runHook("recall.mjs", { cwd: hdir, prompt: "what did we decide about caching?" });
  const hits = fake.requests.slice(before).filter((q) => q.path.endsWith("/memories/recall"));
  check(res.code === 0 && hits.length === 1 && hits[0].path === "/v1/default/banks/beta/memories/recall", "one recall, on the default bank", JSON.stringify(hits));
  check(fake.requests.slice(before).some((q) => q.path === "/v1/default/banks" && q.query.includes("q=beta")), "after checking the bank exists");
}

console.log("recall hook goes through the bank existence gate");
{
  // "ghost" is allowed but missing: a bank-scoped read could create it, so the hook must not touch it.
  const gdir = project({ url: fake.url, banks: ["ghost"], defaultBank: "ghost", tokenFile: "t", autoRecall: true }, { t: "tok" });
  const before = fake.requests.length;
  const res = await runHook("recall.mjs", { cwd: gdir, prompt: "what did we decide about caching?" });
  const after = fake.requests.slice(before);
  check(res.code === 0 && res.stdout === "", "no context injected", res.stdout);
  check(!after.some((q) => q.path.startsWith("/v1/default/banks/ghost")), "never sends a bank-scoped request to a missing bank", JSON.stringify(after));
  check(/Recall skipped: Refusing: bank "ghost" does not exist/.test(res.stderr), "says why on stderr", res.stderr);
}

console.log("bank existence cache expires");
{
  const live = ["alpha"];
  const f = await fakeHindsight(live);
  let now = 0;
  const gate = new BankGate({ url: f.url, banks: ["alpha"], defaultBank: "alpha", getApiKey: () => "k", configPath: "/x/.hindsight.json" }, { ttlMs: 1000, now: () => now });
  const lists = () => f.requests.filter((q) => q.path === "/v1/default/banks").length;
  check(typeof (await gate.resolve("alpha")) !== "string", "an existing bank resolves");
  now = 999;
  await gate.resolve("alpha");
  check(lists() === 1, "confirmed within the TTL: not re-asked");
  live.splice(0); // an operator deletes the bank
  now = 1000;
  const r = await gate.resolve("alpha");
  check(lists() === 2 && typeof r === "string" && /does not exist/.test(r), "after the TTL it is re-asked, and a deleted bank is refused", String(r));
  f.close();
}

fake.close();
finish("multibank");
