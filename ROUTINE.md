# The hourly update procedure

This is the canonical procedure for keeping
nepaldisasterupdatelive.nxtimaginelabs.com current. Two scheduled agents run
it:

- **the hourly routine**, at :10 past every hour, which is the normal one; and
- **the standby routine**, at :45 past every hour, which does nothing unless
  the hourly one failed to land.

Both read this file. Keeping the procedure here rather than only inside a
routine's prompt means the two agents cannot drift apart, and a change to how
the site is edited is made once, in a file that is reviewed and committed like
any other.

Accuracy comes first. A wrong number or a wrong name on a live disaster page is
a serious failure. When unsure, leave it out or say it is unconfirmed. Being
cheap matters too: most hours there is little new, and a run that correctly
changes nothing is a good run.

## Step 1. Read first

Read `PROMPT.md` (style guide, the exact `today.json` schema, and the section
called "Staying first in search"), `today.json`, `event.json` and
`src/content.mjs`. These four are the whole editorial state of the site.

## Step 2. Find out what is new

Fetch `/api/news` and `/api/official` for orientation only, never as a
citation. Then run 3 to 6 web searches covering the last few hours: the current
event's death toll, missing count, rescue, cause, damage cost, any second-flood
or aftershock warning, and any new disaster in Nepal. Open 4 to 8 real
articles.

**Search engines lag this story by hours. Do not rely on them for the toll.**
A police bulletin reaches Facebook first, a Nepali newsroom within the hour, a
wire soon after, and the search index hours later. A search for the toll will
happily hand back yesterday's number with today's date on it. On 28 August the
search results still said 289 and 392 while the police figure was already 469.

So fetch these pages **directly by URL** every run, before searching, because
they are live blogs that are edited in place rather than republished:

- `https://www.abc.net.au/news/2026-08-28/nepal-tibet-floods-live-updates/107086974`
  (rolling, timestamped entries, quotes Nepali police figures as they land)
- `https://english.onlinekhabar.com/` and `https://kathmandupost.com/national`
  (Nepali newsrooms, front pages, follow the newest flood headline)
- `https://www.aljazeera.com/news/liveblog/` for the current flood live blog
- `https://nepaldisasterupdatelive.nxtimaginelabs.com/api/police`, which already
  scrapes nepalpolice.gov.np

Ask for the newest timestamped entries **quoted verbatim**, not summarised. A
summariser will flatten "Nepal only" and "Nepal plus Tibet" into one number,
and those are different figures. Then use search to corroborate what you found,
not to discover it.

When a figure is ambiguous about scope, say so on the page rather than picking
a reading. "Sources differ on whether this includes the China side" is honest
and costs nothing. A confidently wrong total is what does damage.

Facebook is not available to this site as a source. Reading another
organisation's Page through the Graph API needs Page Public Content Access,
which means Meta App Review and business verification, and scraping it with
somebody's personal login breaks Facebook's terms and risks that account. The
live blogs above carry the same police figures within the hour, which is why
they are the fallback.

Source order: official and primary first (Nepal Police, Nepal Army, NDRRMA,
Office of the Prime Minister, Ministry of Home Affairs, Nepal Electricity
Authority, Department of Roads, ICIMOD, USGS, UN OCHA / ReliefWeb, GDACS), then
Nepali newsrooms (Kathmandu Post, Onlinekhabar, Setopati, Ratopati, Nepalnews,
Khabarhub, Himalayan Times), then one global wire (Reuters, AP, AFP, BBC).

If nothing has genuinely changed since the last run, skip to step 7 and stop.
Do not reword existing text to look busy.

## Step 3. The counters

**The audit now enforces this step, so skipping it stops the deploy.** If the
newest story in `today.json` is more than six hours newer than `event.json`'s
`asOf`, `./deploy.sh` fails with "the figures are Nh older than the newest
story", and it fails again if `event.json` and `src/content.mjs` disagree about
the toll. Fix the figures. Never widen the limit to get past it: the limit is
the only thing standing between the site and a page that looks freshly updated
while showing yesterday's death toll, which is exactly what happened on 28
August, when the story feed said 8:00 am and the headline number was eighty
short and every other check passed.

If the figures genuinely have not moved, that is fine and normal. Move `asOf`
to the bulletin that most recently confirmed them and say so in the detail
text.

The big figures under the hero come from `event.json`, and the same figures on
about twenty article pages come from `src/content.mjs`. They do not update
themselves. If a bulletin gives a new figure, change it in both files, in the
same run, or the site shows one number at the top of the page and a different
one further down.

