import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseSituation,parsePublicBulletin,applySituation} from '../functions/api/_situation.js';
const url='https://english.onlinekhabar.com/rasuwa-flood-1357-bodies.html';
const report=`<p class="wp-block-paragraph">National Disaster Risk Reduction and Management Authority.
According to updated figures as of 1 pm on 23 Bhadra 2083, the death toll from the flood has reached 1,357.
In Chitwan, 363 bodies have been found. 223 bodies were found in Nawalparasi East, 222 in Nawalparasi West, 197 in Nuwakot, 169 in Rasuwa, 75 in Gorkha, 70 in Dhading, and 38 in Tanahun.
5,326 people affected by the flood remain unaccounted for. 13,583 people have been successfully rescued.</p>`;
test('complete NDRRMA report keeps all three metrics and eight districts together',()=>{
 const result=parseSituation(report,url);
 assert.equal(result.figures.dead.value,1357);
 assert.equal(result.figures.missing.value,5326);
 assert.equal(result.figures.rescued.value,13583);
 assert.equal(result.districts.rows.length,8);
 assert.equal(result.time,'2026-09-08T13:00:00+05:45');
});
test('partial, inconsistent and off-domain reports fail closed',()=>{
 assert.equal(parseSituation(report.replace('363 bodies','360 bodies'),url),null);
 assert.equal(parseSituation(report.replace('13,583 people have been successfully rescued.',''),url),null);
 assert.equal(parseSituation(report,'https://example.com/'),null);
 assert.equal(parseSituation('<p>Unrelated report with many figures</p>',url),null);
});
test('an older complete report cannot roll back a newer police recovery count',()=>{
 const baseline={figures:{dead:{value:1365,time:'2026-09-08T20:00:00+05:45'}}};
 const result=applySituation(baseline,parseSituation(report,url));
 assert.equal(result.figures.dead.value,1365);
 assert.equal(result.figures.missing.value,5326);
 assert.equal(baseline.figures.missing,undefined);
});

const publicBulletin=`
<meta name="description" content="९ सेप्टेम्बर २०२६ / २४ भदौ २०८३ लाइभ। NDRRMA २४ भदौ ११:००: शव १,३६७ · सम्पर्कविहीन करिब ५,१३२ · घाइते ७,१५१ · उद्धार १३,६४६।">
<main>
मानवीय क्षति मृतक संख्या १,३६७ जिल्ला मृतक
चितवन ३६३ नवलपरासी पूर्व २२६ नवलपरासी पश्चिम २२२ नुवाकोट १९७ रसुवा १७४ गोरखा ७५ धादिङ ७० तनहुँ ३८
हस्तान्तरण १०२ सम्पर्कविहीन करिब ५,१३२
होल्डिङ जिल्ला · NDRRMA ३,६२८ डिस्चार्ज २५२
खटिएको जनशक्ति २१,१८५ सेना ९,००७ सशस्त्र ४,२०३ प्रहरी ७,९७५ सञ्चार
विद्युत · रसुवा ७८% विद्युत · नुवाकोट ९६.७% विद्युत · धादिङ ९९.८%
</main>`;

test('public bulletin reconciles district recoveries with two hospital deaths',()=>{
 const result=parsePublicBulletin(publicBulletin);
 assert.equal(result.figures.dead.value,1367);
 assert.equal(result.figures.missing.value,5132);
 assert.equal(result.figures.rescued.value,13646);
 assert.equal(result.districts.rows.at(-1).district,'Kathmandu hospitals');
 assert.equal(result.districts.rows.reduce((sum,row)=>sum+row.value,0),1367);
 assert.equal(result.response.personnel,21185);
 assert.equal(result.time,'2026-09-09T11:00:00+05:45');
});

test('public bulletin rejects missing NDRRMA label, partial districts and wrong host',()=>{
 assert.equal(parsePublicBulletin(publicBulletin.replace('NDRRMA','Report')),null);
 assert.equal(parsePublicBulletin(publicBulletin.replace('चितवन ३६३','चितवन')),null);
 assert.equal(parsePublicBulletin(publicBulletin,'https://example.com/'),null);
});
