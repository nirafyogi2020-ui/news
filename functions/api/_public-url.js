/**
 * Fetching addresses that came from someone else's feed.
 *
 * The news function reads article pages whose address a publisher's RSS feed
 * chose, and every upstream feed can answer with a redirect. Neither may point
 * the function at a private or local address. This is the same rule the build
 * uses for photographs (src/photo.mjs isPublicWebUrl); it is copied here
 * because that file reads the disk and cannot be loaded by a Pages Function.
 * It checks names only, with no DNS lookup.
 */

export const MAX_REDIRECTS = 5;

export function isPublicWebUrl(value) {
  let url;
  try { url = new URL(String(value || '')); } catch { return false; }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return false;
  if (url.username || url.password) return false;
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '');
  if (!host || !host.includes('.')) return false;
  if (/(^|\.)(localhost|local|internal|localdomain|home|lan|corp)$/.test(host)) return false;
  if (host.includes(':')) return false;                    // any IPv6 literal
  const v4 = host.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
    if (a === 169 && b === 254) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
    if (a === 100 && b >= 64 && b <= 127) return false;
  } else if (/^[\d.]+$/.test(host) || /^0x/i.test(host)) {
    return false;                                         // odd numeric forms
  }
  return true;
}

/**
 * fetch(), but every address it visits must pass isPublicWebUrl: redirects
 * are followed by hand and each new address is checked again, at most
 * MAX_REDIRECTS times. Throws when an address is refused or there are too
 * many hops; otherwise returns the final response (which may not be ok).
 */
export async function fetchPublic(url, init = {}, maxRedirects = MAX_REDIRECTS) {
  let next = String(url || '');
  for (let hop = 0; hop <= maxRedirects; hop++) {
    if (!isPublicWebUrl(next)) throw new Error('refused non-public URL');
    const res = await fetch(next, { ...init, redirect: 'manual' });
    if (res.status < 300 || res.status > 399) return res;
    const location = res.headers.get('location');
    if (!location) return res;
    try { await res.body?.cancel(); } catch { /* nothing to free */ }
    next = new URL(location, next).toString();
  }
  throw new Error('too many redirects');
}
