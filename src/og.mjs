/* Social preview cards.
 *
 * These are the pictures that show up when somebody pastes one of our links
 * into Facebook, WhatsApp, X, Slack or iMessage. The old one was a stock
 * Nepal flag, which is what every other page about Nepal uses, so our links
 * looked like everybody else's. These are branded instead: the mountain mark,
 * the masthead, a real headline, and the domain.
 *
 * Two shapes are produced from the same description:
 *   card  1200x630   the normal link preview
 *   story 1080x1920  Instagram / Facebook / WhatsApp stories
 *
 * The SVGs are written by `src/og-build.mjs`, which then rasterises them to
 * PNG (Facebook and X will not read an SVG). Rasterising needs macOS `sips`,
 * so it only happens on the author's machine; the PNGs are committed and the
 * cloud routine just serves them.
 */

const INK = '#0B0D11';
const INK_2 = '#141821';
const CREAM = '#F4F0E6';
const CREAM_DIM = '#B9B4A6';
const RED = '#D8404B';
const BLUE = '#3D74C4';

/* The site's own two typefaces. The rasteriser is handed the actual font files
   from assets/fonts, so a card drawn on the cloud machine that runs the hourly
   routine comes out identical to one drawn here, rather than falling back to
   whatever happens to be installed there. Devanagari is listed after each so
   the Nepali pages' cards are not blank. */
const SERIF = "Newsreader, 'Noto Serif Devanagari', Georgia, 'Times New Roman', serif";
const SANS = "'Public Sans', 'Noto Sans Devanagari', 'Helvetica Neue', Helvetica, Arial, sans-serif";

/* Rough width of a string at a given size. There is no font metrics library
   here and none is wanted, so this is a per-character average that errs wide.
   Erring wide means a headline breaks a word early rather than running off
   the edge of the picture, which is the failure that actually looks bad. */
const WIDE = new Set('MWQ@%&mw'.split(''));
const NARROW = new Set("iljtfr!.,;:'|I ".split(''));
function textWidth(s, size) {
  let u = 0;
  for (const c of String(s)) {
    if (WIDE.has(c)) u += 0.92;
    else if (NARROW.has(c)) u += 0.34;
    else if (c >= 'A' && c <= 'Z') u += 0.68;
    else u += 0.54;
  }
  return u * size;
}

function wrap(text, size, maxWidth, maxLines) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const w of words) {
    const next = line ? line + ' ' + w : w;
    if (textWidth(next, size) > maxWidth && line) {
      lines.push(line);
      line = w;
      if (lines.length === maxLines) break;
    } else {
      line = next;
    }
  }
  if (lines.length < maxLines && line) lines.push(line);
  if (lines.length === maxLines && words.length) {
    /* if anything was left over, mark the last line so it does not read as a
       complete sentence that simply stops */
    const used = lines.join(' ').split(/\s+/).length;
    if (used < words.length) {
      let last = lines[maxLines - 1];
      while (last && textWidth(last + '…', size) > maxWidth) {
        last = last.replace(/\s+\S+$/, '');
      }
      lines[maxLines - 1] = (last || '') + '…';
    }
  }
  return lines;
}

/* Devanagari is laid out with a narrower word space than Latin, and at
   headline size the words end up looking joined. A little extra word spacing
   on those lines only, so the English cards are untouched. */
const DEVANAGARI = /[\u0900-\u097F]/;
function ws(line, em) {
  return DEVANAGARI.test(String(line)) ? ` word-spacing="${em}"` : '';
}

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

/* The brand mark, drawn at 0,0 in a 120x120 box so it can be placed by a
   single transform. Same geometry as favicon.svg, colours lifted for a dark
   background. */
function mark(id) {
  return `
  <g>
    <defs>
      <clipPath id="ogL${id}"><polygon points="60,16 52,46 58,72 50,104 8,104"/></clipPath>
      <clipPath id="ogR${id}"><polygon points="60,16 112,104 50,104 58,72 52,46"/></clipPath>
    </defs>
    <polygon points="60,16 52,46 58,72 50,104 8,104" fill="${RED}"/>
    <g clip-path="url(#ogL${id})" stroke="#A32A34" stroke-width="1.6" fill="none" opacity="0.55">
      <path d="M30,60 L55,52"/><path d="M24,72 L56,64"/><path d="M18,84 L53,80"/><path d="M13,96 L51,94"/>
    </g>
    <polygon points="60,16 112,104 50,104 58,72 52,46" fill="${BLUE}"/>
    <g clip-path="url(#ogR${id})" stroke="#2A5793" stroke-width="1.6" fill="none" opacity="0.5">
      <path d="M65,52 L95,58"/><path d="M60,64 L100,70"/><path d="M56,78 L104,82"/><path d="M52,92 L108,94"/>
    </g>
    <polygon points="60,16 52,30 68,30" fill="${CREAM}"/>
  </g>`;
}

