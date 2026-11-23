import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import vm from 'node:vm';

import {
  cleanHeadline, isOffSubject, hasBannedWord, hasDash, isNepalDisasterHeadline, isRoadHeadline,
  frontNews, roadNews, frontTitle, tldrLines, daysSince, figureNumber, headlineVerdict,
} from '../src/front-rules.mjs';
import { frontPage, rasuwaDashboard, rasuwaBriefing } from '../src/pages.mjs';
import { emittedAssets } from '../src/template.mjs';

const event = JSON.parse(readFileSync(new URL('../event.json', import.meta.url), 'utf8'));

/* -- house style on reprinted headlines ------------------------------------- */

test('an em dash becomes a comma and a joining en dash a hyphen', () => {
  assert.equal(cleanHeadline('Toll rises — police say 12 dead'), 'Toll rises, police say 12 dead');
  assert.equal(cleanHeadline('स्याफ्रुबेँसी–खाम्जिङ जोड्ने काठेपुल सञ्चालन'), 'स्याफ्रुबेँसी-खाम्जिङ जोड्ने काठेपुल सञ्चालन');
  assert.equal(hasDash(cleanHeadline('a – b')), false);
});

test('a headline that names the tooling is left out, not softened', () => {
  assert.equal(cleanHeadline('AI tool predicts floods in Nepal'), '');
  assert.equal(cleanHeadline('New model of the glacier collapse'), '');
  assert.equal(cleanHeadline('Village rebuilt after the flood'), 'Village rebuilt after the flood');
  assert.equal(hasBannedWord('Airport reopens'), false, 'the word has to stand alone');
  assert.equal(hasBannedWord('Modelling agency'), false);
});

test('disaster and road headlines are told apart from the rest of a newsroom feed', () => {
  assert.equal(isNepalDisasterHeadline('Mustang produces apples worth over Rs 1.14 billion'), false);
  assert.equal(isNepalDisasterHeadline('Flood, landslide trigger water shortage in Beni, Myagdi'), true);
  assert.equal(isNepalDisasterHeadline('मनाङमा वर्षा र हिमपातको सम्भावना'), true);
  assert.equal(isNepalDisasterHeadline('Spanish train crash death toll rises to 69 as rescuers search for victims'), false);
  assert.equal(isNepalDisasterHeadline('546 missing on the China side after the Rasuwa flood'), true);
  assert.equal(isRoadHeadline('Beni-Darbang-Muna road reconstruction estimated to cost Rs 70 million'), true);
  assert.equal(isRoadHeadline('Loss and Damage Fund approves grant'), false);
});

test('frontNews keeps Nepal press newest first, drops videos, duplicates and off-topic lines', () => {
  const items = [
    { title: 'Apples stranded in warehouses', url: 'https://a.example/1', source: 'A', time: '2026-10-29T04:40:29.000Z', kind: 'press', region: 'nepal' },
    { title: 'Floods block highway in Gorkha', url: 'https://a.example/2', source: 'A', time: '2026-10-29T05:00:00.000Z', kind: 'press', region: 'nepal' },
    { title: 'Floods block highway in Gorkha', url: 'https://a.example/2', source: 'A', time: '2026-10-29T05:00:00.000Z', kind: 'press', region: 'nepal' },
    { title: 'Flood rescue footage', url: 'https://youtube.com/watch?v=x', source: 'TV', time: '2026-10-30T05:00:00.000Z', kind: 'video', region: 'nepal' },
    { title: 'Flood in Brazil kills 12', url: 'https://b.example/3', source: 'B', time: '2026-10-30T06:00:00.000Z', kind: 'press', region: 'global' },
    { title: 'Landslide — two missing in Myagdi', url: 'https://a.example/4', source: 'A', time: '2026-10-30T01:00:00.000Z', kind: 'press', region: 'nepal', image: 'http://insecure.example/x.jpg' },
  ];
  const out = frontNews(items);
  assert.deepEqual(out.map(i => i.url), ['https://a.example/4', 'https://a.example/2']);
  assert.equal(out[0].title, 'Landslide, two missing in Myagdi');
  assert.equal(out[0].image, '', 'an http picture is not used');
  assert.deepEqual(roadNews(out).map(i => i.url), ['https://a.example/2']);
});

