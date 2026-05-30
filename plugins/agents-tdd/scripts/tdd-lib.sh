#!/usr/bin/env bash
# ============================================================================
# tdd-lib.sh — shared bash utilities for the enforced-TDD gate
# ============================================================================
# Sourced by the PreToolUse gate (tdd-gate.sh) and the phase-transition CLI.
# Provides: branch slugging, path resolution, file classification, atomic
# locked state updates, a pure-bash path canonicalizer, write-command
# detection, target-file extraction, SHA-256 hashing, and normalized SPEC
# hash (FR-6, RFC-012 / ADR-010).
#
# Conventions:
#   * State + config live under $FORGEPLAN_TDD_DIR (default ".forgeplan/tdd").
#   * canonicalize_path is the only sanctioned path normalizer — its
#     invariants are load-bearing for the gate (see the contract block above
#     the function). Do not replace it with regex normalization.
#   * Source the file; it defines functions only and runs nothing at load.

# Root directory for all enforced-TDD state and config (relative to repo root).
: "${FORGEPLAN_TDD_DIR:=.forgeplan/tdd}"

# ---------------------------------------------------------------------------
# branch_slug — filesystem-safe slug from a branch name
# ---------------------------------------------------------------------------
# Non-alphanumerics → hyphens, truncated to 80 chars, plus a 6-char hash so
# that branches differing only in punctuation (foo-bar vs foo_bar) never
# collide on the same state file.

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
# repo_root / tdd_config_file / tdd_dir — cached absolute paths
# ---------------------------------------------------------------------------

repo_root() {
  if [ -z "${_FORGEPLAN_TDD_REPO_ROOT:-}" ]; then
    _FORGEPLAN_TDD_REPO_ROOT="$(git --no-optional-locks rev-parse --show-toplevel 2>/dev/null || pwd)"
  fi
  echo "$_FORGEPLAN_TDD_REPO_ROOT"
}

tdd_config_file() {
  if [ -z "${_FORGEPLAN_TDD_CONFIG_FILE:-}" ]; then
    _FORGEPLAN_TDD_CONFIG_FILE="$(repo_root)/$FORGEPLAN_TDD_DIR/config.json"
  fi
  echo "$_FORGEPLAN_TDD_CONFIG_FILE"
}

tdd_dir() {
  if [ -z "${_FORGEPLAN_TDD_STATE_DIR:-}" ]; then
    _FORGEPLAN_TDD_STATE_DIR="$(repo_root)/$FORGEPLAN_TDD_DIR"
  fi
  echo "$_FORGEPLAN_TDD_STATE_DIR"
}

# ---------------------------------------------------------------------------
# classify_file — classify a relative path as test, source, or other
# ---------------------------------------------------------------------------
# Requires TEST_PATTERN and SOURCE_PATTERN globals (set by the caller, e.g.
# via read_patterns). Patterns are pipe-delimited globs
# (e.g. "*.test.ts|*.spec.ts|tests/*.rs"). A pattern containing "/" matches
# the full relative path; without "/" it matches the basename only.
# Test patterns win over source patterns when both could match.

# shellcheck disable=SC2254  # Unquoted $pat in case is intentional — glob matching
classify_file() {
  local file="$1" bname
  # Patterns are lowercase; normalize the filename. Use tr (not the ${x,,}
  # builtin) — macOS ships bash 3.2, where ${x,,} is a "bad substitution".
  file="$(printf '%s' "$file" | tr '[:upper:]' '[:lower:]')"
  bname="${file##*/}"

  if [ -n "${TEST_PATTERN:-}" ]; then
    local oldifs="$IFS"; IFS='|'
    for pat in $TEST_PATTERN; do
      IFS="$oldifs"
      case "$pat" in
        */*) case "$file" in $pat) echo "test"; return ;; esac ;;
        *)   case "$bname" in $pat) echo "test"; return ;; esac ;;
      esac
    done
    IFS="$oldifs"
  fi

  if [ -n "${SOURCE_PATTERN:-}" ]; then
    local oldifs="$IFS"; IFS='|'
    for pat in $SOURCE_PATTERN; do
      IFS="$oldifs"
      case "$pat" in
        */*) case "$file" in $pat) echo "source"; return ;; esac ;;
        *)   case "$bname" in $pat) echo "source"; return ;; esac ;;
      esac
    done
    IFS="$oldifs"
  fi

  echo "other"
}

