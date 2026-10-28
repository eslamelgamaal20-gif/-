#!/bin/bash
# Prompt Studio — macOS installer (no Creative Cloud required)
cd "$(dirname "$0")" || exit 1
echo ""
echo "=== Prompt Studio - Photoshop Panel Installer ==="
echo "Please quit Photoshop before continuing."
read -r -p "Press Enter to continue..."

echo "[1/2] Enabling unsigned extensions (PlayerDebugMode)..."
for v in 9 10 11 12; do
  defaults write "com.adobe.CSXS.$v" PlayerDebugMode 1
done
killall cfprefsd 2>/dev/null

echo "[2/2] Copying files..."
DEST="$HOME/Library/Application Support/Adobe/CEP/extensions/com.promptstudio.cep"
rm -rf "$DEST"
mkdir -p "$DEST"
cp -R ./ "$DEST/"

if [ -f "$DEST/CSXS/manifest.xml" ]; then
  echo ""
  echo "SUCCESS! Installed to: $DEST"
  echo "Open Photoshop: Window > Extensions (legacy) > EMG"
else
  echo "ERROR: files were not copied."
fi
read -r -p "Press Enter to close..."
