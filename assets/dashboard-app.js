/* Nepal Disaster Update: the Rasuwa dashboard's behaviour. Source: src/rasuwa-dashboard.html. */

/* block 1 */
try {
(function(){
  var btn    = document.getElementById('drawer-btn');
  var panel  = document.getElementById('drawer');
  var scrim  = document.getElementById('drawer-scrim');
  var body   = document.getElementById('drawer-body');
  var closeB = document.getElementById('drawer-close');
  if(!btn || !panel || !body) return;

  function build(){
    body.innerHTML = '';
    document.querySelectorAll('#tabbar button[data-tab]').forEach(function(tab){
      var key = tab.getAttribute('data-tab');
      var group = document.createElement('div');
      group.className = 'dr-group';

      var row = document.createElement('div');
      row.className = 'dr-row';

      var head = document.createElement('button');
      head.type = 'button';
      head.className = 'dr-tab';
      head.textContent = tab.querySelector('span[data-i18n]').textContent;
      if(Tabs.current === key) head.classList.add('is-current');
      head.addEventListener('click', function(){ Tabs.show(key); close(); });
      row.appendChild(head);
      group.appendChild(row);

      var sections = document.querySelectorAll('#panel-' + key + ' section[data-toc]:not([hidden])');
      if(sections.length > 1){
        var toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'dr-toggle';
        toggle.setAttribute('aria-label', 'Show the parts of ' + head.textContent);
        toggle.setAttribute('aria-expanded', String(Tabs.current === key));
        toggle.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9.5 12 15l6-5.5"/></svg>';
        toggle.addEventListener('click', function(){
          var on = group.classList.toggle('is-open');
          toggle.setAttribute('aria-expanded', String(on));
        });
        row.appendChild(toggle);
        if(Tabs.current === key) group.classList.add('is-open');

        var ol = document.createElement('ol');
        ol.className = 'dr-list';
        sections.forEach(function(sec){
          var li = document.createElement('li');
          var a = document.createElement('a');
          a.href = '#' + sec.id;
          a.textContent = String(sec.getAttribute('data-toc')).replace(/^\s*\d+\.\s*/, '');
          a.addEventListener('click', function(e){
            e.preventDefault();
            Tabs.show(key);
            close();
            requestAnimationFrame(function(){
              if(window.BriefCard && window.BriefCard.has(sec.id)){
                window.BriefCard.show(sec.id, { scroll:true });
              } else {
                sec.scrollIntoView({ behavior:'smooth', block:'start' });
              }
            });
          });
          li.appendChild(a);
          ol.appendChild(li);
        });
        group.appendChild(ol);
      }
      body.appendChild(group);
    });
  }

  var form = document.getElementById('drawer-search');
  if(form) form.addEventListener('submit', function(e){
    e.preventDefault();
    var q = document.getElementById('drawer-search-input').value;
    close();
    setTimeout(function(){
      var btn = document.getElementById('search-btn');
      if(btn) btn.click();
      var input = document.getElementById('site-search-input');
      if(input){ input.value = q; input.dispatchEvent(new Event('input', { bubbles:true })); input.focus(); }
    }, 260);
  });

  var lastFocus = null;
  function open(){
    build();
    lastFocus = document.activeElement;
    panel.hidden = false; scrim.hidden = false;
    void panel.offsetWidth;
    panel.classList.add('is-open'); scrim.classList.add('is-open');
    btn.setAttribute('aria-expanded','true');
    document.body.style.overflow = 'hidden';
    closeB.focus();
  }
  function close(){
    var wasOpen = panel.classList.contains('is-open');
    panel.classList.remove('is-open'); scrim.classList.remove('is-open');
    btn.setAttribute('aria-expanded','false');
    document.body.style.overflow = '';
    if(wasOpen && panel.contains(document.activeElement)){
      (lastFocus && lastFocus.focus ? lastFocus : btn).focus();
    }
    setTimeout(function(){
      if(!panel.classList.contains('is-open')){ panel.hidden = true; scrim.hidden = true; }
    }, 240);
  }
  panel.addEventListener('keydown', function(e){
    if(e.key !== 'Tab') return;
    var items = Array.prototype.slice.call(panel.querySelectorAll('button, a[href], input')).filter(function(el){
      return !el.disabled && el.offsetParent !== null;
    });
    if(!items.length) return;
    var first = items[0], last = items[items.length - 1];
    if(e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
    else if(!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
  });

  btn.addEventListener('click', function(){
    if(panel.classList.contains('is-open')) close(); else open();
  });
  closeB.addEventListener('click', close);
  scrim.addEventListener('click', close);
  document.addEventListener('keydown', function(e){
    if(e.key === 'Escape' && panel.classList.contains('is-open')) close();
  });
})();
} catch (e) { setTimeout(function () { throw e; }); }

/* block 2 */
try {
window.BriefCard = (function(){
  var card = document.getElementById('briefcard');
  if(!card) return { show:function(){}, has:function(){ return false; } };
  var buttons = Array.prototype.slice.call(card.querySelectorAll('[data-pane]'));
  var panes   = Array.prototype.slice.call(card.querySelectorAll('.briefcard-body > section'));

  function show(id, opts){
    opts = opts || {};
    var found = panes.some(function(p){ return p.id === id; });
    if(!found) return false;
    panes.forEach(function(p){ p.hidden = p.id !== id; });
    buttons.forEach(function(b){
      b.setAttribute('aria-selected', String(b.getAttribute('data-pane') === id));
    });
    if(opts.scroll){
      card.scrollIntoView({ behavior:'smooth', block:'start' });
    }
    return true;
  }

  buttons.forEach(function(b){
    b.addEventListener('click', function(){ show(b.getAttribute('data-pane')); });
  });

  function fromHash(){
    var id = location.hash.slice(1);
    if(id) show(id, { scroll:true });
  }
  window.addEventListener('hashchange', fromHash);

  show(panes.length ? panes[0].id : '');
  fromHash();

  return {
    show: show,
    has: function(id){ return panes.some(function(p){ return p.id === id; }); }
  };
})();
} catch (e) { setTimeout(function () { throw e; }); }

/* block 3 */
try {
(function(){
  var box     = document.getElementById('reader');
  if(!box) return;
  var img     = document.getElementById('reader-img');
  var stamp   = document.getElementById('reader-stamp');
  var title   = document.getElementById('reader-title');
  var body    = document.getElementById('reader-body');
  var srcBox  = document.getElementById('reader-sources');
  var full    = document.getElementById('reader-full');
  var lastFocus = null;

  function textOf(card, sel){
    var el = card.querySelector(sel);
    return el ? el.textContent.trim() : '';
  }

  function open(card){
    var photo = card.querySelector('.tc-media .post-photo');
    var src = (photo && photo.getAttribute('src')) || card.getAttribute('data-story') || '';
    var hasPhoto = !!src && !card.classList.contains('no-photo');

    box.classList.toggle('no-photo', !hasPhoto);
    if(hasPhoto){ img.src = src; img.alt = ''; } else { img.removeAttribute('src'); }

    stamp.textContent = textOf(card, '.tc-stamp') || textOf(card, '.tc-stamp-fallback');
    title.textContent = card.getAttribute('data-title') || textOf(card, '.tc-title');

    var summary = card.querySelector('.post-summary');
    body.innerHTML = summary ? summary.innerHTML : '';

    var sources = card.querySelector('.tc-sources');
    if(sources){
      srcBox.hidden = false;
      srcBox.innerHTML = '<b>Where this came from</b>' +
        sources.innerHTML.replace(/^\s*<b>[^<]*<\/b>\s*/i, '');
    } else {
      srcBox.hidden = true;
    }

    var link = card.getAttribute('data-permalink') ||
               (card.querySelector('.tc-title a') && card.querySelector('.tc-title a').getAttribute('href'));
    if(link){ full.hidden = false; full.href = link; } else { full.hidden = true; }

    lastFocus = document.activeElement;
    box.hidden = false;
    document.body.style.overflow = 'hidden';
    document.getElementById('reader-scroll').scrollTop = 0;
    void box.offsetWidth;
    box.classList.add('is-open');
    document.getElementById('reader-close').focus();
  }

  function close(){
    box.classList.remove('is-open');
    document.body.style.overflow = '';
    setTimeout(function(){ if(!box.classList.contains('is-open')) box.hidden = true; }, 220);
    if(lastFocus && lastFocus.focus) lastFocus.focus();
  }

  document.getElementById('reader-close').addEventListener('click', close);
  document.getElementById('reader-dismiss').addEventListener('click', close);
  box.addEventListener('click', function(e){ if(e.target === box) close(); });
  document.addEventListener('keydown', function(e){
    if(e.key === 'Escape' && !box.hidden) close();
  });

  document.addEventListener('click', function(e){
    var card = e.target.closest ? e.target.closest('.today-grid .post-card') : null;
    if(!card) return;
    if(e.target.closest('.post-foot')) return;
    if(e.target.closest('.tc-sources')) return;
    if(e.target.closest('[data-share]')) return;
    e.preventDefault();
    open(card);
  });

  function makeFocusable(){
    document.querySelectorAll('.today-grid .post-card:not([tabindex])').forEach(function(c){
      c.setAttribute('tabindex', '0');
      c.setAttribute('role', 'button');
    });
  }
  makeFocusable();
  setInterval(makeFocusable, 2000);
  document.addEventListener('keydown', function(e){
    if(e.key !== 'Enter' && e.key !== ' ') return;
    var card = document.activeElement && document.activeElement.closest &&
               document.activeElement.closest('.today-grid .post-card');
    if(card && document.activeElement === card){ e.preventDefault(); open(card); }
  });

  function coverTextOnlyCards(){
    document.querySelectorAll('.post-card.no-photo, .post-card:has(.tc-media-blank)').forEach(function(card){
      card.classList.add('no-photo');
      if(card.closest('.pack-side')) return;
      var media = card.querySelector('.tc-media');
      if(!media){
        media = document.createElement('div');
        media.className = 'tc-media';
        card.insertBefore(media, card.firstChild);
      }
      if(media.querySelector('.tc-cover')) return;
      var head = card.getAttribute('data-title') ||
                 (card.querySelector('.tc-title') ? card.querySelector('.tc-title').textContent.trim() : '');
      if(!head) return;
      var kick = card.querySelector('.tc-kicker');
      var source = '';
      if(kick){
        source = (kick.firstChild && kick.firstChild.nodeType === 3 ? kick.firstChild.textContent : kick.textContent) || '';
        source = source.replace(/\s*\d.*$/, '').trim();
      }
      if(!source){
        source = ((card.querySelector('.tc-stamp, .tc-stamp-fallback') || {}).textContent || '').trim();
      }
      var blank = media.querySelector('.tcb-name');
      if(blank) blank.remove();
      var cover = document.createElement('div');
      cover.className = 'tc-cover';
      cover.innerHTML = '<span class="tc-cover-kicker"></span>' +
                        '<span class="tc-cover-text"></span>' +
                        '<span class="tc-cover-mark" aria-hidden="true">' +
                          '<svg viewBox="0 0 120 120"><use href="#ndu-mark"></use></svg></span>';
      cover.querySelector('.tc-cover-kicker').textContent = source || 'Briefing';
      cover.querySelector('.tc-cover-text').textContent = head;
      media.appendChild(cover);
    });
  }
  coverTextOnlyCards();
  setInterval(coverTextOnlyCards, 1500);
})();
} catch (e) { setTimeout(function () { throw e; }); }

/* block 4 */
try {
(function(){
  var box = document.getElementById('rail-districts');
  if(!box) return;

  function paint(){
    var rows = document.querySelectorAll('#toll-districts tbody tr');
    if(!rows.length) return;
    var data = [];
    rows.forEach(function(tr){
      var cells = tr.querySelectorAll('td');
      if(cells.length < 2) return;
      var n = parseInt(String(cells[1].textContent).replace(/[^0-9]/g, ''), 10);
      if(!isFinite(n)) return;
      data.push({ name: cells[0].textContent.trim(), n: n });
    });
    if(!data.length) return;
    data.sort(function(a, b){ return b.n - a.n; });
    var top = data;
    var max = top[0].n || 1;
    box.innerHTML = top.map(function(d){
      var pct = Math.max(4, Math.round(d.n / max * 100));
      return '<div class="rd-row">' +
        '<span class="rd-name">' + d.name.replace(/[<>&]/g, '') + '</span>' +
        '<span class="rd-bar" aria-hidden="true"><i style="width:' + pct + '%"></i></span>' +
        '<span class="rd-n">' + d.n.toLocaleString('en-GB') + '</span>' +
      '</div>';
    }).join('');
  }

  paint();
  setTimeout(paint, 2500);
  setTimeout(paint, 8000);
  window.addEventListener("live-figures", paint);
})();
} catch (e) { setTimeout(function () { throw e; }); }

/* block 5 */
try {
function fetchDeadline(ms){
  return (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function')
    ? AbortSignal.timeout(ms) : undefined;
}
var SITE = {
  analyticsToken: ''
};

(function(){
  if(!SITE.analyticsToken) return;
  var beacon = document.createElement('script');
  beacon.defer = true;
  beacon.src = 'https://static.cloudflareinsights.com/beacon.min.js';
  beacon.setAttribute('data-cf-beacon', JSON.stringify({ token: SITE.analyticsToken }));
  document.head.appendChild(beacon);
})();

(function(){
  var root = document.documentElement;
  var media = window.matchMedia('(prefers-color-scheme: dark)');
  var buttons = Array.prototype.slice.call(document.querySelectorAll('[data-theme-choice]'));
  var choice = 'system';

  try { choice = localStorage.getItem('theme-choice') || 'system'; } catch(e){}

  function apply(){
    var dark = choice === 'dark' || (choice === 'system' && media.matches);
    if(dark){ root.setAttribute('data-theme','dark'); }
    else { root.removeAttribute('data-theme'); }
    var bars = document.querySelectorAll('meta[name="theme-color"]');
    for(var i = 0; i < bars.length; i++){
      bars[i].setAttribute('content', dark ? '#0d0d0d' : '#f9f9f7');
    }
    buttons.forEach(function(b){
      b.setAttribute('aria-pressed', String(b.getAttribute('data-theme-choice') === choice));
    });
    if(themeBtn){
      themeBtn.setAttribute('aria-pressed', String(dark));
      themeBtn.setAttribute('aria-label', dark ? 'Switch to the light theme' : 'Switch to the dark theme');
      root.classList.toggle('is-dark', dark);
    }
  }

  var themeBtn = document.getElementById('theme-btn');
  if(themeBtn) themeBtn.addEventListener('click', function(){
    var darkNow = root.getAttribute('data-theme') === 'dark';
    choice = darkNow ? 'light' : 'dark';
    try { localStorage.setItem('theme-choice', choice); } catch(e){}
    apply();
  });

  buttons.forEach(function(b){
    b.addEventListener('click', function(){
      choice = b.getAttribute('data-theme-choice');
      try { localStorage.setItem('theme-choice', choice); } catch(e){}
      apply();
    });
  });
  if(media.addEventListener) media.addEventListener('change', function(){ if(choice === 'system') apply(); });
  apply();
})();

(function(){
  var DICT = {
    ne: {
      'sec.what-happened.eyebrow': '०२. समयरेखा', 'sec.what-happened.h2': 'के भयो',
      'sec.what-happened.lede': 'प्रहरी, स्थानीय अधिकारी र समाचार प्रतिवेदनबाट तयार पारिएको। समय अनुमानित हो।',
      'tab.overview': 'नेपाल बाढी',
      'tab.today': 'आज',
      'sec.today.eyebrow': 'आज',
      'sec.today.h2': 'आजको कथा',
      'sec.today.lede': 'दिनका हरेक घटना छोटकरीमा, जाँचिएको। दिनभर नयाँ कथा थपिन्छन्। पुरा पढ्न कार्डमा ट्याप गर्नुहोस्।',
      'sec.today.home': 'दिनका हरेक घटना छोटकरीमा, जाँचिएको। पुरा पढ्न कार्डमा ट्याप गर्नुहोस्।',
      'tab.feed': 'फिड',
      'tab.map': 'नक्सा',
      'tab.investigation': 'अनुसन्धान',
      'tab.live': 'प्रत्यक्ष',
      'tab.media': 'तस्बिर',
      'tab.video': 'हेर्नुहोस्',
      'tab.hazards': 'प्राकृतिक प्रकोप',
      'tab.emergency': 'आपतकालीन',
      'tab.help': 'मद्दत',
      'tab.sources': 'स्रोत',
      'brand.name': 'नेपाल विपद् अद्यावधिक',
      'brand.tag': 'रसुवा बाढी, प्रत्यक्ष',
      'brand.liveTag': 'प्रत्यक्ष कभरेज',
      'search.trigger': 'यो ब्रिफिङमा खोज्नुहोस्',
      'settings.language': 'भाषा',
      'settings.appearance': 'देखावट',
      'settings.alerts': 'सूचना',
      'settings.showMajorUpdate': 'मुख्य समाचार देखाउनुहोस्',
      'settings.popupOnArrival': 'आउँदा पअप देखाउने',
      'hero.eyebrow': 'रसुवा, नेपाल · अचानक बाढी',
      'hero.h1': 'रसुवा बाढी, प्रत्यक्ष',
      'hero.lede': '२०२६ अगस्ट २६ मा तिब्बततर्फबाट भोटेकोशी हुँदै रसुवामा अचानक बाढी आयो। के पुष्टि भयो, के अझै थाहा छैन, र कसलाई फोन गर्ने — यहाँ छ।',
      'hero.updated': 'अपडेट: २६ अगस्ट २०२६, साँझ (नेपाली समय)',
      'hero.reporting': 'स्वतन्त्र स्वयंसेवी ब्रिफिङ, सार्वजनिक स्रोतबाट निर्मित',
      'hero.cta.live': 'पछिल्ला अपडेट',
      'hero.cta.map': 'नक्सा हेर्नुहोस्',
      'hero.cta.call': '१०० मा फोन गर्नुहोस्',
      'status.label': 'मुख्य समाचार',
      'status.text': 'रसुवा, नेपालमा सक्रिय आपतकाल',
      'glance.label': 'एक नजरमा',
      'glance.dead': 'पुष्टि भएको मृत्यु',
      'glance.missing': 'नेपालमा बेपत्ता सूचीमा',
      'glance.power': 'जलविद्युत् आयोजना क्षतिग्रस्त',
      'glance.pop': 'यस जिल्लामा बस्ने जनसंख्या',
      'glance.day': 'बाढी आएको दिनदेखि',
      'glance.econLoss': 'क्षति, प्रारम्भिक अनुमान',
      'glance.relief': 'राहत रकम जारी',
      'sec.what-happened.eyebrow': '०१. समयरेखा',
      'sec.what-happened.h2': 'के भयो',
      'sec.cause.eyebrow': '०२. कारण',
      'sec.cause.h2': 'के कारणले भयो होला',
      'sec.numbers.eyebrow': '०३. तथ्याङ्कमा',
      'sec.numbers.h2': 'पुष्टि भएको मृत्यु, देशअनुसार',
      'sec.damage.h2': 'क्षति र उद्धार, आधिकारिक तथ्याङ्क',
      'sec.faq.eyebrow': '०४. प्रश्नहरू',
      'sec.faq.h2': 'नेपाल बाढीका बारेमा सामान्य प्रश्न',
      'sec.feed.eyebrow': 'प्रत्यक्ष',
      'sec.feed.h2': 'पछिल्ला अपडेट',
      'sec.map.eyebrow': 'नक्सा',
      'sec.map.h2': 'पानीको बाटो, चरणै चरण',
      'sec.live.eyebrow': 'आधिकारिक',
      'sec.live.h2': 'आधिकारिक अभिलेख र बुलेटिन',
      'sec.media.eyebrow': 'घटनास्थलबाट',
      'sec.media.h2': 'तस्बिर',
      'sec.hazards.eyebrow': 'जान्नुहोस्',
      'sec.hazards.h2': 'नेपालका प्राकृतिक प्रकोपहरू, सजिलो भाषामा',
      'sec.emergency.eyebrow': 'आपतकालीन',
      'sec.emergency.h2': 'नेपालमा सम्पर्क गर्ने नम्बरहरू',
      'sec.help.eyebrow': 'दिनुहोस्',
      'sec.help.h2': 'साँच्चै कसरी मद्दत गर्ने',
      'sec.sources.eyebrow': 'स्रोत',
      'sec.sources.h2': 'यहाँका सबै तथ्य कहाँबाट आएका हुन्',
      'btn.openLive': 'प्रत्यक्ष अपडेट हेर्नुहोस्',
      'btn.seeMap': 'नक्सा हेर्नुहोस्',
      'btn.close': 'बन्द गर्नुहोस्',
      'btn.refresh': 'ताजा गर्नुहोस्',

      'sec.what-happened.lede': 'प्रहरी, स्थानीय अधिकारी र समाचार प्रतिवेदनका आधारमा तयार पारिएको। समय अनुमानित हो।',
      'tl.time1': '०८:३७ ने.स.',
      'tl.text1': 'सीमा नजिकै भूकम्पीय संकेत रेकर्ड भयो। अमेरिकी भूगर्भ सर्वेक्षण (USGS) ले सुरुमा यसलाई ४.४ म्याग्निच्युडको भूकम्प भन्यो, पछि संशोधन गर्‍यो: त्यो ५.२ म्याग्निच्युडको हिउँ खस्ने घटना थियो, भूकम्प होइन।',
      'tl.time2': '~०९:०० ने.स.',
      'tl.text2': 'सीमामा भोटेकोशी नदी अचानक बढ्यो। नजिकै पानी परेको थिएन, त्यसैले सामान्य वर्षा कारण थिएन।',
      'tl.time3': 'बिहान',
      'tl.text3': 'सीमा नजिकका तिमुरे र स्याफ्रुबेसी सबैभन्दा बढी प्रभावित भए। ९ वटा बैंक शाखा बगेर गए। स्थानीय हेलिप्याड नष्ट भयो, जसले हवाई उद्धारमा ढिलाइ गर्‍यो।',
      'tl.time4': 'सोही दिन',
      'tl.text4': 'बाढी तल्लो तटका बस्तीसम्म पुग्यो: बेत्रावती र त्रिशूली बजार, गल्छी र ढुंगे बजार, अनि मुग्लिन हुँदै नारायणीमा। १४ वटा जलविद्युत् आयोजना क्षतिग्रस्त भए।',
      'tl.time5': 'जारी',
      'tl.text5': 'नेपाली सेना, प्रहरी र सशस्त्र प्रहरी हेलिकप्टरबाट बाँचेकाहरूको खोजी गरिरहेका छन्। चीनले पनि आफ्नोतर्फ मृत्यु पुष्टि गरेको छ।',

      'dr.dead.label': 'शव फेला परेको',
      'dr.unreach.label': 'सम्पर्कविहीन',
      'dr.injured.label': 'घाइते, उपचाररत',
      'dr.bridges.label': 'सडक ध्वस्त',
      'dr.rescue.label': 'उद्धार: हवाईबाट · स्थलमार्गबाट',

      'cause.rank1': 'प्रमुख व्याख्या',
      'cause.h1': 'हिउँ र ढुंगा खोलामा खसेर बाँध बन्यो',
      'cause.p1': 'नेपालको जलविज्ञान तथा मौसम विज्ञान विभाग र स्वतन्त्र हिमनदी विज्ञहरूले ICIMOD मार्फत प्राप्त उपग्रह तस्बिर हेरेर भनेका छन्: हिउँ र ढुंगाको पहिरोले मितेरी पुलभन्दा करिब २० किलोमिटर माथि ल्हेन्दे खोला थुन्यो। पछाडि अस्थायी ताल बन्यो र फुट्यो। उनीहरू यसलाई प्रारम्भिक अनुमान भन्छन्।',
      'cause.rank2': 'अर्को सम्भावना',
      'cause.h2': 'हिमताल फुट्यो',
      'cause.p2': 'बरफले थुनिएको हिमताल आफैं फुटेको हुनसक्छ। यस्तो पानी नपरी पनि हुन सक्छ, जुन यहाँ भएको कुरासँग मेल खान्छ।',
      'cause.rank3': 'अस्वीकृत',
      'cause.h3': 'यो भूकम्प थिएन',
      'cause.p3': 'अमेरिकी भूगर्भ सर्वेक्षण (USGS) ले पहिले बिहान ८:३७ मा ४.४ म्याग्निच्युडको भूकम्प रेकर्ड गरेको थियो। पछि संशोधन गर्‍यो: त्यो ५.२ म्याग्निच्युडको हिउँ खस्ने घटना थियो, भूकम्प होइन। त्यो हल्लो नै पहिरोको रेकर्ड थियो, छुट्टै कारण होइन।',
      'cause.rank4': 'यहाँ किन सम्भव छ',
      'cause.h4': 'नजिकै हजारौं लुकेका हिम-चट्टान',
      'cause.p4': 'वैज्ञानिकहरूले हालै तिब्बती पठारमा १ लाख ३० हजारभन्दा बढी ढुङ्गा-बरफका संरचनाहरू फेला पारेका छन्, पहिले थाहा भएभन्दा धेरै। यिनले थोरै संकेतमै पानी थुन्न वा छोड्न सक्छन्।',
      'cause.lede.strong': 'कुनै सरकारले अझै कारण पुष्टि गरेको छैन।',
      'cause.lede.rest': 'हालसम्मको विशेषज्ञ समीक्षाका आधारमा सबैभन्दा सम्भावितदेखि कमसम्म क्रमबद्ध गरिएको। अधिकारीले थप जानेपछि यो सच्याइनेछ।',

      'faq.lede': 'मानिसहरूले सबैभन्दा बढी खोजिरहेका कुराहरू, छोटकरीमा जवाफ।',
      'faq.q1': 'रसुवा, नेपालमा के भयो?',
      'faq.a1': '२०२६ अगस्ट २६ को बिहान तिब्बततर्फको सीमानाबाट भोटेकोशी नदी हुँदै अचानक बाढी रसुवा जिल्लामा आयो। तिमुरे, स्याफ्रुबेसी, रसुवागढी नाका र उत्तरी रसुवाका करिब एक दर्जन नदी किनारका बस्ती सबैभन्दा बढी प्रभावित भए। पानी त्रिशूली हुँदै नारायणीसम्म पुग्यो। नेपाल विद्युत् प्राधिकरणका अनुसार करिब ७४८ मेगावाटका १४ जलविद्युत् आयोजना क्षतिग्रस्त भए।',
      'faq.q2': '२०२६ अगस्टको नेपाल बाढीको कारण के हो?',
      'faq.a2': 'कुनै पनि सरकारले कारण पुष्टि गरेको छैन। प्रमुख व्याख्या यो हो: हिउँ र ढुंगाको पहिरोले तिब्बतभित्र मितेरी पुलभन्दा करिब २० किलोमिटर माथि ल्हेन्दे खोला थुन्यो, अस्थायी ताल बन्यो र फुट्यो। यो नेपालको जलविज्ञान तथा मौसम विज्ञान विभाग र स्वतन्त्र हिमनदी विज्ञहरूको प्रारम्भिक अनुमान हो। केही मिनेट अघिको हल्लोलाई USGS ले अहिले ५.२ म्याग्निच्युडको हिउँ खस्ने घटना भनेको छ, भूकम्प होइन। रसुवामा भारी वर्षा भएको थिएन।',
      'faq.q3': 'नेपालका कुन जिल्लाहरू प्रभावित भए?',
      'faq.a3': 'रसुवा सबैभन्दा बढी प्रभावित भयो, विशेष गरी तिमुरे, स्याफ्रुबेसी र रसुवागढी नाका। त्यसपछि पानी नुवाकोटको बेत्रावती र त्रिशूली बजार, धादिङको गल्छी र ढुंगे बजार हुँदै मुग्लिन पार गरेर नारायणीमा पुग्यो। चितवन, नवलपरासी पूर्व र पश्चिम, गोरखा र तनहुँमा पनि शव फेला परेका छन्। चीनतर्फ ग्याइरोङ नजिक ३ जनाको मृत्यु पुष्टि भएको छ।',
      'faq.q4': 'काठमाडौं प्रभावित भएको छ?',
      'faq.a4': 'काठमाडौं आफैं डुबेको छैन। क्षति राजधानीको उत्तर-पश्चिममा रहेको रसुवा र नुवाकोट जिल्लाका भोटेकोशी र त्रिशूली नदी उपत्यकामा भएको हो। रसुवागढी हुँदै चीनको सीमासम्मको सडक सम्पर्क नराम्रोसँग बाधित भएको छ।',
      'faq.q5': 'नेपालका आपतकालीन नम्बरहरू के के हुन्?',
      'faq.a5a': 'नेपाल प्रहरी १००, एम्बुलेन्स १०२, दमकल १०१, ट्राफिक प्रहरी १०३, र जुनसुकै मोबाइलबाट ११२। राष्ट्रिय आपतकालीन कार्य सञ्चालन केन्द्रको विपद् हटलाइन ११४९, नेपाल प्रहरीको निःशुल्क हेल्पलाइन ११५५, र पर्यटक प्रहरी ११४४ हो। यी सबै ',
      'faq.a5b': ' ट्याबमा एक ट्यापमै डायल हुन्छन्।',
      'faq.q6': 'नेपाल बाढी राहतमा कसरी दान गर्ने?',
      'faq.a6a': 'नेपाल सरकारको आफ्नै च्यानल भनेको प्रधानमन्त्री तथा मन्त्रिपरिषद्को कार्यालयले सञ्चालन गर्ने प्रधानमन्त्री प्राकृतिक प्रकोप राहत कोष हो। बैंक खाता विवरण र आधिकारिक QR कोड ',
      'faq.a6b': ' ट्याबमा छ। कुनै पनि विपद्पछि घण्टाभित्रै देखा पर्ने झुटा आह्वानहरूबाट सावधान रहनुहोस्।',
      'faq.q7': 'अहिले लाङटाङ वा स्याफ्रुबेसी यात्रा गर्न सुरक्षित छ?',
      'faq.a7': 'स्याफ्रुबेसी लाङटाङ पदयात्राको मुख्य प्रवेशद्वार हो र सिधै प्रभावित भएको छ, हेलिप्याड समेत गुमेको छ। नदी उपत्यकाका सडकहरू क्षतिग्रस्त भएका छन्। यात्रा गर्नुअघि नेपाल प्रहरी, पर्यटक प्रहरी ११४४, र आफ्नो ट्रेकिङ अपरेटरसँग सम्पर्क गर्नुहोस्।',

      'em.lede.a': 'तल कुनै पनि नम्बर थिचेर डायल गर्नुहोस्। यी राष्ट्रिय नम्बर हुन् र नेपालको जुनसुकै फोनबाट काम गर्छन्। मोबाइलबाट ',
      'em.lede.b': ' ले पनि आपतकालीन सेवामा सम्पर्क गराउँछ।',
      'em.banner.strong': 'कोही अहिले नै तत्काल खतरामा छ भने, १०० (प्रहरी) वा मोबाइलबाट ११२ मा फोन गर्नुहोस्।',
      'em.banner.rest': 'यो पृष्ठको अरू केही लोड हुने पर्खनुहोस् नै।',
      'em.c1.who': 'नेपाल प्रहरी', 'em.c1.note': 'सामान्य आपतकाल, उद्धार, बेपत्ता व्यक्ति',
      'em.c2.who': 'आपतकाल, मोबाइलबाट', 'em.c2.note': 'सही नम्बर सम्झन नसक्दा पनि काम गर्छ',
      'em.c3.who': 'एम्बुलेन्स', 'em.c3.note': 'स्वास्थ्य आपतकाल र ओसारपसार',
      'em.c4.who': 'दमकल', 'em.c4.note': 'आगलागी र उद्धार',
      'em.c5.who': 'ट्राफिक प्रहरी', 'em.c5.note': 'सडक अवरोध, राजमार्ग दुर्घटना',
      'em.c6.who': 'आपतकालीन कार्य सञ्चालन केन्द्र', 'em.c6.note': 'राष्ट्रिय विपद् हटलाइन, NEOC',
      'em.c7.who': 'नेपाल प्रहरी हेल्पलाइन', 'em.c7.note': 'निःशुल्क सार्वजनिक हेल्पलाइन',
      'em.c8.who': 'पर्यटक प्रहरी', 'em.c8.note': 'पर्यटक र ट्रेकरहरूका लागि मद्दत'
    },
    hi: {
      'sec.what-happened.eyebrow': '02. समयरेखा', 'sec.what-happened.h2': 'क्या हुआ',
      'sec.what-happened.lede': 'पुलिस, स्थानीय अधिकारियों और समाचार रिपोर्टों से संकलित। समय अनुमानित है।',
      'tab.overview': 'नेपाल बाढ़',
      'tab.today': 'आज',
      'sec.today.eyebrow': 'आज',
      'sec.today.h2': 'आज की खबर',
      'sec.today.lede': 'दिन की हर खबर, छोटी और जाँची हुई। दिन भर नई खबरें जुड़ती रहती हैं। पूरा पढ़ने के लिए कार्ड पर टैप करें।',
      'sec.today.home': 'दिन की हर खबर, छोटी और जाँची हुई। पूरा पढ़ने के लिए कार्ड पर टैप करें।',
      'tab.feed': 'फ़ीड',
      'tab.map': 'नक्शा',
      'tab.investigation': 'जाँच',
      'tab.live': 'लाइव',
      'tab.media': 'तस्वीरें',
      'tab.video': 'देखें',
      'tab.hazards': 'आपदाएँ',
      'tab.emergency': 'आपातकाल',
      'tab.help': 'मदद',
      'tab.sources': 'स्रोत',
      'brand.name': 'नेपाल आपदा अपडेट',
      'brand.tag': 'रसुवा बाढ़, लाइव',
      'brand.liveTag': 'लाइव कवरेज',
      'search.trigger': 'इस पेज में खोजें',
      'settings.language': 'भाषा',
      'settings.appearance': 'रंग-रूप',
      'settings.alerts': 'सूचनाएँ',
      'settings.showMajorUpdate': 'बड़ी खबर दिखाएँ',
      'settings.popupOnArrival': 'आते ही पॉपअप दिखाएँ',
      'hero.eyebrow': 'रसुवा, नेपाल · अचानक आई बाढ़',
      'hero.h1': 'रसुवा बाढ़, लाइव',
      'hero.lede': '26 अगस्त 2026 को तिब्बत की ओर से भोटेकोशी नदी में अचानक बाढ़ आई और रसुवा तक पहुँची। क्या पक्का है, क्या अब तक पता नहीं, और किसे फ़ोन करना है — सब यहाँ।',
      'hero.updated': 'अपडेट: 26 अगस्त 2026, शाम (नेपाल समय)',
      'hero.reporting': 'स्वतंत्र स्वयंसेवी ब्रीफ़िंग, सार्वजनिक स्रोतों से बनी',
      'hero.cta.live': 'ताज़ा अपडेट',
      'hero.cta.map': 'नक्शा देखें',
      'hero.cta.call': '100 पर फ़ोन करें',
      'status.label': 'बड़ी खबर',
      'status.text': 'रसुवा, नेपाल में चालू आपातकाल',
      'glance.label': 'एक नज़र में',
      'glance.dead': 'पुष्ट मौतें',
      'glance.missing': 'नेपाल में लापता सूची में',
      'glance.power': 'जलविद्युत परियोजनाएँ क्षतिग्रस्त',
      'glance.pop': 'प्रभावित ज़िले की आबादी',
      'glance.day': 'बाढ़ को हुए दिन',
      'glance.econLoss': 'नुकसान, शुरुआती अनुमान',
      'glance.relief': 'जारी की गई राहत राशि',
      'sec.what-happened.eyebrow': '01. समयक्रम',
      'sec.what-happened.h2': 'क्या हुआ था',
      'sec.cause.eyebrow': '02. कारण',
      'sec.cause.h2': 'इसकी वजह क्या रही होगी',
      'sec.numbers.eyebrow': '03. आँकड़ों में',
      'sec.numbers.h2': 'पुष्ट मौतें, देश के अनुसार',
      'sec.damage.h2': 'नुकसान और बचाव, आधिकारिक आँकड़े',
      'sec.faq.eyebrow': '04. सवाल',
      'sec.faq.h2': 'नेपाल बाढ़ पर आम सवाल',
      'sec.feed.eyebrow': 'लाइव',
      'sec.feed.h2': 'ताज़ा अपडेट',
      'sec.map.eyebrow': 'नक्शा',
      'sec.map.h2': 'पानी का रास्ता, कदम दर कदम',
      'sec.live.eyebrow': 'आधिकारिक',
      'sec.live.h2': 'आधिकारिक रिकॉर्ड और बुलेटिन',
      'sec.media.eyebrow': 'मौके से',
      'sec.media.h2': 'तस्वीरें',
      'sec.hazards.eyebrow': 'जानें',
      'sec.hazards.h2': 'नेपाल की प्राकृतिक आपदाएँ, आसान भाषा में',
      'sec.emergency.eyebrow': 'आपातकाल',
      'sec.emergency.h2': 'नेपाल में किसे फ़ोन करें',
      'sec.help.eyebrow': 'दें',
      'sec.help.h2': 'असल में मदद कैसे करें',
      'sec.sources.eyebrow': 'स्रोत',
      'sec.sources.h2': 'यहाँ का हर तथ्य कहाँ से आया है',
      'btn.openLive': 'लाइव अपडेट खोलें',
      'btn.seeMap': 'नक्शा देखें',
      'btn.close': 'बंद करें',
      'btn.refresh': 'ताज़ा करें',

      'sec.what-happened.lede': 'पुलिस, स्थानीय अधिकारियों और समाचार रिपोर्टों से जोड़कर बनाया गया। समय अनुमानित है।',
      'tl.time1': '08:37 नेपाल समय',
      'tl.text1': 'सीमा के पास भूकंपीय संकेत दर्ज हुआ। अमेरिकी भूवैज्ञानिक सर्वेक्षण (USGS) ने पहले इसे 4.4 तीव्रता का भूकंप बताया, फिर संशोधित किया: वह 5.2 तीव्रता का हिमस्खलन था, भूकंप नहीं।',
      'tl.time2': '~09:00 नेपाल समय',
      'tl.text2': 'सीमा पर भोटेकोशी नदी अचानक चढ़ गई। आसपास बारिश नहीं हो रही थी, इसलिए सामान्य बारिश वजह नहीं थी।',
      'tl.time3': 'सुबह',
      'tl.text3': 'सीमा के दो कस्बे तिमुरे और स्याफ्रुबेसी सबसे ज़्यादा प्रभावित हुए। नौ बैंक शाखाएँ बह गईं। स्थानीय हेलीपैड नष्ट हो गया, जिससे हवाई बचाव में देरी हुई।',
      'tl.time4': 'उसी दिन',
      'tl.text4': 'बाढ़ नीचे की बस्तियों तक पहुँची: बेत्रावती और त्रिशूली बाज़ार, गल्छी और ढुंगे बाज़ार, फिर मुग्लिन होते हुए नारायणी में। 14 जलविद्युत परियोजनाएँ क्षतिग्रस्त हुईं।',
      'tl.time5': 'जारी',
      'tl.text5': 'नेपाली सेना, पुलिस और सशस्त्र पुलिस हेलीकॉप्टर से बचे लोगों की तलाश कर रहे हैं। चीन ने भी अपनी ओर मौतों की पुष्टि की है।',

      'dr.dead.label': 'शव मिले',
      'dr.unreach.label': 'संपर्क टूटा',
      'dr.injured.label': 'घायल, इलाज में',
      'dr.bridges.label': 'सड़क नष्ट',
      'dr.rescue.label': 'बचाव: हवाई · ज़मीनी',

      'cause.rank1': 'मुख्य व्याख्या',
      'cause.h1': 'बर्फ़ और चट्टान नदी में गिरकर बाँध बन गया',
      'cause.p1': 'नेपाल के जल विज्ञान एवं मौसम विज्ञान विभाग और स्वतंत्र हिमनद वैज्ञानिकों ने ICIMOD के ज़रिये मिली उपग्रह तस्वीरों से कहा है: बर्फ़ और चट्टान के भूस्खलन ने मितेरी पुल से लगभग 20 किमी ऊपर ल्हेन्दे खोला को रोक दिया। पीछे अस्थायी झील बनी और फिर फूट गई। वे इसे प्रारंभिक अनुमान बताते हैं।',
      'cause.rank2': 'दूसरी संभावना',
      'cause.h2': 'हिमनद झील फटी',
      'cause.p2': 'बर्फ़ से रुकी एक हिमनद झील अपने आप फट सकती है। ऐसा बिना बारिश के भी होता है, जो यहाँ की स्थिति से मेल खाता है।',
      'cause.rank3': 'खारिज',
      'cause.h3': 'यह भूकंप नहीं था',
      'cause.p3': 'USGS ने पहले सुबह 8:37 पर 4.4 तीव्रता का भूकंप दर्ज किया था। बाद में उसने संशोधन किया: वह संकेत 5.2 तीव्रता का हिमस्खलन था, विवर्तनिक भूकंप नहीं। वह कंपन भूस्खलन का ही रिकॉर्ड था, कोई अलग कारण नहीं।',
      'cause.rank4': 'यहाँ यह क्यों मुमकिन है',
      'cause.h4': 'पास में हज़ारों छिपे बर्फ़-चट्टान ढेर',
      'cause.p4': 'वैज्ञानिकों ने हाल ही में तिब्बती पठार पर 1,30,000 से ज़्यादा चट्टान-बर्फ़ संरचनाएँ पाई हैं, जितनी पहले पता थीं उससे कहीं ज़्यादा। ये थोड़े से संकेत पर पानी रोक भी सकती हैं और छोड़ भी सकती हैं।',
      'cause.lede.strong': 'किसी सरकार ने अब तक कारण की पुष्टि नहीं की है।',
      'cause.lede.rest': 'अब तक की विशेषज्ञ समीक्षा के आधार पर सबसे संभावित से कम संभावित तक क्रम में। अधिकारियों को और पता चलने पर इसे सुधारा जाएगा।',

      'faq.lede': 'लोग जो सबसे ज़्यादा खोज रहे हैं, संक्षेप में जवाब।',
      'faq.q1': 'रसुवा, नेपाल में क्या हुआ?',
      'faq.a1': '26 अगस्त 2026 की सुबह तिब्बत की ओर से भोटेकोशी नदी में अचानक बाढ़ आई और रसुवा ज़िले में घुसी। तिमुरे, स्याफ्रुबेसी, रसुवागढी सीमा चौकी और उत्तरी रसुवा की करीब एक दर्जन नदी किनारे की बस्तियाँ सबसे ज़्यादा प्रभावित हुईं। पानी त्रिशूली होते हुए नारायणी तक पहुँचा। नेपाल विद्युत प्राधिकरण के अनुसार लगभग 748 मेगावाट की 14 जलविद्युत परियोजनाएँ क्षतिग्रस्त हुईं।',
      'faq.q2': 'अगस्त 2026 की नेपाल बाढ़ का कारण क्या है?',
      'faq.a2': 'किसी सरकार ने कारण की पुष्टि नहीं की है। मुख्य व्याख्या यह है: बर्फ़ और चट्टान के भूस्खलन ने तिब्बत के भीतर मितेरी पुल से करीब 20 किमी ऊपर ल्हेन्दे खोला को रोका, अस्थायी झील बनी और फूट गई। यह नेपाल के जल विज्ञान एवं मौसम विज्ञान विभाग और स्वतंत्र हिमनद वैज्ञानिकों का प्रारंभिक अनुमान है। कुछ मिनट पहले के कंपन को USGS अब 5.2 तीव्रता का हिमस्खलन बताता है, भूकंप नहीं। रसुवा में भारी वर्षा नहीं हुई थी।',
      'faq.q3': 'नेपाल के कौन से ज़िले प्रभावित हुए?',
      'faq.a3': 'रसुवा सबसे ज़्यादा प्रभावित हुआ, ख़ासकर तिमुरे, स्याफ्रुबेसी और रसुवागढी सीमा चौकी। फिर पानी नुवाकोट के बेत्रावती और त्रिशूली बाज़ार, धादिङ के गल्छी और ढुंगे बाज़ार होते हुए मुग्लिन पार कर नारायणी में पहुँचा। चितवन, नवलपरासी पूर्व और पश्चिम, गोरखा और तनहुँ में भी शव मिले हैं। चीन की ओर ग्याइरोङ के पास 3 मौतों की पुष्टि हुई है।',
      'faq.q4': 'क्या काठमांडू प्रभावित है?',
      'faq.a4': 'काठमांडू खुद नहीं डूबा। नुकसान राजधानी के उत्तर-पश्चिम में रसुवा और नुवाकोट ज़िलों की भोटेकोशी और त्रिशूली नदी घाटियों में हुआ है। रसुवागढ़ी होकर चीन की सीमा तक सड़क संपर्क बुरी तरह टूटा है।',
      'faq.q5': 'नेपाल के आपातकालीन नंबर क्या हैं?',
      'faq.a5a': 'नेपाल पुलिस 100, एम्बुलेंस 102, दमकल 101, ट्रैफ़िक पुलिस 103, और किसी भी मोबाइल से 112। राष्ट्रीय आपातकालीन संचालन केंद्र की आपदा हॉटलाइन 1149 है, नेपाल पुलिस की निःशुल्क हेल्पलाइन 1155, और पर्यटक पुलिस 1144। ये सभी ',
      'faq.a5b': ' टैब पर एक टैप में डायल हो जाते हैं।',
      'faq.q6': 'नेपाल बाढ़ राहत में दान कैसे करें?',
      'faq.a6a': 'नेपाल सरकार का अपना माध्यम प्रधानमंत्री प्राकृतिक आपदा राहत कोष है, जिसे प्रधानमंत्री कार्यालय चलाता है। बैंक खाते का विवरण और आधिकारिक QR कोड ',
      'faq.a6b': ' टैब पर है। किसी भी आपदा के कुछ ही घंटों में आने वाली नकली अपीलों से सावधान रहें।',
      'faq.q7': 'क्या अभी लांगटांग या स्याफ्रुबेसी जाना सुरक्षित है?',
      'faq.a7': 'स्याफ्रुबेसी लांगटांग ट्रेक का मुख्य द्वार है और सीधे प्रभावित हुआ है, इसका हेलीपैड भी चला गया। नदी घाटी की सड़कें क्षतिग्रस्त हैं। जाने से पहले नेपाल पुलिस, पर्यटक पुलिस 1144, और अपने ट्रेकिंग ऑपरेटर से बात करें।',

      'em.lede.a': 'नीचे किसी भी नंबर पर टैप करके फ़ोन करें। ये राष्ट्रीय नंबर हैं और नेपाल के किसी भी फ़ोन से काम करते हैं। मोबाइल से ',
      'em.lede.b': ' भी आपातकालीन सेवाओं तक पहुँचाता है।',
      'em.banner.strong': 'अगर कोई अभी सीधे खतरे में है, तो 100 (पुलिस) या मोबाइल से 112 पर फ़ोन करें।',
      'em.banner.rest': 'इस पेज के बाकी हिस्से के लोड होने का इंतज़ार न करें।',
      'em.c1.who': 'नेपाल पुलिस', 'em.c1.note': 'सामान्य आपातकाल, बचाव, लापता लोग',
      'em.c2.who': 'आपातकाल, मोबाइल से', 'em.c2.note': 'जब सही नंबर याद न आए तब भी काम करता है',
      'em.c3.who': 'एम्बुलेंस', 'em.c3.note': 'चिकित्सा आपातकाल और परिवहन',
      'em.c4.who': 'दमकल', 'em.c4.note': 'आग और बचाव',
      'em.c5.who': 'ट्रैफ़िक पुलिस', 'em.c5.note': 'सड़क अवरोध, राजमार्ग दुर्घटनाएँ',
      'em.c6.who': 'आपातकालीन संचालन केंद्र', 'em.c6.note': 'राष्ट्रीय आपदा हॉटलाइन, NEOC',
      'em.c7.who': 'नेपाल पुलिस हेल्पलाइन', 'em.c7.note': 'निःशुल्क सार्वजनिक हेल्पलाइन',
      'em.c8.who': 'पर्यटक पुलिस', 'em.c8.note': 'यात्रियों और ट्रेकरों के लिए मदद'
    },
    zh: {
      'sec.what-happened.eyebrow': '02. 时间线', 'sec.what-happened.h2': '发生了什么',
      'sec.what-happened.lede': '根据警方、地方官员和新闻报道整理。时间为大致时间。',
      'tab.overview': '尼泊尔洪水',
      'tab.today': '今日',
      'sec.today.eyebrow': '今日',
      'sec.today.h2': '今日要闻',
      'sec.today.lede': '当天每条消息，简短且经过核实。新消息全天陆续更新。点击卡片阅读全文。',
      'sec.today.home': '当天每条消息，简短且经过核实。点击卡片阅读全文。',
      'tab.feed': '动态',
      'tab.map': '地图',
      'tab.investigation': '调查',
      'tab.live': '直播',
      'tab.media': '图片',
      'tab.video': '视频',
      'tab.hazards': '灾害知识',
      'tab.emergency': '急救电话',
      'tab.help': '援助',
      'tab.sources': '来源',
      'brand.name': '尼泊尔灾情快报',
      'brand.tag': '拉苏瓦洪水，直播',
      'brand.liveTag': '实时报道',
      'search.trigger': '搜索本页内容',
      'settings.language': '语言',
      'settings.appearance': '外观',
      'settings.alerts': '提醒',
      'settings.showMajorUpdate': '显示重大新闻',
      'settings.popupOnArrival': '进入时弹出提示',
      'hero.eyebrow': '尼泊尔拉苏瓦 · 山洪暴发',
      'hero.h1': '拉苏瓦洪水，实时',
      'hero.lede': '2026年8月26日，山洪自西藏一侧沿波特科西河冲入尼泊尔拉苏瓦县。已确认的情况、尚不清楚的部分，以及该打哪些电话，都在这里。',
      'hero.updated': '更新：2026年8月26日傍晚（尼泊尔时间）',
      'hero.reporting': '独立志愿简报，全部取自公开来源',
      'hero.cta.live': '最新动态',
      'hero.cta.map': '查看地图',
      'hero.cta.call': '拨打 100',
      'status.label': '重大新闻',
      'status.text': '尼泊尔拉苏瓦，紧急状态持续中',
      'glance.label': '一览',
      'glance.dead': '确认死亡',
      'glance.missing': '在尼泊尔失联名单上',
      'glance.power': '水电项目受损',
      'glance.pop': '受灾县人口',
      'glance.day': '洪水发生至今',
      'glance.econLoss': '损失，初步估计',
      'glance.relief': '已拨救灾款',
      'sec.what-happened.eyebrow': '01. 时间线',
      'sec.what-happened.h2': '发生了什么',
      'sec.cause.eyebrow': '02. 成因',
      'sec.cause.h2': '可能的成因',
      'sec.numbers.eyebrow': '03. 数字',
      'sec.numbers.h2': '确认死亡人数，按国家',
      'sec.damage.h2': '损失与救援，官方数字',
      'sec.faq.eyebrow': '04. 问答',
      'sec.faq.h2': '关于尼泊尔洪水的常见问题',
      'sec.feed.eyebrow': '实时',
      'sec.feed.h2': '最新动态',
      'sec.map.eyebrow': '地图',
      'sec.map.h2': '追踪水流，逐段查看',
      'sec.live.eyebrow': '官方',
      'sec.live.h2': '官方记录与通报',
      'sec.media.eyebrow': '现场',
      'sec.media.h2': '图片',
      'sec.hazards.eyebrow': '了解',
      'sec.hazards.h2': '尼泊尔的自然灾害，简单说明',
      'sec.emergency.eyebrow': '紧急',
      'sec.emergency.h2': '在尼泊尔该打的电话',
      'sec.help.eyebrow': '捐助',
      'sec.help.h2': '如何真正帮上忙',
      'sec.sources.eyebrow': '来源',
      'sec.sources.h2': '本页每条事实的出处',
      'btn.openLive': '查看实时更新',
      'btn.seeMap': '查看地图',
      'btn.close': '关闭',
      'btn.refresh': '刷新',

      'sec.what-happened.lede': '根据警方、地方官员和新闻报道整理。时间为大致时间。',
      'tl.time1': '08:37 尼泊尔时间',
      'tl.text1': '边境附近记录到地震信号。美国地质调查局最初判定为4.4级地震，随后修正：该信号实为5.2级冰体崩塌，并非构造地震。',
      'tl.time2': '约 09:00 尼泊尔时间',
      'tl.text2': '边境处波特科西河水位骤然上涨。附近并未下雨，因此普通降雨不是成因。',
      'tl.time3': '上午',
      'tl.text3': '边境城镇提木雷和夏布如贝西受灾最重。九家银行网点被冲毁。当地直升机坪损毁，空中救援因此延误。',
      'tl.time4': '当天',
      'tl.text4': '洪水抵达下游城镇：贝特拉瓦蒂、特里苏里集市、加尔奇和东格集市，随后经穆格林进入纳拉亚尼河。14座水电项目受损。',
      'tl.time5': '进行中',
      'tl.text5': '尼泊尔陆军、警察和武装警察正乘直升机搜救幸存者。中国也已确认本国一侧有人遇难。',

      'dr.dead.label': '已寻回遗体',
      'dr.unreach.label': '失联',
      'dr.injured.label': '受伤，治疗中',
      'dr.bridges.label': '道路损毁',
      'dr.rescue.label': '获救：空中 · 地面',

      'cause.rank1': '主要解释',
      'cause.h1': '冰岩崩落堵塞了山间河流',
      'cause.p1': '尼泊尔水文气象局与独立冰川学家依据经ICIMOD共享的卫星影像指出：冰岩崩塌在米特里桥上游约20公里处堵塞了勒恩德河，形成临时堰塞湖，随后溃决。他们称这仍是初步判断。',
      'cause.rank2': '另一种可能',
      'cause.h2': '冰湖溃决',
      'cause.p2': '被冰体拦住的冰湖可能自行溃决。这种情况无需降雨即可发生，与此次的情形吻合。',
      'cause.rank3': '已排除',
      'cause.h3': '这不是地震',
      'cause.p3': '美国地质调查局最初记录到上午8时37分发生4.4级地震，就在洪水前几分钟。此后它修正了判断：该信号是5.2级冰体崩塌，而非构造地震。那次震动记录的就是崩塌本身，并非另一个诱因。',
      'cause.rank4': '此地为何可能发生',
      'cause.h4': '附近数以千计的隐蔽冰岩体',
      'cause.p4': '科学家最近在青藏高原发现超过13万处岩冰构造，远多于此前所知。它们可能在很小的扰动下蓄水或放水。',
      'cause.lede.strong': '目前尚无任何政府确认成因。',
      'cause.lede.rest': '依据现有专家分析，从最可能到较不可能排列。官方掌握更多信息后本页将更正。',

      'faq.lede': '大家搜索最多的问题，简短作答。',
      'faq.q1': '尼泊尔拉苏瓦发生了什么？',
      'faq.a1': '2026年8月26日上午，洪水从西藏一侧沿波特科西河冲入尼泊尔拉苏瓦县。蒂穆雷、夏布鲁贝西、拉苏瓦加迪口岸以及北拉苏瓦约十余个河岸村落受创最重，洪水随后沿特里苏里河进入纳拉亚尼河。尼泊尔电力局报告14座水电项目受损，约748兆瓦。',
      'faq.q2': '2026年8月尼泊尔洪水的成因是什么？',
      'faq.a2': '尚无政府确认成因。主要解释是：冰岩崩塌在西藏境内米特里桥上游约20公里处堵塞勒恩德河，形成临时堰塞湖后溃决。这是尼泊尔水文气象局与独立冰川学家依据经ICIMOD共享的卫星影像作出的初步判断。美国地质调查局已将数分钟前记录到的震动重新判定为5.2级冰体崩塌，而非地震。拉苏瓦当地的强降雨已被排除。',
      'faq.q3': '尼泊尔哪些县受灾？',
      'faq.a3': '拉苏瓦受灾最重，尤其是蒂穆雷、夏布鲁贝西和拉苏瓦加迪口岸。洪水随后流经努瓦阔特的贝特拉瓦蒂与特里苏里集市、达丁的加尔奇与东格集市，经穆格林进入纳拉亚尼河。奇特旺、纳瓦尔帕拉西东县与西县、廓尔喀和塔纳胡也发现遇难者遗体。中国一侧吉隆附近确认3人死亡。',
      'faq.q4': '加德满都受影响吗？',
      'faq.a4': '加德满都本身没有被淹。灾情集中在首都西北方向拉苏瓦和努瓦科特两县的波特科西河与特里苏利河谷。经拉苏瓦加迪通往中国边境的公路交通严重中断。',
      'faq.q5': '尼泊尔的紧急电话是多少？',
      'faq.a5a': '尼泊尔警察 100，救护车 102，消防 101，交警 103，任何手机可拨 112。国家应急行动中心灾害热线为 1149，尼泊尔警察免费热线 1155，旅游警察 1144。以上号码都可在 ',
      'faq.a5b': ' 标签页一键拨出。',
      'faq.q6': '如何向尼泊尔洪灾救援捐款？',
      'faq.a6a': '尼泊尔政府自有的渠道是由总理办公室管理的总理自然灾害救助基金。银行账户信息和官方二维码在 ',
      'faq.a6b': ' 标签页。请警惕灾后数小时内就会出现的虚假募捐。',
      'faq.q7': '现在去朗塘或夏布如贝西安全吗？',
      'faq.a7': '夏布如贝西是朗塘徒步路线的主要门户，此次直接受灾，连直升机坪都已损毁。河谷沿线道路受损。出发前请咨询尼泊尔警察、旅游警察 1144，以及你的徒步旅行社。',

      'em.lede.a': '点击下方任一号码即可拨出。这些是全国通用号码，尼泊尔境内任何电话均可拨打。用手机拨 ',
      'em.lede.b': ' 同样可以接通紧急服务。',
      'em.banner.strong': '如果有人此刻正处于危险中，请拨 100（警察），手机可拨 112。',
      'em.banner.rest': '不要等本页其余内容加载完毕。',
      'em.c1.who': '尼泊尔警察', 'em.c1.note': '一般紧急情况、救援、失踪人员',
      'em.c2.who': '紧急，手机拨打', 'em.c2.note': '想不起正确号码时也能用',
      'em.c3.who': '救护车', 'em.c3.note': '医疗急救与转运',
      'em.c4.who': '消防', 'em.c4.note': '火灾与救援',
      'em.c5.who': '交通警察', 'em.c5.note': '道路阻断、公路事故',
      'em.c6.who': '国家应急行动中心', 'em.c6.note': '全国灾害热线，NEOC',
      'em.c7.who': '尼泊尔警察热线', 'em.c7.note': '免费公共热线',
      'em.c8.who': '旅游警察', 'em.c8.note': '为游客和徒步者提供帮助'
    }
  };

  var nodes = Array.prototype.slice.call(document.querySelectorAll('[data-i18n]'));
  var originals = nodes.map(function(n){ return n.textContent; });
  var buttons = Array.prototype.slice.call(document.querySelectorAll('[data-lang-choice]'));
  var lang = 'en';

  try { lang = localStorage.getItem('site-lang') || 'en'; } catch(e){}

  var LANG_CODES = { en:'EN', ne:'ने', hi:'हि', zh:'中' };

  function apply(){
    document.documentElement.lang = DICT[lang] ? lang : 'en';
    var code = document.getElementById('lang-code');
    if(code) code.textContent = LANG_CODES[lang] || 'EN';
    nodes.forEach(function(n, i){
      var key = n.getAttribute('data-i18n');
      n.textContent = (lang !== 'en' && DICT[lang] && DICT[lang][key]) || originals[i];
    });
    buttons.forEach(function(b){
      b.setAttribute('aria-pressed', String(b.getAttribute('data-lang-choice') === lang));
    });
  }

  buttons.forEach(function(b){
    b.addEventListener('click', function(){
      lang = b.getAttribute('data-lang-choice');
      try { localStorage.setItem('site-lang', lang); } catch(e){}
      apply();
      var pop = document.getElementById('lang-pop');
      var trigger = document.getElementById('lang-btn');
      if(pop && !pop.hidden){ pop.hidden = true; if(trigger) trigger.setAttribute('aria-expanded','false'); }
    });
  });
  apply();
})();

(function(){
  var pairs = [
    { btn: document.getElementById('search-btn'),   pop: document.getElementById('search-pop') },
    { btn: document.getElementById('settings-btn'), pop: document.getElementById('settings-pop') },
    { btn: document.getElementById('lang-btn'),     pop: document.getElementById('lang-pop') }
  ].filter(function(p){ return p.btn && p.pop; });

  function closeAll(except){
    pairs.forEach(function(p){
      if(p === except) return;
      p.pop.hidden = true;
      p.btn.setAttribute('aria-expanded','false');
    });
  }

  pairs.forEach(function(p){
    p.btn.addEventListener('click', function(e){
      e.stopPropagation();
      var open = p.pop.hidden;
      closeAll(p);
      p.pop.hidden = !open;
      p.btn.setAttribute('aria-expanded', String(open));
      if(open && p.pop.querySelector('input')) p.pop.querySelector('input').focus();
    });
  });

  document.addEventListener('click', function(e){
    if(!e.target.closest('.search-panel') && !e.target.closest('.settings-pop')) closeAll(null);
  });
  document.addEventListener('keydown', function(e){
    if(e.key === 'Escape') closeAll(null);
    // "/" focuses search, the way most news sites do it
    if(e.key === '/' && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)){
      e.preventDefault();
      document.getElementById('search-btn').click();
    }
  });
  window.closeHeaderPopovers = function(){ closeAll(null); };
})();

var Tabs = (function(){
  var buttons = Array.prototype.slice.call(document.querySelectorAll('[data-tab]'));
  var listeners = [];
  var current = 'overview';

  var ALIAS = {
    feed:      { tab:'live',  at:'feed-tab' },
    media:     { tab:'video', at:'photos' },
    photos:    { tab:'video', at:'photos' },
    videos:    { tab:'video', at:'videos' },
    emergency: { tab:'help',  at:'emergency' },
    hazards:   { tab:'help',  at:'hazards' },
    sources:   { tab:'help',  at:'sources' },
    help:      { tab:'help',  at:'help' },
    live:      { tab:'live',  at:null },
    toll:      { tab:'overview', at:'toll' },
    'what-happened': { tab:'overview', at:'what-happened' },
    cause:     { tab:'overview', at:'cause' },
    faq:       { tab:'overview', at:'faq' },
    geography: { tab:'map',   at:'geography' }
  };

  function show(name, options){
    options = options || {};
    var jumpTo = null;
    if(!document.getElementById('panel-' + name) && ALIAS[name]){
      jumpTo = ALIAS[name].at;
      name = ALIAS[name].tab;
    } else if(ALIAS[name] && ALIAS[name].tab === name && ALIAS[name].at && options.jump !== false){
      jumpTo = null;
    }
    if(!document.getElementById('panel-' + name)) name = 'overview';
    current = name;
    options._jumpTo = jumpTo;

    buttons.forEach(function(b){
      var on = b.getAttribute('data-tab') === name;
      b.setAttribute('aria-selected', String(on));
    });
    document.querySelectorAll('.tabpanel').forEach(function(panel){
      panel.hidden = panel.id !== 'panel-' + name;
    });

    buildToc();
    var target = options._jumpTo && document.getElementById(options._jumpTo);
    if(target){
      requestAnimationFrame(function(){ target.scrollIntoView({ behavior:'auto', block:'start' }); });
    } else if(!options.keepScroll){
      window.scrollTo({ top: 0, behavior: options.smooth ? 'smooth' : 'auto' });
    }
    if(location.hash.slice(1) !== name) history.replaceState(null, '', '#' + name);
    listeners.forEach(function(fn){ fn(name); });
  }

  function buildToc(){
    var layout = document.querySelector('.layout');
    if(!layout) return;
    var DASHBOARD_TABS = { overview: 1 };
    layout.setAttribute('data-tab-layout', DASHBOARD_TABS[current] ? 'dashboard' : 'full');
  }

  buttons.forEach(function(b){
    b.addEventListener('click', function(e){
      e.preventDefault();
      show(b.getAttribute('data-tab'));
      if(window.closeHeaderPopovers) window.closeHeaderPopovers();
    });
  });
  var strip = Array.prototype.slice.call(document.querySelectorAll('#tabbar [role="tab"][data-tab]'));
  function roving(){
    strip.forEach(function(b){ b.setAttribute('tabindex', b.getAttribute('aria-selected') === 'true' ? '0' : '-1'); });
  }
  strip.forEach(function(b){
    b.addEventListener('keydown', function(e){
      var i = strip.indexOf(b), next = null;
      if(e.key === 'ArrowRight') next = strip[(i + 1) % strip.length];
      else if(e.key === 'ArrowLeft') next = strip[(i - 1 + strip.length) % strip.length];
      else if(e.key === 'Home') next = strip[0];
      else if(e.key === 'End') next = strip[strip.length - 1];
      if(!next) return;
      e.preventDefault();
      show(next.getAttribute('data-tab'), { keepScroll:true });
      next.focus();
    });
  });
  listeners.push(roving);
  document.addEventListener('click', function(e){
    var el = e.target.closest && e.target.closest('[data-tab-link]');
    if(!el) return;
    e.preventDefault();
    show(el.getAttribute('data-tab-link'));
  });
  document.querySelectorAll('[data-goto-tab]').forEach(function(el){
    el.addEventListener('click', function(){ show(el.getAttribute('data-goto-tab')); });
  });

  window.addEventListener('hashchange', function(){
    var name = location.hash.slice(1);
    if(name && (document.getElementById('panel-' + name) || ALIAS[name])) show(name);
  });

  var initial = location.hash.slice(1);
  show((document.getElementById('panel-' + initial) || ALIAS[initial]) ? initial : 'overview', { keepScroll: true });

  return {
    show: show,
    onChange: function(fn){ listeners.push(fn); },
    get current(){ return current; }
  };
})();

(function(){
  var head = document.querySelector('.sitehead');
  var root = document.documentElement;

  function measure(){
    root.style.setProperty('--head-h', Math.round(head.getBoundingClientRect().height) + 'px');
    root.style.setProperty('--toc-h', '0px');
  }

  measure();
  window.addEventListener('resize', measure);
  window.addEventListener('orientationchange', function(){ setTimeout(measure, 120); });
  Tabs.onChange(function(){ setTimeout(measure, 30); });
  if(document.fonts && document.fonts.ready) document.fonts.ready.then(measure);

  var top = document.getElementById('to-top');
  function onScroll(){ top.classList.toggle('show', window.scrollY > 700); }
  document.addEventListener('scroll', onScroll, { passive:true });
  top.addEventListener('click', function(){ window.scrollTo({ top:0, behavior:'smooth' }); });
  onScroll();
})();

(function(){
  var index = [
    {tab:'live',     id:'feed-tab',      label:'Latest updates, one scroll',        terms:'feed latest news updates posts blog breaking recent scroll'},
    {tab:'live',     id:'live',          label:'Live updates and official log',     terms:'live updates news feed latest breaking bulletin bipad incident log official'},
    {tab:'help',     id:'emergency',     label:'Emergency numbers, tap to call',    terms:'emergency helpline phone number call police ambulance fire 100 102 101 112 1149 1155 1144 missing person embassy'},
    {tab:'help',     id:'help',          label:'How to help, donate',               terms:'help donate money relief fund bank qr pmo give volunteer'},
    {tab:'video',    id:'videos',        label:'Videos',                            terms:'video videos youtube watch clip footage news channel'},
    {tab:'video',    id:'photos',        label:'Photos',                            terms:'photos pictures images gallery ground commons licence'},
    {tab:'map',      id:'geography',     label:'Interactive map, follow the water', terms:'map maps satellite google river geography where water came from timure syabrubesi devighat betrawati border landslide glacier flood path'},
    {tab:'overview', id:'toll',          label:'Confirmed dead, and where',         terms:'numbers deaths dead confirmed toll casualties china nepal missing district where rasuwa nuwakot chitwan'},
    {tab:'overview', id:'what-happened', label:'What happened, the timeline',       terms:'timeline what happened hours flood morning rescue'},
    {tab:'overview', id:'cause',         label:'What may have caused it',           terms:'cause why glacial lake glof avalanche earthquake ice landslide'},
    {tab:'overview', id:'faq',           label:'Common questions',                  terms:'faq questions kathmandu affected districts safe travel langtang donate emergency number'},
    {tab:'help',     id:'hazards',       label:'Natural disasters, explained',      terms:'natural disaster hazard learn prepare glof earthquake landslide monsoon lightning safety checklist'},
    {tab:'help',     id:'sources',       label:'Sources and credits',               terms:'sources citations links credits attribution'}
  ];

  var input = document.getElementById('site-search-input');
  var results = document.getElementById('search-results');

  function render(matches){
    results.innerHTML = '';
    if(!matches.length){
      results.innerHTML = '<p class="search-empty">Nothing matches that. Try &ldquo;map&rdquo;, &ldquo;donate&rdquo; or &ldquo;helpline&rdquo;.</p>';
      return;
    }
    matches.forEach(function(m){
      var b = document.createElement('button');
      b.type = 'button';
      var TAB_NAME = { overview:'Now', live:'Live', video:'Watch', map:'Map', help:'Help' };
      b.innerHTML = '<small>' + (TAB_NAME[m.tab] || m.tab) + '</small>' + m.label;
      b.addEventListener('click', function(){
        Tabs.show(m.tab, { keepScroll: true });
        var target = document.getElementById(m.id);
        if(target) target.scrollIntoView({ behavior:'smooth', block:'start' });
        results.innerHTML = '';
        input.value = '';
        if(window.closeHeaderPopovers) window.closeHeaderPopovers();
      });
      results.appendChild(b);
    });
  }

  input.addEventListener('input', function(){
    var q = input.value.trim().toLowerCase();
    if(!q){ results.innerHTML = ''; return; }
    render(index.filter(function(item){
      return (item.terms + ' ' + item.label).toLowerCase().indexOf(q) !== -1;
    }));
  });
  input.addEventListener('keydown', function(e){
    if(e.key === 'Enter'){
      var first = results.querySelector('button');
      if(first) first.click();
    }
  });
})();

(function(){
  var out = document.getElementById('stat-detail');
  if(!out) return;
  // delegated: the tiles are re-rendered from /event.json after load
  document.addEventListener('click', function(e){
    var btn = e.target.closest('.stat[data-detail]');
    if(!btn) return;
    document.querySelectorAll('.stat.is-active').forEach(function(s){ s.classList.remove('is-active'); });
    btn.classList.add('is-active');

    var text = btn.getAttribute('data-detail') || '';
    out.textContent = '';
    var re = /\s*Source:\s*(https?:\/\/\S+)/g;
    var at = 0, m;
    while((m = re.exec(text))){
      out.appendChild(document.createTextNode(text.slice(at, m.index)));
      var a = document.createElement('a');
      a.href = m[1];
      a.target = '_blank';
      a.rel = 'noopener nofollow';
      a.className = 'detail-src';
      try { a.textContent = new URL(m[1]).hostname.replace(/^www\./, ''); }
      catch(err){ a.textContent = 'the report'; }
      out.appendChild(document.createTextNode(' '));
      out.appendChild(a);
      at = m.index + m[0].length;
    }
    out.appendChild(document.createTextNode(text.slice(at)));
  });
})();

var FloodMap = (function(){
  var LEAFLET_JS  = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
  var LEAFLET_JS_SRI  = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
  var LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
  var LEAFLET_CSS_SRI = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
  var el = document.getElementById('flood-map');
  var real = null, pending = null, started = false, waiting = 0;

  function fail(){
    if(el) el.innerHTML = '<p style="padding:24px 18px; font-size:0.9rem; line-height:1.5;">The map could not load. ' +
      '<a href="/nepal-flood/rasuwa/map/">Every point it shows is listed on the map page</a>.</p>';
  }
  function ready(){
    if(--waiting > 0) return;
    if(typeof L === 'undefined'){ fail(); return; }
    if(el) el.textContent = '';
    try { real = buildFloodMap(); } catch(e){ fail(); return; }
    if(pending){ real.flyTo(pending); pending = null; }
  }
  function start(){
    if(started || !el) return;
    started = true;
    if(typeof L !== 'undefined'){ waiting = 1; ready(); return; }
    el.textContent = 'Loading the map…';
    waiting = 2;
    var css = document.createElement('link');
    css.rel = 'stylesheet'; css.href = LEAFLET_CSS; css.integrity = LEAFLET_CSS_SRI; css.crossOrigin = '';
    css.onload = ready; css.onerror = ready;
    document.head.insertBefore(css, document.head.firstChild);
    var s = document.createElement('script');
    s.src = LEAFLET_JS; s.integrity = LEAFLET_JS_SRI; s.crossOrigin = '';
    s.onload = ready; s.onerror = function(){ waiting = 0; fail(); };
    document.head.appendChild(s);
  }
  Tabs.onChange(function(name){ if(name === 'map') start(); });
  if(Tabs.current === 'map') start();

  return {
    flyTo: function(id){ if(real) real.flyTo(id); else pending = id; },
    load: start
  };
})();

function buildFloodMap(){
  var PLACES = [
    {
      id:'source', name:'Glacial source', step:'Step 1', lat:28.4402, lng:85.4432, elev:'~5,000 m',
      colour:'#3b82f6', zoom:12, onRiver:false, shotZoom:12,
      blurb:'High above the Lende Khola, on the Tibetan side. Satellite images suggest a mass of ice and rock broke away here first.',
      facts:['Country: China (Tibet)','Elevation: about 5,000 m','Distance to the border: about 20 km','No monitoring station upstream']
    },
    {
      id:'landslide', name:'Lende Khola blockage', step:'Step 2', lat:28.3050, lng:85.4020, elev:'~3,000 m',
      colour:'#8b5cf6', zoom:13, shotZoom:14,
      blurb:'The ice and rock dammed the narrow valley. Water built up behind the plug, then the plug failed. That is what turned a landslide into a flood.',
      facts:['Suspected dam-and-release point','About 20 km from Rasuwagadhi','Identified from Planet Labs imagery','No rain recorded that morning']
    },
    {
      id:'border', name:'Rasuwagadhi border', step:'Step 3', lat:28.2760, lng:85.3770, elev:'~1,850 m',
      colour:'#dc2626', zoom:14,
      blurb:'The China-Nepal crossing. Two rivers meet here, the landslide-fed Lende Khola and the Kyirong Tsangpo, and become the Bhote Koshi. The water hit both sides at once.',
      facts:['China-Nepal border crossing','Gyirong Port on the Chinese side','Customs and dry port damaged','China confirmed 3 deaths nearby']
    },
    {
      id:'timure', name:'Timure', step:'Step 4', lat:28.2350, lng:85.3730, elev:'~1,900 m',
      colour:'#dc2626', zoom:15,
      blurb:'A border market town, and the worst-hit place in Nepal. Nine bank branches and the customs post were swept away.',
      facts:['Hit first and hardest in Nepal','9 bank branches swept away','Customs post destroyed','Rasuwa district']
    },
    {
      id:'syabru', name:'Syabrubesi', step:'Step 5', lat:28.1620, lng:85.3340, elev:'~1,470 m',
      colour:'#dc2626', zoom:15,
      blurb:'Gateway town for the Langtang trek. The Bhotekoshi meets the Trishuli here. The helipad was destroyed, which slowed rescue flights.',
      facts:['Helipad destroyed','Bhotekoshi joins the Trishuli here','Main trekking gateway to Langtang','Hydropower projects damaged']
    },
    {
      id:'betrawati', name:'Betrawati', step:'Step 6', lat:27.9660, lng:85.1830, elev:'~730 m',
      colour:'#b45309', zoom:14,
      blurb:'About 60 km downstream, on the Rasuwa-Nuwakot boundary. The water had lost height by here, not force.',
      facts:['Rasuwa / Nuwakot boundary','About 60 km downstream','Bridge and riverside settlements hit']
    },
    {
      id:'devighat', name:'Devighat', step:'Step 7', lat:27.9050, lng:85.1350, elev:'~460 m',
      colour:'#b45309', zoom:14,
      blurb:'Furthest damage reported. The hydropower station was hit. From the source down to here is a drop of about 4,500 metres.',
      facts:['Furthest downstream damage reported','Devighat Hydropower Station damaged','Nuwakot district','Total drop from source: about 4,500 m']
    }
  ];

  var ESRI_SAT = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
  var ESRI_CREDIT = 'Imagery &copy; Esri, Maxar, Earthstar Geographics, and the GIS user community';

  var map = L.map('flood-map', { scrollWheelZoom: false, zoomControl: true })
             .setView([28.13, 85.29], 10);
  map.on('click', function(){ map.scrollWheelZoom.enable(); });
  map.on('mouseout', function(){ map.scrollWheelZoom.disable(); });

  var layers = {
    sat: L.tileLayer(ESRI_SAT, { maxZoom: 19, attribution: ESRI_CREDIT }),
    terrain: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
      maxZoom: 17, subdomains:'abc',
      attribution: 'Map data: &copy; OpenStreetMap contributors, SRTM | Style: &copy; OpenTopoMap (CC-BY-SA)'
    }),
    street: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '&copy; OpenStreetMap contributors'
    })
  };
  var activeLayer = 'sat';
  layers.sat.addTo(map);

  document.getElementById('map-attrib').innerHTML =
    ESRI_CREDIT + ' &middot; terrain &copy; <a href="https://opentopomap.org/" target="_blank" rel="noopener">OpenTopoMap</a> &middot; ' +
    'streets &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors &middot; map by Leaflet.';

  document.querySelectorAll('[data-layer]').forEach(function(chip){
    chip.addEventListener('click', function(){
      var want = chip.getAttribute('data-layer');
      if(want === activeLayer) return;
      map.removeLayer(layers[activeLayer]);
      layers[want].addTo(map);
      activeLayer = want;
      document.querySelectorAll('[data-layer]').forEach(function(c){
        c.setAttribute('aria-pressed', String(c.getAttribute('data-layer') === want));
      });
      route.eachLayer(function(l){ if(l.bringToFront) l.bringToFront(); });
    });
  });

  var LENDE_PATH = [[28.43827,85.44214],[28.43694,85.44323],[28.43602,85.44329],[28.43435,85.44266],[28.43181,85.44376],[28.42999,85.44297],[28.42766,85.44295],[28.42717,85.44421],[28.42414,85.44511],[28.4232,85.44685],[28.422,85.44761],[28.42112,85.44654],[28.41937,85.44719],[28.41795,85.44697],[28.41637,85.44615],[28.41454,85.44746],[28.41361,85.44729],[28.41307,85.4478],[28.41154,85.44785],[28.40939,85.4462],[28.40754,85.4471],[28.40749,85.44778],[28.40673,85.44867],[28.39965,85.44809],[28.398,85.44991],[28.39624,85.45046],[28.39496,85.44889],[28.39228,85.44945],[28.39127,85.44862],[28.38996,85.44898],[28.3886,85.44853],[28.3855,85.44873],[28.38337,85.44806],[28.38235,85.44816],[28.38116,85.44756],[28.37475,85.44977],[28.3737,85.45068],[28.37065,85.45075],[28.36787,85.45142],[28.36559,85.45106],[28.36388,85.45126],[28.36292,85.45059],[28.36023,85.44996],[28.35972,85.44938],[28.35894,85.44957],[28.35498,85.44833],[28.35406,85.44855],[28.35131,85.4475],[28.34963,85.44638],[28.34465,85.44656],[28.34356,85.44557],[28.34042,85.44537],[28.33916,85.44428],[28.3379,85.44178],[28.3354,85.4403],[28.33479,85.437],[28.33402,85.43532],[28.33338,85.43436],[28.33169,85.43311],[28.33051,85.43089],[28.33005,85.42904],[28.33047,85.42573],[28.32959,85.42203],[28.32812,85.42005],[28.32812,85.41922],[28.3271,85.41731],[28.32738,85.41569],[28.32707,85.41519],[28.32536,85.41369],[28.32294,85.41307],[28.31798,85.41397],[28.31726,85.41446],[28.31288,85.4137],[28.30828,85.41194],[28.30758,85.4111],[28.30702,85.40915],[28.30512,85.40844],[28.30453,85.40689],[28.3015,85.40358],[28.30151,85.40273],[28.30057,85.40113],[28.29965,85.40071],[28.29814,85.39767],[28.29405,85.39709],[28.29193,85.39453],[28.29029,85.39327],[28.28936,85.39328],[28.28823,85.39226],[28.28809,85.3906],[28.28634,85.3874],[28.28417,85.38593],[28.28169,85.38141],[28.28002,85.38042],[28.27805,85.377]];
  var KYIRONG_PATH = [[28.40875,85.29027],[28.40768,85.29259],[28.40646,85.29333],[28.405,85.29547],[28.40543,85.29695],[28.40698,85.29795],[28.40728,85.29997],[28.40822,85.3007],[28.40854,85.30233],[28.40668,85.30434],[28.40331,85.30657],[28.40311,85.30794],[28.40169,85.3096],[28.40192,85.31367],[28.40046,85.31411],[28.39979,85.31375],[28.39826,85.31165],[28.3966,85.31137],[28.39606,85.31262],[28.395,85.31309],[28.39451,85.31393],[28.39299,85.31457],[28.3922,85.31677],[28.391,85.31683],[28.39013,85.31789],[28.38956,85.31885],[28.38956,85.32052],[28.38871,85.3215],[28.38919,85.32329],[28.38865,85.3244],[28.38709,85.32447],[28.38599,85.32392],[28.38532,85.32439],[28.38458,85.32342],[28.38313,85.32258],[28.3792,85.32358],[28.37699,85.32733],[28.37701,85.32857],[28.37837,85.33103],[28.37884,85.33307],[28.37695,85.33651],[28.37545,85.33813],[28.37485,85.33845],[28.37344,85.33832],[28.37223,85.33715],[28.37141,85.33508],[28.37064,85.3348],[28.37006,85.33505],[28.3691,85.33694],[28.36946,85.34088],[28.36894,85.342],[28.36809,85.34228],[28.36743,85.34348],[28.367,85.34623],[28.3673,85.34823],[28.36668,85.34902],[28.36704,85.35116],[28.36845,85.35395],[28.36822,85.35707],[28.36754,85.35777],[28.36627,85.35808],[28.36539,85.35974],[28.3649,85.35987],[28.36365,85.35898],[28.36187,85.36004],[28.3607,85.35975],[28.35993,85.35879],[28.35955,85.35641],[28.35896,85.35661],[28.35821,85.35628],[28.3534,85.35816],[28.35249,85.35774],[28.35181,85.35663],[28.35046,85.35716],[28.34971,85.35653],[28.34735,85.35579],[28.34658,85.35528],[28.34626,85.35315],[28.34387,85.351],[28.3434,85.35008],[28.34159,85.34938],[28.33941,85.3478],[28.33748,85.34775],[28.33627,85.34598],[28.33467,85.34518],[28.33435,85.34403],[28.33366,85.34354],[28.33119,85.34263],[28.32888,85.3411],[28.3282,85.34132],[28.32477,85.33966],[28.32161,85.34086],[28.31925,85.34111],[28.31894,85.34167],[28.31627,85.34291],[28.31247,85.34581],[28.31165,85.34547],[28.31101,85.34584],[28.30909,85.34552],[28.30619,85.34585],[28.30162,85.34811],[28.29872,85.3478],[28.29778,85.34842],[28.29639,85.34793],[28.29275,85.34826],[28.2913,85.34701],[28.29083,85.34701],[28.28898,85.34746],[28.28775,85.34836],[28.28743,85.3503],[28.28651,85.35184],[28.28664,85.35524],[28.28563,85.35896],[28.28577,85.36125],[28.28525,85.36191],[28.28599,85.36724],[28.28548,85.37015],[28.28435,85.37288],[28.28231,85.3759],[28.27895,85.37711],[28.27805,85.377]];
  var MAINSTEM_PATH = [[28.27805,85.377],[28.27751,85.37676],[28.27341,85.37773],[28.26985,85.37737],[28.26885,85.37633],[28.2666,85.37558],[28.26454,85.37262],[28.26307,85.37287],[28.26232,85.37262],[28.26126,85.37093],[28.25896,85.36874],[28.25794,85.36558],[28.25112,85.36464],[28.24955,85.36498],[28.24869,85.3641],[28.24657,85.36319],[28.24325,85.35865],[28.24235,85.35823],[28.23736,85.35794],[28.23669,85.3587],[28.23517,85.35901],[28.23297,85.36031],[28.22892,85.361],[28.22476,85.36117],[28.22293,85.36082],[28.21846,85.35641],[28.21602,85.35475],[28.21326,85.35485],[28.21077,85.35417],[28.20591,85.3548],[28.20374,85.35329],[28.19959,85.35248],[28.19761,85.35159],[28.19659,85.35059],[28.19421,85.34977],[28.19343,85.34913],[28.19164,85.34874],[28.18826,85.34616],[28.18622,85.3458],[28.18404,85.3441],[28.18216,85.34361],[28.18174,85.34292],[28.17994,85.3426],[28.17397,85.34298],[28.16833,85.34243],[28.16638,85.34289],[28.165,85.34219],[28.16411,85.33985],[28.16331,85.33927],[28.16245,85.33774],[28.15975,85.3374],[28.15863,85.33394],[28.15329,85.3273],[28.15198,85.32642],[28.15082,85.32421],[28.1505,85.32262],[28.14958,85.32169],[28.14902,85.32034],[28.14817,85.31983],[28.14765,85.31791],[28.14623,85.3166],[28.14506,85.31318],[28.14136,85.31261],[28.14117,85.31183],[28.14219,85.30978],[28.14066,85.30752],[28.13755,85.30469],[28.135,85.30334],[28.13451,85.30262],[28.13386,85.30261],[28.13263,85.30095],[28.1297,85.30046],[28.12834,85.2988],[28.1265,85.29754],[28.12484,85.29456],[28.12291,85.29299],[28.12219,85.29126],[28.12105,85.29054],[28.12032,85.28907],[28.11852,85.28764],[28.11622,85.28289],[28.11497,85.28268],[28.11543,85.28257],[28.11403,85.28188],[28.11112,85.27885],[28.11084,85.27756],[28.10978,85.27705],[28.10761,85.27446],[28.10686,85.27247],[28.10416,85.2709],[28.10339,85.26919],[28.10246,85.26867],[28.10237,85.26697],[28.09974,85.26438],[28.09817,85.26351],[28.0961,85.26084],[28.09503,85.25561],[28.09293,85.25147],[28.09248,85.24325],[28.09146,85.24077],[28.09121,85.23703],[28.08944,85.23188],[28.08736,85.2297],[28.08534,85.22873],[28.08258,85.2222],[28.08179,85.22155],[28.08075,85.21914],[28.07773,85.21624],[28.07498,85.21147],[28.07471,85.20985],[28.07413,85.20917],[28.0727,85.20839],[28.07029,85.20802],[28.06886,85.20536],[28.06779,85.20512],[28.06616,85.20546],[28.06414,85.20685],[28.06186,85.20775],[28.05797,85.20866],[28.05546,85.20857],[28.05222,85.20645],[28.04985,85.20283],[28.04804,85.20237],[28.04523,85.20076],[28.04139,85.19519],[28.03983,85.19391],[28.03746,85.19355],[28.03538,85.19481],[28.03309,85.19462],[28.02861,85.19214],[28.02594,85.19007],[28.02529,85.18787],[28.02434,85.18679],[28.02319,85.18621],[28.02075,85.18619],[28.01932,85.18748],[28.01625,85.18729],[28.01517,85.18563],[28.01286,85.18423],[28.01158,85.18373],[28.00831,85.18356],[28.00476,85.18427],[28.0018,85.18378],[27.99683,85.18617],[27.99313,85.1822],[27.99001,85.18286],[27.9886,85.18047],[27.98772,85.1801],[27.9844,85.18054],[27.98116,85.18038],[27.97869,85.18153],[27.97497,85.18246],[27.97211,85.18442],[27.97138,85.18434],[27.97025,85.1829],[27.96928,85.17911],[27.96852,85.17821],[27.96494,85.17626],[27.96263,85.16976],[27.95703,85.16709],[27.95484,85.16194],[27.95317,85.16255],[27.95026,85.16244],[27.94738,85.16287],[27.94542,85.1611],[27.94372,85.16017],[27.94055,85.15921],[27.9363,85.15614],[27.93404,85.15533],[27.93245,85.15524],[27.93185,85.15447],[27.93186,85.15348],[27.934,85.15105],[27.93256,85.14998],[27.92863,85.14891],[27.92727,85.15031],[27.9259,85.15102],[27.92339,85.15135],[27.92217,85.15079],[27.92068,85.14668],[27.92035,85.14311],[27.91748,85.14064],[27.91616,85.13574],[27.91561,85.13461],[27.91485,85.13409],[27.91407,85.13436],[27.91065,85.13807],[27.90924,85.13887],[27.90619,85.13947],[27.904,85.14089],[27.90211,85.14044],[27.90014,85.13683],[27.8977,85.13669],[27.89523,85.13565],[27.89349,85.13581],[27.89033,85.13708],[27.88899,85.13706],[27.88306,85.12831],[27.88143,85.12672],[27.87934,85.12576],[27.87632,85.12606],[27.87465,85.12534],[27.87303,85.12093],[27.86965,85.1144],[27.86912,85.11446],[27.86807,85.11321],[27.86197,85.11051],[27.86034,85.10774],[27.85874,85.10666],[27.85825,85.10521],[27.85816,85.10168],[27.85972,85.09783],[27.86018,85.09448]];

  var riverLayers = [
    { pts: LENDE_PATH,    colour:'#a78bfa', label:'Lende Khola (landslide-fed)' },
    { pts: KYIRONG_PATH,  colour:'#38bdf8', label:'Kyirong Tsangpo (main stem, Tibet)' },
    { pts: MAINSTEM_PATH, colour:'#0ea5e9', label:'Bhote Koshi → Trishuli (Nepal)' }
  ];
  var route = L.layerGroup().addTo(map);
  riverLayers.forEach(function(r){
    L.polyline(r.pts, { color:'#0c4a6e', weight:8, opacity:0.32, lineJoin:'round' }).addTo(route);
    L.polyline(r.pts, { color:r.colour, weight:4, opacity:0.95, className:'flood-line', lineJoin:'round' })
      .bindTooltip(r.label, { sticky:true })
      .addTo(route);
  });
  L.circleMarker([28.27805, 85.377], {
    radius:7, color:'#fff', weight:2, fillColor:'#f59e0b', fillOpacity:1
  }).bindTooltip('Confluence: Lende Khola meets Kyirong Tsangpo here, becomes Bhote Koshi below this point', { sticky:true }).addTo(route);

  var DOWNSTREAM = LENDE_PATH.concat(MAINSTEM_PATH.slice(1));

  function snap(lat, lng){
    var best = null, bestD = Infinity;
    [LENDE_PATH, KYIRONG_PATH, MAINSTEM_PATH].forEach(function(path){
      for(var i = 0; i < path.length; i++){
        var dy = path[i][0] - lat, dx = (path[i][1] - lng) * 0.88;   // rough cos(28°)
        var d = dy * dy + dx * dx;
        if(d < bestD){ bestD = d; best = path[i]; }
      }
    });
    return best || [lat, lng];
  }

  PLACES.forEach(function(place){
    if(place.onRiver === false) return;
    var at = snap(place.lat, place.lng);
    place.lat = at[0];
    place.lng = at[1];
  });

  L.polyline([[28.4402, 85.4432], LENDE_PATH[0]], {
    color:'#93c5fd', weight:2.5, opacity:0.9, dashArray:'5 6'
  }).addTo(route);

  var markers = {};
  PLACES.forEach(function(place, i){
    var big = i >= 2 && i <= 4;
    var marker = L.marker([place.lat, place.lng], {
      title: place.name,
      icon: L.divIcon({
        className: '',
        html: '<div class="pin' + (big ? ' pin-lg' : '') + '" style="background:' + place.colour + '"></div>',
        iconSize: big ? [20,20] : [16,16],
        iconAnchor: big ? [10,10] : [8,8]
      })
    }).addTo(map);

    marker.bindPopup(
      '<h4>' + place.name + '</h4>' +
      '<div class="pop-meta">' + place.step + ' &middot; ' + place.elev + '</div>' +
      '<div>' + place.blurb + '</div>' +
      '<a class="pop-btn" style="display:inline-block; text-decoration:none;" target="_blank" rel="noopener" href="https://www.google.com/maps/@' + place.lat + ',' + place.lng + ',15z/data=!3m1!1e3">Open in Google Maps</a>'
    );
    marker.on('click', function(){ select(place.id, false); });
    markers[place.id] = marker;
  });

  var strip = document.getElementById('journey');
  PLACES.forEach(function(place){
    var b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('data-place', place.id);
    b.innerHTML =
      '<span class="step">' + place.step + '</span>' +
      '<span class="name">' + place.name + '</span>' +
      '<span class="elev">' + place.elev + '</span>';
    b.addEventListener('click', function(){ select(place.id, true); });
    strip.appendChild(b);
  });

  var detail = document.getElementById('place-detail');

  function satShot(lat, lng, zoom, caption){
    var n = Math.pow(2, zoom);
    var x = (lng + 180) / 360 * n;
    var latRad = lat * Math.PI / 180;
    var y = (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n;
    var tx = Math.floor(x), ty = Math.floor(y);
    var offX = (x - tx - 0.5) * 256;
    var offY = (y - ty - 0.5) * 256;
    var imgs = '';
    for(var dy = -1; dy <= 1; dy++){
      for(var dx = -1; dx <= 1; dx++){
        imgs += '<img loading="lazy" alt="" referrerpolicy="no-referrer" src="' +
          ESRI_SAT.replace('{z}', zoom).replace('{y}', ty + dy).replace('{x}', tx + dx) + '">';
      }
    }
    return '<div class="sat-shot">' +
      '<div class="tiles" style="transform:translate(' + (-offX) + 'px,' + (-offY) + 'px)">' + imgs + '</div>' +
      '<span class="cross"></span>' +
      '<span class="tag">' + caption + '</span>' +
    '</div>';
  }

  function select(id, fly){
    var place = PLACES.filter(function(p){ return p.id === id; })[0];
    if(!place) return;

    document.querySelectorAll('[data-place]').forEach(function(b){
      b.classList.toggle('is-active', b.getAttribute('data-place') === id);
    });

    detail.innerHTML =
      '<div><h4>' + place.name + '</h4><p>' + place.blurb + '</p>' +
        satShot(place.lat, place.lng, place.shotZoom || 15, place.name + ' from above') +
      '</div>' +
      '<div class="place-facts">' + place.facts.map(function(f){
        var parts = f.split(': ');
        return parts.length > 1 ? '<span>' + parts[0] + ': <b>' + parts.slice(1).join(': ') + '</b></span>' : '<span>' + f + '</span>';
      }).join('') +
      '<a class="chip" style="margin-top:6px; display:inline-block; text-decoration:none;" target="_blank" rel="noopener" href="https://www.google.com/maps/@' + place.lat + ',' + place.lng + ',15z/data=!3m1!1e3">Open in Google Maps</a></div>';

    if(fly){
      map.flyTo([place.lat, place.lng], place.zoom, { duration: 1.1 });
      markers[id].openPopup();
    }
  }

  var playBtn   = document.getElementById('play-route');
  var playLabel = document.getElementById('play-label');
  var playTimer = 0;
  var playing   = false;
  var head = null, trace = null;

  var PLAY_SECONDS = 15;

  function clearPlay(){
    if(playTimer) cancelAnimationFrame(playTimer);
    playTimer = 0;
    if(head){ map.removeLayer(head); head = null; }
    if(trace){ map.removeLayer(trace); trace = null; }
  }

  function stopPlay(){
    playing = false;
    clearPlay();
    playBtn.setAttribute('aria-pressed', 'false');
    playLabel.textContent = 'Play the flood path';
    playBtn.querySelector('svg').innerHTML = '<path d="M8 5v14l11-7z"></path>';
  }

  function startPlay(){
    playing = true;
    playBtn.setAttribute('aria-pressed', 'true');
    playLabel.textContent = 'Stop';
    playBtn.querySelector('svg').innerHTML = '<path d="M6.5 6h11v12h-11z"></path>';

    clearPlay();
    trace = L.polyline([DOWNSTREAM[0]], {
      color:'#f59e0b', weight:6, opacity:0.95, lineJoin:'round', lineCap:'round'
    }).addTo(map);
    head = L.circleMarker(DOWNSTREAM[0], {
      radius:8, color:'#fff', weight:2.5, fillColor:'#f59e0b', fillOpacity:1
    }).addTo(map);

    map.flyTo(DOWNSTREAM[0], 12, { duration: 1.2 });

    var t0 = 0;
    var lastPan = 0;
    var lastStop = -1;

    function frame(now){
      if(!playing) return;
      if(!t0) t0 = now;
      var pct = Math.min(1, (now - t0) / (PLAY_SECONDS * 1000));
      var idx = Math.floor(pct * (DOWNSTREAM.length - 1));
      var at = DOWNSTREAM[idx];

      trace.setLatLngs(DOWNSTREAM.slice(0, idx + 1));
      head.setLatLng(at);

      // pan with the water rather than on every frame, or the map fights itself
      if(now - lastPan > 900){
        lastPan = now;
        map.panTo(at, { animate:true, duration:0.9, noMoveStart:true });
      }

      // light up the stop the water has just passed
      for(var i = 0; i < PLACES.length; i++){
        var dy = PLACES[i].lat - at[0], dx = (PLACES[i].lng - at[1]) * 0.88;
        if(dy * dy + dx * dx < 0.0000045 && lastStop !== i){
          lastStop = i;
          select(PLACES[i].id, false);
          break;
        }
      }

      if(pct >= 1){ stopPlay(); return; }
      playTimer = requestAnimationFrame(frame);
    }
    playTimer = requestAnimationFrame(frame);
  }

  playBtn.addEventListener('click', function(){
    if(playing) stopPlay(); else startPlay();
  });

  Tabs.onChange(function(name){ if(name !== 'map' && playing) stopPlay(); });

  select('border', false);
  var CORRIDOR = L.latLngBounds(DOWNSTREAM).pad(0.06);
  map.fitBounds(CORRIDOR);
  Tabs.onChange(function(name){
    if(name !== 'map') return;
    setTimeout(function(){ map.invalidateSize(); if(!playing) map.fitBounds(CORRIDOR); }, 60);
  });

  return {
    flyTo: function(id){ select(id, true); }
  };
}

