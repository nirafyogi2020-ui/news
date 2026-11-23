/* The front page's live layer: repaints the figure strip from /api/figures
   every 30 seconds and refreshes the newsroom list from /api/news.
   Served as /assets/front.js. src/pages.mjs fills in the two placeholders
   below with the build's own headline rules (src/front-rules.mjs), so the
   browser filters headlines exactly as the build did. Loaded with defer. */
(function(){
  var ROOT = document.getElementById('fp-figs');
  var checkedAt = 0;
  function num(n){ var v = Number(n); return isNaN(v) ? String(n) : v.toLocaleString('en-US'); }
  function npt(iso){
    var d = new Date(iso); if(isNaN(d.getTime())) return '';
    try{ return d.toLocaleString('en-GB', { timeZone:'Asia/Kathmandu', day:'numeric', month:'short', year:'numeric', hour:'numeric', minute:'2-digit', hour12:true }).replace(',', ',') + ' NPT'; }catch(e){ return ''; }
  }
  /* A screen reader is told when the toll or the missing count moves, in
     one short line; the rest of the repaint stays silent. */
  var SPOKEN = { dead:'Confirmed dead now ', missing:'Still missing now ' };
  function paint(data){
    if(!data || !data.board) return;
    var said = [];
    Object.keys(data.board).forEach(function(metric){
      var fig = data.board[metric];
      if(!fig || typeof fig.value !== 'number') return;
      var shown = document.querySelector('[data-live="' + metric + '"]');
      if(shown && SPOKEN[metric] && shown.textContent !== num(fig.value)) said.push(SPOKEN[metric] + num(fig.value));
      document.querySelectorAll('[data-live="' + metric + '"]').forEach(function(el){ el.textContent = num(fig.value); });
      var src = document.querySelector('[data-live-src="' + metric + '"]');
      if(src){
        var line = [fig.source, fig.time ? npt(fig.time) : ''].filter(Boolean).join(', ');
        if(line) src.textContent = line;
      }
    });
    var status = document.getElementById('fp-announce');
    if(status && said.length) status.textContent = said.join('. ') + '.';
  }
  function freshness(){
    var el = document.getElementById('fp-checked');
    if(!el || !checkedAt) return;
    var s = Math.max(0, Math.round((Date.now() - checkedAt) / 1000));
    el.textContent = s < 2 ? 'Sources checked just now' : s < 60 ? 'Sources checked ' + s + 's ago' : 'Sources checked ' + Math.round(s / 60) + ' min ago';
  }
  var busy = false;
  function poll(){
    if(busy || document.hidden || !ROOT) return;
    busy = true;
    fetch('/api/figures').then(function(r){ return r.ok ? r.json() : null; }).then(function(data){
      if(!data) return;
      checkedAt = Date.parse(data.checkedAt || data.updated) || Date.now();
      paint(data); freshness();
    }).catch(function(){}).then(function(){ busy = false; });
  }
  poll();
  setInterval(poll, 30000);
  setInterval(freshness, 1000);
  document.addEventListener('visibilitychange', function(){ if(!document.hidden) poll(); });

  /* The newsroom list refreshes itself from the same feed the build read.
     Items are built as nodes, never as markup, because the headlines are
     other people's text. The rules are the build's own, handed over below. */
  var list = document.getElementById('fp-news');
  var RS = __FRONT_RULES__, R = {};
  Object.keys(RS).forEach(function(k){ R[k] = new RegExp(RS[k][0], RS[k][1]); });
  var verdict = __HEADLINE_VERDICT__;
  function clean(t){
    t = String(t || '').replace(/\s+[\u2013\u2014]\s+/g, ', ').replace(/[\u2013\u2014]/g, '-').replace(/\s+/g, ' ').trim();
    return (!t || verdict(t, R) !== 'nepal') ? '' : t;
  }
  function refreshNews(){
    if(!list || document.hidden) return;
    fetch('/api/news').then(function(r){ return r.ok ? r.json() : null; }).then(function(data){
      if(!data || !Array.isArray(data.items)) return;
      var seen = {}, rows = [];
      data.items.forEach(function(it){
        if(!it || !it.title || !it.url || it.kind === 'video') return;
        if(it.region && it.region !== 'nepal') return;
        if(!/^https:\/\//.test(it.url) || seen[it.url]) return;
        var t = clean(it.title); if(!t) return;
        seen[it.url] = 1;
        rows.push({ title:t, url:it.url, source:String(it.source || ''), time:it.time || '', image:/^https:\/\//.test(it.image || '') ? it.image : '' });
      });
      rows.sort(function(a, b){ return new Date(b.time || 0) - new Date(a.time || 0); });
      rows = rows.slice(0, 12);
      if(!rows.length) return;
      var frag = document.createDocumentFragment();
      rows.forEach(function(row, i){
        var li = document.createElement('li'); li.className = 'fp-news-item';
        var a = document.createElement('a'); a.href = row.url; a.target = '_blank'; a.rel = 'noopener nofollow';
        var t = document.createElement('span'); t.className = 't'; t.textContent = row.title; if(/[\u0900-\u097F]/.test(row.title)) t.lang = 'ne'; a.appendChild(t); var nt = document.createElement('span'); nt.className = 'visually-hidden'; nt.lang = 'en'; nt.textContent = ' (opens in a new tab)'; a.appendChild(nt); li.appendChild(a);
        var m = document.createElement('p'); m.className = 'm';
        if(row.time){ var tm = document.createElement('time'); tm.dateTime = row.time; tm.textContent = npt(row.time); m.appendChild(tm); }
        var tail = (row.source ? (row.time ? ' · ' : '') + row.source : '');
        if(i < 3 && row.image){ tail += ' · Photo: ' + (row.source || 'source'); }
        if(tail) m.appendChild(document.createTextNode(tail));
        li.appendChild(m);
        if(i < 3 && row.image){
          li.className += ' has-photo';
          var img = document.createElement('img'); img.src = row.image; img.alt = ''; img.width = 320; img.height = 180; img.loading = 'lazy'; img.referrerPolicy = 'no-referrer';
          img.onerror = function(){ li.classList.remove('has-photo'); img.remove(); };
          li.appendChild(img);
        }
        frag.appendChild(li);
      });
      list.textContent = ''; list.appendChild(frag);
    }).catch(function(){});
  }
  setInterval(refreshNews, 300000);
  document.addEventListener('visibilitychange', function(){ if(!document.hidden) refreshNews(); });
})();
