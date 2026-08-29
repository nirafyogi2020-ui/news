/* ============================================================================
   Page definitions. Each function returns { path, title, description, html,
   lastmod, priority, changefreq }. build.mjs writes them and the sitemap.
   ========================================================================= */

import {
  SITE, SITE_NAME, CONTACT_EMAIL, page, esc, related, faqBlock, stripTags,
  nptLong, nptDay, ogFor,
} from './template.mjs';
import * as C from './content.mjs';

const ORG = { '@id': `${SITE}/#organization` };

/* Every event page carries the same author/publisher pair. Written out once. */
function articleNode(o) {
  return {
    '@type': o.type || 'Article',
    '@id': `${SITE}${o.path}#article`,
    headline: o.headline,
    description: o.description,
    inLanguage: 'en',
    isAccessibleForFree: true,
    datePublished: o.published,
    dateModified: o.modified,
    author: ORG,
    publisher: ORG,
    mainEntityOfPage: { '@id': `${SITE}${o.path}#webpage` },
    image: [`${SITE}/og-image.png`],
    ...(o.about ? { about: o.about } : {}),
    ...(o.mentions ? { mentions: o.mentions } : {}),
  };
}

/* The flood is described in full by exactly one Event node, on the Rasuwa hub
   page (`#event`, below). Every other page that is "about" the flood references
   that node by @id rather than repeating a partial copy: a second, thinner
   Event on the same page is what made Search Console report a missing
   "location" field. */
const EVENT_ID = `${SITE}/nepal-flood/rasuwa/#event`;
const EVENT_ABOUT = [{ '@id': EVENT_ID }];

function table(head, rows, caption) {
  return `<div class="table-scroll"><table>${caption ? `<caption>${caption}</caption>` : ''}<thead><tr>${
    head.map(h => `<th${h.n ? ' class="n"' : ''}>${esc(h.t !== undefined ? h.t : h)}</th>`).join('')
  }</tr></thead><tbody>${
    rows.map(r => `<tr>${r.map(c => typeof c === 'number'
      ? `<td class="n">${c}</td>`
      : `<td>${c}</td>`).join('')}</tr>`).join('')
  }</tbody></table></div>`;
}

const AS_OF_TOLL = nptLong(C.TOLL_AS_OF);
const AS_OF_TOLL_EARLIER = nptLong(C.TOLL_EARLIER_AS_OF);
const AS_OF_MISSING = nptLong(C.MISSING_AS_OF);
const AS_OF_BODIES = nptLong(C.BODIES_AS_OF);
const AS_OF_MISSING_BREAKDOWN = nptLong(C.MISSING_BREAKDOWN_AS_OF);
const AS_OF_SITREP = nptLong(C.SITREP_AS_OF);

/* ---------------------------------------------------------------------------
   The standing rail.

   The generated pages were a single column of prose with the rest of a laptop
   screen empty beside it, and a reader who landed on one from a search had no
   sight of the toll, of anything newer, or of a helpline without scrolling to
   the foot. This is the same rail the dashboard carries, built from the same
   event.json and the same archive, so the two cannot disagree.

   `opts.lead` swaps the top card for a page whose own subject is not Nepal
   (the world page), where the Nepal figures are context rather than the point.
   ------------------------------------------------------------------------- */
const VTICK = '<svg class="vtick" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">'
  + '<path d="M12 1.8 14.6 4l3-.2.9 2.9 2.5 1.6-1.1 2.8 1.1 2.8-2.5 1.6-.9 2.9-3-.2L12 22.2 9.4 20l-3 .2-.9-2.9L3 15.7l1.1-2.8L3 10.1l2.5-1.6.9-2.9 3 .2zm-1 13.4 5.2-5.2-1.5-1.5-3.7 3.7-1.8-1.8-1.5 1.5z"/></svg>';

const RAIL_SOURCES = [
  ['Nepal Police', 'Official'],
  ['NDRRMA', 'Official'],
  ['UN OCHA', 'Alerts'],
  ['Kathmandu Post', 'Newsroom'],
  ['Onlinekhabar', 'Newsroom'],
];

export function liveRail(ctx, opts = {}) {
  const event = ctx.event || {};
  const wanted = ['dead', 'missing', 'people'];
  const picked = [];
  for (const icon of wanted) {
    const st = (event.stats || []).find(x => x.icon === icon && !picked.includes(x));
    if (st) picked.push(st);
  }
  const figures = picked.map(st =>
    `<div class="rail-fig"><span class="rf-n${st.tone === 'critical' ? ' critical' : ''}">${esc(st.value)}</span>`
    + `<span class="rf-l">${esc(st.label)}</span></div>`
  ).join('');

  const figCard = figures ? `
<section class="rail-card is-pinned">
  <p class="rail-head"><span class="rail-tick" aria-hidden="true"></span>${esc(opts.figTitle || 'Where it stands')}</p>
  ${figures}
  <p class="rail-note">${esc(event.asOfSource || 'Latest bulletin')}, ${esc(nptLong(event.asOf))}. <a href="/nepal-flood/rasuwa/casualties/">Every figure, and where it came from</a></p>
</section>` : '';

  const latest = (ctx.posts || []).slice(0, 5).map(p =>
    `<li><time datetime="${esc(p.time)}">${esc(nptLong(p.time))}</time>`
    + `<a href="${esc(p.url)}">${esc(p.title)}</a></li>`
  ).join('');

  const latestCard = latest ? `
<section class="rail-card">
  <p class="rail-head"><span class="rail-dot" aria-hidden="true"></span>Latest<span class="rail-when">${esc(nptLong(ctx.modified))}</span></p>
  <ol class="rail-list">${latest}</ol>
  <p class="rail-note"><a href="/nepal-flood/rasuwa/live-updates/">Every update, newest first</a></p>
</section>` : '';

  const sourceCard = `
<section class="rail-card">
  <p class="rail-head"><span class="rail-tick" aria-hidden="true"></span>Where this comes from</p>
  <ul class="rail-src">${RAIL_SOURCES.map(([name, kind]) =>
    `<li>${VTICK}<b>${esc(name)}</b><span class="rs-kind">${esc(kind)}</span></li>`).join('')}</ul>
  <p class="rail-note"><a href="/sources/">Every source on this site, and how each one is checked</a></p>
</section>`;

  const helpCard = `
<section class="rail-card">
  <p class="rail-head"><span class="rail-tick" aria-hidden="true"></span>If you need help</p>
  <div class="rail-body">
    <p class="rail-lede">Nepal Police is 100 from any phone, 112 from a mobile. Donations to the government fund go through its own card gateway.</p>
    <a class="rail-btn is-alert" href="tel:100">Call 100, Nepal Police</a>
    <a class="rail-btn" href="/nepal-flood/relief/">How to give, and what to avoid</a>
  </div>
</section>`;

  return [opts.lead || '', figCard, latestCard, sourceCard, helpCard].join('\n');
}

const bylineLive = (modified) =>
  `<b>${esc(SITE_NAME)}</b><span>Compiled from official bulletins and named newsrooms</span><span>Last checked ${esc(nptLong(modified))}</span>`;

/* -- shared blocks ---------------------------------------------------------- */

const EMERGENCY_STRIP = `<div class="callout callout-alert">
  <p class="callout-title">In danger right now?</p>
  <p>Call <strong>100</strong> (Nepal Police) or <strong>112</strong> from any mobile. Do not wait for anything on this page to load.</p>
  <div class="dialrow" style="margin-top:12px;margin-bottom:0;">
    <a class="dial" href="tel:100"><b>100</b><span>Police</span></a>
    <a class="dial" href="tel:112"><b>112</b><span>Any mobile</span></a>
    <a class="dial" href="tel:102"><b>102</b><span>Ambulance</span></a>
    <a class="dial" href="tel:1149"><b>1149</b><span>Disaster hotline</span></a>
  </div>
  <p class="faint" style="margin-top:10px;margin-bottom:0;"><a href="/nepal-flood/emergency-numbers/">Full list of Nepal emergency numbers, and what each one is for</a></p>
</div>`;

function numbersGrid() {
  return `<div class="numgrid">
    <div class="statbox"><span class="n crit">${C.TOLL.deadNepal}</span><span class="l">confirmed dead in Nepal</span><span class="src">${esc(C.TOLL_SOURCE)}, ${esc(AS_OF_TOLL)}</span></div>
    <div class="statbox"><span class="n crit">${C.TOLL.missing}</span><span class="l">listed missing in Nepal</span><span class="src">${esc(C.MISSING_SOURCE)}, ${esc(AS_OF_MISSING)}</span></div>
    <div class="statbox"><span class="n">${C.TOLL.missingChina}</span><span class="l">missing on the China side</span><span class="src">CCTV, Gyirong Port</span></div>
    <div class="statbox"><span class="n">${C.TOLL.injured}</span><span class="l">injured</span><span class="src">NDRRMA and Nepal Police</span></div>
    <div class="statbox"><span class="n">${C.TOLL.rescued}</span><span class="l">rescued so far</span><span class="src">NDRRMA, ${esc(AS_OF_TOLL)}</span></div>
    <div class="statbox"><span class="n">${C.DAMAGE.hydropowerProjects}</span><span class="l">hydropower projects damaged, about ${C.DAMAGE.hydropowerMW} MW</span><span class="src">Nepal Electricity Authority</span></div>
    <div class="statbox"><span class="n sm">${esc(C.DAMAGE.costEstimate)}</span><span class="l">road and bridge damage, preliminary</span><span class="src">Minister Sunil Lamsal, 26 Aug</span></div>
    <div class="statbox"><span class="n sm">${esc(C.DAMAGE.reliefReleased)}</span><span class="l">relief money released</span><span class="src">Government of Nepal</span></div>
  </div>
  <p class="updated-line"><strong>Read every number against its own clock.</strong> The death toll and the missing count are from the ${esc(C.TOLL_SOURCE)} of ${esc(AS_OF_TOLL)}. The district breakdown further down is from the earlier ${esc(C.BODIES_SOURCE)} of ${esc(AS_OF_BODIES)} and adds to less than the total above, because the later update raised the national figure without republishing every district. Damage and rescue figures come from the ${esc(C.SITREP_SHORT)}. Every count here is provisional and moves in both directions.</p>`;
}

const SECOND_FLOOD_WARNING = `<div class="callout callout-alert">
  <p class="callout-title">A second flood is happening: the barrier lake upstream has burst</p>
  <p>Nepal Police say Chinese authorities have reported that the <strong>barrier lake</strong>, formed by debris blocking a river, ${esc(C.BARRIER_LAKE.where)} has burst. Chinese state media had put the volume behind it at around <strong>${esc(C.BARRIER_LAKE.volume)}</strong> and warned it was at risk of breaching.</p>
  <p>${esc(C.BARRIER_LAKE.note)} Most river gauges on the Bhote Koshi and Trishuli were destroyed in the first wave, so a warning would come with less notice than normal.</p>
  <p><strong>Keep off the banks of the Bhote Koshi, the Trishuli and the Narayani until officials say it is clear.</strong> Downstream in India, authorities in Bihar have opened the Valmikinagar Barrage on the Gandak as a precaution and prepared to move 10,000 to 12,000 people.</p>
  <p class="faint" style="margin-bottom:0;">Source: ${esc(C.BARRIER_LAKE.source)}, ${esc(nptLong(C.BARRIER_LAKE.asOf))}.</p>
</div>`;

/* -- 1. /nepal-flood/ ------------------------------------------------------- */

export function nepalFloodHub(ctx) {
  const path = '/nepal-flood/';
  const faq = faqBlock([
    {
      q: 'Is there a flood in Nepal right now?',
      a: `<p>Yes. A flash flood struck Rasuwa district on 26 August 2026 and ran downstream along the Trishuli and Narayani rivers. As of ${esc(AS_OF_TOLL)}, NDRRMA reports ${C.TOLL.deadNepal} dead and ${C.TOLL.missing} people listed out of contact in Nepal. Officials warn a second surge is possible because a new barrier lake has formed upstream inside Tibet. <a href="/nepal-flood/rasuwa/">Full coverage of the Rasuwa flood</a>.</p>`,
    },
    {
      q: 'Which rivers in Nepal flood most often?',
      a: '<p>In the Tarai, the Koshi, Karnali, Narayani, Bagmati and West Rapti spread over their banks most monsoon seasons. In the hills, steep tributaries such as the Bhote Koshi and Trishuli rise in hours rather than days, which leaves far less warning time. The 2026 Rasuwa flood came down the Bhote Koshi.</p>',
    },
    {
      q: 'When is Nepal’s flood season?',
      a: '<p>The monsoon runs roughly June to September and brings most of Nepal’s yearly rain, so that is when river flooding peaks. Glacial lake outburst floods are different: they can happen on a clear, dry day, which is exactly what happened in Rasuwa in August 2026.</p>',
    },
    {
      q: 'What should I do if a river rises with no rain?',
      a: '<p>Treat it as an emergency and move uphill away from the river immediately, not along the road. Roads follow river valleys and flood first. A river that rises or suddenly stops on a dry day is the classic sign of a burst blockage upstream. You may have minutes.</p>',
    },
  ]);

  const body = `
${EMERGENCY_STRIP}

<h2>The flood happening now: Rasuwa, August 2026</h2>
<p>On the morning of <strong>26 August 2026</strong> a flash flood came down the Bhote Koshi from the Tibet side of the border into <strong>Rasuwa district</strong>. The border towns of Timure and Syabrubesi were hit hardest, and the water carried on down the Trishuli and into the Narayani. Bodies have since been recovered as far south as Chitwan, where more than a third of the confirmed dead were found.</p>
${numbersGrid()}
<p><a href="/nepal-flood/rasuwa/"><strong>Read the full Rasuwa flood briefing</strong></a>: what happened, what caused it, who is missing, and what is still unknown.</p>

${SECOND_FLOOD_WARNING}

<h2>Everything on this event, page by page</h2>
<ul class="linklist">
  <li><a href="/nepal-flood/rasuwa/"><b>Rasuwa flood 2026: the full briefing</b><span>Event overview</span></a></li>
  <li><a href="/nepal-flood/rasuwa/live-updates/"><b>Live updates</b><span>Newest first</span></a></li>
  <li><a href="/nepal-flood/rasuwa/casualties/"><b>Casualties: ${C.TOLL.deadNepal} dead, district by district</b><span>Death toll</span></a></li>
  <li><a href="/nepal-flood/rasuwa/foreign-nationals/"><b>Foreign nationals missing, and who families should call</b><span>For families abroad</span></a></li>
  <li><a href="/nepal-flood/rasuwa/hydropower/"><b>Hydropower damage: ${C.DAMAGE.hydropowerProjects} projects, ${C.DAMAGE.hydropowerMW} MW</b><span>Energy</span></a></li>
  <li><a href="/nepal-flood/rasuwa/missing-persons/"><b>Missing persons: ${C.TOLL.missing} listed, and how to report one</b><span>Missing</span></a></li>
  <li><a href="/nepal-flood/rasuwa/timeline/"><b>Timeline, hour by hour</b><span>Chronology</span></a></li>
  <li><a href="/nepal-flood/rasuwa/cause/"><b>What caused the flood</b><span>GLOF, avalanche or quake</span></a></li>
  <li><a href="/nepal-flood/rasuwa/damage/"><b>Damage: hydropower, bridges, roads and cost</b><span>Damage</span></a></li>
  <li><a href="/nepal-flood/rasuwa/map/"><b>Map of the flood path</b><span>Maps</span></a></li>
  <li><a href="/nepal-flood/emergency-numbers/"><b>Nepal emergency numbers</b><span>Help now</span></a></li>
  <li><a href="/nepal-flood/relief/"><b>Relief and how to donate safely</b><span>Give</span></a></li>
</ul>

<h2>Why floods in Nepal are so dangerous so fast</h2>
<p>Nepal falls from over 8,000 metres to under 100 metres in about 200 kilometres. Rivers in the hill districts drop steeply and move fast, so a release upstream reaches villages downstream in under an hour rather than over days. In the Rasuwa case, the river drops about 3,000 metres in under 40 km, one of the steepest runs in the Himalaya.</p>
<p>Three things make it worse than the raw geography suggests:</p>
<ul>
  <li><strong>Roads follow rivers.</strong> The escape route and the flood path are frequently the same line on the map. Moving uphill away from the road is the correct instinct, and the opposite of what people usually do.</li>
  <li><strong>Warning infrastructure is thin, and it is destroyed first.</strong> Most river gauges on the Bhote Koshi and Trishuli were wiped out by the first wave of the 2026 flood, which reduced warning time for anything that followed. The road that carried rescue teams in, the 42 km from Betrawati to the border, was destroyed at multiple points in the same hour.</li>
  <li><strong>Some headwaters sit in another country.</strong> The catchment above Rasuwagadhi is inside Tibet. Nepal has no monitoring station there, so the first sign of a problem can be the river itself.</li>
</ul>

<h2>The two kinds of flood Nepal gets</h2>
<div class="cards">
  <div class="card"><h3>Monsoon river flooding</h3><p>June to September. Builds over hours or days, tracks the rain, and is at least partly forecastable. Worst in the Tarai plains, where water spreads wide and stays for days.</p></div>
  <div class="card"><h3>Sudden-release floods (GLOF and landslide dams)</h3><p>Can happen on a clear day with no rain. A lake or a debris dam high in the mountains fails, and the whole volume leaves at once. Almost no warning. This is what hit Rasuwa in 2026.</p></div>
</div>
<p>Telling them apart matters, because the advice differs. Rain flooding gives you time to move belongings and livestock. A sudden-release flood gives you time to move yourself, and only if you start immediately.</p>
<p><a href="/nepal-disasters/">Read the full guide to Nepal’s natural hazards</a>: floods, earthquakes, landslides, lightning and cold waves, with the warning signs and what to do for each.</p>

<h2>Common questions</h2>
${faq.html}
`;

  return {
    path,
    title: 'Nepal Floods: Live Updates, Affected Districts and Emergency Help',
    description: `Nepal flood update: ${C.TOLL.deadNepal} confirmed dead in the 26 August 2026 Rasuwa flash flood, with hundreds missing. Affected districts, why Nepali rivers rise so fast, and the emergency numbers to call.`,
    lastmod: ctx.modified,
    priority: '0.9',
    changefreq: 'daily',
    html: page({
      rail: liveRail(ctx),
      path,
      title: 'Nepal Floods: Live Updates, Affected Districts and Emergency Help',
      description: `Nepal flood update: ${C.TOLL.deadNepal} confirmed dead in the 26 August 2026 Rasuwa flash flood, with hundreds missing. Affected districts, why Nepali rivers rise so fast, and the emergency numbers to call.`,
      h1: 'Floods in Nepal',
      lede: 'Live coverage of the flood happening now, plus why Nepal’s rivers behave the way they do and what to do when one rises. Every figure is attributed to the bulletin it came from.',
      crumbs: [{ label: 'Home', href: '/' }, { label: 'Nepal floods' }],
      statusPill: 'live',
      updatedNote: bylineLive(ctx.modified),
      published: '2026-08-26T12:00:00+05:45',
      modified: ctx.modified,
      body: body + related('Go deeper', [
        { href: '/nepal-flood/rasuwa/', title: 'Rasuwa flood 2026', text: 'The full briefing on the event happening now.', verb: 'the briefing' },
        { href: '/nepal-flood/emergency-numbers/', title: 'Nepal emergency numbers', text: 'Every national helpline, what it is for, and how to report someone missing.', verb: 'the numbers' },
        { href: '/nepal-disasters/', title: 'Nepal disaster guide', text: 'Floods, earthquakes, landslides and more. Signs and what to do.', verb: 'the guide' },
      ]),
      schema: [
        articleNode({
          path, headline: 'Floods in Nepal: live coverage and background',
          description: 'Nepal flood coverage and background: the current Rasuwa event, affected districts, and why Nepali rivers rise so fast.',
          published: '2026-08-26T12:00:00+05:45', modified: ctx.modified, about: EVENT_ABOUT,
        }),
        faq.node,
      ],
    }),
  };
}