window.tidyVideoTitle = function(raw){
  var text = String(raw == null ? '' : raw).replace(/\s+/g, ' ').trim();
  var trimmed = text.replace(/(?:\s*#[\w\u0900-\u097F]+)+\s*$/, '').trim();
  if(trimmed.length >= 12) return trimmed.replace(/\s*[|\-\u2013]\s*$/, '').trim();
  var tags = text.match(/#[\w\u0900-\u097F]+/g) || [];
  var seen = {}, kept = [];
  for(var i = 0; i < tags.length && kept.length < 5; i++){
    var word = tags[i].slice(1).replace(/_+/g, ' ').trim();
    if(!word || seen[word.toLowerCase()]) continue;
    seen[word.toLowerCase()] = 1;
    kept.push(word);
  }
  if(!kept.length) return text.slice(0, 90);
  var out = kept.join(', ');
  return out.charAt(0).toUpperCase() + out.slice(1);
};

var PostCards = (function(){
  function escapeHtml(text){
    return String(text == null ? '' : text).replace(/[&<>"']/g, function(c){
      return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
    });
  }

  function timeAgo(iso){
    if(!iso) return '';
    var then = new Date(iso).getTime();
    if(isNaN(then)) return '';
    var mins = Math.round((Date.now() - then) / 60000);
    if(mins < 1) return 'just now';
    if(mins < 60) return mins + ' min ago';
    var hours = Math.round(mins / 60);
    if(hours < 24) return hours + (hours === 1 ? ' hour ago' : ' hours ago');
    var days = Math.round(hours / 24);
    return days + (days === 1 ? ' day ago' : ' days ago');
  }

  function initials(name){
    var words = String(name || '?').trim().split(/\s+/);
    return ((words[0] || '?')[0] + (words[1] ? words[1][0] : '')).toUpperCase();
  }

  function youtubeId(url){
    var m = String(url || '').match(/[?&]v=([\w-]{6,15})/);
    return m ? m[1] : null;
  }

  function whenLabel(item){
    if(!item.time) return '';
    if(item.dateOnly){
      var d = new Date(item.time);
      if(isNaN(d)) return '';
      return d.toLocaleDateString(undefined, { day:'numeric', month:'short' });
    }
    return timeAgo(item.time);
  }

  var CHECK = '<svg class="check" width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-label="Verified source" role="img">' +
    '<path d="M12 1.6l2.5 2.1 3.2-.4 1 3.1 2.9 1.5-1.1 3.1 1.1 3.1-2.9 1.5-1 3.1-3.2-.4L12 22.4l-2.5-2.1-3.2.4-1-3.1L2.4 16l1.1-3.1L2.4 9.8l2.9-1.5 1-3.1 3.2.4z"></path>' +
    '<path d="M10.6 15.6l-3-3 1.2-1.2 1.8 1.8 4.4-4.4 1.2 1.2z" fill="#fff"></path></svg>';

  function sourceMark(item){
    return (item.authority === 'primary' || item.authority === 'trusted') ? CHECK : '';
  }

  function card(item, index){
    var summary = item.summary && item.summary.trim() !== String(item.title || '').trim()
      ? item.summary : '';
    var verifiedMark = sourceMark(item);
    var also = item.alsoReported || [];
    var corrob = also.length
      ? 'Also reported by ' + also.slice(0, 3).map(function(o){ return o.name; }).join(', ') +
        (also.length > 3 ? ' and ' + (also.length - 3) + ' more' : '')
      : '';
    var uid = 'post-' + index + '-' + Math.random().toString(36).slice(2,7);
    var ytId = item.kind === 'video' ? youtubeId(item.url) : null;

    var media = '';
    if(ytId){
      media = '<div class="tc-media"><div class="post-video" data-yt-id="' + escapeHtml(ytId) + '">' +
        (item.image ? '<img class="post-photo" loading="lazy" referrerpolicy="no-referrer" src="' + escapeHtml(item.image) + '" alt="" onerror="this.style.display=\'none\'">' : '') +
        '<button class="post-play" type="button" data-play-video="1" aria-label="Play video">' +
          '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"></path></svg>' +
        '</button>' +
      '</div></div>';
    } else if(item.image){
      var photoSrc = item.image.replace('/ace/standard/240/', '/ace/standard/800/');
      media = '<div class="tc-media">' +
        '<a class="post-photo-link" href="' + escapeHtml(item.url) + '" target="_blank" rel="noopener nofollow" tabindex="-1" aria-hidden="true">' +
        '<img class="post-photo" loading="lazy" referrerpolicy="no-referrer" src="' + escapeHtml(photoSrc) + '" alt="' + escapeHtml(item.title) + '" width="800" height="450" ' +
        'onerror="var m=this.closest(\'.tc-media\'); m.classList.add(\'tc-media-blank\'); this.closest(\'a\').remove();">' +
      '</a></div>';
    }

    var credit = item.image && !ytId
      ? 'Photograph: ' + escapeHtml(item.source || 'the publisher')
      : '';

    if(!media){
      media = '<div class="tc-media tc-media-blank" aria-hidden="true">' +
        '<span class="tcb-name">' + escapeHtml(item.source || 'Source') + '</span>' +
      '</div>';
      credit = 'No photograph filed with this report';
    }

    return (
      '<article class="post-card today-card" data-url="' + escapeHtml(item.url) + '" data-title="' + escapeHtml(item.title) + '">' +
        media +
        '<div class="post-body">' +
          '<p class="tc-kicker">' + escapeHtml(item.source || 'Source') + verifiedMark +
            '<span class="tc-when">' + escapeHtml(whenLabel(item)) + '</span></p>' +
          '<p class="tc-title"' + (/[\u0900-\u097F]/.test(item.title) ? ' lang="ne"' : '') + '><a href="' + escapeHtml(item.url) + '" target="_blank" rel="noopener nofollow">' +
            escapeHtml(item.title) + '</a></p>' +
          (summary ? '<p class="post-summary clamped" id="' + uid + '" data-expand="' + uid + '"' + (/[\u0900-\u097F]/.test(summary) ? ' lang="ne"' : '') + '>' + escapeHtml(summary) + '</p>' : '') +
          (credit ? '<p class="tc-credit">' + credit + '</p>' : '') +
          (corrob ? '<div class="tc-sources">' + escapeHtml(corrob) + '</div>' : '') +
        '</div>' +
        '<div class="post-foot">' +
          '<button class="post-btn" type="button" data-share="1">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.6" y1="13.5" x2="15.4" y2="17.5"></line><line x1="15.4" y1="6.5" x2="8.6" y2="10.5"></line></svg>' +
            'Share' +
          '</button>' +
          '<button class="post-btn" type="button" data-open="1">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"></path><path d="M15 3h6v6"></path><path d="M10 14L21 3"></path></svg>' +
            'Open original' +
          '</button>' +
        '</div>' +
      '</article>'
    );
  }

  var EMPTY = '<p style="font-size:0.88rem; color:var(--text-faint);">No automatic posts right now. The checked summaries elsewhere on this page still apply.</p>';

  function render(container, items, limit){
    if(!container) return;
    if(!items.length){ container.innerHTML = EMPTY; return; }
    container.innerHTML = '<div class="river">' +
      items.slice(0, limit || items.length).map(card).join('') + '</div>';
  }

  function renderPack(container, items, limit){
    if(!container) return;
    if(!items.length){ container.innerHTML = EMPTY; return; }
    container.innerHTML = '<div class="river">' +
      items.slice(0, limit || items.length).map(card).join('') + '</div>';
  }

  var SHARE_URL = location.origin + location.pathname;

  var STORY_IMG = (document.querySelector('meta[name="ndu:story-image"]') || {}).content || '';

  function closeShareMenus(){
    document.querySelectorAll('.share-menu').forEach(function(m){ m.remove(); });
  }
  document.addEventListener('click', function(e){
    if(!e.target.closest('.share-menu') && !e.target.closest('[data-share]')) closeShareMenus();
  });

  var SHARE_ICON = {
    facebook: '<path d="M14 8.5h2.2V5.6h-2.4c-2.5 0-3.9 1.4-3.9 3.9v1.6H8v3h1.9V21h3.2v-6.9h2.3l.4-3h-2.7V9.9c0-1 .3-1.4.9-1.4z"/>',
    whatsapp: '<path d="M12 3a9 9 0 00-7.7 13.6L3 21l4.5-1.2A9 9 0 1012 3zm5.2 12.7c-.2.6-1.2 1.2-1.7 1.2-.5.1-1 .1-3.2-.8-2.7-1.1-4.4-3.9-4.6-4.1-.1-.2-1-1.4-1-2.6s.6-1.8.9-2.1c.2-.2.5-.3.6-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .6l-.4.5c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.4 2.4 1.5.2.1.4.1.6-.1l.7-.9c.2-.2.4-.2.6-.1l2 1c.2.1.4.2.4.3.1.2.1.7-.1 1.2z"/>',
    x: '<path d="M17.5 3h3l-6.6 7.5L21.7 21h-6l-4.7-6.1L5.6 21H2.5l7-8L2.3 3h6.2l4.2 5.6zm-1.1 16h1.7L7.7 4.7H5.9z"/>',
    telegram: '<path d="M21.2 4.3 2.9 11.4c-1 .4-1 1.8.1 2.1l4.5 1.4 1.7 5.3c.3.9 1.4 1.1 2 .4l2.5-2.6 4.5 3.3c.7.5 1.7.1 1.9-.7l3-14.2c.2-.9-.7-1.6-1.9-1.1zM8.9 14.2l8.6-5.3-6.9 6.4-.3 3.3z"/>',
    link: '<path d="M10.6 13.4a4 4 0 015.7 0l.7.7a4 4 0 01-5.7 5.7l-1.4-1.4M13.4 10.6a4 4 0 00-5.7 0l-.7.7a4 4 0 005.7 5.7l1.4-1.4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    story: '<path d="M7 3h10a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2zm5 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zm0 2a3.5 3.5 0 110 7 3.5 3.5 0 010-7z"/>'
  };

  function shareRow(key, label, href, attrs){
    return '<a class="sm-item" href="' + href + '" target="_blank" rel="noopener"' + (attrs || '') + '>' +
      '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' + SHARE_ICON[key] + '</svg>' +
      '<span>' + label + '</span></a>';
  }

  function openShareSheet(btn, title, url, storyImg){
    var shareUrl = url || SHARE_URL;
    var text = title || document.title;
    if(navigator.share){
      navigator.share({ title: text, text: text, url: shareUrl }).catch(function(){});
      return;
    }
    closeShareMenus();
    var u = encodeURIComponent(shareUrl);
    var t = encodeURIComponent(text);
    var story = storyImg || STORY_IMG;
    var html =
      shareRow('facebook', 'Facebook', 'https://www.facebook.com/sharer/sharer.php?u=' + u) +
      shareRow('whatsapp', 'WhatsApp', 'https://wa.me/?text=' + t + '%20' + u) +
      shareRow('x', 'X', 'https://twitter.com/intent/tweet?text=' + t + '&url=' + u) +
      shareRow('telegram', 'Telegram', 'https://t.me/share/url?url=' + u + '&text=' + t) +
      (story ? shareRow('story', 'Story image', story, ' download') : '') +
      '<button class="sm-item" type="button" data-copy-link>' +
        '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">' + SHARE_ICON.link + '</svg>' +
        '<span>Copy link</span></button>';
    var menu = document.createElement('div');
    menu.className = 'share-menu';
    menu.innerHTML = html;
    menu.addEventListener('click', function(ev){
      var copy = ev.target.closest('[data-copy-link]');
      if(copy && navigator.clipboard){
        navigator.clipboard.writeText(shareUrl);
        copy.querySelector('span').textContent = 'Link copied';
        setTimeout(closeShareMenus, 1200);
      } else if(!ev.target.closest('a')) { setTimeout(closeShareMenus, 50); }
    });
    var foot = btn.closest('.post-foot') || btn.closest('.video-actions') || btn.parentNode;
    foot.style.position = 'relative';
    foot.appendChild(menu);
  }

  document.addEventListener('click', function(e){
    var playBtn = e.target.closest('[data-play-video]');
    if(playBtn){
      var wrap = playBtn.closest('.post-video');
      var id = wrap && wrap.getAttribute('data-yt-id');
      if(id){
        wrap.innerHTML = '<iframe src="https://www.youtube.com/embed/' + id + '?autoplay=1" ' +
          'title="YouTube video player" frameborder="0" loading="lazy" ' +
          'allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" ' +
          'allowfullscreen></iframe>';
      }
      return;
    }
    var expandTarget = e.target.closest('[data-expand]');
    if(expandTarget){
      var id = expandTarget.getAttribute('data-expand');
      var p = document.getElementById(id);
      if(p) p.classList.toggle('clamped');
      return;
    }
    var shareBtn = e.target.closest('[data-share]');
    if(shareBtn){
      var host = shareBtn.closest('.post-card, .video-card');
      var shareTitle = host ? host.getAttribute('data-title') : document.title;
      var perma = host ? host.getAttribute('data-permalink') : '';
      openShareSheet(
        shareBtn,
        shareTitle,
        perma ? location.origin + perma : SHARE_URL,
        host ? host.getAttribute('data-story') : ''
      );
      e.stopPropagation();
      return;
    }
    var openBtn = e.target.closest('[data-open]');
    if(openBtn){
      var p2 = openBtn.closest('.post-card');
      if(p2) window.open(p2.getAttribute('data-url'), '_blank', 'noopener');
    }
  });

  return { render: render, renderPack: renderPack, timeAgo: timeAgo, sourceMark: sourceMark };
})();

var LiveFeed = (function(){
  var feedEl = document.getElementById('live-feed');
  var statusEl = document.getElementById('feed-status');
  var modalEl = document.getElementById('modal-feed');
  var quakeEl = document.getElementById('quake-feed');
  var badge = document.getElementById('live-badge');
  var officialLiveEl = document.getElementById('official-feeds-live');
  var officialMediaEl = document.getElementById('official-feeds-media');
  var feedTabGrid = document.getElementById('feed-tab-grid');
  var todayGeneralGrid = document.getElementById('today-general-grid');
  var todayGeneralStatus = document.getElementById('today-general-status');
  var feedTabStatus = document.getElementById('feedtab-status');
  var regionButtons = Array.prototype.slice.call(document.querySelectorAll('[data-region-choice]'));
  var regionFilter = 'all';
  var latest = [];
  var globalItems = [];
  var lastCheck = 0;
  var videoGrid = document.getElementById('video-grid');
  var videoStatus = document.getElementById('video-status');
  var videoEmpty = document.getElementById('video-empty');
  var videoFreshness = document.getElementById('video-freshness');
  var latestVideos = [];
  var videoFeedMeta = null;
  var videoFeedCheckedAt = null;
  var vregionFilter = 'all';
  var videoFailed = false;
  Array.prototype.slice.call(document.querySelectorAll('[data-vregion]')).forEach(function(b){
    b.addEventListener('click', function(){
      vregionFilter = b.getAttribute('data-vregion');
      document.querySelectorAll('[data-vregion]').forEach(function(c){ c.setAttribute('aria-pressed', String(c === b)); });
      renderVideos(latestVideos);
    });
  });

  function initials(name){
    var w = String(name || '?').trim().split(/\s+/);
    return ((w[0] || '?')[0] + (w[1] ? w[1][0] : '')).toUpperCase();
  }

  function renderVideoFreshness(){
    if(!videoFreshness) return;
    var meta = videoFeedMeta || {};
    var newest = meta.newestAt || (newestByTime(latestVideos) || {}).time;
    var checked = meta.checkedAt || meta.searchedAt || videoFeedCheckedAt;
    var parts = [];
    if(checked) parts.push('Sources checked ' + nptClock(checked));
    if(newest) parts.push('newest clip ' + PostCards.timeAgo(newest));
    videoFreshness.textContent = parts.join(' · ');
    videoFreshness.hidden = true;
  }

  function renderVideos(all){
    if(!videoGrid) return;
    latestVideos = all || [];
    var items = vregionFilter === 'all' ? latestVideos
      : latestVideos.filter(function(i){ return i.region === vregionFilter; });
    if(!latestVideos.length){
      videoGrid.innerHTML = '';
      if(videoEmpty){
        videoEmpty.hidden = false;
        videoEmpty.textContent = videoFailed
          ? 'Verified video sources cannot be reached right now. We will not show random clips; this checks again by itself.'
          : (videoFeedMeta && videoFeedMeta.configured === false
            ? 'Verified video sources are being connected. We will not show random clips.'
            : 'No recent disaster video from a verified source yet. We will not show random clips.');
      }
      if(videoStatus) videoStatus.textContent = 'No verified video';
      return;
    }
    if(videoEmpty) videoEmpty.hidden = true;
    if(!items.length){
      videoGrid.innerHTML = '<p style="grid-column:1/-1; font-size:0.88rem; color:var(--text-faint);">No videos from this source group. Try “All sources”.</p>';
      if(videoStatus) videoStatus.textContent = '0 of ' + latestVideos.length;
      return;
    }
    videoGrid.innerHTML = items.map(videoCardHtml).join('');
    if(videoStatus) videoStatus.textContent = items.length + ' videos';
  }

  function videoCardHtml(it){
      var rawUrl = String(it.url || '');
      var url = /^https:\/\/www\.youtube\.com\/watch\?/i.test(rawUrl) ? rawUrl : '';
      if(!url) return '';
      var vid = (url.match(/[?&]v=([\w-]{6,15})/) || [])[1] || '';
      var source = escapeHtml(it.source || 'YouTube');
      var title = escapeHtml(String(window.tidyVideoTitle(it.title)));
      var image = /^https:\/\//i.test(String(it.image || '')) ? escapeHtml(it.image) : '';
      var avatar = /^https:\/\//i.test(String(it.avatar || '')) ? escapeHtml(it.avatar) : '';
      var verifiedMark = PostCards.sourceMark(it);
      return '<article class="video-card" data-yt="' + vid + '" data-url="' + escapeHtml(url) + '" data-title="' + title + '">' +
        '<div class="video-thumb">' +
          (image ? '<img loading="lazy" referrerpolicy="no-referrer" src="' + image + '" alt="" onerror="this.style.display=\'none\'">' : '') +
          '<button class="v-play" type="button" aria-label="Play video"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"></path></svg></button>' +
        '</div>' +
        '<div class="video-meta">' +
          '<div class="v-ava" aria-hidden="true">' + (avatar
            ? '<img referrerpolicy="no-referrer" src="' + avatar + '" alt="" onerror="this.remove()">'
            : initials(it.source)) + '</div>' +
          '<div class="video-info">' +
            '<div class="video-title">' + title + '</div>' +
            '<div class="video-actions"><button class="post-btn" type="button" data-share="1">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.6" y1="13.5" x2="15.4" y2="17.5"></line><line x1="15.4" y1="6.5" x2="8.6" y2="10.5"></line></svg>Share</button></div>' +
          '</div>' +
        '</div>' +
      '</article>';
  }

  function visibleVideos(){
    return vregionFilter === 'all' ? latestVideos
      : latestVideos.filter(function(i){ return i.region === vregionFilter; });
  }

  document.addEventListener('click', function(e){
    if(e.target.closest('[data-share]')) return;
    var play = e.target.closest('.video-card .v-play, .video-card .video-thumb, .video-card .video-info');
    if(play){
      var card = play.closest('.video-card');
      if(!card) return;
      var url = card.getAttribute('data-url');
      // The Now tab shows a short taster; from there the feed opens on the
      // whole list so it does not dead-end after a couple of swipes.
      var list = card.closest('#overview-videos') ? latestVideos : visibleVideos();
      var at = 0;
      for(var n = 0; n < list.length; n++){ if(list[n].url === url){ at = n; break; } }
      if(window.ShortsFeed && window.ShortsFeed.open(list, at)) return;
      // No player available for some reason: fall back to the old inline embed.
      var vid = card.getAttribute('data-yt');
      var thumb = card.querySelector('.video-thumb');
      if(vid && thumb && !thumb.querySelector('iframe')){
        thumb.innerHTML = '<iframe src="https://www.youtube.com/embed/' + vid + '?autoplay=1" title="YouTube video player" ' +
          'allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>';
      }
      return;
    }
  });

  function renderOverviewVideos(all){
    var box = document.getElementById('overview-videos');
    if(!box) return;
    var items = (all || []).slice(0, 4);
    if(!items.length){
      box.closest('.preview').hidden = true;
      return;
    }
    box.closest('.preview').hidden = false;
    box.innerHTML = items.map(videoCardHtml).join('');
  }

  function renderFeedTab(){
    if(!feedTabGrid) return;
    // Live combines Nepal coverage with the wider disaster desk. Videos and
    // earthquakes keep their own panels.
    var seen = {};
    var base = latest.concat(globalItems).filter(function(i){
      if(!i || i.kind === 'video' || i.kind === 'quake') return false;
      var key = i.url || i.title;
      if(!key || seen[key]) return false;
      seen[key] = true;
      return true;
    });
    var items = regionFilter === 'all' ? base : base.filter(function(i){
      // Official/alert are primary sources, not press, always shown.
      return i.kind !== 'press' || i.region === regionFilter;
    });
    PostCards.renderPack(feedTabGrid, items, 60);
    var section = feedTabGrid.closest('section');
    if(section) section.hidden = !items.length;
  }

  function worldDisaster(i){
    return !!i && i.source !== 'U.S. National Weather Service' &&
      /earthquake|quake|tsunami|volcan|flood|landslide|avalanche|cyclone|typhoon|hurricane|wildfire|drought|disaster|death toll/i.test(i.title || '');
  }

  function renderTodayGeneral(){
    if(!todayGeneralGrid) return;
    var seen = {};
    var items = latest.concat(globalItems.filter(worldDisaster)).filter(function(i){
      if(!i || i.kind === 'quake' || i.kind === 'video') return false;
      var key = i.url || i.title;
      if(!key || seen[key]) return false;
      seen[key] = true;
      return true;
    });
    items.sort(function(a, b){ return new Date(b.time || 0) - new Date(a.time || 0); });
    PostCards.renderPack(todayGeneralGrid, items, 11);
    if(todayGeneralStatus){
      var sources = {};
      items.slice(0, 11).forEach(function(item){ if(item.source) sources[item.source] = true; });
      var names = Object.keys(sources);
      todayGeneralStatus.textContent = names.length
        ? names.length + ' named sources · newest first'
        : 'Waiting for verified reports';
    }
    var section = todayGeneralGrid.closest('.today-general');
    if(section) section.hidden = !items.length;
  }

  function loadGlobal(){
    return fetch('/api/global', { cache:'no-store', signal: fetchDeadline(30000) })
      .then(function(r){ return r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status)); })
      .then(function(data){
        globalItems = Array.isArray(data.items) ? data.items : [];
        renderTodayGeneral();
        renderFeedTab();
      })
      .catch(function(){
        globalItems = [];
        renderTodayGeneral();
        renderFeedTab();
      });
  }

  regionButtons.forEach(function(b){
    b.addEventListener('click', function(){
      regionFilter = b.getAttribute('data-region-choice');
      regionButtons.forEach(function(c){ c.setAttribute('aria-pressed', String(c === b)); });
      renderFeedTab();
    });
  });

  function escapeHtml(text){
    return String(text).replace(/[&<>"']/g, function(c){
      return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
    });
  }

  function nptClock(iso){
    var date = iso ? new Date(iso) : new Date();
    if(isNaN(date.getTime())) return '';
    try{
      return date.toLocaleTimeString('en-GB', {
        timeZone:'Asia/Kathmandu', hour:'2-digit', minute:'2-digit'
      }) + ' NPT';
    }catch(e){
      return date.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
    }
  }

  function newestByTime(items){
    return (items || []).filter(function(item){ return item && item.time && !isNaN(new Date(item.time).getTime()); })
      .sort(function(a, b){ return new Date(b.time).getTime() - new Date(a.time).getTime(); })[0] || null;
  }

  function renderModalRows(el, items, limit){
    if(!el) return;
    if(!items.length){
      el.innerHTML = '<p style="font-size:0.88rem; color:var(--text-faint);">No automatic items right now. The checked summaries below still apply.</p>';
      return;
    }
    el.innerHTML = items.slice(0, limit).map(function(item){
      return '<div class="update">' +
        '<time datetime="' + escapeHtml(item.time || '') + '">' + PostCards.timeAgo(item.time) + '</time>' +
        '<div><div class="src">' + escapeHtml(item.source || 'Source') + '</div>' +
        '<p><a href="' + escapeHtml(item.url) + '" target="_blank" rel="noopener">' + escapeHtml(item.title) + ' &#8599;</a></p>' +
        '</div></div>';
    }).join('');
  }

  function shortMoney(text){
    var t = String(text || '').match(/(?:rs\.?|npr|usd|us\$|\$|₹)\s?[\d,.]+\s?(?:trillion|billion|bn|crore|million|lakh)?/i);
    if(!t) return String(text || '').slice(0, 22);
    return t[0].replace(/\s?billion/i, 'bn').replace(/\s?million/i, 'm').replace(/\s?trillion/i, 'tn').trim();
  }

  function renderMoneyStat(found, valueId, statId, lead, floor){
    var valueEl = document.getElementById(valueId);
    var statEl = document.getElementById(statId);
    if(!valueEl || !statEl || !found || !found.text) return;
    if(floor && found.size && found.size < floor) return;
    valueEl.textContent = shortMoney(found.text);
    statEl.setAttribute('data-detail', lead + ' ' + found.source + ' reported it: "' + found.title + '". ' +
      'Read the article at ' + found.url + '. This is a reported figure, not this site\'s estimate.');
  }

  function renderEconomicLoss(loss){
    renderMoneyStat(loss, 'econ-loss-value', 'econ-loss-stat',
      'Damage figures are preliminary and will change.', 2e11);
  }

  function renderReliefFund(fund){
    renderMoneyStat(fund, 'relief-fund-value', 'relief-fund-stat',
      'Money released or pledged for relief.', 1e9);
  }

  function load(){
    if(statusEl) statusEl.textContent = 'Refreshing…';
    if(feedTabStatus) feedTabStatus.textContent = 'Refreshing…';
    return fetch('/api/news', { cache: 'no-store', signal: fetchDeadline(30000) })
      .then(function(r){ return r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status)); })
      .then(function(data){
        latest = data.items || [];
        lastCheck = Date.now();
        renderEconomicLoss(data.economicLoss);
        renderReliefFund(data.reliefFund);
        var editorial = latest.filter(function(i){ return i.kind !== 'quake' && i.kind !== 'video'; });
        var official = latest.filter(function(i){ return i.kind === 'official' || i.kind === 'alert'; });
        var videos = latest.filter(function(i){ return i.kind === 'video'; });
        // Tells the empty state whether YouTube failed (quota, outage) or is
        // simply not configured, so it stops blaming a missing API key.
        videoFeedMeta = data.videoFeed || null;
        videoFailed = Boolean(videoFeedMeta && videoFeedMeta.unavailable) ||
          (data.errors || []).some(function(e){ return String(e).indexOf('youtube') === 0; });
        videoFeedCheckedAt = data.updated || new Date().toISOString();

        PostCards.render(feedEl, editorial, 18);
        renderModalRows(modalEl, editorial, 4);
        renderModalRows(quakeEl, latest.filter(function(i){ return i.kind === 'quake'; }), 6);
        PostCards.render(officialLiveEl, official, 12);
        PostCards.render(officialMediaEl, editorial.filter(function(i){ return i.image; }), 12);
        PostCards.render(document.getElementById('overview-updates'), editorial, 3);
        renderVideos(videos);
        renderVideoFreshness();
        renderOverviewVideos(videos);
        renderFeedTab();
        renderTodayGeneral();

        if(quakeEl && !latest.some(function(i){ return i.kind === 'quake'; })){
          quakeEl.innerHTML = '<p style="font-size:0.88rem; color:var(--text-faint);">No earthquakes above magnitude 3.5 recorded in the Nepal region in this window. That is good news.</p>';
        }
        if(badge && latest.length){ badge.hidden = false; badge.textContent = latest.length; }
        var dot = document.getElementById('live-dot');
        if(dot && latest.length) dot.hidden = false;
        var mediaBadge = document.getElementById('media-badge');
        if(mediaBadge && videos.length){ mediaBadge.hidden = false; mediaBadge.textContent = videos.length; }

        var now = nptClock();
        if(statusEl) statusEl.textContent = 'Feed checked ' + now;
        if(feedTabStatus) feedTabStatus.textContent = 'Feed checked ' + now;

        var stamp = document.getElementById('statusbar-time');
        if(stamp){
          var newest = newestByTime(latest);
          stamp.textContent = newest && newest.time
            ? 'Feed checked ' + now + ' · latest source ' + PostCards.timeAgo(newest.time)
            : 'Feed checked ' + now + ' · no automatic reports yet';
        }
      })
      .catch(function(){
        function clearSkeletons(el){
          if(el && el.querySelector('.skeleton')) el.innerHTML = '';
        }
        clearSkeletons(feedEl);
        clearSkeletons(quakeEl);
        clearSkeletons(feedTabGrid);
        var feedTabSection = feedTabGrid && feedTabGrid.closest('section');
        if(feedTabSection && !feedTabSection.querySelector('.post-card')) feedTabSection.hidden = true;
        var ovUpd = document.getElementById('overview-updates');
        clearSkeletons(ovUpd);
        if(ovUpd && !ovUpd.querySelector('.post-card')){
          var ovPrev = ovUpd.closest('.preview');
          if(ovPrev) ovPrev.hidden = true;
        }
        clearSkeletons(videoGrid);
        if(modalEl) modalEl.innerHTML = '';
        if(statusEl) statusEl.textContent = 'Offline';
        if(feedTabStatus) feedTabStatus.textContent = 'Offline';
        if(videoStatus) videoStatus.textContent = 'Video feed unavailable';
        if(videoFreshness) videoFreshness.hidden = true;
        var ovV = document.getElementById('overview-videos');
        if(ovV && ovV.closest('.preview')) ovV.closest('.preview').hidden = true;
      });
  }

  function agoText(ms){
    var s = Math.round(ms / 1000);
    if(s < 45) return 'Sources checked just now';
    var m = Math.round(s / 60);
    if(m < 60) return 'Sources checked ' + m + (m === 1 ? ' minute ago' : ' minutes ago');
    var h = Math.round(m / 60);
    return 'Sources checked ' + h + (h === 1 ? ' hour ago' : ' hours ago');
  }
  setInterval(function(){
    if(!lastCheck) return;
    var t = agoText(Date.now() - lastCheck);
    if(feedTabStatus) feedTabStatus.textContent = t;
    if(statusEl) statusEl.textContent = t;
    renderVideoFreshness();
    var g = document.getElementById('glance-updated');
    if(g) g.textContent = t;
    var h = document.getElementById('hero-updated');
    // agoText already starts with "updated", so do not prefix it again
    if(h) h.textContent = t.charAt(0).toUpperCase() + t.slice(1);
  }, 5000);

  load();
  loadGlobal();
  setInterval(load, 60 * 1000);
  setInterval(loadGlobal, 60 * 1000);
  document.addEventListener('visibilitychange', function(){ if(!document.hidden) load(); });
  var refresh = document.getElementById('feed-refresh');
  if(refresh) refresh.addEventListener('click', load);

  return { load: load };
})();

