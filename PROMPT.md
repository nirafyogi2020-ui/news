# Today's summary — how to make one

This is the recipe for the **Today** tab on the site. One briefing a day.
Written by hand in a normal Claude chat (cheapest model that holds the
quality — Haiku is usually enough; step up only if the draft is sloppy).
No API, no automation. The output is a single file: `today.json` at the
repo root. The site reads it and draws the scrollable post.

---

## Why the style on the reference posts works

The Facebook posts we are copying (Rupesh Parajuli) read as accurate
because of a few hard habits, not because of good writing:

1. **Every number is attributed in the same sentence.** "Nepal Police put
   the confirmed dead at 157" — never a bare "157 dead". If no one is
   named, it does not go in.
2. **The warning comes first, the damage second.** Lead with what might
   happen next (the actionable part), then a hard pivot line, then the
   record of what already happened.
3. **Unconfirmed things are said to be unconfirmed, in plain words.**
   "An ice avalanche is the suspected trigger. ICIMOD says the cause is
   not confirmed."
4. **Definitions are spelled out where people get them wrong.** "Out of
   contact is not the same as missing."
5. **Short declarative sentences. No adjectives, no emotion, no drama.**
   "The Trishuli rose nine metres at Galchchi in thirty minutes."
6. **It ends with one concrete instruction** for the people who can act on
   it: "If you have family along the Bhote Koshi, get them off the banks
   tonight."
7. **Sources are listed, not hidden.**

Our version keeps all of that and adds: a key-facts table, real source
links, and a standing disclaimer that numbers move and readers must check
the originals.

---

## Steps

1. **Gather sources.** Aim for 3–6, best first:
   - Primary / official: ICIMOD, NDRRMA, Nepal Police, Office of the PM,
     USGS, ReliefWeb, GDACS.
   - Nepali newsrooms: Kathmandu Post, Onlinekhabar, Setopati, Ratopati.
   - One or two global wires for cross-check: CNN, Reuters, AP, BBC.
   - The site's own aggregator is a shortcut:
     `https://nepaldisasterupdatelive.nxtimaginelabs.com/api/news`
2. **Cross-check every number.** Where sources disagree, use the **lower
   confirmed** figure and say who confirmed it and when.
3. **Write the body** as 6–10 short paragraphs in this order:
   - `lead`: `"Breaking, <Month Day>."` (its own field)
   - the warning / what may happen next, attributed
   - the pivot line: *"That is the warning. This is what the first wave
     already did."* (adapt wording to the day)
   - the chronology with hard, attributed numbers
   - who / what is still unaccounted for
   - suspected cause, clearly flagged as unconfirmed
   - monitoring / data gaps / uncertainty
   - human count with the definition caveat
   - one direct instruction for affected families
4. **Fill `keyFacts`** — 5–9 rows, each with `label`, `value`, and an
   optional `note` for the attribution or caveat.
5. **Pick one image.** A real, clean, professional photo of the region —
   not AI-generated. Public-domain / CC is safest (Wikimedia Commons
   `Special:FilePath`, NASA, USGS). Landscape or satellite of the affected
   valley. Put the direct image URL in `image` and a plain `imageAlt`.
   The site draws the red bar, tag, title and source line over it — do not
   bake text into the image.
6. **Write the `disclaimer`** (usually the standing one is fine, tweak if
   the day needs it).
7. **Set `updated`** to now in Nepal time (`+05:45`).
8. **Save `today.json`, deploy, check the Today tab.**

---

## today.json fields

| field         | what it is |
|---------------|-----------|
| `date`        | ISO date, `YYYY-MM-DD` |
| `displayDate` | e.g. `August 26, 2026` — shown top-right on the image |
| `updated`     | ISO datetime with `+05:45` offset |
| `tag`         | small chip on the image, e.g. `NEPAL · RASUWA FLOOD` |
| `kicker`      | small label top-left on the image, e.g. `Daily brief · Day 1` |
| `title`       | the headline, drawn big over the lower image |
| `image`       | direct URL to one photo |
| `imageAlt`    | plain description of the photo |
| `lead`        | `"Breaking, <Month Day>."` |
| `body`        | array of paragraph strings |
| `keyFacts`    | array of `{ label, value, note? }` |
| `sources`     | array of `{ name, url }` |
| `disclaimer`  | one paragraph, shown at the foot |

## Rules, short

- No number without a named source in the same sentence.
- Unconfirmed = say "not confirmed" or "suspected".
- Lower confirmed figure when sources disagree.
- Short sentences. No adjectives. No emotion.
- End on one concrete instruction.
- Never state something as done that was not checked against a source.
