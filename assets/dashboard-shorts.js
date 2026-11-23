/* Nepal Disaster Update: the Rasuwa dashboard, shorts code, fetched on first use. Source: src/rasuwa-dashboard.html. */
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
              ? '<img referrerpolicy="no-referrer" src="' + esc(it.avatar) + '" alt="" data-fail="remove">'
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
      '<a class="ss-link" href="' + esc(it.url) + '" target="_blank" rel="noopener">Open on YouTube' + NEW_TAB_HTML + '</a>';
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
