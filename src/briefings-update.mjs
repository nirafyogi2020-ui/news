/**
 * Keep the Today feed from developing holes.
 *
 * The counters look after themselves. The briefings did not: every card on the
 * Today tab was written by hand, so the moment nobody was writing, the feed
 * stopped. It stopped on 30 August and started again on 2 September, leaving a
 * two-day hole on a page whose whole promise is that it is current.
 *
 * This fills those holes from the same feeds the rest of the site already
 * reads. It writes no prose of its own and asks no model anything: a card is
 * the newsroom's own headline, one sentence of the newsroom's own summary
 * clearly attributed, and a link to the original. That is a digest, which is
 * what the Today tab has always been.
 *
 * Rules it will not break:
 *   - a hand-written card is never edited, never reordered and never removed;
 *   - a story already linked from any card, or from the archive, is never
 *     added twice;
 *   - a day that already has coverage is left alone, so this fills gaps
 *     rather than burying the days somebody wrote properly;
 *   - nothing older than the event and nothing dated in the future.
 *
 * Run as a command. Like the figures updater it writes to the repository, so
 * importing it must never execute it.
 *
 * Exit codes: 0 always. Prints `changed=true|false` for the workflow.
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TODAY = join(ROOT, 'today.json');
const ARCHIVE = join(ROOT, 'data', 'updates');
const EVENT = join(ROOT, 'event.json');

const SITE = process.env.SITE_ORIGIN ||
  'https://nepaldisasterupdatelive.nxtimaginelabs.com';

/* How much of a day this fills, and how far back it looks. A day with this
   many cards is a covered day; the point is to remove holes, not to turn the
   feed into a wire. */
export const CARDS_PER_DAY = 3;
export const MAX_NEW_CARDS = 12;
export const LOOKBACK_DAYS = 14;

/* A headline that states the toll is the one thing this must never publish.
   The counters move every few hours; a card built around "1,204 dead" is
   wrong by dinner, and the site's own audit rightly refuses to publish a page
   whose story cards contradict its counters. The live figures card covers
   that story already, and it rewrites itself. So a story whose headline is a
   number is skipped here and left to the machinery built for it. */
const TOLL_WORDS = /(dead|death|toll|killed|missing|unaccounted|casualt|bodies|recovered|rescued|शव|मृत्यु|बेपत्ता|मृतक|उद्धार)/i;
const BIG_NUMBER = /\b\d{1,3}(?:,\d{3})+\b|\b\d{3,}\b|[०-९]/;

export function statesAToll(text) {
  const value = String(text || '');
  return TOLL_WORDS.test(value) && BIG_NUMBER.test(value);
}

/* The sources a card may be built from: the bodies that issue the figures and
   the newsrooms that have been checked for this event. A card carries the
   name, so an unfamiliar name on the front page is worse than a hole. */
export const CARD_SOURCES = new Set([
  'Nepal Police', 'NDRRMA', 'Nepal Army', 'Nepali Army', 'Armed Police Force',
  'Ministry of Home Affairs', 'The Kathmandu Post', 'Onlinekhabar',
  'Onlinekhabar (Nepali)', 'The Himalayan Times', 'Nepalnews', 'Setopati',
  'Khabarhub', 'Ratopati', 'Republica', 'MyRepublica', 'Nagarik News',
  'Kantipur', 'ReliefWeb', 'UN OCHA', 'ICIMOD'
]);

/** NPT calendar day for an instant. The feed is a Nepali news feed; a day
 *  boundary drawn in UTC would put a 9pm Kathmandu bulletin on tomorrow. */
export function nptDay(iso) {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  return new Date(t + (5 * 60 + 45) * 60000).toISOString().slice(0, 10);
}

export function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

/** One sentence, cut at a sentence end rather than mid-word, so a card never
 *  trails off in the middle of a clause. */
export function oneSentence(text, max = 240) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const stop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('। '), cut.lastIndexOf('? '));
  return (stop > 60 ? cut.slice(0, stop + 1) : cut.replace(/\s+\S*$/, '') + '…').trim();
}

/** Every story URL the site already points at, from the live feed and from
 *  the permanent archive, so nothing is published twice. */
export function usedUrls(today, archiveRecords) {
  const used = new Set();
  const add = (post) => {
    for (const source of (post && post.sources) || []) {
      if (source && source.url) used.add(String(source.url).split('#')[0]);
    }
  };
  for (const post of (today && today.posts) || []) add(post);
  for (const record of archiveRecords || []) add(record);
  return used;
}

/** Days that already read as covered: this many cards or more. */
export function coveredDays(today, archiveRecords) {
  const count = new Map();
  const seen = new Set();
  const tally = (post) => {
    if (!post || !post.time) return;
    const key = (post.id || post.title || '') + '|' + post.time;
    if (seen.has(key)) return;
    seen.add(key);
    const day = nptDay(post.time);
    if (day) count.set(day, (count.get(day) || 0) + 1);
  };
  for (const post of (today && today.posts) || []) tally(post);
  for (const record of archiveRecords || []) tally(record);
  return count;
}

function readArchive() {
  if (!existsSync(ARCHIVE)) return [];
  const out = [];
  for (const name of readdirSync(ARCHIVE)) {
    if (!name.endsWith('.json')) continue;
    try { out.push(JSON.parse(readFileSync(join(ARCHIVE, name), 'utf8'))); } catch { /* skip */ }
  }
  return out;
}

