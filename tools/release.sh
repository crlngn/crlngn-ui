#!/usr/bin/env bash
set -euo pipefail

BUMP_TYPE="patch"
NOTES_ARG=""
SKIP_BUMP=0
while [ $# -gt 0 ]; do
  case "$1" in
    patch|minor|major) BUMP_TYPE="$1"; shift ;;
    -m|--msg|--message)
      if [ $# -lt 2 ]; then echo "Error: $1 requires a value"; exit 1; fi
      NOTES_ARG="$2"; shift 2 ;;
    --msg=*|--message=*) NOTES_ARG="${1#*=}"; shift ;;
    --no-bump|--skip-bump) SKIP_BUMP=1; shift ;;
    -h|--help)
      echo "Usage: $0 [patch|minor|major] [--msg \"release notes\"] [--no-bump]"
      exit 0 ;;
    *) echo "Unknown argument: $1"; echo "Usage: $0 [patch|minor|major] [--msg \"release notes\"] [--no-bump]"; exit 1 ;;
  esac
done

BRANCH=$(git rev-parse --abbrev-ref HEAD)
case "$BRANCH" in
  v2|v3|main) ;;
  *) echo "Error: must be on v2, v3 or main (currently on $BRANCH)"; exit 1 ;;
esac

if ! command -v gh >/dev/null 2>&1; then
  echo "Error: gh CLI not installed. Install with: brew install gh && gh auth login"
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "Error: gh not authenticated. Run: gh auth login"
  exit 1
fi

if [ "$SKIP_BUMP" -eq 0 ] && ! git diff-index --quiet HEAD --; then
  echo "Error: working tree has uncommitted changes. Commit or stash first."
  git status --short
  exit 1
fi

echo "Fetching origin/$BRANCH..."
git fetch origin "$BRANCH"
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse "origin/$BRANCH")
BASE=$(git merge-base HEAD "origin/$BRANCH")
if [ "$LOCAL" != "$REMOTE" ] && [ "$REMOTE" != "$BASE" ]; then
  echo "Error: $BRANCH is behind origin/$BRANCH. Pull first."
  exit 1
fi

if [ "$SKIP_BUMP" -eq 1 ]; then
  echo "Skipping version bump (--no-bump). Using current package.json version."
else
  echo "Bumping $BUMP_TYPE version on $BRANCH..."
  if [ "$BUMP_TYPE" = "patch" ]; then
    npm run bump
  else
    npm run "bump:$BUMP_TYPE"
  fi
fi

VERSION=$(node -p "require('./package.json').version")
TAG="v$VERSION"
echo "New version: $TAG"

if git rev-parse "$TAG" >/dev/null 2>&1; then
  echo "Error: tag $TAG already exists locally"
  exit 1
fi
if git ls-remote --tags origin "$TAG" | grep -q "$TAG"; then
  echo "Error: tag $TAG already exists on origin"
  exit 1
fi

if [ -n "$NOTES_ARG" ]; then
  NOTES="$NOTES_ARG"
else
  NOTES_FILE=$(mktemp -t crlngn-release-XXXXXX)
  trap 'rm -f "$NOTES_FILE"' EXIT
  cat > "$NOTES_FILE" <<EOF


# Release notes for $TAG ($BRANCH)
# Lines starting with # will be stripped. Save and close to continue, or save empty to abort.
EOF

  "${EDITOR:-nano}" "$NOTES_FILE"

  NOTES=$(python3 -c "
import sys
text = open('$NOTES_FILE').read()
lines = [l for l in text.splitlines() if not l.startswith('#')]
print('\n'.join(lines).strip())
")
fi

if [ -z "$NOTES" ]; then
  echo "Aborted: empty release notes."
  exit 1
fi

echo
echo "=== Release notes ==="
echo "$NOTES"
echo "====================="
read -r -p "Proceed with release $TAG on $BRANCH? [y/N] " CONFIRM
case "$CONFIRM" in
  y|Y|yes|YES) ;;
  *) echo "Aborted (no commit/tag/push made)."; exit 1 ;;
esac

git add -u
if git diff --cached --quiet; then
  echo "No staged changes — tagging current HEAD."
else
  git commit -m "$(printf '%s\n\n%s\n' "$TAG" "$NOTES")"
fi
git tag -a "$TAG" -m "$TAG"
git push origin "$BRANCH" "$TAG"

LATEST_FLAG="false"
if [ "$BRANCH" = "main" ]; then
  LATEST_FLAG="true"
fi

gh release create "$TAG" \
  --title "$TAG" \
  --notes "$NOTES" \
  --target "$BRANCH" \
  --latest="$LATEST_FLAG"

echo "Done: $TAG released on $BRANCH."
