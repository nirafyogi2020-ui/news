#!/usr/bin/env bash
# Build the static pages, then publish everything to Cloudflare Pages.
#
# --branch main is not optional. Without it wrangler infers the branch from
# git, and a run that happens to be on a detached HEAD publishes a preview
# deployment instead of production. The deploy then reports success while the
# live domain keeps serving the previous build.
# Always deploy with this rather than calling wrangler directly: the generated
# pages and the sitemap go stale the moment today.json or event.json changes.
set -euo pipefail
cd "$(dirname "$0")"

# The share pictures are drawn from the current figures, so they are redrawn
# before the pages that point at them. The rasteriser is an optional
# dependency; install it quietly if this machine has not got it yet. A failure
# here is not fatal: og-build falls back to leaving the committed PNGs alone.
if [ ! -d node_modules/@resvg ]; then
  npm install --no-audit --no-fund --silent || true
fi

node src/og-build.mjs
node src/build.mjs
node src/check.mjs

CLOUDFLARE_ACCOUNT_ID=50a5fbe4a48d72c1f8c595221ec3ac50 \
  npx wrangler pages deploy . \
    --project-name nepal-flood-relief \
    --branch main \
    --commit-dirty=true

# Tell Bing and Yandex the pages changed, rather than waiting for their own
# re-crawl. Google does not use IndexNow; it goes by the sitemap. A failure
# here is not a deploy failure, so it never blocks a publish.
sleep 3
node src/indexnow.mjs || true
