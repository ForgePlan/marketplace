#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

// Reports contain a deliberate allowlist, never raw census hits or scan errors.
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const known = (value) => typeof value === 'string' && value.trim() === value && value.length > 0 && !/^(unknown|unresolved|tbd|n\/a|none|null|not known|not applicable)$/i.test(value);
const list = (value, empty = false) => Array.isArray(value) && (empty || value.length > 0) && value.every(known) && new Set(value).size === value.length;
const ordered = (values) => [...values].sort();
const equalLists = (a, b) => JSON.stringify(ordered(a)) === JSON.stringify(ordered(b));
const digest = (value) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);

function reconcile(census, manual, censusHash, manualHash) {
  const issues = [];
  const issue = (code, path = null, field = null) => issues.push({ code, path, field });
  const records = isObject(census) && Array.isArray(census.records) ? census.records : [];
  const entries = isObject(manual) && Array.isArray(manual.classifications) ? manual.classifications : [];
  if (!isObject(census) || census.census !== 'evidencepack-independent-content-v1' || !Array.isArray(census.records) || !Array.isArray(census.errors) || census.normative_inventory_complete !== false || !Number.isInteger(census.candidate_count) || census.candidate_count !== records.length || !known(census.root) || !known(census.checked_at)) issue('invalid_census');
  if (!isObject(manual) || manual.schema !== 'evidencepack-manual-inventory-v1' || !Array.isArray(manual.classifications)) issue('invalid_classifications');
  if (Array.isArray(census?.errors) && census.errors.length) issue('census_scan_errors');
  if (!records.length) issue('no_candidates');
  const candidates = new Map();
  for (const record of records) {
    if (!isObject(record) || !known(record.canonical_path)) { issue('invalid_candidate'); continue; }
    const path = record.canonical_path;
    if (candidates.has(path)) { issue('duplicate_candidate', path); continue; }
    candidates.set(path, record);
    if (!digest(record.sha256) || !list(record.alias_paths, true) || record.alias_paths.includes(path) || record.classification_state !== 'requires_manual_reconciliation') issue('invalid_candidate', path);
  }
  const owners = new Map();
  for (const [path, record] of candidates) {
    for (const visible of [path, ...(Array.isArray(record.alias_paths) ? record.alias_paths : [])]) {
      if (!known(visible)) continue;
      const owner = owners.get(visible);
      if (owner !== undefined && owner !== path) issue('path_collision', visible);
      else owners.set(visible, path);
    }
  }
  const classifications = new Map();
  for (const entry of entries) {
    if (!isObject(entry) || !known(entry.canonical_path)) { issue('invalid_classification'); continue; }
    const path = entry.canonical_path;
    if (classifications.has(path)) { issue('duplicate_classification', path); continue; }
    classifications.set(path, entry);
    if (!candidates.has(path)) issue('unknown_path', path);
  }
  const reconciled = [];
  let producers = 0;
  let consumers = 0;
  for (const path of ordered(candidates.keys())) {
    const candidate = candidates.get(path);
    const entry = classifications.get(path);
    if (!entry) { issue('missing_classification', path); continue; }
    const before = issues.length;
    if (!digest(entry.sha256)) issue('invalid_field', path, 'sha256');
    else if (entry.sha256 !== candidate.sha256) issue('stale_hash', path);
    if (!list(entry.alias_paths, true) || !list(candidate.alias_paths, true) || !equalLists(entry.alias_paths, candidate.alias_paths)) issue('alias_mismatch', path, 'alias_paths');
    if (!['producer', 'consumer', 'both', 'false_positive'].includes(entry.role)) issue('invalid_field', path, 'role');
    if (!known(entry.rationale)) issue('invalid_field', path, 'rationale');
    if (entry.role !== 'false_positive') {
      for (const field of ['artifact_profile', 'primary_responsibility', 'capability']) {
        if (!known(entry[field])) issue('invalid_field', path, field);
      }
      for (const [name, version, reason] of [
        ['plugin', 'plugin_version', 'plugin_absence_reason'],
        ['protocol', 'protocol_version', 'protocol_absence_reason'],
      ]) {
        const present = known(entry[name]) && known(entry[version]) && entry[reason] === undefined;
        const absent = entry[name] === null && entry[version] === null && known(entry[reason]);
        if (!present && !absent) issue('invalid_field', path, name);
      }
      if (!list(entry.operations)) issue('invalid_field', path, 'operations');
    }
    if (issues.length !== before) continue;
    if (entry.role === 'producer' || entry.role === 'both') producers++;
    if (entry.role === 'consumer' || entry.role === 'both') consumers++;
    const result = { canonical_path: path, sha256: entry.sha256, alias_paths: ordered(entry.alias_paths), role: entry.role, rationale: entry.rationale };
    if (entry.role !== 'false_positive') {
      for (const field of ['artifact_profile', 'primary_responsibility', 'capability', 'plugin', 'plugin_version', 'protocol', 'protocol_version', 'plugin_absence_reason', 'protocol_absence_reason']) {
        if (entry[field] !== undefined) result[field] = entry[field];
      }
      result.operations = ordered(entry.operations);
    }
    reconciled.push(result);
  }
  if (!producers) issue('missing_producer');
  if (!consumers) issue('missing_consumer');
  issues.sort((a, b) => {
    const left = JSON.stringify([a.code, a.path, a.field]);
    const right = JSON.stringify([b.code, b.path, b.field]);
    return left < right ? -1 : left > right ? 1 : 0;
  });
  return {
    schema: 'evidencepack-reconciled-inventory-v1',
    provenance: { census_sha256: censusHash, classifications_sha256: manualHash, census: known(census?.census) ? census.census : null, root: known(census?.root) ? census.root : null, checked_at: known(census?.checked_at) ? census.checked_at : null },
    structurally_complete: issues.length === 0,
    normative_inventory_complete: false,
    scope: 'structural_reconciliation_only_not_authorization_or_certification',
    candidate_count: records.length, classified_count: reconciled.length, producer_count: producers, consumer_count: consumers,
    issues, records: reconciled,
  };
}

function main() {
  if (process.argv.length !== 4) {
    console.error('Usage: node inventory-reconcile.mjs <census.json> <classifications.json>');
    process.exitCode = 2;
    return;
  }
  try {
    const censusBytes = readFileSync(process.argv[2]);
    const manualBytes = readFileSync(process.argv[3]);
    const result = reconcile(JSON.parse(censusBytes), JSON.parse(manualBytes), hash(censusBytes), hash(manualBytes));
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    if (!result.structurally_complete) process.exitCode = 1;
  } catch {
    // Do not echo input, paths, or parser diagnostics which can contain sensitive data.
    console.error('Unable to read or parse input JSON.');
    process.exitCode = 2;
  }
}
main();
