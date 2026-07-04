#!/usr/bin/env bash
# ============================================================================
# map-lib.sh -- shared bash utilities for the map-emitter-gate PreToolUse hook
# ============================================================================
# Sourced by map-emitter-gate.sh. Sourcing the file defines functions only and
# runs nothing; there is no CLI dispatch (unlike canvas-lib.sh/bmad-lib.sh)
# because the map-pack gate is STATELESS -- a pure path+identity rule, not a
# phase/tokens state machine. There is no per-branch state file to init/get/set.
#
# canonicalize_path is ported VERBATIM from plugins/agents-canvas's
# hooks/scripts/canvas-lib.sh (itself ported from bmad-lib.sh). Do not
# reimplement it -- its invariants are load-bearing for the gate (a regression
# here opens a path-traversal bypass class). See the function's own docstring.
# ============================================================================

# ---------------------------------------------------------------------------
# repo_root -- cached absolute path to the git repo root (or cwd if none)
# ---------------------------------------------------------------------------

repo_root() {
  if [ -z "${_FORGEPLAN_MAP_REPO_ROOT:-}" ]; then
    _FORGEPLAN_MAP_REPO_ROOT="$(git --no-optional-locks rev-parse --show-toplevel 2>/dev/null || pwd)"
  fi
  echo "$_FORGEPLAN_MAP_REPO_ROOT"
}

# ---------------------------------------------------------------------------
# canonicalize_path -- pure-bash path normalizer (segment-stack walker)
# ---------------------------------------------------------------------------
# Total over arbitrary byte sequences. No external commands, no fork/exec.
# Operates on bytes (LC_ALL=C). Glob characters and shell sigils pass through
# as literal bytes -- never expanded.
#
# LOAD-BEARING CONTRACT (the gate compares canonical forms; a regression here
# opens a path-traversal bypass class -- do not weaken):
#   * Empty / whitespace-only input -> "."
#   * Non-empty input -> non-empty single-line output (empty output on
#     non-empty input is a silent fail-open and is forbidden)
#   * No "//", no "." segments, no ".." on absolute output, no trailing "/"
#     (except when the whole output is exactly "/")
#   * Idempotent: canonicalize_path(canonicalize_path(x)) == canonicalize_path(x)
#   * Only ASCII 0x2E (".") is a segment dot -- Unicode lookalikes pass through
#   * Newlines in input -> "_" in output (single-line contract)
#   * No regex normalization, ever -- the segment-stack design is the only
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
  # the array on every pop -- avoids the O(n^2) cost on paths with many "..".
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
# repo_relative -- strip the repo-root prefix from a canonical path
# ---------------------------------------------------------------------------
# Falls back to the canonical path itself (fail-SAFE over-match direction --
# see path_is_under_map below) when the target is outside the repo root or a
# symlinked root (e.g. /var -> /private/var on macOS) prevents stripping.

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
# path_is_under -- is a repo-relative path equal to, or nested under, PREFIX?
# ---------------------------------------------------------------------------
# Simple anchored prefix match (no glob expansion -- PREFIX is a literal
# directory path, e.g. ".forgeplan/map/.work"). Also matches the exact prefix
# itself (a write to the directory entry, not just its contents).

path_is_under() {
  local rel="$1" prefix="$2"
  rel="${rel#./}"
  prefix="${prefix%/}"
  case "$rel" in
    "$prefix"|"$prefix"/*) return 0 ;;
    *) return 1 ;;
  esac
}
