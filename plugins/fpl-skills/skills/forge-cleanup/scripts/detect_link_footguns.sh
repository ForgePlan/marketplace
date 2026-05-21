#!/usr/bin/env bash
# detect_link_footguns.sh — Walk forgeplan graph and detect link direction footguns.
# Part of /forge-cleanup Step 3 classification (PRD-041).
#
# Patterns detected:
#   supersedes_inversion — source.created_at < target.created_at
#                          (older artifact is the source; newer should supersede older)
#   informs_inversion    — source.kind in {prd, rfc} AND target.kind = evidence
#                          (evidence informs PRDs/RFCs, not vice versa)
#
# Edge case skip: PRD→PRD informs (refines-style chains are legitimate).
#
# Output: NDJSON to stdout, one JSON object per finding.
# Exit: 0 always (informational tool, not a gate).
#
# Requirements: forgeplan CLI v0.31.0+, jq

set -euo pipefail

FORGEPLAN=${FORGEPLAN_CMD:-forgeplan}
STDERR_FILTER="grep -v '_encode\|_decode'" # suppress zsh completion noise

# --- helpers -----------------------------------------------------------------

# kind_from_id: derive kind string from artifact ID prefix
# EVID-* → evidence, PRD-* → prd, RFC-* → rfc, ADR-* → adr, NOTE-* → note, etc.
kind_from_id() {
  local id="$1"
  local prefix
  prefix=$(echo "$id" | sed 's/-[0-9].*//' | tr '[:upper:]' '[:lower:]')
  case "$prefix" in
    evid)  echo "evidence" ;;
    prd)   echo "prd" ;;
    rfc)   echo "rfc" ;;
    adr)   echo "adr" ;;
    note)  echo "note" ;;
    spec)  echo "spec" ;;
    epic)  echo "epic" ;;
    prob)  echo "problem" ;;
    sol)   echo "solution" ;;
    *)     echo "$prefix" ;;
  esac
}

# artifact_created_at: fetch created_at for a single artifact via forgeplan get --json
artifact_created_at() {
  local id="$1"
  $FORGEPLAN get "$id" --json 2>&1 \
    | grep -v '_encode\|_decode' \
    | jq -r '.created_at // empty'
}

# emit_finding: print one NDJSON finding object
emit_finding() {
  local pattern="$1" src_id="$2" tgt_id="$3" src_kind="$4" tgt_kind="$5"
  local src_created="${6:-}" tgt_created="${7:-}"
  local fix

  # v0.32.1 update: MCP forgeplan_unlink now available; prefer MCP, CLI remains as fallback
  if [ "$pattern" = "supersedes_inversion" ]; then
    fix="MCP: mcp__forgeplan__forgeplan_unlink(source=\"$src_id\", target=\"$tgt_id\", relation=\"supersedes\") + forgeplan_link(source=\"$tgt_id\", target=\"$src_id\", relation=\"supersedes\") | CLI fallback: forgeplan unlink $src_id $tgt_id --relation supersedes && forgeplan link $tgt_id $src_id --relation supersedes"
  else
    fix="MCP: mcp__forgeplan__forgeplan_unlink(source=\"$src_id\", target=\"$tgt_id\", relation=\"informs\") + forgeplan_link(source=\"$tgt_id\", target=\"$src_id\", relation=\"informs\") | CLI fallback: forgeplan unlink $src_id $tgt_id --relation informs && forgeplan link $tgt_id $src_id --relation informs"
  fi

  jq -n --compact-output \
    --arg anomaly   "link_direction_footgun" \
    --arg pattern   "$pattern" \
    --arg source_id "$src_id" \
    --arg target_id "$tgt_id" \
    --arg source_kind "$src_kind" \
    --arg target_kind "$tgt_kind" \
    --arg source_created "$src_created" \
    --arg target_created "$tgt_created" \
    --arg suggested_fix "$fix" \
    '{anomaly: $anomaly, pattern: $pattern, source_id: $source_id,
      target_id: $target_id, source_kind: $source_kind, target_kind: $target_kind,
      source_created: $source_created, target_created: $target_created,
      suggested_fix: $suggested_fix}'
}

# --- main --------------------------------------------------------------------

# Fetch full link graph in one call
GRAPH=$($FORGEPLAN graph --json 2>&1 | grep -v '_encode\|_decode')

# Extract supersedes edges and check date inversion
SUPERSEDES_EDGES=$(echo "$GRAPH" | jq -r '.edges[] | select(.relation == "supersedes") | "\(.from) \(.to)"')
if [ -n "$SUPERSEDES_EDGES" ]; then
  while IFS=' ' read -r src tgt; do
    src_created=$(artifact_created_at "$src")
    tgt_created=$(artifact_created_at "$tgt")
    # Compare ISO-8601 strings lexicographically (YYYY-MM-DDTHH:MM:SS — safe for date sort)
    if [ -n "$src_created" ] && [ -n "$tgt_created" ] && [ "$src_created" \< "$tgt_created" ]; then
      src_kind=$(kind_from_id "$src")
      tgt_kind=$(kind_from_id "$tgt")
      emit_finding "supersedes_inversion" "$src" "$tgt" "$src_kind" "$tgt_kind" "$src_created" "$tgt_created"
    fi
  done <<< "$SUPERSEDES_EDGES"
fi

# Extract informs edges and check kind inversion (PRD/RFC → evidence)
INFORMS_EDGES=$(echo "$GRAPH" | jq -r '.edges[] | select(.relation == "informs") | "\(.from) \(.to)"')
if [ -n "$INFORMS_EDGES" ]; then
  while IFS=' ' read -r src tgt; do
    src_kind=$(kind_from_id "$src")
    tgt_kind=$(kind_from_id "$tgt")
    # Skip PRD→PRD (refines-style chains are legitimate per FR-004)
    if [ "$src_kind" = "prd" ] && [ "$tgt_kind" = "prd" ]; then
      continue
    fi
    # Flag: source is prd or rfc AND target is evidence
    if { [ "$src_kind" = "prd" ] || [ "$src_kind" = "rfc" ]; } && [ "$tgt_kind" = "evidence" ]; then
      emit_finding "informs_inversion" "$src" "$tgt" "$src_kind" "$tgt_kind" "" ""
    fi
  done <<< "$INFORMS_EDGES"
fi