- `event.json`: update the matching entry in `stats` (its `value`, its `bar`,
  and its `detail`, which must name who published the figure and when). Update
  `asOf` and `asOfSource` to the bulletin the newest figure came from.
- `event.json` is also where the home page title and the search snippet come
  from. If a toll moves and `event.json` does not, the search result keeps
  showing the old number and loses the click to whoever printed the new one.
  This is the single highest-value edit in the run.
- `src/content.mjs`: update `TOLL`, `BODIES_BY_DISTRICT`, `DAMAGE` and, where
  the news warrants it, `TIMELINE` and `CAUSES`. Move `TOLL_AS_OF` when the
  death toll moved. Move `MISSING_AS_OF` only when a new missing count was
  actually published. They are separate on purpose: police often give a new
  toll without republishing a missing figure, and the pages say so out loud.
- Damage cost and relief money are two different numbers and never mix. A
  donation is not a loss.
- Where sources disagree, use the lower confirmed figure and name who confirmed
  it.

### The counters now correct themselves between runs

`/api/figures` reads the death toll straight out of the Nepal Police bulletin
and the home page raises its hero counter to that figure on its own, naming the
bulletin hour. It only ever raises a figure, never lowers one, and it does not
touch `event.json`, `src/content.mjs`, the page title or the share card. So the
run still has to do step 3 properly: the live read buys the site an hour of
honesty, it does not replace the edit.

The audit also fails the deploy when a story card still prints a toll the
police have overtaken, for example a card headlined "toll passes 389" while
`src/content.mjs` says 469. Rewrite the card. Writing "up from 389" is fine and
is the honest way to show a rising toll.

## Step 4. The story cards

`today.json` is a feed of story cards, one card per story.

- Existing card with real new information: rewrite it, set `revised` to true,
  set `time` to the time of the bulletin it now rests on.
- Existing card with nothing new: leave it exactly as it is. Do not touch its
  wording or its time.
- Genuinely separate new incident: add a new card. Two events are two cards,
  never merged.
- Micro-updates. A card does not have to be a long piece. When a figure moves
  or one concrete thing happens and there is no full story behind it yet,
  publish a short card of two or three sentences with a named source and the
  bulletin time. A new police bulletin, a highway reopening, a hydropower plant
  back online, a barrier-lake warning lifted, a confirmed rescue count, a
  relief fund total: each of those is worth a card on its own. These short
  cards are what keep the live ticker and the news sitemap moving between the
  bigger briefings, and they are the whole reason the site reads as live
  coverage rather than a page that was written once.
- Remove a card only when that story is over and no longer useful.

Set the top-level `updated` to now, Nepal time, offset `+05:45`.

**Never manufacture freshness.** Do not re-timestamp a card that has not
changed, do not write a card that says nothing new, and do not move `asOf`
forward without a bulletin behind it. The site computes every "last updated"
time from the newest real bulletin, never from the time the build ran, and that
is deliberate. Faked timestamps lose the ranking they are trying to buy, and
they stop the site being honest, which is the actual point.

### Writing rules

The site owner has rejected drafts over these.

- No em dashes and no en dashes anywhere. Use a full stop or a comma.
- Short. 4 to 8 short paragraphs per card, or two to three sentences for a
  micro-update. Short sentences, plain everyday words, a human voice. Cut every
  word that is not doing a job.
- Every number has a named source in the same sentence. No bare numbers.
- Unconfirmed things are called unconfirmed.
- Spell out what people get wrong, for example: out of contact does not mean
  dead.
- The main card ends with one clear instruction for people who can act on it.
- No disclaimer paragraph. The page already handles that.
- `sources`: outlet name and article URL only, nothing after the name. Real
  article links. Never an API endpoint, a search page or a bare homepage.
- `title`: short, plain, human, and under 75 characters. Not just a death toll
  number. It is also the headline that goes into the news sitemap and the live
  ticker, so write it as a headline a person would click, with the concrete
  fact in it rather than a vague label.
- Never state a person's name or job title unless an article you opened this
  run states it, and then use that article's exact wording. Getting a public
  figure's office wrong has happened before and is treated as a serious error.
- `image`: leave it as an empty string unless you have a direct image URL from
  a news source that you are confident loads. The site draws its own picture
  for every card, so empty is the safe and normal value. Never an AI-generated
  image.

## Step 5. Fact-check pass