(function(){
  function paint(startIso){
    var start = new Date(startIso).getTime();
    if(isNaN(start)) return;
    var days = Math.max(1, Math.floor((Date.now() - start) / 86400000) + 1);
    var el = document.getElementById('day-counter');
    if(el) el.textContent = 'Day ' + days;
    var chip = document.getElementById('hero-day');
    if(chip) chip.textContent = 'Day ' + days;
  }
  paint('2026-08-26T00:00:00+05:45');
  window.addEventListener('event-loaded', function(e){
    if(e.detail && e.detail.started) paint(e.detail.started);
  });
})();

(function(){
  var el = document.getElementById('official-check-status');
  if(!el) return;

  function escapeHtml(text){
    return String(text).replace(/[&<>"']/g, function(c){
      return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
    });
  }

  function loadOfficial(){
    return fetch('/api/official', { cache: 'no-store', signal: fetchDeadline(30000) })
      .then(function(r){ return r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status)); })
      .then(function(data){
        var latest = data.latest;
        if(!latest || !latest.pdf){
          el.textContent = ' No newer official report indexed on ndrrma.gov.np yet.';
          return;
        }
        el.innerHTML = ' Newest official report indexed on their site: <a href="' +
          escapeHtml(latest.pdf) + '" target="_blank" rel="noopener">' + escapeHtml(latest.title) +
          (latest.date ? ' (' + escapeHtml(latest.date) + ')' : '') + ' &#8599;</a>';
      })
      .catch(function(){
        el.textContent = ' (Could not check ndrrma.gov.np just now.)';
      });
  }

  loadOfficial();
  setInterval(loadOfficial, 5 * 60 * 1000);
  document.addEventListener('visibilitychange', function(){ if(!document.hidden) loadOfficial(); });
})();

