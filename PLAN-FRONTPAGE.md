# Plan: make `/` the Nepal disaster front page, keep Rasuwa whole

Written 30 October 2026 by the session that updated the figures and the
Search Console file. The owner asked for this in their own words:

> make main page cover recents and keep records of older like Rasuwa too,
> the same pages still active with proper link and name, main page should
> look really good, read every rule and make sure you don't break it, and
> an auto schedule to update the live numbers from trusted verified sources,
> with no AI.

Nothing is removed. Every URL that exists today keeps working.

The owner added, later the same day:

> the current page updates automatically, second to second, really accurate
> numbers from verified sources with proper credits. The main page gets a
> fresh look like top media news: clean, desktop and mobile, content centred
> with a side column, no AI and no AI explanation text anywhere, clean and
> professional. The main page covers any Nepal disaster: casualties, deaths,
> economics, road problems, contacts, map, area photos, whatever is
> available. Interactive. Written beautifully: a catchy TLDR first, then the
> description and photos. Make it a top website.

What that means for the build:

- The Rasuwa dashboard keeps its second-by-second `/api/figures` polling and
  the source credit under every counter. Nothing about how numbers arrive
  changes; only the address does.
- The front page is a newspaper front, not a dashboard: a lead story with a
  three-line TLDR in plain words, then the live figure strip with its
  sources, then news, photos, map, roads, contacts, in a centred column with
  one side rail (same width tokens as the dashboard's `.rail-card`).
- No sentence on the site says "AI", "automatic model", "generated" or
  explains how the site is made. The About page may say the numbers are read
  from official bulletins by a scheduled program; nothing else.
- Photos are real source photographs with a credit line, never generated.
- Road status and area photos come from the newsrooms' own reports already in
  `/api/news` and from `/api/incidents` when BIPAD answers; nothing is
  invented to fill a slot. An empty slot is left out, not faked.
- Load `frontend-design` or `taste-skill` before drawing the new front page;
  keep the existing design tokens, type and spacing.

## Decisions (owner was asked, did not answer; these are the defaults taken)

1. **The Rasuwa dashboard moves to `/nepal-flood/rasuwa/`.** That address
   already exists, already ranks, and already carries the words the owner
   wants in the name. The article text that page has today becomes a section
   inside the dashboard, not a separate page. Every sub-page under
   `/nepal-flood/rasuwa/…` stays exactly where it is.
2. **`/` becomes the national front page**, in this order:
   - one card per active event with its live counters, Rasuwa first, each
     linking to its own dashboard;
   - the latest Nepal disaster news from the newsrooms the site already
     reads (`/api/news`), newest first, plus the national incident feed
     (`/api/incidents`, from bipadportal.gov.np) once that portal answers
     again (it returned HTTP 522 on 30 October);
   - emergency numbers and the official relief fund, always visible;
   - the archive: Rasuwa 2026 today, every later event after it.
3. **Google ranking is protected rather than gambled.** The Rasuwa toll stays
   in the first card on `/`, the `/` title names the active event and its
   toll, and `/nepal-flood/rasuwa/` gets the `LiveBlogPosting`, the ticker
   and the news-sitemap entries that `/` carries today. No 301 is needed
   because `/` keeps answering.

## What already exists and must be reused, not rebuilt

- `.github/workflows/figures.yml` runs `src/figures-update.mjs` every five
  minutes with **no model**: it reads the police bulletins, the government
  portals and about twenty newsrooms through `/api/figures`, applies the three
  safety rules in ROUTINE.md ("The counters update themselves"), writes
  `event.json` and `src/content.mjs`, rebuilds, audits, pushes. Pages deploys
  from the push. This is the no-AI schedule the owner asked for; it is already
  live and has run 351 times.
- The home page polls `/api/figures` every second, so a reader sees a new
  figure within seconds. That is the "instant refresh".
- The two Claude cloud routines (`trig_01GhroeAkq3duNNaeTT8uc3d` hourly and
  `trig_01LqgoV6EGZcM3aum1DGgBoC` standby) are **disabled** and stay disabled.
  No AI writes a number on this site.
- `src/pages.mjs` + `src/template.mjs` generate every static page;
  `src/check.mjs` audits every page before a deploy and must stay the gate.

## Rules that must not break (collected from memory, ROUTINE.md, PROMPT.md)

- Never remove a page or a briefing; archived URLs keep working.
- Never hand-edit a counter; the workflow owns the numbers. Fix the reader in
  `functions/api/_figures-core.js` and add a test if a number is wrong.
- Never widen `COUNTER_LAG_MAX_H` or any audit limit to get a deploy through.
- Never manufacture freshness: `dateModified` and every "updated" come from
  the newest real bulletin, never from build time.
- Damage cost and relief money are separate counters, never mixed.
- Every number names its source and time in the same sentence.
- No em dashes or en dashes anywhere in site text.
- Real source photographs only; never a generated image.
- Header is three rows and nothing else; the removed pieces listed in the
  site-chrome memory stay removed (status strip, left column, gear, five-door
  help nav, red emergency banner, Watch tab clutter).
- Story cards: same height, typographic cover when no photo, reader overlay
  that never navigates away, `HOME_MAX` 7 on the front.
- Red only where a number means someone died. No vibrant orange.
- Video player: muted until a real tap, full-bleed by oversizing the iframe.
- hreflang pairs must be reciprocal; every page has one `<h1>`, a title under
  75 characters, a canonical and a description.
- Keep `google31bf6ceb680a77c3.html` and its function; Search Console needs it.
- Deploy only with `./deploy.sh` or a push to `main`; never wrangler directly.
- Pull with `--rebase --autostash` before pushing; the figures workflow pushes
  every few minutes. See the git-stale-locks memory for the LFS fix.

## Build order for the next session

1. Read this file, `ROUTINE.md`, `PROMPT.md`, `src/build.mjs`,
   `src/check.mjs`, `src/template.mjs`, and the memory notes
   `site-chrome-architecture`, `static-site-generator`, `live-coverage-seo`,
   `event-json-architecture`.
2. Move the dashboard: `index.html` is served at `/nepal-flood/rasuwa/` as
   well as the data it needs; the generator stops writing the article hub
   there and instead injects that article's sections into the dashboard's
   Overview tab. All `ssr:` markers keep working. Canonical, hreflang, OG and
   JSON-LD on that page point at `/nepal-flood/rasuwa/`.
3. Write the new `/` in `src/pages.mjs` with the design rules above. Its
   live numbers come from `/api/figures` on the client and from `event.json`
   at build time, like the dashboard does now.
4. Move the audit's `/`-only checks (ticker, `LiveBlogPosting`, title toll,
   `og:image`, coverageEndTime) to the Rasuwa dashboard page, and add the
   front page's own checks (one `<h1>`, canonical, every event card links to
   a page that exists). Do not loosen any limit.
5. Extend `src/figures-update.mjs` only if a second event exists; until then
   Rasuwa is the one active event and nothing changes in the workflow.
6. `node src/build.mjs && node src/check.mjs && npm test`, then check the
   phone and desktop layout in the browser pane, then push and verify the
   live site: `/`, `/nepal-flood/rasuwa/`, two sub-pages, `/ne/`,
   `/sitemap.xml`, `/news-sitemap.xml`, `/google31bf6ceb680a77c3.html`.
7. Report in plain words: what moved, what the new front shows, what was
   verified live.