Re-read `today.json`, `event.json` and `src/content.mjs` together. For every
number, name, job title and cause: can you point at a specific article you
opened this run? If not, cut it or soften it. Do the figures in the three files
agree with each other? They must. If a card would be thin or unverifiable, keep
the previous version of that card instead of guessing.

## Step 6. Build, check and publish

**First, pick up anything that was pushed while you were working.** The sandbox
clones once, at the start of the run, and a run can take ten minutes or more.
If somebody pushed a fix in that window, publishing your clone would put the
old file back on the live site, and the run would report success while quietly
undoing their work. This has actually happened: a fix to the home page was
republished stale eight minutes after it went live.

The clone also starts on a detached HEAD, so get onto the branch first:

    git checkout main 2>/dev/null || true
    git fetch origin main
    git merge --ff-only origin/main

If the fast-forward is refused, you have local edits on top of an older commit.
Do not force anything. Merge normally (`git merge origin/main`), keep the other
side's version of any file you did not edit yourself, and say in your report
that you had to merge.

Then, from the repo root, run:

    ./deploy.sh

That one command regenerates every page, redraws the share pictures, runs the
audit and only then publishes. Never run `npx wrangler pages deploy` yourself:
doing so publishes a site whose article pages still carry the previous hour's
figures.

The generator does all the search-visibility work on its own, from the files
you edited: the live ticker at the top of the home page, the `LiveBlogPosting`
structured data on the home page and on `/nepal-flood/rasuwa/live-updates/`,
`news-sitemap.xml` holding the last 48 hours, `sitemap-index.xml`, the
freshness meta tags, the share pictures with their "updated" stamp, and the
home page title and description. You do not hand-write any of it, and you must
not edit the `ssr` markers in `index.html`. Keeping `event.json` and
`today.json` correct is what makes all of it correct. After the upload,
`deploy.sh` pings IndexNow for Bing and Yandex.

If `deploy.sh` stops, it names what is wrong: a duplicate title, a title over
75 characters, a wrong canonical, a broken internal link, an orphan page, a
one-way hreflang, invalid structured data, an empty live ticker, missing or
expired live-coverage markup, a malformed news sitemap, or something that looks
like a leaked key. Fix exactly what it names and run it again. Do not work
around the audit and do not disable it.

Then commit and push everything the run changed:

    git add -A && git commit -m "hourly: <what changed> (<date> <time> NPT)" && git push origin main

## Step 7. Health check

Run this every hour, including hours where nothing changed. Fetch the live site
and confirm:

- `/` returns 200 and the toll in its hero counters matches `src/content.mjs`.
- The home page HTML contains `LiveBlogPosting`, and the live ticker block
  under the hero carries the newest bulletin's timestamp. If the ticker is
  empty, say so loudly: the page has stopped reading as live coverage.
- The home page `<title>` carries the current toll, not a stale one.
- `/sitemap.xml`, `/news-sitemap.xml`, `/sitemap-index.xml`, `/robots.txt`,
  `/feed.xml` and `/today.json` all return 200, and every entry in
  `/news-sitemap.xml` is dated within the last 48 hours.
- `/assets/og/home.png` returns 200, and the `og:image` URL in the home page
  HTML points at it. This is the picture every shared link shows.
- `/api/news` returns 200 and its `errors` field is empty. If YouTube is
  quota-limited it says so there; report it, do not try to fix it.
- Two article pages picked at random return 200 and their casualty line matches
  `src/content.mjs`.
- No page still carries a figure the news has since overtaken.

Report anything broken, stale or contradictory in the final message even if you
could not fix it.

## Step 8. Report

A few lines: what figures moved and to what, which cards you added, revised or
left alone, whether `event.json` and `src/content.mjs` were updated, the deploy
result, and anything the health check found. If the run changed nothing, say
that in one line.

## Files you may edit

`today.json`, `event.json`, `src/content.mjs`, `src/content-ne.mjs`.

Do not edit `index.html`, `src/pages.mjs`, `src/template.mjs`, `src/build.mjs`,
`src/check.mjs`, `src/og*.mjs`, `functions/`, `PROMPT.md` or this file unless a
page is actually broken, and if you do, say so clearly in the report.

## When a run is missed

The scheduled agents share a rolling usage limit with the site owner's own
sessions. When that limit is reached, a run is rejected before it starts and
the log records `rate_limit: rejected (five_hour)`. Nothing is broken and
nothing needs fixing in the repo: the standby run at :45, or the next hourly
run, picks the work up. The only lasting harm is a gap in coverage, which is
why the standby exists.