(function(){
  var modal = document.getElementById('news-modal');
  var STORAGE_SEEN = 'news-seen-v2026-08-26';
  var STORAGE_OPT = 'news-popup-enabled';
  var lastFocus = null;

  function enabled(){
    try { return localStorage.getItem(STORAGE_OPT) !== 'off'; } catch(e){ return true; }
  }

  function open(){
    lastFocus = document.activeElement;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    document.getElementById('news-modal-close').focus();
  }

  function close(){
    modal.hidden = true;
    document.body.style.overflow = '';
    try { localStorage.setItem(STORAGE_SEEN, '1'); } catch(e){}
    if(lastFocus && lastFocus.focus) lastFocus.focus();
  }

  document.getElementById('news-modal-close').addEventListener('click', close);
  document.getElementById('news-modal-dismiss').addEventListener('click', close);
  var sbOpen = document.getElementById('statusbar-open');
  if(sbOpen) sbOpen.addEventListener('click', open);
  var reopen = document.getElementById('reopen-news');
  if(reopen) reopen.addEventListener('click', function(){
    if(window.closeHeaderPopovers) window.closeHeaderPopovers();
    open();
  });
  window.reopenMajorUpdate = open;
  modal.addEventListener('click', function(e){ if(e.target === modal) close(); });
  document.addEventListener('keydown', function(e){ if(e.key === 'Escape' && !modal.hidden) close(); });
  modal.querySelectorAll('[data-goto-tab]').forEach(function(b){ b.addEventListener('click', close); });

  var toggle = document.getElementById('toggle-popup');
  var state = document.getElementById('popup-state');
  function paintToggle(){
    if(!toggle) return;
    var on = enabled();
    toggle.setAttribute('aria-pressed', String(on));
    if(state) state.textContent = on ? 'On' : 'Off';
  }
  if(toggle) toggle.addEventListener('click', function(){
    try { localStorage.setItem(STORAGE_OPT, enabled() ? 'off' : 'on'); } catch(e){}
    paintToggle();
  });
  paintToggle();

  void STORAGE_SEEN;
})();

