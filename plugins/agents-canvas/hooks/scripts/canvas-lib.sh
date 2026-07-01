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

# Fail-SAFE catch-all guarded set (RFC-022 F-1/F-2/F-3) — the widest over-guard:
# the wrapper packages PLUS the native in-app component roots. Enforced when the
# resolved framework is unknown, when a derived set matches nothing on disk
# (non-conventional layout), or when the persisted state is stale/blind. Always
# over-guard (deny more) — never under-guard (a silent fail-open).
: "${CANVAS_FAILSAFE_GUARDED_GLOBS:=packages/design-system/**|packages/design-system-*/**|packages/canvas-*/**|packages/*-canvas/**|src/**|app/**|components/**}"

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
# canvas_effective_guarded_globs STATE_FILE — the guarded globs the gate should
# ENFORCE, hardened against stale persisted state (RFC-022 F-2). The gate loads
# its guarded set through this (not raw jq), so a pre-RFC-022 state (no
# state_schema_version, carrying legacy wrapper-only globs) on a now-native
# project can never silently fail OPEN: such state is detected as stale and the
# fail-SAFE catch-all is substituted (over-guard). This changes only the INPUT
# the gate enforces — the gate's path-match + tokens_active fail-closed logic is
# UNCHANGED (RFC-022 INV-1: enforcement semantics byte-identical). Never echoes
# empty; returns non-zero ONLY when STATE_FILE is unreadable (the gate's
# `|| exit 2` then fail-closes on error).
canvas_effective_guarded_globs() {
  local sf="$1"
  [ -f "$sf" ] || return 1
  local globs schema_ver
  globs="$(jq -r '.guarded_globs // ""' "$sf" 2>/dev/null)" || return 1
  schema_ver="$(jq -r '.state_schema_version // ""' "$sf" 2>/dev/null)" || return 1

  # Stale pre-RFC-022 state: no schema_version AND legacy wrapper globs. Such
  # state predates per-framework derivation; on a native layout its packages/**
  # globs guard non-existent dirs -> fail OPEN. Substitute the fail-SAFE
  # catch-all (over-guard) + warn (the durable fix is `canvas-lib.sh migrate`).
  if [ -z "$schema_ver" ] && printf '%s' "$globs" | grep -q "packages/design-system"; then
    printf 'WARN: stale pre-RFC-022 canvas state — enforcing fail-SAFE guarded globs (run: canvas-lib.sh migrate <slug> <framework>)\n' >&2
    printf '%s\n' "$CANVAS_FAILSAFE_GUARDED_GLOBS"
    return 0
  fi

  # Never under-guard on an empty persisted set either.
  if [ -z "$globs" ]; then
    printf '%s\n' "$CANVAS_FAILSAFE_GUARDED_GLOBS"
    return 0
  fi

  printf '%s\n' "$globs"
  return 0
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

# ---------------------------------------------------------------------------
# RFC-022 P1 — per-framework guarded_globs derivation (AC-1), zero-match
# self-check (AC-10), and stale-state migration (AC-9).
# ---------------------------------------------------------------------------
# STATE_SCHEMA_VERSION — increment when the state shape changes in a breaking
# way. Pre-RFC-022 state lacks this field; its absence (combined with
# wrapper-only globs) is the stale-state signal used by canvas_migrate_state.
STATE_SCHEMA_VERSION="1"

# derive_guarded_globs FRAMEWORK — return the pipe-delimited guarded-glob set
# for the named framework (case-insensitive). Web-Components/Lit row returns
# CANVAS_DEFAULT_GUARDED_GLOBS unchanged (AC-1 non-regression — preserves the
# current packages/** behaviour for that stack). The UNKNOWN/native catch-all
# over-guards (src/**|app/**|components/**) — the fail-SAFE direction: never
# emit an empty or narrower-than-before set. Callers MUST run
# canvas_verify_globs_on_disk after deriving (AC-10 zero-match gate).
derive_guarded_globs() {
  local fw_lc
  fw_lc="$(printf '%s' "${1:-}" | tr '[:upper:]' '[:lower:]')"
  case "$fw_lc" in
    react|next|next.js|nextjs)
      echo "src/components/**|app/**|components/**"
      ;;
    vue|nuxt)
      echo "src/components/**"
      ;;
    svelte|sveltekit|svelte-kit)
      echo "src/**"
      ;;
    angular)
      echo "src/app/**"
      ;;
    solid|solidjs|solid.js)
      echo "src/**"
      ;;
    web-components|webcomponents|lit)
      # Preserve the existing wrapper-layout default (AC-1 non-regression):
      # Web-Components projects still live under packages/**.
      echo "$CANVAS_DEFAULT_GUARDED_GLOBS"
      ;;
    *)
      # Unknown / native framework — fail-SAFE catch-all: over-guard rather
      # than under-guard so no design-system path escapes the gate silently.
      echo "$CANVAS_FAILSAFE_GUARDED_GLOBS"
      ;;
  esac
}