/* -- the words at the top ---------------------------------------------------- */

test('the front title carries the toll and stays under 75 characters', () => {
  const t = frontTitle(event);
  assert.ok(t.length < 75, t);
  assert.match(t, /\d/);
  assert.match(t, /^Nepal Disaster News Today: /);
  const long = { ...event, name: 'An absurdly long event name that should never fit inside a search result title' };
  assert.ok(frontTitle(long).length < 75);
});

test('the three lines are built from the event and name the source', () => {
  const lines = tldrLines(event, '14 October 2026, 12:00 pm NPT');
  assert.equal(lines.length, 3);
  assert.equal(lines[0].k, 'What happened');
  assert.match(lines[1].t, /^Nepal Police: [0-9,]+ confirmed dead and [0-9,]+ listed missing in Nepal, as of \d+ \w+ \d{4}/);
  assert.match(lines[1].t, /Missing does not mean dead\.$/);
  assert.match(lines[2].t, /100 or 112/);
  for (const l of lines) { assert.equal(hasDash(l.t), false); assert.equal(hasBannedWord(l.t), false); }
});

test('days and figures parse as the page expects', () => {
  assert.equal(daysSince('2026-08-26T09:00:00+05:45', Date.parse('2026-08-26T12:00:00+05:45')), 1);
  assert.equal(daysSince('2026-08-26T09:00:00+05:45', Date.parse('2026-08-28T12:00:00+05:45')), 3);
  assert.equal(daysSince('not a date'), null);
  assert.equal(figureNumber('1,456'), 1456);
  assert.equal(figureNumber('Rs 18.14bn'), 1814);
  assert.equal(figureNumber(''), null);
});

/* -- the built pages --------------------------------------------------------- */

const ctx = {
  event,
  today: { updated: event.asOf, posts: [] },
  modified: event.asOf,
  buildDay: '2026-10-30',
  posts: [
    { slug: '2026-10-30-test', url: '/updates/2026-10-30-test/', title: 'Road to Syabrubesi reopens – police', time: '2026-10-30T01:00:00.000Z', body: ['x'], sources: [] },
    { slug: '2026-10-29-test', url: '/updates/2026-10-29-test/', title: 'A model village is generated', time: '2026-10-29T01:00:00.000Z', body: ['x'], sources: [] },
  ],
};
const news = [
  { title: 'Highway to Rasuwa reopens after landslide — police', url: 'https://kathmandupost.com/x', source: 'Kathmandu Post', time: '2026-10-30T02:00:00.000Z', kind: 'press', region: 'nepal', image: 'https://kathmandupost.com/x.jpg' },
  { title: 'AI predicts the next flood', url: 'https://example.com/ai', source: 'X', time: '2026-10-30T03:00:00.000Z', kind: 'press', region: 'nepal' },
];
const photos = {
  'updates-2026-08-27-rasuwa-flood': { file: 'updates-2026-08-27-rasuwa-flood.jpg', credit: 'ICIMOD' },
  'updates-2026-10-30-test': { file: 'test.jpg', credit: 'Setopati' },
  'updates-2026-10-29-test': { file: 'test2.jpg', credit: 'Setopati' },
};

