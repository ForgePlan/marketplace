#!/usr/bin/env bash
# ============================================================================
# bmad-lib.sh — shared bash utilities for the no-code-before-plan gate
# ============================================================================
# Sourced by the PreToolUse gate (bmad-gate.sh); also runnable as a thin state
# CLI (the bmad-orchestrator writes phase transitions through it — the hook
# only READS the state file). Ported from the TDD instance's tdd-lib.sh
# (RFC-013 FR-5): branch slugging, path resolution, file classification, atomic
# locked state updates, a pure-bash path canonicalizer, write-command
# detection, target-file extraction, stack detection. The spec-hash / frozen-
# oracle primitives from the TDD instance are intentionally DROPPED — BMAD has
# no frozen-file oracle (its frozen products are MCP-mutated forgeplan
# artifacts the file-write hook never sees; the lifecycle guards them).
#
# Conventions:
#   * State + config live under $FORGEPLAN_BMAD_DIR (default ".forgeplan/bmad").
#   * canonicalize_path is the only sanctioned path normalizer — its
#     invariants are load-bearing for the gate (see the contract block above
#     the function). Do not replace it with regex normalization.
#   * Sourcing the file defines functions only and runs nothing. Executing it
#     directly ("bash bmad-lib.sh <subcommand> …") runs the state CLI.

# Root directory for all BMAD state and config (relative to repo root).
: "${FORGEPLAN_BMAD_DIR:=.forgeplan/bmad}"

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
# repo_root / bmad_dir — cached absolute paths
# ---------------------------------------------------------------------------

repo_root() {
  if [ -z "${_FORGEPLAN_BMAD_REPO_ROOT:-}" ]; then
    _FORGEPLAN_BMAD_REPO_ROOT="$(git --no-optional-locks rev-parse --show-toplevel 2>/dev/null || pwd)"
  fi
  echo "$_FORGEPLAN_BMAD_REPO_ROOT"
}

bmad_dir() {
  if [ -z "${_FORGEPLAN_BMAD_STATE_DIR:-}" ]; then
    _FORGEPLAN_BMAD_STATE_DIR="$(repo_root)/$FORGEPLAN_BMAD_DIR"
  fi
  echo "$_FORGEPLAN_BMAD_STATE_DIR"
}

# state_file_for — absolute path to the per-branch state file for a slug.
state_file_for() {
  local slug="${1:-$(branch_slug 2>/dev/null)}" || return 1
  [ -n "$slug" ] || return 1
  echo "$(bmad_dir)/state-${slug}.json"
}

# ---------------------------------------------------------------------------
# classify_file — classify a relative path as test, source, or other
# ---------------------------------------------------------------------------
# Requires TEST_PATTERN and SOURCE_PATTERN globals (set by the caller from
# stack.json). Patterns are pipe-delimited globs
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
# State-file locking — atomic mkdir + PID-based stale detection
# ---------------------------------------------------------------------------
# mkdir-based for portability (no flock dependency — works on macOS).
# Lock is a directory ${state_file}.lock containing a pid file.