# canvas_verify_globs_on_disk ROOT GLOBS — count how many glob-prefix
# directories exist under ROOT. A zero count means the derived set guards
# nothing on disk; the caller must not persist such a set (AC-10).
canvas_verify_globs_on_disk() {
  local root="$1" globs="$2"
  local count=0 g prefix
  local oldifs="$IFS"; IFS='|'
  for g in $globs; do
    IFS="$oldifs"
    [ -n "$g" ] || continue
    prefix="${g%/\*\*}"    # strip trailing /**
    prefix="${prefix%/\*}" # strip trailing /*
    prefix="${prefix%/}"   # strip stray trailing /
    [ -n "$prefix" ] || continue
    if [ -d "${root}/${prefix}" ]; then
      count=$((count + 1))
    fi
  done
  IFS="$oldifs"
  echo "$count"
}

# canvas_init_framework_state SLUG FRAMEWORK — derive per-framework
# guarded_globs (AC-1), run the AC-10 zero-match self-check, and persist a
# new state file stamped with state_schema_version (AC-9). On zero-match:
# emit WARNING to stderr + <<NEED_USER_INPUT>> to stdout, do NOT write state,
# return 1. On success: return the state-file path via stdout.
canvas_init_framework_state() {
  local slug="$1" fw="${2:-unknown}"
  local globs root match_count dir sf now

  globs="$(derive_guarded_globs "$fw")"
  root="$(repo_root)" || return 1

  # AC-10 / F-1 / F-3: zero-match self-check — FAIL-TO-PROTECTED. The derived
  # globs match nothing on disk (non-conventional layout, or the dir does not
  # exist yet). Do NOT leave the gate unarmed (that is a fail-OPEN window) and do
  # NOT persist a guard-nothing set. Instead arm the fail-SAFE catch-all
  # (over-guard every native + wrapper root) AND emit <<NEED_USER_INPUT>> so the
  # user confirms / narrows the real design-system directory.
  match_count="$(canvas_verify_globs_on_disk "$root" "$globs")"
  if [ "$match_count" -eq 0 ]; then
    printf 'WARNING: canvas-init: derived globs for framework "%s" match zero on-disk directories; arming the fail-SAFE catch-all (over-guard) instead.\n' "$fw" >&2
    printf '  Derived (unused): %s\n' "$globs" >&2
    printf '<<NEED_USER_INPUT>> canvas-init: the conventional component directory for framework "%s" was not found on disk, so CANVAS armed the fail-SAFE over-guard (%s). Confirm or narrow it: re-run /canvas-init with an explicit glob (e.g. src/ui/**).\n' "$fw" "$CANVAS_FAILSAFE_GUARDED_GLOBS"
    globs="$CANVAS_FAILSAFE_GUARDED_GLOBS"
  fi

  dir="$(canvas_dir)" || return 1
  mkdir -p "$dir" || return 1
  sf="$dir/state-${slug}.json"
  now="$(_canvas_now)"
  # Write state including state_schema_version so upgrade detection works:
  # pre-RFC-022 state lacks this field (AC-9 stale-state signal).
  jq -n \
    --arg globs "$globs" \
    --arg now   "$now"   \
    --arg fw    "$fw"    \
    --arg sv    "$STATE_SCHEMA_VERSION" \
    '{phase:"design", tokens_rfc:"", tokens_active:false,
      guarded_globs:$globs, override:false,
      state_schema_version:$sv, framework:$fw,
      started_at:$now, phase_entered_at:$now}' \
    > "$sf" || return 1
  echo "$sf"
}

