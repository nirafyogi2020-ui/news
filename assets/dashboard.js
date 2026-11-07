/* One UI transaction for every appearance of a bulletin's figures. */
(() => {
  const $ = selector => document.querySelector(selector);
  const fmt = n => Number(n).toLocaleString('en-US');
  const safe = url => { try { return new URL(url).protocol === 'https:'; } catch { return false; } };
  let event;
  const labels = {dead:'confirmed dead',missing:'listed missing in Nepal',rescued:'rescued so far'};
  function synchronize(data) {
    if (!data?.board) return;
    ['dead','missing','rescued'].forEach((metric, i) => {
      const fig = data.board[metric];
      if (!fig || !Number.isFinite(fig.value)) return;
      const selector = `[data-figure="${metric}"], #hero-figures .hf-stat:nth-child(${i+1}) .hf-n, #rail-figures .rail-fig:nth-child(${i+1}) .rf-n, .stat[data-label="${labels[metric]}"] .n`;
      document.querySelectorAll(selector).forEach(el => el.textContent = fmt(fig.value));
      if (event) {
        const stat = event.stats.find(s => s.label === labels[metric]);
        if (stat) stat.value = fmt(fig.value);
      }
    });
    const response=data.response;
    if(response){
      document.querySelectorAll('[data-response-source] a,[data-source-for="response:identified"] a').forEach(a=>{if(safe(response.url))a.href=response.url;});
      const stamp=$('[data-response-stamp]');
      if(stamp && response.time && safe(response.url)){
        const a=document.createElement('a');a.href=response.url;a.target='_blank';a.rel='noopener noreferrer';a.textContent='Source ↗';
        stamp.replaceChildren(document.createTextNode(new Date(response.time).toLocaleString('en-GB',{timeZone:'Asia/Kathmandu',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})+' NPT · '),a);
      }
      document.querySelectorAll('[data-response]').forEach(el=>{const value=response[el.dataset.response];if(Number.isFinite(value))el.textContent=fmt(value);});
      (response.electricity||[]).forEach(r=>document.querySelectorAll('[data-electricity]').forEach(el=>{if(el.dataset.electricity===r.place){el.textContent=r.value+'%';el.nextElementSibling.value=r.value;}}));
    }
    ['dead','missing','rescued'].forEach(metric=>{
      const figure=data.board[metric];const slot=document.querySelector('[data-source-for="'+metric+'"]');
      if(slot && figure && safe(figure.url)){const a=slot.querySelector('a');if(a){a.href=figure.url;a.textContent=figure.source.split(' · ')[0]+' ↗';a.title=figure.time;}}
    });
    const d = data.districts;
    if (d?.rows?.length) {
      document.querySelectorAll('[data-district-total]').forEach(el => el.textContent = fmt(d.total));
      const source=$('[data-district-source] a');
      if(source && safe(d.url))source.href=d.url;
      const list = $('[data-investigation-districts]');
      if (list) {
        const max = Math.max(...d.rows.map(r => r.value));
        list.replaceChildren(...d.rows.map(r => {
          const row = document.createElement('div');row.className='district-row';
          const name=document.createElement('span');name.textContent=r.district;
          const track=document.createElement('span');track.className='district-track';
          const bar=document.createElement('i');bar.style.width=Math.max(0,Math.min(100,r.value/max*100))+'%';track.append(bar);
          const value=document.createElement('b');value.textContent=fmt(r.value);row.append(name,track,value);return row;
        }));
      }
    }
    const latest = data.board.dead;
    const stamp=$('[data-board-time]');
    if(stamp && latest?.time)stamp.textContent=new Date(latest.time).toLocaleString('en-GB',{timeZone:'Asia/Kathmandu',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})+' NPT';
    if (latest && safe(latest.url)) {
      document.querySelectorAll('.hf-note, #rail-figures .rail-note').forEach(el => {
        const a=document.createElement('a');a.href=latest.url;a.target='_blank';a.rel='noopener noreferrer';a.href='#inv-sources';a.removeAttribute('target');a.textContent='Sources';
        el.replaceChildren(a);
        // The bulletin's date went with the text; print puts it back from data-asof,
        // restamped from the figure now on screen so paper and screen agree.
        const t=new Date(latest.time);
        if(el.classList.contains('hf-note') && latest.source && !isNaN(t)){
          const p=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kathmandu',day:'numeric',month:'long',year:'numeric',hour:'numeric',minute:'2-digit',hour12:true}).formatToParts(t).map(x=>[x.type,x.value]));
          el.dataset.asof=`${latest.source.split(' · ')[0]}, ${p.day} ${p.month} ${p.year}, ${p.hour}:${p.minute} ${(p.dayPeriod||'').toLowerCase()} NPT`;
        }
        el.classList.add('hf-note-live');
      });
    }
    // Repaint the running headline strip using the same full metric set.
    if (event) window.dispatchEvent(new CustomEvent('event-loaded',{detail:event}));
  }
  window.addEventListener('live-figures', e => synchronize(e.detail));
  fetch('/event.json').then(r=>r.ok?r.json():null).then(data=>{
    if(!data)return;event=data;synchronize(window.__liveFigures || {board:data.figures,districts:data.districts,response:data.response});
  }).catch(()=>{});

  // Reuse the actual story nodes, preserving links, controls and IDs.
  function packageNews(container) {
    if (container.querySelector(':scope > .news-package')) return;
    const river=container.querySelector(':scope > .river');
    if(!river)return;
    const cards=[...river.querySelectorAll(':scope > .post-card')];
    if(cards.length<3)return;
    // Newest first within each group, and a story with a photograph always
    // beats one without for the places at the top.
    const pictured=card=>!!card.querySelector('img.post-photo');
    // The same picture twice in a row reads as a mistake: repeats wait their turn.
    const seen=new Set();
    const fresh=card=>{const src=card.querySelector('img.post-photo')?.getAttribute('src').split('?')[0].split('/').pop();if(!src||seen.has(src))return false;seen.add(src);return true;};
    const firsts=cards.filter(pictured).filter(fresh);
    const ordered=[...firsts,...cards.filter(card=>!firsts.includes(card))];
    const top=ordered.slice(0,5);
    top[0].classList.add('is-lead');
    const pack=document.createElement('div');pack.className='news-package';
    pack.append(...top);container.insertBefore(pack,river);
    river.append(...ordered.slice(5));
    if(!river.children.length)river.remove();
  }
  // The tabs draw the same cards as the Overview in another shape: a phone
  // shows 116 px thumbnails, a tablet two columns of up to 503 px, a desktop
  // four of up to 394 px, and the lead runs across the column (half the page
  // from 1100 px, cropped to a taller frame). The cards arrive with the
  // Overview's hint, so each picture here gets the hint for where it sits,
  // before the hidden tab is opened and its pictures load. A 3x phone keeps
  // the two-thirds rule the Overview uses.
  const TILE_SIZES='(min-width:1100px) 400px, (min-width:601px) calc(50vw - 40px), 120px';
  const LEAD_SIZES='(min-width:1100px) 50vw, (min-width:601px) calc(100vw - 32px), (min-resolution:2.5dppx) calc((100vw - 32px) * 2 / 3), calc(100vw - 32px)';
  function hintSizes(container){
    container.querySelectorAll('img.post-photo[srcset]').forEach(img=>{
      const want=img.closest('.is-lead')?LEAD_SIZES:TILE_SIZES;
      if(img.getAttribute('sizes')!==want)img.setAttribute('sizes',want);
    });
  }
  // A new hint on a picture makes the browser fetch the file it now picks,
  // even in a hidden tab, so the Overview at 2x was fetching the Today lead
  // at 1,400 px for a tab nobody had opened. The hint waits for the tab: it
  // goes on when the panel is shown, before its pictures are laid out.
  function hintWhenShown(container){
    const panel=container.closest('.tabpanel');
    const go=()=>{if(!panel||!panel.hidden)hintSizes(container);};
    if(panel)new MutationObserver(go).observe(panel,{attributes:true,attributeFilter:['hidden']});
    go();
    return go;
  }
  ['today-general-grid','today-grid','feed-tab-grid'].forEach(id=>{
    const container=document.getElementById(id);if(!container)return;
    const hint=hintWhenShown(container);
    const run=()=>{packageNews(container);hint();};
    const observer=new MutationObserver(run);observer.observe(container,{childList:true});run();
  });
  const liveRecent=document.getElementById('live-recent-grid');
  if(liveRecent){
    const cards=[...document.querySelectorAll('#today-grid .post-card')].slice(0,5).map(card=>{
      const copy=card.cloneNode(true);
      copy.querySelectorAll('[id]').forEach(el=>el.removeAttribute('id'));
      return copy;
    });
    if(cards.length>=3){const river=document.createElement('div');river.className='river';river.append(...cards);liveRecent.append(river);packageNews(liveRecent);hintWhenShown(liveRecent);}
  }
  const head=$('.sitehead'), top=$('.head-top');
  if(head && top)new ResizeObserver(()=>head.style.setProperty('--masthead-size',top.offsetHeight+'px')).observe(top);
  const closeSearch=()=>{window.closeHeaderPopovers?.();$('#search-btn')?.focus();};
  $('#search-close')?.addEventListener('click',closeSearch);
  const searchInput=$('#site-search-input'),searchResults=$('#search-results');
  searchInput?.addEventListener('input',()=>{
    const q=searchInput.value.trim().toLocaleLowerCase();
    if(!searchResults)return;
    searchResults.querySelectorAll('.search-story,.search-result-heading').forEach(el=>el.remove());
    if(q.length<2)return;
    const seen=new Set();const links=[];
    document.querySelectorAll('.post-card .tc-title a, .ticker li>a').forEach(a=>{
      const title=a.textContent.trim();const href=a.getAttribute('href');
      if(!(a.closest('.post-card')?.textContent || title).toLocaleLowerCase().includes(q)||!href||seen.has(title))return;
      let u;try{u=new URL(href,location.origin);}catch{return;}
      if(u.origin!==location.origin&&!safe(u.href))return;
      seen.add(title);links.push({title,url:u.href,external:u.origin!==location.origin,when:a.closest('.post-card')?.querySelector('.tc-kicker')?.textContent.trim()||''});
    });
    if(links.length){
      searchResults.querySelector('.search-empty')?.remove();
      const heading=document.createElement('p');heading.className='search-result-heading';heading.textContent='Recent reporting';searchResults.append(heading);
      links.slice(0,8).forEach(item=>{const a=document.createElement('a');a.className='search-story';a.textContent=item.title;if(item.when){const when=document.createElement('small');when.textContent=item.when;a.append(when);}a.href=item.url;if(item.external){a.target='_blank';a.rel='noopener noreferrer';}searchResults.append(a);});
    }
  });
  $('#search-pop')?.addEventListener('keydown',e=>{
    if(e.key==='Escape'){e.preventDefault();closeSearch();return;}
    if(e.key!=='Tab')return;
    const controls=[...$('#search-pop').querySelectorAll('button,a[href],input')].filter(el=>el.getClientRects().length);
    const first=controls[0],last=controls[controls.length-1];
    if(e.shiftKey && document.activeElement===first){e.preventDefault();last.focus();}
    else if(!e.shiftKey && document.activeElement===last){e.preventDefault();first.focus();}
  });
  document.querySelectorAll('[data-search-topic]').forEach(button=>button.addEventListener('click',()=>{
    const input=$('#site-search-input');input.value=button.dataset.searchTopic;input.dispatchEvent(new Event('input',{bubbles:true}));input.focus();
  }));
})();
