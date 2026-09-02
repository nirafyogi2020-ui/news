# Handoff: finish switching the figures to automatic

Written by the cloud session that built the change, for whoever picks this up
on a machine that can reach Cloudflare. Everything in here has been run and
verified except the two steps marked **BLOCKED**, which need credentials the
cloud session did not have.

State at handoff: branch `main`, commit `bc8df22`. Working tree clean, tests
green, audit clean.

---

## The one-line version

The site's counters now read themselves from the sources every five minutes,
with no model and no cost per run. Everything works except the publish, which
needs a Cloudflare token. Until that exists the repository is current and the
live domain is not.

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
- 27 tests pass. `npm run check` passes clean — it was failing three staleness
  checks before this change.
- The workflow has run twice on `main`, both green. Its log reads
  `read 88 reports from 17 sources; 2 figure(s) stated`.

---

## BLOCKED 1 — pause the Codex local schedule

**Do this before anything else, and before adding the token.**

`ROUTINE.md` has always allowed exactly one automatic publisher. The Codex
local schedule (:10 main run, :45 standby) is still that publisher, and the new
workflow is a second one. Both write the same counters. Whichever deploys last
wins, and the numbers will flip back and forth.

This has already happened once: on 2 September the live site served **781 dead**
from a Codex release while the repository said **768**. They were not reading
from the same place.

Pause both Codex runs. Leave editorial work — story cards, map, helplines,
prose — with whoever does it. Only the counters move to the workflow.

---

## BLOCKED 2 — add the Cloudflare token

Cloudflare Pages is **not** connected to this GitHub repository. `deploy.sh`
uploads directly with wrangler. A push therefore changes the repository and
nothing else. That is the whole reason the live page sat three days behind its
own sources.

In the Cloudflare dashboard: My Profile → API Tokens → Create Token, with the
**Cloudflare Pages: Edit** permission.

In GitHub: Settings → Secrets and variables → Actions → New repository secret,
named exactly `CLOUDFLARE_API_TOKEN`.

*Either* of those, not both:

- the secret, which makes the workflow publish on its own every five minutes; or
- connecting the Pages project `nepal-flood-relief` to this repository in the
  Cloudflare dashboard, after which every push deploys itself and no secret is
  needed.

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

Expect the counters to jump from 781 to **1,114 dead** and **3,916 missing**.
That is correct, not a parser fault: those figures come from sentences stating a
national total, and they match the independent bulletin site the numbers were
checked against.

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

**GitHub's minimum schedule is five minutes**, and scheduled runs are queued
rather than guaranteed. The workflow is what keeps the repository honest; the
page's own one-second polling is what makes it feel live.

**Node 20 deprecation warning** appears in the Actions log. Harmless today.
Bump `node-version` in the workflow when convenient.

---

## Verify it worked

    curl -s https://nepaldisasterupdatelive.nxtimaginelabs.com/ \
      | grep -o '<title>[^<]*</title>'

Should read 1,114 dead and a 2 September date, not 781 and 30 August.

    curl -s https://nepaldisasterupdatelive.nxtimaginelabs.com/api/figures \
      | head -c 200

Should contain a `board` key. If it still shows `live` and `ahead`, the new
Worker code has not deployed.

Then watch one scheduled run in the Actions tab. A run that correctly changes
nothing is a good run and commits nothing.
