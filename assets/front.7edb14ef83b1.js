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
  var RS = {"disaster":["flood(?!lit|light)|flash flood|landslide|mudslide|earthquake|quake|tremor|aftershock|avalanche|glacier|glacial|GLOF|barrier lake|monsoon|heavy rain|rainfall|storm|cyclone|lightning|hailstorm|windstorm|cold wave|heatwave|drought|wildfire|forest fire|fire|disaster|hazard|rescue|rescued|missing|death toll|dead(?!line|lock)|killed|bodies|relief|evacuat|displaced|shelter|NDRRMA|NEOC|Nepal Police|Nepali Army|Armed Police|Red Cross|ReliefWeb|Rasuwa|Bhote ?Koshi|Trishuli|Narayani|Syabrubesi|Rasuwagadhi|highway blocked|road blocked|bridge|washed away|swept away|inundat|बाढी|पहिरो|भूकम्प|भुइँचालो|विपद्|विपद|उद्धार|बेपत्ता|मृत्यु|ज्यान|शव|राहत|वर्षा|हिमपात|हिमताल|हिमपहिरो|चक्रवात|आगलागी|डुबान|चट्याङ|सडक अवरुद्ध|राजमार्ग अवरुद्ध|पुल|रसुवा|भोटेकोशी|त्रिशूली|नारायणी","i"],"foreign":["\\b(?:Spain|Spanish|Italy|Italian|France|French|German[y]?|Britain|British|UK|United States|US|American|Japan(?:ese)?|Philippines?|Indonesia[n]?|Pakistan[i]?|Bangladesh[i]?|Sri Lanka[n]?|Afghan(?:istan)?|Brazil(?:ian)?|Mexic(?:o|an)|Australia[n]?|Africa[n]?|Europe(?:an)?|Turk(?:ey|ish)|Iran(?:ian)?|Vietnam(?:ese)?|Thai(?:land)?|Myanmar|Taiwan(?:ese)?|Korea[n]?|Russia[n]?|Ukrain(?:e|ian)|Canad(?:a|ian)|Chile(?:an)?|Peru(?:vian)?|Greece|Greek|Portug(?:al|uese)|Gaza|Israel[i]?|Morocc(?:o|an)|Liby(?:a|an)|Haiti(?:an)?|Ecuador(?:ian)?|Colombia[n]?|Cuba[n]?|Malaysia[n]?|Cambodia[n]?|Bhutan(?:ese)?|Syria[n]?|Egypt(?:ian)?|Sudan(?:ese)?|Kenya[n]?|Nigeria[n]?|Ethiopia[n]?|Somalia[n]?|California|Texas|Florida|Hawaii|Caribbean|Jamaica[n]?)\\b|पेरु|गाजामा|गाजाको|गाजाका|गाजाबाट|गाजा पट्टी|इजरायल|अमेरिका|जापान|पाकिस्तान|बंगलादेश|बङ्गलादेश|श्रीलंका|श्रीलङ्का|अफगानिस्तान|इन्डोनेसिया|इण्डोनेसिया|फिलिपिन्स|टर्की|टर्किये|इरान|भियतनाम|थाइल्यान्ड|म्यानमार|ताइवान|कोरिया|रूस|रुसमा|रुसको|रुसी|युक्रेन|क्यानडा|चिली|मेक्सिको|ब्राजिल|अष्ट्रेलिया|अस्ट्रेलिया|अफ्रिका|युरोप|स्पेन|इटाली|फ्रान्स|जर्मनी|बेलायत|ग्रीस|पोर्चुगल|मोरक्को|लिबिया|हाइटी|इक्वेडर|कोलम्बिया|क्युबा|मलेसिया|कम्बोडिया|भुटान",""],"nepal":["\\bNepal|Bhote ?Koshi|Rasuwa|Trishuli|Kathmandu|नेपाल|भोटेकोशी|रसुवा|त्रिशूली|काठमाडौं|काठमाडौँ|बाढी ?प्रभावितलाई|बाढी ?पीडितलाई","i"],"market":["\\b(?:stock markets?|share markets?|stock exchange|share index|tech stocks|share prices?|stock prices?|NEPSE|Nasdaq|Wall Street)\\b|सेयर बजार|सेयरमा|सेयरको|नेप्से","i"],"crypto":["\\b(?:digital wealth|cryptocurrenc(?:y|ies)|bitcoin|crypto(?:[- ]?(?:mining|currency|assets?|exchange))?|blockchain)\\b|क्रिप्टो|बिटकोइन","i"],"pun":["\\bflood-?lit\\b|\\bflood-?lights?\\b|\\bflood-?lighting\\b","i"],"sport":["football|futsal|cricket|\\bNPL\\b|\\bT20|\\bODI\\b|wickets?|innings|tri-series|league|tournament|stadium|फुटबल|क्रिकेट|खेलकुद|खेलाडी|रंगशाला|रङ्गशाला","i"],"tourism":["\\b(?:tourism|tourists?|resorts?|hotels?|travel awards?|trekking destination|cake-mixing)\\b|पर्यटक|पर्यटन|पदयात्रा|गन्तव्य|होटल|रिसोर्ट","i"],"harm":["\\b(?:dead|killed|died|death|missing|rescued?|stranded|injured|trapped|bodies|evacuat\\w*|victims?|displaced|sweeps?|swept|bur(?:y|ies|ied)|damag(?:e|es|ed)|destro(?:y|ys|yed)|collaps(?:e|es|ed)|hit|affected|relief|aid)\\b|बेपत्ता|उद्धार|मृत्यु|घाइते|फसे|शव|ज्यान|पीडित|बगायो|बगाए|पुरियो|क्षति|ध्वस्त|प्रभावित|राहत","i"],"off":["Hormuz|होर्मुज|Manchester United|म्यानचेस्टर|apples?|स्याउ|World Bank|विश्व बैंक|economic growth|अर्थतन्त्र|भ्याट|exported to India|विद्युत निर्यात|festival|दशैं|दसैँ|election|candidates?|निर्वाचन|चुनाव|उम्मेदवार|मतदान|shooting|shot dead|गोली प्रहार|\\bShark Tank|\\bpremier(?:e|es|ed)\\b|reality show|\\bseason \\d+|box office|\\bmovies?\\b|\\bfilms?\\b|web series|\\btrailer\\b|\\balbum\\b|music video|\\bconcerts?\\b|beauty pageant|Miss Nepal|चलचित्र|फिल्म|प्रिमियर|रियालिटी शो|कन्सर्ट|एल्बम|म्युजिक भिडियो","i"],"strong":["\\bflood(?!lit|light)|landslide|mudslide|earthquake|\\bquake|aftershock|avalanche|glacial|\\bGLOF|barrier lake|heavy rain|cyclone|lightning|hailstorm|windstorm|cold wave|heatwave|drought|wildfire|forest fire|disaster|\\brescue|\\bmissing|death toll|\\bdead\\b|\\bkilled|\\bbodies|\\bevacuat|\\bdisplaced|\\bvictims?|\\bsurvivors?|washed away|swept away|inundat|बाढी|पहिरो|भूकम्प|भुइँचालो|विपद्|विपद|उद्धार|बेपत्ता|मृत्यु|शव|हिमपहिरो|चक्रवात|आगलागी|डुबान|चट्याङ|पीडित","i"]}, R = {};
  Object.keys(RS).forEach(function(k){ R[k] = new RegExp(RS[k][0], RS[k][1]); });
  var verdict = function headlineVerdict(title, R) {
  var t = String(title || '');
  if (R.market.test(t) || R.crypto.test(t) || R.pun.test(t)) return 'off';
  if ((R.sport.test(t) || R.tourism.test(t)) && !(R.strong.test(t) && R.harm.test(t))) return 'off';
  if (R.off.test(t) && !R.strong.test(t)) return 'off';
  if (!R.disaster.test(t)) return 'none';
  if (R.foreign.test(t) && !R.nepal.test(t)) return 'foreign';
  return 'nepal';
};
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
