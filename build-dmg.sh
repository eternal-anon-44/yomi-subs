#!/usr/bin/env bash
set -euo pipefail
# build-dmg.sh — builds Yomi-Subs-v2.dmg for macOS distribution.
#
# DMG contents:
#   Yomi-Subs.app      — self-contained backend launcher (backend embedded in Resources/)
#   yomi-subs-extension/ — Chrome extension folder (load unpacked in Chrome)
#   Applications/      — symlink for drag-to-install UX

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BUILD_DIR="$SCRIPT_DIR/.build-dmg"
APP_SRC="$SCRIPT_DIR/Launch-TranscribeJP.app"
APP_DEST="$BUILD_DIR/Yomi-Subs.app"
DMG_OUT="$SCRIPT_DIR/Yomi-Subs-v2.dmg"
VOLUME_NAME="Yomi-Subs v2"

echo "→ Cleaning previous build…"
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

echo "→ Copying app bundle…"
cp -R "$APP_SRC" "$APP_DEST"

echo "→ Embedding backend into app bundle…"
mkdir -p "$APP_DEST/Contents/Resources/backend"
cp "$SCRIPT_DIR/yomi-subs-backend/server.py"      "$APP_DEST/Contents/Resources/backend/"
cp "$SCRIPT_DIR/yomi-subs-backend/requirements.txt" "$APP_DEST/Contents/Resources/backend/"

echo "→ Signing bundle…"
codesign --deep --force --sign - "$APP_DEST"

echo "→ Copying Chrome extension…"
cp -R "$SCRIPT_DIR/yomi-subs-extension" "$BUILD_DIR/yomi-subs-extension"

echo "→ Creating Applications symlink…"
ln -s /Applications "$BUILD_DIR/Applications"

echo "→ Building DMG…"
rm -f "$DMG_OUT"
hdiutil create \
  -volname  "$VOLUME_NAME" \
  -srcfolder "$BUILD_DIR" \
  -ov \
  -format UDZO \
  -o "$DMG_OUT"

echo "→ Cleaning up…"
rm -rf "$BUILD_DIR"

echo ""
echo "  ✓ Done: $DMG_OUT"
echo ""
echo "  Distribute this file. Users:"
echo "    1. Open Yomi-Subs-v2.dmg"
echo "    2. Drag Yomi-Subs.app → Applications"
echo "    3. In Chrome: load unpacked → yomi-subs-extension/ from the DMG"
