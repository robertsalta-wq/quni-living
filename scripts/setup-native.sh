#!/usr/bin/env bash
#
# Capacitor native project bootstrap for this repo.
#
# Adds the iOS and Android native shells if missing (skips when ios/ or android/ already
# exists so re-runs are safe), then runs `npm run cap:sync` to copy the web build into
# those projects. Run from repo root: ./scripts/setup-native.sh
#
# Prerequisites: Node/npm installed; run `npm install` first if needed.
#

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [ ! -d ios ]; then
  npx cap add ios
else
  echo "ios/ already exists — skipping npx cap add ios"
fi

if [ ! -d android ]; then
  npx cap add android
else
  echo "android/ already exists — skipping npx cap add android"
fi

npm run cap:sync

echo "Native setup complete."