# ---------------------------------------------------------------------------
# read_patterns / read_intensity — load config fields into globals
# ---------------------------------------------------------------------------

read_patterns() {
  local cf="${1:-$(tdd_config_file 2>/dev/null)}"
  [ -f "$cf" ] || return 1
  eval "$(jq -r '
    @sh "TEST_PATTERN=\(.patterns.test_file // "")",
    @sh "SOURCE_PATTERN=\(.patterns.source_file // "")"
  ' "$cf" 2>/dev/null)" || return 1
}

read_intensity() {
  local cf="${1:-$(tdd_config_file 2>/dev/null)}"
  [ -f "$cf" ] || { echo "standard"; return; }
  local val
  val="$(jq -r '.workflow.intensity // "standard"' "$cf" 2>/dev/null)" || val="standard"
  echo "$val"
}

# ---------------------------------------------------------------------------
# State-file locking — atomic mkdir + PID-based stale detection
# ---------------------------------------------------------------------------
# mkdir-based for portability (no flock dependency — works on macOS).
# Lock is a directory ${state_file}.lock containing a pid file.

_acquire_state_lock() {
  local state_file="$1"
  [ -n "$state_file" ] || { echo "ERROR: _acquire_state_lock called with empty path" >&2; return 1; }
  local lock_dir="${state_file}.lock"
  local timeout="${FORGEPLAN_TDD_LOCK_TIMEOUT:-5}"
  [[ "$timeout" =~ ^[0-9]+$ ]] || timeout=5
  local deadline=$((SECONDS + timeout))

  while true; do
    if mkdir "$lock_dir" 2>/dev/null; then
      echo "$$" > "$lock_dir/pid" || { rm -rf "$lock_dir"; return 1; }
      return 0
    fi

    # Lock exists — is the holder still alive?
    if [ -f "$lock_dir/pid" ]; then
      local holder_pid
      holder_pid="$(cat "$lock_dir/pid" 2>/dev/null)" || holder_pid=""
      if [ -n "$holder_pid" ] && ! kill -0 "$holder_pid" 2>/dev/null; then
        # Dead holder — atomically claim the stale lock via mv (only one
        # process's mv wins; losers retry from the top).
        local break_dir="${lock_dir}.breaking.$$"
        if mv "$lock_dir" "$break_dir" 2>/dev/null; then
          rm -rf "$break_dir"
        fi
        continue
      fi
    elif [ -d "$lock_dir" ]; then
      # Lock dir with no pid file — interrupted between mkdir and pid write.
      # Treat as stale and break it to avoid a timeout deadlock.
      local break_dir="${lock_dir}.breaking.$$"
      if mv "$lock_dir" "$break_dir" 2>/dev/null; then
        rm -rf "$break_dir"
      fi
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
  # Release only if we are the holder — prevents the EXIT trap from deleting
  # another process's lock.
  if [ -f "$lock_dir/pid" ] && [ "$(cat "$lock_dir/pid" 2>/dev/null)" = "$$" ]; then
    rm -rf "$lock_dir"
  fi
}

