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
    const pack=document.createElement('div');pack.className='news-package';
    const lead=document.createElement('div');lead.className='news-package-lead';lead.append(cards[0]);
    const left=document.createElement('div');left.className='news-package-side';left.append(...cards.filter((_,index)=>index>0 && index%2===1).slice(0,2));
    const right=document.createElement('div');right.className='news-package-side';right.append(...cards.filter((_,index)=>index>0 && index%2===0).slice(0,2));
    pack.append(left,lead,right);container.insertBefore(pack,river);
    if(!river.children.length)river.remove();
  }
  ['today-general-grid','today-grid','feed-tab-grid'].forEach(id=>{
    const container=document.getElementById(id);if(!container)return;
    const observer=new MutationObserver(()=>packageNews(container));observer.observe(container,{childList:true});packageNews(container);
  });
  const liveRecent=document.getElementById('live-recent-grid');
  if(liveRecent){
    const cards=[...document.querySelectorAll('#today-grid .post-card')].slice(0,5).map(card=>{
      const copy=card.cloneNode(true);
      copy.querySelectorAll('[id]').forEach(el=>el.removeAttribute('id'));
      return copy;
    });
    if(cards.length>=3){const river=document.createElement('div');river.className='river';river.append(...cards);liveRecent.append(river);packageNews(liveRecent);}
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