/* -- 2. /nepal-flood/rasuwa/ ------------------------------------------------ */

export function rasuwaEvent(ctx) {
  const path = '/nepal-flood/rasuwa/';
  const faq = faqBlock([
    {
      q: 'What happened in Rasuwa, Nepal?',
      a: `<p>On the morning of 26 August 2026 a flash flood came down the Bhote Koshi river from the Tibet side of the border into Rasuwa district. Timure, Syabrubesi, the Rasuwagadhi border crossing and around a dozen riverside settlements took the heaviest impact, and the water carried on down the Trishuli into the Narayani. ${C.DAMAGE.hydropowerProjects} hydropower projects were damaged. As of ${esc(AS_OF_TOLL)}, Nepal Police confirm ${C.TOLL.deadNepal} dead in Nepal.</p>`,
    },
    {
      q: 'What caused the Nepal flood of August 2026?',
      a: '<p>No government has confirmed a cause. The leading explanation, from Nepal’s Department of Hydrology and Meteorology and independent glaciologists working with satellite imagery shared through ICIMOD, is an ice-and-rock avalanche that blocked the Lhende Khola inside Tibet about 20 km upstream of the Miteri Bridge, forming a temporary debris-dammed lake that then burst. The seismic signal recorded minutes earlier, first logged by the USGS as a magnitude 4.4 earthquake, has since been reassessed as a magnitude 5.2 glacial collapse rather than a tectonic quake. Heavy local rainfall in Rasuwa is ruled out.</p>',
    },
    {
      q: 'Which districts of Nepal were affected?',
      a: '<p>Rasuwa took the first and heaviest impact, especially Timure, Syabrubesi and the Rasuwagadhi border crossing. The surge then moved through Betrawati and Trishuli Bazar in Nuwakot, Galchhi and Dhunge Bazaar in Dhading, and past Muglin into the Narayani. Bodies have been recovered in Chitwan, Nawalparasi East and West, Gorkha and Tanahun as well. Three deaths are confirmed on the Chinese side near Gyirong.</p>',
    },
    {
      q: 'Is Kathmandu affected by the Rasuwa flood?',
      a: '<p>Kathmandu itself was not flooded. The damage runs along the Bhote Koshi and Trishuli valleys in Rasuwa and Nuwakot, north-west of the capital. Road links to the Chinese border through Rasuwagadhi have been badly disrupted.</p>',
    },
    {
      q: 'How many people are still missing?',
      a: `<p>NDRRMA listed ${C.TOLL.missing} people out of contact in Nepal in its ${esc(AS_OF_MISSING)} update. The last detailed Nepal Police list is older: 579 travellers (466 of them foreign nationals), 161 Rasuwa residents, 85 security personnel and one Nuwakot resident. Chinese state media separately report ${C.TOLL.missingChina} missing around Gyirong Port on the Tibet side, ${C.TOLL.missingChinaForeign} of them foreign nationals. Combined, that is more than 2,900 people unaccounted for, though the two countries’ counts of foreign nationals may overlap. Out of contact does not mean dead. Phone lines, power and internet are down across the valley.</p>`,
    },
    {
      q: 'Is it safe to travel to Langtang or Syabrubesi now?',
      a: '<p>Syabrubesi is the main gateway to the Langtang trek and was directly hit, including the loss of its helipad. Roads along the river valley are damaged and a second surge has not been ruled out. Check with Nepal Police, the Tourist Police on 1144, and your trekking operator before travelling.</p>',
    },
    {
      q: 'How can I donate to Rasuwa flood relief?',
      a: '<p>The Government of Nepal’s own channel is the Prime Minister’s Natural Disaster Relief Fund, run by the Office of the Prime Minister. Bank account details and the official QR code are on the <a href="/nepal-flood/relief/">relief and donations page</a>. Fake appeals appear within hours of any disaster, so check the account name before sending anything.</p>',
    },
  ]);

  const body = `
${EMERGENCY_STRIP}

<h2>Where the numbers stand</h2>
${numbersGrid()}

${SECOND_FLOOD_WARNING}

<h2>What happened</h2>
<p>At about <strong>09:00 Nepal time on 26 August 2026</strong>, the Bhote Koshi rose suddenly where it crosses into Nepal at Rasuwagadhi. It was not raining in the Rasuwa catchment. Within minutes the water was through Timure, the nearest Nepali settlement, taking nine bank branches and the customs post with it. Syabrubesi, downstream and the gateway to the Langtang trek, lost its helipad, which slowed rescue flights into the upper valley on the first day, when they mattered most. Around a dozen riverside settlements in northern Rasuwa were hit in that first hour.</p>
<p>The flood did not stop at the district line. The Bhote Koshi joins the Trishuli at Syabrubesi, and the Trishuli runs on into the Narayani. The surge moved through Betrawati and Trishuli Bazar in Nuwakot, Galchhi and Dhunge Bazaar in Dhading, and past Muglin. Bodies have since been recovered as far as Chitwan and Nawalparasi. The Armed Police Force alone recovered ${C.TOLL.narayaniRecovered} from the Narayani by Thursday afternoon.</p>
<p>Counts rose sharply and repeatedly through the first two days as search teams reached areas that had been cut off. The Prime Minister’s Office reported 95 dead on Wednesday evening and NDRRMA 72; by 6am Saturday the police count was ${C.TOLL.deadNepalEarlier}, and by ${esc(AS_OF_TOLL)} NDRRMA reported <strong>${C.TOLL.deadNepal}</strong>. Every figure on this page is provisional for that reason.</p>
<p><a href="/nepal-flood/rasuwa/timeline/">See the full hour-by-hour timeline</a>.</p>

<h3>The route the water took</h3>
${table(['Place', 'Elevation', 'What happened'], C.PLACES.map(p => [
    `<strong>${esc(p.name)}</strong><br><span class="faint">${esc(p.country)}</span>`,
    `<span class="num">${esc(p.elev)}</span>`,
    esc(p.text),
  ]), 'From the suspected break-off point in Tibet down to the furthest reported damage in Nuwakot, a drop of roughly 4,500 metres.')}
<p><a href="/nepal-flood/rasuwa/map/">Open the interactive map of the flood path</a>, with the coordinates for each point.</p>

<h2>What may have caused it</h2>
<p><strong>No government has confirmed the cause.</strong> Ordinary rainfall is ruled out. It was not raining in the catchment that morning. These are the explanations under examination, ranked by how strongly they are currently supported:</p>
<ol>
${C.CAUSES.filter(c => c.rank !== 'Ruled out').map(c => `<li><strong>${esc(c.title)}</strong> <span class="faint">(${esc(c.rank)})</span><br>${esc(c.text)}</li>`).join('\n')}
</ol>
<p><a href="/nepal-flood/rasuwa/cause/">Read the full explanation of what caused the flood</a>, including what a GLOF is and why the distinction matters for the districts downstream.</p>

<h2>Damage</h2>
<p>The Nepal Electricity Authority reports <strong>${C.DAMAGE.hydropowerProjects} hydropower projects damaged</strong> along the corridor, with a combined capacity of about <strong>${C.DAMAGE.hydropowerMW} MW</strong>: ${C.DAMAGE.hydropowerOperational} operating plants (${C.DAMAGE.hydropowerOperationalMW} MW) and ${C.DAMAGE.hydropowerUnderConstruction} under construction (${C.DAMAGE.hydropowerUnderConstructionMW} MW). The Department of Roads confirms the entire <strong>${C.DAMAGE.roadDestroyedKm} km road from Betrawati to the Rasuwagadhi crossing</strong> was destroyed at multiple points, including several concrete bridges, cutting Nepal’s main overland trade and pilgrimage route to Tibet.</p>
<p><a href="/nepal-flood/rasuwa/hydropower/">The hydropower damage in detail</a>, project by project, and what it means for supply.</p>
<p>Physical Infrastructure Minister Sunil Lamsal put road and bridge damage alone at about <strong>${esc(C.DAMAGE.costEstimate)}</strong> on 26 August, and called the figure preliminary. Hydropower and private property are not in it.</p>
<p><a href="/nepal-flood/rasuwa/damage/">See the full damage assessment</a>, project by project.</p>

<h2>Who is missing, and what that number means</h2>
<p>NDRRMA listed <strong>${C.TOLL.missing} people out of contact</strong> in its ${esc(AS_OF_MISSING)} update. That figure is a contact list, not a casualty list: phone lines, power and internet are down across the valley and are coming back slowly, so being out of contact does not mean dead.</p>
${table(['Group', 'Listed missing'], C.MISSING_BREAKDOWN.map(([k, v]) => [esc(k), v]), `Nepal Police breakdown of the ${C.MISSING_BREAKDOWN_TOTAL} on the list at ${esc(AS_OF_MISSING_BREAKDOWN)}. NDRRMA's current total of ${C.TOLL.missing} is later and has not been broken down.`)}
<p>Most of the missing foreign travellers were moving toward the Kailash Mansarovar pilgrimage route through Tibet. Chinese state media separately report ${C.TOLL.missingChina} people missing around Gyirong Port on the Tibet side, ${C.TOLL.missingChinaForeign} of them foreign nationals.</p>
<p><a href="/nepal-flood/rasuwa/missing-persons/">How to report someone missing</a>, including the cross-border and foreign-national routes.</p>

<h2>Common questions about the Rasuwa flood</h2>
${faq.html}

<h2>How this page is put together</h2>
<p>Casualty figures come from Nepal Police bulletins. Damage, rescue and response figures come from the ${esc(C.SITREP_SHORT)}, which in turn draws on NDRRMA, Nepal Police, the Department of Roads and the Nepal Electricity Authority. Different bulletins published at different hours give different counts; where two sources disagree, the lower confirmed figure is shown, with the source and the time named next to it. Nothing here is generated automatically from a model. The figures are typed in by hand from the bulletins, which is why they carry a timestamp rather than a claim of being live to the minute.</p>
<p>If a number here is wrong, <a href="/contact/">tell us</a> and it gets corrected or removed. <a href="/sources/">Every source this site uses is listed publicly</a>.</p>
`;

  return {
    path,
    alternates: [{ hreflang: 'en', path: '/nepal-flood/rasuwa/' }, { hreflang: 'ne', path: '/ne/' }],
    title: `Rasuwa Flood 2026: ${C.TOLL.deadNepal} Dead | Latest Updates, Map and Cause`,
    description: `Rasuwa flood, Nepal: ${C.TOLL.deadNepal} confirmed dead after the 26 August 2026 Bhote Koshi flash flood, with hundreds missing. Timeline, suspected cause, damage, affected districts and emergency numbers.`,
    lastmod: ctx.modified,
    priority: '1.0',
    changefreq: 'hourly',
    html: page({
      rail: liveRail(ctx),
      path,
      title: `Rasuwa Flood 2026: ${C.TOLL.deadNepal} Dead | Latest Updates, Map and Cause`,
      ogTitle: `Rasuwa Flood 2026: ${C.TOLL.deadNepal} dead, ${C.TOLL.missing} missing`,
      description: `Rasuwa flood, Nepal: ${C.TOLL.deadNepal} confirmed dead after the 26 August 2026 Bhote Koshi flash flood, with hundreds missing. Timeline, suspected cause, damage, affected districts and emergency numbers.`,
      h1: 'Rasuwa flood, 2026',
      lede: 'A flash flood came down the Bhote Koshi from Tibet into Rasuwa on 26 August 2026. This is what is confirmed, what is still unknown, and who to call.',
      crumbs: [{ label: 'Home', href: '/' }, { label: 'Nepal floods', href: '/nepal-flood/' }, { label: 'Rasuwa flood 2026' }],
      statusPill: 'live',
      updatedNote: bylineLive(ctx.modified),
      published: '2026-08-26T12:00:00+05:45',
      modified: ctx.modified,
      ogImageAlt: 'Rasuwa flood, Nepal: live updates, map, casualty figures and helplines',
      alternates: [
        { hreflang: 'en', path: '/nepal-flood/rasuwa/' },
        { hreflang: 'ne', path: '/ne/' },
      ],
      extraPills: '<a class="pill" href="/ne/" hreflang="ne" lang="ne">नेपालीमा पढ्नुहोस्</a>',
      body: body + related('More on this event', [
        { href: '/nepal-flood/rasuwa/live-updates/', title: 'Live updates', text: 'Everything as it comes in, newest first, with the source on every line.', verb: 'the feed' },
        { href: '/nepal-flood/rasuwa/casualties/', title: 'Casualties, district by district', text: `Where the ${C.TOLL.deadNepal} confirmed dead were recovered, and how the count is compiled.`, verb: 'the figures' },
        { href: '/nepal-flood/rasuwa/map/', title: 'Map of the flood path', text: 'Seven points from the suspected break-off in Tibet to Devighat in Nuwakot.', verb: 'the map' },
        { href: '/nepal-flood/relief/', title: 'How to help safely', text: 'The government’s own relief fund, the bank details, and how to spot a fake appeal.', verb: 'how to help' },
      ]),
      schema: [
        {
          '@type': 'NewsArticle',
          '@id': `${SITE}${path}#article`,
          headline: `Rasuwa flood 2026: ${C.TOLL.deadNepal} confirmed dead in Nepal`,
          description: 'Live briefing on the 26 August 2026 Rasuwa flash flood in Nepal: casualties, cause, damage, map and emergency contacts.',
          inLanguage: 'en',
          isAccessibleForFree: true,
          datePublished: '2026-08-26T12:00:00+05:45',
          dateModified: ctx.modified,
          author: ORG,
          publisher: ORG,
          mainEntityOfPage: { '@id': `${SITE}${path}#webpage` },
          image: [`${SITE}/og-image.png`],
          about: EVENT_ABOUT,
        },
        {
          '@type': 'Event',
          '@id': `${SITE}${path}#event`,
          name: '2026 Rasuwa flash flood',
          alternateName: 'Bhote Koshi-Trishuli flash flood',
          /* Recommended by Google for an Event; without it the item is valid
             but reported as incomplete. */
          image: [`${SITE}/og-image.png`],
          startDate: '2026-08-26T09:00:00+05:45',
          eventStatus: 'https://schema.org/EventScheduled',
          eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
          description: 'Flash flood along the Bhote Koshi and Trishuli rivers in Rasuwa and Nuwakot districts, Nepal, on 26 August 2026, following a suspected ice-and-rock avalanche that dammed and then released the Lende Khola inside Tibet.',
          location: {
            '@type': 'Place',
            name: 'Rasuwa District, Bagmati Province, Nepal',
            address: { '@type': 'PostalAddress', addressRegion: 'Bagmati Province', addressCountry: 'NP' },
            geo: { '@type': 'GeoCoordinates', latitude: 28.15, longitude: 85.35 },
          },
          organizer: { '@type': 'GovernmentOrganization', name: 'Government of Nepal' },
        },
        {
          '@type': 'SpecialAnnouncement',
          '@id': `${SITE}${path}#announcement`,
          name: 'Rasuwa flash flood, Nepal, active emergency',
          text: 'A flash flood struck the Bhote Koshi and Trishuli valleys in Rasuwa and Nuwakot districts on 26 August 2026. Search and rescue continues. China has reported a new barrier lake forming upstream inside Tibet holding around 2 million cubic metres of water, and warns it could break. Keep off the banks of the Bhote Koshi, Trishuli and Narayani until officials say it is clear.',
          category: 'https://www.wikidata.org/wiki/Q8068',
          datePosted: '2026-08-26T12:00:00+05:45',
          expires: '2026-12-31',
          announcementLocation: {
            '@type': 'Place',
            name: 'Rasuwa and Nuwakot Districts, Nepal',
            geo: { '@type': 'GeoCoordinates', latitude: 28.15, longitude: 85.35 },
          },
          publisher: ORG,
          url: `${SITE}${path}`,
        },
        faq.node,
      ],
    }),
  };
}

/* -- 3. /nepal-flood/rasuwa/casualties/ ------------------------------------- */

