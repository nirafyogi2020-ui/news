import { bsDateToIso } from './police.js';

const BULLETIN_URL = 'https://nirajbhusal.github.io/rasuwa-flood-bulletin/';

function plain(html) {
  return String(html || '')
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/[०१२३४५६७८९]/g, digit => String('०१२३४५६७८९'.indexOf(digit)))
    .replace(/\s+/g, ' ')
    .trim();
}

function numberAfter(text, pattern) {
  const match = text.match(pattern);
  return match ? Number(match[1].replace(/,/g, '')) : null;
}

/**
 * Reads the compact NDRRMA snapshot published by the public Rasuwa bulletin.
 * The page is used only as a structured relay: the parser requires the NDRRMA
 * label, a BS date, all three headline figures and a complete district list.
 * Any format change fails closed and leaves the last verified snapshot live.
 */
export function parsePublicBulletin(html, url = BULLETIN_URL) {
  let parsed;
  try { parsed = new URL(url); } catch { return null; }
  if (parsed.protocol !== 'https:' || parsed.hostname !== 'nirajbhusal.github.io') return null;

  const description = plain((String(html).match(/<meta\s+name="description"\s+content="([^"]+)"/i) || [])[1]);
  const text = plain(html);
  if (!description || !/NDRRMA/i.test(description)) return null;

  const stamp = description.match(/NDRRMA\s+(\d{1,2})\s+भदौ\s+(\d{1,2}):(\d{2})/i);
  const year = description.match(/भदौ\s+(20\d{2})/i) || text.match(/(2083)\s*·\s*घटना/);
  if (!stamp || !year) return null;
  const isoDay = bsDateToIso(`${year[1]}-05-${String(stamp[1]).padStart(2, '0')}`);
  if (!isoDay) return null;
  const time = `${isoDay.slice(0, 10)}T${String(stamp[2]).padStart(2, '0')}:${stamp[3]}:00+05:45`;
  if (Date.parse(time) > Date.now() + 60000) return null;

  const dead = numberAfter(description, /शव\s+([\d,]+)/);
  const missing = numberAfter(description, /सम्पर्कविहीन\s+करिब\s+([\d,]+)/);
  const rescued = numberAfter(description, /उद्धार\s+([\d,]+)/);
  const injured = numberAfter(description, /घाइते\s+([\d,]+)/);
  if (!dead || !missing || !rescued || !injured || dead > 50000 || missing > 100000 || rescued > 200000) return null;

  const districtPatterns = [
    ['Chitwan', /चितवन\s+([\d,]+)/],
    ['Nawalparasi East', /नवलपरासी\s+पूर्व\s+([\d,]+)/],
    ['Nawalparasi West', /नवलपरासी\s+पश्चिम\s+([\d,]+)/],
    ['Nuwakot', /नुवाकोट\s+([\d,]+)/],
    ['Rasuwa', /रसुवा\s*([\d,]+)/],
    ['Gorkha', /गोरखा\s*([\d,]+)/],
    ['Dhading', /धादिङ\s+([\d,]+)/],
    ['Tanahun', /तनहुँ\s*([\d,]+)/]
  ];
  const casualtyBlock = text.match(/मानवीय क्षति([\s\S]*?)सम्पर्कविहीन/)?.[1] || '';
  const rows = districtPatterns.map(([district, pattern]) => ({ district, value: numberAfter(casualtyBlock, pattern) }));
  if (rows.some(row => !Number.isSafeInteger(row.value) || row.value < 0)) return null;
  const districtSum = rows.reduce((sum, row) => sum + row.value, 0);
  const hospitalDeaths = dead - districtSum;
  if (hospitalDeaths < 0 || hospitalDeaths > 10) return null;
  if (hospitalDeaths) rows.push({ district: 'Kathmandu hospitals', value: hospitalDeaths });

  const source = 'NDRRMA · Rasuwa Flood Bulletin';
  const figures = Object.fromEntries(Object.entries({ dead, missing, rescued }).map(([metric, value]) => [metric, {
    metric, value, source, url, time, scope: 'total',
    sentence: `NDRRMA: ${value.toLocaleString('en-US')} ${metric}.`
  }]));

  const responseBlock = text.match(/खटिएको जनशक्ति([\s\S]*?)सञ्चार/)?.[1] || '';
  const response = {
    time, url, source, injured,
    discharged: numberAfter(text, /डिस्चार्ज\s+([\d,]+)/),
    sheltered: numberAfter(text, /होल्डिङ जिल्ला\s*·?\s*NDRRMA\s+([\d,]+)/),
    identified: numberAfter(text, /हस्तान्तरण\s+([\d,]+)/),
    personnel: numberAfter(text, /खटिएको जनशक्ति\s+([\d,]+)/),
    army: numberAfter(responseBlock, /सेना\s*([\d,]+)/),
    police: numberAfter(responseBlock, /प्रहरी\s*([\d,]+)/),
    apf: numberAfter(responseBlock, /सशस्त्र\s+([\d,]+)/),
    electricity: [
      ['Rasuwa', /विद्युत\s*·\s*रसुवा\s*([\d.]+)%/],
      ['Nuwakot', /विद्युत\s*·\s*नुवाकोट\s*([\d.]+)%/],
      ['Dhading', /विद्युत\s*·\s*धादिङ\s*([\d.]+)%/]
    ].map(([place, pattern]) => ({ place, value: numberAfter(text, pattern) }))
  };
  const responseComplete = ['discharged', 'sheltered', 'identified', 'personnel', 'army', 'police', 'apf']
    .every(key => Number.isFinite(response[key])) && response.electricity.every(row => Number.isFinite(row.value));

  return {
    figures,
    districts: { rows, total: dead, source, url, time },
    time,
    url,
    ...(responseComplete ? { response } : {})
  };
}

// Conservative parser for NDRRMA's complete situation report relayed by
// Onlinekhabar. A changed article format leaves the last verified snapshot.
export function parseSituation(html, url) {
  let u;try{u=new URL(url);}catch{return null;}
  if(u.protocol!=='https:' || u.hostname!=='english.onlinekhabar.com')return null;
  const text=[...html.matchAll(/<p\b[^>]*class="[^"]*wp-block-paragraph[^"]*"[^>]*>([\s\S]*?)<\/p>/gi)].map(m=>m[1].replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/g,' ')).join(' ').replace(/\s+/g,' ');
  if(!/National Disaster Risk Reduction and Management Authority/.test(text))return null;
  const stamp=/as of (\d{1,2})(?::(\d{2}))?\s*(am|pm) on (\d{1,2}) Bhadra (\d{4})/i.exec(text);
  if(!stamp)return null;
  const day=bsDateToIso(`${stamp[5]}-05-${stamp[4]}`);if(!day)return null;
  const hour=Number(stamp[1])%12+(stamp[3].toLowerCase()==='pm'?12:0);
  const time=day.slice(0,10)+`T${String(hour).padStart(2,'0')}:${stamp[2]||'00'}:00+05:45`;
  if(Date.parse(time)>Date.now()+60000)return null;
  const n=pattern=>{const m=text.match(pattern);return m?Number(m[1].replace(/,/g,'')):null;};
  const dead=n(/death toll from the flood has reached ([\d,]+)/i);
  const missing=n(/([\d,]+) people affected by the flood remain unaccounted for/i);
  const rescued=n(/([\d,]+) people have been successfully rescued/i);
  if(!dead || !missing || !rescued || dead>50000 || missing>100000 || rescued>200000)return null;
  const rows=['Chitwan','Nawalparasi East','Nawalparasi West','Nuwakot','Rasuwa','Gorkha','Dhading','Tanahun'].map(district=>({district,value:district==='Chitwan'?n(/In Chitwan, ([\d,]+) bodies/i):n(new RegExp('([\\d,]+) bodies (?:were )?(?:found )?in '+district,'i'))}));
  // Some reports abbreviate the later district clauses: “169 in Rasuwa”.
  rows.forEach(r=>{if(!r.value)r.value=n(new RegExp('([\\d,]+) in '+r.district+'(?:,|\\.| and)','i'));});
  if(rows.some(r=>!Number.isSafeInteger(r.value)||r.value<0)||rows.reduce((a,r)=>a+r.value,0)!==dead)return null;
  const source='NDRRMA · Onlinekhabar';
  const figures=Object.fromEntries(Object.entries({dead,missing,rescued}).map(([metric,value])=>[metric,{metric,value,source,url,time,scope:'total',sentence:`NDRRMA: ${value.toLocaleString('en-US')} ${metric}.`} ]));
  const response={time,url,source,
    identified:n(/only ([\d,]+) of the deceased have been identified/i),
    injured:n(/Of the ([\d,]+) injured/i),inHospital:n(/([\d,]+) are currently receiving treatment/i),
    sheltered:n(/currently housing ([\d,]+) people/i),
    centres:n(/([\d,]+) holding centres have been set up/i) || (/Thirty-nine holding centres/i.test(text)?39:null),
    personnel:n(/([\d,]+) security personnel have been mobilised/i),army:n(/([\d,]+) from the Nepal Army/i),
    police:n(/([\d,]+) from Nepal Police/i),apf:n(/([\d,]+) from the Armed Police Force/i),
    electricity:['Rasuwa','Nuwakot','Dhading'].map(place=>({place,value:n(new RegExp('([\\d.]+)% (?:of households )?in '+place,'i'))}))
  };
  const complete=Object.entries(response).every(([k,v])=>k==='electricity'?v.every(r=>r.value!==null):v!==null);
  return {figures,districts:{rows,total:dead,source,url,time},time,url,...(complete?{response}:{})};
}
export async function loadSituation(items, previous) {
  const urls=[BULLETIN_URL, ...[...new Set((items||[]).filter(i=>/rasuwa|bhotekoshi/i.test(i.title||'') && /bodies|missing|death toll/i.test(i.title||'')).map(i=>i.url))].filter(value=>{try{const u=new URL(value);return u.protocol==='https:'&&u.hostname==='english.onlinekhabar.com';}catch{return false;}}).slice(0,2)];
  let best=null;
  for(const url of urls){
    try{
      const res=await fetch(url,{signal:AbortSignal.timeout(8000),redirect:'error',cf:{cacheTtl:60}});
      if(!res.ok)continue;
      const html=await res.text();
      const report=url===BULLETIN_URL?parsePublicBulletin(html,url):parseSituation(html,url);
      if(report && Date.parse(report.time)>Date.parse(previous?.figures?.missing?.time||0) && (!best||Date.parse(report.time)>Date.parse(best.time)))best=report;
    }catch{}
  }
  return best;
}
export function applySituation(published, report){
  if(!report)return published;
  const next={...published,figures:{...published?.figures}};
  for(const [metric,figure] of Object.entries(report.figures))if(!next.figures[metric]||Date.parse(figure.time)>Date.parse(next.figures[metric].time))next.figures[metric]=figure;
  if(!next.districts||Date.parse(report.time)>Date.parse(next.districts.time))next.districts=report.districts;
  if(report.response && (!next.response || Date.parse(report.time)>Date.parse(next.response.time)))next.response=report.response;
  return next;
}
