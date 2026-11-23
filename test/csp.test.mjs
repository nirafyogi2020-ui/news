import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  headersFor, scriptPolicies, inlineScripts, inlineHandlers, javascriptUrls,
  localAssets, handlerStringsInJs, pageProblems, policyProblems,
} from '../src/csp-rules.mjs';
import { IMG_FAIL_JS } from '../src/template.mjs';

const HEADERS = readFileSync(new URL('../_headers', import.meta.url), 'utf8');
const policies = scriptPolicies(HEADERS);

test('_headers is read rule by rule', () => {
  const sample = '# note\n/*\n  X-A: 1\n  Content-Security-Policy: script-src \'self\'; object-src \'none\'\n/embed\n  X-A: 2\n';
  assert.deepEqual(headersFor(sample, '/*'), [['X-A', '1'], ['Content-Security-Policy', "script-src 'self'; object-src 'none'"]]);
  assert.deepEqual(headersFor(sample, '/embed'), [['X-A', '2']]);
  assert.deepEqual(scriptPolicies(sample), [{ name: 'Content-Security-Policy', tokens: ["'self'"] }]);
});

test('the site has a strict script policy and no broken combination', () => {
  assert.deepEqual(policyProblems(policies), []);
  const strict = policies.filter(p => !p.tokens.includes("'unsafe-inline'"));
  assert.ok(strict.length >= 1, 'at least one policy refuses inline scripts');
  for (const p of strict) assert.ok(p.tokens.some(t => t.startsWith("'sha256-")), `${p.name} lists hashes`);
});

test('a hash next to unsafe-inline, or unsafe-hashes, is a policy fault', () => {
  const bad = scriptPolicies("/*\n  Content-Security-Policy: script-src 'self' 'unsafe-inline' 'sha256-abc='\n");
  assert.equal(policyProblems(bad).length, 1);
  assert.equal(policyProblems(scriptPolicies("/*\n  Content-Security-Policy: script-src 'self' 'unsafe-hashes'\n")).length, 1);
  assert.equal(policyProblems([]).length, 1, 'no policy at all is a fault');
});

test('inline scripts are hashed the way a browser does, data blocks skipped', () => {
  const html = '<script>alert(1)</script><script type="application/ld+json">{}</script>'
    + '<script type="application/json" id="x">[]</script><script src="/assets/a.0123456789ab.js" defer></script>'
    + '<script type="module">alert(1)</script>';
  const found = inlineScripts(html);
  assert.equal(found.length, 2);
  // printf 'alert(1)' | openssl dgst -sha256 -binary | base64
  assert.equal(found[0].hash, "'sha256-bhHHL3z2vDgxUt0W3dWQOrprscmda2Y5pLsLg4GF+pI='");
});

test('a page fails when an inline script is not listed, and says what to paste', () => {
  const strict = [{ name: 'Content-Security-Policy-Report-Only', tokens: ["'self'"] }];
  const loose = [{ name: 'Content-Security-Policy', tokens: ["'self'", "'unsafe-inline'"] }];
  const html = '<html><head><script>alert(1)</script></head></html>';
  const problems = pageProblems(html, strict);
  assert.equal(problems.length, 1);
  assert.match(problems[0], /add 'sha256-bhHHL3z2vDgxUt0W3dWQOrprscmda2Y5pLsLg4GF\+pI=' to its script-src/);
  assert.deepEqual(pageProblems(html, loose), [], 'a policy with unsafe-inline needs no hashes');
  const listed = [{ name: 'x', tokens: ["'self'", "'sha256-bhHHL3z2vDgxUt0W3dWQOrprscmda2Y5pLsLg4GF+pI='"] }];
  assert.deepEqual(pageProblems(html, listed), []);
});

test('inline handlers are found on any element, and only there', () => {
  assert.equal(inlineHandlers('<img src="a.png" onerror="this.remove()">').length, 1);
  assert.equal(inlineHandlers('<body onload=go()>').length, 1);
  assert.equal(inlineHandlers('<IMG SRC=x OnError = \'y\'>').length, 1);
  assert.deepEqual(inlineHandlers('<img alt="carry on=1" data-onerror="x" data-fail="blank">'), []);
  assert.deepEqual(inlineHandlers('<script>var s = "<img onerror=\\"x\\">";</script>'), []);
  assert.deepEqual(inlineHandlers('<!-- <img onerror="x"> -->'), []);
  assert.deepEqual(inlineHandlers('<style>a[onclick=x]{}</style>'), []);
});

test('javascript: URLs are found', () => {
  assert.equal(javascriptUrls('<a href="javascript:void(0)">x</a>').length, 1);
  assert.equal(javascriptUrls("<a href = ' JavaScript:go()'>x</a>").length, 1);
  assert.equal(javascriptUrls('<form action=javascript:x>').length, 1);
  assert.deepEqual(javascriptUrls('<a href="/javascript-guide/">x</a><p>javascript: is refused</p>'), []);
});

test('local scripts and stylesheets are listed by their path', () => {
  const html = '<script src="/assets/front.0123456789ab.js" defer></script><script src="https://unpkg.com/x.js"></script>'
    + '<script src="/cdn-cgi/scripts/e.js"></script><script src="//cdn.example/x.js"></script>'
    + '<link rel="stylesheet" href="/assets/site.0123456789ab.css"><link rel="icon" href="/favicon.ico">'
    + '<link rel="stylesheet" href="https://fonts.googleapis.com/css2">';
  assert.deepEqual(localAssets(html).sort(), ['assets/front.0123456789ab.js', 'assets/site.0123456789ab.css']);
});

test('handler attributes written from script are found, property assignments are not', () => {
  assert.deepEqual(handlerStringsInJs(`'<img src="x" onerror="this.remove()">'`), ['onerror="']);
  assert.deepEqual(handlerStringsInJs(`'<img onerror=\\'x\\'>'`), ["onerror=\\'"]);
  assert.deepEqual(handlerStringsInJs('s.onload = draw; img.onerror = function(){}; x.onclick=fn;'), []);
});

test('the picture fallback script is one text, carried by the template and the dashboard', () => {
  assert.doesNotMatch(IMG_FAIL_JS, /\/\*|\/\//, 'no comments: the dashboard build would strip them');
  const dash = readFileSync(new URL('../src/rasuwa-dashboard.html', import.meta.url), 'utf8');
  assert.equal(dash.split('/*@img-fail@*/').length, 2, 'the dashboard has exactly one placeholder');
  assert.deepEqual(handlerStringsInJs(dash), [], 'no inline handler strings left in the dashboard source');
  assert.deepEqual(inlineHandlers(dash), [], 'no inline handlers in the dashboard markup');
  for (const how of ['unphoto', 'blank', 'backup', 'lead', 'hide', 'remove']) {
    assert.match(IMG_FAIL_JS, new RegExp(`how === '${how}'`), how);
  }
});