test('the front page has one h1, a root canonical, the toll, and keeps the house rules', () => {
  const pg = frontPage(ctx, { news, photos, events: [event] });
  assert.equal(pg.path, '/');
  assert.ok(pg.title.length < 75);
  assert.ok(pg.description.length >= 70 && pg.description.length <= 200, pg.description);
  assert.equal((pg.html.match(/<h1[\s>]/g) || []).length, 1);
  assert.match(pg.html, /<link rel="canonical" href="https:\/\/nepaldisasterupdatelive\.nxtimaginelabs\.com\/">/);
  assert.match(pg.html, /data-live="dead">[0-9,]+</);
  assert.match(pg.html, /<a data-event-card href="\/nepal-flood\/rasuwa\/">/);
  assert.match(pg.html, /Photograph: ICIMOD/);
  assert.match(pg.html, /Highway to Rasuwa reopens after landslide, police/);
  assert.doesNotMatch(pg.html, /AI predicts/);
  assert.doesNotMatch(pg.html, /model village/);
  const visible = pg.html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ');
  assert.equal(hasDash(visible), false, 'no em or en dash in visible text');
  assert.equal(hasBannedWord(visible), false, 'no banned word in visible text');
  /* Red is for the dead only: the missing tile is not marked critical. */
  assert.match(pg.html, /<article class="fp-fig is-critical" data-metric="dead">/);
  assert.match(pg.html, /<article class="fp-fig" data-metric="missing">/);
});

test('an empty slot is left out rather than filled', () => {
  const pg = frontPage(ctx, { news: [], photos: {}, events: [event] });
  assert.doesNotMatch(pg.html, /id="latest"/);
  assert.doesNotMatch(pg.html, /id="photos"/);
  assert.doesNotMatch(pg.html, /Roads and access/);
  assert.match(pg.html, /id="figures"/);
  assert.match(pg.html, /id="help"/);
});

test('the dashboard metadata and the folded briefing describe the same page', () => {
  const d = rasuwaDashboard(ctx);
  assert.equal(d.path, '/nepal-flood/rasuwa/');
  assert.match(d.title, /^Nepal Flood Live: [0-9,]+ dead, [0-9,]+ missing in Rasuwa, \d+ \w+$/);
  assert.ok(d.title.length < 75);
  assert.equal(d.html, null);
  assert.deepEqual(d.alternates.map(a => a.hreflang), ['en', 'ne']);
  const b = rasuwaBriefing(ctx);
  assert.match(b, /<h3>What happened<\/h3>/);
  assert.match(b, /<table class="data-table">/);
  assert.doesNotMatch(b, /<h1|<h2>What happened/);
});

test('off-subject stories are dropped, road and weather reports are not', () => {
  assert.ok(isOffSubject('Shark Tank Nepal Season 2 to premiere on December 2'));
  assert.ok(isOffSubject('नयाँ चलचित्र मंसिरमा प्रदर्शन हुने'));
  assert.ok(!isOffSubject('Concert raises funds for Rasuwa flood victims'));
  assert.ok(!isOffSubject('Film crew helps rescue stranded villagers after landslide'));
  assert.ok(isOffSubject('Mustang produces apples worth over Rs 1.14 billion'));
  assert.ok(isOffSubject('World Bank projects Nepal economic growth to slow'));
  assert.ok(!isOffSubject('100,000 kg of Manaslu apples stranded after floods wash away transport'));
  assert.ok(!isOffSubject('BP Highway obstructed'));
  assert.ok(!isOffSubject('Light Rain and Snowfall Likely in Parts of Nepal'));
  // A figurative "landslide" in the share market is still a market story.
  assert.ok(isOffSubject('विश्वभरिका टेक कम्पनीको सेयरमा किन गयो पहिरो ?'));
  assert.ok(isOffSubject('Tech stocks slide as Wall Street sells off'));
  assert.ok(!isOffSubject('Police shares list of missing after Rasuwa flood'));
  assert.ok(!isOffSubject('Relief stocks run low in flood-hit Rasuwa'));
  assert.ok(isOffSubject('सञ्जाल र क्याफेमा उम्मेदवारको घुइँचो, एजेन्डा गयल'));
  assert.ok(isOffSubject('रौतहटमा अज्ञात समूहको गोली प्रहारबाट एक जना घाइते'));
  assert.ok(isOffSubject('Should Nepal turn its hydropower surplus into digital wealth?'));
  assert.ok(!isOffSubject('Election postponed in flood-hit Rasuwa villages'));
  // Crypto stories stay out even when they stand next to a disaster word.
  assert.ok(isOffSubject('Bitcoin mining at the flood-hit Rasuwa hydropower plant'));
  assert.ok(isOffSubject('Crypto mining with Nepal\'s surplus hydropower after the monsoon'));
  assert.ok(isOffSubject('Cryptocurrency exchange opens in Kathmandu despite the disaster'));
  assert.ok(isOffSubject('Should Nepal turn its hydropower surplus into digital wealth after the flood?'));
  assert.ok(!isOffSubject('Hydropower plant swept away in Rasuwa flood'));
});