export function casualties(ctx) {
  const path = '/nepal-flood/rasuwa/casualties/';
  const totalListed = C.BODIES_BY_DISTRICT.reduce((a, [, n]) => a + n, 0);

  const body = `
<div class="callout">
  <p class="callout-title">What this page is, and what it is not</p>
  <p>This is a record of officially confirmed figures with the bulletin and the timestamp attached to each one. It carries no names, no photographs of the dead, and no unverified reports. If you are looking for a specific person, start with <a href="/nepal-flood/rasuwa/missing-persons/">the missing persons page</a>, not this one.</p>
</div>

<h2>The confirmed figures</h2>
${numbersGrid()}

<h2>Where the bodies were recovered</h2>
<p>The flood started in Rasuwa, but the river carried people a long way downstream. Most bodies have been recovered in <strong>Chitwan</strong>, six districts below the source. A district in the table below is where a body was <em>found</em>, not where the person was from.</p>
${table(['District', 'Bodies recovered'], C.BODIES_BY_DISTRICT.map(([d, n]) => [esc(d), n]).concat([
    ['<strong>Total, Nepal</strong>', `<strong class="num">${totalListed}</strong>`],
  ]), `${esc(C.BODIES_SOURCE)}, ${esc(AS_OF_BODIES)}. This is the last complete district breakdown; the national total above is later and higher.`)}
<p>The Armed Police Force reported <strong>${C.TOLL.narayaniRecovered} bodies recovered from the Narayani river alone</strong> by Thursday afternoon. That is more than the entire national toll stood at 24 hours earlier. Chitwan’s mortuary has filled, and an identification centre is being set up.</p>
<p>A further <strong>${C.TOLL.deadChina} deaths</strong> are confirmed on the Chinese side, near Gyirong (Kyirong) county just over the border from Rasuwagadhi, where the dry port and customs area were hit. That brings the confirmed total across both countries to <strong>${C.TOLL.deadNepal + C.TOLL.deadChina}</strong>.</p>

<h2>Injured</h2>
<p>NDRRMA reported <strong>${C.TOLL.injured} injured people receiving hospital treatment</strong> at ${esc(AS_OF_TOLL)}. This is a current treatment count, not a cumulative injury total.</p>

<h2>Rescued</h2>
<p>Search and rescue is being run by the Nepali Army, Nepal Police and the Armed Police Force with military and private helicopters. NDRRMA reported <strong>${C.TOLL.rescued} people rescued</strong> at ${esc(AS_OF_TOLL)}. Its earlier named nationality list totals 113, so it is not a full breakdown of the current total.</p>
${table(['Rescued', 'People'], C.TOLL.rescuedBreakdown.map(([k, v]) => [esc(k), v]).concat([['<strong>Earlier named list total</strong>', `<strong class="num">${C.TOLL.rescuedBreakdown.reduce((sum, [, value]) => sum + value, 0)}</strong>`]]), 'NDRRMA, 27 August 2026. This is an older named list, not a breakdown of the latest total.')}

<h2>How the toll has moved</h2>
<p>This is the clearest illustration of why a casualty figure without a timestamp is useless during an event like this. Every figure below was correct when it was published.</p>
${table(['When', 'Reported dead', 'Source'], [
    ['Wednesday evening, 26 Aug', 72, 'NDRRMA'],
    ['Wednesday evening, 26 Aug', 95, 'Prime Minister’s Office'],
    ['Late Wednesday, 26 Aug', '~160', 'NDRRMA and Nepal Police, 157 bodies recovered'],
    ['13:30 Thursday, 27 Aug', 270, 'Nepal Police'],
    ['14:30 Thursday, 27 Aug', 289, 'Nepal Police'],
    [esc(AS_OF_TOLL_EARLIER), C.TOLL.deadNepalEarlier, 'Nepal Police'],
    [`<strong>${esc(AS_OF_TOLL)}</strong>`, `<strong class="num">${C.TOLL.deadNepal}</strong>`, '<strong>NDRRMA</strong>'],
  ], 'Compiled from Nepal Police bulletins and the UN OCHA situation overview of 27 August.')}
<p>Three separate things move these figures, and they move at different speeds:</p>
<ul>
  <li><strong>Recovery continues downstream.</strong> Bodies are still being found along the Trishuli and the Narayani, so the confirmed dead count is expected to keep rising.</li>
  <li><strong>Access, not death rate, drives the jumps.</strong> The sharp rises are teams reaching areas that had been cut off, not new casualties occurring.</li>
  <li><strong>Different bulletins cover different hours.</strong> Nepal Police, NDRRMA, the PMO and district authorities publish at different times. Two correct sources can disagree simply because one is three hours older.</li>
</ul>
<p>This site’s rule: where two sources disagree, show the lower confirmed figure, name the source, and print the time it was published. A number without a timestamp is not usable during an event like this.</p>

<h2>Sources for every figure on this page</h2>
<ul>
  <li><strong>Dead, by district:</strong> Nepal Police bulletin, ${esc(AS_OF_TOLL)}. <a href="https://www.nepalpolice.gov.np/" rel="noopener nofollow" target="_blank">nepalpolice.gov.np</a></li>
  <li><strong>Missing:</strong> Nepal Police bulletin, ${esc(AS_OF_MISSING)}.</li>
  <li><strong>Injured, rescued, response:</strong> ${esc(C.SITREP_SHORT)} on <a href="https://reliefweb.int/report/nepal/nepal-flash-floods-rapid-situation-overview-27-august-2026" rel="noopener nofollow" target="_blank">ReliefWeb</a>, drawing on NDRRMA and Nepal Police.</li>
  <li><strong>Narayani recoveries:</strong> Armed Police Force, reported by Nepalnews, 27 August.</li>
  <li><strong>Hospital figures:</strong> Tribhuvan University Teaching Hospital, reported by Nagarik News, 27 August.</li>
  <li><strong>Chinese-side deaths:</strong> Chinese state media (CCTV) regarding Gyirong county.</li>
</ul>
<p class="faint">Figures are typed in by hand from the published bulletins. If one is wrong, <a href="/contact/">report it</a> and it gets corrected or removed.</p>
`;

  const t = `Rasuwa Flood Death Toll: ${C.TOLL.deadNepal} Confirmed Dead, District by District`;
  const d = `Rasuwa flood death toll: ${C.TOLL.deadNepal} confirmed dead and ${C.TOLL.injured} injured in Nepal as of ${AS_OF_TOLL}, with the district-by-district table and a source for every figure.`;
  return {
    path, title: t, description: d, lastmod: ctx.modified, priority: '0.9', changefreq: 'daily',
    html: page({
      rail: liveRail(ctx),
      path, title: t, description: d,
      ogTitle: `Rasuwa flood death toll: ${C.TOLL.deadNepal} confirmed dead`,
      h1: 'Rasuwa flood: confirmed dead, injured and rescued',
      lede: `Confirmed figures only, with the bulletin and the time attached to each one. NDRRMA put the toll at ${C.TOLL.deadNepal} dead as of ${AS_OF_TOLL}, up from Nepal Police's ${C.TOLL.deadNepalEarlier} at 6am.`,
      crumbs: [{ label: 'Home', href: '/' }, { label: 'Nepal floods', href: '/nepal-flood/' }, { label: 'Rasuwa flood 2026', href: '/nepal-flood/rasuwa/' }, { label: 'Casualties' }],
      statusPill: 'live',
      updatedNote: bylineLive(ctx.modified),
      published: '2026-08-26T14:00:00+05:45',
      modified: ctx.modified,
      body: body + related('Related', [
        { href: '/nepal-flood/rasuwa/missing-persons/', title: 'Missing persons', text: `Who the ${C.TOLL.missing} listed missing are, and how to report someone.`, verb: 'more' },
        { href: '/nepal-flood/rasuwa/', title: 'Full event briefing', text: 'What happened, what caused it, and what is still unknown.', verb: 'the briefing' },
        { href: '/nepal-flood/rasuwa/timeline/', title: 'Timeline', text: 'Hour by hour, from the tremor to the latest bulletin.', verb: 'the timeline' },
      ]),
      schema: [articleNode({
        type: 'NewsArticle', path,
        headline: `Rasuwa flood death toll: ${C.TOLL.deadNepal} confirmed dead, district by district`,
        description: d, published: '2026-08-26T14:00:00+05:45', modified: ctx.modified, about: EVENT_ABOUT,
      })],
    }),
  };
}

/* -- 4. /nepal-flood/rasuwa/missing-persons/ -------------------------------- */