(function(){
  var log = document.getElementById('incident-log');
  var status = document.getElementById('incident-status');
  if(!log) return;

  var MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  function shortDate(iso){
    var d = new Date(iso);
    if(isNaN(d)) return '';
    return d.getDate() + ' ' + MONTHS[d.getMonth()];
  }

  function escapeHtml(text){
    return String(text == null ? '' : text).replace(/[&<>"']/g, function(c){
      return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
    });
  }

  function place(title, hazard){
    var text = String(title || '');
    var at = text.indexOf(' at ');
    if(at > -1 && text.slice(0, at).toLowerCase() === String(hazard).toLowerCase()){
      text = text.slice(at + 4);
    }
    return text.replace(/\s+,/g, ',').replace(/\s+/g, ' ').trim();
  }

  function toll(item){
    var parts = [];
    if(item.dead)    parts.push('<b>' + item.dead + '</b> dead');
    if(item.missing) parts.push('<b>' + item.missing + '</b> missing');
    if(item.injured) parts.push(item.injured + ' injured');
    return parts.length ? parts.join(' &middot; ') : 'no casualties recorded';
  }

  function row(item){
    return '<div class="log-row">' +
      '<time datetime="' + escapeHtml(item.date) + '">' + shortDate(item.date) + '</time>' +
      '<div class="what"><b>' + escapeHtml(item.hazard) + '</b> &middot; ' + escapeHtml(place(item.title, item.hazard)) +
        (item.titleNe ? '<span class="ne">' + escapeHtml(item.titleNe) + '</span>' : '') +
      '</div>' +
      '<div class="toll">' + toll(item) + '</div>' +
      '</div>';
  }

  function load(){
    return fetch('/api/incidents', { cache:'no-store', signal: fetchDeadline(30000) })
      .then(function(r){ return r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status)); })
      .then(function(data){
        var items = data.items || [];
        if(!items.length) throw new Error('no records');
        log.innerHTML =
          '<div class="log-head"><span>Date</span><span>Incident</span><span>People</span></div>' +
          items.map(row).join('');
        status.textContent = items.length + ' verified records';
      })
      .catch(function(){
        log.innerHTML = '<p style="font-size:0.88rem; color:var(--text-faint);">' +
          'Nepal\u2019s incident portal is not responding right now. It can be read directly at ' +
          '<a href="https://bipadportal.gov.np/" target="_blank" rel="noopener">bipadportal.gov.np</a>.</p>';
        status.textContent = 'Offline';
      });
  }

  var started = false;
  function maybeLoad(name){
    if(name !== 'live' || started) return;
    started = true;
    load();
    // The government endpoint itself is cached for five minutes. Match that
    // clock so a visitor sees a new official incident as soon as this site can.
    setInterval(load, 5 * 60 * 1000);
  }
  Tabs.onChange(maybeLoad);
  maybeLoad(Tabs.current);
})();

