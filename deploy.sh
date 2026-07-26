#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
wrangler pages deploy . --project-name=mobile-carb-smoke-test --commit-dirty=true
echo "OK · https://mobile-carb-smoke-test.pages.dev"
