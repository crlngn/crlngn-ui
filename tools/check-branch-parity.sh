#!/usr/bin/env bash
# Checks that the files the merged release ships from main only (templates and
# assets) are the same on the v13 branch, so a single package serves both
# Foundry generations.
#
# Rule: a file that exists only on main is fine (the v13 bundle never
# references it). A file that exists only on the v13 branch, or that differs
# between the branches, fails the check - port the change or namespace the
# file per generation before releasing.
#
# Usage:
#   tools/check-branch-parity.sh
#       Git mode. Compares MAIN_REF (default HEAD) with V13_REF (default
#       origin/v2) on src/templates, src/assets and the shared submodule
#       templates. Used by tools/release.sh before cutting a main release.
#
#   tools/check-branch-parity.sh <main_dir> <v13_dir> <subdir>...
#       Directory mode. Compares <subdir> under each root. Used by CI with
#       two checkouts (source level) and with the two built dist folders.
set -euo pipefail

SHARED_PATHS=(src/templates src/assets)
SUBMODULE=shared/dnd5e-compact-cards

fail() {
  echo "::error::$*" >&2
  exit 1
}

check_dirs() {
  local main_root="$1" v13_root="$2"
  shift 2
  local sub problems status=0
  for sub in "$@"; do
    if [ ! -d "$v13_root/$sub" ]; then
      echo "$sub: not present on the v13 side, nothing to compare"
      continue
    fi
    if [ ! -d "$main_root/$sub" ]; then
      echo "$sub: present only on the v13 side"
      status=1
      continue
    fi
    problems=$(diff -rq "$main_root/$sub" "$v13_root/$sub" | grep -v "^Only in $main_root/$sub" || true)
    if [ -n "$problems" ]; then
      echo "$problems"
      status=1
    else
      echo "$sub: in sync"
    fi
  done
  return $status
}

check_git() {
  local main_ref="${MAIN_REF:-HEAD}" v13_ref="${V13_REF:-origin/v2}"
  git rev-parse --verify -q "$v13_ref^{commit}" >/dev/null \
    || fail "ref $v13_ref not found. Fetch it first: git fetch origin +refs/heads/v2:refs/remotes/origin/v2"

  local status=0 line kind path
  while IFS=$'\t' read -r kind path; do
    [ -z "$kind" ] && continue
    case "${kind:0:1}" in
      A) ;;  # only on main: harmless
      D) echo "only on $v13_ref: $path"; status=1 ;;
      *) echo "differs ($kind): $path"; status=1 ;;
    esac
  done < <(git diff --name-status "$v13_ref" "$main_ref" -- "${SHARED_PATHS[@]}")

  # The shared submodule ships templates too. Compare its template tree when
  # the branches pin different commits.
  local main_sub v13_sub
  main_sub=$(git rev-parse -q --verify "$main_ref:$SUBMODULE" 2>/dev/null || true)
  v13_sub=$(git rev-parse -q --verify "$v13_ref:$SUBMODULE" 2>/dev/null || true)
  if [ -n "$main_sub" ] && [ -n "$v13_sub" ] && [ "$main_sub" != "$v13_sub" ]; then
    if git -C "$SUBMODULE" cat-file -e "$v13_sub^{commit}" 2>/dev/null \
       && git -C "$SUBMODULE" cat-file -e "$main_sub^{commit}" 2>/dev/null; then
      while IFS=$'\t' read -r kind path; do
        [ -z "$kind" ] && continue
        case "${kind:0:1}" in
          A) ;;
          *) echo "$SUBMODULE differs ($kind): $path"; status=1 ;;
        esac
      done < <(git -C "$SUBMODULE" diff --name-status "$v13_sub" "$main_sub" -- templates)
    else
      echo "warning: $SUBMODULE is pinned to different commits on the two branches and one of them is not fetched locally, so its templates were not compared. CI compares them by content."
    fi
  fi

  if [ $status -eq 0 ]; then
    echo "templates and assets are in sync between $main_ref and $v13_ref"
  fi
  return $status
}

if [ $# -eq 0 ]; then
  check_git || fail "the v13 branch is not in sync with main. Port the changes above to v2 (or namespace the files per generation) before releasing from main."
elif [ $# -ge 3 ]; then
  check_dirs "$@" || fail "$1 and $2 differ. Files only on the v13 side or with different content on both sides would break one generation's build - align them or namespace them per generation before releasing."
else
  echo "Usage: $0 | $0 <main_dir> <v13_dir> <subdir>..." >&2
  exit 2
fi
