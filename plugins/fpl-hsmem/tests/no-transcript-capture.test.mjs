import { join } from "node:path";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { check, finish, project, fakeHindsight, runHook } from "./lib/harness.mjs";

const fake = await fakeHindsight(["alpha"]);
const transcript = [
  { type: "user", message: { role: "user", content: "remember the cache TTL is 30s" } },
  { type: "assistant", message: { role: "assistant", content: [{ type: "text", text: "noted" }] } },
].map((l) => JSON.stringify(l)).join("\n") + "\n";
const writes = () => fake.requests.filter((r) => r.method === "POST" && r.path.endsWith("/memories"));

async function run(cfg, label) {
  const dir = project({ url: fake.url, banks: ["alpha", "ghost"], defaultBank: "alpha", tokenFile: "t", retainEveryNTurns: 1, ...cfg }, { t: "tok", "tr.jsonl": transcript });
  const input = { cwd: dir, session_id: "sess-1", transcript_path: join(dir, "tr.jsonl"), reason: "exit" };
  // A fresh home per run: hook state (turn counters) lives under $HOME and must not leak between runs.
  const home = mkdtempSync(join(tmpdir(), "hsmem-home-"));
  const before = writes().length;
  for (const hook of ["retain.mjs", "session-end.mjs"]) await runHook(hook, input, { HOME: home });
  return writes().length - before;
}

console.log("default: hooks registered but inert");
check((await run({}, "default")) === 0, "no autoRetain key → nothing retained");
check((await run({ autoRetain: false }, "false")) === 0, "autoRetain:false → nothing retained");
console.log("explicit opt-in");
check((await run({ autoRetain: true }, "true")) === 2, "autoRetain:true → Stop and SessionEnd each retain");
check((await run({ autoRetain: true, defaultBank: "ghost" }, "ghost")) === 0, "autoRetain:true into a missing bank → refused, not created");

fake.close();
finish("no-transcript-capture");
