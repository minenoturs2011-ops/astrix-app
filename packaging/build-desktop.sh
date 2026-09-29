#!/usr/bin/env bash
#
# Build the TERRA desktop launcher: bundle the built web app into a single
# self-contained executable that serves it locally and opens the browser.
#
# Usage:
#   packaging/build-desktop.sh            # build for Windows (default) + host OS
#   TARGETS="windows/amd64 linux/amd64 darwin/arm64" packaging/build-desktop.sh
#
# Output: packaging/dist-bin/TERRA-<os>-<arch>[.exe]
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRV="$ROOT/packaging/terra-server"
OUT="$ROOT/packaging/dist-bin"
TARGETS="${TARGETS:-windows/amd64}"

echo "==> Building web app (npm run build)"
( cd "$ROOT" && npm run build )

echo "==> Staging built app into launcher"
rm -rf "$SRV/dist"
cp -r "$ROOT/dist" "$SRV/dist"

mkdir -p "$OUT"
for target in $TARGETS; do
  os="${target%%/*}"
  arch="${target##*/}"
  ext=""
  [ "$os" = "windows" ] && ext=".exe"
  bin="$OUT/TERRA-$os-$arch$ext"
  echo "==> Compiling $target -> $(basename "$bin")"
  ( cd "$SRV" && GOOS="$os" GOARCH="$arch" CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o "$bin" . )
done

echo "==> Cleaning staged copy"
rm -rf "$SRV/dist"

echo "==> Done. Binaries in packaging/dist-bin/:"
ls -lh "$OUT"