test('the embed box credits its source and escapes what it prints', async () => {
  const { embedHtml } = await import('../functions/embed.js');
  const html = embedHtml({
    name: 'Rasuwa <flood>', asOf: '2026-10-14T12:00:00+05:45', asOfSource: 'Nepal Police',
    stats: [{ label: 'confirmed dead', value: '1,458' }],
  });
  assert.match(html, /1,458/);
  assert.match(html, /Nepal Police, 14 October 2026/);
  assert.match(html, /Rasuwa &lt;flood&gt;/);
  assert.doesNotMatch(html, /<flood>/);
});

/* -- 22 Nov 2026: sport, tourism and foreign disasters on the front ------------ */

test('real headlines that must stay on the front page', () => {
  for (const t of [
    'Flood, landslide trigger water shortage in Beni, Myagdi',
    'Dry landslide blocks Kaligandaki corridor in Gulmi',
    'Six Indian tourists missing in Dolpa after heavy snowfall; helicopter requested for rescue',
    'Japanese firm raises funds for Bhotekoshi flood victims',
    'European Union pledges 2 million euros in flood aid for Nepal',
    'Australian PM Albanese pledges support to Nepal after devastating floods',
    '100,000 kg of Manaslu apples stranded after floods wash away transport routes',
    'Rs 1.7 million distributed to disaster victims as relief',
    'Flood-displaced families in Rasuwa, Nuwakot yet to receive promised house rent support',
    'Ncell Foundation to help reopen flood-damaged campus in Nuwakot',
    'Nepal has failed disaster survivors before. Can Bhotekoshi be different?',
    'Magnitude 4.5 earthquake near Lobuche shakes Solukhumbu',
    'Forest fire spreads in Dadeldhura, army deployed',
    'बाढी र पहिरोका कारण गोरखा र कालिकोटका दुई सडक पूर्णरूपमा अवरुद्ध',
    'घोप्टेभीरमा फेरि पहिरो, मलेखु–मुग्लिङ सडकखण्ड बन्द',
    'विपद प्रभावितलाई करिब १७ लाख रुपैयाँ राहत वितरण',
    'भोटेकोशी बाढी प्रभावित क्याम्पस पुन: सञ्चालन गर्न एनसेल फाउन्डेसनको शैक्षिक पूर्वाधार सहयोग',
    '४ युरोपेली देशमा गुञ्जिँदै ‘मंगोलियन हार्ट’, संकलित रकम बाढी प्रभावितलाई',
    'खतरनाक बन्यो चक्रवात ‘अर्नब’, नेपालमा पनि उच्च सतर्कता',
    // A tourism or sport word next to real damage, danger or aid.
    'Flood sweeps away three hotels in Melamchi',
    'Landslide buries hotel in Rasuwa',
    'Earthquake damages hotels in Kathmandu',
    'Tourism minister visits flood-hit Rasuwa',
    'बाढीले मेलम्चीका तीन होटल बगायो',
    'भूकम्पले काठमाडौंका होटलमा क्षति',
  ]) {
    assert.ok(isNepalDisasterHeadline(t), `should stay: ${t}`);
    assert.ok(!isOffSubject(t), `not off subject: ${t}`);
  }
});