# locked_update_state — atomic read-modify-write of a state file under lock.
# Usage: locked_update_state STATE_FILE JQ_FILTER [--arg key val ...]
# Extra args are passed through to jq, enabling safe --arg parameterization
# instead of string interpolation.
locked_update_state() {
  local state_file="$1"
  local jq_filter="$2"
  shift 2
  local rc=0

  _acquire_state_lock "$state_file" || return 1
  # EXIT trap ensures the lock is released even if the process is killed
  # (e.g. the hook runner times out) between acquire and release.
  # NOTE (trap-clobber caveat): this installs a fresh EXIT trap and clears it
  # with `trap - EXIT` below. If this lib is sourced into a context that has
  # its OWN EXIT handler, that handler is clobbered for the duration of this
  # call. Safe in the orchestrator/hook (no competing EXIT trap); if a future
  # consumer sources tdd-lib.sh alongside another EXIT handler, switch to a
  # save-and-restore trap-stack pattern here.
  # shellcheck disable=SC2064
  trap "$(printf '_release_state_lock %q; rm -f %q' "$state_file" "${state_file}.$$.tmp")" EXIT

  local tmp_file="${state_file}.$$.tmp"
  # Extra args (e.g. --arg key val) must precede the filter for older jq (1.6).
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

# locked_update_file — like locked_update_state but for any file; a missing
# file is seeded as the empty object {} so the filter has a `.` to mutate.
# Usage: locked_update_file FILE_PATH JQ_FILTER [--arg key val ...]
locked_update_file() {
  local target_file="$1"
  local jq_filter="$2"
  shift 2
  local rc=0

  _acquire_state_lock "$target_file" || return 1
  # shellcheck disable=SC2064
  trap "$(printf '_release_state_lock %q; rm -f %q' "$target_file" "${target_file}.$$.tmp")" EXIT

  local tmp_file="${target_file}.$$.tmp"
  local jq_ok=0
  if [ -f "$target_file" ]; then
    jq "$@" "$jq_filter" "$target_file" > "$tmp_file" 2>/dev/null && jq_ok=1
  else
    jq -n "$@" "$jq_filter" > "$tmp_file" 2>/dev/null && jq_ok=1
  fi

  if [ "$jq_ok" = "1" ]; then
    mv "$tmp_file" "$target_file" || { rm -f "$tmp_file"; rc=1; }
  else
    rm -f "$tmp_file"
    rc=1
  fi

  _release_state_lock "$target_file"
  trap - EXIT
  return "$rc"
}

# ---------------------------------------------------------------------------
# canonicalize_path — pure-bash path normalizer (segment-stack walker)
# ---------------------------------------------------------------------------
# Total over arbitrary byte sequences. No external commands, no fork/exec.
# Operates on bytes (LC_ALL=C). Glob characters and shell sigils pass through
# as literal bytes — never expanded.
#
# LOAD-BEARING CONTRACT (the gate compares canonical forms on both sides; a
# regression here opens a path-traversal bypass class — do not weaken):
#   * Empty / whitespace-only input → "."
#   * Non-empty input → non-empty single-line output (empty output on
#     non-empty input is a silent fail-open and is forbidden)
#   * No "//", no "." segments, no ".." on absolute output, no trailing "/"
#     (except when the whole output is exactly "/")
#   * Idempotent: canonicalize_path(canonicalize_path(x)) == canonicalize_path(x)
#   * Only ASCII 0x2E (".") is a segment dot — Unicode lookalikes pass through
#     as ordinary bytes
#   * Newlines in input → "_" in output (single-line contract; a literal "\n"
#     cannot legitimately reach the matcher and any false positive is fail-safe)
#   * No regex normalization, ever — the segment-stack design is the only
#     sanctioned normalizer (regex variants corrupt glob-containing paths and
#     can infinite-loop on bracket-and-".." combinations)

canonicalize_path() {
  local LC_ALL=C
  local input="$1"

  if [ -z "$input" ]; then
    _CANONICAL_RESULT="."
    printf '%s\n' "."
    return 0
  fi

  # Whitespace-only input → "." (preserves the non-empty-output contract)
  case "$input" in
    *[!$' \t\n']*) ;;
    *) _CANONICAL_RESULT="."; printf '%s\n' "."; return 0 ;;
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
  # the array on every pop — avoids the O(n²) cost on paths with many "..".
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
    [ "$absolute" = 1 ] && _CANONICAL_RESULT="/" || _CANONICAL_RESULT="."
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

  _CANONICAL_RESULT="$out"
  printf '%s\n' "$out"
}

