#!/usr/bin/env bash
set -euo pipefail

BUMP_TYPE="${1:-patch}"
case "$BUMP_TYPE" in
  patch|minor|major) ;;
  *) echo "Usage: $0 [patch|minor|major]"; exit 1 ;;
esac

BRANCH=$(git rev-parse --abbrev-ref HEAD)
case "$BRANCH" in
  v2|v3) ;;
  *) echo "Error: must be on v2 or v3 (currently on $BRANCH)"; exit 1 ;;
esac

if ! command -v gh >/dev/null 2>&1; then
  echo "Error: gh CLI not installed. Install with: brew install gh && gh auth login"
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "Error: gh not authenticated. Run: gh auth login"
  exit 1
fi

if ! git diff-index --quiet HEAD --; then
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

echo "Bumping $BUMP_TYPE version on $BRANCH..."
if [ "$BUMP_TYPE" = "patch" ]; then
  npm run bump
else
  npm run "bump:$BUMP_TYPE"
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

NOTES_FILE=$(mktemp -t crlngn-release-XXXXXX)
trap 'rm -f "$NOTES_FILE"' EXIT
cat > "$NOTES_FILE" <<EOF


# Release notes for $TAG ($BRANCH)
# Lines starting with # will be stripped. Save and close to continue, or save empty to abort.
EOF

"${EDITOR:-vi}" "$NOTES_FILE"

NOTES=$(python3 -c "
import sys
text = open('$NOTES_FILE').read()
lines = [l for l in text.splitlines() if not l.startswith('#')]
print('\n'.join(lines).strip())
")

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
git commit -m "$(printf '%s\n\n%s\n' "$TAG" "$NOTES")"
git tag -a "$TAG" -m "$TAG"
git push origin "$BRANCH" "$TAG"

LATEST_FLAG="false"
if [ "$BRANCH" = "v3" ]; then
  LATEST_FLAG="true"
fi

gh release create "$TAG" \
  --title "$TAG" \
  --notes "$NOTES" \
  --target "$BRANCH" \
  --latest="$LATEST_FLAG"

echo "Done: $TAG released on $BRANCH."