test('sport, tourism and foreign disasters stay off the front page', () => {
  // Sport and tourism: off subject everywhere, so no automatic card either.
  for (const t of [
    'Government plans floodlit home grounds for all eight NPL clubs',
    'बाढीपछि गोसाइँकुण्डमा पर्यटकको चहलपहल बढ्दै',
    'रसुवाको डिल्पु कुण्ड : पर्यटकलाई पर्खिरहेछ',
    'बाह्रै महिना पदयात्राका लागि आकर्षक गन्तव्य बन्दै गोसाइँकुण्ड',
    'Dhulikhel resort wins two honours at South Asian Travel Awards',
    'Pokhara resort wins Best New Hotel/Resort award at SATA 2026',
    'Dusit Thani Dhulikhel holds first cake-mixing ceremony',
    'Nepal beat UAE in rain-hit T20 tri-series opener',
    'Rasuwa football tournament draws crowds in Dhunche',
    'Tourists return to Gosaikunda after the flood',
    'Cricket league resumes in Rasuwa after the flood',
    'Nepse loses ground as trading slows and investors favour select stocks',
    'Why Nepal must separate crypto from the future of banking',
  ]) {
    assert.ok(isOffSubject(t), `off subject: ${t}`);
    assert.ok(!isNepalDisasterHeadline(t), `off the front: ${t}`);
  }
  // Another country's disaster: not off subject (it may be a world item), but
  // not a Nepal headline, so it stays off the front page lists.
  for (const t of [
    'मध्य पेरुमा ६.७ म्याग्निच्युडको भूकम्प, क्षतिको विवरण सङ्कलन हुँदै',
    'गाजामा बाढीले ७० हजार अस्थायी टेन्ट डुबे, राहतका लागि इजरायलसँग ईयूको आग्रह',
    'Magnitude 6.7 earthquake strikes central Peru',
    'Flash floods kill 40 in Pakistan',
  ]) {
    assert.ok(!isOffSubject(t), `not off subject: ${t}`);
    assert.ok(!isNepalDisasterHeadline(t), `off the front: ${t}`);
  }
  // Sport rescued by a real disaster, tourists rescued by people in danger.
  assert.ok(isNepalDisasterHeadline('Nepal cricket team donates match fees to flood victims'));
  assert.ok(isNepalDisasterHeadline('Tourists stranded in Manang after landslide blocks road'));
});

test('the page script judges headlines with the same function and rules', () => {
  const html = frontPage(ctx, { news, photos, events: [event] }).html;
  const tag = html.match(/<script src="\/assets\/front\.js\?v=([0-9a-f]{12})" defer><\/script>/);
  assert.ok(tag, 'the page links its script file with a content stamp');
  const page = emittedAssets().get('assets/front.js');
  assert.ok(page, 'the front page registered assets/front.js');
  assert.equal(createHash('sha256').update(page).digest('hex').slice(0, 12), tag[1]);
  assert.doesNotThrow(() => new vm.Script(page), 'assets/front.js parses');
  assert.doesNotMatch(page, /__[A-Z_]+__/, 'no placeholder left in the script');
  assert.match(page, /var verdict = function headlineVerdict\(title, R\)/);
  const m = page.match(/var RS = (\{.*?\}), R = \{\};/);
  assert.ok(m, 'rules are handed to the page');
  const RS = JSON.parse(m[1]);
  const R = Object.fromEntries(Object.entries(RS).map(([k, [src, flags]]) => [k, new RegExp(src, flags)]));
  assert.equal(headlineVerdict('Government plans floodlit home grounds for all eight NPL clubs', R), 'off');
  assert.equal(headlineVerdict('मध्य पेरुमा ६.७ म्याग्निच्युडको भूकम्प', R), 'foreign');
  assert.equal(headlineVerdict('Dry landslide blocks Kaligandaki corridor in Gulmi', R), 'nepal');
});
