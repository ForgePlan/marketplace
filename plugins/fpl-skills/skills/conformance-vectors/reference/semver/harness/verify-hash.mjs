// Freeze / hash-pin gate: the executable corpus must match the sha256 pinned in SPEC-001.
import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";

const here = import.meta.dirname;
const PIN = "df914f49b0114b182d569d10c768925d10b87de18da9c812f2dbc2f8f549abfc";
const buf = fs.readFileSync(path.join(here, "..", "spec", "corpus.json"));
const sha = createHash("sha256").update(buf).digest("hex");
const ok = sha === PIN;
console.log(JSON.stringify({ pinned: PIN, actual: sha, frozen_match: ok }));
process.exit(ok ? 0 : 1);