# _canvas_is_stale_state SLUG — return 0 if the persisted state is stale
# (pre-RFC-022: no state_schema_version AND wrapper-only globs), 1 if current
# or absent. Internal helper; no stdout output.
_canvas_is_stale_state() {
  local slug="$1" sf schema_ver globs
  sf="$(state_file_for "$slug")" || return 1
  [ -f "$sf" ] || return 1  # absent — not stale by this definition

  schema_ver="$(jq -r '.state_schema_version // ""' "$sf" 2>/dev/null)" || return 1
  globs="$(jq -r '.guarded_globs // ""' "$sf" 2>/dev/null)" || return 1

  # Stale when: no schema_version AND globs contain the legacy wrapper prefix.
  if [ -z "$schema_ver" ] && printf '%s' "$globs" | grep -q "packages/design-system"; then
    return 0
  fi
  return 1
}

# canvas_migrate_state SLUG FRAMEWORK — detect stale pre-RFC-022 state (AC-9)
# and, if stale, re-derive guarded_globs for FRAMEWORK + stamp
# state_schema_version. Preserves phase / tokens_active / override in-place.
# On zero-match after re-derive: warn + <<NEED_USER_INPUT>>, do NOT update.
# On already-current state: no-op message.
canvas_migrate_state() {
  local slug="$1" fw="${2:-unknown}"
  local sf globs root match_count now

  sf="$(state_file_for "$slug")" || return 1
  [ -f "$sf" ] || { echo "error: no state file for $slug" >&2; return 1; }

  if ! _canvas_is_stale_state "$slug"; then
    echo "INFO: canvas state for '${slug}' is already at schema v${STATE_SCHEMA_VERSION} — no migration needed."
    return 0
  fi

  echo "INFO: stale pre-RFC-022 canvas state detected for '${slug}' — migrating to schema v${STATE_SCHEMA_VERSION} (framework: ${fw})"

  globs="$(derive_guarded_globs "$fw")"
  root="$(repo_root)" || return 1
  match_count="$(canvas_verify_globs_on_disk "$root" "$globs")"

  if [ "$match_count" -eq 0 ]; then
    printf 'WARNING: canvas-migrate: derived globs for framework "%s" match zero on-disk directories; migrating to the fail-SAFE catch-all (over-guard) instead of leaving stale globs.\n' "$fw" >&2
    printf '<<NEED_USER_INPUT>> canvas-migrate: the conventional dir for "%s" was not found; migrated to the fail-SAFE over-guard (%s). Confirm or narrow with an explicit glob.\n' "$fw" "$CANVAS_FAILSAFE_GUARDED_GLOBS"
    globs="$CANVAS_FAILSAFE_GUARDED_GLOBS"
  fi

  now="$(_canvas_now)"
  locked_update_state "$sf" \
    '.guarded_globs=$g | .state_schema_version=$v | .migrated_at=$n' \
    --arg g "$globs" --arg v "$STATE_SCHEMA_VERSION" --arg n "$now" || return 1

  echo "INFO: migration complete. New globs: ${globs}"
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
    get)            canvas_get "$@" ;;
    slug)           branch_slug "$@" ;;
    derive-globs)   derive_guarded_globs "$@" ;;          # RFC-022 AC-1
    init-framework) canvas_init_framework_state "$@" ;;   # RFC-022 AC-1/AC-10/AC-9
    migrate)        canvas_migrate_state "$@" ;;           # RFC-022 AC-9
    *)
      echo "usage: canvas-lib.sh {init SLUG [GUARDED_GLOBS] | init-framework SLUG FRAMEWORK | set-phase SLUG PHASE | set-tokens SLUG RFC true|false | set-override SLUG true|false | get SLUG [FIELD] | slug [BRANCH] | derive-globs FRAMEWORK | migrate SLUG FRAMEWORK}" >&2
      exit 1
      ;;
  esac
fi
