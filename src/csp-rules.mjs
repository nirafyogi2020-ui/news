/* ============================================================================
   Content-Security-Policy rules, used by src/check.mjs and the tests.

   The site's script-src does not allow inline code: scripts are the site's
   own files plus a few small inline blocks allowed by their sha256 hash. That
   only holds while every page keeps to it, so the audit proves it on every
   build:
   - every inline script block's hash is listed in each strict policy in
     _headers (a policy without 'unsafe-inline'), and the error prints the
     hash to paste;
   - no element carries an on...= handler attribute and no link is a
     javascript: URL, since neither can run under the policy;
   - no built script writes handler attributes into markup either;
   - every script and stylesheet a page links on this site exists.
   ========================================================================= */

import { createHash } from 'node:crypto';

/* The headers of one path rule in a Cloudflare _headers file, as
   [name, value] pairs in file order. */
export function headersFor(text, rulePath = '/*') {
  const out = [];
  let inRule = false;
  for (const line of String(text).split('\n')) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    if (!/^\s/.test(line)) { inRule = line.trim() === rulePath; continue; }
    if (!inRule) continue;
    const m = line.trim().match(/^([A-Za-z-]+):\s*(.*)$/);
    if (m) out.push([m[1], m[2]]);
  }
  return out;
}

/* Every CSP on the rule (enforced and report-only), each with its script-src
   tokens. */
export function scriptPolicies(text, rulePath = '/*') {
  return headersFor(text, rulePath)
    .filter(([name]) => /^content-security-policy(-report-only)?$/i.test(name))
    .map(([name, value]) => {
      const dir = value.split(';').map(d => d.trim().split(/\s+/)).find(d => d[0].toLowerCase() === 'script-src');
      return { name, tokens: dir ? dir.slice(1) : [] };
    });
}

/* The executable inline <script> blocks of a page, with the hash a browser
   computes for each (sha256 over the exact text between the tags). Data
   blocks (JSON, JSON-LD) are not run and are left out. */
export function inlineScripts(html) {
  const out = [];
  for (const m of String(html).matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
    const attrs = m[1];
    if (/\bsrc\s*=/i.test(attrs)) continue;
    const type = (attrs.match(/\btype\s*=\s*["']?([^"'\s>]+)/i) || [])[1];
    if (type && !/^(text\/javascript|application\/javascript|module)$/i.test(type)) continue;
    const hash = `'sha256-${createHash('sha256').update(m[2], 'utf8').digest('base64')}'`;
    out.push({ hash, code: m[2] });
  }
  return out;
}

/* The page with script and style contents and comments removed, so text in
   them cannot be mistaken for markup. */
function markupOnly(html) {
  return String(html)
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/(<script\b[^>]*>)[\s\S]*?<\/script\s*>/gi, '$1</script>')
    .replace(/(<style\b[^>]*>)[\s\S]*?<\/style\s*>/gi, '$1</style>');
}

/* on...= attributes on any element. Quoted attribute values are blanked
   first, so alt text that happens to read "carry on=" is not a handler. */
export function inlineHandlers(html) {
  const found = [];
  for (const m of markupOnly(html).matchAll(/<[a-z][^>]*>/gi)) {
    const bare = m[0].replace(/"[^"]*"|'[^']*'/g, '""');
    const h = bare.match(/\s(on[a-z]+)\s*=/i);
    if (h) found.push(`${h[1]} on ${m[0].slice(0, 80)}`);
  }
  return found;
}

/* href, src, action, formaction or data pointing at javascript:. */
export function javascriptUrls(html) {
  const found = [];
  for (const m of markupOnly(html).matchAll(/\b(?:href|src|action|formaction|data|xlink:href)\s*=\s*["']?\s*javascript:/gi)) {
    found.push(m[0]);
  }
  return found;
}

/* Scripts and stylesheets a page loads from this site, as file paths
   relative to the site root, without the ?v= stamp. Cloudflare's own
   /cdn-cgi/ scripts are added at the edge and have no file here. */
export function localAssets(html) {
  const out = new Set();
  const tags = [
    ...String(html).matchAll(/<script\b[^>]*\bsrc="([^"]+)"/gi),
    ...[...String(html).matchAll(/<link\b[^>]*>/gi)]
      .filter(m => /\brel="(?:stylesheet|preload|modulepreload)"/i.test(m[0]))
      .map(m => m[0].match(/\bhref="([^"]+)"/i) || [null, '']),
  ];
  for (const m of tags) {
    const url = m[1];
    if (!url || !url.startsWith('/') || url.startsWith('//') || url.startsWith('/cdn-cgi/')) continue;
    out.add(url.split(/[?#]/)[0].replace(/^\//, ''));
  }
  return [...out];
}

/* Handler attributes written into markup from script, for example
   '<img onerror="...">' built as a string for innerHTML. A property
   assignment such as `s.onload = draw` has no quote after the = and does
   not match. */
export function handlerStringsInJs(code) {
  return [...String(code).matchAll(/\bon[a-z]{3,}=\\?["']/gi)].map(m => m[0]);
}

/* Everything wrong with one page under the policies in _headers. */
export function pageProblems(html, policies) {
  const problems = [];
  const strict = policies.filter(p => !p.tokens.includes("'unsafe-inline'"));
  for (const { hash } of inlineScripts(html)) {
    for (const p of strict) {
      if (!p.tokens.includes(hash)) {
        problems.push(`an inline <script> is not allowed by ${p.name} in _headers; if the change is intended, add ${hash} to its script-src`);
      }
    }
  }
  for (const h of inlineHandlers(html)) problems.push(`inline event handler (${h}); use data-fail or a listener in a script file`);
  for (const u of javascriptUrls(html)) problems.push(`javascript: URL (${u})`);
  return problems;
}

/* Policy-level faults: a hash next to 'unsafe-inline' makes browsers ignore
   'unsafe-inline', which would silently stop every handler the policy was
   meant to allow; and a strict policy must not allow handler attributes. */
export function policyProblems(policies) {
  const problems = [];
  if (!policies.length) problems.push('_headers: no Content-Security-Policy on /*');
  for (const p of policies) {
    if (!p.tokens.length) problems.push(`_headers: ${p.name} has no script-src`);
    const keyed = p.tokens.some(t => /^'(sha256|sha384|sha512|nonce)-/.test(t));
    if (keyed && p.tokens.includes("'unsafe-inline'")) {
      problems.push(`_headers: ${p.name} lists hashes and 'unsafe-inline' together; browsers then ignore 'unsafe-inline'`);
    }
    if (p.tokens.includes("'unsafe-hashes'")) problems.push(`_headers: ${p.name} allows 'unsafe-hashes'`);
  }
  return problems;
}