# ---------------------------------------------------------------------------
# _has_write_pattern — detect write/destructive shell command patterns
# ---------------------------------------------------------------------------
# Returns 0 if the command contains a write pattern, 1 otherwise.
# Union of: redirect operators, write-command tokens (cp/mv/rm/tee/...),
# sed -i / perl -i, and interpreter+eval-flag chains. Used by the gate to
# catch Bash write-redirects that route around the Edit/Write surface.

_has_write_pattern() {
  local cmd="$1"
  [[ "$cmd" =~ \>\>|\>\&[^0-9]|[0-9]*\>[^\&] ]] && return 0

  # Single-token scan — glob-disabled to keep `*.foo` literal — looking for
  # writers, sed -i / perl -i shapes, or interpreter+eval-flag chains.
  local f_was_set=1
  case $- in *f*) ;; *) f_was_set=0 ;; esac
  set -f
  # shellcheck disable=SC2141
  local IFS=$' \t\n;|&()`"'"'"
  local tok base has_interp=0 has_evalflag=0 rc=1
  for tok in $cmd; do
    case "$tok" in
      cp|mv|tee|install|rm|rmdir|unlink|dd|curl|wget|rsync|patch|truncate|shred|ln) rc=0; break ;;
      tar|unzip|7z|cpio|ar|touch|chmod|chown|chgrp|scp|sftp|mkdir) rc=0; break ;;
      ed|vim|vi|nvim|ex|view|nano|emacs) rc=0; break ;;
      eval|exec) rc=0; break ;;
      find) [[ "$cmd" =~ -delete|-execdir ]] && { rc=0; break; } ;;
      npx|python|python3|node|ruby) rc=0; break ;;
      git) [[ "$cmd" =~ git[[:space:]]+(checkout|restore|reset|stash|clean|apply|am|merge|rebase|cherry-pick) ]] && { rc=0; break; } ;;
      sed) [[ "$cmd" =~ sed[[:space:]]+-i ]] && { rc=0; break; } ;;
      perl) [[ "$cmd" =~ perl[[:space:]]+-i ]] && { rc=0; break; } ;;
    esac
    # Interpreter+eval-flag detection — basename match strips
    # `/usr/bin/env perl` style paths down to the executable name.
    base="${tok##*/}"
    case "$base" in
      bash|sh|zsh|dash|perl|python|python3|ruby|php|lua|tclsh|Rscript|nim|node|base64) has_interp=1 ;;
    esac
    case "$tok" in
      -c|-e|-r|-E|-pe|-ne|-pi|-ni|-lpi|--execute|-d|--decode) has_evalflag=1 ;;
    esac
    case "$tok" in
      "<<<") has_evalflag=1 ;;
    esac
    if [ "$has_interp" = 1 ] && [ "$has_evalflag" = 1 ]; then
      rc=0; break
    fi
  done
  [ "$f_was_set" = 1 ] || set +f
  return "$rc"
}

# ---------------------------------------------------------------------------
# get_target_file — extract file paths with known extensions from a command
# ---------------------------------------------------------------------------
# Usage: FILES="$(get_target_file "$COMMAND")"  (one path per line)

get_target_file() {
  local cmd="$1"
  echo "$cmd" | sed "s/['\"]//g" | tr ' \t' '\n\n' | grep -E '\.(go|ts|tsx|js|jsx|py|rs|java|rb|cpp|c|h|sh|json|md|yaml|yml|toml|cfg|ini|sql|css|html|vue|svelte)$'
}

# ---------------------------------------------------------------------------
# sha256_hash_file — SHA-256 of a file (cross-platform), hex to stdout
# ---------------------------------------------------------------------------
# Tries sha256sum, shasum -a 256, openssl dgst -sha256 in order.
# Returns 1 if no tool is available or the file is missing. This is the
# primitive behind the frozen-oracle check (hash the SPEC's normalized body
# and compare at the gate during GREEN — RFC-012 FR-6).