/* The same silhouette blown up and dropped to a few percent opacity, so the
   card has something behind the text without competing with it. */
function ghost(x, y, scale, opacity) {
  return `<g transform="translate(${x},${y}) scale(${scale})" opacity="${opacity}">
    <polygon points="60,16 52,46 58,72 50,104 8,104" fill="${RED}"/>
    <polygon points="60,16 112,104 50,104 58,72 52,46" fill="${BLUE}"/>
  </g>`;
}

function pill(x, y, label, tone) {
  const w = Math.round(textWidth(label, 22) + (tone === 'live' ? 74 : 48));
  const fill = tone === 'live' ? RED : 'rgba(244,240,230,0.10)';
  const stroke = tone === 'live' ? 'none' : 'rgba(244,240,230,0.22)';
  const text = tone === 'live' ? '#FFFFFF' : CREAM;
  const dot = tone === 'live'
    ? `<circle cx="${x + 26}" cy="${y + 22}" r="6.5" fill="#FFFFFF"/>`
    : '';
  const tx = tone === 'live' ? x + 44 : x + 24;
  return `<g>
    <rect x="${x}" y="${y}" width="${w}" height="44" rx="22" fill="${fill}" stroke="${stroke}"/>
    ${dot}
    <text x="${tx}" y="${y + 30}" font-family="${SANS}" font-size="21" font-weight="700"
      letter-spacing="1.6" fill="${text}">${esc(label.toUpperCase())}</text>
  </g>`;
}

/**
 * @param {object} o
 * @param {string} o.title      the headline on the card
 * @param {string} [o.sub]      one supporting line
 * @param {string} [o.eyebrow]  section label, e.g. "RASUWA FLOOD"
 * @param {boolean} [o.live]    show the red LIVE pill
 * @param {{value:string,label:string}[]} [o.stats] up to three figures
 * @param {string} [o.stamp]    freshness line for the footer, e.g.
 *                              "UPDATED 28 AUG, 5:10 AM NPT". A live story is
 *                              shared and reshared for days, so the card has
 *                              to say when it was last true.
 */
