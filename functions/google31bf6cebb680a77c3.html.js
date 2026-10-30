/**
 * GET /google31bf6cebb680a77c3.html
 *
 * Google Search Console ownership check. Pages serves the static copy of this
 * file only behind a 308 to the extensionless URL, and Google's verifier does
 * not accept redirects, so it is answered here directly with a 200.
 * Do not delete: Search Console re-checks it and drops ownership if it goes.
 */

export function onRequestGet() {
  return new Response('google-site-verification: google31bf6cebb680a77c3.html', {
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}
