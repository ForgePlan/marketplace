# known-miss — attacks this gate does NOT catch

Each file here is a privileged workflow carrying a real attack that
`validate-workflow-security.js` reads without complaint. They are checked in so the gap is a
**measured number** rather than a sentence, and so the number moves on its own when the gate
improves.

`selfTest()` asserts every file in this directory produces **no** finding. That reads backwards
until you see what it buys:

- If a file here **starts** firing, the self-test fails and tells you to move it to `must-fire`.
  Coverage improved and the corpus records it.
- If a `must-fire` fixture **stops** firing, the existing traps fail. Coverage regressed.

Either direction is caught. Nobody has to remember to re-measure.

## The classes, and why regexes lose to them

| Class | Files | Why it slips |
|---|---:|---|
| Indirection in `ref` | 4 | The untrusted expression is read into `env` / a step output / a `needs` output / JavaScript, then used one hop away. `PR_HEAD_REF` needs it literally in the same step. |
| Fetch inside `run:` | 6 | Ordinary shell: a package manager, a docker git-context, an API diff, the binary behind a variable, download and extraction split by `;`. The scan window does not cross `;`, and the pipe patterns need a literal pipe. |
| Injection outside `run:` | 4 | `github-script`'s `script:` and a docker action's `args:` are live sinks that are not shell blocks; bracket notation and `fromJSON(toJSON(…))` are the same value spelled differently. |

The shared root is that **the mechanism of attack is data flow**, and a regex over text cannot see
flow. Closing the first class properly means marking expressions that read untrusted context and
propagating the mark through `env` → `outputs` → `needs` — a small analyser, and a YAML parser,
which `scripts/ci/` has no dependency on today.

## What NOT to do with this directory

Do not add pattern rules one file at a time until the traps go quiet. That was tried: the second
adversarial pass is what produced this list. Chasing shapes yields a longer regex and the same
blind spot, because the next hop is free to the attacker and expensive to us.

Two honest options remain, and they are both stated in marketplace#253: build the flow analysis, or
accept that this gate catches carelessness rather than intent. Until one is chosen, this directory
is what keeps the second option from quietly becoming the first.
