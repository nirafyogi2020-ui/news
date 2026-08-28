# READ THIS FIRST — the site is now generated

Editing `today.json` or `event.json` is no longer the whole job. The site has
real crawlable pages (`/nepal-flood/rasuwa/`, `/nepal-flood/emergency-numbers/`,
`/ne/`, `/updates/<date>-<slug>/` and so on). Those pages, the sitemap, the
robots.txt and the briefings baked into `index.html` are **generated** from the
JSON files and from `src/content.mjs`.

**Always deploy with `./deploy.sh`.** It runs the generator, runs the audit,
and only then publishes:

```
./deploy.sh
```

Never run `wrangler pages deploy` on its own. Doing so publishes a site whose
article pages still carry the previous day's casualty figures.

`./deploy.sh` refuses to publish if the audit finds a duplicate title, a wrong
canonical, a broken internal link, an orphan page, a one-way hreflang, invalid
structured data, or something that looks like a leaked API key. If it stops,
fix what it names and run it again.

## Where each kind of fact lives

| What you are changing | File to edit |
|---|---|
| Today's briefing cards | `today.json` |
| The counters under the hero | `event.json` |
| Casualty, damage and cause figures used across all the article pages | `src/content.mjs` |
| Nepali page wording | `src/content-ne.mjs` and `src/pages-ne.mjs` |

**A new figure goes in all three of the first three files, in the same run.**
`today.json` alone is not enough. The counters under the hero come from
`event.json`, and the same figures on about twenty article pages come from
`src/content.mjs`. Updating only the cards is what left the site showing 289
dead at the top of the page and 359 further down.

`src/content.mjs` is the one that matters most. `TOLL`, `BODIES_BY_DISTRICT`,
`DAMAGE`, `TIMELINE` and `CAUSES` there feed roughly twenty pages in two
languages at once. Change the number there and it changes everywhere, together
with its "as of" line.

**`TOLL_AS_OF` and `MISSING_AS_OF` are separate on purpose.** When a police
bulletin gives a new death toll but no new missing figure, move only the one
it actually updated. The pages then tell readers that the missing count is the
older of the two, which is true and useful.

Briefings are archived permanently in `data/updates/`. Once a briefing has been
published it keeps its URL forever, and the generator marks it "overtaken" with
a link to the newest one as soon as a later briefing exists. Never delete a
file from `data/updates/`; a URL that disappears is worse than no URL.

---

# How the daily update is made

The **Today** section (its own tab, and a copy on the home page) is a feed of
short story cards, built the same way as the Live feed cards. It is rebuilt
through the day by a scheduled cloud agent. Output is one file: `today.json`
at the repo root. The site reads it and draws the cards.

One card = one story / one incident. Not one card per source, not one giant
daily blob. If two things are genuinely separate news, they are two cards.

## Every run

1. Read `today.json` (the current cards) and this file.

2. Get the latest. Search the web (last 24h), open real news articles, and
   pull the site's own feed at `/api/news` for context. Prefer official and
   primary sources first (Nepal Police, Nepal Army, NDRRMA, Office of the PM,
   ICIMOD, USGS, ReliefWeb), then Nepali newsrooms, then one global wire.

3. For each existing card:
   - Real new information since it was written  ->  rewrite it, set `revised: true`,
     bump `time` to now.
   - Nothing concrete has changed  ->  leave the card exactly as it is.

4. New incident or clearly separate story  ->  add a new card.

5. Drop a card only when the story is clearly over and no longer useful.

6. Set the top-level `updated` to now (Nepal time, `+05:45`).

7. Validate, then run `./deploy.sh` (generator + audit + publish), then
   commit and push. Never deploy with wrangler directly.

## Staying first in search — what every run must also do

A breaking disaster query is ranked partly on freshness. Google looks for the
page that changed most recently and has live coverage markup on it. Everything
below is what keeps that true. Most of it is automatic, but two steps are not,
and they are the two that matter.

**1. Bump `event.json` whenever an official figure changes.** The home page
title, the meta description, the share card and the hero figures are all
generated from `event.json`. If Nepal Police publish a new toll and you update
only `today.json`, the search result still shows yesterday's number and loses
the click to whoever printed the new one. Update `stats`, `asOf` and
`asOfSource` in the same run, then rebuild.

**2. Publish a micro-update when a figure moves, even with no full story.**
A card does not have to be a long piece. Two or three sentences with a named
source and a time is a legitimate update, and it is what keeps the live ticker
and the news sitemap moving between the bigger briefings. Examples of things
worth a micro-update on their own: a new police bulletin, a road or highway
reopening, a hydropower plant back online, a barrier-lake warning lifted, a
confirmed rescue count, a relief fund total.