export function missingPersons(ctx) {
  const path = '/nepal-flood/rasuwa/missing-persons/';
  const body = `
<div class="callout callout-alert">
  <p class="callout-title">Reporting someone missing, right now</p>
  <p>Call <strong>100</strong> (Nepal Police) or the nearest District Police Office. From outside Nepal, contact your own country’s embassy in Kathmandu first. Embassies coordinate directly with Nepal Police on foreign nationals.</p>
  <div class="dialrow" style="margin-top:12px;margin-bottom:0;">
    <a class="dial" href="tel:100"><b>100</b><span>Nepal Police</span></a>
    <a class="dial" href="tel:1155"><b>1155</b><span>Police helpline</span></a>
    <a class="dial" href="tel:1144"><b>1144</b><span>Tourist Police</span></a>
    <a class="dial" href="tel:1149"><b>1149</b><span>Disaster hotline</span></a>
  </div>
</div>

<h2>Who is on the missing list</h2>
<p>NDRRMA listed <strong>${C.TOLL.missing} people</strong> out of contact in Nepal in its update of ${esc(AS_OF_MISSING)}.</p>
${table(['Group', 'Listed missing'], C.MISSING_BREAKDOWN.map(([k, v]) => [esc(k), v]).concat([['<strong>Total on that list</strong>', `<strong class="num">${C.MISSING_BREAKDOWN_TOTAL}</strong>`]]), `Nepal Police, ${esc(AS_OF_MISSING_BREAKDOWN)}. NDRRMA's later total is ${C.TOLL.missing}; it has not published a new breakdown.`)}

<h3>Where the missing travellers were from</h3>
<p>Of the 579 travellers on the list, 466 are foreign nationals and 113 are Nepali. Most of the foreign travellers were moving toward the <strong>Kailash Mansarovar pilgrimage route</strong> through Tibet, which runs through the Rasuwagadhi crossing.</p>
${table(['Country', 'Listed missing'], C.MISSING_NATIONALITIES.map(([k, v]) => [esc(k), v]), 'Nepal Police country breakdown, reported through the UN OCHA situation overview of 27 August. Citizens of other countries are also on the list. Some Indian outlets report a higher figure of 178 Indian nationals missing; the lower police figure is shown here, with the discrepancy noted rather than hidden.')}

<h3>Groups reported out of contact separately</h3>
<p>These are counted apart from the police missing list, so do not add them to the total.</p>
${table(['Group', 'Out of contact'], C.OUT_OF_CONTACT.map(([k, v]) => [esc(k), v]), 'UN OCHA situation overview, 27 August 2026. Twelve staff of the Upper Trishuli-3B project were separately reported out of contact.')}

<h3>On the Chinese side of the border</h3>
<p>Chinese state media (CCTV) report <strong>${C.TOLL.missingChina} people missing</strong> around the Gyirong Port trade hub in Xizang (Tibet), <strong>${C.TOLL.missingChinaForeign} of them foreign nationals</strong>. China has deployed rescue teams, People’s Liberation Army engineering units, helicopters and relief supplies. Rain and difficult terrain are slowing that effort.</p>
<p>Taken together, more than <strong>1,300 people</strong> are unaccounted for across Nepal and Tibet, although the two countries’ counts of foreign nationals may overlap, so the true figure is likely lower than the sum.</p>

<div class="callout">
  <p class="callout-title">Two things to hold in mind about this number</p>
  <p><strong>Out of contact does not mean dead.</strong> Phone lines, power and internet are down across the Bhote Koshi and Trishuli valleys and are coming back slowly. A large share of this list is people nobody has been able to reach, not people known to have been in the water. Names come off the list alive every day.</p>
  <p><strong>This figure and the death toll share the same NDRRMA update.</strong> Being out of contact does not mean someone has died, and the authority has not published a new group breakdown for this total.</p>
</div>

<h2>How to report a missing person</h2>
<div class="checklist">
${C.MISSING_STEPS.map((s, i) => `<div class="check-row"><span class="mark">${String(i + 1).padStart(2, '0')}</span><p>${esc(s)}</p></div>`).join('\n')}
</div>

<h3>What information to have ready</h3>
<ul>
  <li>Full name as written on official ID, plus any name variants or spellings used locally.</li>
  <li>Age, and a recent photograph if you have one.</li>
  <li>Last known location and the time you last had contact. Even an approximate hour helps narrow a search sector.</li>
  <li>What the person was wearing, and anything distinctive: a bag, a jacket colour, a vehicle registration.</li>
  <li>Their mobile number and network, and the numbers of anyone travelling with them.</li>
  <li>Whether they had crossed, or planned to cross, into China at Rasuwagadhi.</li>
</ul>

<h2>Foreign nationals and families outside Nepal</h2>
<p>If the person you are looking for is not a Nepali citizen, the fastest route is through their own embassy in Kathmandu rather than direct to a district police office. Embassies have a standing channel to Nepal Police for exactly this, and the Department of Immigration holds the entry records that confirm whether someone actually entered the district.</p>
<div class="sourcelinks">
  <a href="https://mofa.gov.np/foreign-mission-in-nepal/" target="_blank" rel="noopener nofollow">Embassies in Nepal, official list &#8599;</a>
  <a href="https://www.immigration.gov.np/" target="_blank" rel="noopener nofollow">Department of Immigration &#8599;</a>
  <a href="https://www.nepalpolice.gov.np/index.php/contact-us" target="_blank" rel="noopener nofollow">Nepal Police district offices &#8599;</a>
  <a href="https://neoc.gov.np/" target="_blank" rel="noopener nofollow">National Emergency Operation Centre &#8599;</a>
</div>

<h2>Why this site does not publish a missing-persons list</h2>
<p>It would be easy to scrape names off social media and publish them here, and it would be wrong. Circulating unverified names of the missing does three kinds of harm: it exposes families to fraud and to press attention they did not ask for, it keeps names in public circulation after the person has been found, and it competes with the official list that rescue teams actually work from.</p>
<p>What this page does instead is explain exactly how the official process works, so that the right information reaches the people who can act on it. The register that matters is the one held by Nepal Police and the ward offices.</p>
<p>If you have information about a specific person, a sighting, a shelter they reached, a confirmation they are safe, give it to the police office where the report was filed. That is what shortens the list.</p>

<h2>Beware of fraud</h2>
<p>Fake "we have located your relative, send money for transport" messages appear after every disaster in Nepal and elsewhere. Nepal Police do not ask for payment to search for a missing person. Neither does any legitimate rescue organisation. If you receive that message, report it to the police office you registered with.</p>
`;

  const t = 'Rasuwa Flood Missing Persons: How to Report Someone, and Who Is on the List';
  const d = `${C.TOLL.missing} people are listed out of contact in Nepal after the 2026 Rasuwa flood, plus ${C.TOLL.missingChina} in Tibet. How to report someone missing, including from abroad.`;
  return {
    path, title: t, description: d, lastmod: ctx.modified, priority: '0.8', changefreq: 'daily',
    alternates: [{ hreflang: 'en', path: '/nepal-flood/rasuwa/missing-persons/' }, { hreflang: 'ne', path: '/ne/bepatta/' }],
    html: page({
      rail: liveRail(ctx),
      path, title: t, description: d,
      ogTitle: `Rasuwa flood: ${C.TOLL.missing} listed missing, and how to report someone`,
      alternates: [
        { hreflang: 'en', path: '/nepal-flood/rasuwa/missing-persons/' },
        { hreflang: 'ne', path: '/ne/bepatta/' },
      ],
      extraPills: '<a class="pill" href="/ne/bepatta/" hreflang="ne" lang="ne">नेपालीमा पढ्नुहोस्</a>',
      h1: 'Missing persons: the Rasuwa flood',
      lede: `NDRRMA lists ${C.TOLL.missing} people out of contact in Nepal, and Chinese state media a further ${C.TOLL.missingChina} across the border. This page explains what the numbers mean and the exact steps to report someone, including from outside Nepal.`,
      crumbs: [{ label: 'Home', href: '/' }, { label: 'Nepal floods', href: '/nepal-flood/' }, { label: 'Rasuwa flood 2026', href: '/nepal-flood/rasuwa/' }, { label: 'Missing persons' }],
      statusPill: 'live',
      updatedNote: bylineLive(ctx.modified),
      published: '2026-08-26T16:00:00+05:45',
      modified: ctx.modified,
      body: body + related('Related', [
        { href: '/nepal-flood/rasuwa/casualties/', title: 'Confirmed casualties', text: 'The confirmed dead, injured and rescued, with sources.', verb: 'the figures' },
        { href: '/nepal-flood/emergency-numbers/', title: 'Emergency numbers', text: 'Every national helpline in Nepal and what each is for.', verb: 'the numbers' },
        { href: '/nepal-flood/rasuwa/', title: 'Full event briefing', text: 'What happened in Rasuwa, and what is still unknown.', verb: 'the briefing' },
      ]),
      schema: [articleNode({
        type: 'NewsArticle', path,
        headline: 'Rasuwa flood missing persons: how to report someone, and who is on the list',
        description: d, published: '2026-08-26T16:00:00+05:45', modified: ctx.modified, about: EVENT_ABOUT,
      })],
    }),
  };
}

/* -- 5. /nepal-flood/rasuwa/timeline/ --------------------------------------- */

export function timeline(ctx) {
  const path = '/nepal-flood/rasuwa/timeline/';
  const body = `
<p class="measure">Pieced together from Nepal Police bulletins, NDRRMA situation reports, local officials and named newsrooms. Times are Nepal time (NPT, UTC+05:45) and some are approximate. Where a source gives "morning" rather than a clock time, that is what is printed here rather than a guess.</p>

<h2>Hour by hour</h2>
<div class="timeline">
${C.TIMELINE.map(([t, txt]) => `<div class="tl-item"><div class="tl-time">${esc(t)}</div><p>${esc(txt)}</p></div>`).join('\n')}
</div>

<h2>Where the water went, and when</h2>
<p>The flood covered roughly 90 kilometres of river in a single day, dropping about 4,500 metres from the suspected break-off point to the furthest reported damage. That speed is the whole story of this event: it is why warning time was measured in minutes, and why the death toll is concentrated in the first two towns.</p>
${table(['Point', 'Elevation', 'Country / district'], C.PLACES.map(p => [
    `<strong>${esc(p.name)}</strong>`, `<span class="num">${esc(p.elev)}</span>`, esc(p.country),
  ]), 'Ordered downstream. Coordinates for each point are on the map page.')}
<p><a href="/nepal-flood/rasuwa/map/">See these points on the interactive map</a>.</p>

<h2>The response so far</h2>
${table(['Strand', 'What is happening'], C.RESPONSE.map(([k, v]) => [`<strong>${esc(k)}</strong>`, esc(v)]), `${esc(C.SITREP_SHORT)}.`)}

<h2>What is still to come</h2>
<p>Two things are unresolved as this page stands. First, the cause is not officially confirmed. The leading explanation is an ice-and-rock avalanche that blocked the Lhende Khola inside Tibet, and the USGS has reassessed the seismic signal recorded minutes before as a glacial collapse rather than an earthquake. <a href="/nepal-flood/rasuwa/cause/">The full account of what caused it</a> sets out the evidence.</p>
<p>Second, the hazard has not ended. China reports a new barrier lake forming upstream holding around 2 million cubic metres of water, and warns it could break. Most river gauges on the Bhote Koshi and Trishuli were destroyed in the first wave, so any warning would come late. New entries are added to this timeline as bulletins are published.</p>
<p><a href="/nepal-flood/rasuwa/live-updates/">Follow the live updates</a> for anything published since the last entry above.</p>
`;
  const t = 'Rasuwa Flood Timeline: Hour by Hour, 26 August 2026 Onwards';
  const d = 'Rasuwa flood timeline: the 2026 Nepal flash flood hour by hour, from the 08:37 seismic signal on 26 August to the latest police bulletin, with a source for every entry.';
  return {
    path, title: t, description: d, lastmod: ctx.modified, priority: '0.8', changefreq: 'daily',
    html: page({
      rail: liveRail(ctx),
      path, title: t, description: d,
      h1: 'Rasuwa flood: timeline',
      lede: 'What happened and when, from the seismic signal recorded minutes before the river rose to the most recent bulletin, including how the death toll moved through the first two days.',
      crumbs: [{ label: 'Home', href: '/' }, { label: 'Nepal floods', href: '/nepal-flood/' }, { label: 'Rasuwa flood 2026', href: '/nepal-flood/rasuwa/' }, { label: 'Timeline' }],
      statusPill: 'live',
      updatedNote: bylineLive(ctx.modified),
      published: '2026-08-26T13:00:00+05:45',
      modified: ctx.modified,
      body: body + related('Related', [
        { href: '/nepal-flood/rasuwa/cause/', title: 'What caused the flood', text: 'Ice avalanche, glacial lake burst, or the earthquake. What the evidence supports.', verb: 'the analysis' },
        { href: '/nepal-flood/rasuwa/damage/', title: 'Damage assessment', text: 'Hydropower, bridges, roads and the preliminary cost figure.', verb: 'the damage' },
        { href: '/nepal-flood/rasuwa/live-updates/', title: 'Live updates', text: 'Anything published since the last timeline entry.', verb: 'the feed' },
      ]),
      schema: [articleNode({
        type: 'NewsArticle', path,
        headline: 'Rasuwa flood timeline: hour by hour, 26 August 2026 onwards',
        description: d, published: '2026-08-26T13:00:00+05:45', modified: ctx.modified, about: EVENT_ABOUT,
      })],
    }),
  };
}

/* -- 6. /nepal-flood/rasuwa/cause/ ------------------------------------------ */

export function cause(ctx) {
  const path = '/nepal-flood/rasuwa/cause/';
  const faq = faqBlock([
    {
      q: 'What is a glacial lake outburst flood (GLOF)?',
      a: '<p>High in the mountains, retreating glaciers leave lakes behind. The wall holding one back is often just loose rock, gravel and buried ice rather than solid bedrock. When that wall fails, the whole lake leaves at once and travels down the valley as a mix of water, mud and boulders. It needs no rain and no warning, which is what makes it so dangerous.</p>',
    },
    {
      q: 'Was the Rasuwa flood a GLOF?',
      a: '<p>Not in the strict sense, on current evidence. The leading explanation is an ice-and-rock avalanche that blocked the Lhende Khola and formed a temporary debris-dammed lake, which then burst. That is a landslide-dam outburst rather than the failure of a pre-existing glacial lake. The two are closely related hazards and produce the same downstream signature, which is why the distinction took time to establish. A broadly similar flood on the same river in July 2025 <em>was</em> attributed to glacial lake drainage.</p>',
    },
    {
      q: 'Did an earthquake cause the Nepal flood?',
      a: '<p>No. The US Geological Survey initially logged a magnitude 4.4 earthquake at 08:37, minutes before the flood, but has since revised that analysis: the signal was a magnitude 5.2 glacial collapse, not a tectonic earthquake. It was the collapse being recorded, not a separate trigger.</p>',
    },
    {
      q: 'Could it happen again in the same valley?',
      a: '<p>Yes, and officials say the immediate risk has not passed: China’s Ministry of Water Resources reports a new barrier lake forming upstream inside Tibet holding around 2 million cubic metres of water, and warns it could break. Beyond this event, a broadly similar flood struck the same river in July 2025, and ICIMOD scientists say cascading glacial hazards are increasing at an "unprecedented" pace across the Hindu Kush Himalaya.</p>',
    },
  ]);

  const body = `
<div class="callout">
  <p class="callout-title">Status: not confirmed</p>
  <p>No government has issued a confirmed cause for this flood. What follows is what the available evidence supports, and how strongly. Where something is a working hypothesis, it says so.</p>
</div>

<h2>What is ruled out: local rainfall</h2>
<p>Meteorologists have ruled out heavy local rainfall in Rasuwa as the cause. A monsoon flood builds with the rain that causes it; this one arrived without it. Satellite data did show rainfall on the Tibetan side of the border, which may have contributed to conditions upstream, but it does not account for a surge of this size arriving this fast. That single fact is what sent investigators upstream, and across the border, in the first place.</p>

<h2>The explanations under examination</h2>
${C.CAUSES.map(c => `<h3>${esc(c.title)}</h3>
<p class="eyebrow">${esc(c.rank)}</p>
<p>${esc(c.text)}</p>`).join('\n')}

<h2>Why the distinction matters downstream</h2>
<p>This is not an academic question. Each explanation implies something different about what happens next:</p>
<ul>
  <li><strong>A landslide dam can re-form.</strong> Debris that blocked a river once can block it again, and the material is already sitting in the valley. That is precisely what has now happened: China’s Ministry of Water Resources reports a new barrier lake near the confluence of the Chhochen Khola and the Purepu Tsangpo, holding around 2 million cubic metres of water by the morning of 27 August, and Chinese state media warn it could break. Both rivers feed the Trishuli system, so a release would run down the same corridor.</li>
  <li><strong>A drained glacial lake is spent</strong>, but the same conditions exist at other lakes in the same range, several of them unmonitored because they sit across the border.</li>
  <li><strong>If seismic shaking had been the trigger</strong>, every unstable slope and moraine in the area would have to be reassessed for aftershock risk. The USGS reassessment makes that less relevant here: the signal was the collapse, not a quake that caused it.</li>
</ul>
<p>The standing warning to stay off the banks of the Bhote Koshi, the Trishuli and the Narayani reflects the first of these. Downstream in India, authorities in Bihar have opened the Valmikinagar Barrage on the Gandak as a precaution and prepared to move 10,000 to 12,000 people.</p>

<h2>The monitoring gap</h2>
<p>The catchment above the Rasuwagadhi crossing is inside Tibet. Nepal has no gauge, no siren and no camera up there, so the first indication of a problem on the Nepali side is the river itself. What warning did come this time came from Chinese satellite imagery shared through ICIMOD, after the event and not before it. Downstream, most of the gauges that did exist on the Bhote Koshi and Trishuli were destroyed by the first wave, which means any second surge would come with less notice than the first.</p>
<p>Nepal classifies more than 20 of its own glacial lakes as potentially dangerous. Several have sensors and sirens. Most of the lakes and moraines that feed Nepal’s northern rivers do not, and a share of them are not in Nepal at all.</p>

<h2>It has happened here before</h2>
<p>A broadly similar flood struck the same river in <strong>July 2025</strong>, and was ultimately attributed to the drainage of a supraglacial lake, meltwater pooled on the surface of a glacier. Hydropower infrastructure on this corridor has now been hit twice in thirteen months. ICIMOD scientists say cascading glacial hazards of this kind are increasing at an "unprecedented" pace across the Hindu Kush Himalaya, as ice retreats faster than it is replaced and more meltwater collects behind weaker walls in valleys where more people now live and build than a generation ago.</p>

<h2>Questions people are asking</h2>
${faq.html}

<h2>Sources</h2>
<ul>
  <li><a href="https://www.icimod.org/press-release/major-flash-flood-sweeps-through-nepals-rasuwa-district-raising-fears-of-further-downstream-flooding" target="_blank" rel="noopener nofollow">ICIMOD press release on the Rasuwa flash flood</a>: the suspected trigger and the warning about further downstream flooding.</li>
  <li><a href="https://www.usnews.com/news/world/articles/2026-08-26/glacier-collapse-may-have-triggered-deadly-nepal-flash-flood-experts-say" target="_blank" rel="noopener nofollow">Reuters, via US News</a>: expert assessment that a glacier collapse may have triggered the flood.</li>
  <li><a href="https://seismonepal.gov.np/" target="_blank" rel="noopener nofollow">National Seismological Centre, Nepal</a>: earthquake records for the region.</li>
  <li><a href="https://www.dhm.gov.np/" target="_blank" rel="noopener nofollow">Department of Hydrology and Meteorology</a>: rainfall and river-level monitoring.</li>
</ul>
`;
  const t = 'What Caused the Nepal Flood? Ice Avalanche, Glacial Lake or Quake';
  const d = 'The leading explanation for the 26 August 2026 Rasuwa flood is an ice-and-rock avalanche that dammed the Lhende Khola inside Tibet. The USGS says the tremor minutes earlier was a glacial collapse.';
  return {
    path, title: t, description: d, lastmod: ctx.modified, priority: '0.8', changefreq: 'weekly',
    html: page({
      rail: liveRail(ctx),
      path, title: t, description: d,
      h1: 'What caused the Rasuwa flood',
      lede: 'Local rainfall is ruled out, and the US Geological Survey has reassessed the tremor recorded minutes earlier as a glacial collapse rather than an earthquake. Here is what the evidence supports, how strongly, and why the answer changes what people downstream should do.',
      crumbs: [{ label: 'Home', href: '/' }, { label: 'Nepal floods', href: '/nepal-flood/' }, { label: 'Rasuwa flood 2026', href: '/nepal-flood/rasuwa/' }, { label: 'What caused it' }],
      statusPill: 'live',
      updatedNote: bylineLive(ctx.modified),
      published: '2026-08-26T15:00:00+05:45',
      modified: ctx.modified,
      body: body + related('Related', [
        { href: '/nepal-disasters/', title: 'Nepal hazard guide', text: 'GLOFs, earthquakes, landslides and floods. The signs and what to do.', verb: 'the guide' },
        { href: '/nepal-flood/rasuwa/map/', title: 'Map of the flood path', text: 'Where the blockage is, and every point the water passed.', verb: 'the map' },
        { href: '/nepal-flood/rasuwa/timeline/', title: 'Timeline', text: 'The tremor, the surge, and everything since.', verb: 'the timeline' },
      ]),
      schema: [articleNode({
        type: 'NewsArticle', path,
        headline: 'What caused the Nepal flood? Ice avalanche, glacial lake burst or earthquake',
        description: d, published: '2026-08-26T15:00:00+05:45', modified: ctx.modified, about: EVENT_ABOUT,
      }), faq.node],
    }),
  };
}

/* -- 7. /nepal-flood/rasuwa/damage/ ----------------------------------------- */

export function damage(ctx) {
  const path = '/nepal-flood/rasuwa/damage/';
  const body = `
<div class="callout">
  <p class="callout-title">Two separate money figures, never added together</p>
  <p><strong>${esc(C.DAMAGE.costEstimate)}</strong> is the preliminary estimate of <em>damage</em> to roads and bridges. <strong>${esc(C.DAMAGE.reliefReleased)}</strong> is the <em>relief money released</em> by the government. They measure opposite things and are kept apart everywhere on this site.</p>
</div>

<h2>Hydropower: ${C.DAMAGE.hydropowerProjects} projects, about ${C.DAMAGE.hydropowerMW} MW</h2>
<p>Nepal’s Bhote Koshi-Trishuli corridor carries a concentration of hydropower capacity, sited on the riverbank because that is where the water and the flat ground are. The Nepal Electricity Authority reports <strong>${C.DAMAGE.hydropowerProjects} projects damaged</strong> with a combined capacity of about <strong>${C.DAMAGE.hydropowerMW} MW</strong>: ${C.DAMAGE.hydropowerOperational} operating plants totalling ${C.DAMAGE.hydropowerOperationalMW} MW, and ${C.DAMAGE.hydropowerUnderConstruction} under construction totalling ${C.DAMAGE.hydropowerUnderConstructionMW} MW.</p>
<p class="small">An earlier estimate the same day, from the Ministry of Energy, put the loss at ${C.DAMAGE.hydropowerEarlierEstimateMW} MW. Both figures were published on 27 August. That gap is a fair measure of how provisional every damage number on this page is.</p>
${table(['Project', 'District', 'What is reported'], C.DAMAGE.hydropower.map(([n, d2, t2]) => [`<strong>${esc(n)}</strong>`, esc(d2), esc(t2)]), `Named projects from the Nepal Electricity Authority via the ${esc(C.SITREP_SHORT)}, and reporting by The Kathmandu Post. The NEA count of ${C.DAMAGE.hydropowerProjects} projects includes further sites it has not individually named.`)}

<h2>Roads and bridges</h2>
<p>The Department of Roads confirms that the <strong>entire ${C.DAMAGE.roadDestroyedKm} km road linking Betrawati in Nuwakot to the Rasuwagadhi border crossing has been destroyed at multiple points</strong>, including several concrete bridges. A further <strong>${C.DAMAGE.roadExtraKm} km stretch</strong> toward the border, recently upgraded with Chinese government financing, was also swept away.</p>
<p>That is not one road among many. It is Nepal’s principal overland trade and pilgrimage route to Tibet, so the damage has an economic tail well beyond the district. It is also the same road rescue teams need to reach the worst-hit settlements, which is why so much of the response has had to go by helicopter.</p>
<p>Suspension (<em>jhulunge</em>) bridges lost in the corridor matter more than the count suggests: in hill districts they are frequently the only way across a river for a village, so losing one cuts a settlement off entirely rather than lengthening a drive.</p>

<h2>Buildings and services</h2>
<ul>
  <li><strong>${C.DAMAGE.banksSwept} commercial bank branches</strong> swept away, with <strong>${C.DAMAGE.bankStaffMissing} staff unaccounted for</strong>.</li>
  <li><strong>The Rasuwa customs office at Timure</strong> lost contact with <strong>${C.DAMAGE.customsStaffMissing} employees</strong>.</li>
  <li><strong>The Syabrubesi helipad destroyed</strong>, which slowed rescue flights into the upper valley on the first day.</li>
  <li><strong>Power, phone and internet down</strong> across the valley, restored slowly and unevenly. This is the direct reason the missing-persons count is as high as it is.</li>
  <li><strong>Dry port and customs facilities hit on both sides</strong> of the Rasuwagadhi-Gyirong crossing.</li>
  <li><strong>Most river gauges destroyed</strong> on the Bhote Koshi and Trishuli, cutting warning time for anything that follows.</li>
  <li><strong>No consolidated displacement figure has been published.</strong> UN OCHA names the number of people displaced, sheltering or in need as the priority information gap for the days ahead. This site will not estimate it.</li>
</ul>

<h2>The cost estimate, and what it does not include</h2>
<p>Physical Infrastructure and Transport Minister <strong>Sunil Lamsal</strong> put damage to roads and bridges at about <strong>${esc(C.DAMAGE.costEstimate)}</strong> on 26 August, and described the figure as preliminary. It is a first-day estimate from one ministry covering one category of asset.</p>
<p>Not in that figure:</p>
<ul>
  <li>The ${C.DAMAGE.hydropowerProjects} damaged hydropower projects, and about ${C.DAMAGE.hydropowerMW} MW of lost generation while they are out.</li>
  <li>Private homes, shops, hotels and land.</li>
  <li>Agricultural losses downstream.</li>
  <li>Trade losses from the closed border route.</li>
</ul>
<p>No full damage assessment exists yet. Rasuwa, Nuwakot, Dhading and Chitwan are still being surveyed, and many of the damaged sites cannot currently be reached by road, which is also why insurers say claims will take weeks to settle.</p>

<h2>Relief money released</h2>
${table(['Recipient', 'Amount'], C.DAMAGE.reliefBreakdown.map(([k, v]) => [esc(k), `<span class="num">${esc(v)}</span>`]), 'Government of Nepal, announced 26 August 2026. Public donations are not counted here until an official total is published.')}
<p><a href="/nepal-flood/relief/">How to contribute to the government relief fund safely</a>, including the official bank accounts and QR code.</p>

<h2>Sources</h2>
<ul>
  <li><a href="https://reliefweb.int/report/nepal/nepal-flash-floods-rapid-situation-overview-27-august-2026" target="_blank" rel="noopener nofollow">UN OCHA ReliefWeb rapid situation overview, 27 August 2026</a>: hydropower, roads, banks and customs figures, drawing on the Nepal Electricity Authority, the Department of Roads, NDRRMA and Nepal Police.</li>
  <li><a href="https://kathmandupost.com/national/2026/08/26/major-flood-damages-syabrubesi-hydropower-projects-in-rasuwa" target="_blank" rel="noopener nofollow">The Kathmandu Post</a>: hydropower damage in the Syabrubesi area.</li>
  <li><a href="https://english.onlinekhabar.com/rasuwa-floods-damage.html" target="_blank" rel="noopener nofollow">Onlinekhabar</a>: the ministerial damage estimate and the relief allocations.</li>
</ul>
`;
  const t = `Rasuwa Flood Damage: ${C.DAMAGE.hydropowerProjects} Hydropower Projects and the Border Road`;
  const d = `Rasuwa flood damage in Nepal: ${C.DAMAGE.hydropowerProjects} hydropower projects worth about ${C.DAMAGE.hydropowerMW} MW hit, the whole ${C.DAMAGE.roadDestroyedKm} km Betrawati-Rasuwagadhi road destroyed, and a preliminary ${C.DAMAGE.costEstimate} estimate for roads and bridges.`;
  return {
    path, title: t, description: d, lastmod: ctx.modified, priority: '0.8', changefreq: 'daily',
    html: page({
      rail: liveRail(ctx),
      path, title: t, description: d,
      ogTitle: 'Rasuwa flood damage: hydropower, bridges and the cost so far',
      h1: 'Rasuwa flood: damage assessment',
      lede: 'What was destroyed, project by project and category by category, and which numbers are preliminary, which is all of them.',
      crumbs: [{ label: 'Home', href: '/' }, { label: 'Nepal floods', href: '/nepal-flood/' }, { label: 'Rasuwa flood 2026', href: '/nepal-flood/rasuwa/' }, { label: 'Damage' }],
      statusPill: 'live',
      updatedNote: bylineLive(ctx.modified),
      published: '2026-08-26T18:00:00+05:45',
      modified: ctx.modified,
      body: body + related('Related', [
        { href: '/nepal-flood/relief/', title: 'Relief and donations', text: 'The government fund, the bank details, and how to avoid a fake appeal.', verb: 'how to help' },
        { href: '/nepal-flood/rasuwa/map/', title: 'Map of the flood path', text: 'Where each damaged site sits along the river.', verb: 'the map' },
        { href: '/nepal-flood/rasuwa/', title: 'Full event briefing', text: 'The whole picture in one page.', verb: 'the briefing' },
      ]),
      schema: [articleNode({
        type: 'NewsArticle', path,
        headline: 'Rasuwa flood damage: hydropower, bridges and the preliminary cost',
        description: d, published: '2026-08-26T18:00:00+05:45', modified: ctx.modified, about: EVENT_ABOUT,
      })],
    }),
  };
}

/* -- 8. /nepal-flood/rasuwa/map/ -------------------------------------------- */

export function mapPage(ctx) {
  const path = '/nepal-flood/rasuwa/map/';
  const placeJson = JSON.stringify(C.PLACES.map(p => ({ n: p.name, la: p.lat, lo: p.lng, e: p.elev, t: p.text })));

  const body = `
<p class="measure">The flood did not start in Nepal. It began high inside Tibet and fell more than 3,000 metres before it reached the first Nepali town. Below is every point along that route, with its coordinates, followed by an interactive satellite map.</p>

<h2>Every point along the flood path</h2>
${table(['#', 'Place', 'Coordinates', 'Elevation', 'What happened'], C.PLACES.map((p, i) => [
    i + 1,
    `<strong>${esc(p.name)}</strong><br><span class="faint">${esc(p.country)}</span>`,
    `<span class="num">${p.lat.toFixed(4)}, ${p.lng.toFixed(4)}</span>`,
    `<span class="num">${esc(p.elev)}</span>`,
    esc(p.text),
  ]), 'Ordered downstream. Coordinates are approximate, taken from published reporting and satellite imagery.')}

<h2>Interactive map</h2>
<div id="route-map" role="application" aria-label="Interactive satellite map of the Bhote Koshi and Trishuli flood corridor">
  <noscript><p style="padding:20px;font-size:.9rem;">The interactive map needs JavaScript. Every point it shows, with coordinates and elevation, is in the table above.</p></noscript>
</div>
<p class="map-note" id="map-attrib">Satellite imagery &copy; Esri, Maxar, Earthstar Geographics and the GIS user community. The table above carries the same information without needing the map to load.</p>
<p><a href="/">Open the full interactive flood map on the live dashboard</a>. It adds terrain and street layers and an animated play-through of the route.</p>

<h2>Why this valley floods hard</h2>
<div class="cards">
  <div class="card"><h3>A 3,000-metre drop in under 40 km</h3><p>One of the steepest river runs in the Himalaya. Water released upstream reaches a village in under an hour. There is almost no time to move.</p></div>
  <div class="card"><h3>One river, two names</h3><p>Above the confluence at Syabrubesi it is the Bhote Koshi. Below, it is the Trishuli. Same water. In Tibet the upper river is the Kyirong Tsangpo, fed by the Lende Khola where the ice and rock came down.</p></div>
  <div class="card"><h3>It happened here in July 2025</h3><p>A broadly similar flood struck the same river thirteen months earlier, attributed to the drainage of a supraglacial lake. Hydropower on this corridor has now been hit twice in just over a year.</p></div>
</div>

<h2>Which districts the water passed through</h2>
<p>Rasuwa was hit hardest. The water then ran through Nuwakot along the Trishuli, and bodies have been recovered as far downstream as Chitwan on the Narayani, six districts below the source.</p>
${table(['District', 'Province', 'Role in this event'], [
    ['<strong>Rasuwa</strong>', 'Bagmati', 'Origin point in Nepal. Timure and Syabrubesi hit hardest; Rasuwagadhi border crossing damaged.'],
    ['<strong>Nuwakot</strong>', 'Bagmati', 'Downstream along the Trishuli. Betrawati, Trishuli Bazaar and Devighat affected; multiple hydropower sites damaged.'],
    ['<strong>Dhading</strong>', 'Bagmati', 'Further downstream. Bodies recovered; district allocated relief funds.'],
    ['<strong>Chitwan</strong>', 'Bagmati', 'On the Narayani. The largest number of bodies recovered.'],
    ['<strong>Gorkha</strong>', 'Gandaki', 'Bodies recovered along the river.'],
    ['<strong>Tanahun</strong>', 'Gandaki', 'Bodies recovered along the river.'],
    ['<strong>Nawalparasi East and West</strong>', 'Gandaki / Lumbini', 'Bodies recovered furthest downstream on the Narayani.'],
  ], 'Districts where deaths have been confirmed or damage reported.')}
<p><a href="/nepal-flood/rasuwa/casualties/">See the district-by-district recovery figures</a>.</p>
`;

  const head = `<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin="">
<link rel="preconnect" href="https://server.arcgisonline.com">`;

  /* Leaflet is loaded after first paint and only once the map scrolls into
     view, so the table above it is never blocked by a 150 kB map library. */
  const tail = `<script>
(function(){
  var el = document.getElementById('route-map');
  if(!el) return;
  var PLACES = ${placeJson};
  var started = false;
  function start(){
    if(started) return; started = true;
    var css = document.createElement('link');
    var s = document.createElement('script');
    s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    s.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
    s.crossOrigin = '';
    s.onload = draw;
    s.onerror = function(){ el.innerHTML = '<p style="padding:20px;font-size:.9rem;">The map could not load. Every point it shows is in the table above.</p>'; };
    document.head.appendChild(s);
  }
  function draw(){
    if(!window.L) return;
    var map = L.map(el, { scrollWheelZoom:false, attributionControl:false });
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom:18 }).addTo(map);
    var pts = [];
    PLACES.forEach(function(p, i){
      pts.push([p.la, p.lo]);
      L.circleMarker([p.la, p.lo], { radius:8, color:'#fff', weight:2, fillColor:'#dc2626', fillOpacity:1 })
        .addTo(map)
        .bindPopup('<strong>' + (i+1) + '. ' + p.n + '</strong><br>' + p.e + '<br>' + p.t);
    });
    L.polyline(pts, { color:'#dc2626', weight:3, opacity:.85 }).addTo(map);
    map.fitBounds(L.latLngBounds(pts).pad(0.18));
  }
  if('IntersectionObserver' in window){
    var io = new IntersectionObserver(function(es){ es.forEach(function(e){ if(e.isIntersecting){ io.disconnect(); start(); } }); }, { rootMargin:'300px' });
    io.observe(el);
  } else { addEventListener('load', start); }
})();
</script>`;

  const t = 'Rasuwa Flood Map: The Path the Water Took, Point by Point';
  const d = 'Map of the 2026 Rasuwa flood in Nepal: seven points from the suspected break-off inside Tibet down the Bhote Koshi and Trishuli to Devighat, with coordinates and elevations.';
  return {
    path, title: t, description: d, lastmod: ctx.modified, priority: '0.8', changefreq: 'weekly',
    html: page({
      rail: liveRail(ctx),
      path, title: t, description: d,
      h1: 'Map of the Rasuwa flood path',
      lede: 'From the suspected break-off point inside Tibet, 4,500 metres down to Nuwakot. Every point with coordinates, as a table first and a map second.',
      crumbs: [{ label: 'Home', href: '/' }, { label: 'Nepal floods', href: '/nepal-flood/' }, { label: 'Rasuwa flood 2026', href: '/nepal-flood/rasuwa/' }, { label: 'Map' }],
      statusPill: 'live',
      updatedNote: bylineLive(ctx.modified),
      published: '2026-08-26T17:00:00+05:45',
      modified: ctx.modified, head, tail,
      body: body + related('Related', [
        { href: '/nepal-flood/rasuwa/cause/', title: 'What caused it', text: 'What is at the top of this map, and why it may still be dangerous.', verb: 'the analysis' },
        { href: '/nepal-flood/rasuwa/damage/', title: 'Damage', text: 'What was destroyed at each point along the corridor.', verb: 'the damage' },
        { href: '/nepal-flood/rasuwa/timeline/', title: 'Timeline', text: 'When the water reached each of these places.', verb: 'the timeline' },
      ]),
      schema: [articleNode({
        path, headline: 'Rasuwa flood map: the path the water took, point by point',
        description: d, published: '2026-08-26T17:00:00+05:45', modified: ctx.modified, about: EVENT_ABOUT,
      }), {
        '@type': 'Place',
        '@id': `${SITE}${path}#place`,
        name: 'Bhote Koshi-Trishuli flood corridor, Nepal',
        geo: { '@type': 'GeoCoordinates', latitude: 28.15, longitude: 85.35 },
        containedInPlace: { '@type': 'Country', name: 'Nepal' },
      }],
    }),
  };
}