export function ogCard(o = {}) {
  const W = 1200;
  const H = 630;
  const PAD = 72;
  const stats = (o.stats || []).slice(0, 3);
  const titleSize = o.title && o.title.length > 62 ? 58 : 68;
  const titleLines = wrap(o.title || '', titleSize, W - PAD * 2 - 40, 3);
  const subLines = o.sub ? wrap(o.sub, 27, W - PAD * 2 - 200, 2) : [];

  let y = 214;
  const title = titleLines
    .map((l, i) => `<text x="${PAD}" y="${y + i * (titleSize + 10)}" font-family="${SERIF}"
      font-size="${titleSize}" font-weight="600" fill="${CREAM}"${ws(l, 14)}>${esc(l)}</text>`)
    .join('');
  y += (titleLines.length - 1) * (titleSize + 10) + 52;

  const sub = subLines
    .map((l, i) => `<text x="${PAD}" y="${y + i * 38}" font-family="${SANS}" font-size="27"
      fill="${CREAM_DIM}"${ws(l, 6)}>${esc(l)}</text>`)
    .join('');

  const statRow = stats.length
    ? `<g transform="translate(${PAD},${H - 168})">` + stats.map((s, i) => `
        <text x="${i * 268}" y="0" font-family="${SERIF}" font-size="52" font-weight="600"
          fill="${i === 0 ? RED : CREAM}">${esc(s.value)}</text>
        <text x="${i * 268}" y="30" font-family="${SANS}" font-size="20"
          letter-spacing="0.6" fill="${CREAM_DIM}">${esc(s.label)}</text>`).join('') + '</g>'
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="ogbg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${INK}"/>
      <stop offset="1" stop-color="${INK_2}"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#ogbg)"/>
  ${ghost(700, 60, 5.0, 0.06)}
  <rect x="0" y="0" width="10" height="${H}" fill="${RED}"/>

  <g transform="translate(${PAD - 8},38) scale(0.62)">${mark('c')}</g>
  <text x="${PAD + 74}" y="88" font-family="${SANS}" font-size="25" font-weight="800"
    letter-spacing="3.6" fill="${CREAM}">NEPAL DISASTER UPDATE</text>
  ${o.eyebrow ? `<text x="${PAD + 74}" y="118" font-family="${SANS}" font-size="18"
    letter-spacing="2.8" fill="${CREAM_DIM}">${esc(String(o.eyebrow).toUpperCase())}</text>` : ''}
  ${o.live ? pill(W - PAD - 130, 60, 'Live', 'live') : ''}

  ${title}
  ${sub}
  ${statRow}

  <rect x="${PAD}" y="${H - 96}" width="${W - PAD * 2}" height="1" fill="rgba(244,240,230,0.16)"/>
  <text x="${PAD}" y="${H - 52}" font-family="${SANS}" font-size="22" fill="${CREAM_DIM}"
    letter-spacing="0.4">nepaldisasterupdatelive.nxtimaginelabs.com</text>
  <text x="${W - PAD}" y="${H - 52}" text-anchor="end" font-family="${SANS}" font-size="22"
    font-weight="700" letter-spacing="1.2" fill="${o.stamp ? CREAM : CREAM_DIM}"
    >${esc(o.stamp || 'VERIFIED SOURCES ONLY')}</text>
</svg>`;
}

/**
 * Vertical card for Instagram / Facebook / WhatsApp stories. Same content,
 * laid out for a phone screen held upright, with a big safe area top and
 * bottom so the platform's own chrome does not sit on the words.
 */
export function ogStory(o = {}) {
  const W = 1080;
  const H = 1920;
  const PAD = 90;
  const stats = (o.stats || []).slice(0, 3);
  const titleLines = wrap(o.title || '', 84, W - PAD * 2, 5);
  const subLines = o.sub ? wrap(o.sub, 34, W - PAD * 2, 3) : [];

  let y = 760;
  const title = titleLines
    .map((l, i) => `<text x="${PAD}" y="${y + i * 100}" font-family="${SERIF}" font-size="84"
      font-weight="600" fill="${CREAM}"${ws(l, 17)}>${esc(l)}</text>`)
    .join('');
  y += (titleLines.length - 1) * 100 + 76;

  const sub = subLines
    .map((l, i) => `<text x="${PAD}" y="${y + i * 48}" font-family="${SANS}" font-size="34"
      fill="${CREAM_DIM}"${ws(l, 8)}>${esc(l)}</text>`)
    .join('');

  /* The figures sit in a fixed block above the footer rule, one under the
     other, so a long label can never run into the line beside it. */
  const statTop = H - 300 - stats.length * 132;
  const statRow = stats.length
    ? `<g transform="translate(${PAD},${statTop})">` + stats.map((s, i) => `
        <text x="0" y="${i * 132}" font-family="${SERIF}" font-size="76" font-weight="600"
          fill="${i === 0 ? RED : CREAM}">${esc(s.value)}</text>
        <text x="0" y="${i * 132 + 40}" font-family="${SANS}" font-size="28"
          letter-spacing="1.4" fill="${CREAM_DIM}">${esc(s.label)}</text>`).join('') + '</g>'
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="stbg" x1="0" y1="0" x2="0.6" y2="1">
      <stop offset="0" stop-color="${INK}"/>
      <stop offset="1" stop-color="${INK_2}"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#stbg)"/>
  ${ghost(400, 700, 7.0, 0.05)}
  <rect x="0" y="0" width="${W}" height="12" fill="${RED}"/>

  <g transform="translate(${PAD},300) scale(0.9)">${mark('s')}</g>
  <text x="${PAD}" y="${300 + 150}" font-family="${SANS}" font-size="34" font-weight="800"
    letter-spacing="4.6" fill="${CREAM}">NEPAL DISASTER UPDATE</text>
  ${o.eyebrow ? `<text x="${PAD}" y="${300 + 196}" font-family="${SANS}" font-size="27"
    letter-spacing="3.2" fill="${CREAM_DIM}">${esc(String(o.eyebrow).toUpperCase())}</text>` : ''}
  ${o.live ? pill(PAD, 190, 'Live', 'live') : ''}

  ${title}
  ${sub}
  ${statRow}

  <rect x="${PAD}" y="${H - 250}" width="${W - PAD * 2}" height="2" fill="rgba(244,240,230,0.16)"/>
  <text x="${PAD}" y="${H - 190}" font-family="${SANS}" font-size="30" fill="${CREAM}"
    font-weight="700" letter-spacing="0.6">nepaldisasterupdatelive</text>
  <text x="${PAD}" y="${H - 146}" font-family="${SANS}" font-size="26" fill="${CREAM_DIM}">
    .nxtimaginelabs.com</text>
</svg>`;
}