/**
 * Turn feed items into the cards a gap needs.
 *
 * Deliberately dull: it picks, it does not write. The headline is the
 * newsroom's, the sentence is the newsroom's, and the card says so.
 */
export function planCards(items, { today, archive, now = Date.now(), startedAt = null }) {
  const used = usedUrls(today, archive);
  const covered = coveredDays(today, archive);
  const floor = startedAt ? Date.parse(startedAt) : -Infinity;
  const oldest = now - LOOKBACK_DAYS * 86400000;

  const candidates = (items || [])
    .filter(item => item && item.kind !== 'video' && item.title && item.url && item.time)
    .filter(item => CARD_SOURCES.has(item.source))
    .filter(item => {
      const t = Date.parse(item.time);
      return Number.isFinite(t) && t <= now + 3600000 && t >= Math.max(oldest, floor);
    })
    .filter(item => !used.has(String(item.url).split('#')[0]))
    .filter(item => oneSentence(item.summary).length >= 60)
    .filter(item => !statesAToll(item.title))
    .sort((a, b) => Date.parse(b.time) - Date.parse(a.time));

  const added = [];
  const perDay = new Map();
  const takenTitles = new Set();
  for (const item of candidates) {
    if (added.length >= MAX_NEW_CARDS) break;
    const day = nptDay(item.time);
    if (!day) continue;
    const already = (covered.get(day) || 0) + (perDay.get(day) || 0);
    if (already >= CARDS_PER_DAY) continue;

    /* Two newsrooms relaying the same bulletin produce near-identical
       headlines. One of them is a card; the second is noise. */
    const fingerprint = slugify(item.title).slice(0, 40);
    if (takenTitles.has(fingerprint)) continue;
    takenTitles.add(fingerprint);

    perDay.set(day, (perDay.get(day) || 0) + 1);
    added.push({
      id: `auto-${day}-${slugify(item.title)}`.slice(0, 80),
      title: item.title,
      time: item.time,
      image: item.image || '',
      body: [
        oneSentence(item.summary),
        `Reported by ${item.source}. This card was filled in automatically from the source's own report, ` +
        'to keep the day from reading as empty. Follow the link for the full story.'
      ],
      sources: [{ name: item.source, url: item.url }],
      auto: true
    });
  }
  return added;
}

async function loadNews() {
  const res = await fetch(SITE + '/api/news', {
    headers: { accept: 'application/json' },
    /* A cold edge cache makes this endpoint fan out to twenty upstreams, and
       that can take the better part of half a minute. Timing out early here
       just means the gap stays open for another five minutes. */
    signal: AbortSignal.timeout(60000)
  });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const json = await res.json();
  return Array.isArray(json.items) ? json.items : [];
}

function report(changed, line) {
  console.log('  ' + line);
  console.log('changed=' + (changed ? 'true' : 'false'));
  if (process.env.GITHUB_OUTPUT) {
    writeFileSync(process.env.GITHUB_OUTPUT, `changed=${changed ? 'true' : 'false'}\n`, { flag: 'a' });
  }
}

/**
 * Drop automatic cards that state a figure, including any this script wrote
 * before it knew better. Hand-written cards are never touched: a person who
 * dated a toll deliberately gets to keep it.
 */
export function pruneStaleAutoCards(today) {
  const posts = (today && today.posts) || [];
  const kept = posts.filter(post => {
    if (!post || !post.auto) return true;
    const text = [post.title, ...(Array.isArray(post.body) ? post.body : [])].join(' ');
    return !statesAToll(text);
  });
  if (kept.length === posts.length) return 0;
  const dropped = posts.length - kept.length;
  today.posts = kept;
  return dropped;
}

export async function main() {
  let today;
  try {
    today = JSON.parse(readFileSync(TODAY, 'utf8'));
  } catch (e) {
    report(false, 'today.json unreadable: ' + e.message);
    return;
  }

  let startedAt = null;
  try { startedAt = JSON.parse(readFileSync(EVENT, 'utf8')).started || null; } catch { /* optional */ }

  let items;
  try {
    items = await loadNews();
  } catch (e) {
    report(false, 'news feed unavailable: ' + e.message);
    return;
  }

  const archive = readArchive();
  const pruned = pruneStaleAutoCards(today);
  const cards = planCards(items, { today, archive, startedAt });
  if (!cards.length && !pruned) {
    report(false, `no gap to fill (${items.length} stories read)`);
    return;
  }

  if (pruned) console.log(`  - ${pruned} automatic card(s) dropped for stating a figure`);
  today.posts = (today.posts || []).concat(cards)
    .sort((a, b) => Date.parse(b.time || 0) - Date.parse(a.time || 0));
  const newest = today.posts.map(p => p.time).filter(Boolean).sort().pop();
  if (newest) today.updated = newest;

  writeFileSync(TODAY, JSON.stringify(today, null, 2) + '\n');
  for (const card of cards) console.log(`  + ${nptDay(card.time)}  ${card.title.slice(0, 70)}`);
  report(true, `${cards.length} briefing${cards.length === 1 ? '' : 's'} filled in`
    + (pruned ? `, ${pruned} stale card(s) dropped` : ''));
}

/* Load-bearing guard, the same one the figures updater carries: this file
   writes to the repository, so importing it for a helper must never run it. */
const invoked = process.argv[1] && process.argv[1].endsWith('briefings-update.mjs');
if (invoked) main();