**Never manufacture freshness.** Do not re-timestamp a card that has not
changed, do not write a card that says nothing new, and do not move `asOf`
forward without a bulletin behind it. `dateModified` across the whole site is
computed from the newest real bulletin time, never from the time the build ran,
and that is deliberate. A site caught inflating timestamps loses the ranking it
was trying to buy, and it also stops being honest, which is the actual point.

**What happens on its own, so you do not have to do it.** `./deploy.sh` runs
the generator, and the generator writes:

- the live ticker at the top of the home page, newest first, one bold
  timestamp per line, in plain HTML that works with JavaScript off;
- `LiveBlogPosting` structured data on the home page and on
  `/nepal-flood/rasuwa/live-updates/`, listing each briefing as a timestamped
  `liveBlogUpdate`, with a `coverageEndTime` three days ahead of the newest
  bulletin so the coverage reads as still running;
- `news-sitemap.xml`, the Google News sitemap, holding only what was published
  in the last 48 hours, plus `sitemap-index.xml` covering both sitemaps;
- `og:updated_time`, `article:modified_time` and `news_keywords`;
- the home page title and description, written from `event.json`.

Then `src/check.mjs` blocks the deploy if the ticker rendered empty, if the
live coverage markup is missing or its `coverageEndTime` has fallen into the
past, if the news sitemap is empty or malformed, or if the page's freshness
tags disagree with its structured data. After the upload, `src/indexnow.mjs`
tells Bing and Yandex the URLs changed. Google has no such ping and goes by the
sitemap, which is why the sitemaps are kept correct rather than merely present.

**If the audit fails, fix it. Do not deploy around it.** It is the only thing
standing between a bad build and the live site.

## Writing rules — read these, they matter

- **No em dashes. Ever.** Use a full stop or a comma. Same for the "–" dash.
- **Short.** Each card is 4 to 8 short paragraphs. Short sentences. Plain,
  everyday words. Write like a person telling you what happened, not like a
  report. Cut every word that is not doing a job.
- **Every number gets a source in the same sentence.** "Nepal Police said 162
  dead." Never a bare number.
- Where sources disagree, use the **lower confirmed** figure and say who
  confirmed it.
- Unconfirmed things are said to be unconfirmed. "ICIMOD says the cause is not
  confirmed."
- Spell out the things people get wrong. "Out of contact does not mean dead."
- End the main card with one clear instruction for people who can act on it.
- **No disclaimer paragraph.** Do not add "this is a summary, numbers change,
  check the sources" text. It is already handled by the page.
- **Sources: names only.** `[{ "name": "Nepal Police", "url": "..." }]`. No
  description after the name, no "— toll update", nothing. Just the outlet
  name and the link to the actual article.
- **No single-source badge.** Cards carry no `source` field and no avatar.
  A story is built from several sources at once, so the card is stamped with
  a date and a Nepal time instead of one outlet's name.
- **Do not repeat yourself across runs.** If a paragraph already says a
  thing, the next paragraph does not say it again in other words. Rewrite
  the card, do not bolt sentences onto it.
- **Money: keep damage and relief apart.** The cost of the damage and the
  money raised or released for relief are two different numbers. Never
  present a donation as a loss.

## today.json shape

```json
{
  "updated": "2026-08-27T11:45:00+05:45",
  "posts": [
    {
      "id": "rasuwa-flood",
      "title": "Short, plain headline. Not just a number.",
      "time": "2026-08-27T11:30:00+05:45",
      "image": "",
      "body": ["short para", "short para", "..."],
      "sources": [
        { "name": "Nepal Police", "url": "https://..." },
        { "name": "ICIMOD", "url": "https://..." }
      ],
      "revised": true
    }
  ]
}
```

| field    | what it is |
|----------|-----------|
| `id`     | stable slug for the story, so the next run can find and update this card |
| `title`  | the card headline, short and plain |
| `time`   | the time the figures in the card are from (Nepal time, `+05:45`). The card is stamped with this, e.g. "Today, 08:15 NPT" |
| `image`  | a direct image URL from a news source **only if it loads**; otherwise `""` |
| `body`   | array of short paragraphs |
| `sources`| array of `{ name, url }`, real article links, names only |
| `revised`| `true` if this run changed an existing card; omit or `false` otherwise |


---

# event.json — the event the site is covering

This site is not hard-wired to one disaster. The hero headline, the hero
standfirst, and the whole row of counters under it are read from
`event.json` at the repo root. Covering a different event means editing that
file. No markup changes, no code changes.

If `event.json` is missing or unreadable, the page keeps the fallback markup
that is already in `index.html`, so the site never breaks because of it.

## Shape