/* -- 9. /nepal-flood/rasuwa/live-updates/ ----------------------------------- */

export function liveUpdates(ctx) {
  const path = '/nepal-flood/rasuwa/live-updates/';
  const posts = ctx.posts;

  const body = `
${EMERGENCY_STRIP}

<h2>Latest briefings</h2>
<p class="measure">Each entry below is written and checked by hand against the sources named under it. Newest first. The automatically collected newswire feed follows underneath.</p>

<ul class="postlist">
${posts.map(p => `<li><a class="postcard" href="${esc(p.url)}">
  <time datetime="${esc(p.time)}">${esc(nptLong(p.time))}</time>
  <h2>${esc(p.title)}</h2>
  <p>${esc((p.body[0] || '').slice(0, 190))}${(p.body[0] || '').length > 190 ? '…' : ''}</p>
</a></li>`).join('\n')}
</ul>
<p><a href="/updates/">Browse the full update archive</a>.</p>

${SECOND_FLOOD_WARNING}

<h2>Newswire</h2>
<p class="measure">Collected automatically from UN disaster alerts, the US Geological Survey, and named newsrooms in Nepal and abroad, through this site’s own server. Each line is a headline and a link. Stories are read at the source, not copied here.</p>
<div id="wire-state" class="feed-state">Loading the newswire…</div>
<div class="feedlist" id="wire"></div>
<p class="faint">Feed refreshed at most every two minutes. If it is empty or stale, the block above says so rather than showing old items as current. Subscribe by RSS: <a href="${SITE}/feed.xml">${SITE}/feed.xml</a></p>

<h2>How this feed is verified</h2>
<p>An item is marked <strong>verified</strong> when it comes from an official alerting source, ReliefWeb (UN OCHA), GDACS (UN and European Commission) or the USGS, or when two or more independent newsrooms are reporting the same thing. Everything else is left unmarked rather than guessed at. Diplomatic condolence statements are filtered out entirely, because they carry no rescue, casualty or damage information.</p>
<p>Nothing on this page is written by an automated system pretending to be a reporter. The briefings at the top are typed by a person from named bulletins; the newswire below is a link list, and it says which newsroom each link belongs to.</p>
`;

  const tail = `<script>
(function(){
  var wrap = document.getElementById('wire'), state = document.getElementById('wire-state');
  if(!wrap) return;
  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]; }); }
  function ago(t){
    if(!t) return '';
    var m = Math.round((Date.now() - new Date(t)) / 60000);
    if(!isFinite(m) || m < 0) return '';
    if(m < 60) return m + ' min ago';
    if(m < 1440) return Math.round(m/60) + ' h ago';
    return Math.round(m/1440) + ' d ago';
  }
  fetch('/api/news').then(function(r){
    if(!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  }).then(function(d){
    var items = (d && d.items || []).slice(0, 30);
    if(!items.length){
      state.textContent = 'The newswire returned nothing just now. The hand-written briefings above are unaffected. Try again in a few minutes.';
      return;
    }
    state.hidden = true;
    wrap.innerHTML = items.map(function(i){
      return '<div class="feeditem"><a href="' + esc(i.url) + '" target="_blank" rel="noopener nofollow">' + esc(i.title) + '</a>' +
        '<div class="meta"><span>' + esc(i.source || '') + '</span>' +
        (ago(i.time) ? '<span>' + ago(i.time) + '</span>' : '') +
        (i.verified ? '<span>verified</span>' : '') + '</div></div>';
    }).join('');
  }).catch(function(e){
    state.textContent = 'The newswire could not be reached (' + e.message + '). This does not affect the briefings above, which are stored on this page. Emergency numbers are at the top and work regardless.';
  });
})();
</script>`;

  const newest = posts[0];
  const t = 'Rasuwa Flood Live Updates: Latest News From Nepal';
  const d = newest
    ? `Rasuwa flood live updates. Latest: ${stripTags(newest.title)}. Hand-checked briefings with named sources, plus a live newswire.`
    : 'Rasuwa flood live updates from Nepal: hand-checked briefings with named sources, plus a live newswire from Nepali and international newsrooms.';
  return {
    path, title: t, description: d, lastmod: ctx.modified, priority: '0.9', changefreq: 'hourly',
    html: page({
      rail: liveRail(ctx),
      path, title: t, description: d,
      h1: 'Rasuwa flood: live updates',
      lede: 'Everything as it comes in. Hand-written briefings at the top, the raw newswire below, and the source named on every line.',
      crumbs: [{ label: 'Home', href: '/' }, { label: 'Nepal floods', href: '/nepal-flood/' }, { label: 'Rasuwa flood 2026', href: '/nepal-flood/rasuwa/' }, { label: 'Live updates' }],
      statusPill: 'live',
      updatedNote: bylineLive(ctx.modified),
      published: '2026-08-26T12:00:00+05:45',
      modified: ctx.modified, tail,
      body: body + related('Related', [
        { href: '/nepal-flood/rasuwa/', title: 'Full event briefing', text: 'The whole picture: what happened, cause, damage, missing.', verb: 'the briefing' },
        { href: '/nepal-flood/rasuwa/casualties/', title: 'Confirmed casualties', text: 'The figures behind the headlines, with the bulletin attached.', verb: 'the figures' },
        { href: '/updates/', title: 'Update archive', text: 'Every briefing published so far, oldest to newest.', verb: 'the archive' },
      ]),
      schema: [
        {
          '@type': 'LiveBlogPosting',
          '@id': `${SITE}${path}#liveblog`,
          headline: 'Rasuwa flood live updates',
          description: d,
          inLanguage: 'en',
          isAccessibleForFree: true,
          datePublished: '2026-08-26T12:00:00+05:45',
          dateModified: ctx.modified,
          coverageStartTime: '2026-08-26T09:00:00+05:45',
          /* Live coverage has to declare an end time, and while it is still
             running that time has to be in the future or the page reads to a
             crawler as coverage that already finished. It is set three days
             past the newest bulletin and moves with it; when the bulletins
             stop, it stops, and the coverage correctly closes itself. */
          coverageEndTime: new Date(new Date(ctx.modified).getTime() + 3 * 86400 * 1000).toISOString(),
          /* The one-paragraph "what is this event" a reader needs when an
             update reaches them on its own. */
          backstory: (ctx.event && ctx.event.lede) || 'A flash flood came down the Bhote Koshi from Tibet into Rasuwa district, Nepal, on 26 August 2026.',
          author: ORG,
          publisher: ORG,
          mainEntityOfPage: { '@id': `${SITE}${path}#webpage` },
          about: EVENT_ABOUT,
          liveBlogUpdate: posts.map(p => ({
            '@type': 'BlogPosting',
            '@id': SITE + p.url + '#post',
            headline: p.title,
            url: SITE + p.url,
            datePublished: p.time,
            dateModified: p.time,
            articleBody: p.body.join(' ').slice(0, 500),
            author: ORG,
            publisher: ORG,
          })),
        },
      ],
    }),
  };
}

/* -- 10. /nepal-flood/emergency-numbers/ ------------------------------------ */