sha256_hash_file() {
  local file="$1"
  [ -f "$file" ] || return 1

  local hash=""
  if command -v sha256sum >/dev/null 2>&1; then
    hash="$(sha256sum "$file" 2>/dev/null | cut -d' ' -f1)"
  elif command -v shasum >/dev/null 2>&1; then
    hash="$(shasum -a 256 "$file" 2>/dev/null | cut -d' ' -f1)"
  elif command -v openssl >/dev/null 2>&1; then
    hash="$(openssl dgst -sha256 "$file" 2>/dev/null | sed 's/^.*= //')"
  fi

  if [ -n "$hash" ]; then
    echo "$hash"
    return 0
  fi
  return 1
}

# ---------------------------------------------------------------------------
# normalized_spec_hash — FR-6 frozen-oracle primitive (RFC-012 / ADR-010)
# ---------------------------------------------------------------------------
# Computes a normalized full-file SHA-256 of the SPEC artifact.
# Safe normalizations ONLY (as proven empirically in fr6-experiment):
#   1. CRLF → LF
#   2. Per-line trailing whitespace stripped
#   3. Trailing blank lines dropped
# NO semantic normalization (scenario order, list markers, prose left as-is)
# — those remain as honest false-positives.
#
# Why normalized full-file (not scenario_hash): fr6-experiment / EVID-130
# showed scenario_hash has 2 false-negatives on a real SPEC-001 slice — edits
# to Pseudocode (is_numeric definition) and Behavioral Contract (INV-2) that
# live OUTSIDE #### Scenario blocks change the oracle but are invisible to
# scenario-level hashing.  Full-file: 0 false-negatives.  Normalized full-file:
# 0 false-negatives / 3 false-positives (strictly better than raw full-file).
#
# Usage:
#   hash="$(normalized_spec_hash /path/to/SPEC-NNN.md)" || exit 2
# Returns 1 if the file is missing or no SHA-256 tool is available.
# Returns 2 if no SHA-256 tool is available (fail-closed for gate use).

normalized_spec_hash() {
  local file="$1"
  [ -f "$file" ] || return 1

  # Step 1: normalize (CRLF→LF, per-line rstrip, drop trailing blank lines).
  # Use awk — available on every POSIX system and bash-version-independent.
  # awk RS='\n' reads line by line; we strip \r (for CRLF) and trailing spaces/tabs.
  local normalized
  normalized="$(awk 'BEGIN{RS="\n"; ORS="\n"} {sub(/\r$/,""); sub(/[ \t]+$/,"")} {lines[NR]=$0} END{
    last=NR
    while (last > 0 && lines[last] == "") last--
    for (i=1; i<=last; i++) print lines[i]
  }' "$file" 2>/dev/null)"

  if [ $? -ne 0 ] || [ -z "$normalized" ] && ! [ -s "$file" ]; then
    # File is empty — hash the empty string
    normalized=""
  fi

  # Step 2: hash the normalized content via available SHA-256 tool.
  # Pipe through the hash tool instead of hashing a temp file — no disk I/O
  # and no race condition risk.
  local hash=""
  if command -v sha256sum >/dev/null 2>&1; then
    hash="$(printf '%s' "$normalized" | sha256sum 2>/dev/null | cut -d' ' -f1)"
  elif command -v shasum >/dev/null 2>&1; then
    hash="$(printf '%s' "$normalized" | shasum -a 256 2>/dev/null | cut -d' ' -f1)"
  elif command -v openssl >/dev/null 2>&1; then
    hash="$(printf '%s' "$normalized" | openssl dgst -sha256 2>/dev/null | sed 's/^.*= //')"
  else
    # No SHA-256 tool — fail-closed (caller should exit 2)
    return 2
  fi

  if [ -n "$hash" ]; then
    echo "$hash"
    return 0
  fi
  return 1
}
