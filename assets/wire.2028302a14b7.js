/* The newswire list on /nepal-flood/rasuwa/live-updates/.
   Served as /assets/wire.js. Loaded with defer. */
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
      return '<div class="feeditem"><a href="' + esc(i.url) + '" target="_blank" rel="noopener nofollow"' + (/[\u0900-\u097F]/.test(i.title) ? ' lang="ne"' : '') + '>' + esc(i.title) + '<span class="visually-hidden" lang="en"> (opens in a new tab)</span></a>' +
        '<div class="meta"><span>' + esc(i.source || '') + '</span>' +
        (ago(i.time) ? '<span>' + ago(i.time) + '</span>' : '') +
        (i.verified ? '<span>verified</span>' : '') + '</div></div>';
    }).join('');
  }).catch(function(e){
    state.textContent = 'The newswire could not be reached (' + e.message + '). This does not affect the briefings above, which are stored on this page. Emergency numbers are at the top and work regardless.';
  });
})();
