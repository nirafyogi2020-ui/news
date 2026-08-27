#!/usr/bin/env bash
# Build the static pages, then publish everything to Cloudflare Pages.
# Always deploy with this rather than calling wrangler directly: the generated
# pages and the sitemap go stale the moment today.json or event.json changes.
set -euo pipefail
cd "$(dirname "$0")"

node src/build.mjs
node src/check.mjs

CLOUDFLARE_ACCOUNT_ID=50a5fbe4a48d72c1f8c595221ec3ac50 \
  npx wrangler pages deploy . \
    --project-name nepal-flood-relief \
    --commit-dirty=true