```json
{
  "id": "rasuwa-flood-2026",
  "name": "Rasuwa flood",
  "where": "Rasuwa, Nuwakot and downstream, Nepal",
  "started": "2026-08-26T09:05:00+05:45",
  "status": "active",
  "headline": "Rasuwa flood, live",
  "lede": "One or two plain sentences: what happened, and what this page is for.",
  "numbersTitle": "Where the numbers stand",
  "numbersNote": "Rasuwa flash flood, 26 August 2026",
  "asOf": "2026-08-27T08:15:00+05:45",
  "asOfSource": "Nepal Police bulletin",
  "stats": [
    {
      "icon": "dead",
      "value": "165",
      "tone": "critical",
      "label": "confirmed dead",
      "bar": 100,
      "detail": "Who said it, when, and why it may still move."
    }
  ]
}
```

| field | what it is |
|-------|-----------|
| `started` | when the event began, Nepal time. Drives the "Day N" chip and the day counter. |
| `numbersNote` | which event these counters describe. Printed under the heading. |
| `asOf` / `asOfSource` | the time the figures are from and who published them. Printed on the same line. |
| `stats` | the counter tiles, in the order they should appear. Four to eight is right. |

Per stat: `icon` is one of `dead`, `missing`, `power`, `people`, `day`,
`money`, `relief`, `home`, `quake`. `tone: "critical"` prints the number in
red, for casualty figures only. `small: true` is for text values like
"Rs 200bn" that do not fit at full size. `bar` is 0 to 100 and only sets the
width of the line under the tile. `detail` is what appears when the tile is
tapped: say who published the figure and when.

Two `stats` entries may carry an `id`: `econ-loss` and `relief-fund`. Those
two are also watched by the live feed, which raises the printed figure if a
source reports a larger one. Everything else is exactly what you write.

`value` may be the literal string `auto:day`, which the page replaces with
"Day N" counted from `started`.

## Rules

- Damage and relief money are separate tiles and must never be mixed. A
  donation is not a loss.
- Every `detail` names its source. No bare numbers.
- Where two sources disagree, use the lower confirmed figure and say who
  confirmed it.
- When a new event takes over, write a new `event.json` and start
  `today.json` fresh. Keep the Help tab alone: those hotline numbers do not
  change between events.
- A new event also needs its own pages under `src/pages.mjs`, and the previous
  event's pages should keep their URLs with `statusPill: 'archive'` rather than
  being deleted. Old coverage stays useful; it just must not present itself as
  live.


---

# The share pictures

Every page has its own link preview card at `/assets/og/<slug>.png`, plus a
vertical `-story.png` for Instagram and Facebook stories, and every briefing
also has a `-thumb.png` tile that its story card shows in the grid. They are
drawn by `src/og-build.mjs` from `src/og.mjs`, which `./deploy.sh` runs before
the page build.

**A briefing's picture is a real photograph, never a drawing.** `src/photo.mjs`
walks the articles that briefing cites, reads the picture each newsroom chose
for its own link preview, downloads the first usable one, and caches it in
`assets/photos/` with the outlet's name. `src/og.mjs` then sets the headline
over it with a border and prints "Photo: <outlet>" in the corner. This site
does not draw its own illustration of a news event. Where no source yields a
usable photograph the card is simply typographic.

That makes the source list do double duty: a briefing whose sources are real
articles from newsrooms that publish photographs gets a photograph, and one
built from bare homepages and PDFs does not.

The section and home cards carry the current death toll and missing count,
read from `src/content.mjs`, so they redraw themselves when the figures move.
The URL carries the file's modification time as `?v=`, because Facebook and
WhatsApp cache a preview against its URL and would otherwise keep showing
yesterday's number.

Rasterising uses `@resvg/resvg-js`, an optional dependency, handed the font
files in `assets/fonts` so a card drawn on the hourly agent's machine looks
the same as one drawn on a laptop. If the install is ever missing, the build
still writes the SVGs, leaves the committed PNGs alone, and the pages fall
back to `/og-image.png`. It never fails a deploy.

These are other newsrooms' photographs. The credit on the picture and the link
to the article are not optional; if an outlet asks for a picture to come down,
delete the file from `assets/photos/` and its entry in
`assets/photos/index.json`, and the next build falls back to the typographic
card on its own.

---

# Adding a page

More real pages is the whole SEO strategy: a page per question people
actually ask, each one linked from somewhere. To add one, write the function
in `src/pages.mjs`, add it to the `pages` array in `src/build.mjs` **and** to
the list in `src/og-build.mjs`, and link to it from at least one existing
page. A page nothing links to is an orphan and will not be indexed properly,
however good it is.

Two rules the audit enforces and that are easy to trip: a `<title>` must be
75 characters or fewer, and a meta description must be between 70 and 200.