_acquire_state_lock() {
  local state_file="$1"
  [ -n "$state_file" ] || { echo "ERROR: _acquire_state_lock called with empty path" >&2; return 1; }
  local lock_dir="${state_file}.lock"
  local timeout="${FORGEPLAN_BMAD_LOCK_TIMEOUT:-5}"
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
  # between acquire and release. (Same trap-clobber caveat as the TDD lib:
  # safe in the orchestrator/hook which carry no competing EXIT handler.)
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

# locked_update_file — like locked_update_state but seeds a missing file as {}.
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
# LOAD-BEARING CONTRACT (the gate compares canonical forms; a regression here
# opens a path-traversal bypass class — do not weaken):
#   * Empty / whitespace-only input → "."
#   * Non-empty input → non-empty single-line output (empty output on
#     non-empty input is a silent fail-open and is forbidden)
#   * No "//", no "." segments, no ".." on absolute output, no trailing "/"
#     (except when the whole output is exactly "/")
#   * Idempotent: canonicalize_path(canonicalize_path(x)) == canonicalize_path(x)
#   * Only ASCII 0x2E (".") is a segment dot — Unicode lookalikes pass through
#   * Newlines in input → "_" in output (single-line contract)
#   * No regex normalization, ever — the segment-stack design is the only
#     sanctioned normalizer.

canonicalize_path() {
  local LC_ALL=C
  local input="$1"

  if [ -z "$input" ]; then
    printf '%s\n' "."
    return 0
  fi

  # Whitespace-only input → "." (preserves the non-empty-output contract)
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
# _has_write_pattern — detect write/destructive shell command patterns
# ---------------------------------------------------------------------------
# Returns 0 if the command contains a write pattern, 1 otherwise. Used by the
# gate to catch Bash write-redirects that route around the Edit/Write surface.

_has_write_pattern() {
  local cmd="$1"
  [[ "$cmd" =~ \>\>|\>\&[^0-9]|[0-9]*\>[^\&] ]] && return 0

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
# detect_stack — infer the test/source stack from repo markers (best-effort)
# ---------------------------------------------------------------------------
# Emits tab-separated fields on one line:
#   language <TAB> test_command <TAB> test_file_glob <TAB> source_file_glob <TAB> red_confirm <TAB> lint_command
# Returns 0 on a confident match, 1 if nothing matched (caller should ask the
# user). /bmad-init shows the result for human review before writing it.
detect_stack() {
  local root="${1:-$(repo_root 2>/dev/null || pwd)}"
  local lang tc tfg sfg rc lc
  if [ -f "$root/pyproject.toml" ] || [ -f "$root/setup.py" ] || [ -f "$root/pytest.ini" ] || [ -f "$root/tox.ini" ]; then
    lang=python; tc="pytest -q"; tfg="test_*.py|*_test.py|tests/*.py"; sfg="*.py"; rc="FAILED"; lc="ruff check ."
  elif [ -f "$root/Cargo.toml" ]; then
    lang=rust; tc="cargo test"; tfg="tests/*.rs|src/**/*test*.rs"; sfg="*.rs"; rc="test result: FAILED"; lc="cargo clippy"
  elif [ -f "$root/go.mod" ]; then
    lang=go; tc="go test ./..."; tfg="*_test.go"; sfg="*.go"; rc="--- FAIL:"; lc="go vet ./..."
  elif [ -f "$root/package.json" ]; then
    if grep -q '"vitest"' "$root/package.json" 2>/dev/null; then
      lang=typescript; tc="vitest run"; rc="FAIL"
    elif grep -q '"jest"' "$root/package.json" 2>/dev/null; then
      lang=typescript; tc="jest --ci"; rc="✕"
    else
      lang=javascript; tc="npm test"; rc="FAIL"
    fi
    tfg="*.test.ts|*.test.js|*.spec.ts|*.spec.js|*.test.tsx"; sfg="*.ts|*.tsx|*.js|*.jsx"; lc="eslint ."
  elif [ -f "$root/composer.json" ]; then
    lang=php; tc="vendor/bin/phpunit"; tfg="*Test.php|tests/*.php"; sfg="*.php"; rc="FAILURES!"; lc="vendor/bin/phpcs"
  elif [ -f "$root/Gemfile" ]; then
    lang=ruby; tc="bundle exec rspec"; tfg="*_spec.rb|spec/*.rb"; sfg="*.rb"; rc="failures"; lc="rubocop"
  elif [ -f "$root/pom.xml" ]; then
    lang=java; tc="mvn -q test"; tfg="*Test.java|*Tests.java"; sfg="*.java"; rc="Failures:"; lc=""
  else
    return 1
  fi
  printf '%s\t%s\t%s\t%s\t%s\t%s\n' "$lang" "$tc" "$tfg" "$sfg" "$rc" "$lc"
  return 0
}

# write_stack_json — render stack.json from six fields into $FORGEPLAN_BMAD_DIR.
# Usage: write_stack_json LANG TEST_CMD TEST_GLOB SOURCE_GLOB RED_CONFIRM LINT_CMD
write_stack_json() {
  local lang="$1" tc="$2" tfg="$3" sfg="$4" rc="$5" lc="$6"
  local dir; dir="$(bmad_dir 2>/dev/null)" || return 1
  mkdir -p "$dir" || return 1
  jq -n \
    --arg language "$lang" --arg test_command "$tc" \
    --arg test_file_glob "$tfg" --arg source_file_glob "$sfg" \
    --arg red_confirm "$rc" --arg lint_command "$lc" \
    '{language:$language, test_command:$test_command, test_file_glob:$test_file_glob, source_file_glob:$source_file_glob, red_confirm:$red_confirm, lint_command:$lint_command}' \
    > "$dir/stack.json" || return 1
  echo "$dir/stack.json"
}

# ---------------------------------------------------------------------------
# State CLI — the bmad-orchestrator writes phase transitions through these.
# The PreToolUse hook only READS the state file; this split is load-bearing
# (hooks cannot call MCP and must read state fast and locally).
# ---------------------------------------------------------------------------
# State shape (RFC-013 FR-5):
#   { "phase": "planning|solutioning|implementation|done",
#     "dev_unlocked": false, "governing_rfc": "RFC-NNN",
#     "qa_attempt_count": 0, "override": false,
#     "started_at": "ISO", "phase_entered_at": "ISO" }

_bmad_now() { date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || echo ""; }

# bmad_init_state SLUG GOVERNING_RFC — create/overwrite the per-branch state at
# phase=planning, dev_unlocked=false.
bmad_init_state() {
  local slug="$1" rfc="${2:-}"
  local dir sf now
  dir="$(bmad_dir)" || return 1
  mkdir -p "$dir" || return 1
  sf="$dir/state-${slug}.json"
  now="$(_bmad_now)"
  jq -n --arg rfc "$rfc" --arg now "$now" \
    '{phase:"planning", dev_unlocked:false, governing_rfc:$rfc, qa_attempt_count:0, override:false, started_at:$now, phase_entered_at:$now}' \
    > "$sf" || return 1
  echo "$sf"
}

# bmad_set_phase SLUG PHASE — move to a new phase + stamp phase_entered_at.
bmad_set_phase() {
  local slug="$1" phase="$2" now sf
  sf="$(state_file_for "$slug")" || return 1
  [ -f "$sf" ] || { echo "error: no state file for $slug" >&2; return 1; }
  case "$phase" in planning|solutioning|implementation|done) ;; *) echo "error: bad phase '$phase'" >&2; return 1 ;; esac
  now="$(_bmad_now)"
  locked_update_state "$sf" '.phase=$p | .phase_entered_at=$n' --arg p "$phase" --arg n "$now"
}

# bmad_unlock_dev SLUG — set dev_unlocked=true (called after readiness gate PASS).
bmad_unlock_dev() {
  local slug="$1" sf
  sf="$(state_file_for "$slug")" || return 1
  [ -f "$sf" ] || { echo "error: no state file for $slug" >&2; return 1; }
  locked_update_state "$sf" '.dev_unlocked=true'
}

# bmad_bump_qa SLUG — increment qa_attempt_count (Dev↔QA loop bound).
bmad_bump_qa() {
  local slug="$1" sf
  sf="$(state_file_for "$slug")" || return 1
  [ -f "$sf" ] || { echo "error: no state file for $slug" >&2; return 1; }
  locked_update_state "$sf" '.qa_attempt_count=((.qa_attempt_count // 0)+1)'
}

# bmad_set_override SLUG true|false — record a human gate-override for audit.
bmad_set_override() {
  local slug="$1" val="$2" sf
  sf="$(state_file_for "$slug")" || return 1
  [ -f "$sf" ] || { echo "error: no state file for $slug" >&2; return 1; }
  case "$val" in true|false) ;; *) echo "error: override must be true|false" >&2; return 1 ;; esac
  locked_update_state "$sf" ".override=$val"
}

# bmad_get SLUG [FIELD] — print the whole state file, or one field.
bmad_get() {
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
# (so the gate + test suite source it for the functions without side effects).
if [ "${BASH_SOURCE[0]:-}" = "${0}" ]; then
  set -euo pipefail
  cmd="${1:-}"; shift || true
  case "$cmd" in
    init)          bmad_init_state "$@" ;;
    set-phase)     bmad_set_phase "$@" ;;
    unlock-dev)    bmad_unlock_dev "$@" ;;
    bump-qa)       bmad_bump_qa "$@" ;;
    set-override)  bmad_set_override "$@" ;;
    get)           bmad_get "$@" ;;
    detect-stack)  detect_stack "$@" ;;
    *)
      echo "usage: bmad-lib.sh {init SLUG RFC | set-phase SLUG PHASE | unlock-dev SLUG | bump-qa SLUG | set-override SLUG true|false | get SLUG [FIELD] | detect-stack [ROOT]}" >&2
      exit 1
      ;;
  esac
fi
