import { candidatesFrom, pickFigure, METRICS, readDistricts } from './_figures-core.js';

// A named feed is not enough: automatic official corrections must come from
// the issuing government's own HTTPS host and a newer published bulletin.
export function officialUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === 'https:' && /(^|\.)(nepalpolice\.gov\.np|ndrrma\.gov\.np|moha\.gov\.np|mofa\.gov\.np|nepalarmy\.mil\.np)$/.test(u.hostname);
  } catch { return false; }
}
export function verifiedBoard(items, published = {}) {
  const recoveryUrls=new Set();
  const candidates = candidatesFrom(items).filter(c => officialUrl(c.url));
  // A full eight-district recovery bulletin establishes the national scope.
  for (const item of items || []) {
    if (!officialUrl(item.url)) continue;
    const rows = readDistricts([item.title,item.summary,item.body].filter(Boolean).join(' '));
    if (rows.length !== 8) continue;
    const total = rows.reduce((n,r)=>n+r.value,0);
    for (const c of candidates) if(c.metric==='dead' && c.url===item.url && c.value===total){c.scope='total';recoveryUrls.add(c.url);}
  }
  const result = {};
  for (const metric of METRICS) {
    const previous = published.figures?.[metric];
    const after = Date.parse(previous?.time || published.asOf) || 0;
    const newer = candidates.filter(c => c.metric === metric && (metric !== 'dead' || recoveryUrls.has(c.url)) && (!(metric === 'missing' || metric === 'rescued') || !previous?.source?.startsWith('NDRRMA') || /(^|\.)ndrrma\.gov\.np$/.test(new URL(c.url).hostname)) && Date.parse(c.time) > after && Date.parse(c.time) <= Date.now() + 60000);
    // No numerical floor: a later official list can correct the count down.
    const chosen = pickFigure(newer);
    if(chosen) result[metric] = chosen;
    else if(previous) result[metric] = previous;
  }
  return result;
}
export function consistentDistricts(candidate, previous, dead) {
  const d = candidate && (!previous || Date.parse(candidate.time) > Date.parse(previous.time)) ? candidate : previous;
  if (!d?.rows?.length || !dead || d.total !== dead.value) return null;
  const sum=d.rows.reduce((n,r)=>n+r.value,0);
  return sum === d.total ? d : null;
}
