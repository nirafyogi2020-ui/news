# Handoff: finish switching the figures to automatic

Written by the cloud session that built the change, and updated on 2 September
2026 once the publish was wired up and verified against the live domain.

State: branch `main`. Working tree clean, 33 tests green, audit clean, Pages
connected to the repository, live domain serving the current figures.

---

## The one-line version

The site's counters read themselves from the sources every five minutes, with
no model and no cost per run, and every push to `main` deploys itself. Nothing
is outstanding.

---

## What is already done

- `/api/figures` resolves the dead, missing, injured, rescued and personnel
  figures across the government portals, the police bulletins and about twenty
  newsrooms.
- The home page polls it every second and repaints every counter.
- `.github/workflows/figures.yml` runs every five minutes: read the sources,
  write any moved figure, rebuild the pages and share images, run the audit,
  commit, push, publish.
- `src/figures-update.mjs` writes `event.json`, `src/content.mjs` and
  `today.json`, moves every "as of" stamp, adds one timeline row, and keeps one
  live-figures briefing card.
- 33 tests pass. `npm run check` passes clean — it was failing three staleness
  checks before this change.
- The workflow has run three times on `main`, all green. Its log reads
  `read 88 reports from 17 sources; 2 figure(s) stated`.

---

## Publishing: resolved (2 September 2026)

The Pages project `nepal-flood-relief` is now connected to this GitHub
repository, so every push to `main` deploys itself. `wrangler pages project
list` reports `Git Provider: Yes` for the project. No `CLOUDFLARE_API_TOKEN`
secret exists and none is needed; the workflow's own publish step stays skipped
by design, which is correct — a second publisher would race this one.

`deploy.sh` still works and is still the right way to publish by hand from a
machine logged into Cloudflare. It remains the only supported manual path: do
not call wrangler directly, because without `--branch main` a detached HEAD
publishes a preview deployment while reporting success.

### Subtlety worth knowing

A GitHub Actions step's own `env:` block is **not** visible to that same step's
`if:` condition. The publish step originally declared the token beside the
wrangler command it feeds, so its guard read an empty string and the step was
skipped — and would have stayed skipped after the secret was added, looking
exactly like the normal "no token yet" message. Fixed in `bc8df22` by moving
the token to the job level. If you edit that step, keep it there.

---

## Publish the current state by hand, once

Optional, but it is the fastest way to see the change live. From a checkout of
`main` on a machine logged into Cloudflare:

    git pull origin main
    npm install          # the rasteriser is an optional dependency — see below
    ./deploy.sh

`deploy.sh` runs og-build, then build, then the audit, then wrangler, then
IndexNow. Do not call wrangler directly: without `--branch main` it infers the
branch from git, and a detached HEAD publishes a *preview* deployment while
reporting success, leaving the live domain on the previous build.

Expect the counters to jump from 781 to **1,132 dead** and **5,015 missing**,
both from the Nepal Police bulletin of 17:00 on 2 September, with its district
breakdown intact. That is correct, not a parser fault: they come from sentences
stating a national total, on the most authoritative source in the list.

---

## Things that will bite you if you don't know them

**The rasteriser is an optional dependency.** If `@resvg/resvg-js` is missing,
`og-build` quietly leaves the committed pictures alone and `build` then points
every page at a generic fallback image. It looks like a successful build. Run
`npm install` first. The workflow already does.

**`npm run build` regenerates `index.html`.** It rewrites the share-image URLs
and the server-rendered briefings. It does not touch the hand-written page body
or its scripts, which is why the live-figures code lives directly in
`index.html`.

**Never hand-edit a counter.** The workflow overwrites it at the next tick, and
a figure typed from a search result is the one most likely to be hours stale.
If a counter is wrong, fix the reader in `functions/api/_figures-core.js` and
add the sentence that fooled it to `test/figures.test.mjs`.

**The audit gates the deploy.** `src/check.mjs` fails if the hero and the
article pages disagree, if a story card still prints an overtaken toll, or if
the live coverage reads as finished. A bad parse cannot reach the live domain
through the workflow.

**`event.json` counters carry two new fields.** `priorDetail` and `priorAsOf`
hold the editorial prose a counter had before the automation first touched it —
the district breakdown, the caveats. It is reprinted under the live sentence,
explicitly dated, rather than deleted. Kept once, never re-wrapped, so it cannot
grow without limit. Do not strip them.

**BIPAD is deliberately not a counter source.** `/api/bipad` reads Nepal's
national disaster portal, but its totals cover every hazard in the country over
a rolling window, and its loss records for this event are still unfiled. Zero
there means "not yet reported", never "nobody died". Wiring it into the hero
would have put "17 injured across Nepal this month" over the event's 292.

**Bikram Sambat dates are mapped for 2083 only.** `functions/api/police.js`
converts BS dates from one verified anchor and that year's month lengths. Other
years return `null`, so a bulletin shows with no timestamp rather than a wrong
one. Adding 2084 is adding one row to `BS_YEARS`.

**Never import `src/figures-update.mjs` for its helpers without care.** It
writes to the repository. It is guarded to run only when executed as a command,
and that guard is load-bearing: without it, `npm test` rewrote event.json,
src/content.mjs and today.json from live sources, and a figure reached a commit
unreviewed. `test/figures.test.mjs` has a test that fails if the guard is
removed.

**GitHub's minimum schedule is five minutes**, and scheduled runs are queued
rather than guaranteed. The workflow is what keeps the repository honest; the
page's own one-second polling is what makes it feel live.

**Node 20 deprecation warning** appears in the Actions log. Harmless today.
Bump `node-version` in the workflow when convenient.

---

## Verify it worked

    curl -s https://nepaldisasterupdatelive.nxtimaginelabs.com/ \
      | grep -o '<title>[^<]*</title>'

Should read the current toll and today's date, not 781 and 30 August.

    curl -s https://nepaldisasterupdatelive.nxtimaginelabs.com/api/figures \
      | head -c 200

Should contain a `board` key. If it still shows `live` and `ahead`, the new
Worker code has not deployed.

Then watch one scheduled run in the Actions tab. A run that correctly changes
nothing is a good run and commits nothing.
