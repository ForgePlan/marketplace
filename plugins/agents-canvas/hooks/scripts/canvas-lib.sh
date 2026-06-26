#!/usr/bin/env bash
# ============================================================================
# canvas-lib.sh — shared bash utilities for the CANVAS tokens-gate
# ============================================================================
# Sourced by the PreToolUse gate (canvas-gate.sh); also runnable as a thin
# state CLI (the canvas-coordinator + /canvas-init write phase/tokens
# transitions through it — the hook only READS the state file).
#
# CANVAS hook-gate=YES (LOCKED DECISION 5, spec section 9): the fail-closed
# PreToolUse hook hard-blocks Write/Edit/MultiEdit to packages/design-system/**
# (and the framework wrapper packages) until the **tokens RFC is active**. That
# is the C5 enforcement lever of the AD/AID-PDLC sub-cycle contract (ADR-010):
# the Coder/Framework-Porter must not write design-system source until the
# Style-Dictionary token contract has passed Gate V and been activated.
#
# Why a gate at all (vs hook-gate=No harness ordering): the gate binds HUMAN
# edits too — the master's dispatch discipline only binds dispatched agents. A
# stray hand-write to packages/design-system/ before the token contract exists
# forks the single-source-of-truth the whole pipeline depends on.
#
# Ported from the BMAD instance's bmad-lib.sh (RFC-013 FR-5): branch slugging,
# repo-root resolution, the pure-bash path canonicalizer, atomic locked state
# updates, and the sourced-defines-only / executed-runs-CLI split. The
# stack.json file-classifier of the BMAD/TDD instances is replaced by a single
# guarded-glob check (path_is_guarded) — CANVAS guards a fixed set of package
# paths, not an inferred test/source split.
#
# Conventions:
#   * State + config live under $FORGEPLAN_CANVAS_DIR (default ".forgeplan/canvas").
#   * canonicalize_path is the only sanctioned path normalizer — its invariants
#     are load-bearing for the gate (path-traversal bypass class). Do not
#     replace it with regex normalization.
#   * Sourcing the file defines functions only and runs nothing. Executing it
#     directly ("bash canvas-lib.sh <subcommand> ...") runs the state CLI.

# Root directory for all CANVAS state and config (relative to repo root).
: "${FORGEPLAN_CANVAS_DIR:=.forgeplan/canvas}"

# Default guarded path globs — the design-system package plus the framework
# wrapper packages. Pipe-delimited; a trailing /** or /* is the subtree marker.
# Overridable per-branch in the state file (set via /canvas-init).
: "${CANVAS_DEFAULT_GUARDED_GLOBS:=packages/design-system/**|packages/design-system-*/**|packages/canvas-*/**|packages/*-canvas/**}"

# ---------------------------------------------------------------------------
# branch_slug — filesystem-safe slug from a branch name
# ---------------------------------------------------------------------------
# Non-alphanumerics -> hyphens, truncated to 80 chars, plus a 6-char hash so
# branches differing only in punctuation never collide on the same state file.

branch_slug() {
  local branch
  if [ -n "${1:-}" ]; then
    branch="$1"
  else
    branch="$(git branch --show-current 2>/dev/null)" || { echo "error: not in a git repository" >&2; return 1; }
    [ -n "$branch" ] || { echo "error: detached HEAD" >&2; return 1; }
  fi
  local slug raw_hash
  slug="${branch//[^a-zA-Z0-9]/-}"
  slug="${slug:0:80}"
  raw_hash="$(printf '%s' "$branch" | (md5sum 2>/dev/null || md5))"
  echo "${slug}-${raw_hash:0:6}"
}

# ---------------------------------------------------------------------------
# repo_root / canvas_dir — cached absolute paths
# ---------------------------------------------------------------------------

repo_root() {
  if [ -z "${_FORGEPLAN_CANVAS_REPO_ROOT:-}" ]; then
    _FORGEPLAN_CANVAS_REPO_ROOT="$(git --no-optional-locks rev-parse --show-toplevel 2>/dev/null || pwd)"
  fi
  echo "$_FORGEPLAN_CANVAS_REPO_ROOT"
}

canvas_dir() {
  if [ -z "${_FORGEPLAN_CANVAS_STATE_DIR:-}" ]; then
    _FORGEPLAN_CANVAS_STATE_DIR="$(repo_root)/$FORGEPLAN_CANVAS_DIR"
  fi
  echo "$_FORGEPLAN_CANVAS_STATE_DIR"
}

# state_file_for — absolute path to the per-branch state file for a slug.
state_file_for() {
  local slug="${1:-$(branch_slug 2>/dev/null)}" || return 1
  [ -n "$slug" ] || return 1
  echo "$(canvas_dir)/state-${slug}.json"
}

