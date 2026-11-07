/**
 * GET /embed
 *
 * A small box of live figures that any newsroom or blog can paste into a page
 * with one iframe. Each box credits the source of the figures and links back
 * here, which is what makes it worth offering.
 */

const SITE = 'https://nepaldisasterupdatelive.nxtimaginelabs.com';
const ROWS = [
  ['confirmed dead', 'Confirmed dead'],
  ['listed missing in Nepal', 'Missing'],
  ['rescued so far', 'Rescued'],
];

const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function embedHtml(event) {
  const stats = (event && event.stats) || [];
  const figures = ROWS.map(([label, name]) => {
    const stat = stats.find(s => s && s.label === label);
    return stat ? `<div><b>${esc(stat.value)}</b><span>${name}</span></div>` : '';
  }).join('');
  const asOf = event && event.asOf ? new Date(event.asOf).toLocaleDateString('en-GB', {
    timeZone: 'Asia/Kathmandu', day: 'numeric', month: 'long', year: 'numeric',
  }) : '';
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${esc((event && event.name) || 'Nepal disaster')}: live figures</title>
<style>
:root{--bg:#fff;--ink:#14181f;--muted:#5b6472;--line:#dfe3e8;--dead:#b3261e}
@media(prefers-color-scheme:dark){:root{--bg:#10141a;--ink:#f2f4f7;--muted:#a3acb9;--line:#2a313b;--dead:#ff8a80}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.4 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
.box{border:1px solid var(--line);border-radius:6px;padding:14px 16px}
h1{margin:0 0 10px;font-size:15px;font-weight:650}
.row{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
b{display:block;font-size:24px;line-height:1.15;font-variant-numeric:tabular-nums}
.row div:first-child b{color:var(--dead)}
span{font-size:12px;color:var(--muted)}
p{margin:10px 0 0;font-size:12px;color:var(--muted)}
a{color:inherit}
</style>
</head>
<body>
<div class="box">
<h1>${esc((event && event.name) || 'Nepal disaster')}: latest figures</h1>
<div class="row">${figures}</div>
<p>${esc((event && event.asOfSource) || 'Official sources')}${asOf ? `, ${esc(asOf)}` : ''}. <a href="${SITE}/nepal-flood/rasuwa/" target="_blank" rel="noopener">Live updates: Nepal Disaster Update</a></p>
</div>
</body>
</html>`;
}

/* Link checkers and some embed previews ask with HEAD first; without this the
   function answered 404 to them while GET worked. */
export async function onRequestHead(context) {
  const res = await onRequestGet(context);
  return new Response(null, { status: res.status, headers: res.headers });
}

export async function onRequestGet(context) {
  const res = await fetch(new URL('/event.json', context.request.url));
  if (!res.ok) return new Response('Figures are not available right now.', { status: 503 });
  return new Response(embedHtml(await res.json()), {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=60',
      'content-security-policy': 'frame-ancestors *',
    },
  });
}