(function(){
  var gallery = document.getElementById('media-gallery');
  var status  = document.getElementById('media-status');
  var strip   = document.getElementById('overview-photos');
  if(!gallery && !strip) return;

  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"]/g, function(c){
    return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c];
  }); }

  function dateOf(slug){
    var m = /(\d{4})-(\d{2})-(\d{2})/.exec(slug || '');
    return m ? m[1] + m[2] + m[3] : '00000000';
  }

  function captionOfSlug(slug){
    var tail = String(slug || '').replace(/^updates-/, '').replace(/^\d{4}-\d{2}-\d{2}-/, '');
    tail = tail.replace(/-/g, ' ').trim();
    if(!tail) return 'From the flood zone';
    return tail.charAt(0).toUpperCase() + tail.slice(1);
  }

  var STRIP_SIZES = '(max-width:640px) calc(50vw - 54px), (min-width:1081px) 290px, calc(25vw - 50px)';

  function paintStrip(items){
    if(!strip || !items.length) return false;
    strip.innerHTML = items.slice(0, 4).map(function(it){
      var inner =
        '<img src="' + esc(it.src) + '" ' +
        (it.srcset ? 'srcset="' + esc(it.srcset) + '" sizes="' + STRIP_SIZES + '" ' : '') +
        'alt="' + esc(it.caption) + '" loading="lazy" decoding="async">' +
        '<span class="cap"><b' + (/[\u0900-\u097F]/.test(it.caption || '') ? ' lang="ne"' : '') + '>' + esc(it.caption) + '</b>' +
        (it.credit ? '<i>' + esc(it.credit) + '</i>' : '') + '</span>';
      if(!it.href) return '<span class="ph">' + inner + '</span>';
      var away = /^https?:/i.test(it.href) ? ' target="_blank" rel="noopener"' : '';
      return '<a href="' + esc(it.href) + '"' + away + '>' + inner + '</a>';
    }).join('');
    var wrap = strip.closest('.preview');
    if(wrap) wrap.hidden = false;
    return true;
  }

  Promise.all([
    fetch('/assets/photos/index.json', { cache: 'no-cache' })
      .then(function(r){ return r.ok ? r.json() : null; }).catch(function(){ return null; }),
    fetch('/updates.json', { cache: 'no-cache' })
      .then(function(r){ return r.ok ? r.json() : null; }).catch(function(){ return null; })
  ]).then(function(both){
    var manifest = both[0];
    var index = both[1];
    if(!manifest) throw new Error('no manifest');

    var byKey = {};
    ((index && index.updates) || []).forEach(function(u){
      var slug = String(u.url || '').replace(/^\/|\/$/g, '').replace(/\//g, '-');
      if(slug) byKey[slug] = u;
    });

    var picks = Object.keys(manifest)
      .filter(function(slug){
        var entry = manifest[slug];
        return entry && entry.file && /^image\//.test(entry.type || 'image/jpeg') && byKey[slug];
      })
      .sort(function(a, b){ return dateOf(b).localeCompare(dateOf(a)); })
      .map(function(slug){
        var entry = manifest[slug];
        var post = byKey[slug];
        return {
          src: '/assets/photos/' + entry.file,
          srcset: entry.card && entry.width
            ? '/assets/photos/' + entry.card + ' 800w, /assets/photos/' + entry.file + ' ' + entry.width + 'w'
            : '',
          href: post.url,
          credit: entry.credit || null,
          caption: post.title || captionOfSlug(slug)
        };
      });
    if(!paintStrip(picks)) throw new Error('nothing to show');
  }).catch(function(){
    var wrap = strip && strip.closest('.preview');
    if(wrap) wrap.hidden = true;
  });

  if(!gallery) return;

  var CURATED = [
    'File:Mudslide at Gyirong Port 1.webm',
    'File:Mudslide at Gyirong Port 2.webm',
    'File:ISS010-E-10632 - View of China - Kyirong Tsangpo Valley - Himalayas - Ganesh VII - Langbo Kangri Riogbanba - Zhogdam Kangri - Kyirong-Naixar - Sangchen Chu - Lende Khola Valley (cropped).jpg',
    'File:Bhotekoshi River.jpg',
    'File:Trishuli River Trishuli Nadi Nepal.jpg',
    'File:Rasuwa Fort 01.JPG'
  ];

  var CAPTIONS = {
    'Mudslide at Gyirong Port 1': 'The flood at Gyirong Port, on the Chinese side of the Rasuwagadhi crossing, filmed on the day.',
    'Mudslide at Gyirong Port 2': 'A second view of the same event at Gyirong Port, 26 August 2026.',
    'ISS010-E-10632': 'The valley the water came down, photographed from the International Space Station. The Lende Khola and Kyirong Tsangpo run through the middle of this frame.',
    'Bhotekoshi River': 'The Bhotekoshi in normal conditions. This is the river that rose without rain.',
    'Trishuli River Trishuli Nadi Nepal': 'The Trishuli further downstream, the same water under its second name.',
    'Rasuwa Fort 01': 'Rasuwa Fort, near the border crossing, before the flood.'
  };

  function captionFor(title){
    var bare = title.replace(/^File:/, '').replace(/\.[a-z0-9]+$/i, '');
    for(var key in CAPTIONS){ if(bare.indexOf(key) === 0) return CAPTIONS[key]; }
    return bare.replace(/_/g, ' ');
  }

  function stripTags(html){
    var div = document.createElement('div');
    div.innerHTML = html || '';
    var text = (div.textContent || '').replace(/\s+/g, ' ').trim();
    // Commons often nests the same author string twice, e.g. "Unknown authorUnknown author"
    var half = text.length / 2;
    if(text.length % 2 === 0 && text.slice(0, half) === text.slice(half)) text = text.slice(0, half);
    return text;
  }

  function card(page){
    var info = page.imageinfo && page.imageinfo[0];
    if(!info) return '';
    var meta = info.extmetadata || {};
    var author = stripTags(meta.Artist && meta.Artist.value) || 'Unknown author';
    var licence = stripTags(meta.LicenseShortName && meta.LicenseShortName.value) || 'See file page';
    var date = stripTags(meta.DateTimeOriginal && meta.DateTimeOriginal.value).slice(0, 10);
    var poster = info.thumburl || info.url;
    var isVideo = (info.mime || '').indexOf('video') === 0;

    var media = isVideo
      ? '<video controls preload="none" poster="' + esc(poster) + '" playsinline><source src="' + esc(info.url) + '" type="' + esc(info.mime) + '">Your browser can’t play this video. <a href="' + esc(info.descriptionurl) + '">Open it on Wikimedia Commons</a>.</video>'
      : '<img src="' + esc(poster) + '" alt="' + esc(captionFor(page.title)) + '" loading="lazy">';

    return '<div class="media-card"><figure>' + media +
      '<figcaption>' + esc(captionFor(page.title)) +
      '<span class="credit">' + (date ? esc(date) + ' &middot; ' : '') + esc(author) + ' &middot; ' + esc(licence) +
      ' &middot; <a href="' + esc(info.descriptionurl) + '" target="_blank" rel="noopener">file page</a></span>' +
      '</figcaption></figure></div>';
  }

  var API = 'https://commons.wikimedia.org/w/api.php';
  var PROPS = '&prop=imageinfo&iiprop=url%7Cmime%7Cextmetadata&iiurlwidth=800&format=json&origin=*';

  function ask(query){
    return fetch(API + '?action=query' + PROPS + query)
      .then(function(r){ return r.ok ? r.json() : {}; })
      .catch(function(){ return {}; });
  }
  function fetchTitles(titles){ return ask('&titles=' + encodeURIComponent(titles.join('|'))); }
  function fetchCategory(name){
    return ask('&generator=categorymembers&gcmtype=file&gcmlimit=24&gcmtitle=' +
      encodeURIComponent('Category:' + name));
  }
  function fetchSearch(query){
    return ask('&generator=search&gsrnamespace=6&gsrlimit=14&gsrsearch=' + encodeURIComponent(query));
  }

  var CATEGORIES = ['2026 Nepal floods', 'Rasuwa District', 'Gyirong County'];
  var SEARCHES = [
    'Gyirong flood', 'Rasuwagadhi', 'Bhotekoshi river', 'Trishuli river Nepal',
    'Syabrubesi', 'Langtang valley', 'glacial lake outburst flood Nepal',
    'Nepal flood rescue', 'Nepal Army rescue flood'
  ];

  var jobs = [fetchTitles(CURATED)]
    .concat(CATEGORIES.map(fetchCategory))
    .concat(SEARCHES.map(fetchSearch));

  Promise.all(jobs)
    .then(function(responses){
      var pages = [];
      var seen = {};

      var byTitle = {};
      var first = responses[0] && responses[0].query && responses[0].query.pages;
      if(first) Object.keys(first).forEach(function(key){ byTitle[first[key].title] = first[key]; });
      CURATED.forEach(function(title){
        if(byTitle[title] && !seen[title]){ pages.push(byTitle[title]); seen[title] = true; }
      });

      responses.slice(1).forEach(function(response){
        var found = response && response.query && response.query.pages;
        if(!found) return;
        Object.keys(found).forEach(function(key){
          var page = found[key];
          var info = page.imageinfo && page.imageinfo[0];
          if(seen[page.title] || !info) return;
          if(/logo|icon|flag of|coat of arms|\.svg$/i.test(page.title)) return;
          seen[page.title] = true;
          pages.push(page);
        });
      });

      pages = pages.slice(0, 30);
      var html = pages.map(card).filter(Boolean).join('');
      if(!html) throw new Error('nothing returned');
      gallery.innerHTML = html;
      if(status) status.textContent = pages.length + ' free-to-use files';
    })
    .catch(function(){
      gallery.innerHTML = '<div class="card" style="grid-column:1/-1; border:1px dashed var(--border-strong); border-radius:12px;">' +
        '<h3>Gallery couldn’t load</h3>' +
        '<p>Wikimedia Commons isn’t responding right now. The photo links below still work, and this gallery fills itself in as soon as Commons is reachable again.</p></div>';
      if(status) status.textContent = 'Offline';
    });
})();

