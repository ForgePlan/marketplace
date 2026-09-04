# What we are building — in one sentence

> **We are building a factory that can build, inspect itself, and honestly record where
> it went wrong.**

Not a slogan — a construction of three commitments, each held by a mechanism rather
than an intention:

**Can build.** An eleven-stage pipeline carries work from a raw idea to a shipped
change — with roles that each have things they may do and things they technically
cannot. Not "the agent promises not to touch it" but "the agent has no such right".

**Inspects itself.** Nobody reviews their own work. What one produced, another
verifies; what was verified is checked against disk, never against a retelling.
"Done" means "re-verified by a reproducible measurement", and an empty diff under
green tests is a failure, not a pass.

**Honestly records where it went wrong.** Every decision lives in the graph with its
alternatives, its evidence and its revisit condition. Work declined carries a reason;
work deferred carries an alarm that actually rings. A mistake found late is appended
to the record, never painted over.

The one test applied to everything new here: **what will hold this discipline when
everyone forgets about it?** If the answer is "attentiveness", the mechanism is not
built yet.

---

## The lantern day — 2026-09-04

The sentence earned its second half on the day the factory first walked its own
shop floor with a lantern: nine parallel verifiers re-measured every claim of the
gap map against disk and the live system (EVID-231 — 26 confirmed, 23 already
closed, 4 refuted, 16 new), three decisions went through the factory's own pipeline
as if they were someone else's work (ADR-023/024/025 — 17 revisions between them,
no verdict accepted from a retelling), and the decided things were built: a
product-side entry point, shipping as a recorded act, the incident loop.

The day's best catch was not a deliverable but a pattern that surfaced six times in
different disguises: **a rule that cannot see the thing it was posted to watch.**
A watcher parsing the wrong format. A check that turns green on a violated
property. Counting findings instead of listing them. Since that day the factory has
words and checks for this class — and a record that it suffered from it itself.

*See: EVID-231 (the re-measurement), EVID-235…253 (the day's review/gate chain),
[GUIDE-PIPELINE.md](GUIDE-PIPELINE.md) (the stages), CLAUDE.md "Ground-truth
verification" and "Social-discipline boundaries" (the mechanisms behind the
commitments).*