export function emergencyNumbers(ctx) {
  const path = '/nepal-flood/emergency-numbers/';
  const faq = faqBlock([
    {
      q: 'What is the emergency number in Nepal?',
      a: '<p><strong>100</strong> reaches Nepal Police and is the general emergency number. From any mobile phone, <strong>112</strong> also reaches emergency services and is the one to use if you cannot recall the right number. For an ambulance, call <strong>102</strong>; for fire, <strong>101</strong>.</p>',
    },
    {
      q: 'What is the disaster hotline in Nepal?',
      a: '<p><strong>1149</strong> is the National Emergency Operation Centre (NEOC) disaster hotline. <strong>1155</strong> is the Nepal Police toll-free public helpline. Both are national numbers and free to call.</p>',
    },
    {
      q: 'Is there a helpline for tourists in Nepal?',
      a: '<p>Yes. <strong>1144</strong> is the Tourist Police. Use it for help with visitors and trekkers, including checking on someone who was trekking in an affected area. Your own embassy in Kathmandu is the other route, and the two work together.</p>',
    },
    {
      q: 'Do these numbers work from a foreign SIM in Nepal?',
      a: '<p>112 is designed to work from any mobile handset on any network. The short codes (100, 101, 102, 103, 1144, 1149, 1155) are national numbers dialled without an area code inside Nepal. If a line is busy, which happens during a large incident, try 100 or 112.</p>',
    },
  ]);

  const body = `
<div class="callout callout-alert">
  <p class="callout-title">If someone is in immediate danger right now</p>
  <p>Call <strong>100</strong> (Nepal Police) or <strong>112</strong> from a mobile. Do not wait for anything else on this page to load.</p>
</div>

<div class="dialrow">
${C.EMERGENCY_NUMBERS.map(([n, who]) => `<a class="dial" href="tel:${n}"><b>${n}</b><span>${esc(who)}</span></a>`).join('\n')}
</div>

<h2>Every national emergency number, and what it is for</h2>
${table(['Number', 'Who answers', 'Use it for'], C.EMERGENCY_NUMBERS.map(([n, who, note]) =>
    [`<a href="tel:${n}"><strong class="num">${n}</strong></a>`, esc(who), esc(note)]),
    'National numbers, dialled without an area code anywhere in Nepal.')}
<p class="faint">100, 101, 102, 103 and 112 are confirmed against the public emergency-number register. 1149, 1155 and 1144 are the published hotlines of the National Emergency Operation Centre and Nepal Police. If a line is busy, try 100 or 112.</p>

<h2>District and hospital numbers</h2>
<p>Numbers below the national ones change by district and by hospital, and printing them here would mean printing figures that go out of date without anyone noticing. Instead, these are the official directories that publish and maintain them. Every link is a government or Red Cross page.</p>
<div class="sourcelinks">
${C.DIRECTORIES.map(([u, l]) => `<a href="${esc(u)}" target="_blank" rel="noopener nofollow">${esc(l)} &#8599;</a>`).join('\n')}
</div>

<h2>Reporting someone missing</h2>
<div class="checklist">
${C.MISSING_STEPS.slice(0, 4).map((s, i) => `<div class="check-row"><span class="mark">${String(i + 1).padStart(2, '0')}</span><p>${esc(s)}</p></div>`).join('\n')}
</div>
<p><a href="/nepal-flood/rasuwa/missing-persons/">The full missing-persons guide</a>, including what information to have ready and the route for foreign nationals.</p>

<h2>Foreign nationals and families abroad</h2>
<p>Contact your own country’s embassy in Kathmandu first. Embassies coordinate directly with Nepal Police on foreign nationals, and the Department of Immigration holds entry records that help confirm whether someone entered a given district.</p>
<div class="sourcelinks">
  <a href="https://mofa.gov.np/foreign-mission-in-nepal/" target="_blank" rel="noopener nofollow">Embassies in Nepal, official list &#8599;</a>
  <a href="https://www.immigration.gov.np/" target="_blank" rel="noopener nofollow">Department of Immigration &#8599;</a>
</div>

<h2>Before the emergency: save these now</h2>
<p>The single most useful thing you can do with this page is stop reading it and add 100, 112 and 1149 to your phone. During an incident, mobile networks are congested and web pages are the slowest thing on a phone. A stored contact does not need a network to find.</p>
<ul>
${C.RIVER_SAFETY.map(s => `<li>${esc(s)}</li>`).join('\n')}
</ul>

<h2>Questions people ask</h2>
${faq.html}
`;
  const t = 'Nepal Emergency Numbers: Police 100, Ambulance 102, Disaster Hotline 1149';
  const d = 'Every national emergency number in Nepal and what each is for: police 100, mobile emergency 112, ambulance 102, fire 101, traffic police 103, disaster hotline 1149, helpline 1155, tourist police 1144.';
  return {
    path, title: t, description: d, lastmod: ctx.buildDay, priority: '0.9', changefreq: 'monthly',
    alternates: [{ hreflang: 'en', path: '/nepal-flood/emergency-numbers/' }, { hreflang: 'ne', path: '/ne/aapatkalin-number/' }],
    html: page({
      rail: liveRail(ctx),
      path, title: t, description: d,
      h1: 'Nepal emergency numbers',
      lede: 'Tap any number to dial it. These are national numbers and work from any phone in Nepal. They do not change between disasters. Save them now.',
      crumbs: [{ label: 'Home', href: '/' }, { label: 'Nepal floods', href: '/nepal-flood/' }, { label: 'Emergency numbers' }],
      published: '2026-08-26T12:00:00+05:45',
      modified: ctx.modified,
      updatedNote: `<b>${esc(SITE_NAME)}</b><span>National numbers, checked against the official registers</span><span>Reviewed ${esc(nptLong(ctx.modified, false))}</span>`,
      alternates: [
        { hreflang: 'en', path: '/nepal-flood/emergency-numbers/' },
        { hreflang: 'ne', path: '/ne/aapatkalin-number/' },
      ],
      extraPills: '<a class="pill" href="/ne/aapatkalin-number/" hreflang="ne" lang="ne">नेपालीमा पढ्नुहोस्</a>',
      body: body + related('Related', [
        { href: '/nepal-flood/relief/', title: 'How to help safely', text: 'The government relief fund, and how to spot a fake appeal.', verb: 'how to help' },
        { href: '/nepal-disasters/', title: 'Nepal hazard guide', text: 'What to do for each hazard: flood, quake, landslide, lightning.', verb: 'the guide' },
        { href: '/nepal-flood/rasuwa/', title: 'Rasuwa flood briefing', text: 'The event happening now, and what is still unknown.', verb: 'the briefing' },
      ]),
      schema: [
        articleNode({
          path, headline: 'Nepal emergency numbers: police, ambulance, fire and the national disaster hotline',
          description: d, published: '2026-08-26T12:00:00+05:45', modified: ctx.modified,
        }),
        faq.node,
      ],
    }),
  };
}

/* -- 11. /nepal-flood/relief/ ----------------------------------------------- */

export function relief(ctx) {
  const path = '/nepal-flood/relief/';
  const bankTable = (rows) => table(['Bank', 'Account number'], rows.map(([b, accs]) =>
    [esc(b), accs.map(a => `<span class="num">${esc(a)}</span>`).join('<br>')]));

  const body = `
<div class="callout">
  <p class="callout-title">This site never handles money</p>
  <p>There is no donate button here and no payment processor. Every account below belongs to the Government of Nepal, transcribed by hand from the Prime Minister’s Office’s own published graphic on 26 August 2026. Check the account name at your bank before sending anything.</p>
</div>

<h2>Prime Minister’s Natural Disaster Relief Fund</h2>
<p>Nepal’s own government fund for disaster rescue and rebuilding, run by the Office of the Prime Minister. It is the only channel this site recommends, because it is the only one whose accounts can be checked against an official published source.</p>
<div class="callout">
  <p class="callout-title">Giving by card from outside Nepal</p>
  <p>The government opened an online donation gateway on ${esc(C.RELIEF_PORTAL.opened)}: <a href="${esc(C.RELIEF_PORTAL.url)}" target="_blank" rel="noopener"><span class="num">${esc(C.RELIEF_PORTAL.host)}</span></a>. It is run by ${esc(C.RELIEF_PORTAL.operator)}. ${esc(C.RELIEF_PORTAL.methods)}. ${esc(C.RELIEF_PORTAL.currency)}</p>
  <p>This is the one payment link on this site, and it is here because the Office of the Prime Minister published it itself: ${C.RELIEF_PORTAL.confirmedBy.map(([name, url]) => `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(name)}</a>`).join(', ')}. Anything else asking for flood money, in any message, is not vouched for here.</p>
  <p class="faint">The older address <span class="num">pmrelief.opmcm.gov.np</span> still does not load, checked 28 August 2026.</p>
</div>
${bankTable(C.RELIEF_BANKS)}
<p class="faint">Prime Minister’s Relief Fund (general fund, not disaster-specific):</p>
${bankTable(C.RELIEF_BANKS_GENERAL)}

<h3>Official QR code</h3>
<p><img src="/qr-pmo-nepal.png" alt="Official donation QR code published by the Office of the Prime Minister of Nepal for the Natural Disaster Relief Fund" width="556" height="472" loading="lazy" decoding="async" style="max-width:340px;height:auto;border:1px solid var(--border);border-radius:14px;padding:10px;background:#fff;"></p>
<p class="faint">Published by the Office of the Prime Minister of Nepal. Sourced 26 August 2026.</p>

<h2>What the government has released so far</h2>
${table(['Recipient', 'Amount'], C.DAMAGE.reliefBreakdown.map(([k, v]) => [esc(k), `<span class="num">${esc(v)}</span>`]), 'Announced 26 August 2026. Public donations are not counted here until an official total is published.')}
<p>Keep this separate from the damage figure. <strong>${esc(C.DAMAGE.costEstimate)}</strong> is the preliminary estimate of what the flood <em>destroyed</em> in roads and bridges; <strong>${esc(C.DAMAGE.reliefReleased)}</strong> is what has been <em>released</em> for relief. The two are not comparable and are never added together on this site. <a href="/nepal-flood/rasuwa/damage/">See the full damage assessment</a>.</p>

<h2>Help that is not money</h2>
<div class="cards">
  <div class="card"><h3>Blood</h3><p>Blood is needed after any disaster. The Nepal Red Cross Society runs collection across Kathmandu and the districts.</p></div>
  <div class="card"><h3>Verified information</h3><p>Local photographs with a date and place, missing-person details given to the police, and shelter reports are what response teams actually work from. Accurate information is scarcer than money in the first week.</p></div>
  <div class="card"><h3>Free-licence photographs</h3><p>If you photographed the affected area, uploading to Wikimedia Commons under a free licence lets every newsroom and aid agency use it, not just one.</p></div>
</div>

<h2>How to spot a fake relief appeal</h2>
<p>Fake appeals appear within hours of every disaster in Nepal, and they are convincing. Five checks that catch most of them:</p>
<ul>
  <li><strong>Check the account name, not the account number.</strong> A legitimate fund’s account is in the name of the institution, not a person.</li>
  <li><strong>Be suspicious of personal wallets.</strong> Relief funds do not collect through individual mobile-wallet numbers.</li>
  <li><strong>Ignore deadlines.</strong> "Send tonight or it is too late" is a pressure tactic, not a relief operation.</li>
  <li><strong>Check the domain carefully.</strong> Lookalike domains with an extra hyphen or a swapped letter are the standard trick.</li>
  <li><strong>Verify against a government source.</strong> If the appeal cannot be traced back to an official published page, treat it as unverified.</li>
</ul>
<p>Nepal Police do not ask for payment to search for a missing person. Neither does any legitimate rescue organisation.</p>

<h2>Official organisations</h2>
<div class="sourcelinks">
  <a href="https://www.opmcm.gov.np/" target="_blank" rel="noopener nofollow">Office of the Prime Minister &#8599;</a>
  <a href="https://ndrrma.gov.np/" target="_blank" rel="noopener nofollow">NDRRMA, national disaster authority &#8599;</a>
  <a href="https://www.nrcs.org/" target="_blank" rel="noopener nofollow">Nepal Red Cross Society &#8599;</a>
  <a href="https://neoc.gov.np/" target="_blank" rel="noopener nofollow">National Emergency Operation Centre &#8599;</a>
</div>
`;
  const t = 'Nepal Flood Relief: How to Donate Safely to the Government Fund';
  const d = 'How to donate to Nepal flood relief through the Prime Minister’s Natural Disaster Relief Fund: the official bank accounts and QR code from the PMO’s own graphic, and how to spot a fake appeal.';
  return {
    path, title: t, description: d, lastmod: ctx.buildDay, priority: '0.8', changefreq: 'weekly',
    alternates: [{ hreflang: 'en', path: '/nepal-flood/relief/' }, { hreflang: 'ne', path: '/ne/rahat/' }],
    html: page({
      rail: liveRail(ctx),
      path, title: t, description: d,
      h1: 'Nepal flood relief: how to help',
      lede: 'Every link here goes to the Government of Nepal’s own fund. This site never handles money, and says openly which details it could not cross-check.',
      crumbs: [{ label: 'Home', href: '/' }, { label: 'Nepal floods', href: '/nepal-flood/' }, { label: 'Relief and donations' }],
      published: '2026-08-26T12:00:00+05:45',
      modified: ctx.modified,
      updatedNote: `<b>${esc(SITE_NAME)}</b><span>Bank details transcribed by hand from an official PMO Nepal graphic, 26 August 2026</span><span>Reviewed ${esc(nptLong(ctx.modified, false))}</span>`,
      alternates: [
        { hreflang: 'en', path: '/nepal-flood/relief/' },
        { hreflang: 'ne', path: '/ne/rahat/' },
      ],
      extraPills: '<a class="pill" href="/ne/rahat/" hreflang="ne" lang="ne">नेपालीमा पढ्नुहोस्</a>',
      body: body + related('Related', [
        { href: '/nepal-flood/rasuwa/damage/', title: 'What the flood destroyed', text: 'Hydropower, bridges, roads and the preliminary cost.', verb: 'the damage' },
        { href: '/nepal-flood/emergency-numbers/', title: 'Emergency numbers', text: 'Every national helpline in Nepal.', verb: 'the numbers' },
        { href: '/sources/', title: 'Sources', text: 'Every source this site uses, listed in full.', verb: 'the list' },
      ]),
      schema: [articleNode({
        path, headline: 'Nepal flood relief: how to donate safely to the government fund',
        description: d, published: '2026-08-26T12:00:00+05:45', modified: ctx.modified,
      })],
    }),
  };
}

/* -- 12. /nepal-disasters/ -------------------------------------------------- */

export function hazardGuide(ctx) {
  const path = '/nepal-disasters/';
  const body = `
<p class="measure">Nepal sits where two continents collide, under monsoon rain and below melting ice. Five hazards come out of that. Which one you are facing changes what you should do, and doing the wrong one is how people die in an event they could have survived.</p>

${C.HAZARDS.map(h => `
<h2 id="${h.slug}">${esc(h.name)}</h2>
<p>${esc(h.summary)}</p>
<div class="cards">
  <div class="card"><h3>Warning signs</h3><p>${esc(h.signs)}</p></div>
  <div class="card"><h3>What to do</h3><p>${esc(h.todo)}</p></div>
  <div class="card"><h3>Nepal’s exposure</h3><p>${esc(h.exposure)}</p></div>
</div>
<p><a class="more-link" href="/nepal-disasters/${h.slug}/">${esc(h.name)}: the full page, with the warning signs in order and the common questions answered &rsaquo;</a></p>`).join('\n')}

<h2>If you live near a mountain river</h2>
<div class="checklist">
${C.RIVER_SAFETY.map((s, i) => `<div class="check-row"><span class="mark">${String(i + 1).padStart(2, '0')}</span><p>${esc(s)}</p></div>`).join('\n')}
</div>

<h2>The warning-time problem</h2>
<p>A burst lake can reach a village in under an hour. Some Nepali lakes now have sensors and sirens. Most, especially those across the border in Tibet, do not, so the first warning is often the sound of the river itself. In the 2026 Rasuwa flood, most of the river gauges that did exist downstream were destroyed by the first wave, cutting warning time for anything that followed.</p>

<h2>Why it is getting worse</h2>
<p>Himalayan ice is melting faster than it is replaced. More meltwater means more and bigger lakes held back by weaker walls, in valleys where more people now live and build than a generation ago. The hazard is growing at the same time as the exposure.</p>

<h2>Current events on this site</h2>
<ul class="linklist">
  <li><a href="/nepal-flood/rasuwa/"><b>Rasuwa flood 2026</b><span>Active</span></a></li>
  <li><a href="/nepal-flood/"><b>Floods in Nepal</b><span>Hazard hub</span></a></li>
  <li><a href="/nepal-flood/emergency-numbers/"><b>Nepal emergency numbers</b><span>Reference</span></a></li>
</ul>

<h2>Learn from the people who study this</h2>
<div class="sourcelinks">
  <a href="https://www.icimod.org/" target="_blank" rel="noopener nofollow">ICIMOD, Himalayan research &#8599;</a>
  <a href="https://bipad.gov.np/" target="_blank" rel="noopener nofollow">BIPAD, Nepal’s disaster portal &#8599;</a>
  <a href="https://www.dhm.gov.np/" target="_blank" rel="noopener nofollow">Dept. of Hydrology &amp; Meteorology &#8599;</a>
  <a href="https://seismonepal.gov.np/" target="_blank" rel="noopener nofollow">National Seismological Centre &#8599;</a>
  <a href="https://drrportal.gov.np/" target="_blank" rel="noopener nofollow">Disaster Risk Reduction Portal &#8599;</a>
</div>
`;
  const t = 'Nepal Natural Disasters Explained: Floods, Earthquakes, Landslides, GLOFs';
  const d = 'A plain-language guide to Nepal’s five main natural hazards: glacial lake outburst floods, earthquakes, landslides, monsoon floods, and fire and lightning: warning signs and what to do.';
  return {
    path, title: t, description: d, lastmod: ctx.buildDay, priority: '0.8', changefreq: 'monthly',
    html: page({
      rail: liveRail(ctx),
      path, title: t, description: d,
      h1: 'Nepal’s natural disasters, explained simply',
      lede: 'Five hazards, the warning signs for each, and what to do. Written for someone reading it before an emergency, and usable during one.',
      crumbs: [{ label: 'Home', href: '/' }, { label: 'Nepal disaster guide' }],
      published: '2026-08-26T12:00:00+05:45',
      modified: ctx.modified,
      updatedNote: `<b>${esc(SITE_NAME)}</b><span>Evergreen reference, not tied to one event</span><span>Reviewed ${esc(nptLong(ctx.modified, false))}</span>`,
      body: body + related('Related', [
        { href: '/nepal-flood/rasuwa/cause/', title: 'What caused the Rasuwa flood', text: 'A live example of the GLOF and landslide-dam hazards described above.', verb: 'the analysis' },
        { href: '/nepal-flood/emergency-numbers/', title: 'Emergency numbers', text: 'Save them before you need them.', verb: 'the numbers' },
        { href: '/nepal-flood/', title: 'Floods in Nepal', text: 'Why Nepali rivers rise so fast, and the flood happening now.', verb: 'more' },
      ]),
      schema: [articleNode({
        path, headline: 'Nepal’s natural disasters, explained simply',
        description: d, published: '2026-08-26T12:00:00+05:45', modified: ctx.modified,
      })],
    }),
  };
}

/* -- 13. /updates/ and /updates/<slug>/ ------------------------------------- */

export function updateIndex(ctx) {
  const path = '/updates/';
  const posts = ctx.posts;
  const body = `
<p class="measure">Every briefing published on this site, newest first. Each one is written by hand from named sources and carries the time it was published in Nepal time. Nothing here is auto-generated.</p>

<ul class="postlist">
${posts.map(p => `<li><a class="postcard" href="${esc(p.url)}">
  <time datetime="${esc(p.time)}">${esc(nptLong(p.time))}</time>
  <h2>${esc(p.title)}</h2>
  <p>${esc((p.body[0] || '').slice(0, 200))}${(p.body[0] || '').length > 200 ? '…' : ''}</p>
</a></li>`).join('\n')}
</ul>

<p>For the automatically collected newswire from Nepali and international newsrooms, see <a href="/nepal-flood/rasuwa/live-updates/">the live updates page</a>, or subscribe to <a href="${SITE}/feed.xml">the RSS feed</a>.</p>
`;
  const t = 'Update Archive: Every Nepal Disaster Briefing Published Here';
  const d = 'Every hand-written briefing published by Nepal Disaster Update Live, newest first, each with its sources and the time it was published in Nepal time.';
  return {
    path, title: t, description: d, lastmod: ctx.modified, priority: '0.7', changefreq: 'daily',
    html: page({
      rail: liveRail(ctx),
      path, title: t, description: d,
      h1: 'Update archive',
      lede: 'Every briefing published here, newest first.',
      crumbs: [{ label: 'Home', href: '/' }, { label: 'Update archive' }],
      published: '2026-08-26T12:00:00+05:45',
      modified: ctx.modified,
      body,
      schema: [{
        '@type': 'CollectionPage',
        '@id': `${SITE}${path}#collection`,
        name: t,
        description: d,
        mainEntity: {
          '@type': 'ItemList',
          itemListOrder: 'https://schema.org/ItemListOrderDescending',
          numberOfItems: posts.length,
          itemListElement: posts.map((p, i) => ({
            '@type': 'ListItem', position: i + 1, url: SITE + p.url, name: p.title,
          })),
        },
      }],
    }),
  };
}

export function updateArticle(post, ctx) {
  const path = post.url;
  const others = ctx.posts.filter(p => p.url !== post.url).slice(0, 3);

  /* A briefing is a snapshot of what was confirmed at one hour. Once a newer
     one exists, the old page has to say so at the top. An archived casualty
     figure presenting itself as current is the worst failure this site can
     have. The page stays online: it is the record of what was known when. */
  const newer = ctx.posts.filter(p => new Date(p.time) > new Date(post.time))
    .sort((a, b) => new Date(a.time) - new Date(b.time));
  const newest = newer.length ? newer[newer.length - 1] : null;
  const supersededNote = newest
    ? `<div class="callout callout-alert">
        <p class="callout-title">This briefing has been overtaken</p>
        <p>It was published at ${esc(nptLong(post.time))} and is kept online as the record of what was confirmed at that hour. Figures in it are no longer current.</p>
        <p style="margin-bottom:0;"><strong><a href="${esc(newest.url)}">Read the latest briefing: ${esc(newest.title)}</a></strong> &middot; <a href="/nepal-flood/rasuwa/">Current event summary</a></p>
      </div>`
    : '';

  const sources = (post.sources || []).length
    ? `<h2>Sources for this briefing</h2><ul>${post.sources.map(s =>
        `<li><a href="${esc(s.url)}" target="_blank" rel="noopener nofollow">${esc(s.name)}</a></li>`).join('')}</ul>`
    : '';

  const body = `
${supersededNote}
${post.revised && !newest ? '<div class="callout"><p class="callout-title">Revised</p><p>This briefing was updated after publication as newer figures were confirmed. The time above is the time of the bulletin it is built on.</p></div>' : ''}
${post.body.map(p => `<p>${esc(p)}</p>`).join('\n')}
${sources}
<p class="faint">Written and checked by hand against the sources above. Figures are attributed to the bulletin they came from; where two sources disagreed, the lower confirmed figure was used. If something here is wrong, <a href="/contact/">tell us</a> and it gets corrected or removed.</p>
`;

  const first = stripTags(post.body[0] || post.title);
  const d = first.length > 165 ? first.slice(0, 162).replace(/\s+\S*$/, '') + '…' : first;
  /* Google cuts a title around 60 to 70 characters and the audit refuses
     anything over 75, so a long briefing headline is trimmed at a word
     boundary rather than being published and failing the deploy. */
  const t = post.title.length > 46
    ? (post.title.length > 75 ? post.title.slice(0, 74).replace(/\s+\S*$/, '') + '\u2026' : post.title)
    : `${post.title} | ${SITE_NAME}`;
  return {
    path, title: t, description: d, lastmod: nptDay(post.time), priority: '0.7', changefreq: 'weekly',
    html: page({
      rail: liveRail(ctx),
      path, title: t, ogTitle: post.title, description: d,
      h1: esc(post.title),
      crumbs: [{ label: 'Home', href: '/' }, { label: 'Update archive', href: '/updates/' }, { label: post.title }],
      published: post.time,
      modified: post.time,
      statusPill: newest ? 'archive' : 'live',
      updatedNote: `<b>${esc(SITE_NAME)}</b><span>Published ${esc(nptLong(post.time))}</span>${post.revised ? '<span>Revised after publication</span>' : ''}${newest ? '<span>Superseded by a later briefing</span>' : ''}`,
      body: body + related('More updates', others.map(p => ({
        href: p.url, title: p.title, text: stripTags(p.body[0] || '').slice(0, 120) + '…', verb: 'this update',
      })).concat([{ href: '/nepal-flood/rasuwa/', title: 'Full event briefing', text: 'Everything confirmed about the Rasuwa flood in one page.', verb: 'the briefing' }])),
      schema: [{
        '@type': 'NewsArticle',
        '@id': `${SITE}${path}#article`,
        headline: post.title,
        description: d,
        articleBody: post.body.join('\n\n'),
        inLanguage: 'en',
        isAccessibleForFree: true,
        datePublished: post.time,
        dateModified: post.time,
        author: ORG,
        publisher: ORG,
        mainEntityOfPage: { '@id': `${SITE}${path}#webpage` },
        image: [ogFor(path)],
        about: EVENT_ABOUT,
        ...(post.sources && post.sources.length
          ? { citation: post.sources.map(s => ({ '@type': 'CreativeWork', name: s.name, url: s.url })) }
          : {}),
      }],
    }),
  };
}

/* -- 14. /about/, /sources/, /contact/ -------------------------------------- */

/* ---------------------------------------------------------------------------
   The world tab.

   Readers who come for one disaster ask the same question next: what else is
   happening. Until now the answer was to leave the site. This is that page,
   and it is deliberately the same shape as the Nepal coverage: primary
   sources first, every item linked to whoever published it, nothing rewritten
   here.

   The list below is a snapshot taken when the site was last built, so the page
   carries real text for a reader with JavaScript off and for a crawler. The
   Live tab on the home page refreshes the same feed continuously.
   ------------------------------------------------------------------------- */
