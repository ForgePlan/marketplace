# Phase 0 inventory reconciliation

This standalone Node.js workflow compares a content census with a separately authored human inventory. It reads two JSON files and writes a JSON report to standard output; it does not inspect source files, make network requests, or modify either input. Its result is **structural reconciliation only**, not Phase 0 authorization, a production certification, or proof of protected host identity. A census is a candidate list, not an independently verified complete list of actors. Raw regex hits and documentation do not establish a producer or consumer.

## Run

From the repository root, using a Node.js version with ES modules and `node:test` support:

```sh
node dev/evidencepack/inventory-reconcile.mjs dev/evidencepack/census.json /path/to/inventory-classifications.json > /path/to/inventory-report.json
```

Redirection is optional and is performed by the shell, not the program. Choose an output path different from either input: shell redirection can truncate an input before the CLI runs. The program prints the report even when structural reconciliation fails. Exit status 0 means the checks described here passed; 1 means incomplete or invalid inventory; 2 means usage, input reading, or JSON parsing failed. Exit 2 produces no report. To run the isolated tests separately:

```sh
node --test dev/evidencepack/tests/inventory-reconcile.test.mjs
```

## Human classification input

Create a separate UTF-8 JSON file. Review each candidate against its actual source and record only substantiated findings. Copy its **exact** `canonical_path`, `sha256` and all `alias_paths` from the census. The hash binds the classification to the bytes recorded by the census; the CLI does not rehash the current source, and therefore cannot detect changes after the census unless a new census is supplied. Reclassify after the census hash or aliases change. Do not put source snippets, credentials, secrets, or sensitive free text into the classification: human-supplied fields are included in the report.

The format below is illustrative; values must come from the review, not the example. A `both` entry contributes to both producer and consumer coverage.

```json
{
  "schema": "evidencepack-manual-inventory-v1",
  "classifications": [{
    "canonical_path": "plugins/example/agent.md",
    "sha256": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    "alias_paths": ["plugins/example/alias/agent.md"],
    "role": "both",
    "rationale": "Reviewed the artifact read and write responsibilities.",
    "artifact_profile": "review",
    "primary_responsibility": "Review artifacts",
    "operations": ["forgeplan_get", "forgeplan_new"],
    "capability": "Read and write review artifacts",
    "plugin": "example",
    "plugin_version": "1.0.0",
    "protocol": "example protocol",
    "protocol_version": "1.0"
  }]
}
```

The roles are exactly `producer`, `consumer`, `both`, and `false_positive`. For a false positive, supply `canonical_path`, `sha256`, `alias_paths`, `role`, and a rationale explaining why it is not an actor; the other actor fields are not copied to the report. Other roles require the actor fields shown above. `operations` is a nonempty list of distinct reviewed operation or tool-surface names; `alias_paths` may be empty. Strings must be nonempty, trimmed, and not unresolved markers such as `unknown`, `TBD`, `none`, `null`, or `not applicable`.

For a reviewed standalone resource without an owning plugin, use `"plugin": null`, `"plugin_version": null`, and a nonempty `plugin_absence_reason`. For a reviewed actor without a versioned protocol, use `"protocol": null`, `"protocol_version": null`, and a nonempty `protocol_absence_reason`. Absence must be established by review, not inferred from missing data. Missing, mixed, or unresolved values remain incomplete; a present name and version must not include an absence reason.

## Checks and report

The tool accepts the `evidencepack-independent-content-v1` census shape with `records`, `errors`, `candidate_count`, `root`, `checked_at`, and `normative_inventory_complete: false`. Each candidate must have a distinct canonical path, lowercase SHA-256, distinct aliases, and `classification_state: requires_manual_reconciliation`. No visible alias or canonical path may belong to two distinct candidates. Counts must match. A scan error, no candidates, missing classification, duplicate candidate or classification, unknown classification path, stale or invalid hash, path collision, alias mismatch, invalid field, missing producer, or missing consumer makes the report incomplete. At least one validated producer and one validated consumer are required; `both` satisfies both, but false positives cannot supply either. The program does not infer roles or capabilities.

The report includes input-file SHA-256 digests, census identity/root/time, sorted reconciled entries and issue codes. It copies no raw census hits or scan-error details. Paths, census root, and manually supplied descriptions can themselves be sensitive; handle both inputs and the report accordingly. It intentionally leaves `normative_inventory_complete` false even when `structurally_complete` is true. The tool validates declared structure and matching census evidence, not the truth of human judgments, the completeness of the original scan, or current source contents.