# ---------------------------------------------------------------------------
# canonicalize_path — pure-bash path normalizer (segment-stack walker)
# ---------------------------------------------------------------------------
# Total over arbitrary byte sequences. No external commands, no fork/exec.
# Operates on bytes (LC_ALL=C). Glob characters and shell sigils pass through
# as literal bytes — never expanded.
#
# LOAD-BEARING CONTRACT (the gate compares canonical forms; a regression here
# opens a path-traversal bypass class — do not weaken):
#   * Empty / whitespace-only input -> "."
#   * Non-empty input -> non-empty single-line output (empty output on
#     non-empty input is a silent fail-open and is forbidden)
#   * No "//", no "." segments, no ".." on absolute output, no trailing "/"
#     (except when the whole output is exactly "/")
#   * Idempotent: canonicalize_path(canonicalize_path(x)) == canonicalize_path(x)
#   * Only ASCII 0x2E (".") is a segment dot — Unicode lookalikes pass through
#   * Newlines in input -> "_" in output (single-line contract)
#   * No regex normalization, ever — the segment-stack design is the only
#     sanctioned normalizer.

canonicalize_path() {
  local LC_ALL=C
  local input="$1"

  if [ -z "$input" ]; then
    printf '%s\n' "."
    return 0
  fi

  # Whitespace-only input -> "." (preserves the non-empty-output contract)
  case "$input" in
    *[!$' \t\n']*) ;;
    *) printf '%s\n' "."; return 0 ;;
  esac

  local absolute=0
  if [ "${input:0:1}" = "/" ]; then
    absolute=1
  fi

  # Save and disable globbing for the field-split. Glob expansion against the
  # cwd would let a hostile path like `*` smuggle filenames into the matcher.
  local f_was_set=1
  case $- in *f*) ;; *) f_was_set=0 ;; esac
  set -f

  local IFS_save="${IFS-}"
  local IFS='/'
  # shellcheck disable=SC2206
  local -a segs=( $input )
  IFS="$IFS_save"

  [ "$f_was_set" = 1 ] || set +f

  # Process segments through a stack. Track the top index instead of repacking
  # the array on every pop — avoids the O(n^2) cost on paths with many "..".
  local -a stack=()
  local top_idx=-1 seg
  for seg in "${segs[@]}"; do
    case "$seg" in
      ""|".")
        continue
        ;;
      "..")
        if [ "$top_idx" -ge 0 ]; then
          if [ "${stack[$top_idx]}" = ".." ]; then
            top_idx=$((top_idx + 1))
            stack[$top_idx]=".."
          else
            top_idx=$((top_idx - 1))
          fi
        elif [ "$absolute" = 0 ]; then
          top_idx=0
          stack[0]=".."
        fi
        ;;
      *)
        top_idx=$((top_idx + 1))
        stack[$top_idx]="$seg"
        ;;
    esac
  done

  if [ "$top_idx" -lt 0 ]; then
    [ "$absolute" = 1 ] && printf '%s\n' "/" || printf '%s\n' "."
    return 0
  fi

  # Pure-bash join via IFS expansion of "${arr[*]}".
  local out IFS_save2="${IFS-}"
  IFS='/'
  out="${stack[*]:0:top_idx+1}"
  IFS="$IFS_save2"
  [ "$absolute" = 1 ] && out="/$out"

  # Single-line contract: newlines in input bytes become "_".
  out="${out//$'\n'/_}"

  printf '%s\n' "$out"
}

# ---------------------------------------------------------------------------
# repo_relative — strip the repo-root prefix from a canonical path
# ---------------------------------------------------------------------------
# The guarded globs are repo-relative; the tool passes absolute file_paths.
# If the path is outside the repo (or already relative) it is returned as-is.