(function(){
  var box = document.getElementById('cause-gallery');
  if(!box) return;
  var API = 'https://commons.wikimedia.org/w/api.php';
  var PROPS = '&prop=imageinfo&iiprop=url%7Cmime%7Cextmetadata&iiurlwidth=700&format=json&origin=*';
  var SEARCHES = ['Lende Khola', 'Kyirong Tsangpo valley', 'Gyirong County landscape',
    'Langtang glacier', 'glacial lake Tibet', 'Rasuwagadhi'];
  var loaded = false;
  function escapeHtml(text){
    return String(text == null ? '' : text).replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }

  function strip(html){
    var d = document.createElement('div'); d.innerHTML = html || '';
    return (d.textContent || '').replace(/\s+/g, ' ').trim();
  }
  function card(page){
    var info = page.imageinfo && page.imageinfo[0];
    if(!info || (info.mime || '').indexOf('image') !== 0) return '';
    if(/logo|icon|flag of|coat of arms|\.svg$/i.test(page.title)) return '';
    var m = info.extmetadata || {};
    var author = escapeHtml(strip(m.Artist && m.Artist.value) || 'Unknown author');
    var lic = escapeHtml(strip(m.LicenseShortName && m.LicenseShortName.value) || 'See file page');
    var name = escapeHtml(page.title.replace(/^File:/, '').replace(/\.[a-z0-9]+$/i, '').replace(/_/g, ' '));
    var src = String(info.thumburl || info.url);
    var filePage = String(info.descriptionurl || '');
    if(!/^https:\/\//.test(src)) return '';
    if(!/^https:\/\//.test(filePage)) filePage = 'https://commons.wikimedia.org/wiki/' + encodeURIComponent(page.title);
    return '<div class="media-card"><figure>' +
      '<img src="' + escapeHtml(src) + '" alt="' + name + '" loading="lazy" referrerpolicy="no-referrer">' +
      '<figcaption>' + name +
      '<span class="credit">' + author + ' &middot; ' + lic +
      ' &middot; <a href="' + escapeHtml(filePage) + '" target="_blank" rel="noopener">file page</a></span>' +
      '</figcaption></figure></div>';
  }

  function load(){
    if(loaded) return;
    loaded = true;
    Promise.all(SEARCHES.map(function(q){
      return fetch(API + '?action=query' + PROPS + '&generator=search&gsrnamespace=6&gsrlimit=6&gsrsearch=' + encodeURIComponent(q))
        .then(function(r){ return r.json(); }).catch(function(){ return {}; });
    })).then(function(responses){
      var seen = {}, html = '';
      responses.forEach(function(res){
        var pages = res.query && res.query.pages;
        if(!pages) return;
        Object.keys(pages).forEach(function(k){
          var p = pages[k];
          if(seen[p.title]) return;
          seen[p.title] = true;
          html += card(p);
        });
      });
      box.innerHTML = html || '<p style="grid-column:1/-1; font-size:0.86rem; color:var(--text-faint);">No open-licence photos of this valley on Wikimedia Commons yet. The satellite map below still shows the area.</p>';
    }).catch(function(){
      loaded = false;
      box.innerHTML = '<p style="grid-column:1/-1; font-size:0.86rem; color:var(--text-faint);">Photos could not load. The satellite map below still works.</p>';
    });
  }

  var details = box.closest('details');
  if(details) details.addEventListener('toggle', function(){ if(details.open) load(); });
})();
} catch (e) { setTimeout(function () { throw e; }); }

/* block 6 */
try {
(function(){
  var root   = document.getElementById('shorts');
  var track  = document.getElementById('shorts-track');
  var sheet  = document.getElementById('short-sheet');
  var scrim  = document.getElementById('short-scrim');
  var sheetBody = document.getElementById('short-sheet-body');
  if(!root || !track) return;

  var items = [];
  var slides = [];
  var players = {};          // index -> YT.Player
  var ready = {};            // index -> true once the player says it is ready
  var active = -1;
  var apiState = 0;          // 0 not asked, 1 loading, 2 ready
  var apiWaiting = [];
  var raf = 0;
  var scrubbing = false;
  var pushed = false;
  var soundOn = false;       // set true only by a tap on the sound chip; sticks after that

  function netTier(){
    var c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if(!c) return 'fast';
    if(c.saveData) return 'slow';
    var e = c.effectiveType || '';
    if(e === '4g') return 'fast';
    if(e === '3g') return 'mid';
    if(e === '2g' || e === 'slow-2g') return 'slow';
    return 'fast';
  }
  function preloadCount(){
    var t = netTier();
    return t === 'fast' ? 2 : t === 'mid' ? 1 : 0;
  }
  function wantedQuality(){
    var t = netTier();
    return t === 'fast' ? 'hd720' : t === 'mid' ? 'medium' : 'small';
  }

  function esc(s){ return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function ytId(url){ return (String(url || '').match(/[?&]v=([\w-]{6,15})/) || [])[1] || ''; }
  function initials(name){
    var w = String(name || '?').trim().split(/\s+/);
    return ((w[0] || '?')[0] + (w[1] ? w[1][0] : '')).toUpperCase();
  }
  function clock(sec){
    sec = Math.max(0, Math.floor(sec || 0));
    var h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    var mm = h ? (m < 10 ? '0' + m : m) : m;
    return (h ? h + ':' : '') + mm + ':' + (s < 10 ? '0' + s : s);
  }
  function longDate(t){
    if(!t) return '';
    var d = new Date(t);
    if(isNaN(d)) return '';
    return d.toLocaleDateString(undefined, { day:'numeric', month:'long', year:'numeric' });
  }

  function setGutter(){
    root.style.setProperty('--shorts-gutter', 'env(safe-area-inset-bottom, 0px)');
  }

  function withApi(fn){
    if(apiState === 2) return fn();
    apiWaiting.push(fn);
    if(apiState) return;
    apiState = 1;
    var prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = function(){
      if(typeof prev === 'function') try{ prev(); }catch(e){}
      apiState = 2;
      var q = apiWaiting; apiWaiting = [];
      q.forEach(function(f){ try{ f(); }catch(e){} });
    };
    var s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(s);
  }

  function slideHtml(it, i){
    var id = ytId(it.url);
    var poster = it.image || (id ? 'https://i.ytimg.com/vi/' + id + '/hqdefault.jpg' : '');
    var desc = String(it.summary || '').trim();
    return '' +
    '<section class="short" data-i="' + i + '" data-yt="' + esc(id) + '">' +
      '<div class="short-stage">' +
        '<div class="short-frame">' +
          '<div class="short-mount" id="short-mount-' + i + '"></div>' +
          (poster ? '<img class="short-poster" referrerpolicy="no-referrer" src="' + esc(poster) + '" alt="">' : '') +
        '</div>' +
      '</div>' +
      '<div class="short-spinner" hidden></div>' +
      '<div class="short-tap"></div>' +
      '<div class="short-pulse"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"></path></svg></div>' +
      '<div class="short-speed"><svg viewBox="0 0 24 24"><path d="M4 5v14l8-7zM13 5v14l8-7z"></path></svg>2x speed</div>' +
      '<button class="short-sound" type="button"><svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9H4z"></path></svg>Tap for sound</button>' +
      '<div class="short-rail-btns">' +
        '<button class="short-share" type="button" aria-label="Share this video">' +
          '<svg viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.6" y1="13.5" x2="15.4" y2="17.5"></line><line x1="15.4" y1="6.5" x2="8.6" y2="10.5"></line></svg>' +
        '</button>' +
        '<span>Share</span>' +
      '</div>' +
      '<div class="short-info">' +
        '<div class="short-chan">' +
          '<span class="short-ava">' + (it.avatar
              ? '<img referrerpolicy="no-referrer" src="' + esc(it.avatar) + '" alt="" onerror="this.remove()">'
              : esc(initials(it.source))) + '</span>' +
          '<span class="short-name">' + esc(it.source || 'YouTube') + '</span>' +
        '</div>' +
        '<button class="short-text" type="button">' +
          '<span class="short-title">' + esc(window.tidyVideoTitle ? window.tidyVideoTitle(it.title) : it.title) + '</span>' +
          (desc ? '<span class="short-more">more</span>' : '') +
        '</button>' +
      '</div>' +
      '<div class="short-preview"><img referrerpolicy="no-referrer" src="' + esc(poster) + '" alt=""><div class="pv-time">0:00</div></div>' +
      '<div class="short-clock">0:00 / 0:00</div>' +
      '<div class="short-scrub">' +
        '<div class="short-rail">' +
          '<div class="short-buf"></div><div class="short-fill"></div><div class="short-knob"></div>' +
        '</div>' +
      '</div>' +
    '</section>';
  }

  function makePlayer(i){
    if(players[i]) return;
    var slide = slides[i];
    if(!slide) return;
    var vid = slide.getAttribute('data-yt');
    if(!vid) return;
    players[i] = true;   // claim the slot before the async API call
    withApi(function(){
      var mount = document.getElementById('short-mount-' + i);
      if(!mount) return;
      players[i] = new YT.Player(mount, {
        videoId: vid,
        playerVars: {
          autoplay: 1, mute: 1, controls: 0, disablekb: 1, fs: 0, rel: 0,
          modestbranding: 1, playsinline: 1, iv_load_policy: 3
        },
        events: {
          onReady: function(ev){
            ready[i] = true;
            try{ ev.target.setPlaybackQuality(wantedQuality()); }catch(e){}
            if(i === active) start(i);
          },
          onStateChange: function(ev){
            var s = ev.data;
            var spin = slide.querySelector('.short-spinner');
            if(spin) spin.hidden = (s !== YT.PlayerState.BUFFERING);
            if(s === YT.PlayerState.PLAYING){
              var p = slide.querySelector('.short-poster');
              if(p) p.hidden = true;
            }
            if(s === YT.PlayerState.ENDED && i === active){
              try{ ev.target.seekTo(0, true); ev.target.playVideo(); }catch(e){}
            }
          }
        }
      });
    });
  }

  function isPlayer(i){ return players[i] && ready[i] && typeof players[i].playVideo === 'function'; }

  function start(i){
    if(!isPlayer(i)) return;
    var p = players[i], slide = slides[i];
    var chip = slide && slide.querySelector('.short-sound');
    try{ p.playVideo(); }catch(e){}
    try{ if(soundOn) p.unMute(); }catch(e){}
    setTimeout(function(){
      if(i !== active || !isPlayer(i)) return;
      var st = -1, muted = true;
      try{ st = players[i].getPlayerState(); }catch(e){}
      try{ muted = players[i].isMuted(); }catch(e){}
      if(st !== YT.PlayerState.PLAYING && st !== YT.PlayerState.BUFFERING){
        try{ players[i].mute(); players[i].playVideo(); }catch(e){}
        muted = true;
      }
      if(chip) chip.classList.toggle('on', !!muted);
    }, 600);
  }

  function stop(i){
    if(isPlayer(i)){
      try{ players[i].pauseVideo(); players[i].setPlaybackRate(1); }catch(e){}
    }
  }

  function destroy(i){
    if(players[i] && typeof players[i].destroy === 'function'){
      try{ players[i].destroy(); }catch(e){}
    }
    delete players[i]; delete ready[i];
    var slide = slides[i];
    if(slide){
      var frame = slide.querySelector('.short-frame');
      if(frame && !frame.querySelector('.short-mount')){
        var d = document.createElement('div');
        d.className = 'short-mount'; d.id = 'short-mount-' + i;
        frame.insertBefore(d, frame.firstChild);
      }
      var poster = slide.querySelector('.short-poster');
      if(poster) poster.hidden = false;
      var chip = slide.querySelector('.short-sound');
      if(chip) chip.classList.remove('on');
      var spin = slide.querySelector('.short-spinner');
      if(spin) spin.hidden = true;
    }
  }

  function setActive(i){
    if(i === active) return;
    if(active >= 0) stop(active);
    active = i;
    var keepFrom = i - 1, keepTo = i + preloadCount();
    Object.keys(players).forEach(function(k){
      var n = Number(k);
      if(n < keepFrom || n > keepTo) destroy(n);
    });
    for(var n = i; n <= keepTo && n < slides.length; n++) makePlayer(n);
    if(isPlayer(i)) start(i);
  }

  var io = null;
  function watchSlides(){
    if(io) io.disconnect();
    io = new IntersectionObserver(function(entries){
      entries.forEach(function(en){
        if(en.isIntersecting && en.intersectionRatio > 0.6){
          setActive(Number(en.target.getAttribute('data-i')));
        }
      });
    }, { root: track, threshold: [0.6] });
    slides.forEach(function(s){ io.observe(s); });
  }

  function tick(){
    raf = requestAnimationFrame(tick);
    if(scrubbing || active < 0 || !isPlayer(active)) return;
    var p = players[active], slide = slides[active];
    if(!slide) return;
    var d = 0, t = 0, b = 0;
    try{ d = p.getDuration() || 0; t = p.getCurrentTime() || 0; b = p.getVideoLoadedFraction() || 0; }catch(e){ return; }
    var pct = d ? Math.min(1, t / d) : 0;
    var fill = slide.querySelector('.short-fill');
    var knob = slide.querySelector('.short-knob');
    var buf  = slide.querySelector('.short-buf');
    if(fill) fill.style.width = (pct * 100) + '%';
    if(knob) knob.style.left = (pct * 100) + '%';
    if(buf)  buf.style.width = (b * 100) + '%';
  }

  var hold = null, holdFired = false, downX = 0, downY = 0, downT = 0, moved = false;

  function pulse(slide, playing){
    var el = slide.querySelector('.short-pulse');
    if(!el) return;
    el.innerHTML = playing
      ? '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"></path></svg>'
      : '<svg viewBox="0 0 24 24"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"></path></svg>';
    el.classList.add('on');
    clearTimeout(el._t);
    el._t = setTimeout(function(){ el.classList.remove('on'); }, 420);
  }

  track.addEventListener('pointerdown', function(e){
    var tap = e.target.closest('.short-tap');
    if(!tap) return;
    var slide = tap.closest('.short');
    var i = Number(slide.getAttribute('data-i'));
    downX = e.clientX; downY = e.clientY; downT = Date.now();
    moved = false; holdFired = false;
    clearTimeout(hold);
    hold = setTimeout(function(){
      if(moved || !isPlayer(i)) return;
      var r = tap.getBoundingClientRect();
      if(downX < r.left + r.width * 0.55) return;   // right-hand side only
      holdFired = true;
      try{ players[i].setPlaybackRate(2); }catch(err){}
      var chip = slide.querySelector('.short-speed');
      if(chip) chip.classList.add('on');
    }, 380);
  });

  function endHold(e){
    var tap = e.target.closest ? e.target.closest('.short-tap') : null;
    clearTimeout(hold);
    if(!tap) return;
    var slide = tap.closest('.short');
    var i = Number(slide.getAttribute('data-i'));
    if(holdFired){
      holdFired = false;
      if(isPlayer(i)) try{ players[i].setPlaybackRate(1); }catch(err){}
      var chip = slide.querySelector('.short-speed');
      if(chip) chip.classList.remove('on');
      return;
    }
    if(moved || Date.now() - downT > 500) return;
    if(!isPlayer(i)) return;
    var st = -1;
    try{ st = players[i].getPlayerState(); }catch(err){}
    if(st === YT.PlayerState.PLAYING){
      try{ players[i].pauseVideo(); }catch(err){}
      pulse(slide, false);
    }else{
      try{ players[i].playVideo(); }catch(err){}
      pulse(slide, true);
    }
  }

  track.addEventListener('pointermove', function(e){
    if(Math.abs(e.clientY - downY) > 10 || Math.abs(e.clientX - downX) > 10) moved = true;
  });
  track.addEventListener('pointerup', endHold);
  track.addEventListener('pointercancel', function(e){
    clearTimeout(hold);
    if(holdFired){
      holdFired = false;
      var slide = e.target.closest ? e.target.closest('.short') : null;
      if(slide){
        var i = Number(slide.getAttribute('data-i'));
        if(isPlayer(i)) try{ players[i].setPlaybackRate(1); }catch(err){}
        var chip = slide.querySelector('.short-speed');
        if(chip) chip.classList.remove('on');
      }
    }
  });

  var scrubSlide = null, scrubIdx = -1, scrubTime = 0;

  function scrubTo(bar, clientX){
    var slide = scrubSlide;
    var r = bar.getBoundingClientRect();
    var pct = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    var d = 0;
    try{ d = players[scrubIdx].getDuration() || 0; }catch(e){}
    scrubTime = d * pct;
    var fill = slide.querySelector('.short-fill');
    var knob = slide.querySelector('.short-knob');
    if(fill) fill.style.width = (pct * 100) + '%';
    if(knob) knob.style.left = (pct * 100) + '%';
    var pv = slide.querySelector('.short-preview');
    if(pv){
      pv.classList.add('on');
      var half = pv.offsetWidth / 2;
      var x = Math.min(r.width - half, Math.max(half, clientX - r.left));
      pv.style.left = x + 'px';
      var lab = pv.querySelector('.pv-time');
      if(lab) lab.textContent = clock(scrubTime);
    }
    var cl = slide.querySelector('.short-clock');
    if(cl){ cl.classList.add('on'); cl.textContent = clock(scrubTime) + ' / ' + clock(d); }
  }

  track.addEventListener('pointerdown', function(e){
    var bar = e.target.closest('.short-scrub');
    if(!bar) return;
    scrubSlide = bar.closest('.short');
    scrubIdx = Number(scrubSlide.getAttribute('data-i'));
    if(!isPlayer(scrubIdx)) return;
    scrubbing = true;
    bar.classList.add('live');
    bar.setPointerCapture(e.pointerId);
    e.preventDefault();
    scrubTo(bar, e.clientX);
  });

  track.addEventListener('pointermove', function(e){
    if(!scrubbing) return;
    var bar = scrubSlide && scrubSlide.querySelector('.short-scrub');
    if(bar){ e.preventDefault(); scrubTo(bar, e.clientX); }
  });

  function endScrub(){
    if(!scrubbing) return;
    scrubbing = false;
    var slide = scrubSlide;
    var bar = slide && slide.querySelector('.short-scrub');
    if(bar) bar.classList.remove('live');
    if(slide){
      var pv = slide.querySelector('.short-preview');
      if(pv) pv.classList.remove('on');
      var cl = slide.querySelector('.short-clock');
      if(cl) cl.classList.remove('on');
    }
    if(isPlayer(scrubIdx)){
      try{ players[scrubIdx].seekTo(scrubTime, true); players[scrubIdx].playVideo(); }catch(e){}
    }
    scrubSlide = null; scrubIdx = -1;
  }
  track.addEventListener('pointerup', endScrub);
  track.addEventListener('pointercancel', endScrub);

  track.addEventListener('click', function(e){
    var sound = e.target.closest('.short-sound');
    if(sound){
      var i = Number(sound.closest('.short').getAttribute('data-i'));
      soundOn = true;
      if(isPlayer(i)) try{ players[i].unMute(); players[i].setVolume(100); players[i].playVideo(); }catch(err){}
      sound.classList.remove('on');
      return;
    }
    var share = e.target.closest('.short-share');
    if(share){
      var si = Number(share.closest('.short').getAttribute('data-i'));
      var it = items[si] || {};
      if(navigator.share){
        navigator.share({ title: document.title, text: it.title || document.title, url: location.origin + location.pathname }).catch(function(){});
      } else if(navigator.clipboard){
        navigator.clipboard.writeText(it.url || location.href);
        var lab = share.parentNode.querySelector('span');
        if(lab){ lab.textContent = 'Copied'; setTimeout(function(){ lab.textContent = 'Share'; }, 1400); }
      }
      return;
    }
    var more = e.target.closest('.short-text');
    if(more){
      openSheet(Number(more.closest('.short').getAttribute('data-i')));
    }
  });

  function openSheet(i){
    var it = items[i];
    if(!it) return;
    var desc = String(it.summary || '').trim() || 'No description was published with this video.';
    sheetBody.innerHTML =
      '<div class="ss-title">' + esc(window.tidyVideoTitle ? window.tidyVideoTitle(it.title) : it.title) + '</div>' +
      '<div class="ss-sub">' + esc(it.source || 'YouTube') +
        (it.time ? ' &middot; ' + esc(longDate(it.time)) : '') + '</div>' +
      '<div class="ss-desc">' + esc(desc) + '</div>' +
      '<a class="ss-link" href="' + esc(it.url) + '" target="_blank" rel="noopener">Open on YouTube</a>';
    sheet.hidden = false; scrim.hidden = false;
    requestAnimationFrame(function(){ sheet.classList.add('on'); scrim.classList.add('on'); });
  }
  function closeSheet(){
    sheet.classList.remove('on'); scrim.classList.remove('on');
    setTimeout(function(){ sheet.hidden = true; scrim.hidden = true; }, 260);
  }
  document.getElementById('short-sheet-close').addEventListener('click', closeSheet);
  scrim.addEventListener('click', closeSheet);

  function open(list, index){
    items = (list || []).filter(function(it){ return ytId(it.url); });
    if(!items.length) return false;
    var at = Math.max(0, Math.min(items.length - 1, index || 0));
    track.innerHTML = items.map(slideHtml).join('');
    slides = Array.prototype.slice.call(track.querySelectorAll('.short'));
    players = {}; ready = {}; active = -1;
    root.hidden = false;
    root.setAttribute('aria-hidden', 'false');
    document.body.classList.add('shorts-open');
    setGutter();
    track.scrollTop = at * track.clientHeight;
    watchSlides();
    setActive(at);
    if(!raf) raf = requestAnimationFrame(tick);
    if(!pushed){ try{ history.pushState({ shorts:1 }, ''); pushed = true; }catch(e){} }
    return true;
  }

  function close(fromPop){
    if(root.hidden) return;
    Object.keys(players).forEach(function(k){ destroy(Number(k)); });
    if(io) io.disconnect();
    if(raf){ cancelAnimationFrame(raf); raf = 0; }
    track.innerHTML = '';
    slides = []; items = []; active = -1;
    root.hidden = true;
    root.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('shorts-open');
    closeSheet();
    if(pushed && !fromPop){ pushed = false; try{ history.back(); }catch(e){} }
    if(fromPop) pushed = false;
  }

  document.getElementById('shorts-close').addEventListener('click', function(){ close(false); });
  window.addEventListener('popstate', function(){ if(!root.hidden) close(true); });
  document.addEventListener('keydown', function(e){
    if(root.hidden) return;
    if(e.key === 'Escape'){ sheet.hidden ? close(false) : closeSheet(); }
    if(e.key === 'ArrowDown' || e.key === 'ArrowUp'){
      e.preventDefault();
      track.scrollBy({ top: (e.key === 'ArrowDown' ? 1 : -1) * track.clientHeight, behavior:'smooth' });
    }
  });
  window.addEventListener('resize', function(){
    if(root.hidden) return;
    setGutter();
    if(active >= 0) track.scrollTop = active * track.clientHeight;
  });

  window.ShortsFeed = { open: open, close: close };
})();

(function(){
  var grid = document.getElementById('numgrid');
  if(!grid) return;

  var ICONS = {
    dead:    '<path d="M12 21s-7-4.35-9.5-9C1 8.5 3 4.5 7 4.5c2 0 3.5 1 5 3 1.5-2 3-3 5-3 4 0 6 4 4.5 7.5-1 2-3 4-5 5.5"></path><path d="M4.5 12.5h4l1.5-3 2.5 6 1.5-3h5"></path>',
    missing: '<circle cx="10.5" cy="10.5" r="6.5"></circle><path d="M15.5 15.5 21 21"></path><path d="M10.5 7.5v3l2 1.5"></path>',
    power:   '<path d="M3 21V11l5 3V11l5 3V8l8 4v9z"></path><path d="M3 21h18"></path><path d="M13 8V4l3-1v4"></path>',
    people:  '<circle cx="9" cy="8" r="3"></circle><path d="M3.5 19v-1c0-2.8 2.5-4.5 5.5-4.5s5.5 1.7 5.5 4.5v1"></path><path d="M16 5.5a3 3 0 0 1 0 5.8"></path><path d="M17.5 13.2c2 .6 3.5 2 3.5 4.3V19"></path>',
    day:     '<rect x="3.5" y="5" width="17" height="16" rx="2.5"></rect><path d="M3.5 10h17"></path><path d="M8 3v4M16 3v4"></path>',
    money:   '<ellipse cx="12" cy="6" rx="7" ry="3"></ellipse><path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6"></path><path d="M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6"></path>',
    relief:  '<rect x="2.5" y="6" width="19" height="12" rx="2.5"></rect><circle cx="12" cy="12" r="2.6"></circle><path d="M6 9.5v5M18 9.5v5"></path>',
    home:    '<path d="M3.5 11.2 12 4l8.5 7.2"></path><path d="M6 10.2V20h12v-9.8"></path>',
    quake:   '<path d="M2 12h3l2.5-7 4 14 3-9 2 2h5"></path>'
  };

  function esc(t){
    return String(t == null ? '' : t).replace(/[&<>"']/g, function(c){
      return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
    });
  }

  function daysSince(iso){
    var t = new Date(iso).getTime();
    if(isNaN(t)) return null;
    return Math.max(1, Math.floor((Date.now() - t) / 86400000) + 1);
  }

  function tile(stat, event){
    var value = stat.value;
    if(value === 'auto:day'){
      var d = daysSince(event.started);
      value = d ? 'Day ' + d : 'Day 1';
    }
    return '<button class="stat"' +
        (stat.id ? ' id="' + esc(stat.id) + '-stat"' : '') +
        ' data-label="' + esc(stat.label || '') + '"' +
        ' data-detail="' + esc(stat.detail || '') + '">' +
      '<span class="stat-ico" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
        'stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' +
        (ICONS[stat.icon] || ICONS.home) + '</svg></span>' +
      '<span class="n' + (stat.tone === 'critical' ? ' critical' : '') + (stat.small ? ' small' : '') + '"' +
        (stat.id ? ' id="' + esc(stat.id) + '-value"' : '') + '>' + esc(value) + '</span>' +
      '<span class="l">' + esc(stat.label || '') + '</span>' +
      '<span class="bar"><i style="width:' + (Number(stat.bar) || 0) + '%"></i></span>' +
    '</button>';
  }

  function apply(event){
    if(!event || !Array.isArray(event.stats) || !event.stats.length) return;

    grid.innerHTML = event.stats.map(function(st){ return tile(st, event); }).join('');

    var title = document.getElementById('numbers-title');
    if(title && event.numbersTitle) title.textContent = event.numbersTitle;

    var sub = document.getElementById('numbers-sub');
    if(sub){
      var line = event.numbersNote || event.name || '';
      if(event.asOf){
        var d = new Date(event.asOf);
        if(!isNaN(d.getTime())){
          try{
            line += ' · as of ' + d.toLocaleString('en-GB', {
              timeZone:'Asia/Kathmandu', day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'
            }) + ' NPT';
          }catch(e){}
        }
      }
      if(event.asOfSource) line += ' · ' + event.asOfSource;
      sub.textContent = line;
    }

    var h1 = document.querySelector('.hero h1');
    if(h1 && event.headline) h1.textContent = event.headline;
    var lede = document.querySelector('.hero .lede');
    if(lede && event.lede) lede.textContent = event.lede;

    document.querySelectorAll('[data-event-name]').forEach(function(el){
      el.textContent = event.name || '';
    });

    window.dispatchEvent(new CustomEvent('event-loaded', { detail: event }));
  }

  var LIVE_METRICS = {
    'confirmed dead': 'dead',
    'listed missing in Nepal': 'missing',
    'rescued so far': 'rescued'
  };

  var liveShown = {};      // metric -> the value currently painted
  var lastCheckedAt = 0;   // when the board last answered

  function fmtNum(n){
    var v = Number(n);
    return isNaN(v) ? String(n) : v.toLocaleString('en-US');
  }

  function nptTime(iso){
    var d = new Date(iso);
    if(isNaN(d.getTime())) return '';
    try{
      return d.toLocaleString('en-GB', {
        timeZone:'Asia/Kathmandu', day:'numeric', month:'short',
        hour:'2-digit', minute:'2-digit'
      }) + ' NPT';
    }catch(e){ return ''; }
  }

  function detailFor(fig, previous){
    var parts = [];
    var when = fig.statedTime ? ' at ' + fig.statedTime : '';
    parts.push((fig.source || 'Source') + when + ': ' + fmtNum(fig.value) + '.');

    if(previous && previous !== fig.value){
      parts.push(fig.value > previous
        ? 'Up from ' + fmtNum(previous) + '.'
        : 'Corrected down from ' + fmtNum(previous) + '.');
    }
    if(fig.time) parts.push('Published ' + nptTime(fig.time) + '.');
    if(fig.sentence) parts.push('“' + fig.sentence + '”');

    var others = (fig.others || []).filter(function(o){ return o && o.value !== fig.value; });
    if(others.length){
      parts.push('Also reported: ' + others.slice(0, 4).map(function(o){
        return fmtNum(o.value) + ' (' + (o.source || 'unnamed') +
          (o.scope === 'local' ? ', one area only' : '') + ')';
      }).join(', ') + '.');
    }
    return parts.join(' ');
  }

  function paintFigure(metric, label, fig){
    var tileEl = grid.querySelector('.stat[data-label="' + label + '"]');
    var previous = liveShown[metric];

    if(tileEl){
      var value = tileEl.querySelector('.n');
      if(value){
        if(previous == null){
          previous = Number(String(value.textContent).replace(/\D/g, '')) || null;
        }
        value.textContent = fmtNum(fig.value);
      }
      tileEl.setAttribute('data-detail', detailFor(fig, previous));
      if(tileEl.classList.contains('is-active')){
        var panel = document.getElementById('stat-detail');
        if(panel) panel.textContent = tileEl.getAttribute('data-detail');
      }
    }

    if(metric === 'dead'){
      document.querySelectorAll('#hero-figures .hf-stat:first-child .hf-n, #rail-figures .rail-fig:first-child .rf-n')
        .forEach(function(el){ el.textContent = fmtNum(fig.value); });
    }

    liveShown[metric] = fig.value;
  }

  function paintLiveNote(data){
    var sub = document.getElementById('numbers-sub');
    if(!sub) return;

    var moved = Object.keys(data.changed || {});
    var note = document.getElementById('live-figures-note');

    if(!moved.length){
      if(note) note.remove();
      return;
    }
    if(!note){
      note = document.createElement('span');
      note.id = 'live-figures-note';
      sub.appendChild(note);
    }
    note.textContent = ' · Live: ' + moved.map(function(m){
      var c = data.changed[m];
      var fig = data.board[m] || {};
      return fmtNum(c.to) + ' ' + m + (c.direction === 'down' ? ' (corrected down)' : '') +
        (fig.source ? ', ' + fig.source : '');
    }).join(' · ');
  }

  function paintDistricts(data){
    var d = data && data.districts;
    if(!d || !d.rows || d.rows.length < 2) return;
    var table = document.getElementById('toll-districts');
    if(table){
      var body = table.querySelector('tbody');
      if(body){
        body.textContent = '';
        d.rows.forEach(function(row){
          var tr = document.createElement('tr');
          var name = document.createElement('td');
          name.textContent = row.district;
          var count = document.createElement('td');
          count.className = 'num-cell';
          count.textContent = fmtNum(row.value);
          tr.appendChild(name); tr.appendChild(count);
          body.appendChild(tr);
        });
      }
    }
    var note = document.getElementById('toll-districts-note');
    if(note){
      var headEl = document.querySelector('#toll-accord .toll-n');
      var headline = headEl ? parseInt(String(headEl.textContent).replace(/[^0-9]/g, ''), 10) : NaN;
      var total = Number(d.total) || 0;
      var gap = '';
      if(isFinite(headline) && headline && total){
        if(headline > total){
          gap = 'The headline figure above is higher, at ' + fmtNum(headline) +
            ': it takes the newest national total any source has published, and this bulletin ' +
            'is the newest one broken down by district.';
        } else if(headline < total){
          gap = 'The headline figure above is lower, at ' + fmtNum(headline) +
            ': it takes the newest national total any source has published, and this police ' +
            'bulletin counts ' + fmtNum(total - headline) + ' more.';
        } else {
          gap = 'The headline figure above is the same total, from the same count.';
        }
      }
      note.textContent = (d.source || 'Nepal Police') + ' bulletin' +
        (d.time ? ', ' + nptTime(d.time) : '') +
        ', totalling ' + fmtNum(total) + ', which is the same total the bulletin itself states. ' + gap;
    }
  }

  function applyBoard(data){
    if(!data || !data.board) return;
    for(var label in LIVE_METRICS){
      if(!Object.prototype.hasOwnProperty.call(LIVE_METRICS, label)) continue;
      var metric = LIVE_METRICS[label];
      var fig = data.board[metric];
      if(!fig || typeof fig.value !== 'number') continue;
      if(liveShown[metric] === fig.value) continue;
      paintFigure(metric, label, fig);
    }
    paintLiveNote(data);
    paintDistricts(data);
    window.__liveFigures = data;
    window.dispatchEvent(new CustomEvent('live-figures', { detail: data }));
  }

  function paintFreshness(){
    var el = document.getElementById('figures-checked');
    if(!el || !lastCheckedAt) return;
    var s = Math.max(0, Math.round((Date.now() - lastCheckedAt) / 1000));
    el.textContent = s < 2 ? 'Sources checked just now'
      : s < 60 ? 'Sources checked ' + s + 's ago'
      : 'Sources checked ' + Math.round(s / 60) + ' min ago';
  }

  var inFlight = false;
  function pollFigures(){
    if(inFlight || document.hidden) return;
    inFlight = true;
    fetch('/api/figures')
      .then(function(r){ return r.ok ? r.json() : null; })
      .then(function(data){
        if(!data) return;
        lastCheckedAt = Date.parse(data.checkedAt || data.updated) || Date.now();
        applyBoard(data);
        paintFreshness();
      })
      .catch(function(){ /* the built figures stand */ })
      .then(function(){ inFlight = false; });
  }

  fetch('/event.json', { cache:'no-cache' })
    .then(function(r){ return r.ok ? r.json() : null; })
    .then(function(event){ apply(event); pollFigures(); })
    .catch(function(){ /* fallback markup stays */ });

  setInterval(pollFigures, 30000);
  setInterval(paintFreshness, 1000);
  document.addEventListener('visibilitychange', function(){ if(!document.hidden) pollFigures(); });
})();

(function(){
  var run = document.getElementById('statusbar-run');
  var run2 = document.getElementById('statusbar-run2');
  if(!run) return;

  function esc(v){
    return String(v == null ? '' : v).replace(/[&<>"']/g, function(c){
      return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
    });
  }

  var CALLS = [
    ['Police', '100'],
    ['Ambulance', '102'],
    ['Disaster hotline', '1149'],
  ];

  function items(event, newest){
    var out = [];
    if(event && event.name){
      var lede = String(event.lede || '').split('. ')[0];
      out.push('<a class="sb-item" href="#overview" data-tab-link="overview">' +
        '<b>' + esc(String(event.name).toUpperCase()) + '</b>' +
        (lede ? '&nbsp;&nbsp;' + esc(lede) : '') + '</a>');
    }
    (event && event.stats ? event.stats : []).slice(0, 5).forEach(function(st){
      if(!st || !st.value || st.value === 'auto:day') return;
      out.push('<a class="sb-item" href="#overview" data-tab-link="overview">' +
        '<b>' + esc(st.value) + '</b>&nbsp;' + esc(st.label || '') + '</a>');
    });
    if(newest && newest.title && newest.url){
      out.push('<a class="sb-item" href="' + esc(newest.url) + '"><b>LATEST</b>&nbsp;&nbsp;' +
        esc(newest.title) + '</a>');
    }
    CALLS.forEach(function(c){
      out.push('<a class="sb-item sb-call" href="tel:' + c[1] + '">' +
        esc(c[0]) + ' ' + c[1] + '</a>');
    });
    return out;
  }

  function paint(event, newest){
    var list = items(event, newest);
    if(!list.length) return;
    var html = list.join('<span class="sb-sep" aria-hidden="true">&#9670;</span>') +
      '<span class="sb-sep" aria-hidden="true">&#9670;</span>';
    run.innerHTML = html;
    if(run2) run2.innerHTML = html;

    var width = run.scrollWidth;
    if(width){
      var seconds = Math.max(24, Math.min(90, Math.round(width / 55)));
      run.style.animationDuration = seconds + 's';
      if(run2) run2.style.animationDuration = seconds + 's';
    }
  }

  var currentEvent = null;
  var currentNewest = null;

  function withLiveToll(event, live){
    if(!event || !live || !Array.isArray(event.stats)) return event;
    var next = Object.assign({}, event);
    next.stats = event.stats.map(function(stat){
      return stat && (stat.icon === 'dead' || stat.label === 'confirmed dead')
        ? Object.assign({}, stat, { value: String(live.dead) })
        : stat;
    });
    return next;
  }

  window.addEventListener('event-loaded', function(e){
    currentEvent = withLiveToll(e.detail, window.__liveToll);
    paint(currentEvent, currentNewest);
  });

  window.addEventListener('live-toll', function(e){
    currentEvent = withLiveToll(currentEvent, e.detail);
    paint(currentEvent, currentNewest);
  });

  fetch('/event.json', { cache:'force-cache' })
    .then(function(r){ return r.ok ? r.json() : null; })
    .then(function(ev){
      if(ev && ev.stats && !currentEvent){ currentEvent = withLiveToll(ev, window.__liveToll); paint(currentEvent, currentNewest); }
    })
    .catch(function(){});

  fetch('/updates.json', { cache:'no-cache' })
    .then(function(r){ return r.ok ? r.json() : null; })
    .then(function(a){
      if(a && a.updates && a.updates.length){
        currentNewest = a.updates[0];
        paint(currentEvent, currentNewest);
      }
    })
    .catch(function(){});

  paint(null, null);
})();

(function(){
  var grids = [document.getElementById('today-grid-home'), document.getElementById('today-grid')]
    .filter(function(el){ return el; });
  if(!grids.length) return;

  function esc(s){
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
      return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
    });
  }

  function fmtUpdated(iso){
    var d = new Date(iso);
    if(isNaN(d.getTime())) return '';
    try{
      return d.toLocaleString('en-GB', { timeZone:'Asia/Kathmandu', day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' }) + ' NPT';
    }catch(e){
      return String(iso).slice(0, 16).replace('T', ' ') + ' NPT';
    }
  }

  function stamp(iso){
    var d = new Date(iso);
    if(isNaN(d.getTime())) return 'Today';
    var same = false;
    try{
      var f = { timeZone:'Asia/Kathmandu', day:'numeric', month:'short' };
      same = d.toLocaleDateString('en-GB', f) === new Date().toLocaleDateString('en-GB', f);
    }catch(e){}
    var t = '';
    try{
      t = d.toLocaleTimeString('en-GB', { timeZone:'Asia/Kathmandu', hour:'2-digit', minute:'2-digit' });
    }catch(e){ t = String(iso).slice(11, 16); }
    return (same ? 'Today' : fmtUpdated(iso).split(',')[0]) + ', ' + t + ' NPT';
  }

  function permalink(post){
    if(post && post.permalink) return post.permalink;
    if(!post || !post.time) return '';
    var d = new Date(post.time);
    if(isNaN(d.getTime())) return '';
    var npt = new Date(d.getTime() + (345 + d.getTimezoneOffset()) * 60000);
    var day = npt.getFullYear() + '-' + String(npt.getMonth() + 1).padStart(2, '0') + '-' + String(npt.getDate()).padStart(2, '0');
    var slug = String(post.id || post.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70);
    return slug ? '/updates/' + day + '-' + slug + '/' : '';
  }

  var OG_VERSIONS = (function(){
    try {
      var el = document.getElementById('og-versions');
      var raw = el.textContent.replace(/<!--[\s\S]*?-->/g, '').trim();
      return JSON.parse(raw) || {};
    }
    catch(e){ return {}; }
  })();
  function ogAsset(name){
    if(!name) return '';
    return OG_VERSIONS[name] || ('/assets/og/' + name);
  }

  var PHOTO_CREDITS = {};
  var PHOTO_FILES = {};
  var PHOTO_RECORDS = {};
  var CARD_SIZES = '(min-width:575px) 400px, (min-resolution:2.5dppx) calc((100vw - 32px) * 2 / 3), calc(100vw - 32px)';
  function photoSrcset(rec){
    if(!rec || !rec.card || !rec.width) return '';
    return '/assets/photos/' + rec.card + ' 800w, /assets/photos/' + rec.file + ' ' + rec.width + 'w';
  }
  fetch('/assets/photos/index.json', { cache:'no-cache' })
    .then(function(r){ return r.ok ? r.json() : null; })
    .then(function(j){
      if(!j) return;
      Object.keys(j).forEach(function(k){
        PHOTO_CREDITS[k] = j[k] && j[k].credit;
        PHOTO_FILES[k] = j[k] && j[k].file;
        PHOTO_RECORDS[k] = j[k];
      });
      repaint();
    })
    .catch(function(){});

  function creditLine(ogSlug, usedRemote, post){
    var outlet = post.sources && post.sources[0] && post.sources[0].name;
    var shot = PHOTO_CREDITS[ogSlug];
    if(shot && shot.indexOf('.') !== -1 && outlet) shot = outlet;
    if(usedRemote && outlet) return 'Photograph: ' + outlet;
    if(shot) return 'Photograph: ' + shot;
    return 'Graphic' + (outlet ? ': figures from ' + outlet : '');
  }

  function agoText(iso){
    var t = Date.parse(iso);
    if(!isFinite(t)) return '';
    var mins = Math.round((Date.now() - t) / 60000);
    if(mins < 1) return 'just now';
    if(mins < 60) return mins + ' min ago';
    var hrs = Math.round(mins / 60);
    if(hrs < 24) return hrs + ' h ago';
    var days = Math.round(hrs / 24);
    return days + ' d ago';
  }

  var renderRun = 0;
  function card(post, i){
    var uid = 'today-' + renderRun + '-' + (post.id ? String(post.id).replace(/[^\w-]/g, '') : i) + '-' + i;
    var paras = Array.isArray(post.body) ? post.body : (post.body ? [post.body] : []);
    var ne = function(t){ return /[\u0900-\u097F]/.test(String(t || '')) ? ' lang="ne"' : ''; };
    var bodyHtml = paras.map(function(p){ return '<p' + ne(p) + '>' + esc(p) + '</p>'; }).join('');
    var url = post.sources && post.sources[0] && post.sources[0].url ? post.sources[0].url : (post.url || '');

    var srcHtml = (post.sources || []).map(function(s){
      var n = esc(s.name || s.url || '');
      return s.url ? '<a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + n + '</a>' : n;
    }).join(', ');

    var rev = post.revised ? ' <span class="rev">updated</span>' : (post.earlier ? ' <span class="rev earlier">earlier</span>' : '');

    var perma = permalink(post);
    var ogSlug = perma ? perma.replace(/^\/|\/$/g, '').replace(/\//g, '-') : '';

    var saved = PHOTO_FILES[ogSlug] ? '/assets/photos/' + PHOTO_FILES[ogSlug] : '';
    var img = saved || post.image || '';
    var set = saved ? photoSrcset(PHOTO_RECORDS[ogSlug]) : '';
    var backup = saved && post.image ? post.image : '';
    var credit = img ? creditLine(ogSlug, !saved, post) : '';
    var ago = agoText(post.time);

    var media = '';
    if(img){
      var tag = '<img class="post-photo" loading="lazy" decoding="async" referrerpolicy="no-referrer" ' +
        'src="' + esc(img) + '" ' + (set ? 'srcset="' + esc(set) + '" sizes="' + CARD_SIZES + '" ' : '') +
        'alt="' + esc(post.title || '') + '" width="800" height="450" ' +
        'data-backup="' + esc(backup) + '" ' +
        'onerror="var b=this.getAttribute(\'data-backup\'); ' +
          'if(b){ this.removeAttribute(\'data-backup\'); this.src=b; return; } ' +
          'this.closest(\'.tc-media\').classList.add(\'tc-media-blank\'); this.remove();">';
      media = '<div class="tc-media">' +
        (perma ? '<a class="post-photo-link" href="' + esc(perma) + '" tabindex="-1" aria-hidden="true">' + tag + '</a>' : tag) +
      '</div>';
    }

    return (
      '<article class="post-card today-card' + (img ? '' : ' no-photo') +
        '" data-url="' + esc(url) + '" data-title="' + esc(post.title || '') + '"' +
        (perma ? ' data-permalink="' + esc(perma) + '"' : '') +
        (ogSlug && ogAsset(ogSlug + '-story.png')
          ? ' data-story="' + esc(ogAsset(ogSlug + '-story.png')) + '"' : '') + '>' +
        media +
        '<div class="post-body">' +
          '<p class="tc-kicker">' + esc(stamp(post.time)) + rev +
            (ago ? '<span class="tc-when">' + esc(ago) + '</span>' : '') + '</p>' +
          (post.title
            ? '<p class="tc-title"' + ne(post.title) + '>' + (perma
                ? '<a href="' + esc(perma) + '">' + esc(post.title) + '</a>'
                : esc(post.title)) + '</p>'
            : '') +
          '<div class="post-summary clamped" id="' + uid + '" data-expand="' + uid + '">' + bodyHtml + '</div>' +
          (credit ? '<p class="tc-credit">' + esc(credit) + '</p>' : '') +
          (srcHtml ? '<div class="tc-sources"><b>Sources:</b> ' + srcHtml + '</div>' : '') +
        '</div>' +
        '<div class="post-foot">' +
          (perma
            ? '<a class="post-btn" href="' + esc(perma) + '">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16M4 12h16M4 19h10"></path></svg>Full briefing' +
            '</a>'
            : '') +
          '<button class="post-btn" type="button" data-share="1">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.6" y1="13.5" x2="15.4" y2="17.5"></line><line x1="15.4" y1="6.5" x2="8.6" y2="10.5"></line></svg>Share' +
          '</button>' +
          (url
            ? '<button class="post-btn" type="button" data-open="1">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"></path><path d="M15 3h6v6"></path><path d="M10 14L21 3"></path></svg>Open source' +
            '</button>'
            : '') +
        '</div>' +
      '</article>'
    );
  }

  function newestFirst(posts){
    return (posts || []).slice().sort(function(a, b){
      var at = a && a.time ? new Date(a.time).getTime() : NaN;
      var bt = b && b.time ? new Date(b.time).getTime() : NaN;
      at = isNaN(at) ? -Infinity : at;
      bt = isNaN(bt) ? -Infinity : bt;
      return bt - at;
    });
  }

  var HOME_MAX = 8;

  function river(list){
    if(!list.length) return '';
    renderRun++;
    return '<div class="river">' + list.map(card).join('') + '</div>';
  }

  function packHtml(posts){
    return river(posts);
  }

  var LAST = null;
  function repaint(){ if(LAST) render(LAST); }

  var PAGE = 24;
  var shown = PAGE;
  var moreWatch = null;
  function watchMore(btn){
    if(moreWatch){ moreWatch.disconnect(); moreWatch = null; }
    if(!btn || !('IntersectionObserver' in window)) return;
    moreWatch = new IntersectionObserver(function(es){
      es.forEach(function(e){ if(e.isIntersecting) showMore(); });
    }, { rootMargin:'700px 0px' });
    moreWatch.observe(btn);
  }
  function showMore(){
    if(moreWatch){ moreWatch.disconnect(); moreWatch = null; }
    shown += PAGE;
    repaint();
  }
  document.addEventListener('click', function(e){
    if(e.target.closest('.today-more-btn')) showMore();
  });

  function render(d){
    LAST = d;
    var posts = newestFirst((d && Array.isArray(d.posts)) ? d.posts : []);
    var stampLine = d && d.updated
      ? '<p class="today-updated">Updated ' + esc(fmtUpdated(d.updated)) + '</p>' : '';
    var empty = '<p style="font-size:0.92rem; color:var(--text-muted);">Nothing new to report this hour. See the <a href="#live" data-tab-link="live">Live</a> tab for the raw feed.</p>';

    grids.forEach(function(g){
      if(!posts.length){ g.innerHTML = empty; return; }
      var isHome = g.id === 'today-grid-home';
      if(isHome){
        g.innerHTML = river(posts.slice(0, HOME_MAX)) +
          (posts.length > HOME_MAX
            ? '<p class="today-more"><a class="deeplink" href="#today" data-tab-link="today">' +
              'All ' + posts.length + ' stories of the day</a></p>'
            : '') + stampLine;
        return;
      }
      var n = Math.min(posts.length, shown);
      var left = posts.length - n;
      g.innerHTML = packHtml(posts.slice(0, n)) +
        (left > 0
          ? '<p class="today-more"><button type="button" class="deeplink today-more-btn">' +
            'Show ' + Math.min(PAGE, left) + ' more of ' + posts.length + ' briefings</button></p>'
          : '') + stampLine;
      watchMore(left > 0 ? g.querySelector('.today-more-btn') : null);
    });
  }

  document.addEventListener('click', function(e){
    var btn = e.target.closest('.tc-more');
    if(!btn) return;
    var p = document.getElementById(btn.getAttribute('data-expand'));
    if(p) btn.textContent = p.classList.contains('clamped') ? 'Read more' : 'Read less';
  });

  function fill(d){
    var posts = newestFirst((d && Array.isArray(d.posts)) ? d.posts : []);
    if(posts.length >= 8) { render(d); return; }
    var have = {};
    posts.forEach(function(p){ var u = permalink(p); if(u) have[u] = 1; });
    fetch('/updates.json', { cache:'no-cache' })
      .then(function(r){ return r.ok ? r.json() : null; })
      .then(function(a){
        var extra = ((a && a.updates) || [])
          .filter(function(u){ return u.url && !have[u.url]; })
          .slice(0, 12 - posts.length)
          .map(function(u){
            return {
              id: u.url, permalink: u.url, title: u.title, time: u.time,
              body: [u.summary], sources: [], earlier: true
            };
          });
        render({ updated: d && d.updated, posts: newestFirst(posts.concat(extra)) });
      })
      .catch(function(){ render(d); });
  }

  var lastTodayUpdated = '';
  function refreshToday(){
    fetch('/today.json', { cache:'no-cache' })
      .then(function(r){ if(!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function(data){
        if(data && data.updated && data.updated === lastTodayUpdated) return;
        if(data && data.updated) lastTodayUpdated = data.updated;
        fill(data);
      })
      .catch(function(){
        grids.forEach(function(g){
          if(g.getAttribute('data-ssr') === '1' && g.textContent.trim()) return;
          g.innerHTML = '<p style="font-size:0.92rem; color:var(--text-muted);">Today&rsquo;s posts are not up yet. See the <a href="#live" data-tab-link="live">Live</a> tab.</p>';
        });
      });
  }
  refreshToday();
  setInterval(refreshToday, 60 * 1000);
  document.addEventListener('visibilitychange', function(){ if(!document.hidden) refreshToday(); });
})();
} catch (e) { setTimeout(function () { throw e; }); }

/* block 7 */
try {
(function(){
  var ticker = document.getElementById('live-ticker');
  if(!ticker) return;

  function npt(iso){
    var d = new Date(iso);
    if(isNaN(d.getTime())) return '';
    try{
      return d.toLocaleString('en-GB', { timeZone:'Asia/Kathmandu', day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' }) + ' NPT';
    }catch(e){ return ''; }
  }
  function age(iso){
    var ms = Date.now() - new Date(iso).getTime();
    if(!isFinite(ms) || ms < 0) return '';
    var min = Math.round(ms / 60000);
    if(min < 2) return 'just now';
    if(min < 60) return min + ' min ago';
    var hours = Math.round(min / 60);
    return hours < 48 ? hours + ' h ago' : Math.round(hours / 24) + ' d ago';
  }
  function safeLink(url){
    try { return new URL(url).protocol === 'https:' ? url : ''; } catch(e) { return ''; }
  }
  function render(items, updated){
    var list = ticker.querySelector('ol');
    var stamp = ticker.querySelector('.tk-when');
    if(!list || !items.length) return;
    list.replaceChildren();
    items.slice(0, 5).forEach(function(item){
      var href = safeLink(item.url);
      if(!href || !item.title) return;
      var li = document.createElement('li');
      var time = document.createElement('time');
      time.dateTime = item.time || '';
      var relative = document.createElement('span');
      relative.className = 'tk-ago';
      relative.textContent = age(item.time);
      time.append(relative, document.createTextNode(npt(item.time)));
      var link = document.createElement('a');
      link.href = href;
      link.target = '_blank';
      link.rel = 'noopener';
      link.textContent = item.title;
      if(/[\u0900-\u097F]/.test(item.title)) link.lang = 'ne';
      li.append(time, link);
      if(item.summary){
        var summary = document.createElement('p');
        summary.className = 'tk-sum';
        summary.textContent = item.summary;
        if(/[\u0900-\u097F]/.test(item.summary)) summary.lang = 'ne';
        li.appendChild(summary);
      }
      list.appendChild(li);
    });
    if(stamp && updated) stamp.textContent = 'Live · checked ' + npt(updated);
  }
  function load(){
    fetch('/api/news', { cache:'no-store' })
      .then(function(r){ return r.ok ? r.json() : null; })
      .then(function(data){ if(data && Array.isArray(data.items)) render(data.items.filter(function(i){ return i && i.kind !== 'video'; }), data.updated); })
      .catch(function(){ /* keep the built fallback */ });
  }
  load();
  setInterval(load, 60 * 1000);
  document.addEventListener('visibilitychange', function(){ if(!document.hidden) load(); });
})();
} catch (e) { setTimeout(function () { throw e; }); }

/* block 8 */
try {
(function(){
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
  if (reduce && reduce.matches) return;
  var root = document.documentElement, ticking = false;
  function paint(){
    ticking = false;
    var y = Math.min(window.scrollY || 0, 1400);
    root.style.setProperty('--parallax', (y * 0.12).toFixed(1) + 'px');
  }
  addEventListener('scroll', function(){
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(paint);
  }, { passive: true });
  paint();
})();
} catch (e) { setTimeout(function () { throw e; }); }

/* block 9 */
try {
(function(){
  var head = document.querySelector('.sitehead');
  if(!head) return;
  var top   = head.querySelector('.head-top');
  var nav   = head.querySelector('.head-nav');
  var left  = head.querySelector('.head-top .ht-left');
  var right = head.querySelector('.head-top .ht-right');
  var tabs  = nav && nav.querySelector('.tabbar');
  var brand = head.querySelector('.brand');

  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)');
  var narrow = window.matchMedia && matchMedia('(max-width:760px)');
  var lastY = window.scrollY || 0, ticking = false, condensed = false;
  var THRESHOLD = 6;     /* ignore the jitter of a trackpad settling */
  var FREE_ZONE = 120;   /* the masthead is never folded this near the top */

  function busy(){
    return (head.contains(document.activeElement) && !(tabs && tabs.contains(document.activeElement))) ||
      !!head.querySelector('[aria-expanded="true"]');
  }

  function condense(on){
    if(condensed === on) return;
    condensed = on;
    head.classList.toggle('masthead-hidden', on);
    if(top) top.inert = on;
  }

  function frame(){
    ticking = false;
    var y = Math.max(0, window.scrollY || 0);
    var delta = y - lastY;
    head.classList.toggle('is-floating', y > 4);

    if(Math.abs(delta) < THRESHOLD) return;
    lastY = y;
    if(y < FREE_ZONE || busy()) condense(false);
    else if(delta > 0) condense(true);
    else condense(false);
  }

  addEventListener('scroll', function(){
    if(ticking) return;
    ticking = true;
    requestAnimationFrame(frame);
  }, { passive: true });

  head.addEventListener('focusin', function(){ condense(false); });
  if(narrow && narrow.addEventListener) narrow.addEventListener('change', frame);
  if(!(reduce && reduce.matches)) frame();

  if(top){
    top.addEventListener('transitionend', function(e){
      if(e.propertyName !== 'height') return;
      document.documentElement.style.setProperty(
        '--head-h', Math.round(head.getBoundingClientRect().height) + 'px');
    });
  }
})();
} catch (e) { setTimeout(function () { throw e; }); }

/* block 10 */
try {
(function(){
  var sel = '.inv-sec, .numblock, .inv-chart';
  if(!('IntersectionObserver' in window)){
    document.querySelectorAll(sel).forEach(function(el){ el.classList.add('is-live','is-drawn'); });
    return;
  }
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(!e.isIntersecting) return;
      var el = e.target;
      el.classList.add('is-live');
      var chart = el.classList.contains('inv-chart') ? el : el.querySelector('.inv-chart');
      if(chart){
        chart.classList.add('is-drawn');
        chart.querySelectorAll('.inv-dot').forEach(function(d, i){ d.style.setProperty('--i', i); });
      }
      io.unobserve(el);
    });
  }, { threshold: 0.18, rootMargin: '0px 0px -8% 0px' });

  function watch(){
    document.querySelectorAll(sel).forEach(function(el){
      if(!el.dataset.moWatched){ el.dataset.moWatched = '1'; io.observe(el); }
    });
  }
  watch();
  if(window.Tabs && Tabs.onChange) Tabs.onChange(function(){ setTimeout(watch, 60); });
})();
} catch (e) { setTimeout(function () { throw e; }); }

/* block 11 */
try {
(function(){
  var jump = document.getElementById('inv-jump');
  if(!jump) return;

  var links = {};
  jump.querySelectorAll('a[href^="#"]').forEach(function(a){
    links[a.getAttribute('href').slice(1)] = a;
  });
  var secs = Object.keys(links)
    .map(function(id){ return document.getElementById(id); })
    .filter(Boolean);

  if('IntersectionObserver' in window && secs.length){
    var current = null;
    var spy = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if(e.isIntersecting) current = e.target.id;
      });
      if(current && links[current]){
        Object.keys(links).forEach(function(id){ links[id].classList.toggle('is-here', id === current); });
        var here = links[current];
        var l = here.offsetLeft, r = l + here.offsetWidth;
        if(l < jump.scrollLeft || r > jump.scrollLeft + jump.clientWidth){
          jump.scrollTo({ left: l - 12, behavior: 'smooth' });
        }
      }
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
    secs.forEach(function(s){ spy.observe(s); });
  }

  jump.addEventListener('click', function(){
    document.querySelectorAll('.inv-card.is-open').forEach(function(c){ c.classList.remove('is-open'); });
  });

  function foldCards(){
    document.querySelectorAll('#panel-investigation .inv-card-note').forEach(function(note){
      if(note.dataset.folded) return;
      requestAnimationFrame(function(){
        if(note.clientHeight === 0) return;
        note.dataset.folded = '1';
        if(note.scrollHeight - note.clientHeight < 6) return;
        var card = note.closest('.inv-card');
        if(!card) return;
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'inv-card-more';
        btn.textContent = 'More';
        btn.setAttribute('aria-expanded', 'false');
        btn.addEventListener('click', function(){
          var open = card.classList.toggle('is-open');
          btn.textContent = open ? 'Less' : 'More';
          btn.setAttribute('aria-expanded', String(open));
        });
        note.insertAdjacentElement('afterend', btn);
      });
    });
  }
  foldCards();
  if(window.Tabs && Tabs.onChange) Tabs.onChange(function(){ setTimeout(foldCards, 90); });
  document.getElementById('tab-investigation') &&
    document.getElementById('tab-investigation').addEventListener('click', function(){ setTimeout(foldCards, 120); });
  setTimeout(foldCards, 1200);
})();
} catch (e) { setTimeout(function () { throw e; }); }