/* ---------------------------------------------------------------------------
   Photograph cards.

   A drawn motif is honest but it is not journalism. When a briefing's own
   sources carry a photograph of the event, that photograph is the picture,
   with the headline set over it, a border, and the outlet credited in the
   corner. src/photo.mjs finds and caches the file; these two lay it out.

   The credit is not decoration. These are other newsrooms' photographs.
   ------------------------------------------------------------------------- */

function scrim(id, dir) {
  /* A gradient dark enough to hold white text over any photograph, and light
     enough at the far end to leave the picture visible. */
  const coords = dir === 'left'
    ? 'x1="0" y1="0" x2="1" y2="0"'
    : 'x1="0" y1="0" x2="0" y2="1"';
  const stops = dir === 'left'
    ? `<stop offset="0" stop-color="${INK}" stop-opacity="0.94"/>
       <stop offset="0.52" stop-color="${INK}" stop-opacity="0.72"/>
       <stop offset="1" stop-color="${INK}" stop-opacity="0.28"/>`
    : `<stop offset="0" stop-color="${INK}" stop-opacity="0.62"/>
       <stop offset="0.34" stop-color="${INK}" stop-opacity="0.12"/>
       <stop offset="0.62" stop-color="${INK}" stop-opacity="0.48"/>
       <stop offset="1" stop-color="${INK}" stop-opacity="0.93"/>`;
  return `<linearGradient id="${id}" ${coords}>${stops}</linearGradient>`;
}

/**
 * 800x450 tile with a real photograph behind the headline.
 * @param {object} o
 * @param {string} o.href    the photograph, as a data: URI
 * @param {string} o.title   the briefing headline, set over the picture
 * @param {string} [o.credit] the outlet the photograph came from
 * @param {string} [o.eyebrow] small label above the headline
 */