repo_relative() {
  local canon="$1" root
  root="$(repo_root)"
  case "$canon" in
    "$root"/*) printf '%s\n' "${canon#"$root"/}" ;;
    "$root")   printf '%s\n' "." ;;
    *)         printf '%s\n' "$canon" ;;
  esac
}

# ---------------------------------------------------------------------------
# path_is_guarded — is a repo-relative path under a guarded package subtree?
# ---------------------------------------------------------------------------
# Reads the pipe-delimited glob list from $GUARDED_GLOBS (caller sets it from
# state, falling back to $CANVAS_DEFAULT_GUARDED_GLOBS). A trailing /** or /*
# is stripped to the directory prefix; the prefix and its whole subtree match.
# In bash `case`, an unquoted `*` matches across "/", so a prefix match covers
# any depth — which is the fail-SAFE direction (over-guard, never under-guard).
# Prints "yes"/"no" and returns 0 when guarded.

# shellcheck disable=SC2254  # Unquoted $prefix in case is intentional — glob matching
path_is_guarded() {
  local rel="$1"
  local globs="${GUARDED_GLOBS:-$CANVAS_DEFAULT_GUARDED_GLOBS}"
  [ -n "$globs" ] || globs="$CANVAS_DEFAULT_GUARDED_GLOBS"

  # Normalize a leading "./"
  rel="${rel#./}"

  local oldifs="$IFS"; IFS='|'
  local g prefix
  for g in $globs; do
    IFS="$oldifs"
    [ -n "$g" ] || continue
    prefix="${g%/\*\*}"   # strip trailing /**
    prefix="${prefix%/\*}" # strip trailing /*
    prefix="${prefix%/}"   # strip a stray trailing /
    # Match the prefix as a repo-relative path (the normal case) AND as an
    # anchored path segment anywhere in an absolute path. The second form is
    # the fail-SAFE fallback for when repo_relative could not strip the root —
    # e.g. a symlinked repo root (/var -> /private/var on macOS) leaves REL
    # absolute. Over-guarding (deny) is always the safe direction.
    case "$rel" in
      $prefix|$prefix/*|*/$prefix|*/$prefix/*) echo "yes"; return 0 ;;
    esac
  done
  IFS="$oldifs"
  echo "no"
  return 1
}

# ---------------------------------------------------------------------------
# State-file locking — atomic mkdir + PID-based stale detection
# ---------------------------------------------------------------------------
# mkdir-based for portability (no flock dependency — works on macOS bash 3.2).

_acquire_state_lock() {
  local state_file="$1"
  [ -n "$state_file" ] || { echo "ERROR: _acquire_state_lock called with empty path" >&2; return 1; }
  local lock_dir="${state_file}.lock"
  local timeout="${FORGEPLAN_CANVAS_LOCK_TIMEOUT:-5}"
  [[ "$timeout" =~ ^[0-9]+$ ]] || timeout=5
  local deadline=$((SECONDS + timeout))

  while true; do
    if mkdir "$lock_dir" 2>/dev/null; then
      echo "$$" > "$lock_dir/pid" || { rm -rf "$lock_dir"; return 1; }
      return 0
    fi
    if [ -f "$lock_dir/pid" ]; then
      local holder_pid
      holder_pid="$(cat "$lock_dir/pid" 2>/dev/null)" || holder_pid=""
      if [ -n "$holder_pid" ] && ! kill -0 "$holder_pid" 2>/dev/null; then
        local break_dir="${lock_dir}.breaking.$$"
        if mv "$lock_dir" "$break_dir" 2>/dev/null; then rm -rf "$break_dir"; fi
        continue
      fi
    elif [ -d "$lock_dir" ]; then
      local break_dir="${lock_dir}.breaking.$$"
      if mv "$lock_dir" "$break_dir" 2>/dev/null; then rm -rf "$break_dir"; fi
      continue
    fi
    if [ "$SECONDS" -ge "$deadline" ]; then
      echo "ERROR: Lock acquisition timeout after ${timeout}s for $state_file" >&2
      return 1
    fi
    sleep 0.1
  done
}

_release_state_lock() {
  local state_file="$1"
  local lock_dir="${state_file}.lock"
  if [ -f "$lock_dir/pid" ] && [ "$(cat "$lock_dir/pid" 2>/dev/null)" = "$$" ]; then
    rm -rf "$lock_dir"
  fi
}

# locked_update_state — atomic read-modify-write of a state file under lock.
# Usage: locked_update_state STATE_FILE JQ_FILTER [--arg key val ...]
locked_update_state() {
  local state_file="$1"
  local jq_filter="$2"
  shift 2
  local rc=0

  _acquire_state_lock "$state_file" || return 1
  # shellcheck disable=SC2064
  trap "$(printf '_release_state_lock %q; rm -f %q' "$state_file" "${state_file}.$$.tmp")" EXIT

  local tmp_file="${state_file}.$$.tmp"
  if jq "$@" "$jq_filter" "$state_file" > "$tmp_file" 2>/dev/null; then
    mv "$tmp_file" "$state_file" || { rm -f "$tmp_file"; rc=1; }
  else
    rm -f "$tmp_file"
    rc=1
  fi

  _release_state_lock "$state_file"
  trap - EXIT
  return "$rc"
}

# ---------------------------------------------------------------------------
# State CLI — the canvas-coordinator + /canvas-init write transitions here.
# The PreToolUse hook only READS the state file; this split is load-bearing
# (hooks cannot call MCP and must read state fast and locally).
# ---------------------------------------------------------------------------
# State shape (spec section 9, LOCKED DECISION 5):
#   { "phase": "design|audit|port|tokens-pending|assemble|spread|done",
#     "tokens_rfc": "RFC-NNN",          # the Style-Dictionary token contract RFC
#     "tokens_active": false,            # flips true ONLY when that RFC is active
#     "guarded_globs": "packages/design-system/**|...",
#     "override": false,                 # logged human escape hatch
#     "started_at": "ISO", "phase_entered_at": "ISO" }
#
# Gate semantics:
#   tokens_active=false -> DENY writes to any guarded glob (allow elsewhere)
#   tokens_active=true  -> ALLOW (C5 lever unlocked: Coder/Framework-Porter work)
#   phase=done OR override=true OR no-state-file -> ALLOW

_canvas_now() { date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || echo ""; }

# canvas_init_state SLUG [GUARDED_GLOBS] — create/overwrite per-branch state at
# phase=design, tokens_active=false.
canvas_init_state() {
  local slug="$1" globs="${2:-$CANVAS_DEFAULT_GUARDED_GLOBS}"
  local dir sf now
  dir="$(canvas_dir)" || return 1
  mkdir -p "$dir" || return 1
  sf="$dir/state-${slug}.json"
  now="$(_canvas_now)"
  jq -n --arg globs "$globs" --arg now "$now" \
    '{phase:"design", tokens_rfc:"", tokens_active:false, guarded_globs:$globs, override:false, started_at:$now, phase_entered_at:$now}' \
    > "$sf" || return 1
  echo "$sf"
}

# canvas_set_phase SLUG PHASE — move to a new phase + stamp phase_entered_at.
canvas_set_phase() {
  local slug="$1" phase="$2" now sf
  sf="$(state_file_for "$slug")" || return 1
  [ -f "$sf" ] || { echo "error: no state file for $slug" >&2; return 1; }
  case "$phase" in design|audit|port|tokens-pending|assemble|spread|done) ;; *) echo "error: bad phase '$phase'" >&2; return 1 ;; esac
  now="$(_canvas_now)"
  locked_update_state "$sf" '.phase=$p | .phase_entered_at=$n' --arg p "$phase" --arg n "$now"
}

# canvas_set_tokens SLUG RFC_ID true|false — record the tokens RFC + its active
# flag. Flipping to true is the C5 unlock (only after Gate V PASS + activation).
canvas_set_tokens() {
  local slug="$1" rfc="$2" active="$3" sf
  sf="$(state_file_for "$slug")" || return 1
  [ -f "$sf" ] || { echo "error: no state file for $slug" >&2; return 1; }
  case "$active" in true|false) ;; *) echo "error: active must be true|false" >&2; return 1 ;; esac
  locked_update_state "$sf" '.tokens_rfc=$r | .tokens_active=($a=="true")' --arg r "$rfc" --arg a "$active"
}

# canvas_set_override SLUG true|false — record a human gate-override for audit.
canvas_set_override() {
  local slug="$1" val="$2" sf
  sf="$(state_file_for "$slug")" || return 1
  [ -f "$sf" ] || { echo "error: no state file for $slug" >&2; return 1; }
  case "$val" in true|false) ;; *) echo "error: override must be true|false" >&2; return 1 ;; esac
  locked_update_state "$sf" ".override=$val"
}

# canvas_get SLUG [FIELD] — print the whole state file, or one field.
canvas_get() {
  local slug="$1" field="${2:-}" sf
  sf="$(state_file_for "$slug")" || return 1
  [ -f "$sf" ] || { echo "error: no state file for $slug" >&2; return 1; }
  if [ -n "$field" ]; then
    jq -r ".${field} // \"\"" "$sf"
  else
    cat "$sf"
  fi
}

# Thin CLI dispatch — only runs when the file is EXECUTED, never when sourced
# (so the gate + tests source it for the functions without side effects).
if [ "${BASH_SOURCE[0]:-}" = "${0}" ]; then
  set -euo pipefail
  cmd="${1:-}"; shift || true
  case "$cmd" in
    init)          canvas_init_state "$@" ;;
    set-phase)     canvas_set_phase "$@" ;;
    set-tokens)    canvas_set_tokens "$@" ;;
    set-override)  canvas_set_override "$@" ;;
    get)           canvas_get "$@" ;;
    slug)          branch_slug "$@" ;;
    *)
      echo "usage: canvas-lib.sh {init SLUG [GUARDED_GLOBS] | set-phase SLUG PHASE | set-tokens SLUG RFC true|false | set-override SLUG true|false | get SLUG [FIELD] | slug [BRANCH]}" >&2
      exit 1
      ;;
  esac
fi
