# Today — how the story cards are made

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

7. Validate, deploy, commit, push. (Steps in the routine config.)

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

## today.json shape

```json
{
  "updated": "2026-08-27T11:45:00+05:45",
  "posts": [
    {
      "id": "rasuwa-flood",
      "title": "Short, plain headline. Not just a number.",
      "source": "Nepal Police",
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
| `source` | the single main source, shown by the card avatar |
| `time`   | when this card was last meaningfully updated (Nepal time, `+05:45`) |
| `image`  | a direct image URL from a news source **only if it loads**; otherwise `""` |
| `body`   | array of short paragraphs |
| `sources`| array of `{ name, url }`, real article links, names only |
| `revised`| `true` if this run changed an existing card; omit or `false` otherwise |