export function globalNews(ctx) {
  const path = '/global/';
  const items = (ctx.globalItems || []).slice(0, 24);

  /* Feed titles arrive with the dashes their own newsroom used. The house
     style on this site is no em or en dash in visible text, so they are
     normalised on the way in rather than left to fail the audit. Nothing
     else about a headline is touched. */
  const plain = (v) => String(v == null ? '' : v).replace(/[\u2013\u2014]/g, '-');
  const safeHref = (v) => /^https:\/\//i.test(String(v || '')) ? String(v) : '#';
  const location = (country) => ({
    nepal: 'Nepal', brazil: 'Brazil', 'united-states': 'United States', global: 'World'
  }[country] || 'World');

  /* An item from a UN alerting body or a national newsroom carries a tick;
     an aggregator does not. The reader can see which is which without having
     to know the names. */
  const OFFICIAL = /reliefweb|gdacs|ocha|usgs|weather service|who|unicef|wfp|ifrc|red cross/i;
  const badge = (src, country) => OFFICIAL.test(src || '')
    ? `<span class="src-badge">${VTICK}${esc(location(country))} &middot; ${esc(plain(src))}</span>`
    : `<span class="src-badge">${esc(location(country))} &middot; ${esc(plain(src))}</span>`;

  const snapshot = items.length ? `
<ul class="postlist" id="world-snapshot">
${items.map(i => `<li><a class="postcard" href="${esc(safeHref(i.url))}" target="_blank" rel="noopener">
  <time datetime="${esc(i.time || '')}">${esc(i.time ? nptLong(i.time) : '')}</time>
  <h3>${esc(plain(i.title))}</h3>
${i.summary ? `  <p>${esc(plain(String(i.summary).slice(0, 220)))}${String(i.summary).length > 220 ? '…' : ''}</p>` : ''}
  ${badge(i.source, i.country)}
</a></li>`).join('\n')}
</ul>
<p class="faint" id="world-snapshot-note">Snapshot taken when this page was last built. A live version appears here when available.</p>
` : `<p class="faint">The world feed is loading from its sources. Open <a href="/#live">the Live tab</a> for the continuously refreshed version.</p>`;

  const body = `
<p class="measure">Earthquakes, floods, cyclones, wildfires and the humanitarian response to them, collected from the same kind of sources this site uses for Nepal: UN alerting bodies first, then named international newsrooms. Every headline links to whoever published it. Nothing is rewritten here and no figure on this page is this site's own.</p>

<h2>What is happening now</h2>
<div id="world-live-controls" hidden>
  <div class="seg location-seg" role="group" aria-label="Filter world updates by location" style="margin:14px 0; max-width:560px;">
    <button type="button" data-world-country="all" aria-pressed="true">All locations</button>
    <button type="button" data-world-country="nepal" aria-pressed="false">Nepal</button>
    <button type="button" data-world-country="brazil" aria-pressed="false">Brazil</button>
    <button type="button" data-world-country="united-states" aria-pressed="false">United States</button>
  </div>
</div>
<p class="faint" id="world-refresh-status" aria-live="polite">Checking live sources...</p>
<ul class="postlist" id="world-live-list" hidden></ul>
${snapshot}
<script>
(function(){
  var controls = document.getElementById('world-live-controls');
  var list = document.getElementById('world-live-list');
  var status = document.getElementById('world-refresh-status');
  var snapshot = document.getElementById('world-snapshot');
  var snapshotNote = document.getElementById('world-snapshot-note');
  var country = 'all';
  var items = [];
  var countryName = { nepal: 'Nepal', brazil: 'Brazil', 'united-states': 'United States', global: 'World' };

  function safeUrl(value){
    try {
      var url = new URL(String(value || ''));
      return url.protocol === 'https:' ? url.href : null;
    } catch (_) { return null; }
  }

  function displayTime(value){
    var time = new Date(value || '');
    if (isNaN(time.getTime())) return '';
    return time.toLocaleString('en-US', {
      timeZone: 'Asia/Kathmandu', month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true
    }) + ' NPT';
  }

  function card(item){
    var href = safeUrl(item.url);
    if (!href) return null;
    var li = document.createElement('li');
    var link = document.createElement('a');
    link.className = 'postcard';
    link.href = href;
    link.target = '_blank';
    link.rel = 'noopener';
    var time = displayTime(item.time);
    if (time) {
      var stamp = document.createElement('time');
      stamp.dateTime = String(item.time || '');
      stamp.textContent = time;
      link.appendChild(stamp);
    }
    var title = document.createElement('h3');
    title.textContent = String(item.title || 'Update');
    link.appendChild(title);
    if (item.summary) {
      var summary = document.createElement('p');
      summary.textContent = String(item.summary).slice(0, 220);
      link.appendChild(summary);
    }
    var source = document.createElement('span');
    source.className = 'src-badge';
    source.textContent = (countryName[item.country] || 'World') + ' · ' + String(item.source || 'Source');
    link.appendChild(source);
    li.appendChild(link);
    return li;
  }

  function render(){
    var visible = country === 'all' ? items : items.filter(function(item){ return item.country === country; });
    while (list.firstChild) list.removeChild(list.firstChild);
    visible.slice(0, 60).forEach(function(item){ var row = card(item); if (row) list.appendChild(row); });
    status.textContent = visible.length + (country === 'all' ? ' live updates' : ' ' + (countryName[country] || country) + ' updates');
  }

  controls.addEventListener('click', function(event){
    var button = event.target.closest('[data-world-country]');
    if (!button) return;
    country = button.getAttribute('data-world-country');
    controls.querySelectorAll('[data-world-country]').forEach(function(item){ item.setAttribute('aria-pressed', String(item === button)); });
    render();
  });

  fetch('/api/global', { cache: 'no-store' })
    .then(function(response){ return response.ok ? response.json() : Promise.reject(new Error('HTTP ' + response.status)); })
    .then(function(data){
      items = Array.isArray(data.items) ? data.items : [];
      if (!items.length) throw new Error('No live world updates');
      controls.hidden = false;
      list.hidden = false;
      if (snapshot) snapshot.hidden = true;
      if (snapshotNote) snapshotNote.hidden = true;
      render();
    })
    .catch(function(){
      status.textContent = 'Live refresh is unavailable. Showing the last built snapshot.';
    });
})();
</script>

<div class="panel">
  <div class="panel-head">
    <h2>How to read these alerts</h2>
    <p class="panel-sub">What each source is for, and where each one stops</p>
  </div>
  <div class="panel-body">
<p><strong>GDACS</strong> is the UN and European Commission's global disaster alert system. It colour-codes every event by the humanitarian impact it expects: green for little, orange for significant, red for severe. Only orange and red are carried here, because green alerts fire many times a day and would bury everything else.</p>
<p><strong>USGS</strong> publishes every earthquake it detects. Magnitude 5.5 and above is the cut-off here. Magnitude is not damage: a magnitude 6 under a city can kill thousands, and the same quake far offshore can pass unnoticed. Depth and where people live decide that.</p>
<p><strong>ReliefWeb</strong> is UN OCHA's clearing house for humanitarian reporting. Its situation reports are slower than a newsroom and far more careful, which makes it the place to check a figure a headline gave you.</p>
  </div>
</div>

<h2>Why this sits next to the Nepal coverage</h2>
<p>The hazards are the same hazards. A glacial lake outburst above Rasuwa and one in the Andes fail for the same reason, and the flood safety rules on <a href="/nepal-disasters/">the hazard guide</a> hold anywhere. Nepal is where this site watches closely; this page is where it keeps an eye on everywhere else.</p>
<p>Following an event in Nepal? Start with <a href="/nepal-flood/rasuwa/">the current briefing</a>, the <a href="/nepal-flood/emergency-numbers/">emergency numbers</a> or <a href="/nepal-flood/relief/">the official relief fund</a>.</p>
`;

  const t = 'World Disasters, Live: UN Alerts, Earthquakes and Floods';
  const d = 'Live disaster news from around the world: UN GDACS alerts, USGS earthquakes and ReliefWeb reporting, alongside named international newsrooms. Updated continuously.';
  return {
    path, title: t, description: d, lastmod: ctx.buildDay, priority: '0.7', changefreq: 'hourly',
    html: page({
      path, title: t, description: d,
      rail: liveRail(ctx, { figTitle: 'Nepal, where it stands', hideWorld: true }),
      h1: 'World disasters, live',
      lede: 'What is happening elsewhere, with separate live views for Nepal, Brazil and the United States. The same sourcing rules as the Nepal coverage.',
      crumbs: [{ label: 'Home', href: '/' }, { label: 'World' }],
      published: '2026-08-28T09:00:00+05:45',
      modified: ctx.modified,
      body: body + related('Related', [
        { href: '/nepal-disasters/', title: 'Hazard guide', text: 'What each hazard does and what to do in it.', verb: 'the guide' },
        { href: '/nepal-flood/rasuwa/', title: 'Nepal: current event', text: 'The Rasuwa flood briefing.', verb: 'the briefing' },
        { href: '/sources/', title: 'Sources', text: 'Every feed and agency this site reads.', verb: 'the list' },
      ]),
      schema: [{
        '@type': 'CollectionPage',
        '@id': `${SITE}${path}#collection`,
        name: t,
        description: d,
      }],
    }),
  };
}

export function about(ctx) {
  const path = '/about/';
  const body = `
<h2>What this is</h2>
<p><strong>${esc(SITE_NAME)}</strong> is an independent volunteer project. It collects public information about disasters in Nepal: official bulletins, live news, maps, emergency contacts. It puts that on one page that loads fast on a phone.</p>
<p>It exists because during the first days of an emergency the information that matters is scattered: a police bulletin on one site, a situation report as a PDF on another, a helpline number buried three clicks into a ministry page, and a hundred news stories repeating each other. Someone looking for a relative should not have to assemble that themselves.</p>

<h2>What this is not</h2>
<ul>
  <li><strong>Not a government site.</strong> It has no official status and no government affiliation. Where this site and an official source disagree, the official source is right.</li>
  <li><strong>Not a news agency.</strong> There are no reporters on the ground. Everything here traces back to a source that is named and linked.</li>
  <li><strong>Not a charity, and not a payment channel.</strong> No money is collected here. Every giving link points at the Government of Nepal’s own relief fund.</li>
  <li><strong>Not affiliated with any NGO, agency or newsroom.</strong> Sources are read publicly, the same way anyone can read them.</li>
</ul>

<h2>How the information is put together</h2>
<h3>Figures</h3>
<p>Casualty, damage and rescue figures are typed in by hand from published bulletins, mainly the Nepal Police daily bulletin and NDRRMA situation reports. Each figure carries the source and the time of the bulletin it came from, because a casualty count without a timestamp is not usable during an event. Where two sources disagree, the lower confirmed figure is shown.</p>
<h3>The live newswire</h3>
<p>The feed on the live updates page is collected automatically by this site’s own server from UN disaster alerts (ReliefWeb, GDACS), the US Geological Survey, and a fixed list of named newsrooms in Nepal and abroad. It is a headline-and-link list: stories are read at the source, not copied here. An item is marked verified only when it comes from an official alerting source, or when two or more independent newsrooms report the same thing.</p>
<h3>Written briefings</h3>
<p>The dated briefings in the <a href="/updates/">update archive</a> are written by a person from named sources, with the source list printed under each one. They are not model-generated news.</p>
<h3>Maps</h3>
<p>Map points come from published reporting and satellite imagery and are marked approximate where they are approximate. Basemaps are credited to their providers on <a href="/sources/">the sources page</a>.</p>

<h2>What is deliberately not published</h2>
<ul>
  <li><strong>Names of the dead or missing.</strong> Circulating unverified names exposes families to fraud and to attention they did not ask for, and competes with the official register rescue teams work from.</li>
  <li><strong>Unverified casualty figures.</strong> If it is not in a bulletin, it is not a number on this site.</li>
  <li><strong>Photographs of the dead.</strong></li>
  <li><strong>Donation links other than the government fund</strong>, because no other channel can be checked against an official published source.</li>
</ul>

<h2>Corrections</h2>
<p>Errors get corrected or removed, not quietly edited around. If a figure, a date, a name or a source here is wrong, write to <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a> and say what is wrong and, if you can, what the correct source is. <a href="/contact/">The contact page</a> explains what to include.</p>

<h2>Beyond this event</h2>
<p>The current story is the 2026 Rasuwa flood. The site is built to cover whatever the next major event in Nepal is, be that an earthquake, a landslide or another flood, without deleting what came before. Past events stay online as archived pages with the "archived" label rather than continuing to present themselves as live. <a href="/nepal-disasters/">The hazard guide</a> is deliberately event-independent, because helplines and safety advice do not change between disasters.</p>

<h2>Technology and privacy</h2>
<p>The site is a static page served from Cloudflare’s edge network, with a small server-side layer that fetches public feeds so your browser does not have to. There are no advertising trackers and no third-party analytics scripts collecting your browsing across other sites. Map tiles are loaded from Esri, OpenTopoMap and OpenStreetMap, and embedded videos are served by YouTube, so those providers see the requests their own content needs.</p>
`;
  const t = `About ${SITE_NAME}: Who Runs This and How It Is Sourced`;
  const d = 'Nepal Disaster Update Live is an independent volunteer project, not a government site and not a news agency. How its figures are sourced, and how to send a correction.';
  return {
    path, title: t, description: d, lastmod: ctx.buildDay, priority: '0.6', changefreq: 'monthly',
    html: page({
      path, title: t, description: d,
      h1: 'About this project',
      lede: 'An independent volunteer briefing on disasters in Nepal. No official status, no money collected, every figure traceable to a named source.',
      crumbs: [{ label: 'Home', href: '/' }, { label: 'About' }],
      published: '2026-08-26T12:00:00+05:45',
      modified: ctx.modified,
      body: body + related('Related', [
        { href: '/sources/', title: 'Sources', text: 'Every outlet, dataset and agency this site reads.', verb: 'the list' },
        { href: '/contact/', title: 'Contact and corrections', text: 'How to report an error or send information.', verb: 'how' },
        { href: '/nepal-flood/rasuwa/', title: 'Current event', text: 'The Rasuwa flood briefing.', verb: 'the briefing' },
      ]),
      schema: [{
        '@type': 'AboutPage',
        '@id': `${SITE}${path}#about`,
        name: t,
        description: d,
        mainEntity: ORG,
      }],
    }),
  };
}

export function sources(ctx) {
  const path = '/sources/';
  const body = `
<p class="measure">If something on this site is not traceable to one of the sources below, it should not be here. Tell us and it gets pulled. Official Nepali sources come first, because where they and this site disagree, they are right.</p>

${C.SOURCE_GROUPS.map(g => `
<h2>${esc(g.title)}</h2>
<p class="small">${esc(g.note)}</p>
<ul>
${g.links.map(([u, n, d]) => `<li><a href="${esc(u)}" target="_blank" rel="noopener nofollow"><strong>${esc(n)}</strong></a>: ${esc(d)}</li>`).join('\n')}
</ul>`).join('\n')}

<h2>How sources are used</h2>
<ul>
  <li><strong>Figures.</strong> Casualty, damage and rescue numbers come only from Nepal Police bulletins and NDRRMA situation reports, typed in by hand, with the bulletin time printed next to the figure.</li>
  <li><strong>The newswire.</strong> Headlines and links only, collected on a schedule by this site’s own server. Stories are read at the publisher, not reproduced here.</li>
  <li><strong>Verification.</strong> An item is marked verified when it comes from an official alerting source (ReliefWeb, GDACS, USGS) or when two or more independent newsrooms report the same thing. Everything else is left unmarked.</li>
  <li><strong>Photographs.</strong> Openly licensed images only, with credit, mostly from Wikimedia Commons. No AI-generated images are used anywhere on this site.</li>
</ul>

<h2>Machine-readable feed</h2>
<p>The live feed is available as RSS at <a href="${SITE}/feed.xml"><span class="num">${SITE}/feed.xml</span></a>. The underlying endpoints (<span class="num">/api/news</span>, <span class="num">/api/incidents</span>, <span class="num">/api/official</span>, <span class="num">/api/police</span>) return JSON and are public. They aggregate public sources; each item keeps the name of the publisher it came from.</p>
`;
  const t = 'Sources: Every Outlet and Dataset Behind This Site';
  const d = 'Every source behind Nepal Disaster Update Live: Nepal Police, NDRRMA, BIPAD, NEOC, ReliefWeb, GDACS, USGS, ICIMOD and the newsrooms read by the live feed.';
  return {
    path, title: t, description: d, lastmod: ctx.buildDay, priority: '0.6', changefreq: 'monthly',
    html: page({
      path, title: t, description: d,
      h1: 'Where every fact here comes from',
      lede: 'Every source this site reads, grouped by what it is used for.',
      crumbs: [{ label: 'Home', href: '/' }, { label: 'Sources' }],
      published: '2026-08-26T12:00:00+05:45',
      modified: ctx.modified,
      body: body + related('Related', [
        { href: '/about/', title: 'About this project', text: 'Who runs it, and what it deliberately does not publish.', verb: 'more' },
        { href: '/contact/', title: 'Corrections', text: 'Report an error in a figure, a date or a source.', verb: 'how' },
      ]),
      schema: [{
        '@type': 'CollectionPage',
        '@id': `${SITE}${path}#sources`,
        name: t,
        description: d,
      }],
    }),
  };
}

export function contact(ctx) {
  const path = '/contact/';
  const body = `
<div class="callout callout-alert">
  <p class="callout-title">This is not an emergency line</p>
  <p>Nobody monitors this inbox around the clock, and it cannot dispatch help. If someone is in danger, call <strong>100</strong> or <strong>112</strong> from a mobile in Nepal. <a href="/nepal-flood/emergency-numbers/">All emergency numbers</a>.</p>
</div>

<h2>Email</h2>
<p style="font-size:1.15rem;"><a href="mailto:${CONTACT_EMAIL}"><strong>${CONTACT_EMAIL}</strong></a></p>

<h2>Reporting an error</h2>
<p>Corrections are the most useful message this project receives. Errors get corrected or removed, not quietly edited around.</p>
<div class="checklist">
  <div class="check-row"><span class="mark">01</span><p>Say which page, and quote the exact figure, date or sentence that is wrong.</p></div>
  <div class="check-row"><span class="mark">02</span><p>Say what the correct information is, and where it comes from. A link to the bulletin or article is ideal.</p></div>
  <div class="check-row"><span class="mark">03</span><p>If it is a number, say which bulletin and what time it was published. Two correct sources often disagree only because one is older.</p></div>
</div>
<p>Anything sourced to an official Nepali bulletin will be taken over what is currently on the page.</p>

<h2>Sending a photograph</h2>
<p>If you photographed the affected area, it can go up with your name, the date and a plain-language caption, or as "credit withheld" if you prefer. Say which you want.</p>
<p>The fastest way to make a photograph useful everywhere is to upload it to <a href="https://commons.wikimedia.org/" target="_blank" rel="noopener nofollow">Wikimedia Commons</a> yourself under a free licence. Then every newsroom and aid agency can use it, not just this site.</p>
<p>No photographs of the dead are published here.</p>

<h2>Missing persons</h2>
<p>This site does not maintain a missing-persons register and cannot search for anyone. The register that matters is the one held by Nepal Police and the ward offices. <a href="/nepal-flood/rasuwa/missing-persons/">How to report someone missing</a> explains the exact steps, including the route for foreign nationals.</p>

<h2>Press and researchers</h2>
<p>Everything on this site is either sourced from a public bulletin or generated from public feeds, and the sources are listed in full on <a href="/sources/">the sources page</a>. The live feed is available as RSS at <a href="${SITE}/feed.xml"><span class="num">${SITE}/feed.xml</span></a>, and the underlying JSON endpoints are public.</p>
<p>If you want to reuse a table or figure, cite the original bulletin rather than this site. That is what it is attributed to here.</p>
`;
  const t = 'Contact and Corrections';
  const d = 'How to report an error, send a photograph, or reach Nepal Disaster Update Live. Not an emergency line. For emergencies in Nepal call 100 or 112.';
  return {
    path, title: t, description: d, lastmod: ctx.buildDay, priority: '0.5', changefreq: 'monthly',
    html: page({
      path, title: `${t} | ${SITE_NAME}`, description: d,
      h1: 'Contact and corrections',
      lede: 'Corrections are welcome and acted on. This is not an emergency line.',
      crumbs: [{ label: 'Home', href: '/' }, { label: 'Contact' }],
      published: '2026-08-26T12:00:00+05:45',
      modified: ctx.modified,
      body,
      schema: [{
        '@type': 'ContactPage',
        '@id': `${SITE}${path}#contact`,
        name: t,
        description: d,
        mainEntity: ORG,
      }],
    }),
  };
}

