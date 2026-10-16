#!/usr/bin/env bash
set -euo pipefail
npm ci --ignore-scripts --no-audit --no-fund
npm ci --ignore-scripts --legacy-peer-deps --no-audit --no-fund --prefix npm
npm test