export function ogPhotoThumb(o = {}) {
  const W = 800;
  const H = 450;
  const PAD = 34;
  const lines = wrap(o.title || '', 34, W - PAD * 2 - 20, 3);
  const top = H - 88 - (lines.length - 1) * 42;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    ${scrim('ptv', 'down')}
    <clipPath id="ptclip"><rect x="0" y="0" width="${W}" height="${H}" rx="0"/></clipPath>
  </defs>
  <rect width="${W}" height="${H}" fill="${INK}"/>
  ${o.href ? `<g clip-path="url(#ptclip)">
    <image href="${o.href}" x="0" y="0" width="${W}" height="${H}"
      preserveAspectRatio="xMidYMid slice"/>
  </g>` : ''}
  <rect width="${W}" height="${H}" fill="url(#ptv)"/>

  <g transform="translate(${PAD - 6},18) scale(0.38)">${mark('pt')}</g>
  <text x="${PAD + 44}" y="46" font-family="${SANS}" font-size="17" font-weight="800"
    letter-spacing="2.4" fill="${CREAM}">NEPAL DISASTER UPDATE</text>
  ${o.credit ? `<text x="${W - PAD}" y="46" text-anchor="end" font-family="${SANS}"
    font-size="16" letter-spacing="0.6" fill="rgba(255,255,255,0.82)"
    >Photo: ${esc(o.credit)}</text>` : (o.eyebrow ? `<text x="${W - PAD}" y="46" text-anchor="end"
    font-family="${SANS}" font-size="16" font-weight="700" letter-spacing="2" fill="${CREAM_DIM}"
    >${esc(String(o.eyebrow).toUpperCase())}</text>` : '')}

  ${lines.map((l, i) => `<text x="${PAD}" y="${top + i * 42}" font-family="${SERIF}"
    font-size="34" font-weight="600" fill="#FFFFFF"${ws(l, 7)}>${esc(l)}</text>`).join('')}

  <rect x="0" y="${H - 7}" width="${W}" height="7" fill="${RED}"/>
  <rect x="0.75" y="0.75" width="${W - 1.5}" height="${H - 1.5}" fill="none"
    stroke="rgba(244,240,230,0.30)" stroke-width="1.5"/>
</svg>`;
}

/**
 * 1200x630 link preview with a real photograph. Same content as ogCard, but
 * the picture carries it and the text sits in a dark panel on the left.
 *
 * `stats` and `stamp` are what make this worth sharing rather than merely
 * pretty. Somebody scrolling Facebook decides in about a second, and the two
 * things that earn the tap are a real photograph and a number they have not
 * seen yet, with a time on it so they can tell it is current. The stat row
 * therefore sits over the picture, and the freshness stamp replaces the
 * static slogan the footer used to carry.
 *
 * @param {object} o
 * @param {string} [o.href]     the photograph, as a data: URI
 * @param {string} o.title      the headline on the card
 * @param {string} [o.eyebrow]  section label, e.g. "RASUWA FLOOD"
 * @param {boolean} [o.live]    show the red LIVE pill
 * @param {string} [o.credit]   the outlet the photograph came from
 * @param {{value:string,label:string}[]} [o.stats] up to three figures
 * @param {string} [o.stamp]    freshness line, e.g. "UPDATED 28 AUG, 5:10 AM NPT"
 */
export function ogPhotoCard(o = {}) {
  const W = 1200;
  const H = 630;
  const PAD = 66;
  const stats = (o.stats || []).slice(0, 3);
  const titleSize = o.title && o.title.length > 62 ? 52 : 60;
  /* With a stat row underneath there is room for three lines of headline
     rather than four, and the block starts a little higher. */
  const lines = wrap(o.title || '', titleSize, 660, stats.length ? 3 : 4);

  const y = stats.length ? 236 : 250;
  const title = lines.map((l, i) => `<text x="${PAD}" y="${y + i * (titleSize + 8)}"
    font-family="${SERIF}" font-size="${titleSize}" font-weight="600" fill="#FFFFFF"${ws(l, 12)}
    >${esc(l)}</text>`).join('');

  const statRow = stats.length
    ? `<g transform="translate(${PAD},${H - 170})">` + stats.map((s, i) => `
        <text x="${i * 268}" y="0" font-family="${SERIF}" font-size="54" font-weight="600"
          fill="${i === 0 ? RED : '#FFFFFF'}">${esc(s.value)}</text>
        <text x="${i * 268}" y="31" font-family="${SANS}" font-size="20"
          letter-spacing="0.6" fill="rgba(255,255,255,0.86)">${esc(s.label)}</text>`).join('') + '</g>'
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    ${scrim('pch', 'left')}
    <linearGradient id="pcfoot" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${INK}" stop-opacity="0"/>
      <stop offset="1" stop-color="${INK}" stop-opacity="0.92"/>
    </linearGradient>
    <clipPath id="pcclip"><rect x="0" y="0" width="${W}" height="${H}"/></clipPath>
  </defs>
  <rect width="${W}" height="${H}" fill="${INK}"/>
  ${o.href ? `<g clip-path="url(#pcclip)">
    <image href="${o.href}" x="0" y="0" width="${W}" height="${H}"
      preserveAspectRatio="xMidYMid slice"/>
  </g>` : ''}
  <rect width="${W}" height="${H}" fill="url(#pch)"/>
  ${stats.length ? `<rect x="0" y="${H - 300}" width="${W}" height="300" fill="url(#pcfoot)"/>` : ''}

  <g transform="translate(${PAD - 8},38) scale(0.58)">${mark('pc')}</g>
  <text x="${PAD + 68}" y="86" font-family="${SANS}" font-size="24" font-weight="800"
    letter-spacing="3.4" fill="${CREAM}">NEPAL DISASTER UPDATE</text>
  ${o.eyebrow ? `<text x="${PAD + 68}" y="115" font-family="${SANS}" font-size="18"
    letter-spacing="2.6" fill="${CREAM_DIM}">${esc(String(o.eyebrow).toUpperCase())}</text>` : ''}
  ${o.live ? pill(W - PAD - 130, 58, 'Live', 'live') : ''}

  ${title}
  ${statRow}

  ${o.credit ? `<text x="${W - PAD}" y="${H - 116}" text-anchor="end" font-family="${SANS}"
    font-size="17" fill="rgba(255,255,255,0.72)">Photo: ${esc(o.credit)}</text>` : ''}
  <rect x="${PAD}" y="${H - 100}" width="${W - PAD * 2}" height="1" fill="rgba(244,240,230,0.20)"/>
  <text x="${PAD}" y="${H - 56}" font-family="${SANS}" font-size="21" fill="${CREAM_DIM}"
    >nepaldisasterupdatelive.nxtimaginelabs.com</text>
  <text x="${W - PAD}" y="${H - 56}" text-anchor="end" font-family="${SANS}" font-size="20"
    font-weight="700" letter-spacing="1.2" fill="${CREAM}"
    >${esc(o.stamp || 'VERIFIED SOURCES ONLY')}</text>

  <rect x="0" y="${H - 8}" width="${W}" height="8" fill="${RED}"/>
</svg>`;
}