/* -- 15. 404 ---------------------------------------------------------------- */

export function notFound() {
  const body = `
<p class="lede">That page does not exist here. It may have moved, or the link may be wrong.</p>
${EMERGENCY_STRIP}
<h2>Where you probably meant to go</h2>
<ul class="linklist">
  <li><a href="/"><b>Live dashboard</b><span>Home</span></a></li>
  <li><a href="/nepal-flood/rasuwa/"><b>Rasuwa flood 2026, full briefing</b><span>Current event</span></a></li>
  <li><a href="/nepal-flood/rasuwa/live-updates/"><b>Live updates</b><span>Newest first</span></a></li>
  <li><a href="/nepal-flood/emergency-numbers/"><b>Nepal emergency numbers</b><span>Reference</span></a></li>
  <li><a href="/nepal-flood/relief/"><b>Relief and donations</b><span>Give</span></a></li>
  <li><a href="/nepal-disasters/"><b>Nepal disaster guide</b><span>Reference</span></a></li>
  <li><a href="/updates/"><b>Update archive</b><span>All briefings</span></a></li>
</ul>
<p>If you followed a link on this site to get here, <a href="/contact/">tell us</a> and it gets fixed.</p>
`;
  return page({
    path: '/404.html',
    title: 'Page not found',
    description: 'That page does not exist on Nepal Disaster Update Live. Links to the live dashboard, current event coverage and Nepal emergency numbers.',
    h1: 'Page not found',
    crumbs: [{ label: 'Home', href: '/' }, { label: 'Not found' }],
    body,
    head: '<meta name="robots" content="noindex, follow">',
  }).replace('<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">', '');
}

/* -- 18. Hazard detail pages, /nepal-disasters/<slug>/ -----------------------
   The hub at /nepal-disasters/ carries one paragraph per hazard and links
   here. Each hazard then gets a page of its own, because "what do I do in a
   landslide" and "what do I do in an earthquake" are different questions asked
   by different people, and one page answering five of them serves none of them
   properly. The long copy lives in content.mjs so the hub cannot repeat it.
   ------------------------------------------------------------------------- */
export function hazardPage(hazard, ctx) {
  const d = C.HAZARD_PAGES[hazard.slug];
  const path = `/nepal-disasters/${hazard.slug}/`;
  const faq = faqBlock(d.faq.map(([q, a]) => ({ q, a: `<p>${esc(a)}</p>` })));
  const siblings = C.HAZARDS.filter(h => h.slug !== hazard.slug);

  const body = `
${d.long.map(p => `<p class="measure">${esc(p)}</p>`).join('\n')}

<h2>Warning signs</h2>
<div class="checklist">
${d.signsLong.map((s, i) => `<div class="check-row"><span class="mark">${String(i + 1).padStart(2, '0')}</span><p>${esc(s)}</p></div>`).join('\n')}
</div>

<h2>What to do</h2>
<div class="checklist">
${d.todoLong.map((s, i) => `<div class="check-row"><span class="mark">${String(i + 1).padStart(2, '0')}</span><p>${esc(s)}</p></div>`).join('\n')}
</div>

<h2>Where Nepal stands</h2>
<p class="measure">${esc(hazard.exposure)}</p>

<h2>Common questions</h2>
${faq.html}

<h2>Emergency numbers</h2>
<p class="measure">Police <a href="tel:100">100</a>. Ambulance <a href="tel:102">102</a>. Nepal's disaster hotline <a href="tel:1149">1149</a>. The <a href="/nepal-flood/emergency-numbers/">full list, including district control rooms and embassies</a>, is worth saving before you need it.</p>

<h2>The other four hazards</h2>
<ul class="linklist">
${siblings.map(h => `  <li><a href="/nepal-disasters/${h.slug}/"><b>${esc(h.name)}</b><span>${esc(h.summary.split('.')[0])}</span></a></li>`).join('\n')}
</ul>
`;

  return {
    path, title: d.title, description: d.description,
    lastmod: ctx.buildDay, priority: '0.7', changefreq: 'monthly',
    html: page({
      rail: liveRail(ctx),
      path, title: d.title, description: d.description,
      h1: d.h1,
      lede: d.lede,
      crumbs: [{ label: 'Home', href: '/' }, { label: 'Nepal disaster guide', href: '/nepal-disasters/' }, { label: hazard.name }],
      published: '2026-08-27T12:00:00+05:45',
      modified: ctx.modified,
      updatedNote: `<b>${esc(SITE_NAME)}</b><span>Evergreen reference, not tied to one event</span><span>Reviewed ${esc(nptLong(ctx.modified, false))}</span>`,
      body: body + related('Related', [
        { href: '/nepal-disasters/', title: 'All five hazards', text: 'The short version of each, in one place.', verb: 'the guide' },
        { href: '/nepal-flood/rasuwa/', title: 'The flood happening now', text: 'A live example of what this page describes.', verb: 'the coverage' },
        { href: '/nepal-flood/emergency-numbers/', title: 'Emergency numbers', text: 'Police, ambulance, disaster hotline, district control rooms.', verb: 'the numbers' },
      ]),
      schema: [
        articleNode({ path, headline: d.h1, description: d.description, published: '2026-08-27T12:00:00+05:45', modified: ctx.modified }),
        faq.node,
      ],
    }),
  };
}

export function hazardPages(ctx) {
  return C.HAZARDS.map(h => hazardPage(h, ctx));
}

/* -- 19. /nepal-flood/rasuwa/hydropower/ -------------------------------------
   The energy damage is its own story with its own audience: people asking
   whether the lights are going out, and people who own shares in these
   projects. It was a section on the damage page and kept getting lost there.
   ------------------------------------------------------------------------- */
export function hydropower(ctx) {
  const path = '/nepal-flood/rasuwa/hydropower/';
  const faq = faqBlock([
    { q: 'How many hydropower projects were damaged in the Rasuwa flood?',
      a: `<p>The Nepal Electricity Authority reports ${C.DAMAGE.hydropowerProjects} projects damaged, with a combined capacity of about ${C.DAMAGE.hydropowerMW} MW: ${C.DAMAGE.hydropowerOperational} operating plants totalling ${C.DAMAGE.hydropowerOperationalMW} MW and ${C.DAMAGE.hydropowerUnderConstruction} under construction totalling ${C.DAMAGE.hydropowerUnderConstructionMW} MW.</p>` },
    { q: 'Will there be load shedding in Nepal because of this?',
      a: '<p>The Nepal Electricity Authority has not announced scheduled load shedding as a result. Losing this much capacity at once puts real strain on supply, and a damaged 220 kV substation limits how much of the remaining generation on that corridor can be evacuated even where the plant itself survived. Watch the authority’s own notices rather than social media for this.</p>' },
    { q: 'Why do so many of Nepal’s hydropower plants sit in the flood path?',
      a: '<p>Run-of-river schemes need a steep river, and a steep river in Nepal means a narrow valley. The powerhouse, the headworks and the access road all end up beside the water because there is nowhere else to put them. That is efficient in normal years and catastrophic in this kind of event.</p>' },
    { q: 'Are the figures final?',
      a: `<p>No. An earlier estimate the same day, from the Ministry of Energy, put the loss at ${C.DAMAGE.hydropowerEarlierEstimateMW} MW. Both figures were published on 27 August 2026, which is a fair measure of how provisional every damage number is at this stage.</p>` },
  ]);

  const body = `
<div class="callout">
  <p class="callout-title">The short version</p>
  <p>${C.DAMAGE.hydropowerProjects} projects hit. About ${C.DAMAGE.hydropowerMW} MW of capacity affected. The transmission substation that moves power off this corridor is damaged too, so the loss is larger than the sum of the plants.</p>
</div>

<h2>What was damaged</h2>
<p class="measure">The Nepal Electricity Authority reports ${C.DAMAGE.hydropowerProjects} hydropower projects damaged along the Bhote Koshi and Trishuli corridor, with a combined capacity of about ${C.DAMAGE.hydropowerMW} MW. Of those, ${C.DAMAGE.hydropowerOperational} were operating and generating, totalling ${C.DAMAGE.hydropowerOperationalMW} MW, and ${C.DAMAGE.hydropowerUnderConstruction} were still under construction, totalling ${C.DAMAGE.hydropowerUnderConstructionMW} MW.</p>

${table(['Project', 'District', 'What happened'], C.DAMAGE.hydropower.map(([n, dist, note]) => [esc(n), esc(dist), esc(note)]),
  `Nepal Electricity Authority, reported through the ${esc(C.SITREP_SHORT)}. Named projects only; the full count is ${C.DAMAGE.hydropowerProjects}.`)}

<h2>The substation matters more than it sounds</h2>
<p class="measure">A damaged 220 kV substation is not one plant going offline. It is the road the electricity uses. Generation on that corridor that survived the flood may still not reach the grid until the substation is back, which is why the useful figure is the corridor total rather than any single plant.</p>

<h2>Why the plants were where the water went</h2>
<p class="measure">Almost all of these are run-of-river schemes. They need fall, which means a steep valley, and in a steep valley the powerhouse, the intake, the penstock and the access road all sit beside the river because there is no other flat ground. The same geography that makes the power cheap put every part of it in the path of the flood.</p>

<h2>What this does to the wider picture</h2>
<p class="measure">Nepal exports power to India in the wet season and imports in the dry season. Losing capacity in August, at the top of the wet season, hits the exporting half of that arrangement first. The rebuild timeline for a washed-out headworks in a valley whose access road no longer exists is measured in years, not months: the ${C.DAMAGE.roadDestroyedKm} km road from Betrawati to the border was destroyed at multiple points, and everything has to reach the site by that road eventually.</p>

<h2>Common questions</h2>
${faq.html}
`;

  const t = 'Rasuwa Flood Hydropower Damage: 14 Projects and 748 MW Affected';
  const d = `The Nepal Electricity Authority reports ${C.DAMAGE.hydropowerProjects} hydropower projects damaged by the Rasuwa flood, about ${C.DAMAGE.hydropowerMW} MW in total, along with a 220 kV substation. Which projects, and what it means for supply.`;
  return {
    path, title: t, description: d, lastmod: ctx.buildDay, priority: '0.7', changefreq: 'daily',
    html: page({
      rail: liveRail(ctx),
      path, title: t, description: d,
      h1: 'Hydropower damage from the Rasuwa flood',
      lede: `${C.DAMAGE.hydropowerProjects} projects on the Bhote Koshi and Trishuli corridor were damaged, with about ${C.DAMAGE.hydropowerMW} MW of capacity affected. Here is the list and what it means.`,
      crumbs: [{ label: 'Home', href: '/' }, { label: 'Nepal floods', href: '/nepal-flood/' }, { label: 'Rasuwa flood', href: '/nepal-flood/rasuwa/' }, { label: 'Hydropower' }],
      published: '2026-08-27T10:00:00+05:45',
      modified: ctx.modified,
      statusPill: 'live',
      updatedNote: `<b>${esc(SITE_NAME)}</b><span>Source: ${esc(C.SITREP_SHORT)}</span><span>Figures are provisional</span>`,
      body: body + related('Related', [
        { href: '/nepal-flood/rasuwa/damage/', title: 'All the damage', text: 'Roads, bridges, banks, the border crossing and the cost estimate.', verb: 'the damage page' },
        { href: '/nepal-flood/rasuwa/', title: 'Full event briefing', text: 'Everything confirmed about the Rasuwa flood in one page.', verb: 'the briefing' },
        { href: '/nepal-flood/rasuwa/map/', title: 'The map', text: 'Where each of these sites is on the river.', verb: 'the map' },
      ]),
      schema: [
        articleNode({ path, type: 'NewsArticle', headline: 'Hydropower damage from the Rasuwa flood', description: d, published: '2026-08-27T10:00:00+05:45', modified: ctx.modified }),
        faq.node,
      ],
    }),
  };
}

/* -- 20. /nepal-flood/rasuwa/foreign-nationals/ ------------------------------
   Most of the people on the missing list are not Nepali, and their families
   are searching in other countries, in other languages, for something that
   tells them who to call. Nothing on this site was written for them.
   ------------------------------------------------------------------------- */
export function foreignNationals(ctx) {
  const path = '/nepal-flood/rasuwa/foreign-nationals/';
  const faq = faqBlock([
    { q: 'How many foreign nationals are missing in the Rasuwa flood?',
      a: `<p>Nepal Police listed ${C.TOLL.missingChinaForeign ? '' : ''}466 foreign nationals among the travellers on its morning list of ${C.MISSING_BREAKDOWN_TOTAL}. Chinese state media separately report ${C.TOLL.missingChinaForeign} foreign nationals among the ${C.TOLL.missingChina} missing on the Tibet side of the border. The two counts may overlap, because a traveller crossing at Rasuwagadhi could be recorded by either country.</p>` },
    { q: 'My relative was trekking in Langtang or crossing to Tibet. Who do I call?',
      a: '<p>Your own country’s embassy or consulate for Nepal first, because they can query the Nepali authorities on your behalf and they will already be doing it for other families. Then the trekking agency or tour operator, who hold the permit records. The <a href="/nepal-flood/emergency-numbers/">emergency numbers page</a> lists the embassy contacts and the police channels.</p>' },
    { q: 'What does "out of contact" mean here?',
      a: '<p>It means nobody has been able to reach that person. Mobile networks, power and internet are down across the affected valley and are being restored slowly. People have been coming back into contact for days after the flood. Out of contact is not a casualty figure and must not be read as one.</p>' },
    { q: 'Is there an official list of names?',
      a: '<p>NDRRMA has published the names of people rescued. There is no published official list of the missing, and this site does not republish names from social media. Report a missing person through the police channels on the <a href="/nepal-flood/rasuwa/missing-persons/">missing persons page</a> rather than to us.</p>' },
  ]);

  const body = `
<div class="callout callout-alert">
  <p class="callout-title">If you are looking for someone</p>
  <p>Contact your country's embassy for Nepal first, then the tour or trekking operator who holds the permit. Report the person through the official channels on the <a href="/nepal-flood/rasuwa/missing-persons/">missing persons page</a>. Do not rely on lists circulating on social media, which have been wrong in both directions.</p>
</div>

<h2>Why so many of the missing are not Nepali</h2>
<p class="measure">The flood came down the Bhote Koshi at Timure and Rasuwagadhi, which is Nepal's main overland crossing to Tibet and the road to the Langtang trekking region. On any given morning that road carries traders, pilgrims, tour groups and trekkers from a long list of countries. The people on it were not residents of the valley, which is why so many of them are counted as travellers rather than as residents of Rasuwa.</p>

<h2>What the two countries have published</h2>
<p class="measure">The morning Nepal Police bulletin of ${esc(AS_OF_MISSING_BREAKDOWN)} broke its list of ${C.MISSING_BREAKDOWN_TOTAL} into groups, of which travellers were by far the largest at 579, and said 466 of those travellers were foreign nationals. Chinese state media report ${C.TOLL.missingChina} people missing around Gyirong Port on the Tibet side, ${C.TOLL.missingChinaForeign} of them foreign nationals. NDRRMA's current total is ${C.TOLL.missing}, without a new breakdown.</p>
<p class="measure">Adding the two national figures together gives a number over thirteen hundred, and that is the figure most international coverage has used. It should be read with care: the two countries may be counting some of the same people, since a traveller who crossed the border that morning could appear on either side's list.</p>

<h2>Among the rescued</h2>
<p class="measure">NDRRMA's latest total is ${C.TOLL.rescued} rescued. Its older named nationality list is below and does not add up to that total.</p>
${table(['Nationality', 'Rescued'], C.TOLL.rescuedBreakdown.map(([k, v]) => [esc(k), v]).concat([
    ['<strong>Earlier named list total</strong>', `<strong class="num">${C.TOLL.rescuedBreakdown.reduce((sum, [, value]) => sum + value, 0)}</strong>`],
  ]), `NDRRMA, which published this older named list.`)}

<h2>Embassies and consular help</h2>
<p class="measure">A consular section is the right first call for a family outside Nepal. They can ask the Nepali authorities questions that an individual cannot, they are already in contact with the police and NDRRMA about this event, and they can help with documents if someone has lost everything. Contact details for the missions in Kathmandu are on the <a href="/nepal-flood/emergency-numbers/">emergency numbers page</a>.</p>

<h2>What not to do</h2>
<div class="checklist">
  <div class="check-row"><span class="mark">01</span><p>Do not treat a name on a social media list as confirmation of anything, in either direction. Several of those lists have named people who were later found safe.</p></div>
  <div class="check-row"><span class="mark">02</span><p>Do not send money to anyone who contacts you claiming they can find a specific person. Disasters attract this.</p></div>
  <div class="check-row"><span class="mark">03</span><p>Do not travel to the affected valley to search. The road is destroyed, the helicopters are needed for rescue, and one more person in the valley is one more person to account for.</p></div>
</div>

<h2>Common questions</h2>
${faq.html}
`;

  const t = 'Rasuwa Flood: Foreign Nationals Missing, and Who Families Should Call';
  const d = 'Most of the people missing in the 2026 Rasuwa flood were travellers, and hundreds are foreign nationals. What Nepal and China each published, and the right first call for a family abroad.';
  return {
    path, title: t, description: d, lastmod: ctx.buildDay, priority: '0.8', changefreq: 'daily',
    html: page({
      rail: liveRail(ctx),
      path, title: t, description: d,
      h1: 'Foreign nationals missing in the Rasuwa flood',
      lede: 'Hundreds of the people unaccounted for were travellers crossing the border or trekking. This page is for the families searching from outside Nepal.',
      crumbs: [{ label: 'Home', href: '/' }, { label: 'Nepal floods', href: '/nepal-flood/' }, { label: 'Rasuwa flood', href: '/nepal-flood/rasuwa/' }, { label: 'Foreign nationals' }],
      published: '2026-08-27T10:00:00+05:45',
      modified: ctx.modified,
      statusPill: 'live',
      updatedNote: `<b>${esc(SITE_NAME)}</b><span>Figures from Nepal Police, NDRRMA and Chinese state media</span><span>Provisional and moving</span>`,
      body: body + related('Related', [
        { href: '/nepal-flood/rasuwa/missing-persons/', title: 'Reporting a missing person', text: 'The official channels, and what information they need from you.', verb: 'the process' },
        { href: '/nepal-flood/emergency-numbers/', title: 'Emergency and embassy numbers', text: 'Police, disaster hotline, district control rooms and consular contacts.', verb: 'the numbers' },
        { href: '/nepal-flood/rasuwa/casualties/', title: 'Confirmed figures', text: 'The toll, the district breakdown and what each number actually counts.', verb: 'the figures' },
      ]),
      schema: [
        articleNode({ path, type: 'NewsArticle', headline: 'Foreign nationals missing in the Rasuwa flood', description: d, published: '2026-08-27T10:00:00+05:45', modified: ctx.modified }),
        faq.node,
      ],
    }),
  };
}
